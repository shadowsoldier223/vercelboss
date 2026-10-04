"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, BarChart3, Camera, Crown, Gem, Sparkles, Swords, Trophy, Users } from "lucide-react";
import { LoginPanel } from "@/components/LoginPanel";
import { RecordCard } from "@/components/RecordCard";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatNumber, formatReleaseAt, formatRemainingTime, formatSignedNumber, isCooldownActive } from "@/lib/format";
import { buildLootSessions, categoryOrder } from "@/lib/lootView";
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
    description: "Gerencie os bosses e registre o loot dos bosses solo.",
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
    title: "Loot",
    description: "Consulte os drops registrados por jogador, boss e historico.",
    icon: Gem,
  },
];

export default function DashboardPage() {
  const { currentUser, data, hasLoaded, isAdmin } = useAppData();
  const lootSessions = useMemo(() => buildLootSessions(data.drops), [data.drops]);
  // Ultimos drops raros (raro, muito raro ou unico), ignorando bonus de boss.
  const recentRare = useMemo(() => {
    return lootSessions
      .flatMap((session) =>
        session.items
          .filter((item) => !item.bonus && categoryOrder(item.category) <= 2)
          .map((item) => ({ ...item, player: session.player, bossName: session.bossName, date: session.date, key: `${session.id}-${item.item}` })),
      )
      .slice(0, 6);
  }, [lootSessions]);
  const recentFeats = data.feats.slice(0, 4);
  const cooldownDuos = data.duos.filter((duo) => isCooldownActive(duo.cooldownUntil));
  const readyDuos = data.duos.length - cooldownDuos.length;
  const visibleHunts = currentUser
    ? isAdmin
      ? data.hunts
      : data.hunts.filter((hunt) => hunt.userId === currentUser.id)
    : [];
  const latestHunt = visibleHunts[0];
  const bestXpHunt = visibleHunts.reduce((best, hunt) => (hunt.experienceHour > (best?.experienceHour ?? 0) ? hunt : best), visibleHunts[0]);
  const visibleBalance = visibleHunts.reduce((total, hunt) => total + hunt.balance, 0);
  const totalImages = visibleHunts.reduce((total, hunt) => total + hunt.images.length, 0);
  const topTags = Array.from(
    visibleHunts
      .flatMap((hunt) => hunt.tags)
      .reduce((map, tag) => map.set(tag, (map.get(tag) ?? 0) + 1), new Map<string, number>())
      .entries(),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (!hasLoaded) {
    return (
      <section className="loginPrompt">
        <span className="eyebrow">Closed</span>
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
          <h1>Closed</h1>
          <p>
            Um painel para transformar o fluxo bruto do bot em telas:
            hunts por usuario, bosses, duos, parser de loot e estatisticas.
          </p>
        </div>
      </section>

      <section className="statGrid">
        <StatCard icon={BarChart3} label="Balance hunts" value={formatSignedNumber(visibleBalance)} />
        <StatCard icon={Swords} label="Hunts registradas" value={visibleHunts.length} />
        <StatCard icon={Camera} label="Prints salvos" value={totalImages} />
        <StatCard icon={Gem} label="Registros de loot" value={lootSessions.length} />
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
              <span className="eyebrow">Resumo</span>
              <h2>Hunts</h2>
            </div>
            <Swords size={22} />
          </div>
          <div className="compactList">
            {latestHunt ? (
              <div className="summaryLine">
                <strong>{latestHunt.title}</strong>
                <span>{`${latestHunt.character} / ${formatDate(latestHunt.date)} / ${formatSignedNumber(latestHunt.balance)}`}</span>
              </div>
            ) : (
              <p className="mutedText">Nenhuma hunt registrada ainda.</p>
            )}
            {bestXpHunt ? (
              <div className="listRow">
                <span>Melhor XP/h</span>
                <strong>{formatNumber(bestXpHunt.experienceHour)}</strong>
              </div>
            ) : null}
            {topTags.length ? (
              <div className="tagList">
                {topTags.map(([tag, total]) => (
                  <span key={tag}>{tag} / {total}</span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

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
                <span>{`${duo.left} + ${duo.right} (${formatReleaseAt(duo.cooldownUntil ?? "")})`}</span>
                <strong>{formatRemainingTime(duo.cooldownUntil)}</strong>
              </div>
            ))}
            {!cooldownDuos.length ? <p className="mutedText">Nenhum duo em cooldown.</p> : null}
          </div>
        </section>
      </section>

      <section className="dashboardGrid">
        <section className="sectionBlock">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Loot</span>
              <h2>Drops raros recentes</h2>
            </div>
            <Gem size={22} />
          </div>
          <div className="compactList">
            {recentRare.map((drop) => (
              <div className="listRow" key={drop.key}>
                <span>{`${formatNumber(drop.quantity)}x ${drop.item} / ${drop.player} (${drop.bossName}, ${formatDate(drop.date)})`}</span>
                <strong>{drop.category}</strong>
              </div>
            ))}
            {!recentRare.length ? <p className="mutedText">Nenhum drop raro registrado ainda.</p> : null}
            <Link href="/loot" className="toolAction">
              <span>Ver todo o loot</span>
              <ArrowRight size={15} />
            </Link>
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
