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
  deleteGuestbookEntry
} from '../db.js';

// 🏡 포켓농장 (PokéFarm) SQLite 기반 소셜 핸들러: 실시간 이웃 농장 방문, 하트 응원, 방명록 시스템
export function registerFarmHandlers(io, socket) {
  // 1. 농장 상태 동기화 및 SQLite DB 저장 (UPSERT)
  socket.on('farm-sync', ({ username, farmData }) => {
    if (!username || !farmData) return;
    const cleanUser = username.trim();

    // 본인 접속 방문 카운트 기록
    recordFarmVisit(cleanUser, cleanUser);

    // SQLite DB에 농장 프로필, 포켓몬, 스티커, 회전 배치 데이터 영구 저장
    const savedFarm = upsertFarm(cleanUser, farmData);

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
}

function broadcastFarmList(io) {
  const all = getAllFarms();
  io.emit('farm-list-update', all);
  io.emit('farm-top3-update', getPopularFarms(3));
}
