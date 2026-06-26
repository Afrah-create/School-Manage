export const BRAND = {
  productName: "SchoolManage",
  companyName: "SlimCyberTech",
  companyTagline: "Building the future with code.",
  logoIcon: "/images/Logo-mark.png",
  logoFull: "/images/Logo.png",
} as const;

export const COLORS = {
  primary: {
    DEFAULT: "#1B6B3A",
    dark: "#14532d",
    light: "#e8f5ec",
  },
  accent: {
    DEFAULT: "#1D4ED8",
    deep: "#1E3A8A",
    light: "#DBEAFE",
  },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
} as const;

/** Shared font pairing across marketing and product surfaces */
export const FONTS = {
  body: {
    family: "Inter",
    variable: "--font-body",
    google: "Inter",
    weights: ["400", "500", "600", "700"] as const,
  },
  display: {
    family: "Plus Jakarta Sans",
    variable: "--font-display",
    google: "Plus_Jakarta_Sans",
    weights: ["600", "700", "800"] as const,
  },
} as const;

/** localStorage key for light/dark/system theme — shared by marketing + product */
export const THEME_STORAGE_KEY = "uganda-cbc-sms-theme";
