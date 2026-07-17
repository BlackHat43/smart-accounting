import { useState, useRef } from 'react';

const C = {
  purpleDark:  '#242165',
  purpleMuted: '#8578D3',
  border:      '#E3DAC9',
  muted:       '#7E7569',
  cream:       '#FDF7EB',
  white:       '#FFFFFF',
};
const FONT  = "'IBM Plex Sans Arabic', Tahoma, sans-serif";
const SERIF = "'Spectral', Georgia, serif";


const BUSINESS_TYPES = [
  'مكتب محاسبة', 'تجارة تجزئة', 'مطاعم وكافيهات', 'مقاولات وإنشاءات',
  'خدمات مهنية واستشارات', 'عيادة أو مركز طبي', 'تعليم وتدريب',
  'عقارات', 'تقنية وبرمجيات', 'استيراد وتصدير',
];

export default function ProfileModal({ user, onClose, onUpdate }) {
  const [name, setName]     = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [preview, setPreview] = useState(user?.avatar || null);
  const [businessType, setBusinessType] = useState(() => {
    if (!user?.business_type) return '';
    return BUSINESS_TYPES.includes(user.business_type) ? user.business_type : '__other__';
  });
  const [customBusiness, setCustomBusiness] = useState(
    BUSINESS_TYPES.includes(user?.business_type) ? '' : (user?.business_type || '')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const fileRef = useRef(null);

  const handleImage = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('حجم الصورة يجب أن لا يتجاوز 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setAvatar(e.target.result); // base64
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('الاسم مطلوب'); return; }
    setLoading(true); setError('');
    try {
      const finalBusinessType = businessType === '__other__' ? customBusiness.trim() : businessType;
      // حفظ في localStorage (بدون backend endpoint منفصل)
      const updatedUser = { ...user, name: name.trim(), avatar, business_type: finalBusinessType || null };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      onClose();
    } catch {
      setError('تعذّر الحفظ');
    }
    setLoading(false);
  };

  const initials = name?.[0]?.toUpperCase() || '؟';

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <h3 style={s.title}>تعديل الملف الشخصي</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          {/* Avatar */}
          <div style={s.avatarSection}>
            <div style={s.avatarWrap} onClick={() => fileRef.current?.click()}>
              {preview
                ? <img src={preview} alt="avatar" style={s.avatarImg} />
                : <div style={s.avatarPlaceholder}>{initials}</div>
              }
              <div style={s.avatarOverlay}>📷</div>
            </div>
            <div style={s.avatarHint}>اضغط لتغيير الصورة</div>
            <input
              ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleImage(e.target.files[0])}
            />
            {preview && (
              <button
                style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', marginTop: 4 }}
                onClick={() => { setPreview(null); setAvatar(null); }}
              >حذف الصورة</button>
            )}
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={s.lbl}>الاسم الكامل</label>
            <input
              style={s.inp}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="أدخل اسمك"
              autoFocus
            />
          </div>

          {/* مجال نشاط المنشأة */}
          <div style={{ marginBottom: 16 }}>
            <label style={s.lbl}>مجال نشاط المنشأة</label>
            <select
              style={s.inp}
              value={businessType}
              onChange={e => setBusinessType(e.target.value)}
            >
              <option value="">— اختر المجال —</option>
              {BUSINESS_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              <option value="__other__">أخرى...</option>
            </select>
            {businessType === '__other__' && (
              <input
                style={{ ...s.inp, marginTop: 8 }}
                value={customBusiness}
                onChange={e => setCustomBusiness(e.target.value)}
                placeholder="اكتب مجال نشاطك"
              />
            )}
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              يساعد الذكاء الاصطناعي على اقتراح الحسابات المناسبة لطبيعة نشاطك.
            </div>
          </div>

          {/* Email (readonly) */}
          <div style={{ marginBottom: 20 }}>
            <label style={s.lbl}>البريد الإلكتروني</label>
            <input
              style={{ ...s.inp, background: '#F5F3FF', color: C.muted, cursor: 'not-allowed' }}
              value={user?.email || ''}
              readOnly
            />
          </div>

          {error && <div style={s.error}>⚠️ {error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.cancelBtn} onClick={onClose}>إلغاء</button>
            <button style={s.saveBtn} onClick={handleSave} disabled={loading}>
              {loading ? 'جاري الحفظ...' : '✓ حفظ التغييرات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(36,33,101,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: 20 },
  modal:     { background: C.white, borderRadius: 18, width: '100%', maxWidth: 380, boxShadow: '0 16px 48px rgba(36,33,101,0.2)', fontFamily: FONT, direction: 'rtl' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: `1px solid ${C.border}` },
  title:     { fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.purpleDark },
  closeBtn:  { background: '#F0EBE0', border: 'none', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 13, color: C.muted },
  body:      { padding: 20 },
  avatarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 },
  avatarWrap:{ position: 'relative', width: 88, height: 88, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', border: `3px solid ${C.purpleDark}` },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: C.purpleDark, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 32, fontWeight: 700 },
  avatarOverlay:{ position: 'absolute', inset: 0, background: 'rgba(36,33,101,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, opacity: 0, transition: 'opacity 0.2s' },
  avatarHint: { fontSize: 11.5, color: C.muted, marginTop: 8 },
  lbl:       { display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 },
  inp:       { width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '10px 12px', fontSize: 14, color: '#1A1A1A', fontFamily: FONT },
  error:     { background: '#FFF0EE', border: '1px solid #F5C6BC', color: '#8B2C2C', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 14 },
  cancelBtn: { flex: 1, border: `1.5px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 9, padding: '11px', fontSize: 13.5, cursor: 'pointer', fontFamily: FONT },
  saveBtn:   { flex: 1, background: C.purpleDark, color: '#fff', border: 'none', borderRadius: 9, padding: '11px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT },
};