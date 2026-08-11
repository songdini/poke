// Scratch script to simulate 2 player state updates during PvP battle
const TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 }
};

function getTypeMultiplier(attackType, defenderTypes) {
  let mult = 1.0;
  defenderTypes.forEach(defType => {
    if (TYPE_CHART[attackType] && TYPE_CHART[attackType][defType] !== undefined) {
      mult *= TYPE_CHART[attackType][defType];
    }
  });
  return mult;
}

function calculateDamage(attacker, defender, move) {
  const level = 50;
  const movePower = (move?.power && move.power > 0) ? move.power : 75;
  const isSpecial = move?.category === 'special';
  const attackStat = Math.max(1, isSpecial ? (attacker.stats.spAtk || 80) : (attacker.stats.attack || 80));
  const defenseStat = Math.max(1, isSpecial ? (defender.stats.spDef || 80) : (defender.stats.defense || 80));
  const stab = attacker.types?.includes(move?.type) ? 1.5 : 1.0;
  const typeMult = getTypeMultiplier(move?.type || 'normal', defender.types || ['normal']);
  const randomVal = 0.85 + Math.random() * 0.15;
  const isCritical = Math.random() < 0.0625;
  const critMult = isCritical ? 1.5 : 1.0;

  const baseDamage = (((2 * level / 5 + 2) * movePower * (attackStat / defenseStat)) / 50 + 2);
  const calculated = Math.floor(baseDamage * stab * typeMult * critMult * randomVal);
  const totalDamage = isNaN(calculated) || calculated <= 0 ? 25 : Math.max(18, calculated);

  return { damage: totalDamage, typeMult, isCritical };
}

// Simulate User A (Kim) and User B (Park)
const teamA = {
  trainerName: 'Kim',
  activeIndex: 0,
  pokemonList: [
    { id: 25, koreanName: '피카츄', currentHp: 100, maxHp: 100, status: 'normal', types: ['electric'], stats: { hp: 100, attack: 55, defense: 40, spAtk: 50, spDef: 50, speed: 90 }, moves: [{ id: '10만볼트', name: '10만볼트', type: 'electric', category: 'special', power: 90 }] }
  ]
};

const teamB = {
  trainerName: 'Park',
  activeIndex: 0,
  pokemonList: [
    { id: 4, koreanName: '파이리', currentHp: 100, maxHp: 100, status: 'normal', types: ['fire'], stats: { hp: 100, attack: 50, defense: 50, spAtk: 60, spDef: 60, speed: 65 }, moves: [{ id: '화염방사', name: '화염방사', type: 'fire', category: 'special', power: 90 }] }
  ]
};

console.log('=== BEFORE TURN 1 ===');
console.log(`User A (Kim) Active HP: ${teamA.pokemonList[0].currentHp}`);
console.log(`User B (Park) Active HP: ${teamB.pokemonList[0].currentHp}`);

// Simulate turn resolution on User A's client:
// On User A's client: playerTeam is teamA, enemyTeam is teamB
// p1Action is Kim (moveIndex 0), p2Action is Park (moveIndex 0)
const username = 'Kim';
const p1Data = { username: 'Kim', action: { type: 'move', moveIndex: 0 } };
const p2Data = { username: 'Park', action: { type: 'move', moveIndex: 0 } };

const cleanUser = username.trim().toLowerCase();
const myData = p1Data.username.trim().toLowerCase() === cleanUser ? p1Data : p2Data;
const oppData = p1Data.username.trim().toLowerCase() === cleanUser ? p2Data : p1Data;

const playerTeam = JSON.parse(JSON.stringify(teamA));
const enemyTeam = JSON.parse(JSON.stringify(teamB));

const updatedPlayerList = playerTeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));
const updatedEnemyList = enemyTeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));

const pActive = updatedPlayerList[0];
const eActive = updatedEnemyList[0];

// Execute player hit (Kim -> Park)
const moveA = pActive.moves[myData.action.moveIndex];
const resA = calculateDamage(pActive, eActive, moveA);
eActive.currentHp = Math.max(0, eActive.currentHp - resA.damage);
console.log(`\n💥 [Kim Attacks Park] Damage: ${resA.damage}, Park's New HP: ${eActive.currentHp}`);

// Execute opp hit (Park -> Kim)
const moveB = eActive.moves[oppData.action.moveIndex];
const resB = calculateDamage(eActive, pActive, moveB);
pActive.currentHp = Math.max(0, pActive.currentHp - resB.damage);
console.log(`💥 [Park Attacks Kim] Damage: ${resB.damage}, Kim's New HP: ${pActive.currentHp}`);

console.log('\n=== AFTER TURN 1 ===');
console.log(`Kim HP: ${pActive.currentHp} / ${pActive.maxHp}`);
console.log(`Park HP: ${eActive.currentHp} / ${eActive.maxHp}`);
