import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { startGarbageCollector } from './src/gameManager.js';
import { registerJoinDisconnectHandlers } from './src/socketHandlers/joinDisconnectHandler.js';
import { registerChatHandlers } from './src/socketHandlers/chatHandler.js';
import { registerMafiaHandlers } from './src/socketHandlers/mafiaHandler.js';
import { registerLiarHandlers } from './src/socketHandlers/liarHandler.js';
import { registerTelestrationsHandlers } from './src/socketHandlers/telestrationsHandler.js';
import { registerNumberBaseballHandlers } from './src/socketHandlers/numberBaseballHandler.js';
import { registerSudokuHandlers } from './src/socketHandlers/sudokuHandler.js';
import { registerMinesweeperHandlers } from './src/socketHandlers/minesweeperHandler.js';
import { registerWordleHandlers } from './src/socketHandlers/wordleHandler.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, './.env') });

const app = express();
const server = createServer(app);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

const allowAllOrigins = process.env.ALLOWED_ORIGINS === '*';

if (process.env.ALLOWED_ORIGINS && !allowAllOrigins) {
  process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
    const trimmed = o.trim().replace(/\/$/, '');
    if (trimmed) allowedOrigins.add(trimmed);
  });
}

const isAllowedOrigin = (origin) => {
  if (!origin || allowAllOrigins) return true;
  const cleanOrigin = origin.replace(/\/$/, '');

  // 1. Explicitly configured origins (Set)
  if (allowedOrigins.has(cleanOrigin)) return true;

  // 2. Localhost & Any IPv4 Address (Public/Private, e.g., http://3.34.198.156:5173, http://192.168.1.5)
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(cleanOrigin)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    callback(isAllowedOrigin(origin) ? null : new Error(`Origin not allowed by CORS: ${origin}`), isAllowedOrigin(origin));
  },
  methods: ['GET', 'POST']
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🖼️ 이미지 업로드 REST API
app.post('/api/upload', (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: '올바른 이미지 데이터가 아닙니다.' });
    }

    const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    let ext = 'png';
    let base64Data = image;

    if (matches) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      base64Data = matches[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const uploadsDir = path.join(__dirname, 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return res.json({ url: `/uploads/${fileName}` });
  } catch (err) {
    console.error('이미지 업로드 처리 실패:', err);
    return res.status(500).json({ error: '이미지 저장 중 오류가 발생했습니다.' });
  }
});

// 소켓 이벤트 연결 핸들러 등록
io.on('connection', (socket) => {
  console.log('사용자가 연결되었습니다:', socket.id);
  registerJoinDisconnectHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerMafiaHandlers(io, socket);
  registerLiarHandlers(io, socket);
  registerTelestrationsHandlers(io, socket);
  registerNumberBaseballHandlers(io, socket);
  registerSudokuHandlers(io, socket);
  registerMinesweeperHandlers(io, socket);
  registerWordleHandlers(io, socket);
});

// 주기적 서버 메모리 가비지 컬렉터 구동
startGarbageCollector();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`채팅 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
