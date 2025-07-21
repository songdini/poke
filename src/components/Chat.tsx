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

interface KickVoteState {
  voting: boolean;
  targetUsername: string;
  agreeCount: number;
  totalCount: number;
  voted: string[];
  result?: 'kicked' | 'not_kicked';
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
  const [kickVote, setKickVote] = useState<KickVoteState | null>(null);

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

  // 강퇴 투표 관련 소켓 이벤트 처리
  useEffect(() => {
    if (!socket) return;
    // 투표 시작
    const handleKickVoteStart = ({ targetUsername }: { targetUsername: string }) => {
      setKickVote({ voting: true, targetUsername, agreeCount: 0, totalCount: 0, voted: [] });
    };
    // 투표 현황
    const handleKickVoteUpdate = (data: any) => {
      setKickVote((prev) => prev ? { ...prev, ...data, voting: true } : { ...data, voting: true });
    };
    // 투표 결과
    const handleKickVoteResult = ({ targetUsername, result }: any) => {
      setKickVote((prev) => prev && prev.targetUsername === targetUsername ? { ...prev, result, voting: false } : prev);
      setTimeout(() => setKickVote(null), 2000);
    };
    socket.on('kickVoteStart', handleKickVoteStart);
    socket.on('kickVoteUpdate', handleKickVoteUpdate);
    socket.on('kickVoteResult', handleKickVoteResult);
    return () => {
      socket.off('kickVoteStart', handleKickVoteStart);
      socket.off('kickVoteUpdate', handleKickVoteUpdate);
      socket.off('kickVoteResult', handleKickVoteResult);
    };
  }, [socket]);

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

  // 이미지 파일 전송
  const sendImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (socket && dataUrl) {
        socket.emit('sendMessage', { message: dataUrl, room, isImage: true });
      }
    };
    reader.readAsDataURL(file);
  };

  // 클립보드 붙여넣기 지원
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          sendImageFile(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  // 투표 요청
  const requestKickVote = (targetUsername: string) => {
    if (socket) {
      socket.emit('kickVoteRequest', { targetUsername, room });
    }
  };

  // 투표 응답
  const sendKickVote = (agree: boolean) => {
    if (socket && kickVote) {
      socket.emit('kickVote', { targetUsername: kickVote.targetUsername, room, agree, username });
    }
  };

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

  // 이모지 단독 메시지 판별
  const isSingleEmoji = (text: string) => {
    // 유니코드 이모지 정규식 (간단 버전)
    const emojiRegex = /^\s*(?:[\u231A-\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD-\u25FE\u2614-\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA-\u26AB\u26BD-\u26BE\u26C4-\u26C5\u26CE\u26D4\u26EA\u26F2-\u26F3\u26F5\u26FA\u26FD\u2705\u270A-\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B-\u2B1C\u2B50\u2B55\u1F004\u1F0CF\u1F18E\u1F191-\u1F19A\u1F1E6-\u1F1FF\u1F201-\u1F202\u1F21A\u1F22F\u1F232-\u1F23A\u1F250-\u1F251\u1F300-\u1F321\u1F324-\u1F393\u1F396-\u1F397\u1F399-\u1F39B\u1F39E-\u1F3F0\u1F3F3-\u1F3F5\u1F3F7-\u1F4FD\u1F4FF-\u1F53D\u1F549-\u1F54E\u1F550-\u1F567\u1F56F-\u1F570\u1F573-\u1F579\u1F587\u1F58A-\u1F58D\u1F590\u1F595-\u1F596\u1F5A4-\u1F5A5\u1F5A8\u1F5B1-\u1F5B2\u1F5BC\u1F5C2-\u1F5C4\u1F5D1-\u1F5D3\u1F5DC-\u1F5DE\u1F5E1\u1F5E3\u1F5E8\u1F5EF\u1F5F3\u1F5FA-\u1F64F\u1F680-\u1F6C5\u1F6CB-\u1F6D2\u1F6E0-\u1F6E5\u1F6E9\u1F6EB-\u1F6EC\u1F6F0\u1F6F3-\u1F6F8\u1F910-\u1F93A\u1F93C-\u1F93E\u1F940-\u1F945\u1F947-\u1F94C\u1F950-\u1F96B\u1F980-\u1F997\u1F9C0\u1F9D0-\u1F9E6\u200D\u2640-\u2642\uFE0F]+)\s*$/u;
    return emojiRegex.test(text);
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
      {/* 투표 UI */}
      {kickVote && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#23272f', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', textAlign: 'center', color: '#fff' }}>
            <h3 style={{ color: '#39ff14', marginBottom: 16 }}>강퇴 투표</h3>
            <div style={{ marginBottom: 16 }}>
              <b style={{ color: '#f87171' }}>{kickVote.targetUsername}</b> 님을 강퇴하시겠습니까?
            </div>
            {kickVote.result ? (
              <div style={{ color: kickVote.result === 'kicked' ? '#39ff14' : '#f87171', fontWeight: 600, fontSize: 18 }}>
                {kickVote.result === 'kicked' ? '강퇴 성공!' : '강퇴 실패'}
              </div>
            ) : (
              <>
                {!kickVote.voted.includes(username) && (
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 12 }}>
                    <button onClick={() => sendKickVote(true)} style={{ background: '#39ff14', color: '#18181b', padding: '8px 24px', border: 'none', borderRadius: 6, fontWeight: 600 }}>찬성</button>
                    <button onClick={() => sendKickVote(false)} style={{ background: '#f87171', color: '#fff', padding: '8px 24px', border: 'none', borderRadius: 6, fontWeight: 600 }}>반대</button>
                  </div>
                )}
                <div style={{ color: '#a3e635', fontSize: 15 }}>
                  투표 현황: {kickVote.agreeCount} / {kickVote.totalCount - 1} (본인 제외)
                </div>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
                  {kickVote.voted.length > 0 && `투표함: ${kickVote.voted.join(', ')}`}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="chat-header">
        <h2>💬 Add File... (7/21)</h2>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? '연결됨' : '연결 중...'}
        </div>
      </div>
      
      <div className="chat-main">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.username === username ? 'own-message' : ''}`}
              style={isSingleEmoji(msg.message) && !msg.isImage ? {
                background: 'none',
                boxShadow: 'none',
                border: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px 0',
                fontSize: 64,
                color: '#fff',
                lineHeight: 1.1
              } : {}}
            >
              <div className="message-header" style={isSingleEmoji(msg.message) && !msg.isImage ? { display: 'none' } : {}}>
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
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="kick-btn"
                      title="강퇴"
                      onClick={() => kickUser(user)}
                      style={{ marginLeft: 4, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18 }}
                    >
                      🦶
                    </button>
                    <button
                      className="kick-btn"
                      title="투표로 강퇴"
                      onClick={() => requestKickVote(user)}
                      style={{ marginLeft: 4, background: 'none', border: 'none', color: '#a3e635', cursor: 'pointer', fontSize: 18 }}
                    >
                      🗳️
                    </button>
                  </div>
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
          {/* 이미지 첨부 버튼 */}
          <label style={{ marginRight: 8, cursor: 'pointer' }}>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  sendImageFile(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <span role="img" aria-label="이미지">📎</span>
          </label>
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
            onPaste={handlePaste}
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