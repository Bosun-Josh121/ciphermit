import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; kind: ToastKind }

interface ToastState {
  addToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastState | null>(null)
const DISMISS_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const addToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = idRef.current++
    setToasts(prev => [...prev, { id, message, kind }])
    const timer = setTimeout(() => remove(id), DISMISS_MS)
    timers.current.set(id, timer)
  }, [remove])

  function pause(id: number) {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
  }
  function resume(id: number) {
    const timer = setTimeout(() => remove(id), DISMISS_MS)
    timers.current.set(id, timer)
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id)}
            className="bg-surface-2 border border-border-s rounded-2xl px-4 py-3 shadow-[var(--shadow-float)]
                       flex items-start gap-2.5"
          >
            {t.kind === 'success' && <CheckCircle2 size={15} className="text-verified shrink-0 mt-0.5" />}
            {t.kind === 'error' && <AlertCircle size={15} className="text-reject shrink-0 mt-0.5" />}
            <p className="text-[13px] text-tx flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-tx3 hover:text-tx transition-colors">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
