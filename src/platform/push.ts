import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
const deviceKey = "eflow.push-device";
async function deviceId() {
  let id = await AsyncStorage.getItem(deviceKey);
  if (!id) {
    id = crypto.randomUUID();
    await AsyncStorage.setItem(deviceKey, id);
  }
  return id;
}
export async function enablePush(actor: string) {
  if (Platform.OS === "web")
    throw new Error(
      "Push registration is available in the Android and iOS app.",
    );
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId)
    throw new Error(
      "Push delivery is not configured: add the EAS project ID and platform credentials to the build.",
    );
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("eflow-work", {
      name: "eFlow work updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Allow notifications in your device settings to receive work updates.",
    );
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc("register_mobile_push_device", {
    p_device: await deviceId(),
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error)
    throw new Error(
      /PGRST202|42883/.test(error.code)
        ? "Push server registration has not been deployed yet. See the mobile delivery checklist."
        : error.message,
    );
  await AsyncStorage.setItem("eflow.push:" + actor, "enabled");
}
export async function disablePush(actor: string) {
  const id = await AsyncStorage.getItem(deviceKey);
  if (id) {
    const { error } = await supabase.rpc("unregister_mobile_push_device", {
      p_device: id,
    });
    if (error) throw new Error(error.message);
  }
  await AsyncStorage.removeItem("eflow.push:" + actor);
}
export async function pushEnabled(actor: string) {
  return (await AsyncStorage.getItem("eflow.push:" + actor)) === "enabled";
}
export async function unregisterPushBeforeSignOut(actor: string) {
  if (!(await pushEnabled(actor))) return;
  await disablePush(actor);
}
