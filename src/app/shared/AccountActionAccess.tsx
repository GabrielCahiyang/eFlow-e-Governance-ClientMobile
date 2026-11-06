import { createContext, useContext, type MutableRefObject } from "react";
import { PublicMessageError } from "./userMessages";

export type AccountActionAccess = {
  actor: string | null;
  ready: boolean;
};
// A ref makes a background/identity change effective before React rerenders.
export const AccountActionContext =
  createContext<MutableRefObject<AccountActionAccess> | null>(null);
export function useAccountActionAccess() {
  const access = useContext(AccountActionContext);
  const renderedActor = access?.current.actor;
  return (actor: string | null | undefined = renderedActor) => {
    if (
      access &&
      (!access.current.ready ||
        (actor !== undefined && access.current.actor !== actor))
    )
      throw new PublicMessageError(
        "Please wait while we check your access. If you're offline, reconnect and tap Retry.",
      );
  };
}
