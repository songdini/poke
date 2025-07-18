import React, { useState, useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
import './Chat.css';

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

interface ChatProps {
  username: string;
  room: string;
}

const Chat: React.FC<ChatProps> = ({ username, room }) => {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number>();

  useEffect(() => {
    // 환경에 따라 서버 URL 설정
    const serverUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001';
    const newSocket = socketIO(serverUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join', { username, room });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('newMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('userJoined', (data: { username: string; message: string; timestamp: string }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: 'System',
        message: data.message,
        timestamp: data.timestamp
      }]);
    });

    newSocket.on('userLeft', (data: { username: string; message: string; timestamp: string }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: 'System',
        message: data.message,
        timestamp: data.timestamp
      }]);
    });

    newSocket.on('userList', (userList: string[]) => {
      setUsers(userList);
    });

    newSocket.on('userTyping', (data: { username: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setIsTyping(data.username);
      } else {
        setIsTyping('');
      }
    });

    return () => {
      newSocket.close();
    };
  }, [username, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (messageInput.trim() && socket) {
      socket.emit('sendMessage', { message: messageInput, room });
      setMessageInput('');
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', { room, isTyping: true });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { room, isTyping: false });
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>💬 실시간 채팅</h2>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? '연결됨' : '연결 중...'}
        </div>
      </div>
      
      <div className="chat-main">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.username === username ? 'own-message' : ''}`}>
              <div className="message-header">
                <span className="username">{msg.username}</span>
                <span className="timestamp">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))}
          {isTyping && (
            <div className="typing-indicator">
              {isTyping}님이 입력 중...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-sidebar">
          <h3>👥 참여자 ({users.length})</h3>
          <div className="users-list">
            {users.map((user, index) => (
              <div key={index} className="user-item">
                <span className="user-dot"></span>
                {user}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="chat-input">
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          onInput={handleTyping}
          placeholder="메시지를 입력하세요..."
          disabled={!isConnected}
        />
        <button onClick={sendMessage} disabled={!isConnected || !messageInput.trim()}>
          전송
        </button>
      </div>
    </div>
  );
};

export default Chat; 