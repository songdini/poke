import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../uploads');

export const connectedUsers = new Map();
export const sessions = new Map();
export const kickVotes = {};
export const mafiaGames = new Map();
export const liarGames = new Map();
export const telestrationsGames = new Map();
export const baseballGames = new Map();
export const roomMessages = new Map();

export function checkMafiaGameEnd(io, room) {
  const game = mafiaGames.get(room);
  if (!game || !game.gameStarted || game.phase === 'game-over') return;

  // 세션이 살아있고 (연결 상태) isAlive === true인 유효 생존 플레이어 측정
  const activeAlivePlayers = game.players.filter(p => {
    const session = connectedUsers.get(p.id);
    return p.isAlive && session && session.isConnected !== false;
  });

  const aliveMafia = activeAlivePlayers.filter(p => p.role === 'mafia');
  const aliveCitizens = activeAlivePlayers.filter(p => p.role !== 'mafia');
  
  if (aliveMafia.length === 0) {
    game.phase = 'game-over';
    io.to(room).emit('mafia-update', {
      type: 'game-over',
      data: { winner: 'citizens', message: '🎉 모든 마피아가 제거되었습니다! 시민 팀의 승리입니다!' }
    });
  } else if (aliveCitizens.length <= aliveMafia.length) {
    game.phase = 'game-over';
    io.to(room).emit('mafia-update', {
      type: 'game-over',
      data: { winner: 'mafia', message: '🕵️ 마피아 수가 시민 수 이상입니다! 마피아 팀의 승리입니다!' }
    });
  }
}

// 🖼️ 24시간 지난 오래된 업로드 이미지 파일 자동 정리 (디스크 용량 확보)
export function sweepOldUploadedImages(maxAgeHours = 24) {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return;

    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const files = fs.readdirSync(UPLOADS_DIR);

    let deletedCount = 0;
    for (const file of files) {
      if (!file.startsWith('img_')) continue;

      const filePath = path.join(UPLOADS_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (fileErr) {
        // 개별 파일 처리 오류 무시
      }
    }

    if (deletedCount > 0) {
      console.log(`[Disk Sweeper] ${deletedCount}개의 오래된 이미지 파일(24시간 경과)을 자동 삭제했습니다.`);
    }
  } catch (err) {
    console.error('[Disk Sweeper Error]', err.message);
  }
}

// 🧹 주기적 가비지 컬렉터 (메모리 5분 주기 / 디스크 1시간 주기)
export function startGarbageCollector() {
  // 최초 서버 가동 시 1회 디스크 스위퍼 실행
  sweepOldUploadedImages(24);

  // 5분 주기 방 메모리 가비지 컬렉팅
  setInterval(() => {
    for (const [room, game] of mafiaGames.entries()) {
      if (!game.players || game.players.length === 0) {
        mafiaGames.delete(room);
      }
    }

    for (const [room, game] of liarGames.entries()) {
      if (!game.players || game.players.length === 0) {
        if (game.timerInterval) {
          clearInterval(game.timerInterval);
        }
        liarGames.delete(room);
      }
    }

    for (const [room, game] of telestrationsGames.entries()) {
      if (!game.players || game.players.length === 0) {
        telestrationsGames.delete(room);
      }
    }

    for (const room in kickVotes) {
      if (Object.keys(kickVotes[room]).length === 0) {
        delete kickVotes[room];
      }
    }
  }, 5 * 60 * 1000);

  // 1시간 주기 업로드 이미지 파일 디스크 스위퍼 구동
  setInterval(() => {
    sweepOldUploadedImages(24);
  }, 60 * 60 * 1000);
}
