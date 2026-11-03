import { useState } from "react";
import {
  Button,
  Card,
  Choice,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Row,
  SearchField,
} from "../../components/ui";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { useAuth } from "../authentication";
import type { UserProfile } from "../../../core/web/app/types";
import {
  VISIBLE_PAGE_PERMISSION_KEYS,
  ACTION_PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
} from "../../../core/web/app/features/permissions/constants";
import {
  rolePermissionAllowed,
  resolvePermissions,
} from "../../../core/web/app/features/permissions/selectors";
import { setUserOverride } from "../../../core/web/app/features/permissions/services/permissionService";
import { readRolePermissions, readOverrides } from "./permissionReads";
import { exactOfficePeople } from "./identityScope";
/** Head's Office-scoped exceptions. Global role defaults remain web-only. */
export function OfficeAccessPanel({
  actor,
  profiles,
  selectedId,
  onSelected,
}: {
  actor: string;
  profiles: UserProfile[];
  selectedId: string;
  onSelected: (id: string) => void;
}) {
  const { profile } = useAuth(),
    [search, setSearch] = useState(""),
    [reconcile, setReconcile] = useState(false),
    action = useAction();
  const people = exactOfficePeople(profiles, profile?.org_id || undefined),
    person = people.find((p) => p.id === selectedId),
    authorized = profile?.id === actor && profile?.role === "head";
  const facts = useFacts(
    `office-permissions:${actor}:${selectedId}`,
    async () => ({
      roles: await readRolePermissions(),
      overrides: person ? await readOverrides(person.id) : [],
    }),
    authorized,
  );
  const rows = facts.data?.roles || [],
    overrides = facts.data?.overrides || [],
    effective = resolvePermissions(person?.role || "", rows, overrides);
  const change = (permission: PermissionKey, allowed: boolean | null) =>
    action.run(async () => {
      if (!authorized || !person || reconcile || !facts.data || facts.error)
        return;
      if (
        !(await confirmAction(
          "Change Office account access?",
          `${person.full_name} - ${PERMISSION_LABELS[permission]}: ${allowed === null ? "Use role default" : allowed ? "Allow" : "Deny"}. Office, project and server checks still apply.`,
          "Save access",
        ))
      )
        return;
      setReconcile(true);
      await setUserOverride(person.id, permission, allowed, actor);
      await facts.refresh();
    });
  const refresh = async () => {
    await facts.refresh();
    setReconcile(false);
  };
  if (!authorized)
    return (
      <Notice>Only the Office Head can manage individual Office access.</Notice>
    );
  return (
    <>
      <Choice
        label="Account"
        value={selectedId}
        onChange={onSelected}
        options={people.map((p) => ({
          value: p.id,
          label: p.full_name,
          description: p.email,
        }))}
      />
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search capabilities"
      />
      {reconcile && (
        <Card>
          <Notice>
            Refresh access to verify the last result before another change.
          </Notice>
          <Button variant="outline" onPress={() => void refresh()}>
            Refresh access
          </Button>
        </Card>
      )}
      {facts.error ? (
        <ErrorState error={facts.error} retry={() => void refresh()} />
      ) : !facts.data ? (
        <Loading />
      ) : !person ? (
        <Empty title="Choose an Office account" />
      ) : (
        [
          { title: "Page access", keys: VISIBLE_PAGE_PERMISSION_KEYS },
          { title: "Actions", keys: ACTION_PERMISSION_KEYS },
        ].map((group) => (
          <Card key={group.title} title={group.title}>
            {group.keys
              .filter((key) =>
                (PERMISSION_LABELS[key] + " " + key)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((key) => {
                const inherited = rolePermissionAllowed(person.role, key, rows),
                  override = overrides.find((r) => r.permission === key);
                return (
                  <Card key={key} title={PERMISSION_LABELS[key]}>
                    <LabelValue
                      label="Role default"
                      value={inherited ? "Allowed" : "Denied"}
                    />
                    <LabelValue
                      label="Effective access"
                      value={effective.has(key) ? "Allowed" : "Denied"}
                    />
                    <Row>
                      <Button
                        disabled={action.busy || reconcile || !override}
                        variant="outline"
                        onPress={() => void change(key, null)}
                      >
                        Use role default
                      </Button>
                      <Button
                        disabled={
                          action.busy || reconcile || override?.allowed === true
                        }
                        variant="outline"
                        onPress={() => void change(key, true)}
                      >
                        Allow
                      </Button>
                      <Button
                        disabled={
                          action.busy ||
                          reconcile ||
                          override?.allowed === false
                        }
                        variant="outline"
                        onPress={() => void change(key, false)}
                      >
                        Deny
                      </Button>
                    </Row>
                  </Card>
                );
              })}
          </Card>
        ))
      )}
      {!!action.error && <ErrorState error={action.error} />}
    </>
  );
}
