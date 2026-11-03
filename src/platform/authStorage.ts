import AsyncStorage from "@react-native-async-storage/async-storage";
import { sessionStorage } from "./sessionStorage";
const preference = "eflow.auth.remember";
const memory = new Map<string, string>();
export async function rememberSession(value: boolean) {
  await AsyncStorage.setItem(preference, value ? "true" : "false");
}
async function persistent() {
  return (await AsyncStorage.getItem(preference)) !== "false";
}
export const authStorage = {
  async getItem(key: string) {
    return (await persistent())
      ? sessionStorage.getItem(key)
      : (memory.get(key) ?? null);
  },
  async setItem(key: string, value: string) {
    if (await persistent()) {
      memory.delete(key);
      await sessionStorage.setItem(key, value);
    } else {
      memory.set(key, value);
      await sessionStorage.removeItem(key);
    }
  },
  async removeItem(key: string) {
    memory.delete(key);
    await sessionStorage.removeItem(key);
  },
};
