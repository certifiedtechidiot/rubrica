import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { toast } from '@/hooks/use-toast';

export type BackButtonHandler = () => boolean | Promise<boolean>;

const handlers: BackButtonHandler[] = [];
let lastBackPressTime = 0;
let currentNavigateFn: ((to: string) => void) | null = null;
let isInitialized = false;

/**
 * Register a custom handler for hardware/system back button presses.
 * Handlers run in LIFO order (latest registered runs first).
 * If a handler returns true, the back button press is considered consumed.
 * If all handlers return false, the default navigation / double-tap exit logic runs.
 */
export function registerBackButtonHandler(handler: BackButtonHandler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx !== -1) {
      handlers.splice(idx, 1);
    }
  };
}

/**
 * React hook to register a back button handler while a component/modal is mounted or active.
 */
export function useBackButton(handler: BackButtonHandler, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    return registerBackButtonHandler(handler);
  }, [handler, enabled]);
}

/**
 * Set the current router navigation function (e.g. from wouter setLocation)
 */
export function setRouterNavigator(navigate: (to: string) => void) {
  currentNavigateFn = navigate;
}

/**
 * Handle a back button event from native Capacitor or document event.
 */
export async function handleBackButtonPress(): Promise<boolean> {
  // 1. Check all registered custom handlers in LIFO order (e.g. open modals, drawers, subviews)
  for (let i = handlers.length - 1; i >= 0; i--) {
    try {
      const handled = await handlers[i]();
      if (handled) {
        return true;
      }
    } catch (err) {
      console.error('[BackButton] Error in custom handler:', err);
    }
  }

  // 2. No modal or custom handler consumed it — inspect current route
  if (typeof window === 'undefined') return false;

  const pathname = window.location.pathname.replace(/\/$/, '') || '/';

  // If on a sub-route or non-root screen, navigate back up
  if (pathname !== '/') {
    if (pathname.startsWith('/classrooms/')) {
      if (currentNavigateFn) {
        currentNavigateFn('/classrooms');
        return true;
      }
    } else if (pathname.startsWith('/students/')) {
      if (currentNavigateFn) {
        currentNavigateFn('/students');
        return true;
      }
    } else if (['/papers', '/dpps', '/mistakes', '/tutor'].includes(pathname)) {
      if (currentNavigateFn) {
        currentNavigateFn('/');
        return true;
      }
    }

    // Standard sub-pages (classrooms, students, evaluate, admin, privacy, terms, contact)
    if (currentNavigateFn) {
      currentNavigateFn('/');
      return true;
    } else if (window.history.length > 1) {
      window.history.back();
      return true;
    } else {
      window.location.href = '/';
      return true;
    }
  }

  // 3. User is at root '/' with no open modals: Double-tap back to exit
  const now = Date.now();
  if (now - lastBackPressTime < 2000) {
    try {
      await CapApp.exitApp();
    } catch {
      try {
        await CapApp.minimizeApp();
      } catch {}
    }
    return true;
  }

  lastBackPressTime = now;
  toast({
    title: 'Press back again to exit',
    duration: 2000,
  });
  return true;
}

/**
 * Initialize back button listener for Capacitor native app & document event.
 */
export function initBackButtonListener(navigate?: (to: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  if (navigate) currentNavigateFn = navigate;

  if (isInitialized) return () => {};
  isInitialized = true;

  let capHandle: any = null;

  // Register with Capacitor native App plugin
  if (Capacitor.isNativePlatform()) {
    CapApp.addListener('backButton', async () => {
      await handleBackButtonPress();
    }).then((handle) => {
      capHandle = handle;
    }).catch((err) => {
      console.warn('[BackButton] CapApp.addListener error:', err);
    });
  }

  // Also listen for Cordova/Capacitor document backbutton event as fallback
  const onDocumentBackButton = (event: Event) => {
    event.preventDefault();
    handleBackButtonPress();
  };
  document.addEventListener('backbutton', onDocumentBackButton);

  return () => {
    if (capHandle?.remove) capHandle.remove();
    document.removeEventListener('backbutton', onDocumentBackButton);
    isInitialized = false;
  };
}
