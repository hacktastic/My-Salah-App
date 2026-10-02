import { Capacitor, registerPlugin } from "@capacitor/core";
import type { WidgetSnapshot } from "./widgetSnapshot";

// ios/App/App/WidgetBridgePlugin.swift and
// android/app/src/main/java/com/mysalahapp/app/WidgetBridgePlugin.java
interface WidgetBridgePlugin {
  update(options: { json: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

// A widget failure must never block a salah log, so this function logs errors
// and does not throw them.
export const syncWidget = async (snapshot: WidgetSnapshot | null) => {
  if (!snapshot || !Capacitor.isNativePlatform()) return;

  try {
    await WidgetBridge.update({ json: JSON.stringify(snapshot) });
  } catch (error) {
    console.error("syncWidget failed", error);
  }
};
