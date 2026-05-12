"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Crown, Gem, Home, LogIn, LogOut, ScrollText, Shield, Swords, UserCog, Users } from "lucide-react";
import { useAppData } from "@/lib/useAppData";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/registrar-hunt", label: "Registrar Hunt", icon: Swords },
  { href: "/registros", label: "Registros", icon: ScrollText },
  { href: "/bosses", label: "Bosses", icon: Crown },
  { href: "/duos", label: "Duos", icon: Users },
  { href: "/loot", label: "Loot", icon: Gem },
  { href: "/estatisticas", label: "Stats", icon: BarChart3 },
];

const adminNavItem = { href: "/admin", label: "Admin", icon: UserCog };

export function AppNav() {
  const pathname = usePathname();
  const { currentUser, isAdmin, logout } = useAppData();

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brandMark">
          <Shield size={22} />
        </span>
        <div>
          <strong>ClosedBoss</strong>
          <span>painel Tibia</span>
        </div>
      </Link>

      <nav className="topnav" aria-label="Navegacao principal">
        {[...navItems, ...(isAdmin ? [adminNavItem] : [])].map((item) => {
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

      <div className="accountBox">
        {currentUser ? (
          <>
            <span className="accountName">{currentUser.username}</span>
            <button type="button" className="navIconButton" onClick={handleLogout} title="Sair">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <Link href="/login" className="loginLink">
            <LogIn size={16} />
            <span>Entrar</span>
          </Link>
        )}
      </div>
    </header>
  );
}
