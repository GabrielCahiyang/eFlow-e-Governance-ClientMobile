import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import "../../../../platform/bootstrap";
import { draftStore } from "../../../../platform/draftStore";
import { NavigationHeaderContext } from "../../navigation/navigationHeaderContext";
import { ChatScreen } from "../ChatScreen";
import {
  listChatPeople,
  loadChannels,
  loadMessages,
  openDirectConversation,
  readConversation,
  sendChat,
} from "../services";
import type { Channel, Message } from "../services";

jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "sender" } } },
      }),
    },
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: async () => {},
  },
}));
jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));
jest.mock("lottie-react-native", () => () => null);
jest.mock("../../../components/ui/Sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? children : null,
}));
jest.mock("../../authentication", () => ({
  useAuth: () => ({ profile: { id: "sender", full_name: "QA Sender" } }),
}));
jest.mock("../services", () => ({
  listChatPeople: jest.fn(async () => []),
  loadChannels: jest.fn(),
  loadMessages: jest.fn(),
  openDirectConversation: jest.fn(),
  readConversation: jest.fn(),
  sendChat: jest.fn(),
}));
jest.mock("../useChatHistorySync", () => ({ useChatHistorySync: () => {} }));

const direct: Channel = {
  id: "direct",
  name: "QA Recipient",
  kind: "direct",
  unread: true,
};
const incoming: Message = {
  id: "incoming",
  sender_id: "recipient",
  sender_name: "QA Recipient",
  created_at: "2026-11-18T02:00:00Z",
  content: "Please confirm",
};

test("the Messages header opens the people picker and routes to the server-selected direct chat", async () => {
  jest.mocked(loadChannels).mockResolvedValue([]);
  jest
    .mocked(listChatPeople)
    .mockResolvedValueOnce([
      { id: "recipient", name: direct.name, is_lead: false },
    ]);
  jest.mocked(openDirectConversation).mockResolvedValue(direct.id);
  const navigate = jest.fn();
  const view = await render(
    <ChatScreen navigate={navigate} route={{ name: "messages" }} />,
  );
  await fireEvent.press(view.getByRole("button", { name: "New conversation" }));
  await fireEvent.press(
    await view.findByRole("button", { name: "Message QA Recipient" }),
  );
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith({
      name: "messages",
      id: direct.id,
      title: direct.name,
    }),
  );
  expect(openDirectConversation).toHaveBeenCalledWith("recipient");
});

test("opening an unread conversation marks it read and retries a failed send with the same receipt", async () => {
  const records = new Map<string, unknown>();
  const history = [incoming];
  jest
    .mocked(draftStore.get)
    .mockImplementation(
      async (_actor, key) => (records.get(key) ?? null) as never,
    );
  jest.mocked(draftStore.set).mockImplementation(async (_actor, key, value) => {
    records.set(key, value);
  });
  jest.mocked(draftStore.remove).mockImplementation(async (_actor, key) => {
    records.delete(key);
  });
  jest.mocked(loadChannels).mockResolvedValue([direct]);
  jest.mocked(loadMessages).mockImplementation(async () => ({
    rows: [...history],
    hasOlder: false,
  }));
  jest
    .mocked(sendChat)
    .mockRejectedValueOnce(new Error("Fixture response lost"))
    .mockImplementationOnce(async (id, _channel, sender, name, content) => {
      history.push({
        id,
        sender_id: sender,
        sender_name: name,
        content,
        created_at: "2026-11-18T02:01:00Z",
      });
    });

  const navigate = jest.fn();
  const view = await render(
    <ChatScreen navigate={navigate} route={{ name: "messages" }} />,
  );
  await fireEvent.press(
    await view.findByRole("button", {
      name: "QA Recipient. Unread. Direct message",
    }),
  );
  const thread = {
    name: "messages",
    id: direct.id,
    title: direct.name,
  } as const;
  expect(navigate).toHaveBeenCalledWith(thread);
  await view.rerender(
    <ChatScreen key={direct.id} navigate={navigate} route={thread} />,
  );
  expect(
    await view.findByRole("button", { name: /^QA Recipient: Please confirm/ }),
  ).toBeOnTheScreen();
  await waitFor(() =>
    expect(readConversation).toHaveBeenCalledWith(
      direct.id,
      incoming.created_at,
    ),
  );

  const reply = "Confirmed";
  await fireEvent.changeText(view.getByLabelText("Message"), reply);
  await fireEvent.press(view.getByRole("button", { name: "Send message" }));
  await waitFor(() => {
    expect(sendChat).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText("Message")).toHaveProp("editable", false);
    expect(view.getByRole("button", { name: "Send message" })).toBeEnabled();
  });
  const request = jest.mocked(sendChat).mock.calls[0];
  expect(request.slice(1, 5)).toEqual([
    direct.id,
    "sender",
    "QA Sender",
    reply,
  ]);
  expect(records.get("chat:direct")).toMatchObject({
    id: request[0],
    text: reply,
  });
  expect(view.getByLabelText("Message")).toHaveProp("value", reply);

  await fireEvent.press(view.getByRole("button", { name: "Send message" }));
  expect(
    await view.findByRole("button", { name: /^You: Confirmed/ }),
  ).toBeOnTheScreen();
  expect(jest.mocked(sendChat).mock.calls).toEqual([request, request]);
  expect(records.has("chat:direct")).toBe(false);
  expect(view.getByLabelText("Message")).toHaveProp("value", "");
});

test("an archived thread keeps history and a back action without exposing a composer", async () => {
  const archived: Channel = {
    id: "archived",
    name: "Archived project",
    kind: "project",
    archived: true,
  };
  jest.mocked(loadChannels).mockResolvedValue([archived]);
  jest.mocked(loadMessages).mockResolvedValue({
    rows: [incoming],
    hasOlder: false,
  });
  jest.mocked(draftStore.get).mockResolvedValue(null);
  const onBack = jest.fn();
  const view = await render(
    <NavigationHeaderContext.Provider
      value={{ onBack, backHint: "Returns to previous screen", topInset: 24 }}
    >
      <ChatScreen
        navigate={jest.fn()}
        route={{ name: "messages", id: archived.id }}
      />
    </NavigationHeaderContext.Provider>,
  );
  expect(
    await view.findByRole("button", { name: /^QA Recipient: Please confirm/ }),
  ).toBeOnTheScreen();
  expect(view.queryByLabelText("Message")).toBeNull();
  expect(view.queryByRole("button", { name: "Attach image" })).toBeNull();
  await fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(sendChat).not.toHaveBeenCalled();
});
