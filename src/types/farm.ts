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
  genCategory?: 'gen1-2' | 'gen3-4' | 'gen5-6' | 'gen7-9' | 'special';
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

export interface ExpeditionArea {
  id: string;
  name: string;
  icon: string;
  desc: string;
  durationSec: number; // 소요 시간 (초)
  minLevel: number;
  energyCost: number;
  hungerCost: number;
  cleanlinessCost: number;
  rewardCoinsMin: number;
  rewardCoinsMax: number;
  rewardExpMin: number;
  rewardExpMax: number;
  dropItems: {
    itemId: string;
    chance: number; // 0.0 ~ 1.0 (확률)
  }[];
}

export interface ExpeditionSession {
  areaId: string;
  startedAt: number;
  durationSec: number;
  areaName: string;
  areaIcon: string;
}

export interface IncubatingEgg {
  id: string;
  name: string;
  icon: string;
  isGolden: boolean;
  progress: number; // 0 ~ 100
  acquiredAt: string;
}

export interface DailyLotteryState {
  lastDate: string; // YYYY-MM-DD
  freeSpinsLeft: number; // 일일 잔여 무료 스핀
  jackpotPool: number; // 사내 누적 잭팟 상금
}

export interface MinihompySticker {
  id: string;
  stickerId: string;
  icon: string;
  label: string;
  x: number; // percentage 0-90
  y: number; // percentage 0-80
}

export interface FarmState {
  ownerName: string;
  farmName: string;
  isInitialized: boolean;
  coins: number;
  activePokemon: FarmPokemon | null;
  reservePokemon: FarmPokemon[]; // 🌟 보육소 목장에 보관된 다른 파트너 포켓몬들
  incubatingEgg?: IncubatingEgg | null; // 🌟 현재 부화기에 품고 있는 알
  graduatedPokemon: GraduationDiploma[];
  inventory: Record<string, number>; // itemId -> count
  guestbook: GuestbookEntry[];
  heartsCount: number;
  bgTheme?: string; // 🏠 두부월드 미니룸 배경 테마 ('classic' | 'pixel' | 'starry' | 'beach' | 'sakura' | 'center')
  stickers?: MinihompySticker[]; // 🎨 미니룸 배치 스티커 리스트
  statusMsg?: string; // 💬 투데이 상태 메시지 ("오늘도 피카츄와 열렙 중! ⚡")
  bgmSong?: string; // 🎵 미니홈피 BGM 곡명
  todayCount?: number; // TODAY 수
  totalCount?: number; // TOTAL 수
  activeExpedition?: ExpeditionSession | null;
  lotteryState?: DailyLotteryState; // 🎰 일일 럭키 사내 복권 상태
  lastDailyRewardAt?: string;
}
