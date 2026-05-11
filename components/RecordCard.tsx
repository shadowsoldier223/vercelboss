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
        {feat.place ? (
          <span>
            <Map size={15} />
            {feat.place}
          </span>
        ) : null}
      </div>
      <p>{feat.notes || "Sem notas adicionais."}</p>
      {feat.character || feat.world ? (
        <div className="recordFooter">
          {feat.character ? <span>{feat.character}</span> : null}
          {feat.world ? <span>{feat.world}</span> : null}
        </div>
      ) : null}
      <div className="lootLine">
        <Gem size={16} />
        <span>{feat.loot || "Sem loot registrado"}</span>
      </div>
    </article>
  );
}
