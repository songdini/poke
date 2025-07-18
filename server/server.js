import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://3.34.188.85"], // 실제 도메인 추가
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: ["http://localhost:5173", "http://3.34.188.85"]
}));
app.use(express.json());

// 연결된 사용자들을 저장
const connectedUsers = new Map();

// 투표 상태 저장: { room: { targetUsername: { votes: { [username]: true/false }, total: number } } }
const kickVotes = {};

io.on('connection', (socket) => {
  console.log('사용자가 연결되었습니다:', socket.id);

  // 사용자 입장
  socket.on('join', (userData) => {
    const { username, room } = userData;
    
    socket.join(room);
    connectedUsers.set(socket.id, { username, room });
    
    // 방에 입장 메시지 전송
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
    
    console.log(`${username}님이 ${room}방에 입장했습니다.`);
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
      socket.to(user.room).emit('userLeft', {
        username: user.username,
        message: `${user.username}님이 퇴장하셨습니다.`,
        timestamp: new Date().toISOString()
      });
      
      connectedUsers.delete(socket.id);
      
      // 사용자 목록 업데이트
      const roomUsers = Array.from(connectedUsers.values())
        .filter(u => u.room === user.room)
        .map(u => u.username);
      
      io.to(user.room).emit('userList', roomUsers);
      
      console.log(`${user.username}님이 연결을 해제했습니다.`);
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`채팅 서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 