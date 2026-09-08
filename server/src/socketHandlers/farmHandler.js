import {
  upsertFarm,
  getFarm,
  getAllFarms,
  getPopularFarms,
  sendHeart,
  getTodayHeartCount,
  DAILY_HEART_LIMIT,
  recordFarmVisit,
  getFarmVisits,
  addGuestbookEntry,
  getGuestbookEntries,
  deleteGuestbookEntry,
  registerFarmUser,
  loginFarmUser,
  checkFarmUserExists,
  changeFarmPassword
} from '../db.js';

// 🏡 포켓농장 (PokéFarm) SQLite 기반 소셜 핸들러: 실시간 이웃 농장 방문, 하트 응원, 방명록 시스템, 회원가입/로그인 인증
export function registerFarmHandlers(io, socket) {
  // 🔐 0-1. 회원가입 및 신규 농장 개설
  socket.on('farm-register', ({ username, password, farmData }) => {
    const result = registerFarmUser({ username, password, farmData });
    socket.emit('farm-register-result', result);
    if (result.success) {
      broadcastFarmList(io);
    }
  });

  // 🔐 0-2. 기존 농장 로그인 (다른 기기 및 브라우저에서 동일 농장 로드)
  socket.on('farm-login', ({ username, password }) => {
    const result = loginFarmUser({ username, password });
    socket.emit('farm-login-result', result);
    if (result.success) {
      broadcastFarmList(io);
    }
  });

  // 🔐 0-3. 사용자 아이디 중복 및 비밀번호 존재 여부 확인
  socket.on('farm-check-user', ({ username }) => {
    const result = checkFarmUserExists(username);
    socket.emit('farm-check-user-result', result);
  });

  // 🔐 0-4. 비밀번호 변경
  socket.on('farm-change-password', ({ username, oldPassword, newPassword }) => {
    const result = changeFarmPassword({ username, oldPassword, newPassword });
    socket.emit('farm-change-password-result', result);
  });

  // 1. 농장 상태 동기화 및 SQLite DB 저장 (UPSERT)
  socket.on('farm-sync', ({ username, farmData }) => {
    if (!username || !farmData) return;
    const cleanUser = username.trim();

    // 본인 접속 방문 카운트 기록
    recordFarmVisit(cleanUser, cleanUser);

    // SQLite DB에 농장 프로필, 포켓몬, 스티커, 회전 배치 데이터 영구 저장
    const savedFarm = upsertFarm(cleanUser, farmData);

    // 🛡️ 만약 클라이언트가 구버전 데이터를 전송하여 서버가 덮어쓰기를 방어한 경우, 해당 클라이언트에 최신 서버 데이터를 즉시 내려보내 동기화
    if (savedFarm && farmData.lastActive && savedFarm.lastActive > (farmData.lastActive + 1000)) {
      const guestbook = getGuestbookEntries(cleanUser, 50);
      socket.emit('farm-my-data-loaded', {
        success: true,
        farm: savedFarm,
        guestbook
      });
    }

    // 전체 클라이언트에 실시간 이웃 농장 및 TOP 3 랭킹 브로드캐스트
    broadcastFarmList(io);
  });

  // 1-1. 내 농장 데이터 DB에서 조회 및 복원 (Cloud Restore)
  socket.on('farm-load-my-data', ({ username }) => {
    if (!username) return;
    const cleanUser = username.trim();

    // 본인 접속 방문 카운트 기록 (당일 첫 접속 시 TODAY/TOTAL +1)
    recordFarmVisit(cleanUser, cleanUser);

    const farm = getFarm(cleanUser);
    const guestbook = getGuestbookEntries(cleanUser, 50);
    const hasValidFarm = !!(farm && (farm.isInitialized || farm.activePokemon || (farm.graduatedPokemon && farm.graduatedPokemon.length > 0) || farm.username));
    socket.emit('farm-my-data-loaded', {
      success: hasValidFarm,
      farm: hasValidFarm ? { ...farm, isInitialized: true } : null,
      guestbook
    });
  });

  // 2. 이웃 농장 목록 및 TOP 3 랭킹 요청
  socket.on('farm-get-list', () => {
    socket.emit('farm-list-update', getAllFarms());
  });

  socket.on('farm-get-top3', () => {
    socket.emit('farm-top3-update', getPopularFarms(3));
  });

  // 2-1. 오늘 보낸 하트 개수 조회
  socket.on('farm-get-daily-hearts', ({ username }) => {
    if (!username) return;
    const count = getTodayHeartCount(username);
    socket.emit('farm-daily-hearts-info', {
      todaySent: count,
      remainingHearts: Math.max(0, DAILY_HEART_LIMIT - count),
      dailyLimit: DAILY_HEART_LIMIT
    });
  });

  // 3. 특정 이웃 농장 미니홈피 방문 요청 (실제 방문수 카운트 & 오프라인 유저도 DB에서 즉시 조회 가능!)
  const handleVisit = ({ targetUsername, visitorUsername }) => {
    if (!targetUsername) return;
    const cleanTarget = targetUsername.trim();
    const cleanVisitor = (visitorUsername || '익명').trim();

    // 실제 방문자 기록
    recordFarmVisit(cleanTarget, cleanVisitor);

    const farm = getFarm(cleanTarget);
    const guestbook = getGuestbookEntries(cleanTarget, 50);

    socket.emit('farm-visit-data', {
      success: !!farm,
      farm: farm || null,
      guestbook
    });

    if (farm) {
      io.emit('farm-visit-updated', {
        targetUsername: cleanTarget,
        todayCount: farm.todayCount,
        totalCount: farm.totalCount
      });
    }
  };
  socket.on('farm-visit', handleVisit);
  socket.on('farm-visit-request', handleVisit);

  // 4. 이웃 미니홈피 1촌 응원 하트 보내기 (하루 5회 제한, 자기 자신 금지, 코인 보상)
  const handleHeart = ({ targetUsername, senderUsername }) => {
    if (!targetUsername || !senderUsername) return;
    const result = sendHeart({ targetUsername, senderUsername });

    if (!result.success) {
      socket.emit('farm-heart-failed', result);
      return;
    }

    // 발신자에게 성공 응답 (보답 코인 및 잔여 하트 횟수 전달)
    socket.emit('farm-heart-sent-success', {
      targetUsername: result.targetUsername,
      heartsCount: result.heartsCount,
      senderRewardCoins: result.senderRewardCoins,
      remainingHearts: result.remainingHearts,
      todaySent: result.todaySent
    });

    // 대상 유저 및 전체 클라이언트에 하트 업데이트 전송 (+수신자 코인 보상 알림)
    io.emit('farm-heart-received', {
      targetUsername: result.targetUsername,
      senderUsername: result.senderUsername,
      heartsCount: result.heartsCount,
      rewardCoins: result.targetRewardCoins
    });

    broadcastFarmList(io);
  };
  socket.on('farm-pet-heart', handleHeart);
  socket.on('farm-send-heart', handleHeart);

  // 5. 방명록 작성
  const handleAddGuestbook = ({ targetUsername, author, message, entry }) => {
    const cleanTarget = (targetUsername || '').trim();
    const cleanAuthor = (author || (entry && entry.author) || '익명').trim();
    const msg = (message || (entry && entry.message) || '').trim();

    if (!cleanTarget || !cleanAuthor || !msg) return;

    const newEntry = addGuestbookEntry(cleanTarget, cleanAuthor, msg);
    const guestbook = getGuestbookEntries(cleanTarget, 50);

    // 방문자와 해당 농장에 실시간 방명록 갱신 전송
    io.emit('farm-guestbook-updated', {
      targetUsername: cleanTarget,
      entry: newEntry,
      guestbook
    });
  };
  socket.on('farm-add-guestbook', handleAddGuestbook);
  socket.on('farm-guestbook-add', handleAddGuestbook);

  // 6. 방명록 삭제
  socket.on('farm-guestbook-delete', ({ targetUsername, id }) => {
    if (!id) return;
    deleteGuestbookEntry(id);

    if (targetUsername) {
      const cleanTarget = targetUsername.trim();
      const guestbook = getGuestbookEntries(cleanTarget, 50);
      io.emit('farm-guestbook-updated', {
        targetUsername: cleanTarget,
        guestbook
      });
    }
  });

  // 🚪 7-1. 미니홈피 실시간 룸 입장 (내 농장 또는 이웃 농장)
  socket.on('farm-presence-join', ({ farmOwner, username, skin, roomId, x, y, isHost }) => {
    if (!farmOwner) return;
    const cleanOwner = farmOwner.trim();
    const cleanUser = (username || '익명').trim();

    // 이전에 구독 중이던 다른 농장 룸이 있다면 정리
    if (socketFarmSubscriptions.has(socket.id)) {
      const existingFarms = Array.from(socketFarmSubscriptions.get(socket.id));
      for (const oldOwner of existingFarms) {
        if (oldOwner !== cleanOwner) {
          removeSocketFromFarm(io, socket, oldOwner);
        }
      }
    }

    socket.join(`farm_room_${cleanOwner}`);
    if (!socketFarmSubscriptions.has(socket.id)) {
      socketFarmSubscriptions.set(socket.id, new Set());
    }
    socketFarmSubscriptions.get(socket.id).add(cleanOwner);

    if (!farmPresences.has(cleanOwner)) {
      farmPresences.set(cleanOwner, new Map());
    }

    const userData = {
      socketId: socket.id,
      username: cleanUser,
      skin: skin || 'ash',
      roomId: roomId || 'room_1',
      x: typeof x === 'number' ? x : 50,
      y: typeof y === 'number' ? y : 65,
      flipped: false,
      isHost: !!isHost,
      bubble: null,
      updatedAt: Date.now()
    };

    farmPresences.get(cleanOwner).set(socket.id, userData);

    // 본인에게 현재 농장에 있는 모든 유저 목록 전송
    socket.emit('farm-presence-current-users', {
      farmOwner: cleanOwner,
      users: getFarmPresenceList(cleanOwner)
    });

    // 다른 유저들에게 새로운 참가자 알림
    socket.to(`farm_room_${cleanOwner}`).emit('farm-presence-user-joined', {
      farmOwner: cleanOwner,
      user: userData
    });
  });

  // 🚪 7-2. 미니홈피 룸 퇴장
  socket.on('farm-presence-leave', ({ farmOwner }) => {
    if (!farmOwner) return;
    removeSocketFromFarm(io, socket, farmOwner.trim());
  });

  // 🚶 7-3. 트레이너 이동 (바닥 클릭 시 실시간 좌표 전송)
  socket.on('farm-presence-move', ({ farmOwner, x, y, roomId, flipped }) => {
    if (!farmOwner) return;
    const cleanOwner = farmOwner.trim();
    if (!farmPresences.has(cleanOwner)) return;

    const user = farmPresences.get(cleanOwner).get(socket.id);
    if (user) {
      user.x = x;
      user.y = y;
      if (roomId) user.roomId = roomId;
      if (flipped !== undefined) user.flipped = flipped;
      user.updatedAt = Date.now();

      io.to(`farm_room_${cleanOwner}`).emit('farm-presence-user-moved', {
        farmOwner: cleanOwner,
        socketId: socket.id,
        username: user.username,
        x,
        y,
        roomId: user.roomId,
        flipped: user.flipped
      });
    }
  });

  // 💬 7-4. 트레이너 말풍선 전송
  socket.on('farm-presence-chat', ({ farmOwner, bubble }) => {
    if (!farmOwner) return;
    const cleanOwner = farmOwner.trim();
    if (!farmPresences.has(cleanOwner)) return;

    const user = farmPresences.get(cleanOwner).get(socket.id);
    if (user) {
      user.bubble = bubble;
      io.to(`farm_room_${cleanOwner}`).emit('farm-presence-user-chatted', {
        farmOwner: cleanOwner,
        socketId: socket.id,
        bubble
      });
    }
  });

  // 🎭 7-5. 트레이너 스킨 실시간 변경
  socket.on('farm-presence-skin-update', ({ farmOwner, skin }) => {
    if (!farmOwner) return;
    const cleanOwner = farmOwner.trim();
    if (!farmPresences.has(cleanOwner)) return;

    const user = farmPresences.get(cleanOwner).get(socket.id);
    if (user) {
      user.skin = skin;
      io.to(`farm_room_${cleanOwner}`).emit('farm-presence-user-skin-updated', {
        farmOwner: cleanOwner,
        socketId: socket.id,
        skin
      });
    }
  });

  // 🔌 7-6. 소켓 연결 해제 시 모든 미니홈피 방에서 자동 퇴장
  socket.on('disconnect', () => {
    if (socketFarmSubscriptions.has(socket.id)) {
      const farms = Array.from(socketFarmSubscriptions.get(socket.id));
      for (const owner of farms) {
        removeSocketFromFarm(io, socket, owner);
      }
    }
  });
}

// 🌍 미니홈피 실시간 방문자 & 트레이너 위치 동기화 관리
// farmOwner -> Map<socketId, { socketId, username, skin, roomId, x, y, flipped, isHost, bubble, updatedAt }>
const farmPresences = new Map();
// socketId -> Set<farmOwner>
const socketFarmSubscriptions = new Map();

function getFarmPresenceList(farmOwner) {
  if (!farmPresences.has(farmOwner)) return [];
  return Array.from(farmPresences.get(farmOwner).values());
}

function removeSocketFromFarm(io, socket, farmOwner) {
  if (!farmPresences.has(farmOwner)) return;
  const roomMap = farmPresences.get(farmOwner);
  const existing = roomMap.get(socket.id);
  if (existing) {
    roomMap.delete(socket.id);
    if (roomMap.size === 0) {
      farmPresences.delete(farmOwner);
    }
    io.to(`farm_room_${farmOwner}`).emit('farm-presence-user-left', {
      socketId: socket.id,
      username: existing.username,
      farmOwner
    });
  }
  socket.leave(`farm_room_${farmOwner}`);

  if (socketFarmSubscriptions.has(socket.id)) {
    socketFarmSubscriptions.get(socket.id).delete(farmOwner);
    if (socketFarmSubscriptions.get(socket.id).size === 0) {
      socketFarmSubscriptions.delete(socket.id);
    }
  }
}

function broadcastFarmList(io) {
  const all = getAllFarms();
  io.emit('farm-list-update', all);
  io.emit('farm-top3-update', getPopularFarms(3));
}
