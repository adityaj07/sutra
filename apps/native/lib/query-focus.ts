import { focusManager, onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";

export function setupQueryFocus() {
  const subscription = AppState.addEventListener("change", (status) => {
    focusManager.setFocused(status === "active");
  });

  return () => subscription.remove();
}

/**
 * Drives TanStack Query's online state from Expo network status so queries
 * pause offline and resume on reconnect. `isConnected: null` (unknown)
 * assumes online to avoid stalling queries.
 */
export function setupQueryOnline() {
  Network.getNetworkStateAsync()
    .then((state) => {
      onlineManager.setOnline(state.isConnected ?? true);
    })
    .catch(() => {
      // Leave the default (online) on failure.
    });

  const subscription = Network.addNetworkStateListener((state) => {
    onlineManager.setOnline(state.isConnected ?? true);
  });

  return () => subscription.remove();
}
