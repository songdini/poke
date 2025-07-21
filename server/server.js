import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://43.200.176.211"], // 실제 도메인 추가
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: ["http://localhost:5173", "http://43.200.176.211"]
}));
app.use(express.json());

// 연결된 사용자들을 저장
const connectedUsers = new Map();

// 투표 상태 저장: { room: { targetUsername: { votes: { [username]: true/false }, total: number } } }
const kickVotes = {};

// 마피아 게임 상태 저장
const mafiaGames = new Map();

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
          voteUsed: false, // 투표 사용 여부 추가
          voteTimeout: null // 투표 타이머 추가
        });
      }
      
      const game = mafiaGames.get(room);
      const player = {
        id: socket.id,
        username,
        role: 'citizen', // 나중에 배정
        isAlive: true,
        lives: 3,
        isProtected: false
      };
      
      game.players.push(player);
      
      // 모든 클라이언트에게 플레이어 목록 업데이트
      io.to(room).emit('mafia-update', {
        type: 'join',
        data: { player }
      });
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

    // 역할 배정: 마피아 1명, 조커 1명, 의사 1명(4명 이상일 때만), 나머지 시민
    const shuffled = [...game.players].sort(() => Math.random() - 0.5);
    let mafiaAssigned = false, jokerAssigned = false, doctorAssigned = false;
    shuffled.forEach((player, idx) => {
      if (!mafiaAssigned) {
        player.role = 'mafia';
        mafiaAssigned = true;
      } else if (!jokerAssigned) {
        player.role = 'joker';
        jokerAssigned = true;
      } else if (!doctorAssigned && shuffled.length >= 4) {
        player.role = 'doctor';
        doctorAssigned = true;
      } else {
        player.role = 'citizen';
      }
      player.isAlive = true;
      player.lives = 3;
      player.isProtected = false;
    });

    game.gameStarted = true;
    game.phase = 'day';
    game.voteUsed = false; // 새로운 게임 시작 시 투표 사용 가능

    io.to(room).emit('mafia-update', {
      type: 'game-start',
      data: { players: game.players }
    });
  });

  // 마피아 투표 (집계)
  socket.on('mafia-vote', ({ room, targetId, voterId }) => {
    const game = mafiaGames.get(room);
    if (!game) return;
    if (game.voteUsed) return;
    if (!game.votes) game.votes = [];
    if (!game.voteVoters) game.voteVoters = [];
    if (!game.voteVoters.includes(voterId)) {
      game.votes.push(targetId);
      game.voteVoters.push(voterId);
    }
    const aliveCount = game.players.filter(p => p.isAlive).length;
    if (game.votes.length >= aliveCount) {
      finishVote(room);
    }
  });

  // 마피아 공격
  socket.on('mafia-attack', ({ room, targetId }) => {
    const game = mafiaGames.get(room);
    if (!game) return;

    const targetPlayer = game.players.find(p => p.id === targetId);
    if (!targetPlayer) return;

    targetPlayer.lives = Math.max(0, targetPlayer.lives - 1);
    targetPlayer.isAlive = targetPlayer.lives > 0;

    io.to(room).emit('mafia-update', {
      type: 'attack',
      data: { targetId, player: targetPlayer }
    });

    // 의사 치료 단계로
    game.phase = 'doctor-healing';
  });

  // 의사 치료
  socket.on('mafia-heal', ({ room, targetId }) => {
    const game = mafiaGames.get(room);
    if (!game) return;

    const targetPlayer = game.players.find(p => p.id === targetId);
    if (!targetPlayer) return;

    targetPlayer.lives = Math.min(3, targetPlayer.lives + 1);
    targetPlayer.isAlive = targetPlayer.lives > 0;

    io.to(room).emit('mafia-update', {
      type: 'heal',
      data: { targetId, player: targetPlayer }
    });

    // 다시 낮으로
    game.phase = 'day';
    game.voteUsed = false; // 새로운 날이 시작되면 투표 사용 가능
  });

  // 마피아 게임 종료 체크
  const checkMafiaGameEnd = (room) => {
    const game = mafiaGames.get(room);
    if (!game) return;

    const alivePlayers = game.players.filter(p => p.isAlive);
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const aliveCitizens = alivePlayers.filter(p => p.role !== 'mafia');

    if (aliveMafia.length === 0) {
      io.to(room).emit('mafia-update', {
        type: 'game-over',
        data: { winner: 'citizens', message: '모든 마피아가 제거되었습니다! 시민의 승리입니다!' }
      });
    } else if (aliveCitizens.length === 0) {
      io.to(room).emit('mafia-update', {
        type: 'game-over',
        data: { winner: 'mafia', message: '모든 시민이 사망했습니다! 마피아의 승리입니다!' }
      });
    }
  };

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

  // 투표 시작: 모든 클라이언트에 팝업 띄우기 + 20초 타이머
  socket.on('mafia-vote-start', ({ room }) => {
    const game = mafiaGames.get(room);
    if (!game) return;
    game.votes = [];
    game.voteVoters = [];
    io.to(room).emit('mafia-vote-popup');
    // 20초 후 미투표자 무효표 처리 및 집계
    if (game.voteTimeout) clearTimeout(game.voteTimeout);
    game.voteTimeout = setTimeout(() => {
      const alivePlayers = game.players.filter(p => p.isAlive);
      // 미투표자는 무효표(null)로 추가
      alivePlayers.forEach(p => {
        if (!game.voteVoters.includes(p.id)) {
          game.votes.push(null);
        }
      });
      finishVote(room);
    }, 20000);
  });

  // 투표 집계 및 결과 전송 함수
  function finishVote(room) {
    const game = mafiaGames.get(room);
    if (!game) return;
    const aliveCount = game.players.filter(p => p.isAlive).length;
    const voteCount = {};
    for (const v of game.votes) {
      if (!v) continue;
      if (!voteCount[v]) voteCount[v] = 0;
      voteCount[v]++;
    }
    let max = 0, maxIds = [];
    for (const id in voteCount) {
      if (voteCount[id] > max) {
        max = voteCount[id];
        maxIds = [id];
      } else if (voteCount[id] === max) {
        maxIds.push(id);
      }
    }
    let resultMsg = '';
    if (maxIds.length === 1 && voteCount[maxIds[0]] > 1) {
      // 다수 득표자 1명
      const targetPlayer = game.players.find(p => p.id === maxIds[0]);
      if (targetPlayer.role === 'joker') {
        io.to(room).emit('mafia-update', {
          type: 'game-over',
          data: { winner: 'joker', message: `${targetPlayer.username}이(가) 투표받았습니다! 조커의 승리입니다!` }
        });
      } else {
        targetPlayer.lives = Math.max(0, targetPlayer.lives - 1);
        targetPlayer.isAlive = targetPlayer.lives > 0;
        game.voteUsed = true;
        resultMsg = `${targetPlayer.username}님의 생명이 1 감소했습니다.`;
        io.to(room).emit('mafia-update', {
          type: 'vote',
          data: { targetId: targetPlayer.id, player: targetPlayer, resultMsg }
        });
        checkMafiaGameEnd(room);
      }
    } else {
      // 동점 또는 모두 1표씩
      resultMsg = `투표 결과: 아무도 지목되지 않았습니다. 투표가 스킵됩니다.`;
      io.to(room).emit('mafia-update', {
        type: 'vote',
        data: { targetId: null, player: null, resultMsg }
      });
    }
    io.to(room).emit('mafia-vote-result');
    game.votes = [];
    game.voteVoters = [];
    if (game.voteTimeout) clearTimeout(game.voteTimeout);
    game.voteTimeout = null;
  }

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