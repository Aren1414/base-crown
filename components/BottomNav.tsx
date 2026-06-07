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
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="fixed bottom-14 left-4 right-4 z-50">
            <div className="rounded-2xl border border-white/10 bg-[#0f172a]/95 backdrop-blur-md p-4 shadow-2xl">
              <div className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
                More
              </div>

              <div className="space-y-2">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block w-full rounded-xl py-3 text-center text-sm transition ${
                      pathname === item.href
                        ? "bg-blue-500/20 text-blue-400 font-semibold"
                        : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
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
