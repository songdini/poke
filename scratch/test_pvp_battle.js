import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';
const ROOM = 'test_pvp_room';

console.log('🚀 Starting Automated 1v1 PvP Socket Integration Test...');

const s1 = io(SERVER_URL);
const s2 = io(SERVER_URL);

let role1 = '', role2 = '';

s1.on('connect', () => {
  console.log('✅ Socket 1 connected:', s1.id);
  s1.emit('join', { username: 'Tester_A', room: ROOM, gameType: 'pokebattle' });
  s1.emit('pokebattle-join', { room: ROOM });
});

s2.on('connect', () => {
  console.log('✅ Socket 2 connected:', s2.id);
  s2.emit('join', { username: 'Tester_B', room: ROOM, gameType: 'pokebattle' });
  s2.emit('pokebattle-join', { room: ROOM });
});

s1.on('pokebattle-role', ({ role }) => {
  role1 = role;
  console.log(`[Socket 1 Role]: ${role}`);
});

s2.on('pokebattle-role', ({ role }) => {
  role2 = role;
  console.log(`[Socket 2 Role]: ${role}`);
});

s1.on('pokebattle-update', (payload) => {
  console.log('📩 Socket 1 received update:', payload.type, JSON.stringify(payload.data, null, 2));
  if (payload.type === 'sync' && payload.data.phase === 'draft') {
    // Submit draft from Socket 1
    console.log('📤 Socket 1 submitting draft...');
    s1.emit('pokebattle-draft-submit', {
      room: ROOM,
      pokemonList: [
        { id: 1, name: 'bulbasaur', koreanName: '이상해씨', stats: { hp: 100, attack: 50, defense: 50, spAtk: 60, spDef: 60, speed: 45 }, moves: [{ id: '몸통박치기', name: '몸통박치기', type: 'normal', category: 'physical', power: 40 }] },
        { id: 4, name: 'charmander', koreanName: '파이리', stats: { hp: 100, attack: 50, defense: 50, spAtk: 60, spDef: 60, speed: 65 }, moves: [{ id: '화염방사', name: '화염방사', type: 'fire', category: 'special', power: 90 }] },
        { id: 7, name: 'squirtle', koreanName: '꼬부기', stats: { hp: 100, attack: 50, defense: 50, spAtk: 60, spDef: 60, speed: 43 }, moves: [{ id: '물대포', name: '물대포', type: 'water', category: 'special', power: 40 }] }
      ]
    });
  }

  if (payload.type === 'battle-start') {
    console.log('⚔️ Battle Started! Both sockets emitting move action...');
    setTimeout(() => {
      s1.emit('pokebattle-action-submit', { room: ROOM, action: { type: 'move', moveIndex: 0 } });
    }, 500);
  }

  if (payload.type === 'turn-resolved') {
    console.log('🎉 TURN RESOLVED SUCCESSFUL!', payload.data);
    process.exit(0);
  }
});

s2.on('pokebattle-update', (payload) => {
  console.log('📩 Socket 2 received update:', payload.type, JSON.stringify(payload.data, null, 2));
  if (payload.type === 'sync' && payload.data.phase === 'draft') {
    // Submit draft from Socket 2
    console.log('📤 Socket 2 submitting draft...');
    s2.emit('pokebattle-draft-submit', {
      room: ROOM,
      pokemonList: [
        { id: 25, name: 'pikachu', koreanName: '피카츄', stats: { hp: 100, attack: 55, defense: 40, spAtk: 50, spDef: 50, speed: 90 }, moves: [{ id: '10만볼트', name: '10만볼트', type: 'electric', category: 'special', power: 90 }] },
        { id: 143, name: 'snorlax', koreanName: '잠만보', stats: { hp: 160, attack: 110, defense: 65, spAtk: 65, spDef: 110, speed: 30 }, moves: [{ id: '파괴광선', name: '파괴광선', type: 'normal', category: 'special', power: 150 }] },
        { id: 130, name: 'gyarados', koreanName: '갸라도스', stats: { hp: 120, attack: 125, defense: 79, spAtk: 60, spDef: 100, speed: 81 }, moves: [{ id: '하이드로펌프', name: '하이드로펌프', type: 'water', category: 'special', power: 110 }] }
      ]
    });
  }

  if (payload.type === 'battle-start') {
    setTimeout(() => {
      s2.emit('pokebattle-action-submit', { room: ROOM, action: { type: 'move', moveIndex: 0 } });
    }, 500);
  }
});

setTimeout(() => {
  console.error('❌ TEST TIMEOUT! Turn was not resolved in 10 seconds.');
  process.exit(1);
}, 10000);
