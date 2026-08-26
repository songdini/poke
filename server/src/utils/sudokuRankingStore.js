import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const FILE_PATH = path.join(DATA_DIR, 'sudoku_rankings.json');

const DEFAULT_RANKINGS = {
  easy: [],
  medium: [],
  hard: [],
  expert: [],
  legendary: [],
  god: []
};

// 메모리 캐시
let rankingsCache = null;

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULT_RANKINGS, null, 2), 'utf-8');
      rankingsCache = { ...DEFAULT_RANKINGS };
    }
  } catch (err) {
    console.error('[SudokuRanking] 데이터 디렉토리/파일 생성 오류:', err);
  }
}

export function loadRankings() {
  ensureDataFile();
  if (rankingsCache) return rankingsCache;

  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    rankingsCache = {
      easy: parsed.easy || [],
      medium: parsed.medium || [],
      hard: parsed.hard || [],
      expert: parsed.expert || [],
      legendary: parsed.legendary || [],
      god: parsed.god || []
    };
  } catch (e) {
    console.error('[SudokuRanking] 랭킹 로드 오류, 기본값 복구:', e);
    rankingsCache = { ...DEFAULT_RANKINGS };
  }
  return rankingsCache;
}

function saveRankings() {
  try {
    ensureDataFile();
    fs.writeFileSync(FILE_PATH, JSON.stringify(rankingsCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('[SudokuRanking] 랭킹 저장 실패:', e);
  }
}

/**
 * 랭킹 등록 함수
 * @param {'easy'|'medium'|'hard'|'expert'|'legendary'|'god'} difficulty
 * @param {string} username
 * @param {number} timeSeconds
 * @param {number} hintsUsed
 * @returns {{ isNewRecord: boolean, rank: number | null, rankings: object }}
 */
export function recordSudokuScore(difficulty, username, timeSeconds, hintsUsed = 0) {
  const allRankings = loadRankings();
  const diffKey = allRankings[difficulty] ? difficulty : 'easy';
  const list = allRankings[diffKey] || [];

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newEntry = {
    id: `rank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: username || '익명 플레이어',
    time: Math.max(1, Math.floor(timeSeconds)),
    hintsUsed: hintsUsed || 0,
    date: dateStr
  };

  list.push(newEntry);
  list.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    if (a.hintsUsed !== b.hintsUsed) return a.hintsUsed - b.hintsUsed;
    return a.id.localeCompare(b.id);
  });

  allRankings[diffKey] = list.slice(0, 10);
  rankingsCache = allRankings;
  saveRankings();

  const rankIdx = allRankings[diffKey].findIndex(e => e.id === newEntry.id);
  const rank = rankIdx !== -1 ? rankIdx + 1 : null;

  return {
    isNewRecord: rank !== null,
    rank,
    rankings: allRankings
  };
}
