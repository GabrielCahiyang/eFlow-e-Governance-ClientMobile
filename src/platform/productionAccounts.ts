// Metro substitutes this module in production. Development credentials must
// never enter a release graph, even when dead-code elimination keeps imports.
export const QUICK_LOGIN_ACCOUNTS: readonly never[] = Object.freeze([]);
export function getQuickLoginAccount() {
  return undefined;
}
