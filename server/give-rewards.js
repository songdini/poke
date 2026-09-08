import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data/pokefarm.db');

const username = process.argv[2];

if (!username) {
  console.log('\n🎁 [포켓농장 특별 종합 보상 지급 도구]');
  console.log('사용법: node give-rewards.js [유저아이디]');
  console.log('예시: node give-rewards.js 지우\n');
  console.log('지급 내용:');
  console.log('  - 💰 10,000 코인');
  console.log('  - 🌟 전설알(golden_egg) 50개');
  console.log('  - 🥚 일반알(mystery_egg) 20개');
  console.log('  - 🎒 모든 아이템 각 20개씩 (이상한사탕, 포핀, 황금왕관, 회복약 등)\n');

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
  const user = db.prepare('SELECT username, farm_name, coins, inventory FROM farms WHERE username = ?').get(username);

  if (!user) {
    console.log(`\n❌ [${username}] 유저를 DB에서 찾을 수 없습니다.`);
    const users = db.prepare('SELECT username, farm_name, coins FROM farms').all();
    console.log('📋 현재 등록된 유저 목록:');
    console.table(users);
    process.exit(1);
  }

  let inventory = {};
  try {
    inventory = user.inventory ? JSON.parse(user.inventory) : {};
  } catch (e) {
    inventory = {};
  }

  // 1. 코인 10,000 추가
  const prevCoins = user.coins || 0;
  const newCoins = prevCoins + 10000;

  // 2. 알 수량 누적 추가
  inventory['golden_egg'] = (inventory['golden_egg'] || 0) + 50;
  inventory['mystery_egg'] = (inventory['mystery_egg'] || 0) + 20;

  // 3. 주요 상점/육성 아이템 각 20개씩 누적 추가
  const rewardItems = [
    'oran_berry',   // 오랭열매
    'sitrus_berry', // 자뭉열매
    'poffin_cake',  // 포핀 케이크
    'mild_soap',    // 거품비누
    'fluffy_brush', // 푹신빗
    'toy_ball',     // 몬스터볼 장난감
    'energy_drink', // 비타민 드링크
    'full_heal',    // 만병통치약
    'rare_candy',   // 이상한사탕
    'shiny_stone',  // 반짝이는 원석
    'gold_crown'    // 전설의 황금 왕관
  ];

  rewardItems.forEach(itemId => {
    inventory[itemId] = (inventory[itemId] || 0) + 20;
  });

  const invJson = JSON.stringify(inventory);

  db.prepare(`
    UPDATE farms 
    SET coins = ?, inventory = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE username = ?
  `).run(newCoins, invJson, username);

  console.log(`\n🎉 [보상 지급 완료] ${username} 님에게 특별 종합 보상이 지급되었습니다!`);
  console.log(`💰 코인: ${prevCoins.toLocaleString()} ➔ ${newCoins.toLocaleString()} (+10,000)`);
  console.log(`🌟 전설알: 50개 추가 (현재: ${inventory['golden_egg']}개)`);
  console.log(`🥚 일반알: 20개 추가 (현재: ${inventory['mystery_egg']}개)`);
  console.log(`🎒 전 아이템: 각 20개씩 지급 완료`);
  console.log(`※ 해당 유저에게 브라우저 새로고침(F5)을 안내해주세요.\n`);
} catch (err) {
  console.error('❌ 작업 중 오류 발생:', err.message);
  process.exit(1);
}
