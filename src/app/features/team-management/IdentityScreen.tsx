import { useState } from "react";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  LabelValue,
  Loading,
  Notice,
  Screen,
  SearchField,
  Tabs,
} from "../../components/ui";
import { useAuth } from "../authentication";
import { OfficeAccessPanel } from "./OfficeAccessPanel";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import {
  fetchAllOrgs,
  fetchAllProfiles,
} from "../../../core/web/lib/supabaseService";
import { setDepartmentAccountingStaff } from "../../../core/web/app/features/team-management/services/departmentIdentityService";
import type { UserProfile } from "../../../core/web/app/types";
import {
  exactOfficePeople,
  accountingAssignmentAllowed,
} from "./identityScope";
export function IdentityScreen() {
  const { profile } = useAuth(),
    actor = profile!,
    [tab, setTab] = useState("people"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [reconcile, setReconcile] = useState(false),
    action = useAction();
  const facts = useFacts(
    "office-identity:" + actor.id,
    async () => {
      const [profiles, orgs] = await Promise.all([
        fetchAllProfiles(),
        fetchAllOrgs(),
      ]);
      return {
        people: exactOfficePeople(profiles, actor.org_id || undefined),
        office: orgs.find((org) => org.id === actor.org_id),
        profiles,
      };
    },
    actor.role === "head",
  );
  const data = facts.data,
    filtered = (data?.people || []).filter((p) =>
      (p.full_name + " " + p.email)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  const update = (person: UserProfile) =>
    action.run(async () => {
      if (
        reconcile ||
        facts.error ||
        !accountingAssignmentAllowed(actor, data?.office?.head_user_id, person)
      )
        return;
      const assigned = person.role !== "accounting_staff";
      if (
        !(await confirmAction(
          assigned ? "Assign accounting access?" : "Remove accounting access?",
          `${person.full_name} · ${data?.office?.name}. ${assigned ? "This changes the system role to Accounting Staff. Individual accounting action permissions and independent review rules still apply." : "The person returns to Member access; accounting history remains."}`,
          "Save accounting access",
          !assigned,
        ))
      )
        return;
      setReconcile(true);
      await setDepartmentAccountingStaff(person.id, assigned);
      await facts.refresh();
    });
  const refresh = async () => {
    await facts.refresh();
    setReconcile(false);
  };
  return (
    <Screen
      title="Identity & Access"
      description="Active people in your Office, account access and protected leadership."
      onRefresh={() => refresh()}

    >
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "people", label: "Available staff" },
          { id: "access", label: "Current access" },
          { id: "leadership", label: "Protected leadership" },
        ]}
      />
      {actor.role !== "head" ? (
        <Notice>Only the Office Head can open this workspace.</Notice>
      ) : facts.error ? (
        <ErrorState error={facts.error} retry={() => void refresh()} />
      ) : !data ? (
        <Loading />
      ) : !actor.org_id ? (
        <Notice>Your account must be attached to an Office.</Notice>
      ) : tab === "leadership" ? (
        <Card title="Office Leadership">
          <LabelValue
            label="Office"
            value={data.office?.name || "Not provided"}
          />
          <LabelValue
            label="Head"
            value={
              data.profiles.find((p) => p.id === data.office?.head_user_id)
                ?.full_name || "No Head assigned"
            }
          />
          <Notice>
            The Head is accountable for Office output. Admin manages Head
            appointments.
          </Notice>
        </Card>
      ) : tab === "access" ? (
        <OfficeAccessPanel
          actor={actor.id}
          profiles={data.people}
          selectedId={selected}
          onSelected={setSelected}
        />
      ) : (
        <>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search Office name or email"
          />
          {!filtered.length ? (
            <Empty title="No matching Office people" />
          ) : (
            filtered.map((person) => (
              <Card key={person.id} title={person.full_name}>
                <LabelValue label="Email" value={person.email} />
                <LabelValue
                  label="Role"
                  value={person.role.replace(/_/g, " ")}
                />
                {["member", "accounting_staff"].includes(person.role) ? (
                  <Button
                    variant="outline"
                    disabled={
                      action.busy ||
                      reconcile ||
                      !accountingAssignmentAllowed(
                        actor,
                        data.office?.head_user_id,
                        person,
                      )
                    }
                    onPress={() => void update(person)}
                  >
                    {person.role === "accounting_staff"
                      ? "Remove accounting access"
                      : "Assign accounting access"}
                  </Button>
                ) : (
                  <Notice>Leadership role protected</Notice>
                )}
              </Card>
            ))
          )}
        </>
      )}
      {!!reconcile && (
        <Card>
          <Notice>
            Refresh Office access to verify the last result before another
            change.
          </Notice>
          <Button
            disabled={action.busy}
            variant="outline"
            onPress={() => void refresh()}
          >
            Refresh Office access
          </Button>
        </Card>
      )}
      {!!action.error && <ErrorState context="action" error={action.error} />}
    </Screen>
  );
}
