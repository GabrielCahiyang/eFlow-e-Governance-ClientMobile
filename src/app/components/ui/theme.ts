// Sampled from the user-provided eFlow logo. Keep brand identity separate
// from status semantics and the accessible dark-mode accent.
export const brandColors = {
  navy: "#00006b",
  blue: "#0073ea",
  white: "#ffffff",
};
export const withOpacity = (hex: string, opacity: number) =>
  `${hex}${Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0")}`;

export const colors = {
  primary: brandColors.navy,
  primaryDark: "#00004f",
  primarySoft: "#e8edff",
  background: "#f5f7fc",
  surface: "#ffffff",
  glassSurface: "#e7edf7",
  glassEdge: "#ffffff",
  glassTop: "rgba(255,255,255,0.72)",
  glassBottom: "rgba(209,222,245,0.34)",
  text: "#161b35",
  muted: "#505c77",
  border: "#d6deed",
  danger: "#c92a3a",
  dangerSoft: "#fde9e8",
  warning: "#795008",
  warningSoft: "#fff2d8",
  success: "#166749",
  successSoft: "#e5f5ee",
  blue: "#0067d3", // Accessible blue text on the tinted information surface.
  blueSoft: "#e7f2ff",
  onPrimary: "#ffffff",
  onDanger: "#ffffff",
  mutedLabel: "#5e6b85",
  review: "#67459e",
  reviewSoft: "#f0eafa",
  heroStart: "#00004f",
  heroMiddle: brandColors.navy,
  heroEnd: brandColors.blue,
};
export type ThemeColors = Record<keyof typeof colors, string>;
export const darkColors: ThemeColors = {
  primary: "#94baff",
  primaryDark: "#dce7ff",
  primarySoft: "#243460",
  background: "#0a1028",
  surface: "#141e3c",
  glassSurface: "#141e3c",
  glassEdge: "#35466b",
  glassTop: "rgba(255,255,255,0)",
  glassBottom: "rgba(255,255,255,0)",
  text: "#eef3ff",
  muted: "#bcc8e2",
  mutedLabel: "#9eaecc",
  border: "#35466b",
  danger: "#ffc2b8",
  dangerSoft: "#452826",
  onDanger: "#452826",
  warning: "#f6d58b",
  warningSoft: "#443818",
  success: "#a2e8c6",
  successSoft: "#173c30",
  blue: "#85c3ff",
  blueSoft: "#172f50",
  onPrimary: "#08142f",
  review: "#dbcaff",
  reviewSoft: "#35264a",
  heroStart: "#101849",
  heroMiddle: "#172765",
  heroEnd: "#174c89",
};
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { control: 8, surface: 10, overlay: 14, pill: 999 };
export const touchTarget = { android: 48, ios: 44 };
export const type = { title: 26, heading: 19, body: 15, small: 13, tiny: 11 };
export const peso = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value || 0,
  );
export const dateLabel = (value?: string | number | null) =>
  value
    ? new Date(value).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
export const words = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
