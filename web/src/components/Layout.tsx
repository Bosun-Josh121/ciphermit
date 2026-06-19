import type { ReactNode } from 'react'

interface Props { children: ReactNode }

export function Layout({ children }: Props) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-ink font-display font-semibold tracking-tight text-lg hover:text-seal transition-colors">
          ciphermit
        </a>
        <span className="mono text-xs text-mute">testnet</span>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        {children}
      </main>
    </div>
  )
}
