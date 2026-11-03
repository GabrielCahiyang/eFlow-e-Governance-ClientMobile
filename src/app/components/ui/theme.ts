export const colors = {
  primary: "#0c6f6b",
  primaryDark: "#095c59",
  primarySoft: "#d9f0ed",
  background: "#f4f7f7",
  surface: "#ffffff",
  text: "#182626",
  muted: "#526161",
  border: "#d7dfdf",
  danger: "#c92a3a",
  dangerSoft: "#fde9e8",
  warning: "#795008",
  warningSoft: "#fff2d8",
  success: "#166749",
  successSoft: "#e5f5ee",
  blue: "#205c96",
};
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
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
