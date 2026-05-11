"use client";

import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Crown,
  Flame,
  Gem,
  Map,
  Plus,
  ScrollText,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type FeatType = "Boss" | "Hunt" | "Conquista";
type FeatFilter = FeatType | "Todos";

type Feat = {
  id: string;
  type: FeatType;
  title: string;
  character: string;
  world: string;
  date: string;
  place: string;
  loot: string;
  notes: string;
  difficulty: number;
};

const STORAGE_KEY = "tibia-feats";

const starterFeats: Feat[] = [
  {
    id: "sample-1",
    type: "Boss",
    title: "Ferumbras Mortal Shell",
    character: "Meu Knight",
    world: "Quelibra",
    date: "2026-05-11",
    place: "Ferumbras' Ascendant",
    loot: "Hat, rares e muita história",
    notes: "Registrar horário, time e resultado do split.",
    difficulty: 5,
  },
  {
    id: "sample-2",
    type: "Hunt",
    title: "Soulwar duo",
    character: "Meu Paladin",
    world: "Gentebra",
    date: "2026-05-10",
    place: "Ebb and Flow",
    loot: "Profit alto, supplies controlados",
    notes: "Boa rota para repetir com boost.",
    difficulty: 4,
  },
  {
    id: "sample-3",
    type: "Conquista",
    title: "Level 500",
    character: "Meu Sorcerer",
    world: "Descubra",
    date: "2026-05-08",
    place: "Issavi",
    loot: "Screenshot salva",
    notes: "Meta pessoal batida antes do próximo double.",
    difficulty: 3,
  },
];

const typeIcons: Record<FeatType, LucideIcon> = {
  Boss: Crown,
  Hunt: Swords,
  Conquista: Trophy,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(): Omit<Feat, "id"> {
  return {
    type: "Boss",
    title: "",
    character: "",
    world: "",
    date: today(),
    place: "",
    loot: "",
    notes: "",
    difficulty: 3,
  };
}

export default function Home() {
  const [feats, setFeats] = useState<Feat[]>(starterFeats);
  const [form, setForm] = useState(createEmptyForm);
  const [filter, setFilter] = useState<FeatFilter>("Todos");
  const [query, setQuery] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        setFeats(JSON.parse(saved) as Feat[]);
      } catch {
        setFeats(starterFeats);
      }
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feats));
    }
  }, [feats, hasLoaded]);

  const filteredFeats = useMemo(() => {
    return feats
      .filter((feat) => filter === "Todos" || feat.type === filter)
      .filter((feat) => {
        const haystack =
          `${feat.title} ${feat.character} ${feat.world} ${feat.place} ${feat.loot} ${feat.notes}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [feats, filter, query]);

  const stats = useMemo(
    () => ({
      total: feats.length,
      bosses: feats.filter((feat) => feat.type === "Boss").length,
      hunts: feats.filter((feat) => feat.type === "Hunt").length,
      achievements: feats.filter((feat) => feat.type === "Conquista").length,
      loot: feats.filter((feat) => feat.loot.trim()).length,
    }),
    [feats],
  );

  const latestFeat = filteredFeats[0] ?? feats[0];

  const toolCards = [
    {
      title: "Boss Tracker",
      description: "Separe bosses abatidos, sala, data e loot em um histórico próprio.",
      icon: Crown,
      filter: "Boss" as FeatFilter,
      count: stats.bosses,
      tag: "Ativo",
    },
    {
      title: "Hunt Log",
      description: "Guarde rotas, lucro, supplies e observações para repetir a melhor sessão.",
      icon: Swords,
      filter: "Hunt" as FeatFilter,
      count: stats.hunts,
      tag: "Rotas",
    },
    {
      title: "Hall pessoal",
      description: "Marque níveis, quests, charms e metas que merecem ficar na vitrine.",
      icon: Trophy,
      filter: "Conquista" as FeatFilter,
      count: stats.achievements,
      tag: "Novo",
    },
    {
      title: "Indice de loot",
      description: "Encontre rápido os registros que têm resultado, rares ou split anotado.",
      icon: Gem,
      filter: "Todos" as FeatFilter,
      count: stats.loot,
      tag: "Busca",
    },
  ];

  function submitFeat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;

    setFeats((current) => [
      {
        ...form,
        id: crypto.randomUUID(),
      },
      ...current,
    ]);
    setForm(createEmptyForm());
  }

  function removeFeat(id: string) {
    setFeats((current) => current.filter((feat) => feat.id !== id));
  }

  return (
    <main className="appShell">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark">
            <Shield size={22} />
          </span>
          <div>
            <strong>Tibia Feats</strong>
            <span>v0.2 Beta</span>
          </div>
        </div>
        <nav className="topnav" aria-label="Seções principais">
          <a href="#registro">Registro</a>
          <a href="#ferramentas">Ferramentas</a>
          <a href="#historico">Histórico</a>
        </nav>
      </header>

      <section className="intro">
        <div className="introIcon">
          <Sparkles size={32} />
        </div>
        <span className="eyebrow">Central pessoal de MMORPG</span>
        <h1>Registre suas façanhas no Tibia.</h1>
        <p>
          Um painel escuro, direto e organizado para acompanhar bosses, hunts,
          conquistas, loots e próximos objetivos sem virar planilha esquecida.
        </p>
      </section>

      <section className="toolGrid" id="ferramentas" aria-label="Ferramentas rápidas">
        {toolCards.map((tool) => (
          <button
            className={`toolCard ${filter === tool.filter ? "selected" : ""}`}
            key={tool.title}
            type="button"
            onClick={() => setFilter(tool.filter)}
          >
            <div className="toolTop">
              <span className="toolIcon">
                <tool.icon size={24} />
              </span>
              <span className="toolTag">{tool.tag}</span>
            </div>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
            <div className="toolAction">
              <span>{tool.count} registros</span>
              <ArrowRight size={15} />
            </div>
          </button>
        ))}
      </section>

      <section className="workspace">
        <aside className="leftRail" id="registro" aria-label="Novo registro">
          <div className="panel formPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Novo registro</span>
                <h2>Adicionar façanha</h2>
              </div>
              <Plus size={22} />
            </div>

            <form onSubmit={submitFeat} className="entryForm">
              <div className="segmented" aria-label="Tipo">
                {(["Boss", "Hunt", "Conquista"] as FeatType[]).map((type) => {
                  const Icon = typeIcons[type];
                  return (
                    <button
                      type="button"
                      key={type}
                      className={form.type === type ? "active" : ""}
                      onClick={() => setForm((current) => ({ ...current, type }))}
                      title={type}
                    >
                      <Icon size={18} />
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>

              <label>
                Título
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ex: Gaz'Haragoth, Roshamuul, Level 400"
                />
              </label>

              <div className="fieldGrid">
                <label>
                  Personagem
                  <input
                    value={form.character}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        character: event.target.value,
                      }))
                    }
                    placeholder="Nome ou vocação"
                  />
                </label>
                <label>
                  Mundo
                  <input
                    value={form.world}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        world: event.target.value,
                      }))
                    }
                    placeholder="Ex: Gentebra"
                  />
                </label>
              </div>

              <div className="fieldGrid">
                <label>
                  Data
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Dificuldade
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={form.difficulty}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        difficulty: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Local
                <input
                  value={form.place}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      place: event.target.value,
                    }))
                  }
                  placeholder="Respawn, quest, cidade ou boss room"
                />
              </label>

              <label>
                Loot / resultado
                <input
                  value={form.loot}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      loot: event.target.value,
                    }))
                  }
                  placeholder="Profit, rares, charm, achievement..."
                />
              </label>

              <label>
                Notas
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Time, estratégia, próxima meta..."
                />
              </label>

              <button className="submitButton" type="submit">
                <Plus size={18} />
                Registrar
              </button>
            </form>
          </div>

          <div className="featurePreview">
            <Image
              src="/hero-achievements.png"
              alt=""
              fill
              sizes="(max-width: 980px) 100vw, 360px"
              className="featureImage"
            />
            <div className="featureShade" />
            <div className="featureText">
              <span>Último destaque</span>
              <strong>{latestFeat?.title ?? "Nenhum registro ainda"}</strong>
            </div>
          </div>
        </aside>

        <section className="recordsArea" id="historico">
          <div className="statGrid">
            <Stat icon={BarChart3} label="Registros" value={stats.total} />
            <Stat icon={Crown} label="Bosses" value={stats.bosses} />
            <Stat icon={Flame} label="Hunts" value={stats.hunts} />
            <Stat icon={Gem} label="Com loot" value={stats.loot} />
          </div>

          <div className="toolbar">
            <div className="searchBox">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por boss, local, mundo, loot ou nota"
              />
            </div>
            <div className="filterGroup" aria-label="Filtro">
              {(["Todos", "Boss", "Hunt", "Conquista"] as const).map((item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="sectionTitle">
            <div>
              <span className="eyebrow">Histórico</span>
              <h2>{filteredFeats.length} registros encontrados</h2>
            </div>
            <ScrollText size={22} />
          </div>

          <div className="recordList">
            {filteredFeats.map((feat) => {
              const Icon = typeIcons[feat.type];
              return (
                <article className="recordCard" key={feat.id}>
                  <div className="recordTop">
                    <div className="recordType">
                      <Icon size={18} />
                      <span>{feat.type}</span>
                    </div>
                    <button
                      type="button"
                      className="iconButton"
                      onClick={() => removeFeat(feat.id)}
                      title="Remover"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <h3>{feat.title}</h3>
                  <div className="meta">
                    <span>
                      <CalendarDays size={15} />
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }).format(new Date(`${feat.date}T12:00:00`))}
                    </span>
                    <span>
                      <Map size={15} />
                      {feat.place || "Local aberto"}
                    </span>
                  </div>
                  <p>{feat.notes || "Sem notas adicionais."}</p>
                  <div className="recordFooter">
                    <span>{feat.character || "Personagem não definido"}</span>
                    <span>{feat.world || "Mundo não definido"}</span>
                  </div>
                  <div className="lootLine">
                    <Gem size={16} />
                    <span>{feat.loot || "Sem loot registrado"}</span>
                  </div>
                  <div className="difficulty" aria-label={`Dificuldade ${feat.difficulty}`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span
                        key={index}
                        className={index < feat.difficulty ? "filled" : ""}
                      />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="stat">
      <Icon size={20} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
