"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "#intro", label: "소개" },
  { href: "#features", label: "기능" },
  { href: "#partners", label: "파트너" },
  { href: "#contact", label: "문의" },
] as const;

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        isScrolled ? "bg-brand-canvas/85 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="relative text-2xl font-semibold uppercase tracking-brand-max text-brand-foreground">
          clyr
          <span className="absolute -right-3 bottom-1 size-1.5 rounded-full bg-brand-orange" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold tracking-eyebrow-wide text-brand-subtle transition-colors hover:text-brand-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button
            asChild
            appearance="brand-nav" className="h-10"
          >
            <a href="#contact">도입 문의</a>
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          appearance="brand-menu" className="md:hidden"
          onClick={() => setIsOpen((previous) => !previous)}
          aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {isOpen ? (
        <div className="border-t border-white/10 bg-brand-canvas/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex w-full max-w-7xl flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-medium text-brand-foreground"
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
            <Button asChild appearance="brand-mobile" className="mt-2 h-11">
              <a href="#contact" onClick={closeMenu}>
                도입 문의
              </a>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
