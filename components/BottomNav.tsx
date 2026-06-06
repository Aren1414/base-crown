"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    {
      href: "/",
      label: "Home",
      icon: "🏠",
    },
    {
      href: "/spins",
      label: "Play",
      icon: "🎡",
    },
    {
      href: "/attacks",
      label: "Battle",
      icon: "⚔️",
    },
    {
      href: "/profile",
      label: "Profile",
      icon: "👤",
    },
    {
      href: "/about",
      label: "More",
      icon: "☰",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-blue-900/30 bg-slate-950/95 backdrop-blur">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 text-xs transition ${
                active
                  ? "text-blue-400"
                  : "text-slate-400"
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
      </div>
    </nav>
  );
}
