import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ToastContainer, useToast } from './Toast';
import ProfileModal from './ProfileModal';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import API from '../api/axios';
import AIAssistant from './AIAssistant';
import InvoiceUpload from './InvoiceUpload';
import OnboardingTour from './OnboardingTour';
import { NAV_ICONS, GROUP_ICONS, PARTY_ICONS, REPORT_ICONS, SANAD_AVATAR } from '../assets/icons';

/* ── الهوية البصرية ──────────────────────────────────────────────── */
const C = {
  purpleDark:  '#242165',
  purpleMuted: '#8578D3',
  cream:       '#FDF7EB',
  cardBeige:   '#F3EDE2',
  white:       '#FFFFFF',
  border:      '#E3DAC9',
  muted:       '#7E7569',
  text:        '#1A1A1A',
};

const FONT  = "'IBM Plex Sans Arabic', Tahoma, sans-serif";
const SERIF = "'Spectral', Georgia, serif";

const GROUPS_BASE = [
  { key: 'assets',      labelAr: 'الأصول',         labelEn: 'Assets',      color: C.purpleDark, bg: C.cardBeige },
  { key: 'liabilities', labelAr: 'الالتزامات',          labelEn: 'Obligations', color: C.purpleDark, bg: C.cardBeige },
  { key: 'equity',      labelAr: 'حقوق الملكية',    labelEn: 'Equity',      color: C.purpleDark, bg: C.cardBeige },
  { key: 'revenue',     labelAr: 'الإيرادات',       labelEn: 'Revenue',     color: C.purpleDark, bg: C.cardBeige },
  { key: 'expenses',    labelAr: 'المصروفات',       labelEn: 'Expenses',    color: C.purpleDark, bg: C.cardBeige },
];
// نستخدم getGroups(lang) بدل GROUPS الثابتة
function getGroups(lang) {
  return GROUPS_BASE.map(g => ({ ...g, label: lang === 'en' ? g.labelEn : g.labelAr }));
}

const TX_TYPES_AR = [
  { key: 'invoice', label: 'فاتورة مبيعات', icon: '' },
  { key: 'expense', label: 'فاتورة مصروف',  icon: '' },
  { key: 'journal', label: 'قيد يدوي',      icon: '' },
  { key: 'payment', label: 'سند دفع/قبض',  icon: '' },
];
const TX_TYPES_EN = [
  { key: 'invoice', label: 'Sales Invoice', icon: '' },
  { key: 'expense', label: 'Expense',       icon: '' },
  { key: 'journal', label: 'Journal Entry', icon: '' },
  { key: 'payment', label: 'Payment',       icon: '' },
];
/* ── الترجمات ────────────────────────────────────────────────────── */
const T = {
  ar: {
    dir: 'rtl', lang: 'ar',
    dashboard: 'الرئيسية', transactions: 'المعاملات', reports: 'التقارير', accounts: 'الحسابات',
    welcome: 'أهلاً', totalEntries: 'إجمالي القيود', pending: 'بانتظار المراجعة', approved: 'معتمدة',
    netProfit: 'صافي الربح', revenues: 'إيرادات', expenses: 'مصاريف',
    revenuesDist: 'توزيع الإيرادات', expensesDist: 'توزيع المصروفات',
    mainAccounts: 'الحسابات الرئيسية', clickToFilter: 'اضغط للتصفية',
    recentLog: 'سجل المعاملات الأخير', viewAll: 'عرض الكل ←',
    addTx: '+ إضافة معاملة', uploadInvoice: 'رفع فاتورة',
    searchPlaceholder: 'بحث في المعاملات...', allCategories: 'كل التصنيفات',
    refresh: '↻ تحديث', txLog: 'سجل المعاملات', financialReports: 'التقارير المالية',
    accountTree: 'شجرة الحسابات الرئيسية', accountDesc: 'اضغط على أي حساب لاستعراض تفاصيل الدخول والتواريخ.',
    incomeStatement: 'قائمة الدخل', balanceSheet: 'الميزانية العمومية',
    assets: 'الأصول', liabilities: 'الالتزامات', equity: 'حقوق الملكية',
    revenue: 'الإيرادات', cogs: 'تكلفة المبيعات', expensesLabel: 'المصروفات',
    grossProfit: 'مجمل الربح', netProfitLoss: 'صافي الربح / الخسارة', operatingExpenses: 'المصروفات التشغيلية',
    balanced: '✓ الميزانية متوازنة', unbalanced: '⚠ الميزانية غير متوازنة',
    accountSummary: 'ملخص الحسابات', movements: 'حركة',
    accountDetails: 'كشف حساب', noEntries: 'لا توجد قيود مسجلة لهذا الحساب بعد.',
    selectAccount: 'يرجى تحديد حساب رئيسي من الأعلى لعرض التفاصيل.',
    date: 'التاريخ', description: 'البيان / وصف الدخول', debit: 'مدين', credit: 'دائن', value: 'القيمة',
    noTx: 'لا توجد معاملات بعد', loading: 'جاري التحميل...',
    exit: '⎋ خروج', accountant: 'محاسب', closeDetails: 'إغلاق ✕',
    newType: 'إضافة تصنيف فرعي جديد', typeName: 'الاسم', mainType: 'النوع الرئيسي',
    revenueOpt: 'الإيرادات', expenseOpt: 'المصروفات', cancel: 'إلغاء', add: 'إضافة',
    sarUnit: 'ر.س',
  },
  en: {
    dir: 'ltr', lang: 'en',
    dashboard: 'Dashboard', transactions: 'Transactions', reports: 'Reports', accounts: 'Accounts',
    welcome: 'Welcome', totalEntries: 'Total Entries', pending: 'Pending Review', approved: 'Approved',
    netProfit: 'Net Profit', revenues: 'Revenue', expenses: 'Expenses',
    revenuesDist: 'Revenue Distribution', expensesDist: 'Expenses Distribution',
    mainAccounts: 'Main Accounts', clickToFilter: 'Click to filter',
    recentLog: 'Recent Transactions', viewAll: 'View All →',
    addTx: '+ Add Transaction', uploadInvoice: 'Upload Invoice',
    searchPlaceholder: 'Search transactions...', allCategories: 'All Categories',
    refresh: '↻ Refresh', txLog: 'Transactions', financialReports: 'Financial Reports',
    accountTree: 'Chart of Accounts', accountDesc: 'Click any account to view details and entry dates.',
    incomeStatement: 'Income Statement', balanceSheet: 'Balance Sheet',
    assets: 'Assets', liabilities: 'Obligations', equity: 'Equity',
    revenue: 'Revenue', cogs: 'Cost of Sales', expensesLabel: 'Expenses',
    grossProfit: 'Gross Profit', netProfitLoss: 'Net Profit / Loss', operatingExpenses: 'Operating Expenses',
    balanced: '✓ Balance Sheet Balanced', unbalanced: '⚠ Balance Sheet Unbalanced',
    accountSummary: 'Accounts Summary', movements: 'entries',
    accountDetails: 'Account Statement', noEntries: 'No entries recorded for this account yet.',
    selectAccount: 'Please select an account above to view details.',
    date: 'Date', description: 'Entry Description', debit: 'Debit', credit: 'Credit', value: 'Amount',
    noTx: 'No transactions yet', loading: 'Loading...',
    exit: '⎋ Logout', accountant: 'Accountant', closeDetails: 'Close ✕',
    newType: 'Add New Category', typeName: 'Name', mainType: 'Main Type',
    revenueOpt: 'Revenue', expenseOpt: 'Expenses', cancel: 'Cancel', add: 'Add',
    sarUnit: 'SAR',
  },
};



function fmt(n) {
  return Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() { return new Date().toISOString().slice(0, 10); }

// إخفاء أنيق للأيقونة المخصّصة إن تعذّر تحميل ملفها (بدل أيقونة "صورة مكسورة"
// القبيحة) — يحدث هذا عادةً إن لم تُنسَخ ملفات PNG فعليًا لمجلد الأيقونات.
function hideOnError(e) { e.currentTarget.style.visibility = 'hidden'; }

async function downloadPdf(path, filename) {
  try {
    const res = await API.get(path, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    let detail = 'تعذّر تصدير الملف. تأكد أن الخادم يدعم تصدير PDF.';
    try {
      if (e?.response?.data instanceof Blob) {
        const text = await e.response.data.text();
        const parsed = JSON.parse(text);
        if (parsed?.detail) detail = parsed.detail;
      } else if (e?.response?.data?.detail) {
        detail = e.response.data.detail;
      }
    } catch { /* نُبقي الرسالة الافتراضية إن تعذّر تحليل الخطأ */ }
    alert(detail);
  }
}

function SanadAvatar({ size = 26 }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', background: C.purpleMuted,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: SERIF, fontSize: size * 0.5, fontWeight: 700, flexShrink: 0,
      }}>س</div>
    );
  }
  return (
    <img
      src={SANAD_AVATAR} alt="سند" onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  );
}

// الرصيد الطبيعي لكل مجموعة حسابات: الأصول/المصروفات/تكلفة المبيعات تزيد بالمدين
// وتنقص بالدائن، بينما الالتزامات/حقوق الملكية/الإيرادات تزيد بالدائن وتنقص بالمدين.
// هذا هو أساس حساب "القيد المزدوج" الصحيح بدل تسجيل المبلغ في مكان واحد فقط.
const NORMAL_SIDE = {
  assets: 'debit', expenses: 'debit', cogs: 'debit',
  liabilities: 'credit', equity: 'credit', revenue: 'credit',
};

function txPrimaryGroup(tx) {
  return tx.account_group || (tx.tx_type === 'invoice' ? 'revenue' : 'expenses');
}

// معاملة مركّبة (بأكثر من بند) قد تمس أكثر من مجموعة حساب واحدة (مثال: شراء
// سيارة يمس الأصول والالتزامات معًا). عند الفرز/الفلترة يجب أن تظهر المعاملة
// تحت كل مجموعة تمسّها فعليًا، وليس فقط مجموعتها الأساسية (بند المدين الأول).
function txMatchesGroup(tx, groupKey) {
  if (groupKey === 'all') return true;
  if (tx.lines && tx.lines.length > 0) {
    return tx.lines.some(l => l.account_group === groupKey);
  }
  return txPrimaryGroup(tx) === groupKey;
}

// تخمين احتياطي لمجموعة حساب من اسمه (نفس منطق الواجهة الخلفية)، يُستخدم فقط عند
// تهيئة بنود قيد جديد قبل أن يعرف المستخدم/الذكاء الاصطناعي التصنيف الدقيق.
const GROUP_KEYWORDS = {
  assets: ['صندوق', 'نقد', 'بنك', 'مخزون', 'بضاعة', 'أثاث', 'معدات', 'أدوات', 'سيارة', 'سيارات', 'جهاز', 'أجهزة', 'مبنى', 'عميل', 'مدين'],
  liabilities: ['دائن', 'مستحق', 'أوراق الدفع', 'قرض', 'التزام', 'مورد', 'حسابات دائنة'],
  equity: ['رأس المال', 'المالك', 'مسحوبات', 'حقوق الملكية'],
  revenue: ['إيراد', 'إيرادات', 'مبيعات', 'خدمات مقدمة'],
  cogs: ['تكلفة المبيعات', 'تكلفة البضاعة'],
  expenses: ['مصروف', 'مصاريف', 'إيجار', 'رواتب', 'كهرباء', 'ماء', 'صيانة', 'تسويق', 'وقود'],
};
function inferAccountGroup(name, fallback = 'expenses') {
  if (!name) return fallback;
  for (const group of Object.keys(GROUP_KEYWORDS)) {
    if (GROUP_KEYWORDS[group].some(k => name.includes(k))) return group;
  }
  return fallback;
}

/* ── أيقونة مجموعة حساب: صورة مخصّصة، أو رسم SVG بسيط للالتزامات ───── */
function GroupIcon({ groupKey, size = 22 }) {
  const src = GROUP_ICONS[groupKey];
  if (src) return <img src={src} alt="" onError={hideOnError} style={{ width: size, height: size, objectFit: 'contain' }} />;
  // لا توجد صورة مخصّصة لـ"الالتزامات" — رسم بديل بنفس أسلوب بقية الأيقونات
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L3 8v1h18V8L12 3z" stroke={C.purpleDark} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 11v7M9 11v7M15 11v7M19 11v7" stroke={C.purpleDark} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 21h18" stroke={C.purpleDark} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ── Loading ─────────────────────────────────────────────────────── */
function Loading({ text }) {
  return <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontFamily: FONT }}>{text || 'جاري التحميل...'}</div>;
}

/* ── رسوم بيانية دائرية ──────────────────────────────────────────── */
const CHART_COLORS = ['#242165', '#D4A537', '#3E8E7E', '#C85C5C', '#5B8FB9', '#8578D3', '#B0A8C9'];

// تجميع الشرائح الصغيرة جدًا (أقل من 3% من الإجمالي) في فئة "أخرى" حتى لا
// تتحوّل الدائرة إلى شرائح غير مقروءة عند تفاوت كبير بين القيم.
function prepareDonutData(data, lang) {
  const total = data.reduce((s, d) => s + Math.abs(d.value), 0);
  if (total === 0) return [];
  const threshold = total * 0.03;
  const main = data.filter(d => Math.abs(d.value) >= threshold).map(d => ({ name: d.name, value: Math.abs(d.value) }));
  const restSum = data.filter(d => Math.abs(d.value) < threshold).reduce((s, d) => s + Math.abs(d.value), 0);
  if (restSum > 0) main.push({ name: lang === 'en' ? 'Other' : 'أخرى', value: restSum });
  return main;
}

function DashboardCharts({ revenueData, expensesData, t, lang, onSelectAccount }) {
  const empty = { revenue: 'لا توجد إيرادات مسجّلة بعد', expenses: 'لا توجد مصروفات مسجّلة بعد' };
  const otherLabel = lang === 'en' ? 'Other' : 'أخرى';

  const renderDonut = (rawData) => {
    const data = prepareDonutData(rawData, lang);
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ width: 150, height: 150, flexShrink: 0 }}>
          <PieChart width={150} height={150}>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value" nameKey="name" stroke="none">
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontFamily: FONT, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }} formatter={(v) => [`${fmt(v)} ${t ? t.sarUnit : 'ر.س'}`]} />
          </PieChart>
        </div>
        <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((d, i) => {
            const clickable = d.name !== otherLabel && onSelectAccount;
            return (
              <div
                key={d.name}
                onClick={clickable ? () => onSelectAccount(d.name) : undefined}
                title={clickable ? 'عرض كل معاملات هذا الحساب' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: clickable ? 'pointer' : 'default', borderRadius: 6, padding: '2px 4px' }}
                className={clickable ? 'legend-row-hover' : undefined}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                <span style={{ color: C.text, flex: 1, textDecoration: clickable ? 'underline' : 'none', textDecorationColor: C.border }}>{d.name}</span>
                <span style={{ fontFamily: SERIF, fontWeight: 700, color: C.purpleDark }}>{fmt(d.value)}</span>
                <span style={{ color: C.muted, fontSize: 10.5, minWidth: 34, textAlign: 'left' }}>{total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={ds.chartsRow}>
      <div className="card" style={ds.chartCard}>
        <div style={ds.chartHeader}>
          <div style={ds.chartTitle}>{t ? t.revenuesDist : 'توزيع الإيرادات'}</div>
        </div>
        {revenueData.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 12.5 }}>{empty.revenue}</div>
        ) : renderDonut(revenueData)}
      </div>

      <div className="card" style={ds.chartCard}>
        <div style={ds.chartHeader}>
          <div style={ds.chartTitle}>{t ? t.expensesDist : 'توزيع المصروفات'}</div>
        </div>
        {expensesData.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 12.5 }}>{empty.expenses}</div>
        ) : renderDonut(expensesData)}
      </div>
    </div>
  );
}

/* ── جدول المعاملات ──────────────────────────────────────────────── */
function TxTable({ txs, onEdit, onDelete, onAudit, onToggleApprove, onToggleReview, sarUnit, lang: tableLang }) {
  const unit = sarUnit || 'ر.س';

  const t = tableLang === 'en'
    ? {
        entryNo: 'Entry #',
        date: 'Date',
        description: 'Description',
        debit: 'Debit',
        credit: 'Credit',
        value: 'Amount',
        status: 'Status',
        actions: 'Actions',
        noTx: 'No transactions yet',
      }
    : {
        entryNo: 'رقم القيد',
        date: 'التاريخ',
        description: 'الوصف',
        debit: 'الحساب المدين',
        credit: 'الحساب الدائن',
        value: 'القيمة',
        status: 'الحالة',
        actions: 'الإجراءات',
        noTx: 'لا توجد معاملات بعد',
      };

  if (!txs || txs.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: C.muted,
          fontSize: 13,
          fontFamily: FONT,
        }}
      >
        {t.noTx}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >

        <thead>
          <tr
            style={{
              background: C.cardBeige,
              borderBottom: `2px solid ${C.border}`,
            }}
          >
            <th style={ds.tableHeader}>{t.entryNo}</th>
            <th style={ds.tableHeader}>{t.date}</th>
            <th style={ds.tableHeader}>{t.description}</th>
            <th style={ds.tableHeader}>{t.debit}</th>
            <th style={ds.tableHeader}>{t.credit}</th>
            <th style={ds.tableHeader}>{t.value}</th>
            <th style={ds.tableHeader}>{t.status}</th>
            <th style={ds.tableHeader}>{t.actions}</th>
          </tr>
        </thead>

        <tbody>
          {txs.map((tx, i) => (
            <tr
              key={tx.id || i}
              style={{
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <td style={{ padding: '10px 14px', color: C.purpleDark, fontWeight: 600, fontSize: 11.5, whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                {tx.entry_number || `#${tx.id ?? '—'}`}
              </td>

              <td style={{ padding: '10px 14px', color: C.muted, whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                {tx.date?.slice(0, 10) || '—'}
              </td>

              <td style={{ padding: '10px 14px', fontWeight: 600, color: C.purpleDark, textAlign: 'center', verticalAlign: 'middle' }}>
                {tx.description}
              </td>

              <td style={{ padding: '10px 14px', color: C.muted, fontSize: 12, textAlign: 'center', verticalAlign: 'middle' }}>
                <span
                  style={{
                    background: C.cardBeige,
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {tx.debit_account || '—'}
                </span>
              </td>

              <td style={{ padding: '10px 14px', color: C.muted, fontSize: 12, textAlign: 'center', verticalAlign: 'middle' }}>
                <span
                  style={{
                    background: '#EDE9FF',
                    padding: '2px 8px',
                    borderRadius: 6,
                    color: C.purpleMuted,
                  }}
                >
                  {tx.credit_account || '—'}
                </span>
              </td>

              <td style={{ padding: '10px 14px', fontFamily: SERIF, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', color: C.purpleDark, whiteSpace: 'nowrap' }}><span style={{ display: 'inline-block', minWidth: 90, textAlign: 'center' }}>{fmt(tx.amount)} {unit}</span></td>

              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                <button
                  type="button"
                  onClick={() => onToggleApprove && onToggleApprove(tx)}
                  title="اضغط لتبديل حالة الاعتماد"
                  style={{
                    border: 'none', cursor: 'pointer', fontFamily: FONT,
                    fontSize: 11, padding: '2px 8px', borderRadius: 10,
                    background: tx.is_approved ? '#E6F4EA' : '#FFF8E1',
                    color: tx.is_approved ? '#2E7D32' : '#F57F17',
                  }}
                >
                  {tx.is_approved ? '✓ معتمد' : '○ غير معتمد'}
                </button>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                  {tx.is_ai_generated && (
                    <span title="أنشأه الذكاء الاصطناعي — علامة دائمة" style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 8, background: '#EDE9FF', color: C.purpleMuted }}>
                      AI
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleReview && onToggleReview(tx)}
                    title="اضغط لتبديل حالة المراجعة"
                    style={{
                      border: 'none', cursor: 'pointer', fontFamily: FONT,
                      fontSize: 9.5, padding: '1px 6px', borderRadius: 8,
                      background: tx.is_reviewed ? '#E6F4EA' : '#FFF3CD',
                      color: tx.is_reviewed ? '#2E7D32' : '#856404',
                    }}
                  >
                    {tx.is_reviewed ? '✓ مُراجَع' : 'غير مُراجَع'}
                  </button>
                </div>
              </td>

              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                <button
                  onClick={() => onEdit(tx)}
                  style={ds.actionRowBtn}
                  title="تعديل"
                >
                  ✏️
                </button>

                {onAudit && (
                  <button
                    onClick={() => onAudit(tx)}
                    style={ds.actionRowBtn}
                    title="سجل التعديلات"
                  >
                    🕒
                  </button>
                )}

                {tx.invoice_url && (
                  <a
                    href={`${API.defaults.baseURL}${tx.invoice_url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...ds.actionRowBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    title="عرض المرفق"
                  >
                    📎
                  </a>
                )}

                <button
                  onClick={() => onDelete(tx.id)}
                  style={{
                    ...ds.actionRowBtn,
                    color: '#D9534F',
                  }}
                  title="حذف"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── TxModal (إضافة / تعديل) ────────────────────────────────────── */
/* ── بناء بنود ابتدائية من رد الذكاء الاصطناعي أو من معاملة قائمة ──── */
function buildInitialLines(source, fallbackAmount) {
  if (source?.lines && source.lines.length > 0) {
    return source.lines.map(l => ({
      account_name: l.account_name || '',
      account_group: l.account_group || 'expenses',
      side: l.side === 'credit' ? 'credit' : 'debit',
      amount: l.amount ?? '',
    }));
  }
  const amt = fallbackAmount ?? source?.amount ?? '';
  return [
    { account_name: source?.debit_account || '', account_group: source?.account_group || 'expenses', side: 'debit', amount: amt },
    { account_name: source?.credit_account || '', account_group: inferAccountGroup(source?.credit_account, 'assets'), side: 'credit', amount: amt },
  ];
}

/* ── شارة موثوقية الذكاء الاصطناعي — تُظهر نسبة الثقة بوضوح دائمًا ──── */
function ConfidenceBadge({ level }) {
  const map = {
    high:   { label: 'ثقة عالية',   bg: '#E6F4EA', color: '#2E7D32' },
    medium: { label: 'ثقة متوسطة', bg: '#FFF3CD', color: '#856404' },
    low:    { label: 'ثقة منخفضة — راجع جيدًا', bg: '#FDECEA', color: '#B71C1C' },
  };
  const cfg = map[level] || map.medium;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
}

/* ── محرر بنود القيد المزدوج (Double-Entry Lines Editor) ─────────── */
function LinesEditor({ lines, setLines, groups }) {
  const totalDebit  = lines.reduce((s, l) => s + (l.side === 'debit'  ? (parseFloat(l.amount) || 0) : 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.side === 'credit' ? (parseFloat(l.amount) || 0) : 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const updateLine = (idx, field) => (e) => {
    const val = e.target.value;
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));
  };
  const addLine = (side) => setLines(prev => [...prev, { account_name: '', account_group: side === 'debit' ? 'expenses' : 'assets', side, amount: '' }]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.purpleDark }}>بنود القيد</span>
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
          background: balanced ? '#E6F4EA' : '#FDECEA', color: balanced ? '#2E7D32' : '#B71C1C',
        }}>
          {balanced ? '✓ متوازن' : `⚠ مدين ${fmt(totalDebit)} / دائن ${fmt(totalCredit)}`}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '7px 8px', borderRadius: 6, whiteSpace: 'nowrap',
              background: l.side === 'debit' ? '#EDE9FF' : '#FFF3E0', color: l.side === 'debit' ? C.purpleMuted : '#B8620A',
            }}>{l.side === 'debit' ? 'مدين' : 'دائن'}</span>
            <input style={{ ...ms.inp, flex: 1.6 }} placeholder="اسم الحساب" value={l.account_name} onChange={updateLine(i, 'account_name')} />
            <select style={{ ...ms.inp, flex: 1.3 }} value={l.account_group} onChange={updateLine(i, 'account_group')}>
              {groups.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <input
              type="number"
              style={{ ...ms.inp, flex: 1.1, minWidth: 90, fontSize: 14, fontWeight: 700, textAlign: 'center', color: C.purpleDark }}
              placeholder="0.00"
              value={l.amount}
              onChange={updateLine(i, 'amount')}
            />
            {lines.length > 2 && (
              <button type="button" onClick={() => removeLine(i)} title="حذف البند" style={{ background: 'none', border: 'none', color: '#D9534F', fontSize: 14, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>✕</button>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => addLine('debit')} style={{ ...ms.secondaryBtn, flex: 1, padding: '7px', fontSize: 11.5 }}>+ بند مدين</button>
        <button type="button" onClick={() => addLine('credit')} style={{ ...ms.secondaryBtn, flex: 1, padding: '7px', fontSize: 11.5 }}>+ بند دائن</button>
      </div>
    </div>
  );
}

/* ── مرفق ملف اختياري (فاتورة/مستند مساند) لأي طريقة إضافة قيد ───── */
function AttachmentPicker({ url, setUrl, required }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handlePick = async (file) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.post('/api/upload-file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUrl(res.data.url);
    } catch {
      setError('تعذّر رفع الملف');
    }
    setUploading(false);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={ms.lbl}>
        مرفق {required ? <span style={{ color: '#D9534F' }}>(إلزامي لهذا النوع)</span> : '(اختياري)'}
      </label>
      {url ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.cream, borderRadius: 8, padding: '8px 12px' }}>
          <span style={{ fontSize: 12, color: C.text, flex: 1 }}>تم إرفاق ملف</span>
          <a href={`${API.defaults.baseURL}${url}`} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: C.purpleDark, textDecoration: 'underline' }}>عرض</a>
          <button type="button" onClick={() => setUrl('')} style={{ background: 'none', border: 'none', color: '#D9534F', cursor: 'pointer', fontSize: 13 }}>✕</button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ ...ms.secondaryBtn, width: '100%', padding: '9px', borderColor: required ? '#D9534F' : undefined }}
          >
            {uploading ? 'جاري الرفع...' : 'إرفاق ملف (فاتورة أو مستند)'}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => handlePick(e.target.files[0])} />
        </>
      )}
      {error && <div style={{ color: '#D9534F', fontSize: 11.5, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

/* ── نافذة إضافة/تعديل معاملة (قيد مزدوج حقيقي) ─────────────────── */
function TxModal({ tx, onClose, onSaved, lang: modalLang, txTypes, groups, user }) {
  const ml = modalLang || 'ar';
  const TX_TYPES = txTypes || TX_TYPES_AR;
  const GROUPS   = groups  || getGroups(ml);
  const isEdit = !!tx?.id;
  const [step, setStep]     = useState(isEdit ? 2 : 1);
  const [txType, setTxType] = useState(tx?.tx_type || 'invoice');
  const [form, setForm]     = useState({
    vendor:        tx?.vendor        || '',
    description:   tx?.description   || '',
    date:          tx?.date?.slice(0, 10) || today(),
    amount:        tx?.amount        || '',
    taxRate:       '15',
    party_type:    tx?.party_type    || '',
    due_date:      tx?.due_date?.slice(0, 10) || '',
    is_paid:       tx?.is_paid !== undefined && tx?.is_paid !== null ? tx.is_paid : true,
    payment_method: '',
  });
  const [ai, setAi] = useState(
    isEdit ? { explanation: tx.ai_suggestion, warnings: [] } : null
  );
  const [lines, setLines] = useState(() =>
    isEdit
      ? buildInitialLines(tx)
      : [
          { account_name: '', account_group: 'expenses', side: 'debit', amount: '' },
          { account_name: '', account_group: 'assets', side: 'credit', amount: '' },
        ]
  );
  // "معتمد" و"مُراجَع" خياران مستقلان يتحكم بهما المحاسب بنفسه؛ أي قيد ينشئه
  // الذكاء الاصطناعي يبقى بلا اعتماد ولا مراجعة افتراضيًا حتى يختار المحاسب ذلك.
  const [approved, setApproved] = useState(isEdit ? !!tx.is_approved : false);
  const [reviewed, setReviewed] = useState(isEdit ? !!tx.is_reviewed : false);
  const [invoiceUrl, setInvoiceUrl] = useState(tx?.invoice_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const upd = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const updCheck = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.checked }));
  const tax   = (parseFloat(form.amount) || 0) * (parseFloat(form.taxRate) || 0) / 100;
  const total = (parseFloat(form.amount) || 0) + tax;

  const totalDebit  = lines.reduce((s, l) => s + (l.side === 'debit'  ? (parseFloat(l.amount) || 0) : 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.side === 'credit' ? (parseFloat(l.amount) || 0) : 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const getAI = async () => {
    if (!form.description || !form.amount) { setError('أدخل الوصف والمبلغ أولاً'); return; }
    setLoading(true); setError('');
    try {
      const res = await API.post('/api/suggest-entry', {
        description: form.description, amount: total, vendor: form.vendor, tx_type: txType,
        business_type: user?.business_type || '', payment_method: form.payment_method || '',
        date: form.date || '',
      });
      setAi({ explanation: res.data?.explanation, confidence: res.data?.confidence, warnings: res.data?.warnings || [] });
      setLines(buildInitialLines(res.data, total));
      setStep(2);
    } catch {
      setAi({ explanation: 'تعذّر الاتصال بالذكاء الاصطناعي — إدخال يدوي، راجع البنود جيدًا قبل الحفظ.', warnings: [] });
      setLines(buildInitialLines({ debit_account: 'مصروفات عامة', credit_account: 'الصندوق', account_group: 'expenses' }, total));
      setStep(2);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!balanced) { setError('القيد غير متوازن — تأكد أن مجموع بنود المدين يساوي مجموع بنود الدائن'); return; }
    if ((txType === 'invoice' || txType === 'expense') && !invoiceUrl) {
      setError('إرفاق الفاتورة إلزامي لهذا النوع من المعاملات');
      return;
    }
    setLoading(true); setError('');
    try {
      const payload = {
        description:    form.description,
        vendor:         form.vendor,
        date:           form.date,
        tax_amount:     isEdit ? (tx.tax_amount || 0) : tax,
        ai_suggestion:  ai?.explanation,
        tx_type:        txType,
        is_approved:    approved,
        is_reviewed:    reviewed,
        party_type:     form.party_type || null,
        party_name:     form.party_type ? form.vendor : null,
        due_date:       form.party_type && form.due_date ? form.due_date : null,
        is_paid:        form.party_type ? !!form.is_paid : true,
        invoice_url:    invoiceUrl || null,
        lines: lines.map(l => ({
          account_name:  l.account_name,
          account_group: l.account_group,
          side:          l.side,
          amount:        parseFloat(l.amount) || 0,
        })),
      };
      if (!isEdit) payload.is_ai_generated = true; // كل قيد جديد يمر عبر اقتراح الذكاء الاصطناعي أولاً
      if (isEdit) await API.put(`/transactions/${tx.id}`, payload);
      else        await API.post('/transactions', payload);
      onSaved(); onClose();
    } catch (e) { setError(e?.response?.data?.detail || 'تعذّر الحفظ. تحقق من الاتصال.'); }
    setLoading(false);
  };

  return (
    <div style={ms.overlay}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <div>
            <div style={ms.eyebrow}>{isEdit ? 'تعديل القيد' : 'قيد جديد'}</div>
            <h2 style={ms.title}>{isEdit ? 'تعديل المعاملة' : 'إضافة معاملة محاسبية'}</h2>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={ms.body}>
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <div style={ms.grid4}>
                {TX_TYPES.map(t => (
                  <button
                    key={t.key}
                    style={{ ...ms.typeBtn, ...(txType === t.key ? ms.typeBtnOn : {}) }}
                    onClick={() => setTxType(t.key)}
                  >
                    <span style={{ fontSize: 12 }}>{t.label}</span>
                  </button>
                ))}
              </div>
              <div style={ms.divider} />
              <div style={ms.grid2}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={ms.lbl}>المورّد / العميل</label>
                  <input style={ms.inp} value={form.vendor} onChange={upd('vendor')} placeholder="اسم الجهة" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={ms.lbl}>وصف المعاملة</label>
                  <input style={ms.inp} value={form.description} onChange={upd('description')} placeholder="مثال: شراء سيارة نصفها نقدًا ونصفها آجل" />
                </div>
                <div>
                  <label style={ms.lbl}>المبلغ الإجمالي (قبل الضريبة)</label>
                  <input type="number" style={ms.inp} value={form.amount} onChange={upd('amount')} placeholder="0.00" />
                </div>
                <div>
                  <label style={ms.lbl}>التاريخ</label>
                  <input type="date" style={ms.inp} value={form.date} onChange={upd('date')} />
                </div>
                <div>
                  <label style={ms.lbl}>الضريبة</label>
                  <select style={ms.inp} value={form.taxRate} onChange={upd('taxRate')}>
                    <option value="0">0% (معفى)</option>
                    <option value="15">15% (ضريبة القيمة المضافة)</option>
                  </select>
                </div>
                <div>
                  <label style={ms.lbl}>طريقة الدفع (اختياري)</label>
                  <select style={ms.inp} value={form.payment_method} onChange={upd('payment_method')}>
                    <option value="">غير محدّدة — استنتجها الذكاء الاصطناعي</option>
                    <option value="نقدًا">نقدًا</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="آجل">آجل</option>
                  </select>
                </div>
                <div>
                  <label style={ms.lbl}>ذمم (اختياري)</label>
                  <select style={ms.inp} value={form.party_type} onChange={upd('party_type')}>
                    <option value="">بدون</option>
                    <option value="customer">مستحق على عميل (ذمم مدينة)</option>
                    <option value="vendor">مستحق لمورد (ذمم دائنة)</option>
                  </select>
                </div>
                {form.party_type && (
                  <>
                    <div>
                      <label style={ms.lbl}>تاريخ الاستحقاق</label>
                      <input type="date" style={ms.inp} value={form.due_date} onChange={upd('due_date')} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                      <input type="checkbox" id="is_paid_chk" checked={!!form.is_paid} onChange={updCheck('is_paid')} />
                      <label htmlFor="is_paid_chk" style={{ fontSize: 12.5, color: C.muted }}>تم السداد بالكامل</label>
                    </div>
                  </>
                )}
              </div>
              {/* ملخص الضريبة */}
              <div style={{ background: C.cream, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                {[
                  ['المبلغ الأساسي', fmt(form.amount) + ' ر.س'],
                  [`الضريبة (${form.taxRate}%)`, fmt(tax) + ' ر.س'],
                  ['الإجمالي', fmt(total) + ' ر.س'],
                ].map(([l, v], idx) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: idx === 2 ? 14 : 12.5, fontWeight: idx === 2 ? 700 : 400, color: idx === 2 ? C.purpleDark : C.muted, borderTop: idx === 2 ? `1px dashed ${C.border}` : 'none', marginTop: idx === 2 ? 6 : 0, paddingTop: idx === 2 ? 8 : 3 }}>
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
              </div>
              {error && <div style={{ color: '#D9534F', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <button style={ms.primaryBtn} onClick={getAI} disabled={loading}>
                {loading ? 'جاري التحليل...' : 'اقتراح الذكاء الاصطناعي'}
              </button>
            </>
          )}

          {/* STEP 2 — بنود القيد + المراجعة */}
          {step === 2 && ai && (
            <>
              {/* حقول التعديل الأساسية عند التعديل */}
              {isEdit && (
                <div style={{ background: C.cream, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.purpleDark, marginBottom: 10 }}>تعديل بيانات المعاملة</div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={ms.lbl}>نوع المعاملة</label>
                    <div style={{ ...ms.grid4, marginBottom: 10 }}>
                      {TX_TYPES.map(t => (
                        <button key={t.key} style={{ ...ms.typeBtn, ...(txType === t.key ? ms.typeBtnOn : {}) }} onClick={() => setTxType(t.key)}>
                          <span style={{ fontSize: 11 }}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={ms.grid2}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={ms.lbl}>الوصف</label>
                      <input style={ms.inp} value={form.description} onChange={upd('description')} />
                    </div>
                    <div>
                      <label style={ms.lbl}>المورّد</label>
                      <input style={ms.inp} value={form.vendor} onChange={upd('vendor')} />
                    </div>
                    <div>
                      <label style={ms.lbl}>التاريخ</label>
                      <input type="date" style={ms.inp} value={form.date} onChange={upd('date')} />
                    </div>
                  </div>
                  <div style={ms.divider} />
                </div>
              )}

              <div style={ms.aiCard}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.purpleDark, fontSize: 13.5 }}>
                      {isEdit ? 'القيد المحاسبي' : 'اقتراح الذكاء الاصطناعي'}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted }}>راجع البنود وعدّلها إن لزم قبل الحفظ</div>
                  </div>
                  {ai.confidence && <ConfidenceBadge level={ai.confidence} />}
                </div>

                <LinesEditor lines={lines} setLines={setLines} groups={GROUPS} />

                {ai.explanation && (
                  <div style={{ fontSize: 13, color: C.text, background: 'rgba(255,255,255,0.85)', padding: '14px 16px', borderRadius: 9, lineHeight: 1.8, marginTop: 12, minHeight: 40 }}>
                    {ai.explanation}
                  </div>
                )}
                {ai.warnings && ai.warnings.length > 0 && (
                  <div style={{ fontSize: 12, color: '#8A6D00', background: '#FFF8E1', padding: '10px 14px', borderRadius: 9, lineHeight: 1.7, marginTop: 10 }}>
                    {ai.warnings.map((w, i) => <div key={i}>{w}</div>)}
                  </div>
                )}
              </div>

              <AttachmentPicker url={invoiceUrl} setUrl={setInvoiceUrl} required={txType === 'invoice' || txType === 'expense'} />

              {/* خيارات الاعتماد والمراجعة — المراجعة تتطلب الاعتماد أولاً */}
              <div style={{ display: 'flex', gap: 20, margin: '4px 0 14px', padding: '10px 14px', background: C.cream, borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.text, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={e => {
                      setApproved(e.target.checked);
                      if (!e.target.checked) setReviewed(false); // المراجعة تفقد معناها بدون اعتماد
                    }}
                  />
                  معتمد
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: approved ? C.text : C.muted, cursor: approved ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" checked={reviewed} disabled={!approved} onChange={e => setReviewed(e.target.checked)} />
                  مُراجَع {!approved && '(يتطلب الاعتماد أولاً)'}
                </label>
              </div>

              {error && <div style={{ color: '#D9534F', fontSize: 12, marginBottom: 10 }}>{error}</div>}
              <div style={ms.btnRow}>
                {!isEdit && <button style={ms.secondaryBtn} onClick={() => setStep(1)}>رجوع</button>}
                <button style={ms.primaryBtn} onClick={save} disabled={loading || !balanced}>
                  {loading ? 'جاري الحفظ...' : 'حفظ القيد'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── AddChoiceModal (اختيار طريقة إضافة القيد: يدوي أو جملة واحدة) ── */
function AddChoiceModal({ onClose, onChoose }) {
  const choiceBtn = {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'right',
    background: C.cream, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: '16px 16px', cursor: 'pointer', transition: 'all 0.15s ease',
  };
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <div>
            <div style={ms.eyebrow}>معاملة جديدة</div>
            <h2 style={ms.title}>كيف تريد إضافة القيد؟</h2>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="button" className="group-card" style={choiceBtn} onClick={() => onChoose('manual')}>
            <div>
              <div style={{ fontWeight: 700, color: C.purpleDark, fontSize: 14 }}>إدخال يدوي</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
                تعبئة نموذج القيد خطوة بخطوة
              </div>
            </div>
          </button>
          <button type="button" className="group-card" style={choiceBtn} onClick={() => onChoose('sentence')}>
            <div>
              <div style={{ fontWeight: 700, color: C.purpleDark, fontSize: 14 }}>إضافة سريعة</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
                اكتب العملية بجملة طبيعية ويتولى الذكاء الاصطناعي إنشاء القيد كاملاً
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── QuickAddModal (إضافة سريعة بجملة واحدة عبر الذكاء الاصطناعي) ──── */
function QuickAddModal({ onClose, onSaved, groups, user }) {
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [lines, setLines]         = useState([]);
  const [partyType, setPartyType] = useState('');
  const [dueDate, setDueDate]     = useState('');
  const [isPaid, setIsPaid]       = useState(true);
  // كل قيد ينشئه الذكاء الاصطناعي من جملة واحدة يبقى بلا اعتماد ولا مراجعة
  // افتراضيًا، حتى يراجعه المحاسب صراحةً ويفعّل الخيارين بنفسه.
  const [approved, setApproved]   = useState(false);
  const [reviewed, setReviewed]   = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const totalDebit  = lines.reduce((s, l) => s + (l.side === 'debit'  ? (parseFloat(l.amount) || 0) : 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.side === 'credit' ? (parseFloat(l.amount) || 0) : 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const analyze = async () => {
    if (!text.trim()) { setError('اكتب وصف العملية أولاً'); return; }
    setLoading(true); setError('');
    try {
      const res = await API.post('/api/quick-add', { text, business_type: user?.business_type || '' });
      setSuggestion(res.data);
      setLines(buildInitialLines(res.data));
      // نطبّق ما استنتجه الذكاء الاصطناعي من نوع الطرف تلقائيًا، ويبقى قابلاً للتصحيح يدويًا
      if (res.data?.party_type === 'customer' || res.data?.party_type === 'vendor') {
        setPartyType(res.data.party_type);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || 'تعذّر تحليل النص. حاول صياغته بشكل مختلف أو أدخل القيد يدويًا.');
    }
    setLoading(false);
  };

  const upd = (f) => (e) => setSuggestion(p => ({ ...p, [f]: e.target.value }));

  const save = async () => {
    if (!balanced) { setError('القيد غير متوازن — تأكد أن مجموع بنود المدين يساوي مجموع بنود الدائن'); return; }
    if ((suggestion?.tx_type === 'invoice' || suggestion?.tx_type === 'expense') && !invoiceUrl) {
      setError('إرفاق الفاتورة إلزامي لهذا النوع من المعاملات');
      return;
    }
    setLoading(true); setError('');
    try {
      const payload = {
        description:     suggestion.description,
        vendor:          suggestion.vendor,
        date:            suggestion.date,
        ai_suggestion:   suggestion.explanation,
        tx_type:         suggestion.tx_type || 'journal',
        is_approved:     approved,
        is_reviewed:     reviewed,
        is_ai_generated: true,
        // مهم: هذا ما كان ناقصًا — بدونه لا تظهر معاملات الذكاء الاصطناعي أبدًا
        // في بطاقات الذمم المدينة/الدائنة، حتى لو صنّفها الذكاء الاصطناعي كعميل/مورد.
        party_type:      partyType || null,
        party_name:      partyType ? (suggestion.party_name || suggestion.vendor) : null,
        due_date:        partyType && dueDate ? dueDate : null,
        is_paid:         partyType ? !!isPaid : true,
        invoice_url:     invoiceUrl || null,
        lines: lines.map(l => ({
          account_name:  l.account_name,
          account_group: l.account_group,
          side:          l.side,
          amount:        parseFloat(l.amount) || 0,
        })),
      };
      await API.post('/transactions', payload);
      onSaved(); onClose();
    } catch (e) { setError(e?.response?.data?.detail || 'تعذّر الحفظ. تحقق من الاتصال.'); }
    setLoading(false);
  };

  return (
    <div style={ms.overlay}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <div>
            <div style={ms.eyebrow}>إضافة سريعة بالذكاء الاصطناعي</div>
            <h2 style={ms.title}>إضافة سريعة</h2>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={ms.body}>
          {!suggestion ? (
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.7 }}>
                سيحدد الذكاء الاصطناعي كل الحسابات المتأثرة، يستخرج المبالغ، يحسب
                الضريبة إن وُجدت، ويبني قيدًا متوازنًا كاملاً جاهزًا للمراجعة.
              </div>
              <textarea
                style={{ ...ms.inp, minHeight: 90, resize: 'vertical' }}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="مثال: اشتريت سيارة بمبلغ 100,000 ريال، دفعت نصفها نقدًا والباقي آجل"
              />
              {error && <div style={{ color: '#D9534F', fontSize: 12, margin: '10px 0' }}>{error}</div>}
              <button style={{ ...ms.primaryBtn, marginTop: 14 }} onClick={analyze} disabled={loading}>
                {loading ? 'جاري التحليل...' : 'تحليل وإنشاء القيد'}
              </button>
            </>
          ) : (
            <>
              <div style={ms.aiCard}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.purpleDark, fontSize: 13.5 }}>القيد المُقترح</div>
                    <div style={{ fontSize: 11.5, color: C.muted }}>راجع البنود وعدّلها إن لزم قبل الحفظ</div>
                  </div>
                  {suggestion.confidence && <ConfidenceBadge level={suggestion.confidence} />}
                </div>
                <div style={ms.grid2}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={ms.lbl}>الوصف</label>
                    <input style={ms.inp} value={suggestion.description || ''} onChange={upd('description')} />
                  </div>
                </div>

                <LinesEditor lines={lines} setLines={setLines} groups={groups} />

                {suggestion.explanation && (
                  <div style={{ fontSize: 13, color: C.text, background: 'rgba(255,255,255,0.85)', padding: '14px 16px', borderRadius: 9, marginTop: 12, lineHeight: 1.8, minHeight: 40 }}>
                    {suggestion.explanation}
                  </div>
                )}
              </div>

              {/* الذمم المدينة/الدائنة — هذا هو ما يجعل المعاملة تظهر في بطاقات
                  العملاء/الموردين المستحقين بالرئيسية */}
              <div style={{ background: C.cream, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                <div style={ms.grid2}>
                  <div>
                    <label style={ms.lbl}>ذمم (اختياري)</label>
                    <select style={ms.inp} value={partyType} onChange={e => setPartyType(e.target.value)}>
                      <option value="">بدون</option>
                      <option value="customer">مستحق على عميل (ذمم مدينة)</option>
                      <option value="vendor">مستحق لمورد (ذمم دائنة)</option>
                    </select>
                  </div>
                  {partyType && (
                    <>
                      <div>
                        <label style={ms.lbl}>تاريخ الاستحقاق</label>
                        <input type="date" style={ms.inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                        <input type="checkbox" id="qa_is_paid" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                        <label htmlFor="qa_is_paid" style={{ fontSize: 12.5, color: C.muted }}>تم السداد بالكامل</label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <AttachmentPicker url={invoiceUrl} setUrl={setInvoiceUrl} required={suggestion?.tx_type === 'invoice' || suggestion?.tx_type === 'expense'} />

              {/* خيارات الاعتماد والمراجعة — المراجعة تتطلب الاعتماد أولاً */}
              <div style={{ display: 'flex', gap: 20, margin: '4px 0 14px', padding: '10px 14px', background: C.cream, borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.text, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={e => {
                      setApproved(e.target.checked);
                      if (!e.target.checked) setReviewed(false);
                    }}
                  />
                  معتمد
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: approved ? C.text : C.muted, cursor: approved ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" checked={reviewed} disabled={!approved} onChange={e => setReviewed(e.target.checked)} />
                  مُراجَع {!approved && '(يتطلب الاعتماد أولاً)'}
                </label>
              </div>

              {error && <div style={{ color: '#D9534F', fontSize: 12, margin: '10px 0' }}>{error}</div>}
              <div style={ms.btnRow}>
                <button style={ms.secondaryBtn} onClick={() => setSuggestion(null)}>رجوع</button>
                <button style={ms.primaryBtn} onClick={save} disabled={loading || !balanced}>
                  {loading ? 'جاري الحفظ...' : 'حفظ القيد'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── AuditLogModal (سجل تعديلات القيد) ─────────────────────────────── */
const AUDIT_ACTION_LABEL = {
  created: 'إنشاء القيد', updated: 'تعديل', approved: 'اعتماد', unapproved: 'إلغاء اعتماد',
  reviewed: 'مراجعة', unreviewed: 'إلغاء مراجعة',
};

// حقول داخلية/تقنية لا تهم المحاسب — نخفيها من السجل حتى يبقى واضحًا ومختصرًا
const AUDIT_HIDDEN_FIELDS = new Set([
  'status', 'ai_suggestion', 'entry_number', 'created_by_id', 'reviewed_by_id',
  'user_id', 'account_group', 'debit_account', 'credit_account', 'invoice_url', 'is_ai_generated',
]);

const AUDIT_FIELD_LABEL = {
  description: 'الوصف', amount: 'المبلغ', vendor: 'المورّد/العميل', date: 'التاريخ',
  tax_amount: 'الضريبة', tx_type: 'نوع المعاملة', party_type: 'نوع الذمة',
  party_name: 'اسم الطرف', due_date: 'تاريخ الاستحقاق', is_paid: 'حالة السداد',
  is_approved: 'الاعتماد', is_reviewed: 'المراجعة',
};

function formatAuditValue(v) {
  if (v === null || v === undefined || v === 'None') return '—';
  if (v === 'True') return 'نعم';
  if (v === 'False') return 'لا';
  return v;
}

/* ── بند تقرير مالي: إجمالي المجموعة + تفصيل كل حساب تحته ─────────── */
function ReportLineGroup({ label, total, items, sarUnit, tint, big }) {
  return (
    <div style={{ marginBottom: big ? 0 : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: big ? 14.5 : 13.5, fontWeight: 700, color: tint || C.purpleDark }}>{label}</span>
        <span style={{ fontFamily: SERIF, fontSize: big ? 19 : 15, fontWeight: 700, color: tint || C.purpleDark }}>
          {total < 0 ? '- ' : ''}{fmt(Math.abs(total))} <span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>{sarUnit}</span>
        </span>
      </div>
      {items && items.length > 1 && (
        <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
          {items.map(it => (
            <div key={it.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.muted }}>
              <span>· {it.name}</span>
              <span>{fmt(Math.abs(it.value))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── تنبيهات استحقاق الفواتير: لوحة جانبية تظهر مرة واحدة عند الدخول ── */
function DueReminders({ postedTxs, sarUnit, onViewAll }) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('daftar_due_dismissed') === '1');

  const items = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // خلال 7 أيام
    return postedTxs.filter(tx =>
      tx.party_type === 'customer' && !tx.is_paid && tx.due_date && new Date(tx.due_date) <= soon
    ).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }, [postedTxs]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem('daftar_due_dismissed', '1');
    setDismissed(true);
  }, []);

  // تختفي تلقائيًا بعد 5 ثوانٍ — تبقى متاحة كاملة عبر زر التنبيهات الثابت بالأعلى
  useEffect(() => {
    if (dismissed || items.length === 0) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [dismissed, items.length, dismiss]);

  if (dismissed || items.length === 0) return null;

  const overdueCount = items.filter(tx => new Date(tx.due_date) < new Date()).length;

  return (
    <div style={{
      position: 'fixed', top: 90, left: 20, zIndex: 500, width: 320,
      background: C.white, borderRadius: 14, boxShadow: '0 12px 40px rgba(36,33,101,0.25)',
      border: `1px solid ${C.border}`, overflow: 'hidden', fontFamily: FONT,
      animation: 'slideInLeft 0.3s ease',
    }}>
      <div style={{ background: overdueCount > 0 ? '#7A2A2A' : C.purpleDark, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
          {overdueCount > 0 ? `${overdueCount} فاتورة متأخرة السداد` : 'فواتير مستحقة قريبًا'}
        </span>
        <button onClick={dismiss} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 11, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {items.slice(0, 5).map(tx => {
          const isLate = new Date(tx.due_date) < new Date();
          return (
            <div key={tx.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: C.text, fontWeight: 600 }}>{tx.party_name || tx.description}</span>
                <span style={{ fontFamily: SERIF, fontWeight: 700, color: C.purpleDark }}>{fmt(tx.amount)} {sarUnit}</span>
              </div>
              <div style={{ fontSize: 10.5, color: isLate ? '#B71C1C' : C.muted, marginTop: 2 }}>
                {isLate ? 'متأخرة منذ' : 'تستحق في'} {tx.due_date?.slice(0, 10)}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => { dismiss(); onViewAll(); }}
        style={{ width: '100%', padding: '10px', background: C.cream, border: 'none', color: C.purpleDark, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
      >
        عرض الكل في المعاملات
      </button>
    </div>
  );
}

function AuditLogModal({ tx, onClose }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    API.get(`/transactions/${tx.id}/audit-log`)
      .then(r => { if (alive) setLogs(r.data || []); })
      .catch(() => { if (alive) setLogs([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tx.id]);

  const visibleLogs = logs.filter(l => l.action === 'created' || !l.field_name || !AUDIT_HIDDEN_FIELDS.has(l.field_name));

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <div>
            <div style={ms.eyebrow}>{tx.entry_number || `#${tx.id}`}</div>
            <h2 style={ms.title}>سجل تعديلات القيد</h2>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          {loading ? (
            <Loading text="جاري التحميل..." />
          ) : visibleLogs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              لا يوجد سجل تعديلات لهذا القيد بعد.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {visibleLogs.map(l => {
                const isAI = l.changed_by_name === 'الذكاء الاصطناعي';
                return (
                  <div key={l.id} style={{ padding: '10px 2px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.purpleDark }}>{AUDIT_ACTION_LABEL[l.action] || l.action}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 8,
                          background: isAI ? '#EDE9FF' : C.cream, color: isAI ? C.purpleMuted : C.muted,
                        }}>
                          {isAI ? 'AI' : (l.changed_by_name || 'النظام')}
                        </span>
                      </div>
                      <span style={{ color: C.muted, fontSize: 10.5, whiteSpace: 'nowrap' }}>{l.changed_at?.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    {l.action === 'created' ? (
                      l.new_value && <div style={{ color: C.muted, fontSize: 12 }}>{l.new_value}</div>
                    ) : l.field_name === 'lines' ? (
                      <div style={{ color: C.muted, fontSize: 12 }}>تم تعديل توزيع بنود القيد (المدين/الدائن)</div>
                    ) : l.field_name ? (
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        {AUDIT_FIELD_LABEL[l.field_name] || l.field_name}: من "{formatAuditValue(l.old_value)}" إلى "{formatAuditValue(l.new_value)}"
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════════ */
export default function Dashboard({ user, onLogout }) {
  const [page, setPage]               = useState('dashboard');
  const [txs, setTxs]                 = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [search, setSearch]           = useState('');
  const [filterGroup, setFilter]      = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | approved | pending | unreviewed
  const [partyFilter, setPartyFilter] = useState('all'); // all | receivable | payable
  const [accountNameFilter, setAccountNameFilter] = useState(''); // اسم حساب محدد من الرسم الدائري
  const [showAI, setShowAI]           = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showTour, setShowTour]       = useState(() => !localStorage.getItem('daftar_tour_done'));
  const [lang, setLang]               = useState(() => localStorage.getItem('daftar_lang') || 'ar');
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || user; } catch { return user; }
  });
  const [showProfile, setShowProfile] = useState(false);
  const { toasts, success: showSuccess, error: showError } = useToast();
  const [arAp, setArAp]               = useState({ receivable_total: 0, receivable_count: 0, payable_total: 0, payable_count: 0 });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [auditTx, setAuditTx]         = useState(null);

  const t = T[lang];
  const GROUPS = getGroups(lang);
  const TX_TYPES = lang === 'en' ? TX_TYPES_EN : TX_TYPES_AR;

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    localStorage.setItem('daftar_lang', next);
  };

  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };
  const [selectedGroup, setSelectedGroup] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/transactions'); setTxs(r.data || []); }
    catch { setTxs([]); }
    setLoading(false);
  }, []);

  const loadExtras = useCallback(async () => {
    try { const r = await API.get('/api/ar-ap-summary'); setArAp(r.data); } catch { /* تجاهل بصمت — لا نكسر الشاشة */ }
  }, []);

  useEffect(() => { load(); loadExtras(); }, [load, loadExtras]);

  const refreshAll = useCallback(() => { load(); loadExtras(); }, [load, loadExtras]);

  const handleDeleteTx = async (id) => {
    if (!id) return;
    if (!window.confirm(lang === 'en' ? 'Are you sure you want to delete this transaction?' : 'هل أنت متأكد من حذف هذه المعاملة؟')) return;
    try {
      await API.delete(`/transactions/${id}`);
      refreshAll();
      showSuccess(lang === 'en' ? ' Transaction deleted' : ' تم حذف المعاملة');
    } catch {
      showError(lang === 'en' ? 'Failed to delete' : 'تعذّر الحذف');
    }
  };

  const handleToggleApprove = async (tx) => {
    try {
      await API.patch(`/transactions/${tx.id}/approve?approved=${!tx.is_approved}`);
      refreshAll();
    } catch {
      showError(lang === 'en' ? 'Failed to update' : 'تعذّر تحديث حالة الاعتماد');
    }
  };

  const handleToggleReview = async (tx) => {
    if (!tx.is_approved && !tx.is_reviewed) {
      showError(lang === 'en' ? 'Approve the entry first before marking it reviewed' : 'يجب اعتماد القيد أولاً قبل تحديد المراجعة');
      return;
    }
    try {
      await API.patch(`/transactions/${tx.id}/review?reviewed=${!tx.is_reviewed}`);
      refreshAll();
    } catch (e) {
      showError(e?.response?.data?.detail || (lang === 'en' ? 'Failed to update' : 'تعذّر تحديث حالة المراجعة'));
    }
  };

  /* ── Memos ─────────────────────────────────────────────────────── */
  // نظام القيد المزدوج الحقيقي: كل معاملة قد تمس أكثر من حساب/مجموعة، وكل بند
  // إما "يزيد" أو "يُنقص" من مجموعته حسب طبيعة الحساب (رصيده الطبيعي)، وليس
  // مجرد تسجيل المبلغ كاملاً في مكان واحد.
  // ★ قاعدة محاسبية أساسية: القيد غير المعتمد يبقى ظاهرًا في سجل المعاملات
  // للمراجعة، لكنه لا "يُرحَّل" إطلاقًا — لا يدخل في أي إجمالي أو تقرير أو
  // رصيد حتى يُعتمد صراحةً. "مراجَع" لا علاقة له بالترحيل، فهو معلومة توثيقية
  // فقط. المعتمد وحده هو ما يُرحَّل.
  const postedTxs = useMemo(() => txs.filter(tx => tx.is_approved), [txs]);

  // فواتير مستحقة خلال 7 أيام أو متأخرة — تُستخدم لعداد زر التنبيهات ولوحة الاستحقاق
  const dueSoonCount = useMemo(() => {
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return postedTxs.filter(tx => tx.party_type === 'customer' && !tx.is_paid && tx.due_date && new Date(tx.due_date) <= soon).length;
  }, [postedTxs]);

  const totals = useMemo(() => {
    const sums   = { assets: 0, liabilities: 0, equity: 0, revenue: 0, cogs: 0, expenses: 0 };
    const counts = { assets: 0, liabilities: 0, equity: 0, revenue: 0, cogs: 0, expenses: 0 };
    postedTxs.forEach(tx => {
      if (tx.lines && tx.lines.length > 0) {
        const touchedGroups = new Set();
        tx.lines.forEach(line => {
          const g = line.account_group;
          if (sums[g] === undefined) return;
          const sign = NORMAL_SIDE[g] === line.side ? 1 : -1;
          sums[g] += sign * Number(line.amount || 0);
          touchedGroups.add(g);
        });
        touchedGroups.forEach(g => { counts[g]++; });
      } else {
        // توافق مع قيود قديمة أُنشئت قبل تفعيل القيد المزدوج الكامل بالبنود
        const g = txPrimaryGroup(tx);
        if (sums[g] !== undefined) { sums[g] += Number(tx.amount || 0); counts[g]++; }
      }
    });
    return { ...sums, counts };
  }, [postedTxs]);

  // مؤشرات الإيرادات والمصروفات (الرسوم الدائرية) — محسوبة فعليًا من الحسابات
  // الحقيقية المستخدمة في المعاملات، وليست بيانات شكلية ثابتة.
  // تفصيل كل حساب داخل كل مجموعة (وليس فقط الإيرادات/المصروفات) — تُستخدم في
  // الرسوم الدائرية بالرئيسية، وفي تفصيل بنود قائمة الدخل والميزانية العمومية
  // بصفحة التقارير، بنفس منطق القيد المزدوج الموقّع (يزيد/ينقص حسب الرصيد الطبيعي).
  const groupBreakdown = useMemo(() => {
    const acc = { assets: {}, liabilities: {}, equity: {}, revenue: {}, cogs: {}, expenses: {} };
    const bump = (group, name, side, amount) => {
      if (!acc[group]) return;
      const key = name || (lang === 'en' ? 'Other' : 'أخرى');
      const sign = NORMAL_SIDE[group] === side ? 1 : -1;
      acc[group][key] = (acc[group][key] || 0) + sign * Number(amount || 0);
    };
    postedTxs.forEach(tx => {
      if (tx.lines && tx.lines.length > 0) {
        tx.lines.forEach(line => bump(line.account_group, line.account_name, line.side, line.amount));
      } else {
        // توافق مع قيود قديمة بلا بنود صريحة: نفترض أن المعاملة زادت مجموعتها الأساسية
        const g = txPrimaryGroup(tx);
        const name = g === 'revenue' ? (tx.credit_account || tx.description) : (tx.debit_account || tx.description);
        bump(g, name, NORMAL_SIDE[g], tx.amount);
      }
    });
    const toArr = (obj) => Object.entries(obj)
      .map(([name, value]) => ({ name, value }))
      .filter(x => Math.abs(x.value) > 0.005)
      .sort((a, b) => b.value - a.value);
    return {
      assets: toArr(acc.assets), liabilities: toArr(acc.liabilities), equity: toArr(acc.equity),
      revenue: toArr(acc.revenue), cogs: toArr(acc.cogs), expenses: toArr(acc.expenses),
    };
  }, [txs, lang]);

  const categoryBreakdown = {
    revenue: groupBreakdown.revenue.slice(0, 8),
    expenses: [...groupBreakdown.expenses, ...groupBreakdown.cogs].sort((a, b) => b.value - a.value).slice(0, 8),
  };

  const netProfit    = totals.revenue - totals.cogs - totals.expenses;
  const isProfit      = netProfit >= 0;
  const approvedCount = txs.filter(tx => tx.is_approved).length;
  const pendingCount  = txs.filter(tx => !tx.is_approved).length;
  const unreviewedCount = txs.filter(tx => !tx.is_reviewed).length;

  const filtered = useMemo(() => txs.filter(tx => {
    const matchSearch = !search || tx.description?.toLowerCase().includes(search.toLowerCase()) || tx.vendor?.toLowerCase().includes(search.toLowerCase());
    const matchGroup = txMatchesGroup(tx, filterGroup);
    const matchStatus =
      statusFilter === 'all'        ? true :
      statusFilter === 'approved'   ? !!tx.is_approved :
      statusFilter === 'pending'    ? !tx.is_approved :
      statusFilter === 'unreviewed' ? !tx.is_reviewed :
      true;
    const matchParty =
      partyFilter === 'all'         ? true :
      partyFilter === 'receivable'  ? (tx.party_type === 'customer' && !tx.is_paid) :
      partyFilter === 'payable'     ? (tx.party_type === 'vendor' && !tx.is_paid) :
      true;
    const matchAccountName =
      !accountNameFilter ? true :
      tx.lines && tx.lines.length > 0
        ? tx.lines.some(l => l.account_name === accountNameFilter)
        : (tx.debit_account === accountNameFilter || tx.credit_account === accountNameFilter);
    return matchSearch && matchGroup && matchStatus && matchParty && matchAccountName;
  }), [txs, search, filterGroup, statusFilter, partyFilter, accountNameFilter]);

  const accountSpecificTxs = useMemo(() => {
    if (!selectedGroup) return [];
    return txs.filter(tx => txMatchesGroup(tx, selectedGroup.key));
  }, [txs, selectedGroup]);

  const navItems = [
    { key: 'dashboard',    label: t.dashboard,    tourId: null },
    { key: 'transactions', label: t.transactions, tourId: 'tour-nav-transactions' },
    { key: 'reports',      label: t.reports,      tourId: 'tour-nav-reports' },
    { key: 'accounts',     label: t.accounts,     tourId: null },
  ];

  /* ── صفحة التقارير ─────────────────────────────────────────────── */
  const grossProfit = totals.revenue - totals.cogs;

  return (
    <div style={{ ...ds.root, direction: t.dir }} dir={t.dir}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Spectral:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; font-family: ${FONT}; }
        input, select, textarea { font-family: ${FONT}; }
        .card { animation: fadeUp 0.3s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .group-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(36,33,101,0.1); }
        .nav-btn-hover:hover { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
        .hero-chip-hover:hover { background: rgba(255,255,255,0.18) !important; }
        .legend-row-hover:hover { background: ${C.cream} !important; }
        @keyframes slideInLeft { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      {/* ===== TOP NAVBAR ===== */}
      <header data-tour="tour-sidebar" style={ds.topNav}>
        <div style={ds.logo}>
          <img src="data:image/png;base64,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" alt="دفتر" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
          <div>
            <div style={ds.logoName}>دفتر</div>
            <div style={ds.logoSub}>{lang === 'en' ? 'Smart Accounting' : 'المحاسبة الذكية'}</div>
          </div>
        </div>

        <nav style={ds.nav}>
          {navItems.map(n => (
            <button
              key={n.key}
              className="nav-btn-hover"
              data-tour={n.tourId || undefined}
              style={{ ...ds.navBtn, ...(page === n.key ? ds.navBtnActive : {}) }}
              onClick={() => setPage(n.key)}
            >
              <img src={NAV_ICONS[n.key]} alt="" onError={hideOnError} style={{ width: 17, height: 17, objectFit: 'contain', filter: page === n.key ? 'none' : 'brightness(0) invert(1) opacity(0.75)' }} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div style={ds.navRight}>

          <button
            data-tour="tour-ai-btn"
            style={ds.aiTopBtn}
            onClick={() => setShowAI(true)}
            title={lang === 'en' ? 'Sanad — Smart Assistant' : 'سند — مساعدك الذكي'}
          >
            <SanadAvatar size={26} />
          </button>
          <div
            style={{ ...ds.userCard, cursor: 'pointer' }}
            onClick={() => setShowProfile(true)}
            title={lang === 'en' ? 'Edit Profile' : 'تعديل الملف الشخصي'}
          >
            {currentUser?.avatar
              ? <img src={currentUser.avatar} alt="avatar" style={{ ...ds.userAvatar, objectFit: 'cover' }} />
              : <div style={ds.userAvatar}>{currentUser?.name?.[0] || 'م'}</div>
            }
            <div>
              <div style={ds.userName}>{currentUser?.name || user?.name || 'مستخدم'}</div>
              <div style={ds.userRole}>{t.accountant}</div>
            </div>
          </div>
          <button style={ds.logoutBtn} onClick={onLogout}>{t.exit}</button>
          <button
            onClick={toggleLang}
            title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, minWidth: 60, whiteSpace: 'nowrap' }}
          >
            {lang === 'ar' ? 'EN' : 'SA'}
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main style={ds.main}>
        <div style={ds.content}>

          {/* ── 1. الرئيسية ─────────────────────────────────────────── */}
          {page === 'dashboard' && (
            <>
              <div style={{ margin: '12px 4px 20px' }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: C.purpleDark, fontFamily: SERIF }}>
                  {t.welcome}، {user?.name || 'مستخدم'}
                </h2>
                <p style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                  {new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Hero: صافي الربح/الخسارة + مؤشرات سريعة قابلة للضغط */}
              <div data-tour="tour-kpi" style={ds.heroBand}>
                <div style={ds.heroTop}>
                  <div>
                    <div style={ds.heroLbl}>{isProfit ? t.netProfit : (lang === 'en' ? 'Loss' : 'خسارة')}</div>
                    <div style={ds.heroVal}>
                      {isProfit ? '' : '- '}{fmt(Math.abs(netProfit))} <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.8 }}>{t.sarUnit}</span>
                    </div>
                    <div style={ds.heroSub}>
                      {lang === 'en' ? 'Revenue' : 'إيرادات'} {fmt(totals.revenue)} ← {lang === 'en' ? 'Expenses' : 'مصاريف'} {fmt(totals.expenses + totals.cogs)}
                    </div>
                  </div>
                  <button
                    onClick={() => { setPartyFilter('receivable'); setFilter('all'); setStatusFilter('all'); setPage('transactions'); }}
                    title={lang === 'en' ? 'Due-date notifications' : 'تنبيهات الاستحقاق'}
                    style={{
                      position: 'relative', background: 'rgba(255,255,255,0.12)', border: 'none',
                      borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3a6 6 0 00-6 6v3.5c0 .6-.24 1.18-.66 1.6L4 15.5V17h16v-1.5l-1.34-1.4a2.27 2.27 0 01-.66-1.6V9a6 6 0 00-6-6z" fill="#fff" opacity="0.9" />
                      <path d="M9.5 19a2.5 2.5 0 005 0h-5z" fill="#fff" opacity="0.9" />
                    </svg>
                    {dueSoonCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -2, left: -2, background: '#E85D5D', color: '#fff',
                        fontSize: 10, fontWeight: 700, borderRadius: 20, minWidth: 17, height: 17,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                        border: `2px solid ${C.purpleDark}`,
                      }}>
                        {dueSoonCount}
                      </span>
                    )}
                  </button>
                </div>

                <div data-tour="tour-eq-bar" style={ds.heroStatsRow}>
                  {[
                    { label: t.totalEntries, val: txs.length, filter: 'all' },
                    { label: t.pending, val: pendingCount, filter: 'pending' },
                    { label: lang === 'en' ? 'Unreviewed' : 'غير مُراجَعة', val: unreviewedCount, filter: 'unreviewed' },
                    { label: t.approved, val: approvedCount, filter: 'approved' },
                  ].map(s => (
                    <button
                      key={s.filter}
                      className="hero-chip-hover"
                      style={ds.heroStatChip}
                      onClick={() => { setStatusFilter(s.filter); setPage('transactions'); }}
                    >
                      <div style={ds.heroStatVal}>{s.val}</div>
                      <div style={ds.heroStatLbl}>{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Charts */}
              <DashboardCharts
                revenueData={categoryBreakdown.revenue}
                expensesData={categoryBreakdown.expenses}
                t={t}
                lang={lang}
                onSelectAccount={(name) => {
                  setAccountNameFilter(name);
                  setFilter('all'); setStatusFilter('all'); setPartyFilter('all');
                  setPage('transactions');
                }}
              />

              {/* Group Cards */}
              <div style={ds.sectionHdr}>
                <h3 style={ds.sectionTitle}>{t.mainAccounts}</h3>
                <span style={{ fontSize: 11.5, color: C.muted }}>{t.clickToFilter}</span>
              </div>
              <div style={ds.groupGrid}>
                {GROUPS.map((g) => (
                  <div
                    key={g.key}
                    className="card group-card"
                    style={{ ...ds.groupCard, transition: 'all 0.2s ease' }}
                    onClick={() => { setFilter(g.key); setPage('transactions'); }}
                  >
                    <div style={{ ...ds.groupIcon, background: C.white }}>
                      <GroupIcon groupKey={g.key} size={24} />
                    </div>
                    <div style={ds.groupBody}>
                      <div style={{ fontSize: 12, color: C.muted }}>{g.label}</div>
                      <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: g.color, marginTop: 6 }}>
                        {fmt(totals[g.key])} <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>{t.sarUnit}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{totals.counts[g.key]} {t.movements}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* الذمم المدينة والدائنة */}
              <div style={{ ...ds.sectionHdr, marginTop: 24 }}>
                <h3 style={ds.sectionTitle}>{lang === 'en' ? 'Receivables & Payables' : 'الذمم المدينة والدائنة'}</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 8 }}>
                <div
                  className="card group-card"
                  style={ds.groupCard}
                  onClick={() => { setPartyFilter('receivable'); setFilter('all'); setStatusFilter('all'); setPage('transactions'); }}
                >
                  <div style={{ ...ds.groupIcon, background: C.white }}><img src={PARTY_ICONS.customer} alt="" onError={hideOnError} style={{ width: 24, height: 24, objectFit: 'contain' }} /></div>
                  <div style={ds.groupBody}>
                    <div style={{ fontSize: 12, color: C.muted }}>{lang === 'en' ? 'Owed by customers' : 'العملاء المستحقون'}</div>
                    <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: C.purpleDark, marginTop: 6 }}>
                      {fmt(arAp.receivable_total)} <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>{t.sarUnit}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{arAp.receivable_count} {t.movements}</div>
                  </div>
                </div>
                <div
                  className="card group-card"
                  style={ds.groupCard}
                  onClick={() => { setPartyFilter('payable'); setFilter('all'); setStatusFilter('all'); setPage('transactions'); }}
                >
                  <div style={{ ...ds.groupIcon, background: C.white }}><img src={PARTY_ICONS.vendor} alt="" onError={hideOnError} style={{ width: 24, height: 24, objectFit: 'contain' }} /></div>
                  <div style={ds.groupBody}>
                    <div style={{ fontSize: 12, color: C.muted }}>{lang === 'en' ? 'Owed to vendors' : 'الموردون المستحقون'}</div>
                    <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: C.purpleDark, marginTop: 6 }}>
                      {fmt(arAp.payable_total)} <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>{t.sarUnit}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{arAp.payable_count} {t.movements}</div>
                  </div>
                </div>
              </div>

              {/* Transaction Log */}
              <div style={{ marginTop: 24 }}>
                <div style={ds.transactionLogCard}>
                  <div data-tour="tour-add-btn" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <button style={ds.addBtnAction} onClick={() => setShowAddChoice(true)}>{t.addTx}</button>
                    <button style={ds.invoiceBtnAction} onClick={() => setShowInvoice(true)}>{t.uploadInvoice}</button>
                  </div>

                  <div>
                    <div style={ds.logHeader}>
                      <span style={ds.logTitle}>{t.recentLog}</span>
                      <button style={{ background: 'none', border: 'none', color: C.purpleMuted, fontSize: 12, fontWeight: 600 }} onClick={() => setPage('transactions')}>
                        عرض الكل ←
                      </button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <TxTable txs={filtered.slice(0, 5)} onEdit={(tx) => setModal(tx)} onDelete={handleDeleteTx} onAudit={(tx) => setAuditTx(tx)} onToggleApprove={handleToggleApprove} onToggleReview={handleToggleReview} sarUnit={t.sarUnit} lang={lang} />
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

          {/* ── 2. المعاملات ────────────────────────────────────────── */}
          {page === 'transactions' && (
  <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.purpleDark,
                  fontFamily: SERIF,
                }}
              >
                {t.txLog}
              </h2>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  style={ds.addBtnAction}
                  onClick={() => setShowAddChoice(true)}
                >
                  {t.addTx}
                </button>

                <button
                  data-tour="tour-invoice-btn"
                  style={ds.invoiceBtnAction}
                  onClick={() => setShowInvoice(true)}
                >
                  {t.uploadInvoice}
                </button>
              </div>
            </div>

            <div style={ds.toolBar}>
              <input
                style={ds.searchInput}
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                style={{ ...ds.searchInput, flex: 'none', width: 160 }}
                value={filterGroup}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">{t.allCategories}</option>
                {GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>

              <button
                style={ds.refreshBtn}
                onClick={load}
              >
                {t.refresh}
              </button>
            </div>

            {(statusFilter !== 'all' || partyFilter !== 'all' || accountNameFilter) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {statusFilter !== 'all' && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                    background: C.purpleMuted, color: '#fff', padding: '5px 12px', borderRadius: 20,
                  }}>
                    {statusFilter === 'approved'   && (lang === 'en' ? 'Filter: Approved' : 'الفلتر: معتمدة')}
                    {statusFilter === 'pending'    && (lang === 'en' ? 'Filter: Pending review' : 'الفلتر: بانتظار المراجعة')}
                    {statusFilter === 'unreviewed' && (lang === 'en' ? 'Filter: Unreviewed' : 'الفلتر: غير مُراجَعة')}
                    <button
                      onClick={() => setStatusFilter('all')}
                      style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%', width: 16, height: 16, color: '#fff', fontSize: 10, cursor: 'pointer', lineHeight: 1 }}
                    >✕</button>
                  </span>
                )}
                {partyFilter !== 'all' && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                    background: C.purpleDark, color: '#fff', padding: '5px 12px', borderRadius: 20,
                  }}>
                    {partyFilter === 'receivable' && (lang === 'en' ? 'Filter: Customers owed' : 'الفلتر: العملاء المستحقون')}
                    {partyFilter === 'payable'    && (lang === 'en' ? 'Filter: Vendors owed' : 'الفلتر: الموردون المستحقون')}
                    <button
                      onClick={() => setPartyFilter('all')}
                      style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%', width: 16, height: 16, color: '#fff', fontSize: 10, cursor: 'pointer', lineHeight: 1 }}
                    >✕</button>
                  </span>
                )}
                {accountNameFilter && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                    background: C.purpleMuted, color: '#fff', padding: '5px 12px', borderRadius: 20,
                  }}>
                    {lang === 'en' ? 'Account: ' : 'الحساب: '}{accountNameFilter}
                    <button
                      onClick={() => setAccountNameFilter('')}
                      style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%', width: 16, height: 16, color: '#fff', fontSize: 10, cursor: 'pointer', lineHeight: 1 }}
                    >✕</button>
                  </span>
                )}
              </div>
            )}

            <div className="card" style={ds.tableCard}>
              {loading ? (
                <Loading text={t.loading} />
              ) : (
                <TxTable
                  txs={filtered}
                  onEdit={(tx) => setModal(tx)}
                  onDelete={handleDeleteTx}
                  onAudit={(tx) => setAuditTx(tx)}
                  onToggleApprove={handleToggleApprove}
                  onToggleReview={handleToggleReview}
                  sarUnit={t.sarUnit}
                  lang={lang}
                />
              )}
            </div>
          </>
        )}

          {/* ── 3. التقارير ────────────────────────────────────────── */}
          {page === 'reports' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.purpleDark, fontFamily: SERIF }}>{t.financialReports}</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* قائمة الدخل */}
                <div className="card" style={ds.reportCard}>
                  <div style={{ ...ds.reportCardHeader, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={REPORT_ICONS.incomeStatement} alt="" onError={hideOnError} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                      <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: '#fff' }}>{t.incomeStatement}</div>
                    </div>
                    <button
                      onClick={() => downloadPdf('/api/reports/income-statement/pdf', 'قائمة_الدخل.pdf')}
                      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT }}
                    >
                      تصدير PDF
                    </button>
                  </div>
                  <div style={{ padding: '18px 20px' }}>
                    <ReportLineGroup label={t.revenue} total={totals.revenue} items={groupBreakdown.revenue} sarUnit={t.sarUnit} />

                    {totals.cogs > 0 && (
                      <ReportLineGroup label={t.cogs} total={-totals.cogs} items={groupBreakdown.cogs} sarUnit={t.sarUnit} tint="#8A6D00" />
                    )}

                    <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 12, marginBottom: 16 }}>
                      <ReportLineGroup label={t.grossProfit} total={grossProfit} sarUnit={t.sarUnit} />
                    </div>

                    <ReportLineGroup label={t.operatingExpenses} total={-totals.expenses} items={groupBreakdown.expenses} sarUnit={t.sarUnit} tint="#B8620A" />

                    <div style={{ borderTop: `2px solid ${C.border}`, paddingTop: 14, marginTop: 6 }}>
                      <ReportLineGroup
                        big
                        label={isProfit ? t.netProfit : (lang === 'en' ? 'Loss' : 'خسارة')}
                        total={netProfit}
                        sarUnit={t.sarUnit}
                        tint={isProfit ? '#2E7D32' : '#B71C1C'}
                      />
                    </div>
                  </div>
                </div>

                {/* الميزانية العمومية */}
                <div className="card" style={ds.reportCard}>
                  <div style={{ ...ds.reportCardHeader, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={REPORT_ICONS.balanceSheet} alt="" onError={hideOnError} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                      <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: '#fff' }}>{t.balanceSheet}</div>
                    </div>
                    <button
                      onClick={() => downloadPdf('/api/reports/balance-sheet/pdf', 'الميزانية_العمومية.pdf')}
                      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, padding: '6px 12px', cursor: 'pointer', fontFamily: FONT }}
                    >
                      تصدير PDF
                    </button>
                  </div>
                  <div style={{ padding: '18px 20px' }}>
                    <ReportLineGroup label={t.assets} total={totals.assets} items={groupBreakdown.assets} sarUnit={t.sarUnit} />

                    <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 4, paddingTop: 14 }}>
                      <ReportLineGroup label={t.liabilities} total={totals.liabilities} items={groupBreakdown.liabilities} sarUnit={t.sarUnit} />
                      <ReportLineGroup label={t.equity} total={totals.equity} items={groupBreakdown.equity} sarUnit={t.sarUnit} />
                    </div>

                    <div style={{ borderTop: `2px solid ${C.border}`, paddingTop: 14, marginTop: 6 }}>
                      <ReportLineGroup
                        big
                        label={lang === 'en' ? 'Liabilities + Equity' : 'الالتزامات + حقوق الملكية'}
                        total={totals.liabilities + totals.equity}
                        sarUnit={t.sarUnit}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '5px 16px', borderRadius: 20,
                        background: Math.abs(totals.assets - totals.liabilities - totals.equity) < 0.01 ? '#E6F4EA' : '#FFF3CD',
                        color:      Math.abs(totals.assets - totals.liabilities - totals.equity) < 0.01 ? '#2E7D32' : '#856404',
                      }}>
                        {Math.abs(totals.assets - totals.liabilities - totals.equity) < 0.01 ? t.balanced : t.unbalanced}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── 4. الحسابات ────────────────────────────────────────── */}
          {page === 'accounts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.purpleDark, fontFamily: SERIF, marginBottom: 4 }}>{t.accountTree}</h2>
                <p style={{ fontSize: 13, color: C.muted }}>اضغط على أي حساب لاستعراض تفاصيل الدخول والتواريخ الخاصة به.</p>
              </div>

              <div style={ds.groupGrid}>
                {GROUPS.map((g) => (
                  <div
                    key={g.key}
                    className="card group-card"
                    style={{
                      ...ds.groupCard,
                      borderColor: selectedGroup?.key === g.key ? C.purpleMuted : C.border,
                      boxShadow:   selectedGroup?.key === g.key ? `0 0 0 2px ${C.purpleMuted}` : 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setSelectedGroup(selectedGroup?.key === g.key ? null : g)}
                  >
                    <div style={{ ...ds.groupIcon, background: C.white }}><GroupIcon groupKey={g.key} size={24} /></div>
                    <div style={ds.groupBody}>
                      <div style={{ fontSize: 12, color: C.muted }}>{g.label}</div>
                      <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: g.color, marginTop: 6 }}>
                        {fmt(totals[g.key])} <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>{t.sarUnit}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>{totals.counts[g.key]} {t.movements}</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedGroup ? (
                <div className="card" style={ds.transactionLogCard}>
                  <div style={ds.logHeader}>
                    <span style={ds.logTitle}>كشف حساب: {selectedGroup.label} ({accountSpecificTxs.length} معاملة)</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        onClick={() => downloadPdf(`/api/reports/account-statement/pdf?group=${selectedGroup.key}`, `كشف_حساب_${selectedGroup.label}.pdf`)}
                        style={{ background: C.purpleMuted, border: 'none', borderRadius: 8, color: '#fff', fontSize: 11.5, padding: '6px 14px', cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}
                      >
                        تصدير PDF
                      </button>
                      <button style={{ background: 'none', border: 'none', color: C.purpleMuted, fontSize: 12, fontWeight: 600 }} onClick={() => setSelectedGroup(null)}>
                        إغلاق ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    {accountSpecificTxs.length === 0 ? (
                      <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>
                        {t.noEntries}
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${C.border}`, textAlign: 'right', color: C.muted }}>
                              <th style={{ padding: '10px 14px', fontSize: 12 }}>{t.date}</th>
                              <th style={{ padding: '10px 14px', fontSize: 12 }}>{t.description}</th>
                              <th style={{ padding: '10px 14px', fontSize: 12 }}>مدين</th>
                              <th style={{ padding: '10px 14px', fontSize: 12 }}>دائن</th>
                              <th style={{ padding: '10px 14px', fontSize: 12, textAlign: 'left' }}>{t.value}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountSpecificTxs.map((tx, idx) => (
                              <tr key={tx.id || idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '12px 14px', color: C.muted }}>{tx.date?.slice(0, 10)}</td>
                                <td style={{ padding: '12px 14px', fontWeight: 600, color: C.text }}>{tx.description}</td>
                                <td style={{ padding: '12px 14px', fontSize: 12 }}>
                                  <span style={{ background: C.cardBeige, padding: '2px 8px', borderRadius: 6, color: C.purpleDark }}>{tx.debit_account || '—'}</span>
                                </td>
                                <td style={{ padding: '12px 14px', fontSize: 12 }}>
                                  <span style={{ background: '#EDE9FF', padding: '2px 8px', borderRadius: 6, color: C.purpleMuted }}>{tx.credit_account || '—'}</span>
                                </td>
                                <td style={{ padding: '12px 14px', fontFamily: SERIF, fontWeight: 700, textAlign: 'left', color: C.purpleDark }}>
                                  {fmt(tx.amount)} ر.س
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ border: `1px dashed ${C.border}`, padding: 40, borderRadius: 12, textAlign: 'center', color: C.muted, fontSize: 13, background: '#FAF8F2' }}>
                  يرجى تحديد حساب رئيسي من الأعلى لعرض تفاصيل الدخول وتواريخ القيود.
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ===== MODALS ===== */}
      {showAddChoice && (
        <AddChoiceModal
          onClose={() => setShowAddChoice(false)}
          onChoose={(choice) => {
            setShowAddChoice(false);
            if (choice === 'manual') setModal('add');
            else setShowQuickAdd(true);
          }}
        />
      )}
      {modal && (
        <TxModal
          tx={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            refreshAll();
            showSuccess(lang === 'en'
              ? (modal === 'add' || modal === null ? ' Transaction added successfully' : ' Transaction updated')
              : (modal === 'add' ? ' تم إضافة القيد بنجاح' : ' تم تعديل القيد بنجاح'));
          }}
          lang={lang}
          txTypes={TX_TYPES}
          groups={GROUPS}
          user={currentUser || user}
        />
      )}
      {!showTour && (
        <DueReminders
          postedTxs={postedTxs}
          sarUnit={t.sarUnit}
          onViewAll={() => { setPartyFilter('receivable'); setFilter('all'); setStatusFilter('all'); setPage('transactions'); }}
        />
      )}
      {showAI && <AIAssistant transactions={txs} totals={totals} onClose={() => setShowAI(false)} />}
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} onSaved={refreshAll} groups={GROUPS} user={currentUser || user} />}
      {auditTx && <AuditLogModal tx={auditTx} onClose={() => setAuditTx(null)} />}
      {showProfile && (
        <ProfileModal
          user={currentUser || user}
          onClose={() => setShowProfile(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
      <ToastContainer toasts={toasts} />
      {showInvoice && <InvoiceUpload onClose={() => setShowInvoice(false)} onSaved={refreshAll} user={currentUser || user} />}
      {showTour && (
        <OnboardingTour
          onFinish={() => setShowTour(false)}
          onNavigate={(p) => setPage(p)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════════ */
const ds = {
  reportStatCard: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' },
  reportStatLbl:  { fontSize: 11.5, color: C.muted, marginBottom: 6 },
  reportStatVal:  { fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: C.purpleDark },
  reportCard:       { background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' },
  reportCardHeader: { background: C.purpleDark, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center' },
  root:           { display: 'flex', minHeight: '100vh', background: C.cream, fontFamily: FONT, color: C.text, flexDirection: 'column' },
  topNav:         { width: '100%', background: `linear-gradient(100deg, #161440 0%, ${C.purpleDark} 100%)`, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12px 28px', position: 'sticky', top: 0, zIndex: 99, gap: 16, flexWrap: 'wrap' },
  logo:           { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  logoMark:       { width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: '#fff' },
  logoName:       { fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: '#fff' },
  logoSub:        { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  nav:            { display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center' },
  navBtn:         { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' },
  navBtnActive:   { background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700 },
  navRight:       { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  aiTopBtn:       { border: 'none', background: 'rgba(255,255,255,0.1)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', cursor: 'pointer' },
  userCard:       { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.07)', borderRadius: 10 },
  userAvatar:     { width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 },
  userName:       { fontSize: 12.5, fontWeight: 600, color: '#fff' },
  userRole:       { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  logoutBtn:      { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, whiteSpace: 'nowrap', cursor: 'pointer' },
  main:           { flex: 1, display: 'flex', flexDirection: 'column' },
  content:        { flex: 1, padding: '20px 32px 32px', overflowY: 'auto' },
  heroBand: { background: `linear-gradient(135deg, ${C.purpleDark} 0%, #3B3780 100%)`, borderRadius: 18, padding: '26px 28px', color: '#fff', marginBottom: 20, boxShadow: '0 10px 30px rgba(36,33,101,0.22)' },
  heroTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 },
  heroLbl: { fontSize: 13, opacity: 0.75, marginBottom: 6 },
  heroVal: { fontFamily: SERIF, fontSize: 34, fontWeight: 700, lineHeight: 1.15 },
  heroSub: { fontSize: 11.5, opacity: 0.6, marginTop: 10 },
  heroBadge: (profit) => ({
    display: 'flex', alignItems: 'center', gap: 5,
    background: profit ? 'rgba(76,175,80,0.22)' : 'rgba(244,67,54,0.22)',
    color: profit ? '#8FE3A0' : '#FFB4AC',
    padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
  }),
  heroStatsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.15)' },
  heroStatChip: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '10px 6px', cursor: 'pointer', textAlign: 'center', fontFamily: FONT },
  heroStatVal: { fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: '#fff' },
  heroStatLbl: { fontSize: 10.5, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  chartsRow:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  chartCard:      { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column' },
  chartHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartTitle:     { fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: C.purpleDark },
  addTypeBtn:     { width: 24, height: 24, borderRadius: '50%', border: `1.5px dashed ${C.purpleDark}`, color: C.purpleDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, background: 'none', cursor: 'pointer' },
  sectionHdr:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 2px 12px' },
  sectionTitle:   { fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: C.purpleDark },
  groupGrid:      { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 },
  groupCard:      { background: C.cardBeige, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, cursor: 'pointer', minHeight: 140 },
  groupIcon:      { width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${C.border}` },
  groupBody:      { flex: 1, textAlign: 'right', width: '100%' },
  transactionLogCard: { background: C.white, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` },
  logHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px dashed ${C.border}`, paddingBottom: 10 },
  logTitle:       { fontSize: 15, fontWeight: 700, color: C.purpleDark, fontFamily: SERIF },
  bottomActionRow:{ display: 'flex', gap: 10, marginTop: 16 },
  addBtnAction:   { background: C.purpleDark, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  invoiceBtnAction:{ background: '#FAF8F2', color: C.purpleDark, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  toolBar:        { display: 'flex', gap: 10, marginBottom: 14 },
  searchInput:    { flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, background: C.white },
  refreshBtn:     { border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 14px', background: C.white, fontSize: 12, color: C.muted, cursor: 'pointer', whiteSpace: 'nowrap' },
  tableCard:      { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' },
  tableHeader:    { padding: '15px 18px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, color: C.purpleDark, background: C.cardBeige, borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap' },
  actionRowBtn:   { background: 'none', border: 'none', padding: '2px 6px', fontSize: 14, cursor: 'pointer', marginLeft: 4 },
};

const ms = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(36,33,101,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)', padding: 20 },
  modal:        { background: C.white, borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}`, boxShadow: '0 16px 48px rgba(36,33,101,0.2)' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: `1px solid ${C.border}` },
  eyebrow:      { fontSize: 11, color: C.muted, marginBottom: 3 },
  title:        { fontSize: 15, fontWeight: 700, color: C.purpleDark, fontFamily: SERIF },
  closeBtn:     { background: '#F0EBE0', border: 'none', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 13, color: C.muted },
  body:         { padding: 20 },
  grid4:        { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 },
  grid2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  lbl:          { display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 5, color: C.muted },
  typeBtn:      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, cursor: 'pointer' },
  typeBtnOn:    { borderColor: C.purpleDark, background: C.cardBeige, color: C.purpleDark },
  inp:          { width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 10px', fontSize: 13, background: C.white, color: C.text },
  primaryBtn:   { width: '100%', background: C.purpleDark, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { flex: 1, background: C.white, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px', fontSize: 13.5, cursor: 'pointer' },
  btnRow:       { display: 'flex', gap: 10 },
  aiCard:       { background: C.cream, borderRadius: 10, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` },
  entryLbl:     { fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600 },
  entryInp:     { width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 12.5, background: C.white },
  divider:      { height: 1, background: C.border, margin: '10px 0' },
};