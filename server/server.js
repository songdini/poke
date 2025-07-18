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
    const { message, room } = messageData;
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      const messageObj = {
        username: user.username,
        message,
        timestamp: new Date().toISOString(),
        id: socket.id
      };
      
      io.to(room).emit('newMessage', messageObj);
      console.log(`${user.username}: ${message}`);
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