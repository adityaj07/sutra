import type * as SecureStore from "expo-secure-store";

/**
 * Thin SecureStore wrapper. The native module is loaded via dynamic import
 * so modules that only need the *type* (or inject fakes in tests) never pull
 * the native graph at load time. Behavior is identical: async get/set/remove.
 */
async function backend(): Promise<typeof SecureStore> {
  return await import("expo-secure-store");
}

export const secureStorage = {
  get: async (key: string): Promise<string | null> =>
    (await backend()).getItemAsync(key),

  set: async (key: string, value: string): Promise<void> => {
    await (await backend()).setItemAsync(key, value);
  },

  remove: async (key: string): Promise<void> => {
    await (await backend()).deleteItemAsync(key);
  },
};
