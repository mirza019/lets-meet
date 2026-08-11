import { create } from "zustand";
import type { Draft } from "../types";
const blank: Draft = { cooking_by_host: false, activities: [] };
const read = () => {
  try {
    return (
      JSON.parse(sessionStorage.getItem("lets-meet-draft") || "null") || blank
    );
  } catch {
    return blank;
  }
};
type State = {
  draft: Draft;
  set: (value: Partial<Draft>) => void;
  reset: () => void;
};
export const useDraft = create<State>((set) => ({
  draft: read(),
  set: (value) =>
    set((s) => {
      const draft = { ...s.draft, ...value };
      sessionStorage.setItem("lets-meet-draft", JSON.stringify(draft));
      return { draft };
    }),
  reset: () => {
    sessionStorage.removeItem("lets-meet-draft");
    set({ draft: blank });
  },
}));
