import { useState } from 'react';
import API from '../api/axios';

const PURPLE = '#242165';
const FONT   = "'IBM Plex Sans Arabic', Tahoma, sans-serif";
const SERIF  = "'Spectral', Georgia, serif";

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm]   = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const upd = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError('أدخل البريد وكلمة المرور'); return; }
    setLoading(true); setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload  = isRegister ? form : { email: form.email, password: form.password };
      const res = await API.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'بيانات غير صحيحة');
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Spectral:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: ${PURPLE} !important; box-shadow: 0 0 0 3px rgba(36,33,101,0.1); }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={s.card}>
        {/* شعار */}
        <div style={s.logo}>
          <img
            src="/logo.png"
            alt="Daftar"
            style={{ width: 52, height: 52, objectFit: 'contain' }}
          />
          <div>
            <div style={s.logoName}>دفتر</div>
            <div style={s.logoSub}>المحاسب الذكي</div>
          </div>
        </div>

        {/* عنوان */}
        <h2 style={s.title}>
          {isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}
        </h2>

        {/* Toggle */}
        <div style={s.toggle}>
          <button style={{ ...s.toggleBtn, ...(isRegister ? {} : s.toggleOn) }} onClick={() => { setIsRegister(false); setError(''); }}>دخول</button>
          <button style={{ ...s.toggleBtn, ...(isRegister ? s.toggleOn : {}) }} onClick={() => { setIsRegister(true); setError(''); }}>حساب جديد</button>
        </div>

        {/* حقول */}
        <div style={s.fields}>
          {isRegister && (
            <input style={s.input} value={form.name} onChange={upd('name')} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="الاسم الكامل" autoComplete="name" />
          )}
          <input type="email" dir="ltr" style={s.input} value={form.email} onChange={upd('email')} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="البريد الإلكتروني" autoComplete="email" />
          <input type="password" style={s.input} value={form.password} onChange={upd('password')} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="كلمة المرور" autoComplete={isRegister ? 'new-password' : 'current-password'} />
        </div>

        {/* خطأ */}
        {error && <div style={s.error}>⚠️ {error}</div>}

        {/* زر */}
        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading
            ? <span style={s.spinner} />
            : isRegister ? 'إنشاء الحساب' : 'دخول'}
        </button>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', background: '#F5F3FF',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: FONT, direction: 'rtl',
    padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 20, padding: '40px 36px',
    width: '100%', maxWidth: 380,
    boxShadow: '0 8px 32px rgba(36,33,101,0.1)',
    animation: 'fadeIn 0.4s ease',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoMark: {
    width: 40, height: 40, borderRadius: 10, background: PURPLE,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: '#fff',
  },
  logoName: { fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: PURPLE },
  logoSub:  { fontSize: 11, color: '#8578D3', marginTop: 1 },
  title: { fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: PURPLE, marginBottom: 20 },
  toggle: {
    display: 'flex', background: '#EDE9FF', borderRadius: 10,
    padding: 4, marginBottom: 20, gap: 4,
  },
  toggleBtn: {
    flex: 1, padding: '9px', border: 'none', borderRadius: 7, fontSize: 13.5,
    fontWeight: 500, cursor: 'pointer', background: 'transparent',
    color: '#8578D3', fontFamily: FONT, transition: 'all 0.15s',
  },
  toggleOn: { background: '#fff', color: PURPLE, fontWeight: 700, boxShadow: '0 2px 8px rgba(36,33,101,0.12)' },
  fields: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 },
  input: {
    border: '1.5px solid #E3DAC9', borderRadius: 10, padding: '12px 14px',
    fontSize: 14, color: '#1A1A1A', background: '#FAFAF8',
    fontFamily: FONT, width: '100%', transition: 'all 0.15s',
  },
  error: {
    background: '#FFF0EE', border: '1px solid #F5C6BC', color: '#8B2C2C',
    padding: '10px 14px', borderRadius: 9, fontSize: 13, marginBottom: 14,
  },
  btn: {
    width: '100%', background: PURPLE, color: '#fff', border: 'none',
    borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: FONT,
    boxShadow: '0 4px 14px rgba(36,33,101,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 48,
  },
  spinner: {
    width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite', display: 'inline-block',
  },
};
