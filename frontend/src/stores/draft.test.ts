import { beforeEach, expect, test } from "vitest";
import { useDraft } from "./draft";
beforeEach(() => {
  sessionStorage.clear();
  useDraft.getState().reset();
});
test("persists wizard progress", () => {
  useDraft.getState().set({ meeting_time: "19:00" });
  expect(JSON.parse(sessionStorage.getItem("lets-meet-draft")!)).toMatchObject({
    meeting_time: "19:00",
  });
});
