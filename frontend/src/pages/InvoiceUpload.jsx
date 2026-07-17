import { useState, useRef } from 'react';
import API from '../api/axios';

const C = {
  navy: '#1B3A5C', green: '#1F6F4F', greenLight: '#E7F5EE',
  red: '#8B2C2C', redLight: '#FBEAEA', border: '#E8E2D4',
  muted: '#8B8378', text: '#2A2520', amber: '#9A6B1F', amberLight: '#FBF3DE',
};
const FONT = "'IBM Plex Sans Arabic', Tahoma, sans-serif";
const SERIF = "'Spectral', Georgia, serif";

function fmt(n) {
  return Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceUpload({ onClose, onSaved, user }) {
  const [step, setStep] = useState(1); // 1: رفع، 2: نتيجة AI، 3: تأكيد
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [clarification, setClarification] = useState(null); // { clarification_question, ...partial fields }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [partyType, setPartyType] = useState(''); // '' | customer | vendor — للذمم المدينة/الدائنة
  const [dueDate, setDueDate] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError('');
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const analyze = async (paymentMethod) => {
    if (!file) { setError('الرجاء رفع ملف أولاً'); return; }
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (user?.business_type) formData.append('business_type', user.business_type);
      if (paymentMethod) formData.append('payment_method', paymentMethod);
      const res = await API.post('/api/analyze-invoice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.needs_clarification) {
        // الذكاء الاصطناعي لا يخمّن طريقة الدفع — يسأل المحاسب صراحةً بدل أن يخطئ
        setClarification(res.data);
      } else {
        setClarification(null);
        setResult(res.data);
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'تعذّر تحليل الفاتورة. تأكد من وضوح الصورة.');
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      await API.post('/transactions', {
        description: result.description || 'فاتورة مرفوعة',
        vendor: result.vendor,
        date: result.date,
        amount: result.total_amount || result.amount,
        tax_amount: result.tax_amount,
        debit_account: result.debit_account,
        credit_account: result.credit_account,
        ai_suggestion: `تحليل AI تلقائي: ${result.notes || ''}`,
        tx_type: result.tx_type || 'expense',
        account_group: result.account_group || 'expenses',
        is_approved: false,
        is_reviewed: false,
        is_ai_generated: true,
        lines: result.lines || undefined,
        party_type: partyType || null,
        party_name: partyType ? result.vendor : null,
        due_date: partyType && dueDate ? dueDate : null,
        is_paid: partyType ? !!isPaid : true,
        invoice_url: result.invoice_url || null,
      });
      onSaved();
      onClose();
    } catch {
      setError('تعذّر حفظ المعاملة');
    }
    setSaving(false);
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.eyebrow}>رفع فاتورة</div>
            <h2 style={s.title}>تحليل الفاتورة بالذكاء الاصطناعي</h2>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Steps */}
        <div style={s.steps}>
          {['رفع الملف', 'نتيجة التحليل', 'تأكيد الحفظ'].map((lbl, i) => (
            <div key={i} style={s.stepWrap}>
              <div style={{ ...s.dot, ...(step > i+1 ? s.dotDone : step === i+1 ? s.dotActive : {}) }}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span style={{ fontSize: 10.5, color: step >= i+1 ? '#2E286D' : C.muted }}>{lbl}</span>
              {i < 2 && <div style={s.line} />}
            </div>
          ))}
        </div>

        <div style={s.body}>
          {/* STEP 1: رفع */}
          {step === 1 && (
            <>
              <div
                style={s.dropZone}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
                ) : file ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: C.navy, fontWeight: 600, marginTop: 8 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{(file.size / 1024).toFixed(0)} KB</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#2E286D', fontSize: 14 }}>اسحب الفاتورة هنا</div>
                    <div style={{ color: C.muted, fontSize: 12.5, marginTop: 4 }}>أو اضغط للاختيار</div>
                    <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6 }}>JPG • PNG • WEBP</div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
              </div>

              {file && (
                <div style={s.fileInfo}>
                  <span style={{ fontSize: 13 }}>{file.name}</span>
                  <button style={s.removeBtn} onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setClarification(null); }}>✕</button>
                </div>
              )}

              {error && <Err msg={error} />}

              {clarification ? (
                <div style={s.clarifyBox}>
                  <div style={s.clarifyQuestion}>
                    {clarification.clarification_question || 'يرجى تحديد طريقة الدفع أولاً حتى يكمل الذكاء الاصطناعي تحليل القيد بدقة.'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={s.clarifyBtn} onClick={() => analyze('نقدًا')} disabled={loading}>نقدًا</button>
                    <button style={s.clarifyBtn} onClick={() => analyze('تحويل بنكي')} disabled={loading}>تحويل بنكي</button>
                    <button style={s.clarifyBtn} onClick={() => analyze('آجل')} disabled={loading}>آجل</button>
                  </div>
                  {loading && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>جاري إكمال التحليل...</div>}
                </div>
              ) : (
                <>
                  <div style={s.aiNote}>
                    <span style={{ fontSize: 12.5, color: '#2E286D' }}>
                      الذكاء الاصطناعي سيستخرج: اسم المورد، التاريخ، المبلغ، الضريبة، واقتراح القيد المحاسبي تلقائياً.
                      إن لم تكن طريقة الدفع واضحة بالفاتورة سيسألك عنها قبل إكمال القيد.
                    </span>
                  </div>
                  <button style={s.primaryBtn} onClick={() => analyze()} disabled={loading || !file}>
                    {loading ? 'جاري التحليل...' : 'تحليل الفاتورة بالذكاء الاصطناعي'}
                  </button>
                </>
              )}
            </>
          )}

          {/* STEP 2: نتيجة */}
          {step === 2 && result && (
            <>
              <div style={s.confidenceBadge(result.confidence)}>
                {result.confidence === 'high' ? 'دقة عالية' : result.confidence === 'medium' ? 'دقة متوسطة' : 'دقة منخفضة'}
              </div>

              <div style={s.resultGrid}>
                <ResultField label="المورد" value={result.vendor} editable onEdit={v => setResult({...result, vendor: v})} />
                <ResultField label="التاريخ" value={result.date} editable onEdit={v => setResult({...result, date: v})} />
                <ResultField label="المبلغ (قبل الضريبة)" value={`${fmt(result.amount)} ر.س`} />
                <ResultField label="الضريبة" value={`${fmt(result.tax_amount)} ر.س`} />
                <ResultField label="الإجمالي" value={`${fmt(result.total_amount || result.amount)} ر.س`} highlight />
                <ResultField label="نوع المعاملة" value={result.tx_type} />
              </div>

              <div style={s.entryBox}>
                <div style={s.entryTitle}>القيد المقترح</div>
                <div style={s.entryRow}>
                  <div style={{ flex: 1 }}>
                    <div style={s.entryLbl}>مدين</div>
                    <input style={s.entryInp} value={result.debit_account || ''} onChange={e => setResult({...result, debit_account: e.target.value})} />
                  </div>
                  <span style={{ color: C.muted, paddingTop: 20 }}>→</span>
                  <div style={{ flex: 1 }}>
                    <div style={s.entryLbl}>دائن</div>
                    <input style={s.entryInp} value={result.credit_account || ''} onChange={e => setResult({...result, credit_account: e.target.value})} />
                  </div>
                </div>
                {result.notes && <div style={s.notes}>{result.notes}</div>}
              </div>

              {error && <Err msg={error} />}

              <div style={s.btnRow}>
                <button style={s.secondaryBtn} onClick={() => setStep(1)}>رفع فاتورة أخرى</button>
                <button style={s.primaryBtn} onClick={() => setStep(3)}>متابعة للحفظ</button>
              </div>
            </>
          )}

          {/* STEP 3: تأكيد */}
          {step === 3 && result && (
            <>
              <div style={s.confirmCard}>
                <div style={s.confirmTitle}>ملخص الفاتورة</div>
                {[
                  ['المورد', result.vendor],
                  ['التاريخ', result.date],
                  ['الإجمالي', `${fmt(result.total_amount || result.amount)} ر.س`],
                  ['مدين', result.debit_account],
                  ['دائن', result.credit_account],
                ].map(([lbl, val], i) => (
                  <div key={i} style={s.confirmRow}>
                    <span style={{ color: C.muted, fontSize: 13 }}>{lbl}</span>
                    <span style={{ fontWeight: 500, color: C.text, fontSize: 13 }}>{val || '—'}</span>
                  </div>
                ))}
                <div style={s.pendingNote}>
                  سيُحفظ القيد بحالة "بانتظار المراجعة" حتى يعتمده المحاسب
                </div>
              </div>

              {/* الذمم المدينة/الدائنة — إن لم تُحدَّد هنا، لن تظهر الفاتورة في
                  بطاقات العملاء/الموردين المستحقين بالرئيسية */}
              <div style={s.entryBox}>
                <div style={s.entryTitle}>ذمم (اختياري)</div>
                <select style={s.entryInp} value={partyType} onChange={e => setPartyType(e.target.value)}>
                  <option value="">بدون</option>
                  <option value="customer">مستحق على عميل (ذمم مدينة)</option>
                  <option value="vendor">مستحق لمورد (ذمم دائنة)</option>
                </select>
                {partyType && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={s.entryLbl}>تاريخ الاستحقاق</div>
                      <input type="date" style={s.entryInp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.text, paddingTop: 18 }}>
                      <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                      تم السداد بالكامل
                    </label>
                  </div>
                )}
              </div>

              {error && <Err msg={error} />}

              <div style={s.btnRow}>
                <button style={s.secondaryBtn} onClick={() => setStep(2)}>رجوع للتعديل</button>
                <button style={s.primaryBtn} onClick={save} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ القيد'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultField({ label, value, editable, onEdit, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {editable ? (
        <input style={{ ...s.entryInp, width: '100%' }} defaultValue={value} onBlur={e => onEdit(e.target.value)} />
      ) : (
        <div style={{
          padding: '8px 12px', background: highlight ? C.greenLight : '#F7F4EC',
          borderRadius: 8, fontSize: 13.5, fontWeight: highlight ? 700 : 500,
          color: highlight ? C.green : C.text,
        }}>{value || '—'}</div>
      )}
    </div>
  );
}

function Err({ msg }) {
  return <div style={{ background: '#FDF0EE', border: `1px solid #E8C4BC`, color: C.red, padding: '10px 14px', borderRadius: 9, fontSize: 13, marginBottom: 14 }}>{msg}</div>;
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 150, backdropFilter: 'blur(4px)', padding: 20,
  },
  modal: {
    background: '#FCFAF4', borderRadius: 18, width: '100%', maxWidth: 520,
    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
    fontFamily: FONT, direction: 'rtl',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '22px 24px 0' },
  eyebrow: { fontSize: 11, letterSpacing: 1, color: C.muted, marginBottom: 4 },
  title: { fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: '#2E286D', margin: 0 },
  closeBtn: { background: '#F1ECE0', border: 'none', width: 28, height: 28, borderRadius: '50%', color: C.muted, fontSize: 13, cursor: 'pointer' },
  steps: { display: 'flex', alignItems: 'center', padding: '18px 24px', gap: 0 },
  stepWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 26, height: 26, borderRadius: '50%', background: '#E8E2D4', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  dotActive: { background: '#2E286D', color: '#fff' },
  dotDone: { background: C.green, color: '#fff' },
  line: { width: 30, height: 1, background: C.border, margin: '0 4px' },
  body: { padding: '8px 24px 24px' },

  dropZone: {
    border: `2px dashed ${C.border}`, borderRadius: 14, padding: '32px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', minHeight: 160, marginBottom: 12,
    background: '#FAFAF6', transition: 'all 0.2s',
  },
  fileInfo: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#EAF0F6', borderRadius: 9, padding: '8px 12px', marginBottom: 12,
  },
  removeBtn: { background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14 },
  aiNote: {
    display: 'flex', gap: 8, alignItems: 'flex-start',
    background: '#F7F3EB', border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '10px 14px', marginBottom: 16,
  },
  primaryBtn: {
    width: '100%', background: '#2E286D',
    color: '#fff', border: 'none', borderRadius: 10, padding: '13px',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
  },
  secondaryBtn: {
    flex: 1, background: '#fff', color: C.muted, border: `1.5px solid ${C.border}`,
    borderRadius: 10, padding: '13px', fontSize: 14, cursor: 'pointer', fontFamily: FONT,
  },
  btnRow: { display: 'flex', gap: 10 },
  confidenceBadge: (conf) => ({
    display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
    marginBottom: 14,
    background: conf === 'high' ? C.greenLight : conf === 'medium' ? C.amberLight : C.redLight,
    color: conf === 'high' ? C.green : conf === 'medium' ? C.amber : C.red,
  }),
  resultGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  entryBox: { background: '#FAF8F2', borderRadius: 14, padding: 16, marginBottom: 16 },
  entryTitle: { fontWeight: 700, color: '#2E286D', fontSize: 13.5, marginBottom: 12 },
  entryRow: { display: 'flex', alignItems: 'flex-end', gap: 10 },
  entryLbl: { fontSize: 11, color: '#5A6B7C', marginBottom: 5, fontWeight: 600 },
  entryInp: { width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: FONT, background: '#fff' },
  notes: { fontSize: 12.5, color: '#3A4F63', background: 'rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: 8, marginTop: 10, lineHeight: 1.6 },
  confirmCard: { background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16 },
  confirmTitle: { fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: '#2E286D', marginBottom: 12 },
  confirmRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px dashed #F1ECE0` },
  pendingNote: { fontSize: 12, color: C.amber, background: C.amberLight, padding: '8px 12px', borderRadius: 8, marginTop: 12 },
  clarifyBox: {
    background: C.amberLight, border: `1px solid ${C.amber}`, borderRadius: 12,
    padding: '14px 16px', marginBottom: 16,
  },
  clarifyQuestion: { fontSize: 13, color: C.text, lineHeight: 1.7, fontWeight: 600 },
  clarifyBtn: {
    flex: 1, background: '#fff', color: C.navy, border: `1.5px solid ${C.navy}`,
    borderRadius: 9, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
  },
};