export type Direction = 'down' | 'up' | 'left' | 'right';

export type EndingType = 'true_rainbow' | 'fake_sleep' | 'fake_sweet_potato' | 'fake_cat';

export interface EndingMeta {
  id: EndingType;
  type: 'true' | 'fake';
  title: string;
  badge: string;
  icon: string;
  image: string;
  desc: string;
  conditionHint: string;
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  desc: string;
  count: number;
  usable?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  giver: string;
  giverIcon: string;
  reward: string;
  completed: boolean;
  progress: number;
  target: number;
  targetHint: string;
}

export interface SaveData {
  version: number;
  timestamp: number;
  saveDateStr: string;
  playerName: string;
  playTimeSeconds: number;
  mapId: string;
  mapName: string;
  playerPos: {
    x: number;
    y: number;
    dir: Direction;
  };
  stats: {
    happiness: number;
    hp: number;
    maxHp: number;
    barks: number;
    sniffs: number;
    wags: number;
    bellyRubs: number;
  };
  inventory: Item[];
  quests: Record<string, Quest>;
  collectedItemIds: string[];
  unlockedEnding: boolean;
  unlockedEndings?: string[];
}

export interface Portal {
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
  targetDir: Direction;
  label: string;
}

export interface DialogChoice {
  label: string;
  actionKey: string;
}

export interface DialogLine {
  speaker: string;
  portrait?: string; // image url or emoji
  text: string;
  sound?: 'bark' | 'sniff' | 'wag' | 'bell' | 'item' | 'fanfare';
  choices?: DialogChoice[];
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  sprite: string; // emoji or sprite key
  dir: Direction;
  dialogs: DialogLine[];
  questIdTrigger?: string;
  questIdComplete?: string;
}

export interface Interactable {
  id: string;
  x: number;
  y: number;
  type: 'bed' | 'water' | 'food' | 'save_crystal' | 'dig_spot' | 'bush' | 'mailbox' | 'chest' | 'tree' | 'giant_basket';
  icon: string;
  name: string;
  reqSniff?: boolean;
  itemRewardId?: string;
  dialogs: DialogLine[];
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  theme: 'indoor' | 'garden' | 'village' | 'forest' | 'rainbow';
  bgImage?: string;
  tiles: number[][]; // 0: walkable, 1: wall/obstacle, 2: water, 3: decorative flower/grass, 4: path
  portals: Portal[];
  npcs: NPC[];
  interactables: Interactable[];
}
