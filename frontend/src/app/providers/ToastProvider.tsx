import { createContext, type ReactNode, useContext, useRef, useState } from 'react';
import { ToastViewport, type ToastItem } from '../../shared/ui/toast/ToastViewport';

interface ToastContextValue {
  pushToast: (message: string, type?: ToastItem['type']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastIdRef = useRef(1);

  function pushToast(message: string, type: ToastItem['type'] = 'info') {
    if (!message) return;

    const toastId = nextToastIdRef.current;
    nextToastIdRef.current += 1;

    setToasts((current) => [...current, { id: toastId, message, type }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 3500);
  }

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
