import { create } from "zustand";
import { initialRunState, reduceRunAll, type RunAction, type RunState } from "@/lib/runReducer";

export type ConnectionStatus = "idle" | "connecting" | "open" | "reconnecting";

export interface Connection {
  status: ConnectionStatus;
  /** When the next reconnect attempt fires (epoch ms), while reconnecting. */
  retryAt: number | null;
  attempt: number;
}

interface RunStore extends RunState {
  /** True in the tab that started the job; only that tab stops it on close. */
  owner: boolean;
  connection: Connection;
  dispatch: (actions: readonly RunAction[]) => void;
  setOwner: (owner: boolean) => void;
  setConnection: (connection: Connection) => void;
  clear: () => void;
}

const idleConnection: Connection = { status: "idle", retryAt: null, attempt: 0 };

export const useRunStore = create<RunStore>()((set) => ({
  ...initialRunState(),
  owner: false,
  connection: idleConnection,
  dispatch: (actions) => set((state) => reduceRunAll(state, actions)),
  setOwner: (owner) => set({ owner }),
  setConnection: (connection) => set({ connection }),
  clear: () => set({ ...initialRunState(), owner: false, connection: idleConnection }),
}));

export const getRun = () => useRunStore.getState();
