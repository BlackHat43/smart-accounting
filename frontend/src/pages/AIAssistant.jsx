import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { SANAD_AVATAR } from '../assets/icons';

const C = {
  purpleDark:  '#242165',
  purpleMuted: '#8578D3',
  cream:       '#FDF7EB',
  border:      '#E3DAC9',
  muted:       '#7E7569',
  text:        '#1A1A1A',
  white:       '#FFFFFF',
};
const FONT = "'IBM Plex Sans Arabic', Tahoma, sans-serif";

const QUICK_QUESTIONS = [
  'ما هو وضعي المالي الحالي؟',
  'ما هي أكبر مصاريفي؟',
  'هل الميزانية متوازنة؟',
  'كم يبلغ صافي الربح؟',
  'ما هي المعاملات غير المعتمدة؟',
  'هل هناك قيود تحتاج مراجعة؟',
];

function fmt(n) {
  return Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hideOnError(e) { e.currentTarget.style.visibility = 'hidden'; }


function parseRichBlocks(content) {
  const rawLines = (content || '').split('\n');
  const elements = [];
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    if (line.trim() === '') { i++; continue; }

    if (/^[-•*]\s+/.test(line.trim())) {
      const items = [];
      while (i < rawLines.length && /^[-•*]\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^[-•*]\s+/, ''));
        i++;
      }
      elements.push({ type: 'ul', items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(line.trim())) {
      const items = [];
      while (i < rawLines.length && /^\d+[.)]\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      elements.push({ type: 'ol', items });
      continue;
    }
    if (/^#{1,3}\s+/.test(line.trim())) {
      elements.push({ type: 'heading', text: line.trim().replace(/^#{1,3}\s+/, '') });
      i++;
      continue;
    }
    elements.push({ type: 'line', text: line });
    i++;
  }
  return elements;
}

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(p => p !== '');
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}-b${i}`} style={{ color: C.purpleDark, fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-t${i}`}>{part}</span>;
  });
}

function renderRichText(content) {
  const blocks = parseRichBlocks(content);
  return blocks.map((block, bi) => {
    if (block.type === 'ul') {
      return (
        <ul key={bi} style={{ margin: '2px 0', paddingRight: 18, paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {block.items.map((item, li) => <li key={li} style={{ lineHeight: 1.6 }}>{renderInline(item, `${bi}-${li}`)}</li>)}
        </ul>
      );
    }
    if (block.type === 'ol') {
      return (
        <ol key={bi} style={{ margin: '2px 0', paddingRight: 18, paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {block.items.map((item, li) => <li key={li} style={{ lineHeight: 1.6 }}>{renderInline(item, `${bi}-${li}`)}</li>)}
        </ol>
      );
    }
    if (block.type === 'heading') {
      return <div key={bi} style={{ fontWeight: 700, color: C.purpleDark, fontSize: 13 }}>{renderInline(block.text, `${bi}`)}</div>;
    }
    return <div key={bi}>{renderInline(block.text, `${bi}`)}</div>;
  });
}

export default function AIAssistant({ transactions, totals, onClose }) {
  const netProfit = (totals.revenue || 0) - (totals.cogs || 0) - (totals.expenses || 0);

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `مرحباً! أنا سند، مساعدك المالي الذكي\n\nلديّ اطلاع كامل على نظامك:\n\n• ${transactions.length} معاملة مسجّلة\n• إيرادات: ${fmt(totals.revenue)} ر.س\n• صافي الربح: ${fmt(netProfit)} ر.س\n\nكيف يمكنني مساعدتك اليوم؟`,
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function buildContext() {
    const pending    = transactions.filter(t => !t.is_approved);
    const recentTxs  = transactions.slice(0, 10).map(t =>
      `- ${t.date?.slice(0,10)}: ${t.description} | ${fmt(t.amount)} ر.س | مدين: ${t.debit_account || '—'} | دائن: ${t.credit_account || '—'} | ${t.is_approved ? 'معتمد' : 'مراجعة'}`
    ).join('\n');

    return `أنت سند، المساعد المالي الذكي للنظام المحاسبي "دفتر". أجب دائماً بالعربية بشكل مختصر ومفيد ومتخصص.

تنسيق الإجابة: اكتب فقرات قصيرة وواضحة. عند تعداد نقاط استخدم "-" فقط في بداية
السطر (وليس "*")، وسطرًا واحدًا لكل نقطة. استخدم "**نص**" فقط للتشديد على رقم
أو كلمة مهمة جدًا، وباعتدال شديد. لا تكرر نفس المعلومة بصياغتين مختلفتين.

البيانات الحالية:
الإيرادات: ${fmt(totals.revenue)} ر.س
المصروفات: ${fmt((totals.expenses||0) + (totals.cogs||0))} ر.س
صافي الربح: ${fmt(netProfit)} ر.س
الأصول: ${fmt(totals.assets)} ر.س
الخصوم: ${fmt(totals.liabilities)} ر.س
حقوق الملكية: ${fmt(totals.equity)} ر.س
التوازن: ${Math.abs((totals.assets||0)-(totals.liabilities||0)-(totals.equity||0)) < 0.01 ? 'متوازنة ✅' : 'غير متوازنة ⚠️'}
إجمالي المعاملات: ${transactions.length}
معتمدة: ${transactions.filter(t=>t.is_approved).length}
بانتظار المراجعة: ${pending.length}

آخر 10 معاملات:
${recentTxs || 'لا توجد معاملات'}`;
  }

  const sendMessage = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg) return;

    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      // نرسل للـ Backend الذي يتواصل مع Claude API
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await API.post('/api/chat', {
        system:   buildContext(),
        messages: [...history, { role: 'user', content: userMsg }],
      });
      const reply = res.data?.content || 'عذراً، لم أتمكن من الإجابة.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const detail = err.response?.data?.detail || 'تعذّر الاتصال بالذكاء الاصطناعي.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${detail}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.avatar}><img src={SANAD_AVATAR} alt="سند" onError={hideOnError} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /></div>
            <div>
              <div style={s.headerTitle}>سند — مساعدك المالي الذكي</div>
              <div style={s.headerSub}>
                <span style={s.dot} /> {transactions.length} معاملة
              </div>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Messages */}
        <div style={s.messages}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end',
            }}>
              {m.role === 'assistant' && <img src={SANAD_AVATAR} alt="سند" onError={hideOnError} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ ...s.bubble, ...(m.role === 'user' ? s.userBubble : s.aiBubble) }}>
                {m.role === 'assistant'
                  ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{renderRichText(m.content)}</div>
                  : m.content.split('\n').map((line, j) => <div key={j}>{line || <br />}</div>)}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <img src={SANAD_AVATAR} alt="سند" onError={hideOnError} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div style={s.aiBubble}>
                <div style={s.typing}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} style={{ ...s.typingDot, animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        <div style={s.quickWrap}>
          <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6 }}>أسئلة شائعة:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} style={s.quickBtn} onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={s.inputRow}>
          <input
            style={s.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="اسألني عن حساباتك..."
            disabled={loading}
          />
          <button
            style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >←</button>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%,80%,100% { transform:scale(0.6); opacity:0.4; }
          40% { transform:scale(1); opacity:1; }
        }
      `}</style>
    </div>
  );
}

const s = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(36,33,101,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', zIndex: 200, backdropFilter: 'blur(4px)', padding: '0 0 0 24px' },
  panel:      { width: 400, height: '82vh', background: '#FCFAF4', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', fontFamily: FONT, direction: 'rtl', boxShadow: '0 -8px 40px rgba(36,33,101,0.2)', overflow: 'hidden' },
  header:     { background: 'linear-gradient(100deg, #161440, #242165)', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar:     { width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  headerTitle:{ color: '#fff', fontWeight: 700, fontSize: 13.5 },
  headerSub:  { color: 'rgba(255,255,255,0.65)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 },
  dot:        { width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' },
  closeBtn:   { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 13 },
  messages:   { flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 },
  bubble:     { maxWidth: '80%', padding: '9px 13px', borderRadius: 12, fontSize: 13, lineHeight: 1.6 },
  userBubble: { background: '#EDE9FF', color: C.purpleDark, borderBottomRightRadius: 4 },
  aiBubble:   { background: '#fff', border: `1px solid ${C.border}`, color: C.text, borderBottomLeftRadius: 4 },
  typing:     { display: 'flex', gap: 4, padding: '3px 0' },
  typingDot:  { width: 7, height: 7, borderRadius: '50%', background: C.muted, display: 'inline-block', animation: 'typingBounce 1.2s infinite ease-in-out' },
  quickWrap:  { padding: '8px 14px', borderTop: `1px solid ${C.border}` },
  quickBtn:   { border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 10px', background: '#fff', fontSize: 11, color: C.purpleDark, cursor: 'pointer', fontFamily: FONT },
  inputRow:   { display: 'flex', gap: 8, padding: '10px 14px', borderTop: `1px solid ${C.border}` },
  input:      { flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '9px 12px', fontSize: 13, fontFamily: FONT, color: C.text },
  sendBtn:    { width: 40, height: 40, borderRadius: 9, border: 'none', background: C.purpleDark, color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
};