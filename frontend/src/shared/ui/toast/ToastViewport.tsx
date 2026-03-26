export interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastViewportProps {
  toasts: ToastItem[];
}

export function ToastViewport({ toasts }: ToastViewportProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
