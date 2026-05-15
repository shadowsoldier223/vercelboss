"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, Crown, Gem, Home, LogIn, LogOut, Swords, UserCog, UserRound, Users } from "lucide-react";
import { useAppData } from "@/lib/useAppData";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/registrar-hunt", label: "Registrar Hunt", icon: Swords },
  { href: "/bosses", label: "Bosses", icon: Crown },
  { href: "/duos", label: "Duos", icon: Users },
  { href: "/loot", label: "Loot", icon: Gem },
  { href: "/estatisticas", label: "Stats", icon: BarChart3 },
  { href: "/perfil", label: "Perfil", icon: UserRound },
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
          <Image src="/closed-mark.svg" alt="" width={42} height={42} className="brandLogo" priority />
        </span>
        <div>
          <strong>Closed</strong>
          <span>painel Tibia</span>
        </div>
      </Link>

      {currentUser ? (
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
      ) : null}

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
