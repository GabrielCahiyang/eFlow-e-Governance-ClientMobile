import { Notice } from "../../components/ui/Screen";
export function SignInProgressNotice({ waiting }: { waiting: boolean }) {
  return waiting ? (
    <Notice>
      Sign-in is taking a little longer. Please keep this screen open while we
      finish.
    </Notice>
  ) : null;
}
