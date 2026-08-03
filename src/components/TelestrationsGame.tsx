import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getChatServerUrl, resolveImageUrl, getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
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
  onLeaveRoom?: () => void;
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

const TelestrationsGame: React.FC<TelestrationsGameProps> = ({ username, room, onLeaveRoom }) => {
  const { socket } = useSocket();
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState('');
  const [myId, setMyId] = useState('');

  const [currentBookPage, setCurrentBookPage] = useState<GameBookPage | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<GameBook[] | null>(null);
  const [error, setError] = useState('');
  const [visiblePages, setVisiblePages] = useState(1);

  const [inputValue, setInputValue] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingContext, setDrawingContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    if (!socket) return;

    setMyId(socket.id ?? '');

    const joinRoom = () => {
      setMyId(socket.id ?? '');
      socket.emit('join', { username, room, gameType: 'telestrations', sessionToken: getSessionToken() });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleUpdate = (data: TelestrationsUpdatePayload) => {
      if (data.players) setPlayers(data.players);
      if (data.hostId) {
        setHostId(data.hostId);
        setIsHost(socket.id === data.hostId);
      }
      if (data.phase) {
        setPhase(data.phase);
        setIsSubmitted(false);
        setInputValue('');
        if (data.phase === 'results') {
          setResults(data.results ?? null);
          setVisiblePages(1);
        } else {
          setResults(null);
        }
      }
      if (data.currentBookPage) {
        setCurrentBookPage(data.currentBookPage);
      }
    };

    const handleError = (data: TelestrationsErrorPayload) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    };

    socket.on('connect', joinRoom);
    socket.on('telestrations-update', handleUpdate);
    socket.on('telestrations-error', handleError);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('telestrations-update', handleUpdate);
      socket.off('telestrations-error', handleError);
    };
  }, [socket, username, room]);

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

  const handleSubmitTurn = async () => {
    let data = '';
    if (phase === 'word-input' || phase === 'guessing') {
      data = inputValue;
    } else if (phase === 'drawing') {
      const rawData = canvasRef.current?.toDataURL() || '';
      if (!rawData) {
        setError('그림을 그려주세요.');
        setTimeout(() => setError(''), 2000);
        return;
      }
      try {
        const serverUrl = getChatServerUrl();
        const res = await axios.post(`${serverUrl}/api/upload`, { image: rawData });
        data = res.data.url;
      } catch (err) {
        console.error('그림 업로드 실패:', err);
        setError('그림 업로드 중 오류가 발생했습니다.');
        setTimeout(() => setError(''), 2000);
        return;
      }
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
  const getPos = (nativeEvent: MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();

    if (window.TouchEvent && nativeEvent instanceof TouchEvent && nativeEvent.touches.length > 0) {
      return {
        x: nativeEvent.touches[0].clientX - rect.left,
        y: nativeEvent.touches[0].clientY - rect.top,
      };
    } else if (nativeEvent instanceof MouseEvent) {
      return {
        x: nativeEvent.clientX - rect.left,
        y: nativeEvent.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingContext) return;
    e.preventDefault();
    saveHistory();
    const { x, y } = getPos(e.nativeEvent as MouseEvent | TouchEvent);
    drawingContext.beginPath();
    drawingContext.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawingContext) return;
    e.preventDefault();
    const { x, y } = getPos(e.nativeEvent as MouseEvent | TouchEvent);
    drawingContext.strokeStyle = drawColor;
    drawingContext.lineWidth = 3;
    drawingContext.lineCap = 'round';
    drawingContext.lineTo(x, y);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>📑 Telestrations_Sequence</h2>
        {onLeaveRoom && (
          <button onClick={onLeaveRoom} className="leave-room-btn" style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
            🚪 방 나가기
          </button>
        )}
      </div>
      <h2>대기 중...</h2>
      <p>플레이어가 모두 모이면 방장이 게임을 시작합니다. (최소 3명)</p>
      <div className="player-list">
        <h3>참가자 ({players.length}명)</h3>
        <ul>
          {players.map(p => <li key={p.id}>{p.username} {p.id === myId ? '(나)' : ''} {p.id === hostId ? '👑' : ''}</li>)}
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
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />
          <button onClick={handleSubmitTurn}>그림 제출</button>
        </div>;

      case 'guessing':
        return <div className="telestrations-phase-container">
          <h3>그림 보고 단어 맞히기</h3>
          <p>아래 그림이 무엇인지 맞춰보세요.</p>
          <img src={resolveImageUrl(currentBookPage?.data || '')} alt="그림" className="guess-image" />
          <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} maxLength={20} />
          <button onClick={handleSubmitTurn}>추측 제출</button>
        </div>;

      default: return null;
    }
  };

  const renderResults = () => {
    const maxPages = results?.[0]?.pages.length || 0;

    const handleShowNext = () => {
      setVisiblePages(prev => Math.min(prev + 1, maxPages));
    };

    return (
      <div className="telestrations-results">
        <h2>결과 확인!</h2>
        <div className="results-grid">
          {results?.map((book, index) => (
            <div key={index} className="result-book">
              <h3>{book.owner}의 게임북</h3>
              {book.pages.slice(0, visiblePages).map((page, pageIndex) => (
                <div key={pageIndex} className={`result-page ${pageIndex === visiblePages - 1 ? 'reveal' : ''}`}>
                  <p className="author">{page.author}님의 {page.type === 'word' ? '제시어' : '그림'}:</p>
                  {page.type === 'word' ? (
                    <p className="word-data">{page.data}</p>
                  ) : (
                    <img src={resolveImageUrl(page.data)} alt="결과 그림" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="results-controls">
          {visiblePages < maxPages && (
            <button onClick={handleShowNext} className="next-page-btn">다음 내용 보기</button>
          )}
          {isHost && <button onClick={handleRestartGame}>다시하기</button>}
        </div>
      </div>
    );
  };

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
