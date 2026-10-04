"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, Camera, Shield, Swords, Trophy, UserRound } from "lucide-react";
import { PasswordPanel } from "@/components/PasswordPanel";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatNumber, formatSignedNumber } from "@/lib/format";
import { useAppData } from "@/lib/useAppData";

export default function PerfilPage() {
  const { currentUser, data } = useAppData();

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Perfil</span>
        <h1>Entre para ver seu perfil</h1>
        <p>Seu resumo usa as hunts e prints salvos no painel.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  const hunts = data.hunts.filter((hunt) => hunt.userId === currentUser.id);
  const totalExperience = hunts.reduce((total, hunt) => total + hunt.experience, 0);
  const totalBalance = hunts.reduce((total, hunt) => total + hunt.balance, 0);
  const totalImages = hunts.reduce((total, hunt) => total + hunt.images.length, 0);
  const topTags = Array.from(
    hunts
      .flatMap((hunt) => hunt.tags)
      .reduce((map, tag) => map.set(tag, (map.get(tag) ?? 0) + 1), new Map<string, number>())
      .entries(),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const characterTotals = Array.from(
    hunts
      .reduce((map, hunt) => {
        const entry = map.get(hunt.character) ?? { hunts: 0, balance: 0, xp: 0 };

        entry.hunts += 1;
        entry.balance += hunt.balance;
        entry.xp += hunt.experience;
        map.set(hunt.character, entry);

        return map;
      }, new Map<string, { hunts: number; balance: number; xp: number }>())
      .entries(),
  ).sort((a, b) => b[1].hunts - a[1].hunts);
  const recentImages = hunts.flatMap((hunt) => hunt.images).slice(0, 6);

  return (
    <>
      <section className="pageHeader">
        <span className="eyebrow">Perfil</span>
        <h1>{currentUser.username}</h1>
        <p>Resumo pessoal de hunts, experiencia, balance, prints e tags salvas.</p>
      </section>

      <section className="statGrid">
        <StatCard icon={Swords} label="Hunts" value={hunts.length} />
        <StatCard icon={Trophy} label="XP total" value={formatNumber(totalExperience)} />
        <StatCard icon={BarChart3} label="Balance" value={formatSignedNumber(totalBalance)} />
        <StatCard icon={Camera} label="Prints" value={totalImages} />
      </section>

      <section className="profileGrid">
        <section className="panel sectionBlock">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Chars</span>
              <h2>Personagens usados</h2>
            </div>
            <UserRound size={22} />
          </div>
          <div className="tableList">
            {characterTotals.map(([character, total]) => (
              <div className="tableRow" key={character}>
                <span>{character || currentUser.username}</span>
                <strong>{total.hunts} hunts</strong>
                <em>{formatSignedNumber(total.balance)}</em>
              </div>
            ))}
            {!characterTotals.length ? <p className="mutedText">Ainda nao tem hunts salvas.</p> : null}
          </div>
        </section>

        <section className="panel sectionBlock">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Tags</span>
              <h2>Marcadores frequentes</h2>
            </div>
          </div>
          <div className="tagList">
            {topTags.map(([tag, total]) => (
              <span key={tag}>{tag} / {total}</span>
            ))}
            {!topTags.length ? <p className="mutedText">Use tags nas hunts para montar esse resumo.</p> : null}
          </div>
        </section>
      </section>

      <section className="profileGrid">
        <section className="panel sectionBlock">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Recentes</span>
              <h2>Ultimas hunts</h2>
            </div>
          </div>
          <div className="huntList">
            {hunts.slice(0, 5).map((hunt) => (
              <article className="huntCard compactHunt" key={hunt.id}>
                <strong>{hunt.title}</strong>
                <p>{`${hunt.character} / ${formatDate(hunt.date)}`}</p>
                <div className="huntMetrics">
                  <span>XP/h <strong>{formatNumber(hunt.experienceHour)}</strong></span>
                  <span>Balance <strong>{formatSignedNumber(hunt.balance)}</strong></span>
                </div>
              </article>
            ))}
            {!hunts.length ? <p className="mutedText">Nenhuma hunt registrada ainda.</p> : null}
          </div>
        </section>

        <section className="panel sectionBlock">
          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Prints</span>
              <h2>Galeria recente</h2>
            </div>
          </div>
          <div className="imageGrid savedImages">
            {recentImages.map((image) => (
              <figure className="imageThumb" key={image.id}>
                <Image src={image.src} alt={image.name} width={320} height={180} unoptimized />
              </figure>
            ))}
          </div>
          {!recentImages.length ? <p className="mutedText">Os prints das hunts aparecem aqui.</p> : null}
        </section>
      </section>

      <section className="profileGrid">
        <PasswordPanel />
      </section>
    </>
  );
}
