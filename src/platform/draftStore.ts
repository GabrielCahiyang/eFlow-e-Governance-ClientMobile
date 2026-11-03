import { sessionStorage } from "./sessionStorage";
const key = (actor: string, scope: string) => `draft.${actor}.${scope}`;
export const draftStore = {
  async get<T>(actor: string, scope: string): Promise<T | null> {
    const raw = await sessionStorage.getItem(key(actor, scope), true);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(
        "This saved request is unreadable. Verify its original result before retrying.",
      );
    }
  },
  async set(actor: string, scope: string, value: unknown) {
    await sessionStorage.setItem(key(actor, scope), JSON.stringify(value));
  },
  async remove(actor: string, scope: string) {
    await sessionStorage.removeItem(key(actor, scope));
  },
};
