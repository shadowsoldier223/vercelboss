"use client";

import { CalendarDays, Crown, Gem, Map, Swords, Trash2, Trophy, type LucideIcon } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Feat, FeatType } from "@/lib/types";

const typeIcons: Record<FeatType, LucideIcon> = {
  Boss: Crown,
  Hunt: Swords,
  Conquista: Trophy,
};

export function RecordCard({
  feat,
  onRemove,
}: {
  feat: Feat;
  onRemove?: (id: string) => void;
}) {
  const Icon = typeIcons[feat.type];

  return (
    <article className="recordCard">
      <div className="recordTop">
        <div className="recordType">
          <Icon size={18} />
          <span>{feat.type}</span>
        </div>
        {onRemove ? (
          <button
            type="button"
            className="iconButton"
            onClick={() => onRemove(feat.id)}
            title="Remover"
          >
            <Trash2 size={17} />
          </button>
        ) : null}
      </div>
      <h3>{feat.title}</h3>
      <div className="meta">
        <span>
          <CalendarDays size={15} />
          {formatDate(feat.date)}
        </span>
        <span>
          <Map size={15} />
          {feat.place || "Local aberto"}
        </span>
      </div>
      <p>{feat.notes || "Sem notas adicionais."}</p>
      <div className="recordFooter">
        <span>{feat.character || "Personagem nao definido"}</span>
        <span>{feat.world || "Mundo nao definido"}</span>
      </div>
      <div className="lootLine">
        <Gem size={16} />
        <span>{feat.loot || "Sem loot registrado"}</span>
      </div>
      <div className="difficulty" aria-label={`Dificuldade ${feat.difficulty}`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={index < feat.difficulty ? "filled" : ""} />
        ))}
      </div>
    </article>
  );
}
