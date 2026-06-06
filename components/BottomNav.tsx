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
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
          />

          <div className="fixed bottom-16 left-4 right-4 z-50 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-3 text-sm font-semibold text-zinc-400">
              More
            </div>

            <div className="space-y-2">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-4 py-3 ${
                    pathname === item.href
                      ? "bg-zinc-800 text-white"
                      : "bg-zinc-900 text-zinc-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {mainItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 text-xs ${
                  active ? "text-white" : "text-zinc-500"
                }`}
              >
                <span className="text-lg">
                  {item.icon}
                </span>

                <span className="mt-1">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setOpen(!open)}
            className="flex flex-col items-center justify-center py-3 text-xs text-zinc-500"
          >
            <span className="text-lg">☰</span>

            <span className="mt-1">
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
