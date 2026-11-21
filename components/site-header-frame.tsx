import type { ReactNode } from 'react'
import styles from './site-header.module.css'

// The normal app and the static reader share the same header geometry.
export function SiteHeaderFrame({ brand, navigation, actions }: {
  brand: ReactNode; navigation: ReactNode; actions: ReactNode
}) {
  return <header className={styles.header}><div className={styles.inner}>
    {brand}{navigation}<div className={styles.actions}>{actions}</div>
  </div></header>
}
