import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Clock, Crown, Eye, EyeOff } from 'lucide-react';
import { type Socket } from 'socket.io-client';
import { getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
import './LiarGame.css';

interface Player {
  id: string;
  username: string;
  isHost: boolean;
  isLiar: boolean;
  word: string | null;
  voted?: boolean;
}

interface Message {
  username: string;
  message: string;
  timestamp: string;
}

interface VoteCount {
  [playerId: string]: number;
}

interface GameResult {
  winner: 'citizens' | 'liar';
  message: string;
  liar: string;
  mostVoted: string;
  word: string;
  liarWord: string;
  voteCount: VoteCount;
}

interface LiarGameProps {
  username: string;
  room: string;
  onLeaveRoom?: () => void;
}

type LiarPhase = 'waiting' | 'starting' | 'word-input' | 'word-distribute' | 'talk' | 'vote' | 'result';

type LiarUpdate =
  | { type: 'reconnect-sync'; data: { phase?: LiarPhase; players?: Player[]; myWord?: string | null; isLiar?: boolean } }
  | { type: 'join' | 'leave' | 'restart'; data: { players: Player[]; phase: LiarPhase; host?: string | null; wordProvider?: string | null } }
  | { type: 'game-start'; data?: Record<string, never> }
  | { type: 'word-distribute'; data: { myWord: string | null; isLiar?: boolean; phase?: LiarPhase } }
  | { type: 'talk-start'; data: { phase?: LiarPhase; timer: number } }
  | { type: 'timer-update'; data: { timer: number } }
  | { type: 'message'; data: Message }
  | { type: 'vote-start'; data: { phase?: LiarPhase; players: Player[] } }
  | { type: 'vote-update'; data: { votedCount: number; totalCount?: number; voteCount: VoteCount } }
  | { type: 'result'; data: GameResult };

interface LiarErrorPayload {
  message: string;
}

// 로딩 컴포넌트
const LiarGameLoading: React.FC = () => {
  const [dots, setDots] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= 2) return 0;
        return prev + 1;
      });
    }, 1000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(stepInterval);
    };
  }, []);

  const steps = [
    { icon: '📝', text: '단어 사전 데이터베이스 연결 중' },
    { icon: '🔍', text: '카테고리별 단어 무작위 조합 중' },
    { icon: '🎭', text: '라이어 플레이어 비밀리에 추첨 중' }
  ];

  return (
      <div className="liar-loading-overlay">
        <div className="liar-loading-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring delay-1"></div>
            <div className="spinner-ring delay-2"></div>
          </div>

          <div className="loading-content">
            <h2 className="loading-title">🎭 게임 준비 중{dots}</h2>
            <div className="loading-steps">
              {steps.map((step, index) => (
                  <div key={index} className={`loading-step ${index <= currentStep ? 'active' : ''}`}>
                    <div className="loading-step-icon">{step.icon}</div>
                    <span>{step.text}</span>
                  </div>
              ))}
            </div>

            <div className="loading-message">
              잠시만 기다려주세요...
            </div>
          </div>
        </div>
      </div>
  );
};

const LiarGame: React.FC<LiarGameProps> = ({ username, room, onLeaveRoom }) => {
  const { socket } = useSocket();
  // 게임 상태
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<LiarPhase>('waiting');
  const [myWord, setMyWord] = useState<string | null>(null);
  const [showMyWord, setShowMyWord] = useState(false);

  // 대화 관련
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [timer, setTimer] = useState(180);

  // 투표 관련
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [voteCount, setVoteCount] = useState<VoteCount>({});
  const [votedCount, setVotedCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);

  // 기타 UI
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(socket);

  const resetLiarGameState = () => {
    setMyWord(null);
    setShowMyWord(false);
    setMessages([]);
    setCurrentMessage('');
    setTimer(180);
    setVoteTarget(null);
    setVoteCount({});
    setVotedCount(0);
    setHasVoted(false);
    setResult(null);
    setError('');
    setPhase('waiting');
  };

  useEffect(() => {
    socketRef.current = socket;
    if (!socket) return;

    const joinRoom = () => {
      socket.emit('join', {
        username,
        room,
        gameType: 'liar',
        sessionToken: getSessionToken()
      });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleLiarUpdate = (update: LiarUpdate) => {
      switch (update.type) {
        case 'reconnect-sync':
          if (update.data) {
            if (update.data.phase) setPhase(update.data.phase);
            if (update.data.players) setPlayers(update.data.players);
            if (update.data.myWord !== undefined) setMyWord(update.data.myWord);
          }
          break;
        case 'join':
        case 'leave':
          setPlayers(update.data.players || []);
          setPhase(update.data.phase);
          break;
        case 'restart':
          setPlayers(update.data.players || []);
          setPhase(update.data.phase);
          resetLiarGameState();
          break;
        case 'game-start':
          setPhase('word-input');
          break;
        case 'word-distribute':
          setPhase('word-distribute');
          setMyWord(update.data.myWord);
          break;
        case 'talk-start':
          setPhase('talk');
          setTimer(update.data.timer);
          break;
        case 'timer-update':
          setTimer(update.data.timer);
          break;
        case 'message':
          setMessages(prev => [...prev, {
            username: update.data.username,
            message: update.data.message,
            timestamp: update.data.timestamp
          }]);
          break;
        case 'vote-start':
          setPhase('vote');
          setPlayers(update.data.players);
          break;
        case 'vote-update':
          setVotedCount(update.data.votedCount);
          setVoteCount(update.data.voteCount);
          break;
        case 'result':
          setPhase('result');
          setResult(update.data);
          break;
      }
    };

    const handleLiarError = (data: LiarErrorPayload) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    };

    socket.on('connect', joinRoom);
    socket.on('liar-update', handleLiarUpdate);
    socket.on('liar-error', handleLiarError);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('liar-update', handleLiarUpdate);
      socket.off('liar-error', handleLiarError);
    };
  }, [socket, username, room]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 이벤트 핸들러들
  const handleGameStart = () => {
    setPhase('starting'); // 로딩 상태로 변경
    socketRef.current?.emit('liar-game-start', { room });
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    socketRef.current?.emit('liar-message', {
      room,
      message: currentMessage.trim()
    });

    setCurrentMessage('');
  };

  const handleVote = (targetId: string) => {
    if (hasVoted) return;

    setVoteTarget(targetId);
    setHasVoted(true);

    socketRef.current?.emit('liar-vote', {
      room,
      targetId
    });
  };

  const handleRestart = () => {
    socketRef.current?.emit('liar-game-restart', { room });
  };

  const myPlayer = players.find(p => p.username === username);
  const isHost = myPlayer?.isHost || false;

  return (
      <div className="liar-game">
        {/* 헤더 */}
        <div className="game-header">
          <h2>🤥 Liar_Check</h2>
          <div className="room-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>방: <strong>{room}</strong></span>
            <span>닉네임: <strong>{username}</strong></span>
            {onLeaveRoom && (
              <button onClick={onLeaveRoom} className="leave-room-btn" style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                🚪 방 나가기
              </button>
            )}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
            <div className="error-message">
              {error}
            </div>
        )}

        {/* 플레이어 목록 */}
        <div className="players-section">
          <h3><Users size={18} /> 참가자 ({players.length}명)</h3>
          <div className="players-grid">
            {players.map((player) => (
                <div key={player.id} className={`player-card ${player.username === username ? 'me' : ''}`}>
                  <div className="player-name">
                    {player.isHost && <Crown size={14} className="host-icon" />}
                    {player.username}
                    {player.username === username && <span className="me-badge">나</span>}
                  </div>
                  {phase === 'vote' && (
                      <button
                          className={`vote-btn ${voteTarget === player.id ? 'selected' : ''}`}
                          onClick={() => handleVote(player.id)}
                          disabled={hasVoted || player.username === username}
                      >
                        {voteTarget === player.id ? '투표함' : '투표'}
                      </button>
                  )}
                  {phase === 'vote' && voteCount[player.id] && (
                      <div className="vote-count">
                        {voteCount[player.id]}표
                      </div>
                  )}
                </div>
            ))}
          </div>
        </div>

        {/* 대기 단계 */}
        {phase === 'waiting' && (
            <div className="phase-section">
              <div className="waiting-content">
                <p>게임 시작을 기다리는 중...</p>
                <p className="phase-description">최소 3명이 필요합니다.</p>
                {isHost && players.length >= 3 && (
                    <button className="primary-btn" onClick={handleGameStart}>
                      🎮 게임 시작
                    </button>
                )}
                {!isHost && (
                    <p>방장이 게임을 시작할 때까지 기다려주세요.</p>
                )}
              </div>
            </div>
        )}

        {/* 제시어 입력 단계 */}
        {phase === 'word-input' && (
            <div className="phase-section">
              <div className="word-input-content">
                <h3>제시어 입력</h3>
                {isHost ? (
                    <p className="phase-description">게임 시작 버튼을 누르면 서버에서 자동으로 제시어를 가져옵니다.</p>
                ) : (
                    <div>
                      <p className="phase-description">방장이 게임을 시작하면 서버에서 자동으로 제시어를 가져옵니다...</p>
                    </div>
                )}
              </div>
            </div>
        )}

        {/* 제시어 배분 단계 */}
        {phase === 'word-distribute' && (
            <div className="phase-section">
              <div className="word-distribute-content">
                <h3>제시어 확인</h3>
                <div className="my-word-section">
                  <div className="word-reveal">
                    <div className="word-info">
                      <div className="citizen-notice">
                        <h4>내 제시어 확인</h4>
                        <p>다른 사람에게 들키지 않게 조심하세요!</p>
                        <div className="my-word-display">
                          <button className="word-toggle-btn" onClick={() => setShowMyWord(!showMyWord)}>
                            {showMyWord ? <EyeOff size={16} /> : <Eye size={16} />}
                            {showMyWord ? '제시어 숨기기' : '내 제시어 보기'}
                          </button>
                          {showMyWord && <div className="word-display">{myWord}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="phase-description">곧 대화 단계가 시작됩니다...</p>
              </div>
            </div>
        )}

        {/* 대화 단계 */}
        {phase === 'talk' && (
            <div className="phase-section">
              <div className="talk-content">
                <div className="talk-header">
                  <h3>💬 대화 시간</h3>
                  <div className="timer">
                    <Clock size={18} />
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                <div className="my-word-reminder">
                  <button
                      className="word-toggle-btn small"
                      onClick={() => setShowMyWord(!showMyWord)}
                  >
                    {showMyWord ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showMyWord ? '숨기기' : '내 제시어'}
                  </button>
                  {showMyWord && (
                      <div className="word-display small">
                        {myWord || '제시어 없음 (라이어)'}
                      </div>
                  )}
                </div>

                <div className="chat-section">
                  <div className="messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.username === username ? 'my-message' : ''}`}>
                          <div className="message-header">
                            <strong>{msg.username}</strong>
                            <span className="timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                          </div>
                          <div className="message-content">{msg.message}</div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="message-input">
                    <input
                        type="text"
                        value={currentMessage}
                        onChange={e => setCurrentMessage(e.target.value)}
                        placeholder="메시지를 입력하세요"
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button onClick={handleSendMessage} disabled={!currentMessage.trim()}>
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* 투표 단계 */}
        {phase === 'vote' && (
            <div className="phase-section">
              <div className="vote-content">
                <h3>투표</h3>
                <p className="phase-description">
                  대화 단계에서 누구를 라이어로 지목했는지 확인해주세요.
                </p>
                <div className="vote-status">
                  현재 투표 상태: {votedCount}명 투표 완료
                </div>
                <div className="vote-results">
                  <h4>투표 결과</h4>
                  {Object.entries(voteCount).map(([playerId, count]) => (
                      <div key={playerId} className="vote-result-item">
                        <span>{players.find(p => p.id === playerId)?.username || playerId}:</span>
                        <span>{count}표</span>
                      </div>
                  ))}
                </div>
                <button className="primary-btn" onClick={handleRestart}>
                  게임 다시 시작
                </button>
              </div>
            </div>
        )}

        {/* 결과 단계 */}
        {phase === 'result' && (
            <div className="phase-section">
              <div className="result-content">
                <h3>게임 결과</h3>
                <div className="result-message">
                  <h4>{result?.winner === 'liar' ? '라이어 승리!' : '시민 승리!'}</h4>
                  <p>{result?.message}</p>
                  <p>라이어: {result?.liar}</p>
                  <p>제시어: {result?.word}</p>
                  <p>라이어 제시어: {result?.liarWord}</p>
                </div>
                <button className="primary-btn" onClick={handleRestart}>
                  게임 다시 시작
                </button>
              </div>
            </div>
        )}

        {/* 로딩 오버레이 */}
        {phase === 'starting' && <LiarGameLoading />}
      </div>
  );
};

export default LiarGame;
