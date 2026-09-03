import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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
    password_hash TEXT,
    password_salt TEXT,
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

  CREATE TABLE IF NOT EXISTS farm_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_username TEXT NOT NULL,
    visitor_username TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(target_username, visitor_username, visit_date)
  );

  CREATE INDEX IF NOT EXISTS idx_guestbooks_target ON guestbooks(target_username);
  CREATE INDEX IF NOT EXISTS idx_farms_hearts ON farms(hearts_count DESC);
  CREATE INDEX IF NOT EXISTS idx_farm_visits_target ON farm_visits(target_username, visit_date);
`);

// 🛠️ 기존 테이블 컬럼 확장 및 데이터 정합성 보정 (실제 수치 동기화)
try { db.exec('ALTER TABLE farms ADD COLUMN password_hash TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE farms ADD COLUMN password_salt TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE farms ADD COLUMN coins INTEGER DEFAULT 1000'); } catch (e) {}
try { db.exec('ALTER TABLE farms ADD COLUMN inventory TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE farms ADD COLUMN incubating_egg TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE farms ADD COLUMN lottery_state TEXT'); } catch (e) {}

// 🧹 더미 데이터 정화: 실제 1촌 하트 수(`farm_hearts`)로 동기화
try {
  db.exec(`
    UPDATE farms 
    SET hearts_count = (SELECT COUNT(*) FROM farm_hearts WHERE farm_hearts.target_username = farms.username);
  `);
} catch (e) {}

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
// 🔐 비밀번호 암호화 & 인증 시스템 (Password Hashing & Auth)
// =========================================================================

export function hashPassword(password, salt = null) {
  if (!password) return { hash: null, salt: null };
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, useSalt, 64).toString('hex');
  return { hash, salt: useSalt };
}

export function verifyPassword(password, storedHash, storedSalt) {
  if (!storedHash || !storedSalt || !password) return false;
  try {
    const { hash } = hashPassword(password, storedSalt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (e) {
    return false;
  }
}

// 아이디 중복 및 비밀번호 설정 여부 확인
export function checkFarmUserExists(username) {
  if (!username || !username.trim()) return { exists: false };
  const cleanUser = username.trim();
  const row = db.prepare('SELECT username, farm_name, password_hash FROM farms WHERE username = ?').get(cleanUser);
  if (!row) return { exists: false };
  return {
    exists: true,
    username: row.username,
    farmName: row.farm_name,
    hasPassword: !!row.password_hash
  };
}

// 신규 농장 회원가입 & 개설
export function registerFarmUser({ username, password, farmData = {} }) {
  if (!username || !username.trim()) {
    return { success: false, reason: 'invalid_username', message: '아이디(닉네임)를 입력해주세요.' };
  }
  const cleanUser = username.trim();
  if (cleanUser.length < 2 || cleanUser.length > 30) {
    return { success: false, reason: 'invalid_length', message: '아이디는 2자 이상 30자 이하이어야 합니다.' };
  }
  if (!password || password.length < 4) {
    return { success: false, reason: 'invalid_password', message: '비밀번호는 최소 4자 이상이어야 합니다.' };
  }

  // 아이디 중복 검사
  const existing = db.prepare('SELECT username FROM farms WHERE username = ?').get(cleanUser);
  if (existing) {
    return { success: false, reason: 'already_exists', message: '이미 존재하는 농장 아이디입니다. 기존 농장 로그인 탭에서 로그인해 주세요!' };
  }

  const { hash, salt } = hashPassword(password);

  const activePokeStr = farmData.activePokemon ? JSON.stringify(farmData.activePokemon) : null;
  const reservePokeStr = farmData.reservePokemon ? JSON.stringify(farmData.reservePokemon) : '[]';
  const gradPokeStr = farmData.graduatedPokemon ? JSON.stringify(farmData.graduatedPokemon) : '[]';
  const invStr = farmData.inventory ? JSON.stringify(farmData.inventory) : JSON.stringify({ 'item_oran_berry': 5, 'item_bubble_soap': 3, 'item_poke_ball_toy': 2 });
  const eggStr = farmData.incubatingEgg ? JSON.stringify(farmData.incubatingEgg) : null;
  const lotStr = farmData.lotteryState ? JSON.stringify(farmData.lotteryState) : null;
  const stickersStr = farmData.stickers ? JSON.stringify(farmData.stickers) : '[]';
  const placementsStr = farmData.pokemonPlacements ? JSON.stringify(farmData.pokemonPlacements) : '{}';

  const stmt = db.prepare(`
    INSERT INTO farms (
      username, farm_name, password_hash, password_salt, active_pokemon, reserve_pokemon, graduated_pokemon,
      graduated_count, hearts_count, coins, inventory, incubating_egg, lottery_state,
      bg_theme, stickers, pokemon_placements,
      status_msg, bgm_song, today_count, total_count, last_active, updated_at
    ) VALUES (
      @username, @farm_name, @password_hash, @password_salt, @active_pokemon, @reserve_pokemon, @graduated_pokemon,
      @graduated_count, @hearts_count, @coins, @inventory, @incubating_egg, @lottery_state,
      @bg_theme, @stickers, @pokemon_placements,
      @status_msg, @bgm_song, @today_count, @total_count, @last_active, CURRENT_TIMESTAMP
    )
  `);

  stmt.run({
    username: cleanUser,
    farm_name: farmData.farmName || `${cleanUser}님의 포켓농장`,
    password_hash: hash,
    password_salt: salt,
    active_pokemon: activePokeStr,
    reserve_pokemon: reservePokeStr,
    graduated_pokemon: gradPokeStr,
    graduated_count: farmData.graduatedPokemon ? farmData.graduatedPokemon.length : (farmData.graduatedCount || 0),
    hearts_count: 0,
    coins: farmData.coins !== undefined ? farmData.coins : 1500,
    inventory: invStr,
    incubating_egg: eggStr,
    lottery_state: lotStr,
    bg_theme: farmData.bgTheme || 'classic',
    stickers: stickersStr,
    pokemon_placements: placementsStr,
    status_msg: farmData.statusMsg || '오늘도 포켓몬과 함께 즐거운 파밍 🎵 1촌 환영!',
    bgm_song: farmData.bgmSong || '프리스타일 - Y (Feat. 지선)',
    today_count: 1,
    total_count: 1,
    last_active: Date.now()
  });

  recordFarmVisit(cleanUser, cleanUser);
  const farm = getFarm(cleanUser);
  return { success: true, farm, guestbook: [] };
}

// 기존 농장 로그인 및 데이터 로드
export function loginFarmUser({ username, password }) {
  if (!username || !username.trim()) {
    return { success: false, reason: 'invalid_username', message: '농장 아이디(닉네임)를 입력해주세요.' };
  }
  const cleanUser = username.trim();
  const row = db.prepare('SELECT * FROM farms WHERE username = ?').get(cleanUser);
  if (!row) {
    return { success: false, reason: 'user_not_found', message: '존재하지 않는 농장 아이디입니다. 새 농장 개설하기 탭에서 농장을 개설해 보세요!' };
  }

  // 기존 레거시 계정(비밀번호 미설정): 신규 비밀번호 입력 시 자동 등록
  if (!row.password_hash) {
    if (password && password.trim().length >= 4) {
      const { hash, salt } = hashPassword(password.trim());
      db.prepare('UPDATE farms SET password_hash = ?, password_salt = ? WHERE username = ?').run(hash, salt, cleanUser);
    }
  } else {
    // 비밀번호가 설정된 계정: 일치 여부 엄격 검증
    if (!password) {
      return { success: false, reason: 'password_required', message: '농장 비밀번호를 입력해주세요.' };
    }
    const isMatch = verifyPassword(password, row.password_hash, row.password_salt);
    if (!isMatch) {
      return { success: false, reason: 'wrong_password', message: '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.' };
    }
  }

  recordFarmVisit(cleanUser, cleanUser);
  const farm = getFarm(cleanUser);
  const guestbook = getGuestbookEntries(cleanUser, 50);

  return {
    success: true,
    farm,
    guestbook,
    message: `[${cleanUser}]님의 농장 데이터를 성공적으로 불러왔습니다!`
  };
}

// 비밀번호 변경
export function changeFarmPassword({ username, oldPassword, newPassword }) {
  if (!username || !username.trim()) {
    return { success: false, message: '농장 아이디가 올바르지 않습니다.' };
  }
  if (!newPassword || newPassword.length < 4) {
    return { success: false, message: '새 비밀번호는 최소 4자 이상이어야 합니다.' };
  }
  const cleanUser = username.trim();
  const row = db.prepare('SELECT * FROM farms WHERE username = ?').get(cleanUser);
  if (!row) {
    return { success: false, message: '존재하지 않는 농장입니다.' };
  }

  if (row.password_hash && row.password_salt) {
    if (!oldPassword || !verifyPassword(oldPassword, row.password_hash, row.password_salt)) {
      return { success: false, message: '현재 비밀번호가 일치하지 않습니다.' };
    }
  }

  const { hash, salt } = hashPassword(newPassword);
  db.prepare('UPDATE farms SET password_hash = ?, password_salt = ? WHERE username = ?').run(hash, salt, cleanUser);

  return { success: true, message: '농장 비밀번호가 성공적으로 변경되었습니다.' };
}

// =========================================================================
// 🌟 DAO 헬퍼 함수들 (Data Access Operations)
// =========================================================================

// 1. 농장 상태 저장 또는 갱신 (UPSERT)
export function upsertFarm(username, farmData) {
  if (!username || !farmData) return null;
  const cleanUser = username.trim();

  // 실제 DB에 기록된 하트 수 및 마지막 활성 타임스탬프 조회
  const existingHeartCountRow = db.prepare('SELECT COUNT(*) as count FROM farm_hearts WHERE target_username = ?').get(cleanUser);
  const existingFarmRow = db.prepare('SELECT hearts_count, coins, last_active FROM farms WHERE username = ?').get(cleanUser);

  // 🛡️ 다중 기기 세이브 보호: 클라이언트가 보낸 lastActive가 서버의 last_active보다 2초 이상 이전이면 덮어쓰기 거부 (구버전 기기 세이브 역습 차단)
  if (existingFarmRow && existingFarmRow.last_active && farmData.lastActive) {
    if (existingFarmRow.last_active > (farmData.lastActive + 2000)) {
      console.warn(`[SQLite DB] ⚠️ 구버전 데이터 덮어쓰기 방지 작동: ${cleanUser} (DB 최신: ${existingFarmRow.last_active} > 클라이언트: ${farmData.lastActive})`);
      return getFarm(cleanUser);
    }
  }

  const safeHearts = Math.max(
    existingFarmRow ? (existingFarmRow.hearts_count || 0) : 0,
    existingHeartCountRow ? (existingHeartCountRow.count || 0) : 0,
    farmData.heartsCount !== undefined ? farmData.heartsCount : 0
  );

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
      hearts_count = MAX(COALESCE(farms.hearts_count, 0), (SELECT COUNT(*) FROM farm_hearts WHERE farm_hearts.target_username = farms.username), excluded.hearts_count),
      coins = COALESCE(excluded.coins, farms.coins),
      inventory = COALESCE(excluded.inventory, farms.inventory),
      incubating_egg = excluded.incubating_egg,
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

  const currentCoins = farmData.coins !== undefined ? farmData.coins : (existingFarmRow?.coins !== undefined ? existingFarmRow.coins : 1000);

  stmt.run({
    username: cleanUser,
    farm_name: farmData.farmName || `${cleanUser}님의 포켓농장`,
    active_pokemon: activePokeStr,
    reserve_pokemon: reservePokeStr,
    graduated_pokemon: gradPokeStr,
    graduated_count: farmData.graduatedPokemon ? farmData.graduatedPokemon.length : (farmData.graduatedCount || 0),
    hearts_count: safeHearts,
    coins: currentCoins,
    inventory: invStr,
    incubating_egg: eggStr,
    lottery_state: lotStr,
    bg_theme: farmData.bgTheme || 'classic',
    stickers: stickersStr,
    pokemon_placements: placementsStr,
    status_msg: farmData.statusMsg || '',
    bgm_song: farmData.bgmSong || '프리스타일 - Y (Feat. 지선)',
    today_count: farmData.todayCount !== undefined ? farmData.todayCount : 0,
    total_count: farmData.totalCount !== undefined ? farmData.totalCount : 0,
    last_active: farmData.lastActive || Date.now()
  });

  return getFarm(cleanUser);
}

// 2. 한국 표준시(KST) 오늘 날짜 문자열 (YYYY-MM-DD)
export function getTodayDateStringKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 2-1. 특정 농장의 실제 방문자수(TODAY / TOTAL) 조회
export function getFarmVisits(username) {
  if (!username) return { todayCount: 0, totalCount: 0 };
  const cleanUser = username.trim();
  const todayStr = getTodayDateStringKST();

  const todayRow = db.prepare('SELECT COUNT(*) as count FROM farm_visits WHERE target_username = ? AND visit_date = ?').get(cleanUser, todayStr);
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM farm_visits WHERE target_username = ?').get(cleanUser);

  return {
    todayCount: todayRow ? (todayRow.count || 0) : 0,
    totalCount: totalRow ? (totalRow.count || 0) : 0
  };
}

// 2-2. 미니홈피 실제 방문 기록 (당일 1인 1회 고유 누적)
export function recordFarmVisit(targetUsername, visitorUsername) {
  if (!targetUsername) return { todayCount: 0, totalCount: 0 };
  const cleanTarget = targetUsername.trim();
  const cleanVisitor = (visitorUsername || '익명').trim();
  const todayStr = getTodayDateStringKST();

  try {
    // 당일 중복 방문 방지 (UNIQUE(target_username, visitor_username, visit_date))
    db.prepare(`
      INSERT OR IGNORE INTO farm_visits (target_username, visitor_username, visit_date)
      VALUES (?, ?, ?)
    `).run(cleanTarget, cleanVisitor, todayStr);

    const visits = getFarmVisits(cleanTarget);

    // farms 테이블에 최신 방문수 동기화
    db.prepare('UPDATE farms SET today_count = ?, total_count = ? WHERE username = ?')
      .run(visits.todayCount, visits.totalCount, cleanTarget);

    return visits;
  } catch (e) {
    console.error('[SQLite DB] recordFarmVisit error:', e);
    return getFarmVisits(cleanTarget);
  }
}

// 2-3. 단일 농장 전체 정보 조회 (실제 하트 및 실제 방문수 적용)
export function getFarm(username) {
  if (!username) return null;
  const cleanUser = username.trim();
  const row = db.prepare('SELECT * FROM farms WHERE username = ?').get(cleanUser);
  if (!row) return null;

  const visits = getFarmVisits(cleanUser);
  const heartCountRow = db.prepare('SELECT COUNT(*) as count FROM farm_hearts WHERE target_username = ?').get(cleanUser);
  const realHearts = Math.max(row.hearts_count || 0, heartCountRow ? (heartCountRow.count || 0) : 0);

  const parsed = parseFarmRow(row);
  return {
    ...parsed,
    heartsCount: realHearts,
    todayCount: visits.todayCount,
    totalCount: visits.totalCount
  };
}

// 3. 인기 농장 TOP N 조회 (실제 하트 및 실제 방문수 반영)
export function getPopularFarms(limit = 3) {
  const rows = db.prepare(`
    SELECT *, 
      MAX(COALESCE(hearts_count, 0), (SELECT COUNT(*) FROM farm_hearts WHERE farm_hearts.target_username = farms.username)) as real_hearts 
    FROM farms 
    ORDER BY real_hearts DESC, updated_at DESC 
    LIMIT ?
  `).all(limit);

  return rows.map(row => {
    const parsed = parseFarmRow(row);
    const visits = getFarmVisits(parsed.username);
    return {
      ...parsed,
      heartsCount: row.real_hearts !== undefined ? row.real_hearts : parsed.heartsCount,
      todayCount: visits.todayCount,
      totalCount: visits.totalCount
    };
  });
}

// 4. 전체 이웃 농장 목록 조회 (실제 하트 및 실제 방문수 반영)
export function getAllFarms() {
  const rows = db.prepare(`
    SELECT *, 
      MAX(COALESCE(hearts_count, 0), (SELECT COUNT(*) FROM farm_hearts WHERE farm_hearts.target_username = farms.username)) as real_hearts 
    FROM farms 
    ORDER BY real_hearts DESC, updated_at DESC
  `).all();

  const now = Date.now();
  return rows.map(row => {
    const parsed = parseFarmRow(row);
    const visits = getFarmVisits(parsed.username);
    return {
      ...parsed,
      heartsCount: row.real_hearts !== undefined ? row.real_hearts : parsed.heartsCount,
      todayCount: visits.todayCount,
      totalCount: visits.totalCount,
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

  // 대상 농장 레코드 존재 보장
  const targetFarm = db.prepare('SELECT 1 FROM farms WHERE username = ?').get(cleanTarget);
  if (!targetFarm) {
    upsertFarm(cleanTarget, { farmName: `${cleanTarget}님의 포켓농장` });
  }
  // 발신자 농장 레코드 존재 보장
  const senderFarm = db.prepare('SELECT 1 FROM farms WHERE username = ?').get(cleanSender);
  if (!senderFarm) {
    upsertFarm(cleanSender, { farmName: `${cleanSender}님의 포켓농장` });
  }

  // 3. 하트 로그 기록
  db.prepare('INSERT INTO farm_hearts (target_username, sender_username) VALUES (?, ?)').run(cleanTarget, cleanSender);

  // 4. 대상 농장 하트수 동기화 및 코인 보상 (+100 코인)
  const heartCountRow = db.prepare('SELECT COUNT(*) as count FROM farm_hearts WHERE target_username = ?').get(cleanTarget);
  const realHearts = heartCountRow ? heartCountRow.count : 1;

  db.prepare(`
    UPDATE farms 
    SET hearts_count = MAX(COALESCE(hearts_count, 0) + 1, ?), 
        coins = COALESCE(coins, 1000) + ? 
    WHERE username = ?
  `).run(realHearts, HEART_REWARD_TARGET_COINS, cleanTarget);

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
    heartsCount: targetRow ? targetRow.hearts_count : realHearts,
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
    ownerName: row.username,
    isInitialized: true,
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
