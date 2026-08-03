export type GameType = 'catchmind' | 'mafia' | 'liar' | 'telestrations';

export interface UserData {
  username: string;
  room: string;
  gameType: GameType;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isImage?: boolean;
}

export interface KickVoteState {
  voting: boolean;
  targetUsername: string;
  agreeCount: number;
  totalCount: number;
  voted: string[];
  result?: 'kicked' | 'not_kicked';
}

export type KickVoteUpdatePayload = Pick<KickVoteState, 'targetUsername' | 'agreeCount' | 'totalCount' | 'voted'>;

export interface KickVoteResultPayload {
  targetUsername: string;
  result: NonNullable<KickVoteState['result']>;
}

export interface MafiaPlayer {
  id: string;
  username: string;
  role: 'mafia' | 'citizen' | 'joker';
  isAlive: boolean;
  lives: number;
  isProtected: boolean;
}

export interface MafiaGameMessage {
  id: string;
  type: 'system' | 'player' | 'vote' | 'attack' | 'heal';
  content: string;
  timestamp: Date;
  player?: string;
}

export interface MafiaGameState {
  phase: 'waiting' | 'day' | 'night' | 'voting' | 'mafia-voting' | 'game-over';
  players: MafiaPlayer[];
  currentPlayer: string;
  gameStarted: boolean;
  timeLeft: number;
  selectedPlayer: string | null;
  messages: MafiaGameMessage[];
  winner: string | null;
  voteUsed: boolean;
}

export type MafiaUpdateMessage =
  | { type: 'join'; data: { player?: MafiaPlayer; players?: MafiaPlayer[] } }
  | { type: 'reconnect-sync'; data: { players: MafiaPlayer[]; phase: MafiaGameState['phase']; gameStarted: boolean } }
  | { type: 'leave'; data: { playerId: string } }
  | { type: 'message'; data: MafiaGameMessage }
  | { type: 'game-start'; data: { players: MafiaPlayer[] } }
  | { type: 'vote'; data: { targetId: string; player?: Partial<MafiaPlayer>; message: string } }
  | { type: 'vote-skip'; data: { message: string } }
  | { type: 'attack'; data: { targetId: string | null; player?: Partial<MafiaPlayer> | null; message: string } }
  | { type: 'game-over'; data: { winner: string; message: string } }
  | { type: 'phase-change'; data: { phase: MafiaGameState['phase']; message: string } };

export interface LiarPlayer {
  id: string;
  username: string;
  isHost: boolean;
  isLiar: boolean;
  word: string | null;
  voted?: boolean;
}

export type LiarPhase = 'waiting' | 'starting' | 'word-input' | 'word-distribute' | 'talk' | 'vote' | 'result';

export interface LiarGameResult {
  winner: 'citizens' | 'liar';
  message: string;
  liar: string;
  mostVoted: string;
  word: string;
  liarWord: string;
  voteCount: Record<string, number>;
}

export type LiarUpdate =
  | { type: 'reconnect-sync'; data: { phase?: LiarPhase; players?: LiarPlayer[]; myWord?: string | null; isLiar?: boolean } }
  | { type: 'join' | 'leave' | 'restart'; data: { players: LiarPlayer[]; phase: LiarPhase; host?: string | null; wordProvider?: string | null } }
  | { type: 'game-start'; data?: Record<string, never> }
  | { type: 'word-distribute'; data: { myWord: string | null; isLiar?: boolean; phase?: LiarPhase } }
  | { type: 'talk-start'; data: { phase?: LiarPhase; timer: number } }
  | { type: 'timer-update'; data: { timer: number } }
  | { type: 'message'; data: { username: string; message: string; timestamp: string } }
  | { type: 'vote-start'; data: { phase?: LiarPhase; players: LiarPlayer[] } }
  | { type: 'vote-update'; data: { votedCount: number; totalCount?: number; voteCount: Record<string, number> } }
  | { type: 'result'; data: LiarGameResult };

export interface TelestrationsPlayer {
  id: string;
  username: string;
}

export interface TelestrationsBookPage {
  type: 'word' | 'drawing';
  author: string;
  data: string;
}

export interface TelestrationsBook {
  owner: string;
  pages: TelestrationsBookPage[];
}

export type TelestrationsPhase = 'waiting' | 'word-input' | 'drawing' | 'guessing' | 'results';

export interface TelestrationsUpdatePayload {
  players?: TelestrationsPlayer[];
  hostId?: string;
  phase?: TelestrationsPhase;
  results?: TelestrationsBook[] | null;
  currentBookPage?: TelestrationsBookPage | null;
}
