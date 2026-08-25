import { connectedUsers, kickVotes, roomMessages } from '../gameManager.js';
import { sanitizeChatMessage } from '../utils/sanitize.js';

export function registerChatHandlers(io, socket) {
  socket.on('sendMessage', (messageData) => {
    if (!messageData || typeof messageData !== 'object') return;
    const { message: rawMessage, room, isImage } = messageData;
    const user = connectedUsers.get(socket.id);

    // 🚨 방 일치 검증: 발신자의 실제 접속 방과 대상 방이 다르면 다른 방으로 메시지 누출 차단!
    if (!user || user.room !== room) {
      console.warn(`[Chat Security] 다른 방 메시지 전송 시도 차단: User(${user?.username}, room=${user?.room}) -> TargetRoom(${room})`);
      return;
    }

    if (rawMessage) {
      const message = isImage ? rawMessage : sanitizeChatMessage(rawMessage, 500);
      if (!message || message.trim() === '') return;

      const messageObj = {
        username: user.username,
        message,
        timestamp: new Date().toISOString(),
        id: socket.id + '_' + Date.now(),
        isImage: !!isImage
      };

      if (!roomMessages.has(room)) {
        roomMessages.set(room, []);
      }
      const history = roomMessages.get(room);
      history.push(messageObj);
      if (history.length > 100) {
        history.shift();
      }

      io.to(room).emit('newMessage', messageObj);
    }
  });

  socket.on('typing', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.room === data.room) {
      socket.to(data.room).emit('userTyping', {
        username: user.username,
        isTyping: data.isTyping
      });
    }
  });

  socket.on('kickVoteRequest', ({ targetUsername, room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;
    if (user.username === targetUsername) return;

    const targetExists = Array.from(connectedUsers.values()).some(u => u.room === room && u.username === targetUsername);
    if (!targetExists) return;

    if (!kickVotes[room]) kickVotes[room] = {};

    if (kickVotes[room][targetUsername]?.timeout) {
      clearTimeout(kickVotes[room][targetUsername].timeout);
    }

    const timeout = setTimeout(() => {
      if (kickVotes[room]?.[targetUsername]) {
        delete kickVotes[room][targetUsername];
        if (Object.keys(kickVotes[room]).length === 0) {
          delete kickVotes[room];
        }
      }
    }, 60000);

    kickVotes[room][targetUsername] = { votes: {}, total: 0, timeout };
    io.to(room).emit('kickVoteStart', { targetUsername });
  });

  socket.on('kickVote', ({ targetUsername, room, agree }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || user.room !== room) return;
    const voterUsername = user.username;

    if (!kickVotes[room] || !kickVotes[room][targetUsername]) return;
    if (voterUsername === targetUsername) return;

    kickVotes[room][targetUsername].votes[voterUsername] = agree;
    kickVotes[room][targetUsername].total++;

    const roomUsers = Array.from(connectedUsers.values()).filter(u => u.room === room);
    const agreeCount = Object.values(kickVotes[room][targetUsername].votes).filter(v => v).length;
    const totalCount = roomUsers.length;

    io.to(room).emit('kickVoteUpdate', {
      targetUsername,
      agreeCount,
      totalCount,
      voted: Object.keys(kickVotes[room][targetUsername].votes)
    });

    if (Object.keys(kickVotes[room][targetUsername].votes).length >= totalCount - 1) {
      if (agreeCount > (totalCount - 1) / 2) {
        for (const [id, u] of connectedUsers.entries()) {
          if (u.username === targetUsername && u.room === room) {
            io.to(id).emit('kicked');
            io.to(room).emit('kickVoteResult', { targetUsername, result: 'kicked' });
            io.sockets.sockets.get(id)?.disconnect();
            break;
          }
        }
      } else {
        io.to(room).emit('kickVoteResult', { targetUsername, result: 'not_kicked' });
      }
      if (kickVotes[room][targetUsername]?.timeout) {
        clearTimeout(kickVotes[room][targetUsername].timeout);
      }
      delete kickVotes[room][targetUsername];
      if (Object.keys(kickVotes[room]).length === 0) {
        delete kickVotes[room];
      }
    }
  });
}
