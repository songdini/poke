import type { PokemonType } from './pokemon';

export interface EvolutionStage {
  id: number;
  name: string;
  minLevel: number;
  minHappiness: number;
  requiredItem?: string;
  sprite: string;
  showdownSprite: string;
  types: PokemonType[];
}

export interface FarmPokemon {
  uid: string;
  speciesId: number;
  name: string;
  nickname: string;
  stageIndex: number; // 현재 진화 단계 인덱스 (0, 1, 2...)
  level: number;
  exp: number;
  maxExp: number;
  hunger: number; // 0 ~ 100 (배고픔 - 100이 배부름)
  happiness: number; // 0 ~ 100 (친밀도/행복도)
  cleanliness: number; // 0 ~ 100 (청결도)
  energy: number; // 0 ~ 100 (체력/에너지)
  isShiny: boolean;
  types: PokemonType[];
  sprites: {
    front: string;
    showdownFront: string;
  };
  evolutionChain: EvolutionStage[];
  adoptedAt: string;
  graduatedAt?: string;
  isGraduated: boolean;
  totalPats: number;
  jobsCompleted: number;
}

export interface FarmItem {
  id: string;
  name: string;
  icon: string;
  category: 'food' | 'bath' | 'toy' | 'medicine' | 'special';
  description: string;
  price: number;
  effect: {
    hunger?: number;
    happiness?: number;
    cleanliness?: number;
    energy?: number;
    exp?: number;
  };
}

export interface PartTimeJob {
  id: string;
  title: string;
  icon: string;
  desc: string;
  rewardCoins: number;
  expReward: number;
  energyCost: number;
  hungerCost: number;
  cleanlinessCost: number;
  minLevel: number;
  requiredType?: PokemonType;
}

export interface GuestbookEntry {
  id: string;
  author: string;
  message: string;
  timestamp: string;
}

export interface GraduationDiploma {
  id: string;
  pokemonUid: string;
  speciesId: number;
  name: string;
  nickname: string;
  isShiny: boolean;
  sprite: string;
  ownerName: string;
  graduatedAt: string;
  finalLevel: number;
  totalDays: number;
  jobsDone: number;
  title: string;
}

export interface FarmState {
  ownerName: string;
  farmName: string;
  coins: number;
  activePokemon: FarmPokemon | null;
  graduatedPokemon: GraduationDiploma[];
  inventory: Record<string, number>; // itemId -> count
  guestbook: GuestbookEntry[];
  heartsCount: number;
  lastDailyRewardAt?: string;
}
