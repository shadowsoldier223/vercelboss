"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Crown, Gem, Sparkles, Swords, Trophy, Users } from "lucide-react";
import { LoginPanel } from "@/components/LoginPanel";
import { RecordCard } from "@/components/RecordCard";
import { StatCard } from "@/components/StatCard";
import { formatRemainingTime, isCooldownActive } from "@/lib/format";
import { useAppData } from "@/lib/useAppData";

const tools = [
  {
    href: "/registrar-hunt",
    title: "Registrar Hunt",
    description: "Cole o Hunting Analyser e salve a hunt por usuario.",
    icon: Swords,
  },
  {
    href: "/bosses",
    title: "Bosses",
    description: "Cadastre bosses abatidos com personagem, local e loot.",
    icon: Crown,
  },
  {
    href: "/duos",
    title: "Duos",
    description: "Controle duplas, OK, fail e cooldown de 20h.",
    icon: Users,
  },
  {
    href: "/loot",
    title: "Loot parser",
    description: "Cole reward chest e salve os drops por personagem.",
    icon: Gem,
  },
];

export default function DashboardPage() {
  const { currentUser, data, hasLoaded, stats } = useAppData();
  const recentFeats = data.feats.slice(0, 4);
  const cooldownDuos = data.duos.filter((duo) => isCooldownActive(duo.cooldownUntil));
  const readyDuos = data.duos.length - cooldownDuos.length;

  if (!hasLoaded) {
    return (
      <section className="loginPrompt">
        <span className="eyebrow">ClosedBoss</span>
        <h1>Carregando acesso</h1>
      </section>
    );
  }

  if (!currentUser) {
    return <LoginPanel />;
  }

  return (
    <>
      <section className="heroPanel">
        <Image
          src="/hero-achievements.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="heroImage"
        />
        <div className="heroShade" />
        <div className="heroCopy">
          <span className="introIcon">
            <Sparkles size={30} />
          </span>
          <span className="eyebrow">Ferramenta simples e funcional</span>
          <h1>ClosedBoss</h1>
          <p>
            Um painel para transformar o fluxo bruto do bot em telas:
            hunts por usuario, bosses, duos, parser de loot e estatisticas.
          </p>
        </div>
      </section>

      <section className="statGrid">
        <StatCard icon={BarChart3} label="Atividades" value={stats.totalFeats} />
        <StatCard icon={Crown} label="Bosses" value={stats.bosses} />
        <StatCard icon={Swords} label="Hunts registradas" value={stats.registeredHunts} />
        <StatCard icon={Gem} label="Drops salvos" value={stats.drops} />
      </section>

      <section className="toolGrid">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <Link href={tool.href} className="toolCard" key={tool.href}>
              <div className="toolTop">
                <span className="toolIcon">
                  <Icon size={24} />
                </span>
                <span className="toolTag">Abrir</span>
              </div>
              <h2>{tool.title}</h2>
              <p>{tool.description}</p>
              <div className="toolAction">
                <span>Ir para pagina</span>
                <ArrowRight size={15} />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="dashboardGrid">
        <section className="sectionBlock">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Duos</span>
              <h2>Cooldowns</h2>
            </div>
            <Users size={22} />
          </div>
          <div className="compactList">
            <div className="summaryLine">
              <strong>{readyDuos}</strong>
              <span>duos prontos agora</span>
            </div>
            {cooldownDuos.slice(0, 6).map((duo) => (
              <div className="listRow" key={duo.id}>
                <span>{duo.left} + {duo.right}</span>
                <strong>{formatRemainingTime(duo.cooldownUntil)}</strong>
              </div>
            ))}
            {!cooldownDuos.length ? <p className="mutedText">Nenhum duo em cooldown.</p> : null}
          </div>
        </section>

        <section className="sectionBlock">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Ultimos</span>
              <h2>Atividades recentes</h2>
            </div>
            <Trophy size={22} />
          </div>
          <div className="recordList compactRecords">
            {recentFeats.map((feat) => (
              <RecordCard feat={feat} key={feat.id} />
            ))}
          </div>
        </section>
      </section>
    </>
  );
}
