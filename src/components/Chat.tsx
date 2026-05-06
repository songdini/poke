import React, { useState, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import DrawingBoard from './DrawingBoard';
import { getChatServerUrl } from '../socketUrl';
import './Chat.css';

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isImage?: boolean;
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

type KickVoteUpdatePayload = Pick<KickVoteState, 'targetUsername' | 'agreeCount' | 'totalCount' | 'voted'>;

interface KickVoteResultPayload {
  targetUsername: string;
  result: NonNullable<KickVoteState['result']>;
}

const URL_REGEX = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+|www\.[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/gi;
const URL_MATCH_REGEX = /^(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+|www\.[\w\-._~:/?#[\]@!$&'()*+,;=%]+)$/i;

const Chat: React.FC<ChatProps> = ({ username, room }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // 환경에 따라 서버 URL 설정
    const serverUrl = getChatServerUrl();
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
    const handleKickVoteUpdate = (data: KickVoteUpdatePayload) => {
      setKickVote((prev) => prev ? { ...prev, ...data, voting: true } : { ...data, voting: true });
    };
    // 투표 결과
    const handleKickVoteResult = ({ targetUsername, result }: KickVoteResultPayload) => {
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
    const message = messageInput.trim();

    if (message && socket) {
      socket.emit('sendMessage', { message, room });
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  // 이모지로만 이루어진 메시지 판별 (1개 이상)
  const isOnlyEmojis = (text: string) => {
    // 유니코드 이모지, variation selector, ZWJ sequence를 허용한다.
    const emojiRegex = /^\s*(?:\p{Emoji_Presentation}|\p{Emoji}\ufe0f|\u200d|\ufe0f)+\s*$/u;
    return emojiRegex.test(text);
  };

  // 메시지 내 URL을 하이퍼링크로 변환
  const linkify = (text: string) => {
    return text.split(URL_REGEX).map((part, i) => {
      if (URL_MATCH_REGEX.test(part)) {
        const href = part.startsWith('http') ? part : `http://${part}`;
        return <a key={i} className="message-link" href={href} target="_blank" rel="noopener noreferrer">{part}</a>;
      }
      return part;
    });
  };

  if (kicked) {
    return (
      <div className="chat-container">
        <div className="chat-header"><h2>💬 실시간 채팅</h2></div>
        <div className="kicked-notice">
          강퇴되었습니다. 2초 후 퇴장합니다.
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* 투표 UI */}
      {kickVote && (
        <div className="kick-vote-overlay">
          <div className="kick-vote-dialog">
            <h3>강퇴 투표</h3>
            <div className="kick-vote-question">
              <b>{kickVote.targetUsername}</b> 님을 강퇴하시겠습니까?
            </div>
            {kickVote.result ? (
              <div className={`kick-vote-result ${kickVote.result}`}>
                {kickVote.result === 'kicked' ? '강퇴 성공!' : '강퇴 실패'}
              </div>
            ) : (
              <>
                {!kickVote.voted.includes(username) && (
                  <div className="kick-vote-actions">
                    <button className="kick-vote-yes" onClick={() => sendKickVote(true)}>찬성</button>
                    <button className="kick-vote-no" onClick={() => sendKickVote(false)}>반대</button>
                  </div>
                )}
                <div className="kick-vote-status">
                  투표 현황: {kickVote.agreeCount} / {kickVote.totalCount - 1} (본인 제외)
                </div>
                <div className="kick-vote-voters">
                  {kickVote.voted.length > 0 && `투표함: ${kickVote.voted.join(', ')}`}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="chat-header">
        <h2>🎨 캐치마인드</h2>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? '연결됨' : '연결 중...'}
        </div>
      </div>
      
      <div className="chat-main">
        <div className="chat-messages">
          {messages.map((msg) => {
            const isOwnMessage = msg.username === username;
            const isEmojiMessage = isOnlyEmojis(msg.message) && !msg.isImage;

            return (
              <div
                key={msg.id}
                className={`message ${isOwnMessage ? 'own-message' : ''} ${isEmojiMessage ? 'emoji-message' : ''}`}
              >
                {!isEmojiMessage && (
                  <div className="message-header">
                    <span className="username">{msg.username}</span>
                    <span className="timestamp">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                <div className="message-content">
                  {msg.isImage ? (
                    <img
                      src={msg.message}
                      alt="그림 메시지"
                      className="message-image"
                      onClick={() => setSelectedImage(msg.message)}
                    />
                  ) : (
                    isEmojiMessage
                      ? msg.message
                      : linkify(msg.message)
                  )}
                </div>
              </div>
            );
          })}
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
                <span className="user-name">
                  <span className="user-dot"></span>
                  {user}
                </span>
                {user !== username && (
                  <div className="user-actions">
                    <button
                      className="kick-btn"
                      title="투표로 강퇴"
                      onClick={() => requestKickVote(user)}
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
        <div className="chat-input-row">
          <button
            type="button"
            className="emoji-btn"
            onClick={() => setShowEmojiPicker((v) => !v)}
          >
            😊
          </button>
          <button
            type="button"
            className="draw-btn"
            onClick={() => setShowDrawing(true)}
          >
            🖌️
          </button>
          {/* 이미지 첨부 버튼 */}
          <label className="image-upload-btn">
            <input
              type="file"
              accept="image/*"
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
            <div className="emoji-picker-popover">
              <EmojiPicker onEmojiClick={addEmoji} autoFocusSearch={false} height={350} width={300} />
            </div>
          )}
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleTyping}
            placeholder="메시지를 입력하세요..."
            disabled={!isConnected}
            onPaste={handlePaste}
          />
          <button onClick={sendMessage} disabled={!isConnected || !messageInput.trim()}>
            전송
          </button>
        </div>
      </div>
      {selectedImage && (
        <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="확대된 그림" />
            <button className="close-modal-btn" onClick={() => setSelectedImage(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
