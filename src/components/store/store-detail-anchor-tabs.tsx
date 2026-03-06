"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const TAB_ITEMS = [
  { id: "program-intro", label: "프로그램 소개" },
  { id: "trainer-intro", label: "트레이너 소개" },
] as const;

export function StoreDetailAnchorTabs() {
  const [activeTab, setActiveTab] = useState<(typeof TAB_ITEMS)[number]["id"]>(TAB_ITEMS[0].id);

  const handleMove = (sectionId: (typeof TAB_ITEMS)[number]["id"]) => {
    const element = document.getElementById(sectionId);
    if (!element) {
      return;
    }

    setActiveTab(sectionId);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-[65px] z-10 flex gap-2 rounded-xl border border-zinc-200 bg-white/90 p-2 backdrop-blur-sm">
      {TAB_ITEMS.map((item) => (
        <Button
          key={item.id}
          type="button"
          variant={activeTab === item.id ? "default" : "ghost"}
          className="h-9 rounded-lg px-4 text-sm"
          onClick={() => handleMove(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
