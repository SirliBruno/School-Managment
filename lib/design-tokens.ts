/**
 * Design System Tokens — Single Source of Truth for the School Administration Platform
 * Standardized for Arabic RTL enterprise UI with cohesive Teal/Emerald branding.
 */

export const colors = {
  brand: {
    primary: "#0d9488", // Teal-600
    primaryHover: "#0f766e", // Teal-700
    primaryLight: "#ccfbf1", // Teal-100
    primaryDark: "#115e59", // Teal-800
    primaryMuted: "#f0fdfa", // Teal-50
    accent: "#137a85", // Saudi Administrative Teal
  },
  semantic: {
    success: "#16a34a", // Green-600
    successLight: "#f0fdf4", // Green-50
    warning: "#f59e0b", // Amber-500
    warningLight: "#fffbeb", // Amber-50
    error: "#dc2626", // Red-600
    errorLight: "#fef2f2", // Red-50
    info: "#2563eb", // Blue-600
    infoLight: "#eff6ff", // Blue-50
  },
  neutral: {
    background: "#f8fafc", // Slate-50
    surface: "#ffffff", // White
    border: "#e2e8f0", // Slate-200
    borderLight: "#f1f5f9", // Slate-100
    textPrimary: "#0f172a", // Slate-900
    textSecondary: "#475569", // Slate-600
    textMuted: "#94a3b8", // Slate-400
  },
} as const;

export const typography = {
  pageTitle: "text-xl lg:text-2xl font-bold text-slate-900 tracking-tight",
  sectionTitle: "text-base lg:text-lg font-bold text-slate-800",
  cardTitle: "text-sm lg:text-base font-bold text-slate-800",
  kpiLabel: "text-xs font-semibold text-slate-500",
  kpiValue: "text-xl lg:text-2xl font-extrabold text-slate-900",
  body: "text-xs md:text-sm text-slate-700 leading-relaxed",
  caption: "text-[11px] md:text-xs text-slate-500",
  label: "text-xs md:text-sm font-bold text-slate-700",
} as const;

export const spacing = {
  pageContainer: "max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-6",
  pageGap: "gap-6",
  sectionGap: "gap-4",
  cardPadding: "p-5 md:p-6",
  cardPaddingCompact: "p-4",
  inputHeight: "h-11",
  tableCellPadding: "px-4 py-3.5",
} as const;

export const radius = {
  button: "rounded-xl",
  input: "rounded-xl",
  card: "rounded-2xl",
  modal: "rounded-2xl",
  badge: "rounded-full",
  badgeSquare: "rounded-lg",
} as const;

export const shadow = {
  card: "shadow-xs border border-slate-200/90",
  cardHover: "hover:shadow-md transition-shadow",
  dropdown: "shadow-lg border border-slate-200",
  modal: "shadow-2xl border border-slate-200/80",
} as const;
