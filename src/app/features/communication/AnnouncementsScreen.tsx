import { loadAnnouncements } from "./announcementReads";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Choice,
  DateField,
  Empty,
  ErrorState,
  Field,
  LabelValue,
  Loading,
  Notice,
  Row,
  Screen,
  Sheet,
  Tabs,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAuth } from "../authentication";
import { useFacts } from "../../shared/useFacts";
import { useAction } from "../../shared/useAction";
import { confirmAction } from "../../shared/confirm";
import { supabase } from "../../../platform/supabase";
import { createPostgresChannel } from "../../shared/postgresChannel";
import {
  markAnnouncementRead,
  saveDraft,
  publishAnnouncement,
  withdrawAnnouncement,
  deleteAnnouncement,
  type Announcement,
  type AnnouncementDraft,
  type Audience,
} from "../../../core/web/app/services/announcementService";
import {
  fetchAllOrgs,
  fetchAllProfiles,
} from "../../../core/web/lib/supabaseService";
import { getPhilippineCalendarDate } from "../../../core/web/app/shared/calendarDates";
function Editor({
  item,
  onClose,
  onSaved,
}: {
  item: Announcement | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const auth = useAuth(),
    { id: actor } = auth.profile!,
    can = auth.can,
    [title, setTitle] = useState(item?.title || ""),
    [body, setBody] = useState(item?.body || ""),
    [audience, setAudience] = useState<Audience>(item?.audience || "all"),
    [office, setOffice] = useState(item?.orgId || auth.profile?.org_id || ""),
    [users, setUsers] = useState<string[]>([]),
    [expiry, setExpiry] = useState(
      item?.expiresAt
        ? getPhilippineCalendarDate(new Date(item.expiresAt))
        : "",
    ),
    [uncertain, setUncertain] = useState(false),
    action = useAction(),
    saved = useRef(item?.id),
    facts = useFacts("announcement-targets:" + actor, async () => {
      const [orgs, people] = await Promise.all([
        fetchAllOrgs(),
        fetchAllProfiles(),
      ]);
      let recipients: string[] = [];
      if (item?.id && item.audience === "users") {
        const r = await supabase
          .from("announcement_recipients")
          .select("user_id")
          .eq("announcement_id", item.id);
        if (r.error) throw r.error;
        recipients = (r.data || []).map((row) => row.user_id);
      }
      return { orgs, people, recipients };
    });
  useEffect(() => {
    if (facts.data) setUsers(facts.data.recipients);
  }, [facts.data]);
  const commit = (publish: boolean) =>
    action.run(async () => {
      if (
        !can("announcements.publish") ||
        uncertain ||
        facts.loading ||
        facts.error
      )
        throw new Error("Refresh your publishing access before continuing.");
      const draft: AnnouncementDraft = {
        title,
        body,
        audience,
        orgId: office || null,
        userIds: users,
        expiresAt: expiry || null,
      };
      if (
        !title.trim() ||
        (audience === "org" && !office) ||
        (audience === "users" && !users.length)
      )
        throw new Error("Enter a title and the selected audience.");
      if (
        publish &&
        !(await confirmAction(
          "Publish announcement?",
          `${title} will be visible to ${audience === "all" ? "all recipients" : audience === "org" ? "the selected Office" : users.length + " selected recipients"}.`,
          "Publish",
        ))
      )
        return;
      setUncertain(true);
      saved.current = await saveDraft(draft, saved.current);
      if (publish) await publishAnnouncement(saved.current, draft);
      await onSaved();
      onClose();
    });
  return (
    <Sheet
      open
      title={item ? "Edit announcement" : "New announcement"}
      onClose={onClose}
      busy={action.busy}
      footer={
        <Row>
          <Button
            disabled={uncertain}
            busy={action.busy}
            variant="outline"
            onPress={() => void commit(false)}
          >
            Save draft
          </Button>
          <Button
            disabled={uncertain}
            busy={action.busy}
            onPress={() => void commit(true)}
          >
            Publish
          </Button>
        </Row>
      }
    >
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        maxLength={250}
      />
      <Field
        label="Announcement"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={10000}
      />
      <Choice
        label="Audience"
        value={audience}
        onChange={setAudience}
        options={[
          { value: "all", label: "Entire LGU" },
          { value: "org", label: "Office scope" },
          { value: "users", label: "Selected recipients" },
        ]}
      />
      {audience === "org" && (
        <Choice
          label="Office"
          value={office}
          onChange={setOffice}
          options={(facts.data?.orgs || []).map((o) => ({
            value: o.id,
            label: o.name,
          }))}
        />
      )}
      {audience === "users" && (
        <Choice
          label="Recipients"
          multiple
          value={users}
          onChange={setUsers}
          options={(facts.data?.people || [])
            .filter((p) => p.is_active)
            .map((p) => ({ value: p.id, label: p.full_name }))}
        />
      )}
      <DateField
        label="Expiry (optional)"
        value={expiry}
        onChange={setExpiry}
      />
      {!!facts.error && <ErrorState error={facts.error} />}
      {uncertain && (
        <Notice>
          Verify the announcement list before retrying a write. A lost response
          must not create or publish another announcement.
        </Notice>
      )}
      {!!action.error && <ErrorState error={action.error} />}
    </Sheet>
  );
}
export function AnnouncementsScreen() {
  const { profile, can } = useAuth(),
    actor = profile!.id,
    manage = can("announcements.publish"),
    [tab, setTab] = useState("all"),
    [edit, setEdit] = useState<Announcement | null | undefined>(),
    [revision, setRevision] = useState(0),
    action = useAction(),
    facts = useFacts("announcements:" + actor + ":" + revision, () =>
      loadAnnouncements(actor, profile?.org_id, manage),
    );
  useEffect(() => {
    const live = createPostgresChannel("native-announcements:" + actor)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => void facts.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcement_recipients",
          filter: "user_id=eq." + actor,
        },
        () => void facts.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(live);
    };
  }, [actor]);
  const rows = (facts.data || []).filter(
    (item) =>
      tab === "all" ||
      (tab === "unread"
        ? !("readAt" in item && item.readAt)
        : item.status === tab),
  );
  return (
    <Screen
      title="Announcements"
      description="Official updates addressed to your work."
      onRefresh={() => void facts.refresh()}
      refreshing={facts.loading}
      actions={
        manage ? (
          <Button onPress={() => setEdit(null)}>New announcement</Button>
        ) : undefined
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        items={
          manage
            ? ["all", "draft", "published", "withdrawn"].map((id) => ({
                id,
                label: id,
              }))
            : [
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
              ]
        }
      />
      {facts.error ? (
        <ErrorState error={facts.error} />
      ) : !facts.data ? (
        <Loading />
      ) : !rows.length ? (
        <Empty title="No announcements in this view" />
      ) : (
        rows.map((item) => (
          <Card key={item.id} title={item.title}>
            <Text selectable>{item.body}</Text>
            <LabelValue label="Audience" value={item.audience} />
            <LabelValue label="Status" value={item.status} />
            <LabelValue label="Expires" value={dateLabel(item.expiresAt)} />
            <Row>
              {!manage ? (
                <Button
                  variant="outline"
                  onPress={() =>
                    void action.run(async () => {
                      await markAnnouncementRead(actor, item.id);
                      await facts.refresh();
                    })
                  }
                >
                  Mark read
                </Button>
              ) : (
                <>
                  <Button variant="outline" onPress={() => setEdit(item)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() =>
                      void action.run(async () => {
                        if (
                          !(await confirmAction(
                            item.status === "published"
                              ? "Withdraw announcement?"
                              : "Permanently delete announcement?",
                            item.title,
                            item.status === "published"
                              ? "Withdraw"
                              : "Delete permanently",
                            true,
                          ))
                        )
                          return;
                        if (item.status === "published")
                          await withdrawAnnouncement(
                            item.id,
                            "Withdrawn by authorized mobile publisher",
                          );
                        else await deleteAnnouncement(item.id);
                        await facts.refresh();
                      })
                    }
                  >
                    {item.status === "published" ? "Withdraw" : "Delete"}
                  </Button>
                </>
              )}
            </Row>
          </Card>
        ))
      )}
      {!!action.error && <ErrorState error={action.error} />}
      {edit !== undefined && (
        <Editor
          item={edit}
          onClose={() => setEdit(undefined)}
          onSaved={async () => {
            setRevision((v) => v + 1);
            await facts.refresh();
          }}
        />
      )}
    </Screen>
  );
}
