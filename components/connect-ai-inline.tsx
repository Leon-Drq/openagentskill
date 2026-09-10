'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

export const CONNECT_AI_PROMPT = 'Read https://www.openagentskill.com/api/agent/integration-kit?format=text and help me use OpenAgentSkill in this conversation. Use the template for this assistant and perform the documented read-only connection checks with your available tools. Report API accessibility, MCP tool availability and search success separately. Do not claim configuration is saved or a Skill is installed. Explain persistent setup and ask before changing files or installing anything. Preserve all safety checks. Do not send private project data or credentials to external services. Once the checks pass, ask which task I want help with.'

const COPY: Record<Locale, readonly [string, string, string, string, string]> = {
  en: ['Copy for AI', 'Copied — paste into your AI', 'Paste into Codex, Claude Code, or Cursor. Copying does not install anything.', 'Setup guide', 'Copy failed. Select the text above and copy it manually.'],
  zh: ['复制给 AI', '已复制，请粘贴给 AI', '粘贴给 Codex、Claude Code 或 Cursor。复制不会自动安装。', '接入指南', '复制失败，请选中上方文字手动复制。'],
  ja: ['AI 用にコピー', 'コピー済み — AI に貼り付け', 'Codex、Claude Code、Cursor に貼り付けてください。自動インストールは行いません。', '接続ガイド', 'コピーできませんでした。上の文章を手動でコピーしてください。'],
  ko: ['AI용 복사', '복사됨 — AI에 붙여넣기', 'Codex, Claude Code 또는 Cursor에 붙여넣으세요. 자동 설치되지 않습니다.', '설정 안내', '복사 실패. 위 텍스트를 직접 복사하세요.'],
  es: ['Copiar para IA', 'Copiado — pégalo en tu IA', 'Pégalo en Codex, Claude Code o Cursor. Copiar no instala nada.', 'Guía', 'No se pudo copiar. Copia el texto manualmente.'],
  de: ['Für KI kopieren', 'Kopiert — in KI einfügen', 'In Codex, Claude Code oder Cursor einfügen. Kopieren installiert nichts.', 'Anleitung', 'Kopieren fehlgeschlagen. Text bitte manuell kopieren.'],
  fr: ['Copier pour l’IA', 'Copié — collez dans votre IA', 'Collez dans Codex, Claude Code ou Cursor. Copier ne lance aucune installation.', 'Guide', 'Échec de la copie. Copiez le texte manuellement.'],
  id: ['Salin untuk AI', 'Disalin — tempel ke AI', 'Tempel ke Codex, Claude Code, atau Cursor. Menyalin tidak memasang apa pun.', 'Panduan', 'Gagal menyalin. Salin teks di atas secara manual.'],
}

export function ConnectAiInline({ locale, label }: { locale: Locale; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const copy = COPY[locale]
  return (
    <details className="group min-w-0 basis-full sm:basis-auto sm:open:basis-full">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 font-medium text-[#006b4f] hover:underline underline-offset-4 [&::-webkit-details-marker]:hidden">
        {label}<span aria-hidden="true" className="transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
      </summary>
      <div className="mt-3 rounded-[8px] border border-[#d8d2c6] bg-[#fffdf8] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 select-text break-words text-sm leading-relaxed text-[#5f5a52]">
            {status === 'error' ? CONNECT_AI_PROMPT : <>OpenAgentSkill <span aria-hidden="true">→</span> Codex / Claude Code / Cursor</>}
          </p>
          <button type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(CONNECT_AI_PROMPT); setStatus('copied') }
            catch { setStatus('error') }
          }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#1d1b18] px-5 text-sm font-semibold text-white hover:bg-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b4f]">
            {status === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copy[0]}
          </button>
        </div>
        <p role="status" className="mt-3 text-xs text-[#006b4f]">{status === 'copied' ? copy[1] : status === 'error' ? copy[4] : copy[2]}</p>
        <Link href={getLocalizedNavigationHref('/agent/integration-kit', locale)} className="mt-3 inline-block text-xs text-[#6d675e] underline underline-offset-4">{copy[3]} ↗</Link>
      </div>
    </details>
  )
}
