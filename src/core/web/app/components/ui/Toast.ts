// Type declarations extracted from the web presentation module.

type ToastType = "success" | "error" | "warning" | "info";
interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}
interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}