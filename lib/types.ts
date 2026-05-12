export type FeatType = "Boss" | "Hunt" | "Conquista";
export type DuoStatus = "done" | "fail" | null;
export type UserRole = "admin" | "user";

export type AppUser = {
  id: string;
  username: string;
  password: string;
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
  difficulty: number;
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
  player: string;
  item: string;
  quantity: number;
  category: string;
  createdAt: string;
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
  createdAt: string;
};

export type AppData = {
  feats: Feat[];
  duos: Duo[];
  drops: LootDrop[];
  users: AppUser[];
  hunts: HuntSession[];
};
