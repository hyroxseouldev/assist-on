"use client";

import { useState } from "react";

const TAB_ITEMS = [
  { id: "program-intro", label: "프로그램 소개" },
  { id: "faq", label: "FAQ" },
  { id: "trainer-intro", label: "코치 소개" },
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
    <div className="sticky top-14 z-10 flex justify-start border-b border-zinc-200 bg-white">
      {TAB_ITEMS.map((item) => {
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={
              isActive
                ? "flex h-12 w-fit items-center justify-center border-b-2 border-zinc-900 px-4 text-sm font-semibold text-zinc-900"
                : "flex h-12 w-fit items-center justify-center border-b-2 border-transparent px-4 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            }
            onClick={() => handleMove(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
