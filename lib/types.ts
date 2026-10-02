export type FeatType = "Boss" | "Hunt" | "Conquista";
export type DuoStatus = "done" | "fail" | null;
export type UserRole = "admin" | "user";

export type LootDefinition = {
  id: string;
  item: string;
  category: string;
  aliases?: string[];
};

export type LootBoss = {
  key: string;
  label: string;
  mode: "duo" | "solo";
  drops: LootDefinition[];
};

export type ParsedDrop = {
  drop: LootDefinition;
  quantity: number;
};

export type AppUser = {
  id: string;
  username: string;
  password?: string;
  passwordHash?: string;
  role: UserRole;
};

export type PublicUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type Feat = {
  id: string;
  type: FeatType;
  title: string;
  character: string;
  world: string;
  date: string;
  place: string;
  loot: string;
  notes: string;
};

export type Duo = {
  id: string;
  left: string;
  right: string;
  status: DuoStatus;
  markedAt: string | null;
  cooldownUntil: string | null;
};

export type LootDrop = {
  id: string;
  bossKey: string;
  bossName: string;
  userId?: string;
  userName?: string;
  player: string;
  item: string;
  quantity: number;
  category: string;
  /** Data informada no registro (YYYY-MM-DD). Drops antigos nao tem. */
  date?: string;
  createdAt: string;
};

export type HuntImage = {
  id: string;
  name: string;
  src: string;
  pathname?: string;
};

export type HuntSession = {
  id: string;
  userId: string;
  userName: string;
  title: string;
  character: string;
  date: string;
  duration: string;
  loot: number;
  supplies: number;
  balance: number;
  damage: number;
  damageHour: number;
  healing: number;
  healingHour: number;
  experience: number;
  experienceHour: number;
  rawExperience: number;
  rawExperienceHour: number;
  rawText: string;
  notes: string;
  images: HuntImage[];
  tags: string[];
  createdAt: string;
};

export type ActivityMeta = {
  label: string;
  value: string;
};

export type ActivityChange = {
  field: string;
  before: string;
  after: string;
};

export type ActivityLog = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  targetId?: string;
  details: string;
  metadata?: ActivityMeta[];
  changes?: ActivityChange[];
  createdAt: string;
};

export type AppData = {
  feats: Feat[];
  duos: Duo[];
  drops: LootDrop[];
  users: AppUser[];
  hunts: HuntSession[];
  lootBosses: LootBoss[];
  activityLogs: ActivityLog[];
};
