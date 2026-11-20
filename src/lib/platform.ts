import { Capacitor } from "@capacitor/core";

export function isAppEnvironment(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Capacitor native platform (Android APK / iOS)
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {}

  // 2. Direct Android / iOS WebView JavaScript bridge injection
  if ((window as any).androidBridge || (window as any).webkit?.messageHandlers?.bridge) {
    return true;
  }

  // 3. User agent detection for embedded mobile WebViews
  const ua = window.navigator?.userAgent || "";
  if (ua.includes("Capacitor") || ua.includes("RubricaApp") || ua.includes("wv")) {
    return true;
  }

  // 4. URL query params or paths (?app=true, ?mode=app, /app, /login)
  try {
    const search = new URLSearchParams(window.location.search);
    if (search.get("app") === "true" || search.get("mode") === "app" || search.get("platform") === "app") {
      return true;
    }
    if (window.location.pathname === "/app" || window.location.pathname === "/login") {
      return true;
    }
  } catch {}

  // 5. Persistent local app mode override (e.g. tester toggle)
  try {
    if (localStorage.getItem("rubrica_app_mode") === "true") {
      return true;
    }
  } catch {}

  return false;
}
