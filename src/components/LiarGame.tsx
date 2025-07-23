import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Clock, Crown, Eye, EyeOff } from 'lucide-react';
import io from 'socket.io-client';

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
  wordProvider: string;
  voteCount: VoteCount;
}

interface LiarGameProps {
  username: string;
  room: string;
}

const LiarGame: React.FC<LiarGameProps> = ({ username, room }) => {
  // 게임 상태
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<'waiting' | 'word-input' | 'word-distribute' | 'talk' | 'vote' | 'result'>('waiting');
  const [wordProvider, setWordProvider] = useState<string | null>(null);
  
  // 제시어 관련
  const [word, setWord] = useState('');
  const [liarWord, setLiarWord] = useState('');
  const [myWord, setMyWord] = useState<string | null>(null);
  const [isLiar, setIsLiar] = useState(false);
  const [showMyWord, setShowMyWord] = useState(false);
  
  // 대화 관련
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [timer, setTimer] = useState(120);
  
  // 투표 관련
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [voteCount, setVoteCount] = useState<VoteCount>({});
  const [votedCount, setVotedCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  
  // 결과
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  // 소켓 연결 및 이벤트 처리
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001';
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.emit('join', {
      username,
      room,
      gameType: 'liar'
    });

    socket.on('liar-update', (data: any) => {
      const { type, data: payload } = data;
      switch (type) {
        case 'join':
        case 'leave':
        case 'restart':
          setPlayers(payload.players);
          setPhase(payload.phase);
          setWordProvider(payload.wordProvider);
          break;
        case 'game-start':
          setPhase('word-input');
          setWordProvider(payload.wordProvider);
          break;
        case 'word-distribute':
          setPhase('word-distribute');
          setMyWord(payload.myWord);
          setIsLiar(payload.isLiar);
          break;
        case 'talk-start':
          setPhase('talk');
          setTimer(payload.timer);
          break;
        case 'timer-update':
          setTimer(payload.timer);
          break;
        case 'message':
          setMessages(prev => [...prev, {
            username: payload.username,
            message: payload.message,
            timestamp: payload.timestamp
          }]);
          break;
        case 'vote-start':
          setPhase('vote');
          setPlayers(payload.players);
          break;
        case 'vote-update':
          setVotedCount(payload.votedCount);
          setVoteCount(payload.voteCount);
          break;
        case 'result':
          setPhase('result');
          setResult(payload);
          break;
      }
    });

    socket.on('liar-error', (data: any) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, [username, room]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 이벤트 핸들러들
  const handleGameStart = () => {
    socketRef.current?.emit('liar-game-start', { room });
  };

  const handleWordSubmit = () => {
    if (!word.trim()) {
      setError('제시어를 입력해주세요.');
      return;
    }
    
    socketRef.current?.emit('liar-word-submit', {
      room,
      word: word.trim(),
      liarWord: liarWord.trim()
    });
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
    
    // 상태 초기화
    setWord('');
    setLiarWord('');
    setMyWord(null);
    setIsLiar(false);
    setShowMyWord(false);
    setMessages([]);
    setCurrentMessage('');
    setTimer(120);
    setVoteTarget(null);
    setVoteCount({});
    setVotedCount(0);
    setHasVoted(false);
    setResult(null);
    setError('');
  };

  const myPlayer = players.find(p => p.username === username);
  const isHost = myPlayer?.isHost || false;
  const amWordProvider = wordProvider && players.find(p => p.id === wordProvider)?.username === username;

  return (
    <div className="liar-game">
      <style>{`
        .liar-game {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: #333;
        }

        .game-header {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .game-header h2 {
          margin: 0 0 10px 0;
          color: #4c51bf;
          font-size: 24px;
        }

        .room-info {
          display: flex;
          gap: 20px;
          color: #666;
        }

        .error-message {
          background: #fee;
          color: #c53030;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #fed7d7;
          margin-bottom: 20px;
          text-align: center;
        }

        .players-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .players-section h3 {
          margin: 0 0 15px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4c51bf;
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .player-card {
          background: #f7fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all 0.2s;
        }

        .player-card.me {
          background: #ebf8ff;
          border-color: #4299e1;
        }

        .player-name {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }

        .host-icon {
          color: #f6ad55;
        }

        .me-badge {
          background: #4299e1;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: auto;
        }

        .vote-btn {
          background: #4299e1;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .vote-btn:hover:not(:disabled) {
          background: #3182ce;
        }

        .vote-btn:disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }

        .vote-btn.selected {
          background: #38a169;
        }

        .vote-count {
          background: #fc8181;
          color: white;
          text-align: center;
          padding: 4px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .phase-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .waiting-content, .word-input-content, .word-distribute-content, .vote-content, .result-content {
          text-align: center;
        }

        .phase-description {
          color: #666;
          margin: 10px 0;
        }

        .primary-btn {
          background: #4c51bf;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary-btn:hover {
          background: #434190;
          transform: translateY(-1px);
        }

        .input-group {
          margin: 15px 0;
        }

        .word-input {
          width: 100%;
          max-width: 300px;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          margin-bottom: 10px;
        }

        .word-input:focus {
          outline: none;
          border-color: #4c51bf;
        }

        .input-group small {
          display: block;
          color: #666;
          font-size: 12px;
          margin-top: 5px;
        }

        .my-word-section {
          margin: 20px 0;
        }

        .word-reveal {
          background: #f7fafc;
          border-radius: 8px;
          padding: 20px;
        }

        .liar-notice {
          background: linear-gradient(135deg, #fc8181, #f56565);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        .citizen-notice {
          background: linear-gradient(135deg, #68d391, #48bb78);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        .liar-notice h4, .citizen-notice h4 {
          margin: 0 0 10px 0;
          font-size: 18px;
        }

        .my-word-display {
          margin-top: 15px;
        }

        .word-toggle-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 auto 10px auto;
          transition: all 0.2s;
        }

        .word-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .word-toggle-btn.small {
          padding: 6px 12px;
          font-size: 12px;
          background: #4c51bf;
          color: white;
          border-color: #4c51bf;
        }

        .word-display {
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          padding: 12px;
          border-radius: 6px;
          font-size: 18px;
          font-weight: 600;
          text-align: center;
        }

        .word-display.small {
          font-size: 14px;
          padding: 8px;
        }

        .talk-content {
          max-width: none;
        }

        .talk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
        }

        .talk-header h3 {
          margin: 0;
          color: #4c51bf;
        }

        .timer {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #4c51bf;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 18px;
        }

        .my-word-reminder {
          text-align: center;
          margin-bottom: 20px;
        }

        .chat-section {
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          height: 400px;
          display: flex;
          flex-direction: column;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          background: #f7fafc;
        }

        .message {
          margin-bottom: 15px;
          padding: 10px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .message.my-message {
          background: #ebf8ff;
          border-left: 3px solid #4299e1;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .message-header strong {
          color: #4c51bf;
        }

        .timestamp {
          font-size: 12px;
          color: #666;
        }

        .message-content {
          color: #333;
          line-height: 1.4;
        }

        .message-input {
          display: flex;
          gap: 10px;
          padding: 15px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .message-input input {
          flex: 1;
          padding: 10px;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
        }

        .message-input input:focus {
          outline: none;
          border-color: #4c51bf;
        }

        .message-input button {
          background: #4c51bf;
          color: white;
          border: none;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .message-input button:hover:not(:disabled) {
          background: #434190;
        }

        .message-input button:disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }

        .vote-status {
          background: #edf2f7;
          padding: 10px;
          border-radius: 6px;
          margin: 15px 0;
          font-weight: 500;
        }

        .vote-confirmation {
          background: #c6f6d5;
          color: #276749;
          padding: 12px;
          border-radius: 6px;
          margin: 15px 0;
          font-weight: 500;
        }

        .result-message {
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .result-message.citizens {
          background: linear-gradient(135deg, #68d391, #48bb78);
          color: white;
        }

        .result-message.liar {
          background: linear-gradient(135deg, #fc8181, #f56565);
          color: white;
        }

        .result-message h4 {
          margin: 0;
        }

        .result-details {
          background: #f7fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .result-item {
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .result-item:last-child {
          border-bottom: none;
        }

        .result-item strong {
          color: #4c51bf;
        }

        .vote-results {
          background: #edf2f7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .vote-results h4 {
          margin: 0 0 15px 0;
          color: #4c51bf;
        }

        .vote-result-item {
          padding: 5px 0;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #cbd5e0;
        }

        .vote-result-item:last-child {
          border-bottom: none;
        }

        @media (max-width: 768px) {
          .liar-game {
            padding: 10px;
          }

          .players-grid {
            grid-template-columns: 1fr;
          }

          .talk-header {
            flex-direction: column;
            gap: 10px;
            text-align: center;
          }

          .room-info {
            flex-direction: column;
            gap: 5px;
          }

          .chat-section {
            height: 300px;
          }
        }
      `}</style>

      {/* 헤더 */}
      <div className="game-header">
        <h2>🤥 라이어 </h2>
        <div className="room-info">
          <span>방: <strong>{room}</strong></span>
          <span>닉네임: <strong>{username}</strong></span>
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
                게임 시작
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
            {amWordProvider ? (
              <div>
                <p className="phase-description">당신이 제시어를 입력해야 합니다!</p>
                <div className="input-group">
                  <input
                    type="text"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="제시어를 입력하세요"
                    className="word-input"
                  />
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    value={liarWord}
                    onChange={(e) => setLiarWord(e.target.value)}
                    placeholder="라이어용 다른 제시어 (선택사항)"
                    className="word-input"
                  />
                  <small>라이어에게 다른 제시어를 주고 싶다면 입력하세요. 비워두면 라이어는 제시어를 받지 않습니다.</small>
                </div>
                <button className="primary-btn" onClick={handleWordSubmit}>
                  제시어 확정
                </button>
              </div>
            ) : (
              <div>
                <p className="phase-description">
                  {players.find(p => p.id === wordProvider)?.username}님이 제시어를 입력 중입니다...
                </p>
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
                  {isLiar && !myWord && (
                    <div className="liar-notice">
                      <h4>🎭 당신은 라이어입니다!</h4>
                      <p>제시어를 받지 못했습니다. 다른 사람들의 대화를 들으며 제시어를 추측해보세요!</p>
                    </div>
                  )}
                  {isLiar && myWord && (
                    <div className="liar-notice">
                      <h4>🎭 당신은 라이어입니다!</h4>
                      <p>당신만 다른 제시어를 받았습니다.</p>
                      <div className="my-word-display">
                        <button
                          className="word-toggle-btn"
                          onClick={() => setShowMyWord(!showMyWord)}
                        >
                          {showMyWord ? <EyeOff size={16} /> : <Eye size={16} />}
                          {showMyWord ? '제시어 숨기기' : '내 제시어 보기'}
                        </button>
                        {showMyWord && <div className="word-display">{myWord}</div>}
                      </div>
                    </div>
                  )}
                  {!isLiar && (
                    <div className="citizen-notice">
                      <h4>👥 당신은 시민입니다!</h4>
                      <div className="my-word-display">
                        <button
                          className="word-toggle-btn"
                          onClick={() => setShowMyWord(!showMyWord)}
                        >
                          {showMyWord ? <EyeOff size={16} /> : <Eye size={16} />}
                          {showMyWord ? '제시어 숨기기' : '내 제시어 보기'}
                        </button>
                        {showMyWord && <div className="word-display">{myWord}</div>}
                      </div>
                    </div>
                  )}
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
            {result && (
              <div className="result-message">
                <h4>{result.winner === 'liar' ? '라이어 승리!' : '시민 승리!'}</h4>
                <p>{result.message}</p>
                <p>라이어: {result.liar}</p>
                <p>제시어: {result.word}</p>
                <p>라이어 제시어: {result.liarWord}</p>
                <p>제시어 제공자: {result.wordProvider}</p>
              </div>
            )}
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
              <p>제시어 제공자: {result?.wordProvider}</p>
            </div>
            <button className="primary-btn" onClick={handleRestart}>
              게임 다시 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiarGame;