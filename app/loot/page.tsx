"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Gem, Shield, Users } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { normalizeLootItemKey } from "@/lib/lootNames";
import { useAppData } from "@/lib/useAppData";

export default function LootPage() {
  const { currentUser, data } = useAppData();
  const userLoot = useMemo(() => {
    const users = new Map<
      string,
      {
        name: string;
        sessions: Set<string>;
        bosses: Set<string>;
        quantity: number;
        items: Map<string, { item: string; bossName: string; quantity: number }>;
      }
    >();

    for (const drop of data.drops) {
      const name = drop.userName?.trim() || drop.player.trim() || "Usuario nao identificado";
      const userKey = drop.userId || name.toLowerCase();
      const user = users.get(userKey) ?? {
        name,
        sessions: new Set<string>(),
        bosses: new Set<string>(),
        quantity: 0,
        items: new Map(),
      };
      const itemKey = `${drop.bossKey}:${normalizeLootItemKey(drop.item)}`;
      const item = user.items.get(itemKey) ?? {
        item: drop.item,
        bossName: drop.bossName,
        quantity: 0,
      };

      item.quantity += drop.quantity;
      user.items.set(itemKey, item);
      user.sessions.add(drop.createdAt);
      user.bosses.add(drop.bossName);
      user.quantity += drop.quantity;
      users.set(userKey, user);
    }

    return Array.from(users.values())
      .map((user) => ({
        ...user,
        items: Array.from(user.items.values()).sort((a, b) => b.quantity - a.quantity || a.item.localeCompare(b.item)),
      }))
      .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
  }, [data.drops]);

  const totalQuantity = data.drops.reduce((total, drop) => total + drop.quantity, 0);

  if (!currentUser) {
    return (
      <section className="loginPrompt">
        <Shield size={30} />
        <span className="eyebrow">Loot</span>
        <h1>Entre para consultar os loots</h1>
        <p>Os drops registrados ao concluir bosses solo ou duo ficam reunidos aqui.</p>
        <Link href="/login" className="submitButton">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <section className="lootOverview">
      <div className="sectionTitle">
        <div>
          <span className="eyebrow">Registro de loot</span>
          <h1>Totais por usuario</h1>
        </div>
        <Gem size={24} />
      </div>

      <p className="mutedText">
        {`${formatNumber(totalQuantity)} itens registrados em ${data.drops.length} drops. Novos loots sao adicionados ao concluir um boss solo ou duo.`}
      </p>

      <div className="characterLootList">
        {userLoot.map((user) => (
          <article className="characterLootCard" key={user.name}>
            <div className="characterLootHead">
              <div>
                <strong>{user.name}</strong>
                <span>{Array.from(user.bosses).join(", ")}</span>
              </div>
              <div className="characterLootMetrics">
                <span>
                  Sessoes
                  <strong>{user.sessions.size}</strong>
                </span>
                <span>
                  Bosses
                  <strong>{user.bosses.size}</strong>
                </span>
                <span>
                  Total
                  <strong>{formatNumber(user.quantity)}</strong>
                </span>
              </div>
            </div>

            <div className="characterItemList">
              {user.items.map((item) => (
                <div className="characterItemRow" key={`${user.name}-${item.bossName}-${item.item}`}>
                  <div>
                    <strong>{item.item}</strong>
                    <span>{item.bossName}</span>
                  </div>
                  <span>{`${formatNumber(item.quantity)}x`}</span>
                  <em>Registrado</em>
                </div>
              ))}
            </div>
          </article>
        ))}
        {!userLoot.length ? (
          <div className="emptyLootState">
            <Users size={22} />
            <p>Nenhum loot registrado ainda.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
