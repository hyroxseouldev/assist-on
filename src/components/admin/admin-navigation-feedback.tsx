"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

const MIN_VISIBLE_MS = 120;

type AdminNavigationContextValue = {
  startNavigation: () => void;
};

const AdminNavigationContext = createContext<AdminNavigationContextValue | null>(null);

type AdminNavigationProviderProps = {
  adminBasePath: string;
  children: ReactNode;
};

export function AdminNavigationProvider({ adminBasePath, children }: AdminNavigationProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const visibleAtRef = useRef<number | null>(null);
  const startedFromLocationRef = useRef<string | null>(null);
  const currentLocation = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const clearFeedback = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    visibleAtRef.current = null;
    startedFromLocationRef.current = null;
    setIsPending(false);
    setIsVisible(false);
  }, []);

  const startNavigation = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    visibleAtRef.current = window.performance.now();
    startedFromLocationRef.current = currentLocation;
    setIsPending(true);
    setIsVisible(true);
  }, [currentLocation]);

  useEffect(() => {
    if (!isPending) {
      return;
    }

    if (startedFromLocationRef.current === currentLocation) {
      return;
    }

    const elapsed = visibleAtRef.current === null ? MIN_VISIBLE_MS : window.performance.now() - visibleAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    hideTimerRef.current = window.setTimeout(() => {
      clearFeedback();
    }, remaining);

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [clearFeedback, currentLocation, isPending]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("aria-disabled") === "true" ||
        anchor.dataset.adminTransition === "false"
      ) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const nextLocation = `${nextUrl.pathname}${nextUrl.search}`;
      const nowLocation = `${currentUrl.pathname}${currentUrl.search}`;

      if (
        nextUrl.origin !== currentUrl.origin ||
        !nextUrl.pathname.startsWith(adminBasePath) ||
        nextLocation === nowLocation
      ) {
        return;
      }

      startNavigation();
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [adminBasePath, startNavigation]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const contextValue = useMemo<AdminNavigationContextValue>(
    () => ({ startNavigation }),
    [startNavigation]
  );

  return (
    <AdminNavigationContext.Provider value={contextValue}>
      {children}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-zinc-200/70" />
        <div className="admin-nav-progress absolute inset-y-0 left-0 w-1/3 rounded-full bg-zinc-900/80" />
      </div>

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-0 z-40 bg-white/45 backdrop-blur-[2px] transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        aria-live="polite"
        className="sr-only"
      >
        {isPending ? "페이지 이동 중" : ""}
      </div>
    </AdminNavigationContext.Provider>
  );
}

export function useAdminNavigation() {
  const context = useContext(AdminNavigationContext);
  const router = useRouter();

  if (!context) {
    throw new Error("useAdminNavigation must be used within AdminNavigationProvider");
  }

  const { startNavigation } = context;

  const push = useCallback(
    (href: string) => {
      startNavigation();
      router.push(href);
    },
    [router, startNavigation]
  );

  const replace = useCallback(
    (href: string) => {
      startNavigation();
      router.replace(href);
    },
    [router, startNavigation]
  );

  return useMemo(
    () => ({ push, replace, startNavigation }),
    [push, replace, startNavigation]
  );
}
