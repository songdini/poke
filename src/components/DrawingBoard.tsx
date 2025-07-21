import React, { useRef, useState } from 'react';

interface DrawingBoardProps {
  onSend: (dataUrl: string) => void;
  onClose: () => void;
}

const COLORS = ['#222', '#39ff14', '#e11d48', '#2563eb', '#facc15', '#10b981', '#fff'];
const SIZES = [2, 4, 8, 14];

type Path = {
  color: string;
  size: number;
  isEraser: boolean;
  points: { x: number; y: number }[];
};

const DrawingBoard: React.FC<DrawingBoardProps> = ({ onSend, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState<string>('#222');
  const [size, setSize] = useState<number>(4);
  const [isEraser, setIsEraser] = useState(false);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    const pos = getPos(e);
    setLastPos(pos);
    setCurrentPath({
      color,
      size,
      isEraser,
      points: [pos]
    });
  };

  const endDrawing = () => {
    setDrawing(false);
    setLastPos(null);
    if (currentPath && currentPath.points.length > 1) {
      setPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath(null);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !canvasRef.current) return;
    const pos = getPos(e);
    if (lastPos && currentPath) {
      // 캔버스에 바로 그림
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
      }
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      // 현재 path에 점 추가
      setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, pos] } : prev);
    }
    setLastPos(pos);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  // 전체 다시 그리기 (paths 배열 기반)
  const redraw = (allPaths: Path[]) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    for (const path of allPaths) {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineWidth = path.size;
      if (path.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = path.color;
      }
      path.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // Undo 기능
  const handleUndo = () => {
    if (paths.length === 0) return;
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    setTimeout(() => redraw(newPaths), 0);
  };

  const handleSend = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSend(dataUrl);
      onClose();
    }
  };

  const handleClear = () => {
    setPaths([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // 지우개 모드 토글
  const toggleEraser = () => {
    setIsEraser(!isEraser);
  };

  // 캔버스가 처음 마운트될 때 흰 배경으로 초기화
  React.useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  // paths가 바뀔 때마다 다시 그림
  React.useEffect(() => {
    redraw(paths);
  }, [paths]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#23272f', borderRadius: 12, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: 0, marginBottom: 12, color: '#39ff14', fontFamily: 'Fira Mono, Consolas, monospace' }}>🖌️ 그림 그리기</h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
          {/* 색상 선택 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: color === c && !isEraser ? '2px solid #39ff14' : '2px solid #333',
                  background: c,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title={c}
              />
            ))}
          </div>
          {/* 굵기 선택 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: size === s ? '2px solid #39ff14' : '2px solid #bbb',
                  background: '#eee',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                }}
                title={`굵기 ${s}`}
              >
                <div style={{ width: s, height: s, background: isEraser ? '#f87171' : color, borderRadius: '50%', border: '1px solid #888' }} />
              </button>
            ))}
          </div>
          {/* 지우개 버튼 */}
          <button
            onClick={toggleEraser}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: isEraser ? '2px solid #39ff14' : '2px solid #333',
              background: '#18181b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              fontSize: '16px',
            }}
            title="지우개"
          >
            🧽
          </button>
          {/* Undo 버튼 */}
          <button
            onClick={handleUndo}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '2px solid #333',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              fontSize: '16px',
              marginLeft: 4
            }}
            title="실행 취소"
          >
            ↩️
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          style={{ border: '1px solid #333', borderRadius: 8, background: '#fff', touchAction: 'none', display: 'block', margin: '0 auto' }}
          onMouseDown={startDrawing}
          onMouseUp={endDrawing}
          onMouseOut={endDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={endDrawing}
          onTouchCancel={endDrawing}
          onTouchMove={draw}
        />
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={handleClear} style={{ padding: '8px 16px', background: '#23272f', color: '#39ff14', border: '1px solid #333', borderRadius: 6 }}>전체 지우기</button>
          <button onClick={handleSend} style={{ padding: '8px 16px', background: '#39ff14', color: '#18181b', border: 'none', borderRadius: 6 }}>전송</button>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#f87171', color: 'white', border: 'none', borderRadius: 6 }}>닫기</button>
        </div>
        {isEraser && (
          <div style={{ marginTop: 8, textAlign: 'center', color: '#f87171', fontSize: '12px' }}>
            🧽 지우개 모드 활성화
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingBoard; 