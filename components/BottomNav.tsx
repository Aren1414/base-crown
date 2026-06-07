"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const mainItems = [
    {
      href: "/",
      label: "Home",
      icon: "🏠",
    },
    {
      href: "/spins",
      label: "Spins",
      icon: "🎡",
    },
    {
      href: "/attacks",
      label: "Attacks",
      icon: "⚔️",
    },
    {
      href: "/profile",
      label: "Profile",
      icon: "👤",
    },
  ];

  const moreItems = [
    {
      href: "/relics",
      label: "Relics",
    },
    {
      href: "/quests",
      label: "Quests",
    },
    {
      href: "/shop",
      label: "Shop",
    },
    {
      href: "/leaderboard",
      label: "Leaderboard",
    },
    {
      href: "/about",
      label: "About",
    },
  ];

  return (
    <>
      {open && (
        <div className="fixed bottom-14 left-0 right-0 z-50 px-6">
          <div className="flex flex-col items-center gap-3">
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`text-sm transition ${
                  pathname === item.href
                    ? "text-blue-400 font-semibold"
                    : "text-zinc-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="grid grid-cols-5 px-2 pb-2">
          {mainItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 text-[11px] transition ${
                  active
                    ? "text-blue-400"
                    : "text-zinc-400"
                }`}
              >
                <span className="text-base">
                  {item.icon}
                </span>

                <span className="mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setOpen(!open)}
            className={`flex flex-col items-center justify-center py-2 text-[11px] transition ${
              open
                ? "text-blue-400"
                : "text-zinc-400"
            }`}
          >
            <span className="text-base">☰</span>

            <span className="mt-0.5">
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
