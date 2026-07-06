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
      href: "/game",
      label: "Game",
      icon: "🎮",
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
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="fixed bottom-20 right-2 z-50 w-44">
            <div className="space-y-2">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl border px-3 py-2 text-sm shadow-lg backdrop-blur-md transition ${
                    pathname === item.href
                      ? "border-blue-500/40 bg-blue-500/15 text-blue-400 font-semibold"
                      : "border-white/10 bg-[#0f172a]/90 text-zinc-300 hover:bg-[#172033]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0b1220]/90 backdrop-blur-md">
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
