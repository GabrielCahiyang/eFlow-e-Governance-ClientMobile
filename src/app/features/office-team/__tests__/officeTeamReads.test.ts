import { expect, jest, test } from "@jest/globals";
import { controlPanelFetch } from "../../../../core/web/app/shared/controlPanelClient";
import { loadOfficeTeam } from "../officeTeamReads";

jest.mock("../../../../core/web/app/shared/controlPanelClient", () => ({
  controlPanelFetch: jest.fn(),
}));
const reply = (status: number, value: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => value,
  }) as Response;

test("Office Team uses the protected read route and distinguishes an empty roster from a bad response", async () => {
  jest
    .mocked(controlPanelFetch)
    .mockResolvedValueOnce(
      reply(200, { office_name: "QA Office", members: [] }),
    );
  await expect(loadOfficeTeam()).resolves.toEqual({
    office_name: "QA Office",
    members: [],
  });
  expect(controlPanelFetch).toHaveBeenLastCalledWith(
    "/office-team",
    expect.objectContaining({ method: "GET" }),
    expect.objectContaining({ retryOnEndpointChange: false }),
  );
  jest.mocked(controlPanelFetch).mockResolvedValueOnce(reply(200, {}));
  await expect(loadOfficeTeam()).rejects.toThrow("valid Office roster");
  jest
    .mocked(controlPanelFetch)
    .mockResolvedValueOnce(
      reply(200, { office_name: "QA Office", members: [{}] }),
    );
  await expect(loadOfficeTeam()).rejects.toThrow("valid Office roster");
});

test("Office Team distinguishes denied access, a missing route and transport failure", async () => {
  jest.mocked(controlPanelFetch).mockResolvedValueOnce(reply(403, {}));
  await expect(loadOfficeTeam()).rejects.toThrow("current Office Head access");
  jest.mocked(controlPanelFetch).mockResolvedValueOnce(reply(404, {}));
  await expect(loadOfficeTeam()).rejects.toThrow("does not serve Office Team");
  jest
    .mocked(controlPanelFetch)
    .mockRejectedValueOnce(new Error("fetch failed"));
  await expect(loadOfficeTeam()).rejects.toThrow("protected eFlow gateway");
});

test("a legacy null activity flag cannot make an Office account active", async () => {
  const member = {
    id: "worker",
    full_name: "QA worker",
    email: "worker@example.invalid",
    role: "member",
    is_active: null,
  };
  jest
    .mocked(controlPanelFetch)
    .mockResolvedValueOnce(
      reply(200, { office_name: "QA Office", members: [member] }),
    );
  await expect(loadOfficeTeam()).resolves.toEqual({
    office_name: "QA Office",
    members: [{ ...member, is_active: false }],
  });
});
