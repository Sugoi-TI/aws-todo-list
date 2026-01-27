import { create } from "zustand";
import type { Theme, User } from "./types.ts";

type AppState = {
  user: User | null;
  setUser: (user: User) => void;

  theme: Theme;
  toggleTheme: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  theme: "light",
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));
