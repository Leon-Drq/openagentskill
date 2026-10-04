'use client'

import { Children, Fragment, isValidElement, useEffect, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './select'

type Choice = { value: string; label: ReactNode; disabled?: boolean; group?: string }
const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

function choicesFrom(children: ReactNode, group?: string, disabled = false): Choice[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; label?: string; disabled?: boolean }>(child)) return []
    if (child.type === Fragment) return choicesFrom(child.props.children, group, disabled)
    if (child.type === 'optgroup') return choicesFrom(child.props.children, child.props.label, disabled || child.props.disabled)
    if (child.type !== 'option') return []
    return [{ value: String(child.props.value ?? child.props.children ?? ''), label: child.props.children, disabled: disabled || child.props.disabled, group }]
  })
}

/** Keep the real select for forms, native change events, validation, refs and
 * no-JS use; progressively enhance the interactive picker with Radix. */
export function NativeSelect({ className, children, ref, ...props }: ComponentProps<'select'>) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const native = useRef<HTMLSelectElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [selected, setSelected] = useState(String(props.defaultValue ?? ''))
  const [invalid, setInvalid] = useState(false)
  const choices = choicesFrom(children)
  let empty = '__oas_empty__'
  while (choices.some(choice => choice.value === empty)) empty += '_'
  const current = String(props.value ?? selected)
  const display = choices.find(choice => choice.value === current) ?? choices[0]
  const enhanced = hydrated && !props.multiple && (!props.size || props.size === 1) && choices.length > 0

  useEffect(() => {
    const form = native.current?.form
    if (!form) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const reset = () => { timer = setTimeout(() => {
      if (props.value !== undefined && native.current) native.current.value = String(props.value)
      else setSelected(native.current?.value ?? '')
      setInvalid(false)
    }, 0) }
    form.addEventListener('reset', reset)
    return () => { form.removeEventListener('reset', reset); clearTimeout(timer) }
  }, [enhanced, props.value])

  const nativeControl = <select {...props} ref={element => {
    native.current = element
    if (typeof ref === 'function') return ref(element)
    if (ref) ref.current = element
  }} id={enhanced ? undefined : props.id} hidden={enhanced} aria-hidden={enhanced || undefined}
    tabIndex={enhanced ? -1 : props.tabIndex} data-slot="native-select" className={cn('native-select', className)}
    onInvalid={event => {
      props.onInvalid?.(event)
      if (enhanced) { event.preventDefault(); setInvalid(true); trigger.current?.focus() }
    }}>
    {children}
  </select>
  if (!enhanced) return nativeControl

  const groups = [...new Set(choices.map(choice => choice.group))]
  return <>
    <Select value={display?.value || empty} disabled={props.disabled} onValueChange={value => {
      const next = value === empty ? '' : value
      if (props.value === undefined) setSelected(next)
      setInvalid(false)
      if (native.current) {
        native.current.value = next
        // Preserve React's event shape, including currentTarget.form, for
        // existing URL filters and auto-submitting GET forms.
        native.current.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }}>
      <SelectTrigger ref={trigger} id={props.id} tabIndex={props.tabIndex} title={props.title} autoFocus={props.autoFocus}
        aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']}
        aria-invalid={props['aria-invalid'] || invalid || undefined} aria-required={props.required}
        className={cn('form-select-trigger', className)}>
        <SelectValue>{display?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} collisionPadding={12}>
        {groups.map(group => <SelectGroup key={group ?? '__ungrouped__'}>
          {group && <SelectLabel>{group}</SelectLabel>}
          {choices.filter(choice => choice.group === group).map(choice => <SelectItem key={choice.value} value={choice.value || empty} disabled={choice.disabled}>{choice.label}</SelectItem>)}
        </SelectGroup>)}
      </SelectContent>
    </Select>
    {nativeControl}
  </>
}
