export const csvCell = (value: unknown) =>
  '"' +
  String(value ?? "")
    .replace(/^[=+@\-\t\r]/, "'$&")
    .replace(/"/g, '""') +
  '"';
export const htmlCell = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
