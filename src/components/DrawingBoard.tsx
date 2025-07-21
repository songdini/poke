import React, { useRef, useState } from 'react';

interface DrawingBoardProps {
  onSend: (dataUrl: string) => void;
  onClose: () => void;
}

const COLORS = ['#222', '#39ff14', '#e11d48', '#2563eb', '#facc15', '#10b981', '#fff'];
const SIZES = [2, 4, 8, 14];

const DrawingBoard: React.FC<DrawingBoardProps> = ({ onSend, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState<string>('#222');
  const [size, setSize] = useState<number>(4);
  const [isEraser, setIsEraser] = useState(false); // 지우개 모드 추가

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    const pos = getPos(e);
    setLastPos(pos);
  };

  const endDrawing = () => {
    setDrawing(false);
    setLastPos(null);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    if (lastPos) {
      if (isEraser) {
        // 지우개 모드: 투명하게 지우기
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        // 일반 그리기 모드
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
      }
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
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

  const handleSend = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSend(dataUrl);
      onClose();
    }
  };

  const handleClear = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        // 흰 배경으로 채우기
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
                  setIsEraser(false); // 색상 선택 시 지우개 모드 해제
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
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: size === s ? '2px solid #39ff14' : '2px solid #333',
                  background: '#18181b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title={`굵기 ${s}`}
              >
                <div style={{ width: s, height: s, background: isEraser ? '#f87171' : color, borderRadius: '50%' }} />
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