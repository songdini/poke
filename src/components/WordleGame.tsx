import React, { useState, useEffect } from 'react';
import { getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
import './WordleGame.css';

interface WordleGameProps {
  username: string;
  room: string;
  onLeaveRoom?: () => void;
}

type CellStatus = 'correct' | 'present' | 'absent' | 'empty';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
];

interface WordleUpdatePayload {
  phase?: 'playing' | 'won' | 'lost';
  attempts?: string[];
  results?: CellStatus[][];
  targetWord?: string | null;
  winner?: string | null;
  message?: string;
}

const WordleGame: React.FC<WordleGameProps> = ({ username, room, onLeaveRoom }) => {
  const { socket } = useSocket();

  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [results, setResults] = useState<CellStatus[][]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [targetWord, setTargetWord] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ⌨️ 가상 키보드 표시 여부 (모바일에서는 기본 활성화)
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // 소켓 연동
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      socket.emit('join', {
        username,
        room,
        gameType: 'wordle',
        sessionToken: getSessionToken('wordle')
      });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleUpdate = (data: WordleUpdatePayload) => {
      if (data.phase) setPhase(data.phase);
      if (data.attempts) setAttempts(data.attempts);
      if (data.results) setResults(data.results);
      if (data.targetWord) setTargetWord(data.targetWord);
      if (data.winner) setWinner(data.winner);
      if (data.message) setMessage(data.message);
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    };

    socket.on('connect', joinRoom);
    socket.on('wordle-update', handleUpdate);
    socket.on('wordle-error', handleError);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('wordle-update', handleUpdate);
      socket.off('wordle-error', handleError);
    };
  }, [socket, username, room]);

  // 키보드 글자 입력
  const handleKeyPress = React.useCallback((char: string) => {
    if (phase !== 'playing') return;
    if (currentInput.length < 5) {
      setCurrentInput(prev => prev + char);
    }
  }, [phase, currentInput.length]);

  // 백스페이스
  const handleBackspace = React.useCallback(() => {
    setCurrentInput(prev => prev.slice(0, -1));
  }, []);

  // 단어 제출
  const handleSubmitGuess = React.useCallback(() => {
    if (phase !== 'playing') return;
    if (currentInput.length !== 5) {
      setError('5글자 단어를 입력해야 합니다.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    socket?.emit('wordle-submit-guess', { room, guess: currentInput, username });
    setCurrentInput('');
  }, [phase, currentInput, socket, room, username]);

  // 물리 키보드 입력 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;

      if (e.key === 'Enter') {
        handleSubmitGuess();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleSubmitGuess, handleBackspace, handleKeyPress]);

  // 게임 재시작
  const handleStartGame = () => {
    setCurrentInput('');
    socket?.emit('wordle-start', { room });
  };

  // 가상 키보드 키 상태 계산
  const getKeyStatus = (key: string): CellStatus => {
    let status: CellStatus = 'empty';
    for (let r = 0; r < attempts.length; r++) {
      const word = attempts[r];
      const res = results[r];
      if (!word || !res) continue;

      for (let c = 0; c < 5; c++) {
        if (word[c] === key) {
          if (res[c] === 'correct') return 'correct';
          if (res[c] === 'present') status = 'present';
          else if (res[c] === 'absent' && status === 'empty') status = 'absent';
        }
      }
    }
    return status;
  };

  return (
    <div className="wordle-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">
          {`A${attempts.length + 1}:E${attempts.length + 1}`}
        </div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-formula-input">
          {currentInput
            ? `=VLOOKUP_WORDLE_ATTEMPT("${currentInput}", Secret_Target_Word)`
            : '=VLOOKUP_WORDLE_ATTEMPT(Cell_A1_E6, Secret_Target_Word)'}
        </div>
      </div>

      {/* 📋 Sheet Header Bar */}
      <div className="game-header">
        <div className="sheet-title-info">
          <span style={{ fontSize: '1.2rem' }}>🔤</span>
          <h2>Table 08: Wordle_Text_Parser_2026.xlsx</h2>
        </div>
        <div className="game-info">
          <span className="excel-cell-badge phase">
            {phase === 'playing' ? `시도: ${attempts.length + 1} / 6` : phase === 'won' ? '정답 완료' : '시도 초과'}
          </span>
          <span className="excel-cell-badge">방 #{room}</span>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close">
              🚪 나가기
            </button>
          )}
        </div>
      </div>

      {/* ⚠️ 에러 메시지 */}
      {error && (
        <div style={{ background: '#fde7e9', color: '#a80000', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 📱 Main Workspace */}
      <div className="wordle-workspace">
        {/* 리본 액션 바 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="excel-btn primary" onClick={handleStartGame}>
            ▶ 새 퍼즐 생성 (New Game)
          </button>
          <button
            className="excel-btn"
            onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
          >
            {showVirtualKeyboard ? '⌨️ 가상 키보드 숨기기' : '⌨️ 가상 키보드 보이기'}
          </button>
          <span style={{ fontSize: '0.8rem', color: '#605e5c' }}>
            (키보드로 직접 입력 후 Enter)
          </span>
        </div>

        {/* 🔤 Compact Excel Cell Grid Table (Authentic Cell Grid Look) */}
        <div className="wordle-board-wrapper">
          <table className="wordle-grid-table">
            <thead>
              <tr>
                <th className="corner-cell"></th>
                <th>A</th>
                <th>B</th>
                <th>C</th>
                <th>D</th>
                <th>E</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, rowIdx) => {
                const isSubmitted = rowIdx < attempts.length;
                const isCurrentRow = rowIdx === attempts.length && phase === 'playing';
                const rowWord = isSubmitted ? attempts[rowIdx] : isCurrentRow ? currentInput : '';
                const rowResult = isSubmitted ? results[rowIdx] : [];

                return (
                  <tr key={rowIdx}>
                    <td className="row-header">{rowIdx + 1}</td>
                    {Array.from({ length: 5 }).map((_, colIdx) => {
                      const letter = rowWord[colIdx] || '';
                      const status = isSubmitted ? rowResult[colIdx] : 'empty';

                      return (
                        <td
                          key={colIdx}
                          className={`wordle-cell ${status} ${isCurrentRow ? 'active-row' : ''}`}
                        >
                          {letter}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 퍼즐 결과 배너 */}
        {phase === 'won' && (
          <div className="wordle-result-banner win">
            🎉 정답입니다! [{winner}] 님이 정답 단어 "{targetWord}"를 맞혔습니다!
          </div>
        )}
        {phase === 'lost' && (
          <div className="wordle-result-banner loss">
            💥 아쉽게 실패했습니다. 정답 단어는 "{targetWord}" 였습니다.
          </div>
        )}

        {/* ⌨️ Virtual QWERTY Keyboard (토글 가능) */}
        {showVirtualKeyboard && (
          <div className="wordle-keyboard">
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="keyboard-row">
                {row.map(key => {
                  const isWide = key === 'ENTER' || key === 'BACKSPACE';
                  const status = getKeyStatus(key);

                  return (
                    <button
                      key={key}
                      className={`key-btn ${isWide ? 'wide' : ''} ${status}`}
                      onClick={() => {
                        if (key === 'ENTER') handleSubmitGuess();
                        else if (key === 'BACKSPACE') handleBackspace();
                        else handleKeyPress(key);
                      }}
                    >
                      {key === 'BACKSPACE' ? '⌫' : key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {message && (
          <div style={{ fontSize: '0.82rem', color: '#107c41', fontWeight: 600 }}>
            {message}
          </div>
        )}
      </div>

      {/* 📑 Bottom Excel Sheet Tabs */}
      <div className="excel-sheet-tab-bar">
        <div className="excel-sheet-tab active">Wordle_Matrix_5L</div>
        <div className="excel-sheet-tab">Text_Parser_Log</div>
        <div className="excel-sheet-tab">Dictionary_DB</div>
        <div style={{ color: '#8a8886', padding: '0 6px', cursor: 'pointer' }}>+</div>
        <div className="excel-status-ready">STATUS: READY</div>
      </div>
    </div>
  );
};

export default WordleGame;
