import React, { useRef, useState } from 'react';

interface DrawingBoardProps {
  onSend: (dataUrl: string) => void;
  onClose: () => void;
}

const COLORS = [
  '#222222', // Black
  '#e11d48', // Red
  '#f97316', // Orange
  '#facc15', // Yellow
  '#4ade80', // Green
  '#38bdf8', // Light Blue
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#a16207', // Brown
  '#ffffff', // White
];
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
    e.preventDefault();
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
    e.preventDefault();
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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', Calibri, Arial, sans-serif" }}>
      <div style={{ background: '#ffffff', borderRadius: '4px', width: '420px', border: '1px solid #d4d4d4', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* 📊 Excel Window Header */}
        <div style={{ background: '#107c41', color: '#ffffff', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📊</span>
            <span>Excel Ink & Drawing Object - Insert Shapes</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', lineHeight: 1 }} title="닫기">
            ✕
          </button>
        </div>

        {/* 📊 Excel Formula Bar */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f3f2f1', borderBottom: '1px solid #d4d4d4', padding: '4px 8px', fontSize: '0.8rem', gap: '6px' }}>
          <span style={{ background: '#ffffff', border: '1px solid #d4d4d4', padding: '2px 8px', fontWeight: 600, color: '#201f1e' }}>Sheet1!C4</span>
          <span style={{ fontStyle: 'italic', fontWeight: 700, color: '#605e5c', padding: '0 4px' }}>fx</span>
          <div style={{ flex: 1, background: '#ffffff', border: '1px solid #d4d4d4', padding: '2px 8px', fontFamily: 'Consolas, monospace', color: '#107c41', fontSize: '0.78rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            =INSERT_INK_DATA(Canvas.PngData, "Sheet1!C4:H18")
          </div>
        </div>

        {/* 🎨 Excel Ribbon Toolbar */}
        <div style={{ background: '#f8f9fa', padding: '8px 12px', borderBottom: '1px solid #d4d4d4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Row 1: Color Palette */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#605e5c' }}>잉크 색상:</span>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: color === c && !isEraser ? '2px solid #107c41' : '1px solid #d4d4d4',
                  background: c,
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: color === c && !isEraser ? '0 0 0 2px #e6f2eb' : 'none'
                }}
                title={c}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setIsEraser(false);
              }}
              style={{
                width: '22px',
                height: '22px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: 0
              }}
              title="사용자 지정 색상"
            />
          </div>

          {/* Row 2: Stroke Size & Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#605e5c' }}>선 두께:</span>
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                style={{
                  padding: '2px 8px',
                  borderRadius: '2px',
                  border: size === s ? '1px solid #107c41' : '1px solid #d4d4d4',
                  background: size === s ? '#e6f2eb' : '#ffffff',
                  color: size === s ? '#0b5a2f' : '#201f1e',
                  fontSize: '0.75rem',
                  fontWeight: size === s ? 700 : 500,
                  cursor: 'pointer'
                }}
                title={`두께 ${s}px`}
              >
                {s}px
              </button>
            ))}

            <div style={{ width: '1px', height: '16px', background: '#d4d4d4', margin: '0 4px' }} />

            <button
              onClick={toggleEraser}
              style={{
                padding: '2px 8px',
                borderRadius: '2px',
                border: isEraser ? '1px solid #dc2626' : '1px solid #d4d4d4',
                background: isEraser ? '#fde7e9' : '#ffffff',
                color: isEraser ? '#a80000' : '#201f1e',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="지우개 모드"
            >
              🧽 지우개
            </button>
            <button
              onClick={handleUndo}
              style={{
                padding: '2px 8px',
                borderRadius: '2px',
                border: '1px solid #d4d4d4',
                background: '#ffffff',
                color: '#201f1e',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title="실행 취소"
            >
              ↩️ 되돌리기
            </button>
          </div>
        </div>

        {/* 🖌️ Canvas Container (Excel Sheet Grid Feel) */}
        <div style={{ padding: '16px', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', border: '1px solid #107c41', borderRadius: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: '#ffffff' }}>
            <canvas
              ref={canvasRef}
              width={350}
              height={250}
              style={{ touchAction: 'none', display: 'block', cursor: isEraser ? 'cell' : 'crosshair', userSelect: 'none', WebkitUserSelect: 'none' }}
              onMouseDown={startDrawing}
              onMouseUp={endDrawing}
              onMouseOut={endDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={endDrawing}
              onTouchCancel={endDrawing}
              onTouchMove={draw}
            />
          </div>

          {isEraser && (
            <div style={{ marginTop: '6px', color: '#a80000', fontSize: '0.75rem', fontWeight: 600 }}>
              🧽 지우개 모드 동작 중
            </div>
          )}

          {/* 🔘 Excel Action Buttons Footer */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClear}
              style={{
                padding: '5px 12px',
                borderRadius: '2px',
                border: '1px solid #d4d4d4',
                background: '#f3f2f1',
                color: '#201f1e',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              전체 지우기
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '5px 12px',
                borderRadius: '2px',
                border: '1px solid #a80000',
                background: '#fde7e9',
                color: '#a80000',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              취소
            </button>
            <button
              onClick={handleSend}
              style={{
                padding: '5px 16px',
                borderRadius: '2px',
                border: '1px solid #0b5a2f',
                background: '#107c41',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ▶ 그림 개체 전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingBoard; 