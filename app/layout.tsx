import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import { AppDataProvider } from "@/lib/useAppData";
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
        <AppDataProvider>
          <main className="appShell">
            <AppNav />
            {children}
          </main>
        </AppDataProvider>
      </body>
    </html>
  );
}
