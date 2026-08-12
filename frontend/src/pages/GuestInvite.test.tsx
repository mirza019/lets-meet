import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { api } from "../api/client";
import { GuestInvite } from "./GuestInvite";
vi.mock("../api/client", () => ({ api: { get: vi.fn() } }));
test("renders nicknames and retires the no button after six playful escapes", async () => {
  vi.mocked(api.get).mockResolvedValue({
    host_name: "Alex",
    host_nickname: "Buddy",
    guest_name: "Jamie",
    guest_nickname: "Babe",
    status: "invited",
    current_version: 0,
    expires_at: "2030-01-01",
  } as any);
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/invite/token"]}>
      <Routes>
        <Route path="/invite/:guestToken" element={<GuestInvite />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/Hey Babe/)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "YES, OBVIOUSLY 👀" }),
  ).toBeInTheDocument();
  let no = screen.getByRole("button", { name: "NO 🙄" });
  for (let i = 0; i < 5; i++) {
    await user.click(no);
    no = await screen.findByRole("button", { name: "NO 🙄" });
  }
  await user.click(no);
  expect(
    await screen.findByText(/zero pressure, zero drama/i),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "NO 🙄" })).toBeNull();
});
