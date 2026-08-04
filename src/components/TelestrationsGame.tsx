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
  mode?: 'standard' | 'copy-chain';
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
  const [mode, setMode] = useState<'standard' | 'copy-chain'>('standard');
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState('');
  const [myId, setMyId] = useState('');

  const [currentBookPage, setCurrentBookPage] = useState<GameBookPage | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<GameBook[] | null>(null);
  const [error, setError] = useState('');
  const [visiblePages, setVisiblePages] = useState(1);
  const [activeBookIndex, setActiveBookIndex] = useState(0);

  const [inputValue, setInputValue] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingContext, setDrawingContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    if (!socket) return;

    setMyId(socket.id ?? '');

    const joinRoom = () => {
      setMyId(socket.id ?? '');
      socket.emit('join', { username, room, gameType: 'telestrations', sessionToken: getSessionToken('telestrations') });
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
      if (data.mode) setMode(data.mode);
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
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      setDrawHistory([]);
    }
  }, [phase]);

  const handleStartGame = () => {
    socket?.emit('telestrations-game-start', { room });
  };

  const handleChangeMode = (newMode: 'standard' | 'copy-chain') => {
    if (isHost && phase === 'waiting') {
      socket?.emit('telestrations-change-mode', { room, mode: newMode });
    }
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
    drawingContext.lineWidth = brushSize;
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
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
      <div className="telestrations-mode-selector" style={{ background: '#f8f9fa', border: '1px solid #d4d4d4', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#201f1e' }}>🎮 게임 진행 모드 선택 {isHost ? '(방장 전용)' : ''}</h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleChangeMode('standard')}
            disabled={!isHost}
            className={`excel-btn ${mode === 'standard' ? 'primary' : ''}`}
            style={{ padding: '8px 14px', borderRadius: '4px', cursor: isHost ? 'pointer' : 'default', textAlign: 'left' }}
          >
            🔄 기본 릴레이 모드
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 400, opacity: 0.85, marginTop: '2px' }}>
              (단어 ➔ 그림 ➔ 추측 ➔ 그림 교대 진행)
            </span>
          </button>

          <button
            onClick={() => handleChangeMode('copy-chain')}
            disabled={!isHost}
            className={`excel-btn ${mode === 'copy-chain' ? 'primary' : ''}`}
            style={{ padding: '8px 14px', borderRadius: '4px', cursor: isHost ? 'pointer' : 'default', textAlign: 'left' }}
          >
            🖼️ 그림 따라그리기 모드
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 400, opacity: 0.85, marginTop: '2px' }}>
              (단어 ➔ 그림 ➔ 그림 ➔ 그림 ... ➔ 최종 추측)
            </span>
          </button>
        </div>
      </div>

      <div className="player-list-section">
        <h3>👥 참가자 목록 ({players.length}명) - 최소 3인</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
          {players.map(p => (
            <span key={p.id} className="excel-btn" style={{ background: p.id === myId ? '#e6f2eb' : '#ffffff', borderColor: p.id === myId ? '#107c41' : '#d4d4d4' }}>
              {p.username} {p.id === myId ? '(나)' : ''} {p.id === hostId ? '👑' : ''}
            </span>
          ))}
        </div>
      </div>

      {isHost && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button onClick={handleStartGame} disabled={players.length < 3} className="excel-btn primary" style={{ padding: '10px 24px', fontSize: '0.95rem' }}>
            ▶ Execute Telestrations Game Start
          </button>
        </div>
      )}
      {error && <p className="error-alert">{error}</p>}
    </div>
  );

  const renderGamePhase = () => {
    if (isSubmitted) {
      return <div className="telestrations-waiting-turn"><h3>다른 플레이어들을 기다리는 중...</h3></div>;
    }

    switch (phase) {
      case 'word-input':
        return <div className="telestrations-phase-container">
          <h3>비밀 제시어 작성</h3>
          <p className="excel-desc">다음 플레이어에게 전달할 비밀 단어를 입력하십시오.</p>
          <div className="excel-input-group">
            <span className="prefix">fx =</span>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSubmitTurn()}
              maxLength={20}
              placeholder="비밀 제시어 입력 (Enter)..."
              className="excel-input"
            />
            <button onClick={handleSubmitTurn} className="excel-btn primary">
              제출
            </button>
          </div>
        </div>;

      case 'drawing':
        const isCopyMode = currentBookPage?.type === 'drawing';
        return <div className="telestrations-phase-container">
          <h3>{isCopyMode ? '🖼️ 그림 보고 따라 그리기' : '🎨 그림 그리기'}</h3>
          {isCopyMode ? (
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#107c41' }}>
                앞 사람이 그린 아래 그림을 똑같이 따라 그려주세요!
              </p>
              <img
                src={resolveImageUrl(currentBookPage?.data || '')}
                alt="앞 사람 그림"
                style={{ maxWidth: '280px', maxHeight: '180px', border: '1px solid #d4d4d4', borderRadius: '4px', background: '#fff' }}
              />
            </div>
          ) : (
            <p className="excel-desc">제시 단어: <strong style={{ color: '#107c41', fontSize: '1.1rem' }}>"{currentBookPage?.data}"</strong></p>
          )}

          <div className="canvas-toolbar" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', margin: '8px 0' }}>
            {/* 🎨 Quick Color Palette */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #d4d4d4' }}>
              {['#000000', '#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea', '#ffffff'].map(color => (
                <button
                  key={color}
                  onClick={() => setDrawColor(color)}
                  title={color === '#ffffff' ? '지우개' : color}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: color,
                    border: drawColor === color ? '2px solid #107c41' : '1px solid #d4d4d4',
                    padding: 0,
                    cursor: 'pointer',
                    boxShadow: drawColor === color ? '0 0 0 2px #fff' : 'none'
                  }}
                />
              ))}
              <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)} style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
            </div>

            {/* ✏️ Brush Thickness Selector */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #d4d4d4' }}>
              {[2, 5, 10, 18].map(size => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`excel-btn ${brushSize === size ? 'primary' : ''}`}
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  {size === 2 ? '얇게' : size === 5 ? '보통' : size === 10 ? '두껍게' : '펜슬'}
                </button>
              ))}
            </div>

            <button onClick={handleUndo} className="excel-btn">되돌리기</button>
            <button onClick={clearCanvas} className="excel-btn close">전체 삭제</button>
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
          <button onClick={handleSubmitTurn} className="excel-btn primary" style={{ padding: '8px 24px', marginTop: '8px' }}>
            ▶ 그림 제출 완료
          </button>
        </div>;

      case 'guessing':
        return <div className="telestrations-phase-container">
          <h3>그림 보고 단어 맞히기</h3>
          <p className="excel-desc">전 단계 플레이어가 그린 아래 그림을 보고 정답 단어를 추측하십시오.</p>
          <div className="guess-image-frame">
            <img src={resolveImageUrl(currentBookPage?.data || '')} alt="그림" className="guess-image" />
          </div>
          <div className="excel-input-group">
            <span className="prefix">fx =</span>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSubmitTurn()}
              maxLength={20}
              placeholder="추측 단어 입력 (Enter)..."
              className="excel-input"
            />
            <button onClick={handleSubmitTurn} className="excel-btn primary">
              추측 제출
            </button>
          </div>
        </div>;

      default: return null;
    }
  };

  const renderResults = () => {
    const maxPages = results?.[0]?.pages.length || 0;
    const currentBook = results?.[activeBookIndex] || results?.[0];

    const handleShowNext = () => {
      setVisiblePages(prev => Math.min(prev + 1, maxPages));
    };

    const handleShowAll = () => {
      setVisiblePages(maxPages);
    };

    return (
      <div className="telestrations-results excel-results-theme">
        <div className="excel-results-header">
          <h2>📊 Telestrations_Audit_Chain_Results</h2>
          <p>각 플레이어 스케치북의 릴레이 흐름을 셀 순서대로 검수하십시오.</p>
        </div>

        {/* 📘 Book Switcher Sheet Tabs */}
        <div className="excel-book-tabs">
          {results?.map((book, idx) => (
            <button
              key={idx}
              onClick={() => setActiveBookIndex(idx)}
              className={`excel-tab-btn ${activeBookIndex === idx ? 'active' : ''}`}
            >
              📘 Sheet_{idx + 1} ({book.owner})
            </button>
          ))}
        </div>

        {/* 📜 Active Book Sequence Log Chain */}
        {currentBook && (
          <div className="excel-book-timeline">
            <div className="timeline-title-bar">
              <span className="owner-tag">Sheet Owner: <strong>{currentBook.owner}</strong></span>
              <span className="step-progress">
                공개 진행도: <strong>{Math.min(visiblePages, maxPages)} / {maxPages}</strong>
              </span>
            </div>

            <div className="timeline-sequence-list">
              {currentBook.pages.slice(0, visiblePages).map((page, pageIndex) => (
                <div
                  key={pageIndex}
                  className={`timeline-item ${pageIndex === visiblePages - 1 ? 'reveal' : ''} ${page.type}`}
                >
                  <div className="cell-address-badge">
                    Row_{pageIndex + 1}
                  </div>
                  <div className="timeline-content-card">
                    <div className="item-meta">
                      <span className="author-name">👤 {page.author}님</span>
                      <span className="step-badge">
                        {pageIndex === 0
                          ? '🎯 최초 제시어'
                          : page.type === 'word'
                          ? '🔍 추측 단어 제출'
                          : '🎨 그림 릴레이 제출'}
                      </span>
                    </div>

                    <div className="item-body">
                      {page.type === 'word' ? (
                        <div className="word-box">
                          <span className="word-text">"{page.data}"</span>
                        </div>
                      ) : (
                        <div className="drawing-box">
                          <img src={resolveImageUrl(page.data)} alt="릴레이 그림" className="result-drawing-img" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🔘 Controls */}
        <div className="results-controls">
          {visiblePages < maxPages && (
            <>
              <button onClick={handleShowNext} className="excel-btn primary">
                ▶ 다음 릴레이 단계 공개 (+1)
              </button>
              <button onClick={handleShowAll} className="excel-btn secondary">
                ⏩ 전체 체인 한눈에 펼치기
              </button>
            </>
          )}
          {isHost && (
            <button onClick={handleRestartGame} className="excel-btn close">
              🔄 대기실로 돌아가기
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="telestrations-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">B5: TELESTRATIONS</div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-formula-input">
          =PROPAGATE_SEQUENCE_MAP(room_code, player_chain)
        </div>
      </div>

      {/* 📋 Sheet Header Bar */}
      <div className="game-header">
        <div className="sheet-title-info">
          <span className="sheet-icon">📑</span>
          <h2>Telestrations_Sequence_Map.xlsx</h2>
        </div>
        <div className="game-info">
          <span className="excel-cell-badge phase">
            {phase === 'waiting'
              ? '대기 중'
              : phase === 'word-input'
              ? '제시어 작성'
              : phase === 'drawing'
              ? '그림 그리기'
              : phase === 'guessing'
              ? '단어 맞히기'
              : '결과 공개'}
          </span>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close">
              🚪 방 나가기
            </button>
          )}
        </div>
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
