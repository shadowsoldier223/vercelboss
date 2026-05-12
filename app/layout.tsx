import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Closed",
  description: "Painel simples para bosses, duos, loots e registros de Tibia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="appShell">
          <AppNav />
          {children}
        </main>
      </body>
    </html>
  );
}
