import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import DrawingBoard from './DrawingBoard';
import './Chat.css';

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isImage?: boolean; // Added isImage property
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);

  useEffect(() => {
    // 환경에 따라 서버 URL 설정
    const serverUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001';
    const newSocket = io(serverUrl);
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

  const addEmoji = (emojiData: EmojiClickData) => {
    setMessageInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 강퇴 요청
  const kickUser = (targetUsername: string) => {
    if (socket) {
      socket.emit('kick', { targetUsername, room });
    }
  };

  // 강퇴 알림 수신
  useEffect(() => {
    if (!socket) return;
    const handleKicked = () => {
      setKicked(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };
    socket.on('kicked', handleKicked);
    return () => {
      socket.off('kicked', handleKicked);
    };
  }, [socket]);

  // 그림 메시지 전송
  const sendDrawing = (dataUrl: string) => {
    if (socket) {
      socket.emit('sendMessage', { message: dataUrl, room, isImage: true });
    }
  };

  if (kicked) {
    return (
      <div className="chat-container">
        <div className="chat-header"><h2>💬 실시간 채팅</h2></div>
        <div style={{ padding: 40, textAlign: 'center', color: '#f87171', fontWeight: 600 }}>
          강퇴되었습니다. 2초 후 퇴장합니다.
        </div>
      </div>
    );
  }

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
              <div className="message-content">
                {msg.isImage ? (
                  <img src={msg.message} alt="그림 메시지" style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, border: '1px solid #eee' }} />
                ) : (
                  msg.message
                )}
              </div>
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
              <div key={index} className="user-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="user-dot"></span>
                  {user}
                </span>
                {user !== username && (
                  <button
                    className="kick-btn"
                    title="강퇴"
                    onClick={() => kickUser(user)}
                    style={{ marginLeft: 8, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18 }}
                  >
                    🦶
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showDrawing && (
        <DrawingBoard
          onSend={sendDrawing}
          onClose={() => setShowDrawing(false)}
        />
      )}
      <div className="chat-input">
        <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
          <button
            type="button"
            className="emoji-btn"
            onClick={() => setShowEmojiPicker((v) => !v)}
            style={{ marginRight: 8 }}
          >
            😊
          </button>
          <button
            type="button"
            className="draw-btn"
            onClick={() => setShowDrawing(true)}
            style={{ marginRight: 8 }}
          >
            🖌️
          </button>
          {showEmojiPicker && (
            <div style={{ position: 'absolute', bottom: 70, left: 20, zIndex: 10 }}>
              <EmojiPicker onEmojiClick={addEmoji} autoFocusSearch={false} height={350} width={300} />
            </div>
          )}
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onInput={handleTyping}
            placeholder="메시지를 입력하세요..."
            disabled={!isConnected}
            style={{ flex: 1 }}
          />
          <button onClick={sendMessage} disabled={!isConnected || !messageInput.trim()}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat; 