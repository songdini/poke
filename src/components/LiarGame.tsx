import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, Crown, Eye, EyeOff, Bot } from 'lucide-react';
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
  isBot?: boolean;
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

// 📊 Excel PowerQuery Loading Window Component
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
    { icon: '📝', text: '단어 사전 데이터베이스 연결 및 쿼리 실행 중' },
    { icon: '🔍', text: '카테고리별 제시어 인덱스 무작위 추출 중' },
    { icon: '🎭', text: '라이어 계정 권한 할당 및 암호화 진행 중' }
  ];

  return (
    <div className="liar-loading-overlay">
      <div className="liar-loading-container">
        <div className="loading-window-header">
          <span>📊</span>
          <span>Excel PowerQuery Engine - Data Querying</span>
        </div>
        <div className="loading-content">
          <h3 className="loading-title">🎭 데이터베이스 연동 및 라이어 추첨 중{dots}</h3>
          <div className="loading-steps">
            {steps.map((step, index) => (
              <div key={index} className={`loading-step ${index <= currentStep ? 'active' : ''}`}>
                <span>{step.icon}</span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#605e5c' }}>
            잠시만 기다려주십시오...
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
        sessionToken: getSessionToken('liar')
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGameStart = () => {
    setPhase('starting');
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

  const handleAddBot = () => {
    socketRef.current?.emit('liar-add-bot', { room });
  };

  const handleRemoveBot = (botId?: string) => {
    socketRef.current?.emit('liar-remove-bot', { room, botId });
  };

  const myPlayer = players.find(p => p.username === username);
  const isHost = myPlayer?.isHost || false;

  return (
    <div className="liar-game-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">Sheet1!A1</div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-formula-input">
          {phase === 'waiting' && `=SUM(PLAYERS_READY) & " / " & COUNT(PLAYERS_TOTAL)`}
          {phase === 'word-input' && `=QUERY_WORD_DICTIONARY(CATEGORY_ALL)`}
          {phase === 'word-distribute' && `=VLOOKUP(USER, SECRET_WORD_DB, 2, FALSE)`}
          {phase === 'talk' && `=COUNTDOWN_TIMER(${timer}) & " - DISCUSS_LIAR()"`}
          {phase === 'vote' && `=VOTE_CAST(USER_SELECTION, ACTIVE_VOTES)`}
          {phase === 'result' && `=IF(WINNER="CITIZENS", "CITIZEN_VICTORY", "LIAR_VICTORY")`}
          {phase === 'starting' && `=QUERY_DATABASE("WORD_DICT_INDEXING...")`}
        </div>
      </div>

      {/* 📋 Sheet Header Bar */}
      <div className="game-header">
        <div className="sheet-title-info">
          <span style={{ fontSize: '1.2rem' }}>🤥</span>
          <h2>Sheet1_LiarCheck.xlsx</h2>
        </div>
        <div className="game-info">
          <span className="excel-cell-badge phase">
            단계: {phase === 'waiting' ? '대기 중' : phase === 'talk' ? '대화 시간' : phase === 'vote' ? '투표 진행' : phase === 'result' ? '게임 결과' : '진행 중'}
          </span>
          {phase === 'talk' && (
            <span className="excel-cell-badge timer">
              <Clock size={14} /> {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </span>
          )}
          <span className="excel-cell-badge">방 #{room}</span>
          <span className="excel-cell-badge">USER: {username}</span>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close">
              🚪 나가기
            </button>
          )}
        </div>
      </div>

      {/* ⚠️ 에러 메시지 */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* 📱 Main Layout Area */}
      <div className="liar-game-main">
        {/* 📊 플레이어 목록 (Excel Grid Data Table) */}
        <div className="excel-table-wrapper">
          <table className="excel-grid-table">
            <thead>
              <tr>
                <th className="corner-header"></th>
                <th style={{ width: '80px' }}>A (ID)</th>
                <th>B (참가자)</th>
                <th style={{ width: '120px' }}>C (권한)</th>
                {phase === 'vote' && <th style={{ width: '120px' }}>D (투표)</th>}
                {phase === 'vote' && <th style={{ width: '80px' }}>E (득표)</th>}
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr key={player.id} className={player.username === username ? 'me-row' : ''}>
                  <td className="row-header">{idx + 1}</td>
                  <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.78rem' }}>{player.id.substring(0, 6)}</td>
                  <td>
                    {player.isHost && <Crown size={14} className="host-icon" style={{ color: '#d97706', marginRight: 4, verticalAlign: 'middle' }} />}
                    {player.isBot && <Bot size={14} style={{ color: '#0284c7', marginRight: 4, verticalAlign: 'middle' }} />}
                    <strong style={{ verticalAlign: 'middle' }}>{player.username}</strong>
                    {player.username === username && <span className="excel-tag me">나</span>}
                    {player.isHost && <span className="excel-tag host">방장</span>}
                    {player.isBot && <span className="excel-tag bot" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', marginLeft: 6 }}>🤖 봇</span>}
                  </td>
                  <td>{player.isHost ? '방장 (Host)' : player.isBot ? '인공지능 (Bot)' : '참가자 (Member)'}</td>
                  {phase === 'vote' && (
                    <td>
                      <button
                        className={`excel-btn ${voteTarget === player.id ? 'primary' : ''}`}
                        onClick={() => handleVote(player.id)}
                        disabled={hasVoted || player.username === username}
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        {voteTarget === player.id ? '✓ 투표됨' : '투표하기'}
                      </button>
                    </td>
                  )}
                  {phase === 'vote' && (
                    <td style={{ textAlign: 'center', fontWeight: 600, color: voteCount[player.id] ? '#107c41' : '#8a8886' }}>
                      {voteCount[player.id] ? `${voteCount[player.id]}표` : '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🎮 대기 단계 */}
        {phase === 'waiting' && (
          <div className="excel-phase-card">
            <div className="excel-card-header">
              <h3>🎮 라이어 게임 세션 대기 중</h3>
              <span style={{ fontSize: '0.8rem', color: '#605e5c' }}>참가자: {players.length}명</span>
            </div>
            <p className="phase-description">최소 3명의 참가자가 모이면 방장이 게임을 시작할 수 있습니다. (🤖 봇 참가자 가능)</p>
            {isHost && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                <button className="excel-btn" onClick={handleAddBot} disabled={players.length >= 10}>
                  <Bot size={14} /> 🤖 봇 추가 (+Bot)
                </button>
                {players.some(p => p.isBot) && (
                  <button className="excel-btn close" onClick={() => handleRemoveBot()}>
                    🗑️ 봇 제거 (-Bot)
                  </button>
                )}
                {players.length >= 3 && (
                  <button className="excel-btn primary" onClick={handleGameStart} style={{ padding: '8px 24px' }}>
                    ▶ 라이어 게임 시작 (Start)
                  </button>
                )}
              </div>
            )}
            {!isHost && (
              <p className="phase-description">방장이 게임을 시작할 때까지 잠시 기다려주세요.</p>
            )}
          </div>
        )}

        {/* 🔍 제시어 입력/배분 단계 */}
        {(phase === 'word-input' || phase === 'word-distribute') && (
          <div className="excel-phase-card">
            <div className="excel-card-header">
              <h3>🔍 비밀 제시어 데이터 확인</h3>
            </div>
            <div className="my-word-box">
              <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#605e5c' }}>다른 사람에게 들키지 않게 주의하십시오!</p>
              <button className="excel-btn" onClick={() => setShowMyWord(!showMyWord)}>
                {showMyWord ? <EyeOff size={14} /> : <Eye size={14} />}
                {showMyWord ? '제시어 숨기기' : '내 제시어 확인하기'}
              </button>
              {showMyWord && (
                <div style={{ marginTop: '10px' }}>
                  <div className={`word-display-cell ${!myWord ? 'liar' : ''}`}>
                    {myWord ? `제시어: ${myWord}` : '⚠️ 당신은 라이어입니다!'}
                  </div>
                </div>
              )}
            </div>
            <p className="phase-description" style={{ textAlign: 'center', marginTop: '10px' }}>곧 대화 및 심문 단계가 시작됩니다...</p>
          </div>
        )}

        {/* 💬 대화 단계 */}
        {phase === 'talk' && (
          <div className="excel-phase-card">
            <div className="excel-card-header">
              <h3>💬 대화 및 라이어 추론 시간</h3>
              <button className="excel-btn" onClick={() => setShowMyWord(!showMyWord)}>
                {showMyWord ? <EyeOff size={14} /> : <Eye size={14} />}
                {showMyWord ? '내 제시어 숨기기' : '내 제시어 확인'}
              </button>
            </div>
            {showMyWord && (
              <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                <span className={`word-display-cell ${!myWord ? 'liar' : ''}`} style={{ fontSize: '0.85rem', padding: '4px 14px' }}>
                  {myWord ? `제시어: ${myWord}` : '⚠️ 당신은 라이어입니다!'}
                </span>
              </div>
            )}
            <div className="excel-chat-container">
              <div className="excel-chat-messages">
                {messages.map((msg, index) => (
                  <div key={index} className={`excel-chat-row ${msg.username === username ? 'my-row' : ''}`}>
                    <span className="excel-chat-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="excel-chat-user">{msg.username}:</span>
                    <span className="excel-chat-text">{msg.message}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="excel-chat-input-bar">
                <span className="prefix">fx =</span>
                <input
                  type="text"
                  value={currentMessage}
                  onChange={e => setCurrentMessage(e.target.value)}
                  placeholder="메시지를 입력하세요 (Enter)..."
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="excel-btn primary" onClick={handleSendMessage} disabled={!currentMessage.trim()}>
                  <Send size={14} /> 전송
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🗳️ 투표 단계 */}
        {phase === 'vote' && (
          <div className="excel-phase-card">
            <div className="excel-card-header">
              <h3>🗳️ 라이어 지목 투표 세션</h3>
              <span style={{ fontSize: '0.85rem', color: '#107c41', fontWeight: 600 }}>{votedCount}명 투표 완료</span>
            </div>
            <p className="phase-description">상단 참가자 목록(D열)에서 라이어로 의심되는 플레이어의 [투표하기] 버튼을 누르십시오.</p>
            {isHost && (
              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <button className="excel-btn primary" onClick={handleRestart}>
                  🔄 세션 재시작
                </button>
              </div>
            )}
          </div>
        )}

        {/* 🏆 결과 단계 */}
        {phase === 'result' && (
          <div className="excel-phase-card">
            <div className="excel-card-header">
              <h3>📊 세션 분석 최종 결과</h3>
            </div>
            <div className={`excel-result-box ${result?.winner === 'citizens' ? 'citizen-win' : 'liar-win'}`}>
              <h4>{result?.winner === 'citizens' ? '🎉 시민 승리! (Citizen Victory)' : '🎭 라이어 승리! (Liar Victory)'}</h4>
              <p style={{ margin: '4px 0 12px 0', fontSize: '0.9rem' }}>{result?.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                <div className="excel-cell-badge"><strong>라이어 계정:</strong> {result?.liar}</div>
                <div className="excel-cell-badge"><strong>정답 제시어:</strong> {result?.word}</div>
                <div className="excel-cell-badge"><strong>최다 득표:</strong> {result?.mostVoted}</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button className="excel-btn primary" onClick={handleRestart} style={{ padding: '8px 24px' }}>
                🔄 다음 라운드 시작
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📑 Bottom Excel Sheet Tabs */}
      <div className="excel-sheet-tab-bar">
        <div className="excel-sheet-tab active">Sheet1_LiarCheck</div>
        <div className="excel-sheet-tab">Audit_Logs</div>
        <div className="excel-sheet-tab">Pivot_Summary</div>
        <div style={{ color: '#8a8886', padding: '0 6px', cursor: 'pointer' }}>+</div>
        <div className="excel-status-ready">STATUS: READY</div>
      </div>

      {/* ⏳ 로딩 오버레이 */}
      {phase === 'starting' && <LiarGameLoading />}
    </div>
  );
};

export default LiarGame;
