/**
 * Skeleton / ghost primitives for structured empty states. An empty section
 * shows the real UI in a disabled, ghosted state — so the tool is visibly
 * there even before any data exists.
 */
export function GhostBar({ w = '100%', h = 10, className = '' }: { w?: string | number; h?: number; className?: string }) {
  return (
    <span
      className={`block rounded-full bg-border/50 ${className}`}
      style={{ width: typeof w === 'number' ? `${w}px` : w, height: h }}
    />
  )
}

export function GhostBlock({ className = '' }: { className?: string }) {
  return <span className={`block rounded-lg bg-surface-2/70 ${className}`} />
}
