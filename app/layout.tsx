import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tibia Feats",
  description: "Registro pessoal de bosses, hunts e conquistas no MMORPG Tibia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
