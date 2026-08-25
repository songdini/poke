// 🏡 포켓농장 (PokéFarm) 소셜 핸들러: 이웃 농장 탐방, 하트 응원, 방명록 시스템

// 서버 메모리 상의 활성 농장 레지스트리 (Map<username, FarmPublicData>)
const farmRegistry = new Map();

// 방명록 저장소 (Map<ownerUsername, GuestbookEntry[]>)
const farmGuestbooks = new Map();

export function registerFarmHandlers(io, socket) {
  // 1. 농장 상태 동기화 및 레지스트리 등록
  socket.on('farm-sync', ({ username, farmData }) => {
    if (!username || !farmData) return;
    const cleanUser = username.trim();

    farmRegistry.set(cleanUser, {
      username: cleanUser,
      farmName: farmData.farmName || `${cleanUser}님의 포켓농장`,
      activePokemon: farmData.activePokemon || null,
      graduatedCount: farmData.graduatedCount || 0,
      heartsCount: farmData.heartsCount || 0,
      lastActive: Date.now()
    });

    if (!farmGuestbooks.has(cleanUser)) {
      farmGuestbooks.set(cleanUser, farmData.guestbook || []);
    }

    // 최신 이웃 농장 목록 브로드캐스트
    broadcastFarmList(io);
  });

  // 2. 이웃 농장 목록 요청
  socket.on('farm-get-list', () => {
    socket.emit('farm-list-update', getFarmList());
  });

  // 3. 특정 이웃 농장 방문 요청
  socket.on('farm-visit', ({ targetUsername }) => {
    if (!targetUsername) return;
    const cleanTarget = targetUsername.trim();
    const farm = farmRegistry.get(cleanTarget);
    const guestbook = farmGuestbooks.get(cleanTarget) || [];

    socket.emit('farm-visit-data', {
      success: !!farm,
      farm: farm || null,
      guestbook
    });
  });

  // 4. 이웃 포켓몬 하트/응원 보내기
  socket.on('farm-pet-heart', ({ targetUsername, senderUsername }) => {
    if (!targetUsername || !senderUsername) return;
    const cleanTarget = targetUsername.trim();
    const cleanSender = senderUsername.trim();

    const farm = farmRegistry.get(cleanTarget);
    if (farm) {
      farm.heartsCount = (farm.heartsCount || 0) + 1;
      farmRegistry.set(cleanTarget, farm);

      // 대상 유저 및 전체 알림
      io.emit('farm-heart-received', {
        targetUsername: cleanTarget,
        senderUsername: cleanSender,
        heartsCount: farm.heartsCount
      });
      broadcastFarmList(io);
    }
  });

  // 5. 방명록 작성
  socket.on('farm-add-guestbook', ({ targetUsername, author, message }) => {
    if (!targetUsername || !author || !message) return;
    const cleanTarget = targetUsername.trim();
    const cleanAuthor = author.trim();

    let guestbook = farmGuestbooks.get(cleanTarget);
    if (!guestbook) {
      guestbook = [];
      farmGuestbooks.set(cleanTarget, guestbook);
    }

    const newEntry = {
      id: `gb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: cleanAuthor,
      message: message.trim().slice(0, 100),
      timestamp: new Date().toISOString()
    };

    guestbook.unshift(newEntry);
    if (guestbook.length > 30) {
      guestbook.pop(); // 최근 30개만 유지
    }

    // 방문자와 농장 주인에게 방명록 갱신 전송
    io.emit('farm-guestbook-updated', {
      targetUsername: cleanTarget,
      entry: newEntry,
      guestbook
    });
  });
}

function getFarmList() {
  const list = [];
  const now = Date.now();
  for (const [user, data] of farmRegistry.entries()) {
    list.push({
      ...data,
      isOnline: (now - data.lastActive) < 1000 * 60 * 30 // 최근 30분 이내 활성
    });
  }
  return list.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
}

function broadcastFarmList(io) {
  io.emit('farm-list-update', getFarmList());
}
