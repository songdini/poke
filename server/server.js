import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });


const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://43.201.67.160"], // 실제 도메인 추가
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: ["http://localhost:5173", "http://43.201.67.160"]
}));
app.use(express.json());

// 연결된 사용자들을 저장
const connectedUsers = new Map();

// 투표 상태 저장: { room: { targetUsername: { votes: { [username]: true/false }, total: number } } }
const kickVotes = {};

// 마피아 게임 상태 저장
const mafiaGames = new Map();

// 라이어 게임 상태 저장
const liarGames = new Map();

const generateRandomKoreanWord = (length = 3) => {
  // 한글 초성, 중성, 종성 배열
  const chosung = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  
  const jungsung = [
    'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
    'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
  ];
  
  const jongsung = [
    '', 'ㄱ', 'ㄲ',  'ㄴ', 'ㄷ', 'ㄹ',
     'ㅁ', 'ㅂ', 'ㅅ',
     'ㅇ', 'ㅈ'
  ];

  let word = '';
  
  for (let i = 0; i < length; i++) {
    // 랜덤하게 초성, 중성, 종성 선택
    const cho = chosung[Math.floor(Math.random() * chosung.length)];
    const jung = jungsung[Math.floor(Math.random() * jungsung.length)];
    const jong = jongsung[Math.floor(Math.random() * jongsung.length)];
    
    // 유니코드 계산하여 한글 조합
    const chosungIndex = chosung.indexOf(cho);
    const jungsungIndex = jungsung.indexOf(jung);
    const jongsungIndex = jongsung.indexOf(jong);
    
    const unicode = 0xAC00 + (chosungIndex * 588) + (jungsungIndex * 28) + jongsungIndex;
    word += String.fromCharCode(unicode);
  }
  
  return word;
};



/**
 * 국립국어원 API에서 라이어 게임용 단어 두 개를 가져옵니다.
 * @returns {Promise<{citizenWord: string, liarWord: string}>}
 */
const getLiarGameWords = async () => {
  const API_KEY = process.env.KOREAN_DICT_API_KEY;
  if (!API_KEY) {
    console.error('KOREAN_DICT_API_KEY가 설정되지 않았습니다.');
    return { citizenWord: '사과', liarWord: '오렌지' };
  }

  const MAX_ATTEMPTS = 10;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    let randomCat = 0;
    let randomWord = '';
    try {
      randomCat = Math.floor(Math.random() * 68); // 0 to 67
      randomWord = generateRandomKoreanWord(1);
    
      console.log(`[LiarGame] API 호출 시도 (${i + 1}/${MAX_ATTEMPTS}): cat=${randomCat}`);

      const response = await axios.get('https://opendict.korean.go.kr/api/search', {
        params: {
          key: API_KEY,
          req_type: 'json',
          type1: 'word', //어휘
          target: 1, // 단어
          cat: randomCat,
          num: 300,  // 충분히 가져오기
          start: 1,
          advanced: 'y',
          q:randomWord,
          part: 'word',
          sort:'dict',
          letter_s:2,
          method:'include',
        }
      });

      const items = response.data?.channel?.item;
      if (!items || !Array.isArray(items) || items.length < 2) {
        console.log(response,' / ', API_KEY, '  이 카테고리에는 단어가 없거나 부족합니다.',randomWord);
        continue; // 이 카테고리에는 단어가 없거나 부족합니다.
      }

      // 2~4글자, 한글로만 된 단어 필터링
      const validWords = items
        .map(item => item.word.replace(/\^/g, ''))
        .filter(word => 
          word.length >= 2 && 
          word.length <= 4 && 
          /^[가-힣]+$/.test(word)
        );
      
      if (validWords.length >= 2) {
        const shuffled = validWords.sort(() => 0.5 - Math.random());
        const word1 = shuffled[0];
        const word2 = shuffled[1];

        console.log(`[LiarGame] 단어 선택 성공: [cat:${randomCat}] ${word1}, ${word2}`);
        
        // 시민/라이어 단어 랜덤 배정
        return Math.random() > 0.5
          ? { citizenWord: word1, liarWord: word2 }
          : { citizenWord: word2, liarWord: word1 };
      }
    } catch (error) {
      console.error(`[LiarGame] API 호출 오류 (cat: ${randomCat}):`, error.message);
    }
  }

  // Fallback
  console.warn('[LiarGame] API 단어 가져오기 실패. 폴백 단어를 사용합니다.');
  return { citizenWord: '사과', liarWord: '오렌지' };
};

io.on('connection', (socket) => {
  console.log('사용자가 연결되었습니다:', socket.id);

  // 사용자 입장
  socket.on('join', (userData) => {
    const { username, room, gameType } = userData;

    socket.join(room);
    connectedUsers.set(socket.id, { username, room, gameType });

    // 마피아 게임인 경우
    if (gameType === 'mafia') {
      if (!mafiaGames.has(room)) {
        mafiaGames.set(room, {
          players: [],
          gameStarted: false,
          phase: 'waiting',
          voteUsed: false // 투표 사용 여부 추가
        });
      }

      const game = mafiaGames.get(room);
      const player = {
        id: socket.id,
        username,
        role: 'citizen', // 나중에 배정
        isAlive: true,
        lives: 3,
        isProtected: false,
        jokerAttacked: false // 조커 공격 당한 상태 추가
      };

      game.players.push(player);

      // 모든 클라이언트에게 플레이어 목록 업데이트
      io.to(room).emit('mafia-update', {
        type: 'join',
        data: { player }
      });
    } else if (gameType === 'liar') {
      // 라이어 게임인 경우
      if (!liarGames.has(room)) {
        liarGames.set(room, {
          players: [],
          gameStarted: false,
          phase: 'waiting',
          host: null,
          wordProvider: null,
          word: '',
          liarWord: '',
          liar: null,
          timer: 180,
          votes: {},
          timerInterval: null
        });
      }

      const game = liarGames.get(room);
      const player = {
        id: socket.id,
        username,
        isHost: game.players.length === 0, // 첫 번째 플레이어가 방장
        isLiar: false,
        word: null,
        voted: false
      };

      game.players.push(player);
      
      if (player.isHost) {
        game.host = socket.id;
      }

      // 모든 클라이언트에게 플레이어 목록 업데이트
      io.to(room).emit('liar-update', {
        type: 'join',
        data: { 
          players: game.players,
          phase: game.phase,
          host: game.host,
          wordProvider: game.wordProvider
        }
      });

      console.log(`${username}님이 라이어 게임 ${room}방에 입장했습니다.`);
    } else {
      // 일반 채팅방
      socket.to(room).emit('userJoined', {
        username,
        message: `${username}님이 입장하셨습니다.`,
        timestamp: new Date().toISOString()
      });

      // 현재 방의 사용자 목록 전송
      const roomUsers = Array.from(connectedUsers.values())
          .filter(user => user.room === room)
          .map(user => user.username);

      io.to(room).emit('userList', roomUsers);
    }

    console.log(`${username}님이 ${room}방에 입장했습니다.`);
  });

  // 마피아 게임 메시지 처리
  socket.on('mafia-message', (messageData) => {
    const { room, message } = messageData;
    const user = connectedUsers.get(socket.id);

    if (user && user.gameType === 'mafia') {
      io.to(room).emit('mafia-update', {
        type: 'message',
        data: message
      });
    }
  });

  // 마피아 게임 시작
  socket.on('mafia-game-start', ({ room }) => {
    const game = mafiaGames.get(room);
    if (!game) return;

    // 역할 배정: 마피아 1명, 조커 1명, 나머지 시민
    const shuffled = [...game.players].sort(() => Math.random() - 0.5);
    let mafiaAssigned = false, jokerAssigned = false;

    shuffled.forEach((player, idx) => {
      if (!mafiaAssigned) {
        player.role = 'mafia';
        mafiaAssigned = true;
      } else if (!jokerAssigned) {
        player.role = 'joker';
        jokerAssigned = true;
      } else {
        player.role = 'citizen';
      }
      player.isAlive = true;
      player.lives = 3;
      player.isProtected = false;
      player.jokerAttacked = false; // 조커 공격 당한 상태 초기화
    });

    game.gameStarted = true;
    game.phase = 'day';
    game.voteUsed = false; // 새로운 게임 시작 시 투표 사용 가능

    io.to(room).emit('mafia-update', {
      type: 'game-start',
      data: { players: game.players }
    });
  });

  // 투표 시작: 모든 클라이언트에 팝업 띄우기
  socket.on('mafia-vote-start', ({ room }) => {
    const game = mafiaGames.get(room);
    if (!game || game.voteUsed) return;

    game.votes = [];
    io.to(room).emit('mafia-vote-popup');
  });

  // 마피아 투표 (집계)
  socket.on('mafia-vote', ({ room, targetId, voterId }) => {
    const game = mafiaGames.get(room);
    if (!game || game.voteUsed) return;

    console.log(`투표 수신: ${voterId} -> ${targetId}`);

    // 투표 집계용 votes 배열 추가
    if (!game.votes) game.votes = [];

    // 중복 투표 방지
    const alreadyVoted = game.votes.find(vote => vote.voterId === voterId);
    if (alreadyVoted) {
      console.log(`${voterId}는 이미 투표했습니다.`);
      return;
    }

    game.votes.push({ targetId, voterId });

    // 모든 생존자 투표 시 집계
    const aliveCount = game.players.filter(p => p.isAlive).length;
    console.log(`현재 투표 수: ${game.votes.length}, 생존자 수: ${aliveCount}`);

    if (game.votes.length >= aliveCount) {
      // 집계
      const voteCount = {};
      for (const vote of game.votes) {
        if (!voteCount[vote.targetId]) voteCount[vote.targetId] = 0;
        voteCount[vote.targetId]++;
      }

      // 최다 득표자 찾기
      let max = 0, maxIds = [];
      for (const id in voteCount) {
        if (voteCount[id] > max) {
          max = voteCount[id];
          maxIds = [id];
        } else if (voteCount[id] === max) {
          maxIds.push(id);
        }
      }

      console.log('투표 집계 결과:', voteCount, '최다 득표:', maxIds, '득표수:', max);

      if (maxIds.length === 1 && max > 1) {
        // 다수 득표자 1명
        const targetPlayer = game.players.find(p => p.id === maxIds[0]);
        if (targetPlayer.role === 'joker') {
          game.phase = 'game-over';
          io.to(room).emit('mafia-update', {
            type: 'game-over',
            data: { winner: 'joker', message: `${targetPlayer.username}이(가) 투표받았습니다! 조커의 승리입니다!` }
          });
        } else {
          targetPlayer.lives = Math.max(0, targetPlayer.lives - 1);
          targetPlayer.isAlive = targetPlayer.lives > 0;
          game.voteUsed = true;

          io.to(room).emit('mafia-update', {
            type: 'vote',
            data: {
              targetId: targetPlayer.id,
              player: targetPlayer,
              message: `${targetPlayer.username}이(가) 투표받아 생명이 1 감소했습니다.`
            }
          });

          checkMafiaGameEnd(room);
        }
      } else {
        // 동점 또는 모두 1표씩
        game.voteUsed = true;
        io.to(room).emit('mafia-update', {
          type: 'vote-skip',
          data: { message: '투표 결과: 아무도 지목되지 않았습니다.' }
        });
      }

      game.votes = [];
    }
  });

  // 마피아 공격
  socket.on('mafia-attack', ({ room, targetId }) => {
    const game = mafiaGames.get(room);
    if (!game) return;
    const targetPlayer = game.players.find(p => p.id === targetId);
    if (!targetPlayer) return;

    // 조커가 처음 공격당하는 경우
    if (targetPlayer.role === 'joker' && !targetPlayer.jokerAttacked) {
      // 조커는 죽지 않고, 마피아 중 한 명이 피해를 입음
      targetPlayer.jokerAttacked = true;
      const mafia = game.players.find(p => p.role === 'mafia' && p.isAlive);
      if (mafia) {
        mafia.lives = Math.max(0, mafia.lives - 1);
        mafia.isAlive = mafia.lives > 0;
      }
      io.to(room).emit('mafia-update', {
        type: 'attack',
        data: {
          targetId: mafia ? mafia.id : null,
          player: mafia,
          message: `조커가 마피아에게 공격당했지만, 오히려 마피아가 피해를 입었습니다!`
        }
      });
    } else {
      // 일반 공격 로직
      targetPlayer.lives = Math.max(0, targetPlayer.lives - 1);
      targetPlayer.isAlive = targetPlayer.lives > 0;
      io.to(room).emit('mafia-update', {
        type: 'attack',
        data: {
          targetId,
          player: targetPlayer,
          message: `${targetPlayer.username}이(가) 마피아의 공격을 받았습니다.`
        }
      });
    }

    // 밤이 끝나고 낮으로 전환
    game.phase = 'day';
    game.voteUsed = false;

    setTimeout(() => {
      io.to(room).emit('mafia-update', {
        type: 'phase-change',
        data: {
          phase: 'day',
          message: '밤이 끝나고 낮이 되었습니다! 모두 대화하고 투표하세요.'
        }
      });
      checkMafiaGameEnd(room);
    }, 1000);
  });

  // 라이어 게임 시작
  socket.on('liar-game-start', async ({ room }) => {
    const game = liarGames.get(room);
    if (!game || game.gameStarted) return;

    const user = connectedUsers.get(socket.id);
    if (!user || game.host !== socket.id) return; // 방장만 시작 가능

    if (game.players.length < 3) {
      socket.emit('liar-error', { message: '최소 3명이 필요합니다.' });
      return;
    }

    console.log(`[LiarGame] '${room}' 방에서 게임 시작 요청...`);

    try {
      const { citizenWord, liarWord } = await getLiarGameWords();

      game.word = citizenWord;
      game.liarWord = liarWord;

      // 라이어를 랜덤으로 선정
      const randomLiar = game.players[Math.floor(Math.random() * game.players.length)];
      game.liar = randomLiar.id;

      // 각 플레이어에게 제시어 배분
      game.players.forEach(player => {
        if (player.id === game.liar) {
          player.isLiar = true;
          player.word = game.liarWord;
        } else {
          player.word = game.word;
        }
      });

      game.gameStarted = true;
      game.phase = 'word-distribute';

      // 각 플레이어에게 개별적으로 제시어 전송
      game.players.forEach(player => {
        io.to(player.id).emit('liar-update', {
          type: 'word-distribute',
          data: {
            phase: 'word-distribute',
            myWord: player.word,
            isLiar: player.isLiar
          }
        });
      });

      console.log(`라이어 게임 시작: 제시어=${citizenWord}, 라이어 제시어=${liarWord}`);

      // 3초 후 대화 단계로 전환
      setTimeout(() => {
        startTalkPhase(room);
      }, 3000);

    } catch (error) {
      console.error('라이어 게임 시작 실패:', error);
      socket.emit('liar-error', { message: '게임 시작 중 오류가 발생했습니다.' });
    }
  });

  // 대화 단계 시작
  function startTalkPhase(room) {
    const game = liarGames.get(room);
    if (!game) return;

    game.phase = 'talk';
    game.timer = 180; // 3분

    io.to(room).emit('liar-update', {
      type: 'talk-start',
      data: {
        phase: 'talk',
        timer: game.timer
      }
    });

    // 타이머 시작
    game.timerInterval = setInterval(() => {
      game.timer--;
      
      io.to(room).emit('liar-update', {
        type: 'timer-update',
        data: { timer: game.timer }
      });

      if (game.timer <= 0) {
        clearInterval(game.timerInterval);
        startVotePhase(room);
      }
    }, 1000);
  }

  // 투표 단계 시작
  function startVotePhase(room) {
    const game = liarGames.get(room);
    if (!game) return;

    game.phase = 'vote';
    game.votes = {};

    io.to(room).emit('liar-update', {
      type: 'vote-start',
      data: {
        phase: 'vote',
        players: game.players
      }
    });
  }

  // 라이어 게임 메시지 처리
  socket.on('liar-message', (messageData) => {
    const { room, message } = messageData;
    const user = connectedUsers.get(socket.id);
    const game = liarGames.get(room);

    if (user && user.gameType === 'liar' && game && game.phase === 'talk') {
      io.to(room).emit('liar-update', {
        type: 'message',
        data: {
          username: user.username,
          message,
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // 투표 처리
  socket.on('liar-vote', ({ room, targetId }) => {
    const game = liarGames.get(room);
    if (!game || game.phase !== 'vote') return;

    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // 중복 투표 방지
    if (game.votes[socket.id]) return;

    game.votes[socket.id] = targetId;

    // 투표 현황 브로드캐스트
    const voteCount = {};
    Object.values(game.votes).forEach(vote => {
      voteCount[vote] = (voteCount[vote] || 0) + 1;
    });

    io.to(room).emit('liar-update', {
      type: 'vote-update',
      data: {
        votedCount: Object.keys(game.votes).length,
        totalCount: game.players.length,
        voteCount
      }
    });

    // 모든 플레이어가 투표했으면 결과 공개
    if (Object.keys(game.votes).length >= game.players.length) {
      showLiarResult(room);
    }
  });

  // 결과 공개
  function showLiarResult(room) {
    const game = liarGames.get(room);
    if (!game) return;

    // 투표 집계
    const voteCount = {};
    Object.values(game.votes).forEach(vote => {
      voteCount[vote] = (voteCount[vote] || 0) + 1;
    });

    // 최다 득표자 찾기
    let maxVotes = 0;
    let mostVotedId = null;
    Object.entries(voteCount).forEach(([playerId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        mostVotedId = playerId;
      }
    });

    const liarPlayer = game.players.find(p => p.id === game.liar);
    const mostVotedPlayer = game.players.find(p => p.id === mostVotedId);

    let winner = '';
    let message = '';

    if (mostVotedId === game.liar) {
      winner = 'citizens';
      message = `라이어 ${liarPlayer?.username}을(를) 찾아냈습니다! 시민들의 승리입니다!`;
    } else {
      winner = 'liar';
      message = `라이어 ${liarPlayer?.username}이(가) 숨었습니다! 라이어의 승리입니다!`;
    }

    game.phase = 'result';

    io.to(room).emit('liar-update', {
      type: 'result',
      data: {
        phase: 'result',
        winner,
        message,
        liar: liarPlayer?.username,
        mostVoted: mostVotedPlayer?.username,
        word: game.word,
        liarWord: game.liarWord,
        voteCount
      }
    });
  }

  // 라이어 게임 재시작
  socket.on('liar-game-restart', ({ room }) => {
    const game = liarGames.get(room);
    if (!game) return;

    const user = connectedUsers.get(socket.id);
    if (!user || game.host !== socket.id) return; // 방장만 재시작 가능

    // 게임 상태 초기화
    if (game.timerInterval) {
      clearInterval(game.timerInterval);
    }

    game.gameStarted = false;
    game.phase = 'waiting';
    game.wordProvider = null;
    game.word = '';
    game.liarWord = '';
    game.liar = null;
    game.timer = 180;
    game.votes = {};
    game.timerInterval = null;

    // 플레이어 상태 초기화
    game.players.forEach(player => {
      player.isLiar = false;
      player.word = null;
      player.voted = false;
    });

    io.to(room).emit('liar-update', {
      type: 'restart',
      data: {
        phase: 'waiting',
        players: game.players,
        host: game.host,
        wordProvider: game.wordProvider
      }
    });
  });

  // 메시지 전송
  socket.on('sendMessage', (messageData) => {
    const { message, room, isImage } = messageData;
    const user = connectedUsers.get(socket.id);

    if (user) {
      const messageObj = {
        username: user.username,
        message,
        timestamp: new Date().toISOString(),
        id: socket.id,
        isImage: !!isImage
      };

      io.to(room).emit('newMessage', messageObj);
      console.log(`${user.username}: ${isImage ? '[이미지]' : message}`);
    }
  });

  // 타이핑 상태
  socket.on('typing', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(data.room).emit('userTyping', {
        username: user.username,
        isTyping: data.isTyping
      });
    }
  });

  // 강퇴 투표 요청
  socket.on('kickVoteRequest', ({ targetUsername, room }) => {
    if (!kickVotes[room]) kickVotes[room] = {};
    if (!kickVotes[room][targetUsername]) {
      kickVotes[room][targetUsername] = { votes: {}, total: 0 };
    }
    // 투표 초기화
    kickVotes[room][targetUsername] = { votes: {}, total: 0 };
    // 방 전체에 투표 요청
    io.to(room).emit('kickVoteStart', { targetUsername });
  });

  // 강퇴 투표 응답
  socket.on('kickVote', ({ targetUsername, room, agree, username }) => {
    if (!kickVotes[room] || !kickVotes[room][targetUsername]) return;
    kickVotes[room][targetUsername].votes[username] = agree;
    kickVotes[room][targetUsername].total++;
    // 방의 전체 인원 수
    const roomUsers = Array.from(connectedUsers.values()).filter(u => u.room === room);
    // 투표 결과 집계
    const agreeCount = Object.values(kickVotes[room][targetUsername].votes).filter(v => v).length;
    const totalCount = roomUsers.length;
    // 실시간 투표 현황 브로드캐스트
    io.to(room).emit('kickVoteUpdate', {
      targetUsername,
      agreeCount,
      totalCount,
      voted: Object.keys(kickVotes[room][targetUsername].votes)
    });
    // 모든 인원이 투표를 마치면 결과 처리
    if (Object.keys(kickVotes[room][targetUsername].votes).length >= totalCount - 1) { // 본인 제외
      if (agreeCount > (totalCount - 1) / 2) {
        // 과반수 찬성 → 강퇴
        for (const [id, user] of connectedUsers.entries()) {
          if (user.username === targetUsername && user.room === room) {
            io.to(id).emit('kicked');
            io.to(room).emit('kickVoteResult', { targetUsername, result: 'kicked' });
            io.sockets.sockets.get(id)?.disconnect();
            break;
          }
        }
      } else {
        // 강퇴 실패
        io.to(room).emit('kickVoteResult', { targetUsername, result: 'not_kicked' });
      }
      // 투표 상태 초기화
      delete kickVotes[room][targetUsername];
    }
  });

  // 강퇴 이벤트 처리
  socket.on('kick', ({ targetUsername, room }) => {
    // 해당 방의 소켓들 중에서 username이 targetUsername인 소켓을 찾음
    for (const [id, user] of connectedUsers.entries()) {
      if (user.username === targetUsername && user.room === room) {
        io.to(id).emit('kicked');
        io.sockets.sockets.get(id)?.disconnect();
        break;
      }
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // 마피아 게임인 경우
      if (user.gameType === 'mafia') {
        const game = mafiaGames.get(user.room);
        if (game) {
          game.players = game.players.filter(p => p.id !== socket.id);

          io.to(user.room).emit('mafia-update', {
            type: 'leave',
            data: { playerId: socket.id }
          });
        }
      } else if (user.gameType === 'liar') {
        // 라이어 게임인 경우
        const game = liarGames.get(user.room);
        if (game) {
          // 타이머 정리
          if (game.timerInterval) {
            clearInterval(game.timerInterval);
          }

          game.players = game.players.filter(p => p.id !== socket.id);

          // 방장이 나갔으면 다른 플레이어를 방장으로 지정
          if (game.host === socket.id && game.players.length > 0) {
            game.host = game.players[0].id;
            game.players[0].isHost = true;
          }

          io.to(user.room).emit('liar-update', {
            type: 'leave',
            data: { 
              playerId: socket.id,
              players: game.players,
              host: game.host
            }
          });

          // 플레이어가 모두 나갔으면 게임 삭제
          if (game.players.length === 0) {
            liarGames.delete(user.room);
          }
        }
      } else {
        // 일반 채팅방
        socket.to(user.room).emit('userLeft', {
          username: user.username,
          message: `${user.username}님이 퇴장하셨습니다.`,
          timestamp: new Date().toISOString()
        });

        // 사용자 목록 업데이트
        const roomUsers = Array.from(connectedUsers.values())
            .filter(u => u.room === user.room)
            .map(u => u.username);

        io.to(user.room).emit('userList', roomUsers);
      }

      connectedUsers.delete(socket.id);
      console.log(`${user.username}님이 연결을 해제했습니다.`);
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`채팅 서버가 포트 ${PORT}에서 실행 중입니다.`);
});

// 마피아 게임 종료 체크
const checkMafiaGameEnd = (room) => {
  const game = mafiaGames.get(room);
  if (!game) return;
  const alivePlayers = game.players.filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
  const aliveCitizens = alivePlayers.filter(p => p.role === 'citizen' || p.role === 'joker');
  if (aliveMafia.length === 0) {
    game.phase = 'game-over';
    io.to(room).emit('mafia-update', {
      type: 'game-over',
      data: { winner: 'citizens', message: '모든 마피아가 제거되었습니다! 시민과 조커의 승리입니다!' }
    });
  } else if (aliveCitizens.length === 0) {
    game.phase = 'game-over';
    io.to(room).emit('mafia-update', {
      type: 'game-over',
      data: { winner: 'mafia', message: '모든 시민과 조커가 사망했습니다! 마피아의 승리입니다!' }
    });
  }
};