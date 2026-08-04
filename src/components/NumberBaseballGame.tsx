import React, { useState, useEffect } from 'react';
import { getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
import './NumberBaseballGame.css';

interface Player {
  id: string;
  username: string;
}

interface AttemptRecord {
  id: string;
  attempt: number;
  guesser: string;
  guess: string;
  strike: number;
  ball: number;
  isOut: boolean;
  timestamp: string;
}

interface NumberBaseballGameProps {
  username: string;
  room: string;
  onLeaveRoom?: () => void;
}

const NumberBaseballGame: React.FC<NumberBaseballGameProps> = ({ username, room, onLeaveRoom }) => {
  const { socket } = useSocket();
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<'waiting' | 'set-secret' | 'waiting-opponent-secret' | 'playing' | 'game-over'>('waiting');
  const [mode, setMode] = useState<'single' | 'battle'>('single');
  const [hostId, setHostId] = useState('');
  const [myId, setMyId] = useState('');

  const [secretInput, setSecretInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const [currentTurnPlayer, setCurrentTurnPlayer] = useState<Player | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [secretNumberRevealed, setSecretNumberRevealed] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket) return;

    setMyId(socket.id ?? '');

    const joinRoom = () => {
      setMyId(socket.id ?? '');
      socket.emit('join', { username, room, gameType: 'baseball', sessionToken: getSessionToken() });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleUpdate = (data: any) => {
      if (data.players) setPlayers(data.players);
      if (data.hostId) {
        setHostId(data.hostId);
      }
      if (data.phase) setPhase(data.phase);
      if (data.mode) setMode(data.mode);
      if (data.history) setHistory(data.history);
      if (data.currentTurnPlayer) setCurrentTurnPlayer(data.currentTurnPlayer);
      if (data.winner) setWinner(data.winner);
      if (data.secretNumber) setSecretNumberRevealed(data.secretNumber);
      if (data.message) setMessage(data.message);
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    };

    socket.on('connect', joinRoom);
    socket.on('baseball-update', handleUpdate);
    socket.on('baseball-error', handleError);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('baseball-update', handleUpdate);
      socket.off('baseball-error', handleError);
    };
  }, [socket, username, room]);

  const handleStartGame = (selectedMode: 'single' | 'battle') => {
    socket?.emit('baseball-start', { room, mode: selectedMode });
  };

  const handleSetSecret = () => {
    if (!/^\d{3}$/.test(secretInput) || new Set(secretInput).size !== 3) {
      setError('중복 없는 3자리 숫자를 입력해야 합니다 (예: 382).');
      setTimeout(() => setError(''), 3000);
      return;
    }
    socket?.emit('baseball-set-secret', { room, secret: secretInput });
    setSecretInput('');
  };

  const handleGuessSubmit = () => {
    if (!/^\d{3}$/.test(guessInput) || new Set(guessInput).size !== 3) {
      setError('중복 없는 3자리 숫자를 입력해야 합니다 (예: 719).');
      setTimeout(() => setError(''), 3000);
      return;
    }
    socket?.emit('baseball-guess', { room, guess: guessInput });
    setGuessInput('');
  };

  const handleResetGame = () => {
    socket?.emit('baseball-reset', { room });
  };

  return (
    <div className="number-baseball-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">B3: BASEBALL</div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-formula-input">
          =CALCULATE_STRIKE_BALL(Audit_Target, Guess_Input)
        </div>
      </div>

      {/* 📋 Sheet Header Bar */}
      <div className="game-header">
        <div className="sheet-title-info">
          <span className="sheet-icon">⚾</span>
          <h2>Financial_Audit_Number_Baseball.xlsx</h2>
        </div>
        <div className="game-info">
          <span className="excel-cell-badge phase">
            {phase === 'waiting' ? '대기 중' : phase === 'playing' ? '진행 중' : '결과 발표'}
          </span>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close">
              🚪 방 나가기
            </button>
          )}
        </div>
      </div>

      {/* 🎮 Waiting Room */}
      {phase === 'waiting' && (
        <div className="baseball-waiting-room">
          <h3>🎮 숫자야구 모드 선택</h3>
          <p className="excel-desc">3자리 중복 없는 숫자를 맞추는 뇌풀기 추리 게임입니다.</p>

          <div className="mode-selection-grid">
            <button onClick={() => handleStartGame('single')} className="excel-btn primary">
              🤖 솔로 / AI 추리 모드 (1인 연습)
              <span className="sub-desc">서버가 생성한 비밀 숫자를 혼자서 최소 시도로 맞추기</span>
            </button>

            <button
              onClick={() => handleStartGame('battle')}
              disabled={players.length < 2}
              className="excel-btn secondary"
            >
              ⚔️ 1v1 대결 모드 (2인 플레이)
              <span className="sub-desc">상대방의 비밀 숫자를 번갈아가며 먼저 맞추기 (최소 2인)</span>
            </button>
          </div>

          <div className="player-list-section">
            <h4>👥 현재 참가자 목록 ({players.length}명)</h4>
            <div className="player-chips">
              {players.map(p => (
                <span key={p.id} className={`player-chip ${p.id === myId ? 'me' : ''}`}>
                  {p.username} {p.id === myId ? '(나)' : ''} {p.id === hostId ? '👑' : ''}
                </span>
              ))}
            </div>
          </div>
          {error && <p className="error-alert">{error}</p>}
        </div>
      )}

      {/* 🔑 Secret Setting Phase (Battle Mode) */}
      {phase === 'set-secret' && (
        <div className="baseball-secret-section">
          <h3>🔑 비밀 숫자 설정</h3>
          <p>상대방이 맞추어야 할 <strong>중복 없는 3자리 숫자</strong>를 입력하세요 (예: 382).</p>
          <div className="input-group">
            <input
              type="text"
              maxLength={3}
              value={secretInput}
              onChange={e => setSecretInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="3자리 숫자 입력"
              className="excel-input"
            />
            <button onClick={handleSetSecret} className="excel-btn primary">
              비밀 숫자 확정
            </button>
          </div>
          {error && <p className="error-alert">{error}</p>}
        </div>
      )}

      {phase === 'waiting-opponent-secret' && (
        <div className="baseball-waiting-opponent">
          <h3>⏳ 상대방 비밀 숫자 설정 대기 중...</h3>
          <p>상대방이 비밀 숫자를 확정할 때까지 잠시 기다려주세요.</p>
        </div>
      )}

      {/* ⚾ Playing & Game Over Phase */}
      {(phase === 'playing' || phase === 'game-over') && (
        <div className="baseball-game-body">
          <div className="status-bar">
            {message && <span className="status-msg">{message}</span>}
            {mode === 'battle' && currentTurnPlayer && phase === 'playing' && (
              <span className={`turn-badge ${currentTurnPlayer.id === myId ? 'my-turn' : ''}`}>
                🎯 현재 턴: {currentTurnPlayer.username}님 {currentTurnPlayer.id === myId ? '(내 턴!)' : ''}
              </span>
            )}
          </div>

          {/* Input Box */}
          {phase === 'playing' && (mode === 'single' || currentTurnPlayer?.id === myId) && (
            <div className="guess-input-section">
              <span className="prefix">Input =</span>
              <input
                type="text"
                maxLength={3}
                value={guessInput}
                onChange={e => setGuessInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyPress={e => e.key === 'Enter' && handleGuessSubmit()}
                placeholder="3자리 추측 숫자 입력 (Enter)"
                className="excel-input"
              />
              <button onClick={handleGuessSubmit} className="excel-btn primary">
                ▶ Execute Guess Check
              </button>
            </div>
          )}

          {error && <p className="error-alert">{error}</p>}

          {/* 📊 Excel Attempt Log Grid Table */}
          <div className="excel-table-container">
            <table className="excel-grid-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Row</th>
                  {mode === 'battle' && <th>Player</th>}
                  <th>Guess_Digits</th>
                  <th>Strike (S)</th>
                  <th>Ball (B)</th>
                  <th>Audit_Result</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={mode === 'battle' ? 6 : 5} style={{ textAlign: 'center', color: '#a19f9d', padding: '20px' }}>
                      아직 추측 기록이 없습니다. 3자리 숫자를 입력해보세요!
                    </td>
                  </tr>
                ) : (
                  history.slice().reverse().map((record) => (
                    <tr key={record.id} className={record.strike === 3 ? 'win-row' : ''}>
                      <td className="row-num">#{record.attempt}</td>
                      {mode === 'battle' && <td className="user-col">{record.guesser}</td>}
                      <td className="guess-col">{record.guess}</td>
                      <td>
                        <span className={`badge strike ${record.strike > 0 ? 'active' : ''}`}>
                          {record.strike} S
                        </span>
                      </td>
                      <td>
                        <span className={`badge ball ${record.ball > 0 ? 'active' : ''}`}>
                          {record.ball} B
                        </span>
                      </td>
                      <td>
                        {record.strike === 3 ? (
                          <span className="status-tag win">🏆 PERFECT 3S (승리)</span>
                        ) : record.isOut ? (
                          <span className="status-tag out">🚫 OUT</span>
                        ) : (
                          <span className="status-tag ongoing">{record.strike}S {record.ball}B</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 🏆 Game Over Box */}
          {phase === 'game-over' && (
            <div className="game-over-box">
              <h3>🎉 GAME OVER</h3>
              <p>우승자: <strong>{winner}</strong>님!</p>
              {secretNumberRevealed && <p className="secret-reveal">정답 비밀 숫자: <strong>{secretNumberRevealed}</strong></p>}
              <button onClick={handleResetGame} className="excel-btn primary">
                🔄 대기실로 돌아가기 (다시하기)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NumberBaseballGame;
