"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const FEEDBACK_DELAY_MS = 180;

type AdminNavigationFeedbackProps = {
  adminBasePath: string;
};

export function AdminNavigationFeedback({ adminBasePath }: AdminNavigationFeedbackProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const currentLocation = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const clearFeedback = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsPending(false);
    setIsVisible(false);
  }, []);

  const startFeedback = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    setIsPending(true);
    setIsVisible(false);
    timerRef.current = window.setTimeout(() => {
      setIsVisible(true);
      timerRef.current = null;
    }, FEEDBACK_DELAY_MS);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      clearFeedback();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [clearFeedback, currentLocation]);

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

      startFeedback();
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [adminBasePath, startFeedback]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <>
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
    </>
  );
}
