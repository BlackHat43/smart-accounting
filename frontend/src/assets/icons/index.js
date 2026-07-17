// سجل مركزي لكل أيقونات المشروع المخصّصة (بدل الإيموجي) — عدّل الملفات هنا فقط
// إن أردت تغيير أي أيقونة لاحقًا.
import navDashboard from './nav-dashboard.png';
import navTransactions from './nav-transactions.png';
import navReports from './nav-reports.png';
import navAccounts from './nav-accounts.png';

import iconAssets from './icon-assets.png';
import iconEquity from './icon-equity.png';
import iconRevenue from './icon-revenue.png';
import iconExpenses from './icon-expenses.png';
import iconCogs from './icon-cogs.png';

import iconCustomer from './icon-customer.png';
import iconSupplier from './icon-supplier.png';
import iconReceivablesHeader from './icon-receivables-header.png';

import iconIncomeStatement from './icon-income-statement.png';
import iconBalanceSheet from './icon-balance-sheet.png';

import avatarSanad from './avatar-sanad.png';

export const NAV_ICONS = {
  dashboard: navDashboard,
  transactions: navTransactions,
  reports: navReports,
  accounts: navAccounts,
};

// لا توجد أيقونة مخصّصة لـ"الالتزامات" ضمن الصور المرفقة، لذا تُرسم بأيقونة SVG
// بسيطة بنفس أسلوب بقية الأيقونات (خطوط نظيفة بلون الهوية) بدل استخدام إيموجي.
export const GROUP_ICONS = {
  assets: iconAssets,
  equity: iconEquity,
  revenue: iconRevenue,
  expenses: iconExpenses,
  cogs: iconCogs,
  liabilities: null,
};

export const PARTY_ICONS = {
  customer: iconCustomer,
  vendor: iconSupplier,
};

export const RECEIVABLES_HEADER_ICON = iconReceivablesHeader;
export const REPORT_ICONS = {
  incomeStatement: iconIncomeStatement,
  balanceSheet: iconBalanceSheet,
};

export const SANAD_AVATAR = avatarSanad;
