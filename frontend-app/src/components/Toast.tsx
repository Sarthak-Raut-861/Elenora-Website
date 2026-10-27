import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-green-600" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
}

const toastStyles: Record<ToastType, string> = {
  success: 'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg max-w-sm bg-green-50 border-green-200 text-green-800',
  error: 'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg max-w-sm bg-red-50 border-red-200 text-red-800',
  info: 'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg max-w-sm bg-blue-50 border-blue-200 text-blue-800',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={toastStyles[t.type]}
            >
              {icons[t.type]}
              <span>{t.message}</span>
              <button
                className="ml-auto p-0.5 rounded hover:opacity-70 transition-opacity"
                aria-label="Dismiss toast"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
