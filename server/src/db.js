import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'pokefarm.db');
const OLD_FARMS_JSON = path.join(DATA_DIR, 'farms.json');
const OLD_GB_JSON = path.join(DATA_DIR, 'farm_guestbooks.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 🗄️ SQLite 데이터베이스 초기화
export const db = new Database(DB_FILE);

// 고성능 WAL 모드 활성화 & 외래키 지원
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 📦 테이블 생성 스키마
db.exec(`
  CREATE TABLE IF NOT EXISTS farms (
    username TEXT PRIMARY KEY,
    farm_name TEXT NOT NULL,
    active_pokemon TEXT,
    reserve_pokemon TEXT,
    graduated_pokemon TEXT,
    graduated_count INTEGER DEFAULT 0,
    hearts_count INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 1000,
    inventory TEXT,
    incubating_egg TEXT,
    lottery_state TEXT,
    bg_theme TEXT DEFAULT 'classic',
    stickers TEXT,
    pokemon_placements TEXT,
    status_msg TEXT DEFAULT '',
    bgm_song TEXT DEFAULT '프리스타일 - Y (Feat. 지선)',
    today_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    last_active INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS guestbooks (
    id TEXT PRIMARY KEY,
    target_username TEXT NOT NULL,
    author TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_username) REFERENCES farms(username) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS farm_hearts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_username TEXT NOT NULL,
    sender_username TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_guestbooks_target ON guestbooks(target_username);
  CREATE INDEX IF NOT EXISTS idx_farms_hearts ON farms(hearts_count DESC);
`);

// 🛠️ 기존 테이블 컬럼 확장 (하위 호환성 보장)
try { db.exec('ALTER TABLE farms ADD COLUMN coins INTEGER DEFAULT 1000'); } catch (e) {}
try { db.exec('ALTER TABLE farms ADD COLUMN inventory TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE farms ADD COLUMN incubating_egg TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE farms ADD COLUMN lottery_state TEXT'); } catch (e) {}

console.log('[SQLite DB] PokéFarm SQLite Database initialized successfully at:', DB_FILE);

// 🔄 기존 JSON 파일 데이터 자동 마이그레이션 (데이터 보존)
function migrateFromOldJsonFiles() {
  try {
    if (fs.existsSync(OLD_FARMS_JSON)) {
      const raw = fs.readFileSync(OLD_FARMS_JSON, 'utf8');
      const parsed = JSON.parse(raw);
      const insertFarmStmt = db.prepare(`
        INSERT OR IGNORE INTO farms (
          username, farm_name, active_pokemon, reserve_pokemon, graduated_pokemon,
          graduated_count, hearts_count, bg_theme, stickers, pokemon_placements,
          status_msg, last_active
        ) VALUES (
          @username, @farm_name, @active_pokemon, @reserve_pokemon, @graduated_pokemon,
          @graduated_count, @hearts_count, @bg_theme, @stickers, @pokemon_placements,
          @status_msg, @last_active
        )
      `);

      for (const [user, data] of Object.entries(parsed)) {
        insertFarmStmt.run({
          username: user,
          farm_name: data.farmName || `${user}님의 포켓농장`,
          active_pokemon: data.activePokemon ? JSON.stringify(data.activePokemon) : null,
          reserve_pokemon: data.reservePokemon ? JSON.stringify(data.reservePokemon) : '[]',
          graduated_pokemon: data.graduatedPokemon ? JSON.stringify(data.graduatedPokemon) : '[]',
          graduated_count: data.graduatedCount || 0,
          hearts_count: data.heartsCount || 0,
          bg_theme: data.bgTheme || 'classic',
          stickers: data.stickers ? JSON.stringify(data.stickers) : '[]',
          pokemon_placements: data.pokemonPlacements ? JSON.stringify(data.pokemonPlacements) : '{}',
          status_msg: data.statusMsg || '',
          last_active: data.lastActive || Date.now()
        });
      }
      console.log('[SQLite DB] Migrated existing farms from farms.json to SQLite.');
    }

    if (fs.existsSync(OLD_GB_JSON)) {
      const rawGb = fs.readFileSync(OLD_GB_JSON, 'utf8');
      const parsedGb = JSON.parse(rawGb);
      const insertGbStmt = db.prepare(`
        INSERT OR IGNORE INTO guestbooks (id, target_username, author, message, timestamp)
        VALUES (@id, @target_username, @author, @message, @timestamp)
      `);

      for (const [targetUser, entries] of Object.entries(parsedGb)) {
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            insertGbStmt.run({
              id: entry.id || `gb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              target_username: targetUser,
              author: entry.author || '익명',
              message: entry.message || '',
              timestamp: entry.timestamp || new Date().toISOString()
            });
          }
        }
      }
      console.log('[SQLite DB] Migrated existing guestbooks to SQLite.');
    }
  } catch (err) {
    console.error('[SQLite DB] Migration from JSON failed:', err);
  }
}

migrateFromOldJsonFiles();

// =========================================================================
// 🌟 DAO 헬퍼 함수들 (Data Access Operations)
// =========================================================================

// 1. 농장 상태 저장 또는 갱신 (UPSERT)
export function upsertFarm(username, farmData) {
  if (!username || !farmData) return null;
  const cleanUser = username.trim();

  const stmt = db.prepare(`
    INSERT INTO farms (
      username, farm_name, active_pokemon, reserve_pokemon, graduated_pokemon,
      graduated_count, hearts_count, coins, inventory, incubating_egg, lottery_state,
      bg_theme, stickers, pokemon_placements,
      status_msg, bgm_song, today_count, total_count, last_active, updated_at
    ) VALUES (
      @username, @farm_name, @active_pokemon, @reserve_pokemon, @graduated_pokemon,
      @graduated_count, @hearts_count, @coins, @inventory, @incubating_egg, @lottery_state,
      @bg_theme, @stickers, @pokemon_placements,
      @status_msg, @bgm_song, @today_count, @total_count, @last_active, CURRENT_TIMESTAMP
    )
    ON CONFLICT(username) DO UPDATE SET
      farm_name = excluded.farm_name,
      active_pokemon = COALESCE(excluded.active_pokemon, farms.active_pokemon),
      reserve_pokemon = COALESCE(excluded.reserve_pokemon, farms.reserve_pokemon),
      graduated_pokemon = COALESCE(excluded.graduated_pokemon, farms.graduated_pokemon),
      graduated_count = COALESCE(excluded.graduated_count, farms.graduated_count),
      hearts_count = COALESCE(excluded.hearts_count, farms.hearts_count),
      coins = COALESCE(excluded.coins, farms.coins),
      inventory = COALESCE(excluded.inventory, farms.inventory),
      incubating_egg = COALESCE(excluded.incubating_egg, farms.incubating_egg),
      lottery_state = COALESCE(excluded.lottery_state, farms.lottery_state),
      bg_theme = COALESCE(excluded.bg_theme, farms.bg_theme),
      stickers = COALESCE(excluded.stickers, farms.stickers),
      pokemon_placements = COALESCE(excluded.pokemon_placements, farms.pokemon_placements),
      status_msg = COALESCE(excluded.status_msg, farms.status_msg),
      bgm_song = COALESCE(excluded.bgm_song, farms.bgm_song),
      today_count = COALESCE(excluded.today_count, farms.today_count),
      total_count = COALESCE(excluded.total_count, farms.total_count),
      last_active = excluded.last_active,
      updated_at = CURRENT_TIMESTAMP
  `);

  const activePokeStr = farmData.activePokemon ? JSON.stringify(farmData.activePokemon) : null;
  const reservePokeStr = farmData.reservePokemon ? JSON.stringify(farmData.reservePokemon) : null;
  const gradPokeStr = farmData.graduatedPokemon ? JSON.stringify(farmData.graduatedPokemon) : null;
  const invStr = farmData.inventory ? JSON.stringify(farmData.inventory) : null;
  const eggStr = farmData.incubatingEgg ? JSON.stringify(farmData.incubatingEgg) : null;
  const lotStr = farmData.lotteryState ? JSON.stringify(farmData.lotteryState) : null;
  const stickersStr = farmData.stickers ? JSON.stringify(farmData.stickers) : null;
  const placementsStr = farmData.pokemonPlacements ? JSON.stringify(farmData.pokemonPlacements) : null;

  stmt.run({
    username: cleanUser,
    farm_name: farmData.farmName || `${cleanUser}님의 포켓농장`,
    active_pokemon: activePokeStr,
    reserve_pokemon: reservePokeStr,
    graduated_pokemon: gradPokeStr,
    graduated_count: farmData.graduatedPokemon ? farmData.graduatedPokemon.length : (farmData.graduatedCount || 0),
    hearts_count: farmData.heartsCount !== undefined ? farmData.heartsCount : 0,
    coins: farmData.coins !== undefined ? farmData.coins : 1000,
    inventory: invStr,
    incubating_egg: eggStr,
    lottery_state: lotStr,
    bg_theme: farmData.bgTheme || 'classic',
    stickers: stickersStr,
    pokemon_placements: placementsStr,
    status_msg: farmData.statusMsg || '',
    bgm_song: farmData.bgmSong || '프리스타일 - Y (Feat. 지선)',
    today_count: farmData.todayCount || 0,
    total_count: farmData.totalCount || 0,
    last_active: Date.now()
  });

  return getFarm(cleanUser);
}

// 2. 단일 농장 전체 정보 조회
export function getFarm(username) {
  if (!username) return null;
  const cleanUser = username.trim();
  const row = db.prepare('SELECT * FROM farms WHERE username = ?').get(cleanUser);
  if (!row) return null;

  return parseFarmRow(row);
}

// 3. 인기 농장 TOP N 조회
export function getPopularFarms(limit = 3) {
  const rows = db.prepare(`
    SELECT * FROM farms 
    ORDER BY hearts_count DESC, updated_at DESC 
    LIMIT ?
  `).all(limit);

  return rows.map(parseFarmRow);
}

// 4. 전체 이웃 농장 목록 조회
export function getAllFarms() {
  const rows = db.prepare(`
    SELECT * FROM farms 
    ORDER BY hearts_count DESC, updated_at DESC
  `).all();

  const now = Date.now();
  return rows.map(row => {
    const parsed = parseFarmRow(row);
    return {
      ...parsed,
      isOnline: (now - (parsed.lastActive || 0)) < 1000 * 60 * 30 // 30분 이내 활성
    };
  });
}

// 5. 1촌 응원 하트 시스템 (하루 5회 제한, 자기 자신 금지, 이웃 및 발신자 코인 보상)
export const DAILY_HEART_LIMIT = 5;
export const HEART_REWARD_TARGET_COINS = 100; // 하트를 선물받은 이웃에게 지급되는 코인
export const HEART_REWARD_SENDER_COINS = 20;  // 하트를 보낸 유저에게 지급되는 보답 코인

export function getTodayHeartCount(senderUsername) {
  if (!senderUsername) return 0;
  const cleanSender = senderUsername.trim();
  const row = db.prepare(`
    SELECT COUNT(*) as count 
    FROM farm_hearts 
    WHERE sender_username = ? 
      AND date(created_at, 'localtime') = date('now', 'localtime')
  `).get(cleanSender);
  return row ? (row.count || 0) : 0;
}

export function sendHeart({ targetUsername, senderUsername }) {
  if (!targetUsername || !senderUsername) {
    return { success: false, reason: 'invalid_args', message: '잘못된 요청입니다.' };
  }
  const cleanTarget = targetUsername.trim();
  const cleanSender = senderUsername.trim();

  // 1. 자기 자신의 농장에는 하트 전송 불가
  if (cleanTarget.toLowerCase() === cleanSender.toLowerCase()) {
    return {
      success: false,
      reason: 'self_heart',
      message: '자신의 농장에는 하트를 보낼 수 없습니다. 이웃 농장에 따뜻한 응원을 전해보세요!'
    };
  }

  // 2. 하루 5회 제한 검사
  const todaySent = getTodayHeartCount(cleanSender);
  if (todaySent >= DAILY_HEART_LIMIT) {
    return {
      success: false,
      reason: 'daily_limit',
      message: `오늘 보낼 수 있는 1촌 응원 하트(${DAILY_HEART_LIMIT}회)를 모두 선물하셨습니다. 내일 다시 응원해 주세요!`,
      todaySent,
      remainingHearts: 0
    };
  }

  // 3. 하트 로그 기록
  db.prepare('INSERT INTO farm_hearts (target_username, sender_username) VALUES (?, ?)').run(cleanTarget, cleanSender);

  // 4. 대상 농장 하트수 증가 (+1) 및 코인 보상 (+100 코인)
  db.prepare(`
    UPDATE farms 
    SET hearts_count = hearts_count + 1, 
        coins = COALESCE(coins, 1000) + ? 
    WHERE username = ?
  `).run(HEART_REWARD_TARGET_COINS, cleanTarget);

  // 5. 하트를 보낸 발신자에게도 보답 코인 지급 (+20 코인)
  db.prepare(`
    UPDATE farms 
    SET coins = COALESCE(coins, 1000) + ? 
    WHERE username = ?
  `).run(HEART_REWARD_SENDER_COINS, cleanSender);

  const targetRow = db.prepare('SELECT hearts_count, coins FROM farms WHERE username = ?').get(cleanTarget);
  const senderRow = db.prepare('SELECT coins FROM farms WHERE username = ?').get(cleanSender);

  const newTodaySent = todaySent + 1;
  const remainingHearts = Math.max(0, DAILY_HEART_LIMIT - newTodaySent);

  return {
    success: true,
    targetUsername: cleanTarget,
    senderUsername: cleanSender,
    heartsCount: targetRow ? targetRow.hearts_count : 0,
    targetCoins: targetRow ? targetRow.coins : 0,
    targetRewardCoins: HEART_REWARD_TARGET_COINS,
    senderRewardCoins: HEART_REWARD_SENDER_COINS,
    senderCoins: senderRow ? senderRow.coins : 0,
    todaySent: newTodaySent,
    remainingHearts
  };
}

// 하위 호환용 헬퍼
export function incrementHearts(targetUsername, senderUsername) {
  const res = sendHeart({ targetUsername, senderUsername });
  return res.heartsCount || 0;
}

// 6. 방명록 작성
export function addGuestbookEntry(targetUsername, author, message) {
  if (!targetUsername || !author || !message) return null;
  const cleanTarget = targetUsername.trim();
  const cleanAuthor = author.trim();
  const cleanMessage = message.trim().slice(0, 150);

  // 농장 레코드 존재 보장
  const farmExists = db.prepare('SELECT 1 FROM farms WHERE username = ?').get(cleanTarget);
  if (!farmExists) {
    upsertFarm(cleanTarget, { farmName: `${cleanTarget}님의 포켓농장` });
  }

  const id = `gb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const timestamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO guestbooks (id, target_username, author, message, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, cleanTarget, cleanAuthor, cleanMessage, timestamp);

  return {
    id,
    author: cleanAuthor,
    message: cleanMessage,
    timestamp
  };
}

// 7. 특정 유저의 방명록 목록 조회
export function getGuestbookEntries(targetUsername, limit = 50) {
  if (!targetUsername) return [];
  const cleanTarget = targetUsername.trim();

  const rows = db.prepare(`
    SELECT * FROM guestbooks 
    WHERE target_username = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(cleanTarget, limit);

  return rows.map(r => ({
    id: r.id,
    author: r.author,
    message: r.message,
    timestamp: r.timestamp
  }));
}

// 8. 방명록 삭제
export function deleteGuestbookEntry(id) {
  if (!id) return false;
  const res = db.prepare('DELETE FROM guestbooks WHERE id = ?').run(id);
  return res.changes > 0;
}

// 📦 행 데이터 파싱 유틸리티
function parseFarmRow(row) {
  return {
    username: row.username,
    farmName: row.farm_name,
    activePokemon: row.active_pokemon ? safeJsonParse(row.active_pokemon, null) : null,
    reservePokemon: row.reserve_pokemon ? safeJsonParse(row.reserve_pokemon, []) : [],
    graduatedPokemon: row.graduated_pokemon ? safeJsonParse(row.graduated_pokemon, []) : [],
    graduatedCount: row.graduated_count || 0,
    heartsCount: row.hearts_count || 0,
    coins: row.coins !== undefined && row.coins !== null ? row.coins : 1000,
    inventory: row.inventory ? safeJsonParse(row.inventory, {}) : {},
    incubatingEgg: row.incubating_egg ? safeJsonParse(row.incubating_egg, null) : null,
    lotteryState: row.lottery_state ? safeJsonParse(row.lottery_state, null) : null,
    bgTheme: row.bg_theme || 'classic',
    stickers: row.stickers ? safeJsonParse(row.stickers, []) : [],
    pokemonPlacements: row.pokemon_placements ? safeJsonParse(row.pokemon_placements, {}) : {},
    statusMsg: row.status_msg || '',
    bgmSong: row.bgm_song || '프리스타일 - Y (Feat. 지선)',
    todayCount: row.today_count || 0,
    totalCount: row.total_count || 0,
    lastActive: row.last_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}
