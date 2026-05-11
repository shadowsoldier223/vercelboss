"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Crown, Gem, Home, ScrollText, Shield, Users } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/registros", label: "Registros", icon: ScrollText },
  { href: "/bosses", label: "Bosses", icon: Crown },
  { href: "/duos", label: "Duos", icon: Users },
  { href: "/loot", label: "Loot", icon: Gem },
  { href: "/estatisticas", label: "Stats", icon: BarChart3 },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brandMark">
          <Shield size={22} />
        </span>
        <div>
          <strong>CloseBoss</strong>
          <span>painel Tibia</span>
        </div>
      </Link>

      <nav className="topnav" aria-label="Navegacao principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link href={item.href} className={active ? "active" : ""} key={item.href}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
