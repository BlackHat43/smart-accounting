import { useState, useEffect } from 'react';

const PURPLE = '#242165';
const FONT   = "'IBM Plex Sans Arabic', Tahoma, sans-serif";
const SERIF  = "'Spectral', Georgia, serif";

const STEPS = [
  { id: null,                    page: 'dashboard',    position: 'center', title: 'مرحباً بك في دفتر 👋',         icon: '🏛️', desc: 'النظام المحاسبي الذكي. سنأخذك في جولة تفاعلية سريعة لتتعرف على كل عنصر.' },
  { id: 'tour-kpi',              page: 'dashboard',    position: 'bottom', title: 'لوحة الأرقام الرئيسية',        icon: '📊', desc: 'عدد القيود، المراجعة، المعتمدة، وصافي الربح — كلها تتحدث فوراً مع كل معاملة.' },
  { id: 'tour-eq-bar',           page: 'dashboard',    position: 'bottom', title: 'بطاقة صافي الربح',             icon: '💰', desc: 'تعرض صافي الربح الحالي مع ملخص الإيرادات والمصروفات بشكل فوري.' },
  { id: 'tour-add-btn',          page: 'dashboard',    position: 'top',    title: 'إضافة معاملة + رفع فاتورة',   icon: '➕', desc: 'إضافة قيد جديد أو رفع صورة فاتورة ليستخرج الذكاء الاصطناعي بياناتها تلقائياً.' },
  { id: 'tour-ai-btn',           page: 'dashboard',    position: 'bottom', title: 'سند — مساعدك الذكي 🤖',       icon: '🤖', desc: 'اسأله عن وضعك المالي، أكبر مصاريفك، أو أي سؤال محاسبي — يعرف كل بياناتك.' },
  { id: 'tour-nav-transactions', page: 'transactions', position: 'bottom', title: 'صفحة المعاملات',               icon: '≡',  desc: 'عرض كل القيود مع بحث وتصفية وتعديل وحذف. كل قيد يظهر حالته.' },
  { id: 'tour-nav-reports',      page: 'reports',      position: 'bottom', title: 'صفحة التقارير 📈',             icon: '📈', desc: 'قائمة الدخل والميزانية العمومية تُحسب تلقائياً من قيودك المسجلة.' },
  { id: null,                    page: null,            position: 'center', title: 'أنت جاهز! 🎉',                 icon: '✅', desc: 'ابدأ بإضافة أول معاملة أو ارفع فاتورة لتجربة قوة الذكاء الاصطناعي.' },
];

export default function OnboardingTour({ onFinish, onNavigate }) {
  const [step, setStep]           = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  useEffect(() => {
    if (current.page && onNavigate) onNavigate(current.page);

    if (current.id) {
      const timer = setTimeout(() => {
        const el = document.querySelector(`[data-tour="${current.id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          calcPos(rect, current.position);
        } else {
          setTargetRect(null);
        }
      }, 450);
      return () => clearTimeout(timer);
    } else {
      setTargetRect(null);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const calcPos = (rect, pos) => {
    const W = 300, H = 210, M = 14;
    let top, left;
    if (pos === 'bottom') { top = rect.bottom + M; left = rect.left + rect.width / 2 - W / 2; }
    else if (pos === 'top') { top = rect.top - H - 20; left = rect.left + rect.width / 2 - W / 2; }
    else if (pos === 'right') { top = rect.top + rect.height / 2 - H / 2; left = rect.right + M; }
    else { top = window.innerHeight / 2 - H / 2; left = window.innerWidth / 2 - W / 2; }
    left = Math.max(M, Math.min(left, window.innerWidth - W - M));
    top  = Math.max(M, Math.min(top, window.innerHeight - H - M));
    setTooltipPos({ top, left });
};

  const finish = () => { localStorage.setItem('daftar_tour_done', '1'); onFinish(); };
  const next   = () => isLast ? finish() : setStep(s => s + 1);
  const prev   = () => !isFirst && setStep(s => s - 1);

  const isCenter = !targetRect || current.position === 'center';

  return (
    <>
      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: targetRect ? 'transparent' : 'rgba(36,33,101,0.7)', zIndex: 297, backdropFilter: targetRect ? 'none' : 'blur(4px)' }} />

      {/* Spotlight */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          borderRadius: 12,
          zIndex: 298,
          pointerEvents: 'none',
          boxShadow: '0 0 0 9999px rgba(36,33,101,0.72)',
          border: '2px solid rgba(255,255,255,0.55)',
          transition: 'all 0.3s ease',
        }} />
      )}

      {/* Tooltip */}
      <div style={{
        position: 'fixed',
        top:  current.id === 'tour-add-btn' ? 90 : (isCenter ? '50%' : tooltipPos.top),
        left: current.id === 'tour-add-btn' ? 'calc(100% - 360px)' : (isCenter ? '50%' : tooltipPos.left),
        transform: isCenter && current.id !== 'tour-add-btn' ? 'translate(-50%,-50%)' : 'none',
        width: isCenter ? 440 : 300,
        background: '#fff', borderRadius: 16,
        padding: isCenter ? '30px 34px' : '18px 20px',
        boxShadow: '0 16px 48px rgba(36,33,101,0.25)',
        zIndex: 299, fontFamily: FONT, direction: 'rtl',
        transition: 'all 0.3s ease',
      }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: isCenter ? 18 : 12 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ height: 5, borderRadius: 3, transition: 'all 0.3s', width: i === step ? 18 : 5, background: i === step ? PURPLE : i < step ? '#8578D3' : '#E3DAC9' }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ width: isCenter ? 64 : 44, height: isCenter ? 64 : 44, borderRadius: '50%', background: '#EDE9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: 12, fontSize: isCenter ? 28 : 20 }}>
          {current.icon}
        </div>

        <div style={{ fontSize: 10.5, color: '#8578D3', textAlign: 'center', marginBottom: 5 }}>{step + 1} / {STEPS.length}</div>
        <h3 style={{ fontFamily: SERIF, fontSize: isCenter ? 19 : 15, fontWeight: 700, color: PURPLE, textAlign: 'center', marginBottom: 8 }}>{current.title}</h3>
        <p style={{ fontSize: isCenter ? 13 : 12, color: '#7E7569', lineHeight: 1.7, textAlign: 'center', marginBottom: 18 }}>{current.desc}</p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          {!isFirst && <button onClick={prev} style={{ border: '1.5px solid #E3DAC9', borderRadius: 8, padding: '8px 14px', background: '#fff', color: '#7E7569', fontSize: 12.5, cursor: 'pointer', fontFamily: FONT }}>← السابق</button>}
          <button onClick={finish} style={{ border: 'none', background: 'none', color: '#B5AFAB', fontSize: 12, cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline' }}>تخطي</button>
          <button onClick={next} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, boxShadow: '0 4px 12px rgba(36,33,101,0.25)' }}>
            {isLast ? 'ابدأ الآن 🚀' : 'التالي ←'}
          </button>
        </div>
      </div>
    </>
  );
}