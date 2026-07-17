/*
 * بيانات الدخول: email=dev  password=dev
 */
import { useState } from 'react';
import API from '../api/axios';

const PURPLE = '#242165';
const FONT   = "'IBM Plex Sans Arabic', Tahoma, sans-serif";
const SERIF  = "'Spectral', Georgia, serif";

export default function DevLogin({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const loginAsDev = async () => {
    setLoading(true); setError('');
    try {
      // محاولة تسجيل الدخول أولاً
      const res = await API.post('/auth/login', { email: 'dev', password: 'dev' });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch {
      // لو ما وُجد الحساب، أنشئه تلقائياً
      try {
        const res = await API.post('/auth/register', { name: 'Dev User', email: 'dev', password: 'dev' });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLogin(res.data.user);
      } catch (err2) {
        setError(err2.response?.data?.detail || 'فشل تسجيل الدخول');
        setLoading(false);
      }
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Spectral:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={s.card}>
        <div style={s.badge}>🛠️ وضع التطوير</div>
        <div style={s.logo}>
          <div style={s.logoMark}>ح</div>
          <div style={s.logoName}>دفتر</div>
        </div>
        <p style={s.desc}>دخول سريع بحساب المطوّر</p>
        <div style={s.creds}>
          <span>email: <b>dev</b></span>
          <span>password: <b>dev</b></span>
        </div>
        {error && <div style={s.error}>⚠️ {error}</div>}
        <button style={s.btn} onClick={loginAsDev} disabled={loading}>
          {loading
            ? <span style={s.spinner} />
            : 'دخول فوري →'}
        </button>
      </div>
    </div>
  );
}

const s = {
  page:    { minHeight: '100vh', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, direction: 'rtl' },
  card:    { background: '#fff', borderRadius: 18, padding: '36px 32px', width: 320, textAlign: 'center', boxShadow: '0 8px 32px rgba(36,33,101,0.12)', animation: 'fadeIn 0.4s ease' },
  badge:   { display: 'inline-block', background: '#FFF3CD', color: '#856404', fontSize: 11.5, padding: '4px 12px', borderRadius: 20, marginBottom: 20, fontWeight: 600 },
  logo:    { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 },
  logoMark:{ width: 38, height: 38, borderRadius: 9, background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: '#fff' },
  logoName:{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: PURPLE },
  desc:    { color: '#7E7569', fontSize: 13, marginBottom: 16 },
  creds:   { display: 'flex', gap: 20, justifyContent: 'center', fontSize: 13, color: '#444', background: '#F5F3FF', padding: '10px 16px', borderRadius: 9, marginBottom: 20 },
  error:   { background: '#FFF0EE', color: '#8B2C2C', fontSize: 12.5, padding: '8px 12px', borderRadius: 8, marginBottom: 14 },
  btn:     { width: '100%', background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  spinner: { width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
};
