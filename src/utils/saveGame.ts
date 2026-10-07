import type { GameState } from "../types/game";
import type { Difficulty } from "../types/gameplay";

export const ADVANCED_SEED_SLOT_ID = "advanced-seed" as const;
export const SAVE_SLOT_IDS = ["slot-1", "slot-2", "slot-3", ADVANCED_SEED_SLOT_ID] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

const SLOT_KEY_PREFIX = "etf-town-save-v2";
const AUTO_SAVE_KEY = "etf-town-autosave-v2";
const LEGACY_SAVE_KEY = "etf-town-save-v1";

export interface SaveSlotSummary {
  id: SaveSlotId;
  label: string;
  exists: boolean;
  month?: number;
  difficulty?: Difficulty;
  marketSeed?: number;
  updatedAt?: number;
  screen?: GameState["screen"];
}

export function getSaveSlotLabel(slotId: SaveSlotId) {
  if (slotId === ADVANCED_SEED_SLOT_ID) return "进阶种子档";
  const index = SAVE_SLOT_IDS.indexOf(slotId);
  return `存档 ${index + 1}`;
}

function getSlotKey(slotId: SaveSlotId) {
  return `${SLOT_KEY_PREFIX}:${slotId}`;
}

export function loadAutoSave() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTO_SAVE_KEY) ?? window.localStorage.getItem(LEGACY_SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<GameState>;
  } catch {
    return null;
  }
}

export function saveAutoSave(gameState: GameState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({ ...gameState, lastSavedAt: Date.now() }));
}

export function clearAutoSave() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTO_SAVE_KEY);
}

export function loadSaveSlot(slotId: SaveSlotId) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getSlotKey(slotId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<GameState>;
  } catch {
    return null;
  }
}

export function saveToSlot(slotId: SaveSlotId, gameState: GameState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getSlotKey(slotId), JSON.stringify({ ...gameState, lastSavedAt: Date.now() }));
}

export function deleteSaveSlot(slotId: SaveSlotId) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getSlotKey(slotId));
}

export function getSaveSlotSummaries(): SaveSlotSummary[] {
  return SAVE_SLOT_IDS.map((id) => {
    const state = loadSaveSlot(id);
    return {
      id,
      label: getSaveSlotLabel(id),
      exists: Boolean(state),
      month: state?.month,
      difficulty: state?.difficulty,
      marketSeed: state?.marketSeed,
      updatedAt: state?.lastSavedAt,
      screen: state?.screen,
    };
  });
}
