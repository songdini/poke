import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import DrawingBoard from './DrawingBoard';
import { getChatServerUrl, resolveImageUrl, getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
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
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [kickVote, setKickVote] = useState<KickVoteState | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

  const handleScroll = () => {
    if (!chatMessagesRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 80;
    setIsUserScrolledUp(!isAtBottom);
    if (isAtBottom) {
      setHasUnreadBelow(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasUnreadBelow(false);
    setIsUserScrolledUp(false);
  };

  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      socket.emit('join', { username, room, sessionToken: getSessionToken() });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleUserJoined = (data: { username: string; message: string; timestamp: string }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: 'System',
        message: data.message,
        timestamp: data.timestamp
      }]);
    };

    const handleUserLeft = (data: { username: string; message: string; timestamp: string }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: 'System',
        message: data.message,
        timestamp: data.timestamp
      }]);
    };

    const handleUserList = (userList: string[]) => {
      setUsers(userList);
    };

    const handleUserTyping = (data: { username: string; isTyping: boolean }) => {
      setIsTyping(data.isTyping ? data.username : '');
    };

    socket.on('connect', joinRoom);
    socket.on('newMessage', handleNewMessage);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('userList', handleUserList);
    socket.on('userTyping', handleUserTyping);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('newMessage', handleNewMessage);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('userList', handleUserList);
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket, username, room]);

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

  // 그림 메시지 전송 (REST API업로드 후 소켓 전송)
  const sendDrawing = async (dataUrl: string) => {
    try {
      const serverUrl = getChatServerUrl();
      const res = await axios.post(`${serverUrl}/api/upload`, { image: dataUrl });
      if (socket && res.data.url) {
        socket.emit('sendMessage', { message: res.data.url, room, isImage: true });
      }
    } catch (err) {
      console.error('그림 전송 실패:', err);
    }
  };

  // 이미지 파일 전송 (REST API업로드 후 소켓 전송)
  const sendImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        try {
          const serverUrl = getChatServerUrl();
          const res = await axios.post(`${serverUrl}/api/upload`, { image: dataUrl });
          if (socket && res.data.url) {
            socket.emit('sendMessage', { message: res.data.url, room, isImage: true });
          }
        } catch (err) {
          console.error('이미지 업로드 실패:', err);
        }
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
    if (!chatMessagesRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 100;

    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasUnreadBelow(false);
    } else {
      setHasUnreadBelow(true);
    }
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
        <h2>📊 Sheet: CatchMind</h2>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'LIVE' : 'Connecting...'}
        </div>
      </div>
      
      <div className="chat-main">
        <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
          <div className="excel-grid-header">
            <div className="excel-col-head row-idx">#</div>
            <div className="excel-col-head col-user">A (USER_ID)</div>
            <div className="excel-col-head col-time">B (TIMESTAMP)</div>
            <div className="excel-col-head col-msg">C (CELL_VALUE)</div>
          </div>
          {messages.map((msg, index) => {
            const isOwnMessage = msg.username === username;
            const isEmojiMessage = isOnlyEmojis(msg.message) && !msg.isImage;

            return (
              <div
                key={msg.id}
                className={`message excel-row-cell ${isOwnMessage ? 'own-message' : ''} ${isEmojiMessage ? 'emoji-message' : ''}`}
              >
                <div className="cell-row-num">{index + 1}</div>
                <div className="cell-col col-user">
                  <span className="username">{msg.username}</span>
                </div>
                <div className="cell-col col-time">
                  <span className="timestamp">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="cell-col col-msg message-content">
                  {msg.isImage ? (
                    <img
                      src={resolveImageUrl(msg.message)}
                      alt="그림 메시지"
                      className="message-image"
                      onClick={() => setSelectedImage(resolveImageUrl(msg.message))}
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
              ⚡ {isTyping}님이 셀 입력 중...
            </div>
          )}
          <div ref={messagesEndRef} />

          {(isUserScrolledUp || hasUnreadBelow) && (
            <button
              type="button"
              className="scroll-to-bottom-btn"
              onClick={scrollToBottom}
              title="최신 대화로 이동"
            >
              ⬇ 최신 대화로 이동 {hasUnreadBelow && <span className="unread-dot">●</span>}
            </button>
          )}
        </div>
        
        <div className="chat-sidebar">
          <h3>📊 Workgroup ({users.length})</h3>
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
      <div className="chat-input excel-formula-bar">
        <div className="excel-fx-label">
          <span className="cell-ref">C{messages.length + 1}</span>
          <span className="fx-symbol">fx</span>
        </div>
        <div className="chat-input-row">
          <button
            type="button"
            className="emoji-btn"
            onClick={() => setShowEmojiPicker((v) => !v)}
            title="이모지 삽입"
          >
            😊
          </button>
          <button
            type="button"
            className="draw-btn"
            onClick={() => setShowDrawing(true)}
            title="그림 그리기"
          >
            🖌️
          </button>
          {/* 이미지 첨부 버튼 */}
          <label className="image-upload-btn" title="이미지 첨부">
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
            placeholder='=STRING_INPUT("메시지를 입력하세요...")'
            disabled={!isConnected}
            onPaste={handlePaste}
          />
          <button className="excel-send-btn" onClick={sendMessage} disabled={!isConnected || !messageInput.trim()}>
            입력 (↵)
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
