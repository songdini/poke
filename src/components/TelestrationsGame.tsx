import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './TelestrationsGame.css';

interface Player {
  id: string;
  username: string;
}

interface GameBookPage {
  type: 'word' | 'drawing';
  author: string;
  data: string;
}

interface GameBook {
  owner: string;
  pages: GameBookPage[];
}

type GamePhase = 'waiting' | 'word-input' | 'drawing' | 'guessing' | 'results';

interface TelestrationsGameProps {
  username: string;
  room: string;
}

interface TelestrationsUpdatePayload {
  players?: Player[];
  hostId?: string;
  phase?: GamePhase;
  results?: GameBook[] | null;
  currentBookPage?: GameBookPage | null;
}

interface TelestrationsErrorPayload {
  message: string;
}

const TelestrationsGame: React.FC<TelestrationsGameProps> = ({ username, room }) => {
  const [socket, setSocket] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [isHost, setIsHost] = useState(false);
  const [myId, setMyId] = useState('');

  const [currentBookPage, setCurrentBookPage] = useState<GameBookPage | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<GameBook[] | null>(null);
  const [error, setError] = useState('');

  const [inputValue, setInputValue] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingContext, setDrawingContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001';
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setMyId(newSocket.id);
      newSocket.emit('join', { username, room, gameType: 'telestrations' });
    });

    newSocket.on('telestrations-update', (data: TelestrationsUpdatePayload) => {
      if (data.players) setPlayers(data.players);
      if (data.hostId) setIsHost(newSocket.id === data.hostId);
      if (data.phase) {
        setPhase(data.phase);
        setIsSubmitted(false);
        setInputValue('');
        if (data.phase === 'results') {
          setResults(data.results ?? null);
        } else {
          setResults(null);
        }
      }
      if (data.currentBookPage) {
        setCurrentBookPage(data.currentBookPage);
      }
    });

    newSocket.on('telestrations-error', (data: TelestrationsErrorPayload) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [username, room]);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      setDrawingContext(ctx);
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    }
  }, [phase]);

  const handleStartGame = () => {
    socket?.emit('telestrations-game-start', { room });
  };

  const handleSubmitTurn = () => {
    let data = '';
    if (phase === 'word-input' || phase === 'guessing') {
      data = inputValue;
    } else if (phase === 'drawing') {
      data = canvasRef.current?.toDataURL() || '';
    }

    if (data.trim() === '') {
      setError('내용을 입력하거나 그려주세요.');
      setTimeout(() => setError(''), 2000);
      return;
    }

    socket?.emit('telestrations-submit-turn', { room, data });
    setIsSubmitted(true);
  };

  const handleRestartGame = () => {
    socket?.emit('telestrations-game-restart', { room });
  };

  // --- Drawing Canvas Logic ---
  const startDrawing = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (!drawingContext) return;
    const { offsetX, offsetY } = nativeEvent as MouseEvent;
    drawingContext.beginPath();
    drawingContext.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    saveHistory();
  };

  const draw = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawingContext) return;
    const { offsetX, offsetY } = nativeEvent as MouseEvent;
    drawingContext.strokeStyle = drawColor;
    drawingContext.lineWidth = 3;
    drawingContext.lineCap = 'round';
    drawingContext.lineTo(offsetX, offsetY);
    drawingContext.stroke();
  };

  const stopDrawing = () => {
    if (!drawingContext) return;
    drawingContext.closePath();
    setIsDrawing(false);
  };

  const saveHistory = () => {
    if (!drawingContext) return;
    const imageData = drawingContext.getImageData(0, 0, drawingContext.canvas.width, drawingContext.canvas.height);
    setDrawHistory(prev => [...prev, imageData]);
  };

  const handleUndo = () => {
    if (drawHistory.length > 0 && drawingContext) {
      const newHistory = drawHistory.slice(0, -1);
      setDrawHistory(newHistory);
      if (newHistory.length > 0) {
        drawingContext.putImageData(newHistory[newHistory.length - 1], 0, 0);
      } else {
        clearCanvas();
      }
    }
  };

  const clearCanvas = () => {
    if (!drawingContext) return;
    drawingContext.fillStyle = 'white';
    drawingContext.fillRect(0, 0, drawingContext.canvas.width, drawingContext.canvas.height);
    setDrawHistory([]);
  };

  const renderWaitingRoom = () => (
    <div className="telestrations-waiting-room">
      <h2>대기 중...</h2>
      <p>플레이어가 모두 모이면 방장이 게임을 시작합니다. (최소 3명)</p>
      <div className="player-list">
        <h3>참가자 ({players.length}명)</h3>
        <ul>
          {players.map(p => <li key={p.id}>{p.username} {p.id === myId ? '(나)' : ''} {isHost && p.id === myId ? '👑' : ''}</li>)}
        </ul>
      </div>
      {isHost && <button onClick={handleStartGame} disabled={players.length < 3}>게임 시작</button>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );

  const renderGamePhase = () => {
    if (isSubmitted) {
      return <div className="telestrations-waiting-turn"><h3>다른 플레이어들을 기다리는 중...</h3></div>;
    }

    switch (phase) {
      case 'word-input':
        return <div className="telestrations-phase-container">
          <h3>비밀 단어 입력</h3>
          <p>다른 사람이 그림으로 그릴 단어를 입력해주세요.</p>
          <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} maxLength={20} />
          <button onClick={handleSubmitTurn}>제출</button>
        </div>;

      case 'drawing':
        return <div className="telestrations-phase-container">
          <h3>그림 그리기</h3>
          <p>제시 단어: <strong>{currentBookPage?.data}</strong></p>
          <div className="canvas-toolbar">
            <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} />
            <button onClick={handleUndo}>되돌리기</button>
            <button onClick={clearCanvas}>전체 삭제</button>
          </div>
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          <button onClick={handleSubmitTurn}>그림 제출</button>
        </div>;

      case 'guessing':
        return <div className="telestrations-phase-container">
          <h3>그림 보고 단어 맞히기</h3>
          <p>아래 그림이 무엇인지 맞춰보세요.</p>
          <img src={currentBookPage?.data} alt="그림" className="guess-image" />
          <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} maxLength={20} />
          <button onClick={handleSubmitTurn}>추측 제출</button>
        </div>;

      default: return null;
    }
  };

  const renderResults = () => (
    <div className="telestrations-results">
      <h2>결과 확인!</h2>
      <div className="results-grid">
        {results?.map((book, index) => (
          <div key={index} className="result-book">
            <h3>{book.owner}의 게임북</h3>
            {book.pages.map((page, pageIndex) => (
              <div key={pageIndex} className="result-page">
                <p className="author">{page.author}님의 {page.type === 'word' ? '제시어' : '그림'}:</p>
                {page.type === 'word' ? (
                  <p className="word-data">{page.data}</p>
                ) : (
                  <img src={page.data} alt="결과 그림" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {isHost && <button onClick={handleRestartGame}>다시하기</button>}
    </div>
  );

  return (
    <div className="telestrations-container">
      <div className="telestrations-header">
        <h1>📝</h1>
        <p>'{room}' 방 - {username}님</p>
      </div>
      <div className="telestrations-main">
        {phase === 'waiting' && renderWaitingRoom()}
        {(phase === 'word-input' || phase === 'drawing' || phase === 'guessing') && renderGamePhase()}
        {phase === 'results' && renderResults()}
      </div>
    </div>
  );
};

export default TelestrationsGame;