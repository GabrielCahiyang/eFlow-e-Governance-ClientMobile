import { SESSION_ACTIVITY_STORAGE_PREFIX } from "../constants";

const activityKeyPrefix = `${SESSION_ACTIVITY_STORAGE_PREFIX}:`;

export function getSessionActivityStorageKey(userId: string): string {
  return `${activityKeyPrefix}${userId}`;
}

export function clearSessionActivity(storage: Storage, userId: string): void {
  storage.removeItem(getSessionActivityStorageKey(userId));
}

export function clearAllSessionActivity(storage: Storage): void {
  const matchingKeys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(activityKeyPrefix)) matchingKeys.push(key);
  }

  matchingKeys.forEach((key) => storage.removeItem(key));
}
