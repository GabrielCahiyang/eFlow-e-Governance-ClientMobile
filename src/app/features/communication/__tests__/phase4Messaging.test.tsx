import { expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ConversationList } from "../ConversationList";
import { MentionSuggestions } from "../MentionSuggestions";
import { MessageThread } from "../MessageThread";
import type { Channel, Message } from "../services";

jest.mock("../../../../platform/supabase", () => ({ supabase: {} }));
jest.mock("../../../components/ui/Sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? children : null,
}));

test("mentions target the authorized person by their server name and reserve everyone for groups", async () => {
  const onSelect = jest.fn();
  const people = [
    {
      id: "reviewer",
      name: "QA Reviewer",
      nickname: "Reviewer",
      is_lead: false,
    },
    { id: "me", name: "Sender", is_lead: true },
  ];
  const view = await render(
    <MentionSuggestions
      actor="me"
      people={people}
      query=""
      group
      onSelect={onSelect}
    />,
  );
  await fireEvent.press(view.getByRole("button", { name: "@everyone" }));
  await fireEvent.press(
    view.getByRole("button", { name: "Mention QA Reviewer" }),
  );
  expect(onSelect.mock.calls).toEqual([
    ["@everyone"],
    ["@QA Reviewer", "reviewer"],
  ]);
  expect(view.queryByRole("button", { name: "Mention Sender" })).toBeNull();
  await view.rerender(
    <MentionSuggestions
      actor="me"
      people={people}
      query=""
      group={false}
      onSelect={onSelect}
    />,
  );
  expect(view.queryByRole("button", { name: "@everyone" })).toBeNull();
});

test("project chats appear in Pinned and task chats name the owning project", async () => {
  const project: Channel = {
    id: "p",
    kind: "project",
    name: "Outreach",
    projectId: "p",
  };
  const task: Channel = {
    id: "t",
    kind: "task",
    name: "Book venue",
    projectTitle: "Outreach",
    unread: true,
  };
  const view = await render(
    <ConversationList
      actor="me"
      channels={[task, project]}
      total={2}
      query=""
      onQuery={jest.fn()}
      filter="all"
      onFilter={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  expect(view.getByRole("header", { name: "Pinned" })).toBeOnTheScreen();
  expect(view.getByText("Task chat · Outreach")).toBeOnTheScreen();
  expect(
    view.getByRole("button", { name: "Book venue. Unread. Task in Outreach" }),
  ).toBeOnTheScreen();
});

test("deleted messages keep their place and archived messages expose no mutation action", async () => {
  const channel: Channel = {
    id: "p",
    kind: "project",
    name: "Outreach",
    archived: true,
  };
  const deleted: Message = {
    id: "message",
    sender_id: "me",
    sender_name: "Sender",
    content: "Original private text",
    image_path: "private/photo.png",
    created_at: "2026-11-10T12:00:00Z",
    deleted_at: "2026-11-10T13:00:00Z",
  };
  const other = {
    ...deleted,
    id: "other",
    deleted_at: undefined,
    image_path: undefined,
    sender_id: "reviewer",
    sender_name: "QA Reviewer",
    content: "Approved",
  };
  const view = await render(
    <MessageThread
      actor="me"
      channel={channel}
      people={[]}
      messages={[deleted, other]}
      onPin={jest.fn()}
      onReact={jest.fn()}
      onRemove={async () => true}
    />,
  );
  expect(view.getByText("You deleted a message")).toBeOnTheScreen();
  expect(view.queryByText("Original private text")).toBeNull();
  const bubble = view.getByRole("button", { name: /QA Reviewer: Approved/ });
  expect(bubble.props.accessibilityActions).toEqual([]);
});
