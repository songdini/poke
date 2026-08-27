export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type TetrisItemType = 'bomb' | 'erase' | 'smoke' | 'speed' | 'confusion' | 'shield';

export interface TetrisCell {
  type: TetrominoType | 'garbage';
  item?: TetrisItemType;
}

export type TetrisBoard = (TetrisCell | null)[][];

export type TetrisMode = 'single' | 'ai' | 'pvp';
export type TetrisRule = 'normal' | 'item';
export type TetrisDifficulty = 'easy' | 'normal' | 'hard';
export type TetrisPhase = 'lobby' | 'ready' | 'playing' | 'paused' | 'gameover' | 'victory';

export interface TetrisPiece {
  type: TetrominoType;
  shape: number[][]; // 2D array of 0 and 1
  x: number;
  y: number;
  item?: TetrisItemType;
}

export interface TetrisRankEntry {
  id: string;
  username: string;
  score: number;
  lines: number;
  level: number;
  maxCombo: number;
  date: string;
  rule: TetrisRule;
}

export interface TetrisStats {
  score: number;
  lines: number;
  level: number;
  combo: number;
  maxCombo: number;
  attacksSent: number;
  attacksReceived: number;
}

export interface OpponentState {
  board: (string | null)[][]; // simplified cell representation for transmission
  score: number;
  lines: number;
  level: number;
  isAlive: boolean;
  incomingAttack: number;
  activeItemEffect?: TetrisItemType | null;
}

export interface ItemNotice {
  id: string;
  text: string;
  type: 'gain' | 'use' | 'hit';
  icon: string;
}
