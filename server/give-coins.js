import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data/pokefarm.db');

const username = process.argv[2];
const amount = parseInt(process.argv[3] || '3000', 10);

if (!username) {
  console.log('\n📌 [포켓농장 코인 관리 도구]');
  console.log('사용법: node give-coins.js [유저아이디] [지급할코인]');
  console.log('예시 1: node give-coins.js 지우 3000');
  console.log('예시 2 (기본 3000코인 지급): node give-coins.js 지우\n');
  
  try {
    const db = new Database(dbPath);
    const users = db.prepare('SELECT username, farm_name, coins FROM farms ORDER BY coins DESC').all();
    console.log('📋 현재 등록된 농장 유저 목록:');
    console.table(users);
  } catch (e) {
    console.error('DB 조회 실패:', e.message);
  }
  process.exit(0);
}

try {
  const db = new Database(dbPath);
  const user = db.prepare('SELECT username, farm_name, coins FROM farms WHERE username = ?').get(username);

  if (!user) {
    console.log(`\n❌ [${username}] 유저를 DB에서 찾을 수 없습니다.`);
    const users = db.prepare('SELECT username, farm_name, coins FROM farms').all();
    console.log('📋 현재 등록된 유저 목록:');
    console.table(users);
    process.exit(1);
  }

  const prevCoins = user.coins || 0;
  db.prepare('UPDATE farms SET coins = coins + ? WHERE username = ?').run(amount, username);
  const updated = db.prepare('SELECT username, farm_name, coins FROM farms WHERE username = ?').get(username);

  console.log(`\n🎉 [지급 완료] ${username} 님에게 ${amount.toLocaleString()} 코인을 성공적으로 지급했습니다!`);
  console.log(`💰 변경 내역: ${prevCoins.toLocaleString()} 코인 ➔ ${updated.coins.toLocaleString()} 코인`);
  console.log(`※ 해당 유저가 게임 화면을 열고 있다면 브라우저 새로고침(F5)을 하도록 안내해주세요.\n`);
} catch (err) {
  console.error('❌ 작업 중 오류 발생:', err.message);
  process.exit(1);
}
