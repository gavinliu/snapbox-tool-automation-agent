import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const API_KEY_KEY = "automation-agent.api-key";
const MODEL_KEY = "automation-agent.model";

export const DEFAULT_MODEL = "google/gemini-3.5-flash";

type SettingsState = {
  apiKey: string;
  model: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  save: (settings: { apiKey: string; model: string }) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  apiKey: "",
  model: DEFAULT_MODEL,
  hydrated: false,
  hydrate: async () => {
    const [apiKey, model] = await Promise.all([
      SecureStore.getItemAsync(API_KEY_KEY),
      SecureStore.getItemAsync(MODEL_KEY),
    ]);

    set({
      apiKey: apiKey ?? "",
      model: model ?? DEFAULT_MODEL,
      hydrated: true,
    });
  },
  save: async ({ apiKey, model }) => {
    const normalizedModel = model.trim() || DEFAULT_MODEL;
    await Promise.all([
      SecureStore.setItemAsync(API_KEY_KEY, apiKey.trim()),
      SecureStore.setItemAsync(MODEL_KEY, normalizedModel),
    ]);
    set({ apiKey: apiKey.trim(), model: normalizedModel });
  },
}));
