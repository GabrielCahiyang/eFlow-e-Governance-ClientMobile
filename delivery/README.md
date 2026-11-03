# Mobile deployment handoff

Nothing in this directory has been executed against the hosted database. The sole destination remains `ixnfphgjyelhckjwjkdv`. Mobile contribution rules prohibit changing schemas/RLS as part of the port. These isolated source proposals require the existing separate backend deployment review; they are intentionally outside any migration-push directory.

## Personal membership

`personal-eligibility/REVIEW_ONLY.sql` patches one exact expression in the existing function definition. It aborts on drift rather than replacing an unknown live definition. The R7 result's `kind` determines membership context: null for personal work, participating Office ID for operational work. Display Office affiliation remains intact. No account, role or command permission is changed. Capture a pre-deployment function definition/backup, review grants, apply through an isolated live-history migration workspace, and record deployment evidence. Verify active owner/member, viewer, expired/revoked/guest and operational cross-Office cases before acceptance. The mobile client does not override an ineligible server response.

## Remote push

1. Link an EAS project; set the public build variable `EXPO_PUBLIC_EAS_PROJECT_ID` to its ID. Supply Android FCM v1 and iOS APNs credentials through EAS. Never commit credentials or service-role keys. Rebuild native binaries.
2. Review the registry/outbox SQL against live notifications schema, profile eligibility, role policy and existing function names. It adds account-bound device registration with no client table access, a unique notification/device outbox, and service-role-only leased claims. It does not send historical notifications.
3. Deploy `push/index.ts` as a separate Supabase Edge Function with JWT verification disabled only because the function checks its dedicated bearer secret. Set `PUSH_DISPATCH_SECRET` and optionally Expo enhanced push-security `EXPO_ACCESS_TOKEN` in server secrets. Invoke it by protected server scheduler (for example once a minute). No schedule or webhook was installed by this implementation.
4. Device registration is explicit in Settings → Notifications. A missing EAS ID, credentials or RPC produces a configuration error. In-app realtime notifications work independently. Logout unregisters the device first; if that fails it reports the failure rather than silently leaving alerts bound to a logged-out account.
5. Worker acceptance by Expo is not proof of handset delivery. The worker polls Expo receipts after 15 minutes, removes unregistered devices, and retries failed delivery up to five attempts. Receipt success means platform push-service acceptance, not proof a person read the alert. Production rollout still needs a retention policy and monitoring for exhausted retries or unavailable receipts. Provider acceptance followed by a lost database update can redeliver a generic alert. Never put task/person/financial details in the push preview. No background call wake-up/CallKit integration is implemented; calls currently require the app in foreground.

References: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [Expo delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/).

## Calls

Native WebRTC uses the existing calls table and Supabase signaling protocol. Configure `EXPO_PUBLIC_STUN_URL` and a TURN service appropriate for your deployment. Public mobile configuration is extractable from an APK: use short-lived TURN credentials in production, not permanent privileged secrets. Calls end on app background; a 60-second unanswered call becomes missed. No real calls were placed during this implementation.
