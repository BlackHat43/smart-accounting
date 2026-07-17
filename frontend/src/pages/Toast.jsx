/**
 * Toast.jsx — إشعارات النجاح والخطأ
 * يُستخدم في كل الصفحات
 */
import { useState, useCallback } from 'react';

const FONT = "'IBM Plex Sans Arabic', Tahoma, sans-serif";

// Hook لاستخدام Toast
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback((msg) => show(msg, 'success'), [show]);
  const error   = useCallback((msg) => show(msg, 'error'),   [show]);
  const info    = useCallback((msg) => show(msg, 'info'),    [show]);

  return { toasts, success, error, info };
}

// Component عرض التوست
export function ToastContainer({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={s.container}>
      <style>{`
        @keyframes toastIn  { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateY(-10px); } }
      `}</style>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            ...s.toast,
            ...(toast.type === 'success' ? s.success :
                toast.type === 'error'   ? s.error   : s.info),
          }}
        >
          <span style={s.icon}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

const s = {
  container: {
    position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
    zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 20px', borderRadius: 12, fontSize: 13.5, fontWeight: 600,
    fontFamily: FONT, direction: 'rtl',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    animation: 'toastIn 0.3s ease',
    minWidth: 200, maxWidth: 360,
    pointerEvents: 'auto',
  },
  success: { background: '#1B5E20', color: '#fff' },
  error:   { background: '#B71C1C', color: '#fff' },
  info:    { background: '#242165', color: '#fff' },
  icon:    { fontSize: 16, flexShrink: 0 },
};
