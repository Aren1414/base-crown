"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Home" },
    { href: "/spins", label: "Spins" },
    { href: "/attacks", label: "Attacks" },
    { href: "/relics", label: "Relics" },
    { href: "/quests", label: "Quests" },
    { href: "/shop", label: "Shop" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-black">
      <div className="flex overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 text-sm whitespace-nowrap ${
                active ? "text-white" : "text-zinc-500"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
