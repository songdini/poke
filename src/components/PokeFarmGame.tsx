import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import type { FarmState, FarmPokemon, FarmItem, PartTimeJob, GraduationDiploma, GuestbookEntry } from '../types/farm';
import { 
  STARTER_CHAINS, 
  FARM_ITEMS, 
  FARM_JOBS, 
  loadFarmState, 
  saveFarmState, 
  createNewFarmPokemon, 
  playPokemonCry 
} from '../services/pokeFarmService';
import { 
  Sparkles, Trophy, Volume2, Send, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import './PokeFarmGame.css';

interface PokeFarmGameProps {
  username: string;
  onLeaveRoom?: () => void;
}

type FarmTab = 'yard' | 'adopt' | 'evolve' | 'jobs' | 'shop' | 'diplomas' | 'neighbors';

interface NeighborFarmData {
  username: string;
  farmName: string;
  activePokemon: FarmPokemon | null;
  graduatedCount: number;
  heartsCount: number;
  isOnline: boolean;
}

export const PokeFarmGame: React.FC<PokeFarmGameProps> = ({ username, onLeaveRoom }) => {
  const { socket } = useSocket();

  // 농장 전체 로컬 상태
  const [farmState, setFarmState] = useState<FarmState>(() => loadFarmState(username));
  const [activeTab, setActiveTab] = useState<FarmTab>('yard');

  // 애니메이션 & 이펙트 상태
  const [floatingHeart, setFloatingHeart] = useState<{ id: number; x: number; y: number } | null>(null);
  const [actionAlert, setActionAlert] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [evolvingModal, setEvolvingModal] = useState<{ active: boolean; stage: 'flashing' | 'done'; oldName: string; newName: string; sprite: string } | null>(null);
  const [graduatingModal, setGraduatingModal] = useState<GraduationDiploma | null>(null);
  const [selectedDiploma, setSelectedDiploma] = useState<GraduationDiploma | null>(null);

  // 이웃 탐방 상태
  const [neighborList, setNeighborList] = useState<NeighborFarmData[]>([]);
  const [visitingFarm, setVisitingFarm] = useState<{ owner: string; farm: NeighborFarmData; guestbook: GuestbookEntry[] } | null>(null);
  const [guestbookInput, setGuestbookInput] = useState('');
  const [neighborSearch, setNeighborSearch] = useState('');

  // 상태 자동 저장 및 소켓 동기화
  useEffect(() => {
    saveFarmState(farmState);
    if (socket && socket.connected) {
      socket.emit('farm-sync', {
        username: farmState.ownerName,
        farmData: {
          farmName: farmState.farmName,
          activePokemon: farmState.activePokemon,
          graduatedCount: farmState.graduatedPokemon.length,
          heartsCount: farmState.heartsCount,
          guestbook: farmState.guestbook
        }
      });
    }
  }, [farmState, socket]);

  // 소켓 이벤트 수신
  useEffect(() => {
    if (!socket) return;

    socket.emit('farm-get-list');

    socket.on('farm-list-update', (list: NeighborFarmData[]) => {
      setNeighborList(list.filter(item => item.username !== farmState.ownerName));
    });

    socket.on('farm-visit-data', (data: { success: boolean; farm: NeighborFarmData; guestbook: GuestbookEntry[] }) => {
      if (data.success && data.farm) {
        setVisitingFarm({
          owner: data.farm.username,
          farm: data.farm,
          guestbook: data.guestbook
        });
      }
    });

    socket.on('farm-heart-received', (data: { targetUsername: string; senderUsername: string; heartsCount: number }) => {
      if (data.targetUsername === farmState.ownerName) {
        setFarmState(prev => ({
          ...prev,
          heartsCount: data.heartsCount
        }));
        showAlert(`💖 [${data.senderUsername}]님이 내 포켓몬을 쓰다듬고 응원했습니다!`, 'success');
      }
    });

    socket.on('farm-guestbook-updated', (data: { targetUsername: string; entry: GuestbookEntry; guestbook: GuestbookEntry[] }) => {
      if (data.targetUsername === farmState.ownerName) {
        setFarmState(prev => ({
          ...prev,
          guestbook: data.guestbook
        }));
        showAlert(`📬 새로운 방명록이 도착했습니다: "${data.entry.message}"`, 'info');
      }
      if (visitingFarm && visitingFarm.owner === data.targetUsername) {
        setVisitingFarm(prev => prev ? { ...prev, guestbook: data.guestbook } : null);
      }
    });

    return () => {
      socket.off('farm-list-update');
      socket.off('farm-visit-data');
      socket.off('farm-heart-received');
      socket.off('farm-guestbook-updated');
    };
  }, [socket, farmState.ownerName, visitingFarm]);

  // 알림 토스트 헬퍼
  const showAlert = (text: string, type: 'success' | 'info' | 'warn' = 'info') => {
    setActionAlert({ text, type });
    setTimeout(() => setActionAlert(null), 3500);
  };

  const pmon = farmState.activePokemon;

  // 1. 포켓몬 쓰다듬기 & 하트 이펙트
  const handlePetPokemon = (e?: React.MouseEvent) => {
    if (!pmon) return;
    playPokemonCry(pmon.speciesId);

    const clientX = e ? e.clientX : window.innerWidth / 2;
    const clientY = e ? e.clientY : window.innerHeight / 2;
    setFloatingHeart({ id: Date.now(), x: clientX, y: clientY });
    setTimeout(() => setFloatingHeart(null), 1000);

    setFarmState(prev => {
      if (!prev.activePokemon) return prev;
      const newHappiness = Math.min(100, prev.activePokemon.happiness + 5);
      const newExp = prev.activePokemon.exp + 10;
      let newLevel = prev.activePokemon.level;
      let curExp = newExp;
      let maxExp = prev.activePokemon.maxExp;

      if (curExp >= maxExp) {
        curExp -= maxExp;
        newLevel += 1;
        maxExp = Math.round(maxExp * 1.3);
        showAlert(`🎉 레벨업! [${prev.activePokemon.nickname}]이(가) Lv.${newLevel}이 되었습니다!`, 'success');
      }

      return {
        ...prev,
        activePokemon: {
          ...prev.activePokemon,
          happiness: newHappiness,
          level: newLevel,
          exp: curExp,
          maxExp,
          totalPats: prev.activePokemon.totalPats + 1
        }
      };
    });
  };

  // 2. 아이템 사용 (밥주기 / 목욕 / 장난감 / 치료)
  const handleUseItem = (item: FarmItem) => {
    if (!pmon) return;
    const currentQty = farmState.inventory[item.id] || 0;
    if (currentQty <= 0) {
      showAlert(`아이템 [${item.name}]이 부족합니다. 상점에서 구매해 주세요!`, 'warn');
      return;
    }

    setFarmState(prev => {
      if (!prev.activePokemon) return prev;
      const target = prev.activePokemon;
      const effect = item.effect;

      let newHunger = target.hunger + (effect.hunger || 0);
      newHunger = Math.max(0, Math.min(100, newHunger));

      let newClean = target.cleanliness + (effect.cleanliness || 0);
      newClean = Math.max(0, Math.min(100, newClean));

      let newHappy = target.happiness + (effect.happiness || 0);
      newHappy = Math.max(0, Math.min(100, newHappy));

      let newEnergy = target.energy + (effect.energy || 0);
      newEnergy = Math.max(0, Math.min(100, newEnergy));

      let newExp = target.exp + (effect.exp || 0);
      let newLevel = target.level;
      let maxExp = target.maxExp;

      while (newExp >= maxExp) {
        newExp -= maxExp;
        newLevel += 1;
        maxExp = Math.round(maxExp * 1.3);
      }

      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [item.id]: currentQty - 1
        },
        activePokemon: {
          ...target,
          hunger: newHunger,
          cleanliness: newClean,
          happiness: newHappy,
          energy: newEnergy,
          level: newLevel,
          exp: newExp,
          maxExp
        }
      };
    });

    playPokemonCry(pmon.speciesId);
    showAlert(`✨ [${item.name}]을(를) 사용했습니다!`, 'success');
  };

  // 3. 아르바이트 수행
  const handleWorkJob = (job: PartTimeJob) => {
    if (!pmon) return;
    if (pmon.level < job.minLevel) {
      showAlert(`아르바이트 참여 조건 부족: Lv.${job.minLevel} 이상 필요합니다.`, 'warn');
      return;
    }
    if (pmon.energy < job.energyCost) {
      showAlert('체력이 부족합니다! 비타민 음료를 먹이거나 휴식을 취해주세요.', 'warn');
      return;
    }
    if (pmon.hunger < job.hungerCost) {
      showAlert('배가 너무 고파서 일할 수 없습니다! 열매를 먹여주세요.', 'warn');
      return;
    }

    setFarmState(prev => {
      if (!prev.activePokemon) return prev;
      const target = prev.activePokemon;

      let newExp = target.exp + job.expReward;
      let newLevel = target.level;
      let maxExp = target.maxExp;

      while (newExp >= maxExp) {
        newExp -= maxExp;
        newLevel += 1;
        maxExp = Math.round(maxExp * 1.3);
      }

      return {
        ...prev,
        coins: prev.coins + job.rewardCoins,
        activePokemon: {
          ...target,
          energy: Math.max(0, target.energy - job.energyCost),
          hunger: Math.max(0, target.hunger - job.hungerCost),
          cleanliness: Math.max(0, target.cleanliness - job.cleanlinessCost),
          level: newLevel,
          exp: newExp,
          maxExp,
          jobsCompleted: target.jobsCompleted + 1
        }
      };
    });

    playPokemonCry(pmon.speciesId);
    showAlert(`💼 [${job.title}] 완료! +${job.rewardCoins} 코인 & +${job.expReward} EXP 획득!`, 'success');
  };

  // 4. 상점 아이템 구매
  const handleBuyItem = (item: FarmItem) => {
    if (farmState.coins < item.price) {
      showAlert('보유 코인이 부족합니다! 미니게임을 플레이하거나 아르바이트를 해보세요.', 'warn');
      return;
    }

    setFarmState(prev => ({
      ...prev,
      coins: prev.coins - item.price,
      inventory: {
        ...prev.inventory,
        [item.id]: (prev.inventory[item.id] || 0) + 1
      }
    }));

    showAlert(`🛍️ [${item.name}] 구매 완료!`, 'success');
  };

  // 5. 포켓몬 진화 (Evolution)
  const handleEvolve = () => {
    if (!pmon) return;
    const currentChain = pmon.evolutionChain;
    const nextIndex = pmon.stageIndex + 1;
    if (nextIndex >= currentChain.length) {
      showAlert('이미 최종 진화 단계에 도달했습니다!', 'info');
      return;
    }

    const nextStage = currentChain[nextIndex];
    if (pmon.level < nextStage.minLevel || pmon.happiness < nextStage.minHappiness) {
      showAlert(`진화 조건 미달: Lv.${nextStage.minLevel} & 친밀도 ${nextStage.minHappiness} 이상 필요`, 'warn');
      return;
    }

    // 진화 애니메이션 모달 시작
    setEvolvingModal({
      active: true,
      stage: 'flashing',
      oldName: pmon.name,
      newName: nextStage.name,
      sprite: nextStage.showdownSprite
    });

    setTimeout(() => {
      setEvolvingModal(prev => prev ? { ...prev, stage: 'done' } : null);
      playPokemonCry(nextStage.id);

      setFarmState(prev => {
        if (!prev.activePokemon) return prev;
        const target = prev.activePokemon;
        return {
          ...prev,
          activePokemon: {
            ...target,
            speciesId: nextStage.id,
            name: nextStage.name,
            nickname: target.nickname === target.name ? nextStage.name : target.nickname,
            stageIndex: nextIndex,
            types: nextStage.types,
            sprites: {
              front: nextStage.sprite,
              showdownFront: nextStage.showdownSprite
            }
          }
        };
      });
    }, 2500);
  };

  // 6. 감동의 포켓몬 졸업식 (Graduation)
  const handleGraduate = () => {
    if (!pmon) return;
    const isFinalStage = pmon.stageIndex === pmon.evolutionChain.length - 1;
    if (!isFinalStage || pmon.level < 36) {
      showAlert('졸업 조건: 최종 진화 달성 및 Lv.36 이상 필요합니다.', 'warn');
      return;
    }

    const diploma: GraduationDiploma = {
      id: `diploma_${Date.now()}`,
      pokemonUid: pmon.uid,
      speciesId: pmon.speciesId,
      name: pmon.name,
      nickname: pmon.nickname,
      isShiny: pmon.isShiny,
      sprite: pmon.sprites.showdownFront || pmon.sprites.front,
      ownerName: farmState.ownerName,
      graduatedAt: new Date().toLocaleDateString('ko-KR'),
      finalLevel: pmon.level,
      totalDays: 1,
      jobsDone: pmon.jobsCompleted,
      title: pmon.level >= 50 ? '🌟 전설의 마스터 육성' : '🎓 명예 졸업생'
    };

    setGraduatingModal(diploma);
    playPokemonCry(pmon.speciesId);

    setFarmState(prev => ({
      ...prev,
      coins: prev.coins + 1000, // 졸업 장학금 +1,000 코인
      graduatedPokemon: [diploma, ...prev.graduatedPokemon],
      activePokemon: null // 새 포켓몬 분양받을 수 있게 비움
    }));
  };

  // 7. 새로운 포켓몬 분양받기
  const handleAdoptPokemon = (chainIndex: number) => {
    if (farmState.activePokemon && !confirm('현재 돌보고 있는 포켓몬이 있습니다. 새 포켓몬으로 교체 분양받으시겠습니까?')) {
      return;
    }

    const isShinyChance = Math.random() < 0.05; // 5% 이로치 확률
    const newMon = createNewFarmPokemon(chainIndex, undefined, isShinyChance);

    setFarmState(prev => ({
      ...prev,
      activePokemon: newMon
    }));

    setActiveTab('yard');
    playPokemonCry(newMon.speciesId);
    showAlert(`🐣 [${newMon.name}]을(를) 성공적으로 분양받았습니다! ${isShinyChance ? '✨ [이로치 포켓몬] 당첨!' : ''}`, 'success');
  };

  // 8. 이웃 농장 방문 & 쓰다듬기
  const handleVisitNeighbor = (neighborUser: string) => {
    if (socket && socket.connected) {
      socket.emit('farm-visit', { targetUsername: neighborUser });
    }
  };

  const handleSendHeartToNeighbor = () => {
    if (!visitingFarm || !socket) return;
    socket.emit('farm-pet-heart', {
      targetUsername: visitingFarm.owner,
      senderUsername: farmState.ownerName
    });

    setFarmState(prev => ({
      ...prev,
      coins: prev.coins + 20 // 이웃 방문 보너스 +20 코인
    }));

    showAlert(`💖 [${visitingFarm.owner}]님 농장에 하트 도장을 찍었습니다! (+20 코인 보상)`, 'success');
  };

  const handleAddGuestbookMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestbookInput.trim() || !visitingFarm || !socket) return;

    socket.emit('farm-add-guestbook', {
      targetUsername: visitingFarm.owner,
      author: farmState.ownerName,
      message: guestbookInput.trim()
    });

    setGuestbookInput('');
    showAlert('📝 방명록을 성공적으로 남겼습니다!', 'success');
  };

  return (
    <div className="poke-farm-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar (PC 위장용) */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">Farm!A1</div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-formula-input">
          =LIFECYCLE_MANAGE_ASSET("{pmon ? pmon.name : 'NO_ACTIVE_PET'}", Lv_{pmon?.level || 0}, Hunger_{pmon?.hunger || 0}%, Happiness_{pmon?.happiness || 0}%)
        </div>
      </div>

      {/* 📋 Farm Header & Navigation */}
      <div className="farm-header">
        <div className="farm-title-box">
          <span className="farm-logo">🏡</span>
          <div>
            <h2>{farmState.farmName}</h2>
            <span className="farm-sub">농장주: <strong>{farmState.ownerName}</strong> | 쥬니버 포켓농장 라이프</span>
          </div>
        </div>

        <div className="farm-kpi-bar">
          <span className="kpi-chip coins">🪙 {farmState.coins.toLocaleString()} P</span>
          <span className="kpi-chip hearts">💖 {farmState.heartsCount} 하트</span>
          <span className="kpi-chip diplomas">🎓 {farmState.graduatedPokemon.length}마리 졸업</span>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close" style={{ marginLeft: 6 }}>
              🚪 메인으로
            </button>
          )}
        </div>
      </div>

      {/* 🧭 Farm Navigation Tabs */}
      <nav className="farm-nav-tabs">
        <button className={`farm-tab ${activeTab === 'yard' ? 'active' : ''}`} onClick={() => { setActiveTab('yard'); setVisitingFarm(null); }}>
          🏡 내 농장 (Yard)
        </button>
        <button className={`farm-tab ${activeTab === 'adopt' ? 'active' : ''}`} onClick={() => { setActiveTab('adopt'); setVisitingFarm(null); }}>
          🐣 분양소 (Adopt)
        </button>
        <button className={`farm-tab ${activeTab === 'evolve' ? 'active' : ''}`} onClick={() => { setActiveTab('evolve'); setVisitingFarm(null); }}>
          ✨ 진화의 방 (Evolve)
        </button>
        <button className={`farm-tab ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => { setActiveTab('jobs'); setVisitingFarm(null); }}>
          💼 아르바이트 (Jobs)
        </button>
        <button className={`farm-tab ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => { setActiveTab('shop'); setVisitingFarm(null); }}>
          🛍️ 열매 상점 (Shop)
        </button>
        <button className={`farm-tab ${activeTab === 'diplomas' ? 'active' : ''}`} onClick={() => { setActiveTab('diplomas'); setVisitingFarm(null); }}>
          🎓 명예의 전당 (Hall of Fame)
        </button>
        <button className={`farm-tab ${activeTab === 'neighbors' ? 'active' : ''}`} onClick={() => setActiveTab('neighbors')}>
          🚶‍♂️ 이웃 농장 (Social)
        </button>
      </nav>

      {/* ⚠️ Action Toast Alert */}
      {actionAlert && (
        <div className={`farm-toast-alert ${actionAlert.type}`}>
          {actionAlert.text}
        </div>
      )}

      {/* 📱 Main Tab Workspace */}
      <div className="farm-workspace-body">
        {/* =========================================================================
            TAB 1: 🏡 내 농장 (Farm Yard)
           ========================================================================= */}
        {activeTab === 'yard' && !visitingFarm && (
          <div className="farm-yard-layout">
            {pmon ? (
              <>
                {/* 🌿 Interactive Farm Pasture Screen */}
                <div className="farm-pasture-screen" onClick={handlePetPokemon}>
                  <div className="pasture-clouds">☁️ ☀️ ☁️</div>
                  <div className="pasture-ground">
                    {/* Pokémon Visual Sprite */}
                    <div className="farm-pokemon-stage">
                      {pmon.isShiny && <span className="shiny-sparkle-tag">✨ SHINY</span>}
                      <img
                        src={pmon.sprites.showdownFront || pmon.sprites.front}
                        alt={pmon.nickname}
                        className="farm-active-sprite"
                      />
                      <div className="pet-shadow"></div>
                      <div className="pet-nametag">
                        <span>{pmon.nickname} (Lv.{pmon.level})</span>
                        <button className="cry-btn" onClick={(e) => { e.stopPropagation(); playPokemonCry(pmon.speciesId); }} title="울음소리 듣기">
                          <Volume2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Floating Heart Effect */}
                  {floatingHeart && (
                    <div className="floating-heart" style={{ left: '50%', top: '40%' }}>
                      💖 +하트!
                    </div>
                  )}

                  <div className="pasture-touch-hint">
                    💡 포켓몬을 터치/클릭하면 예뻐해주기 & 친밀도가 상승합니다!
                  </div>
                </div>

                {/* 📊 4대 상태 게이지 & 레벨 정보 */}
                <div className="farm-status-panel">
                  <div className="status-header-row">
                    <div>
                      <h3>{pmon.nickname}의 상태 대시보드</h3>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        종족: {pmon.name} | 타입: {pmon.types.join('/')} | 누적 애정: {pmon.totalPats}회
                      </span>
                    </div>
                    {/* 진화/졸업 바로가기 배지 */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {pmon.stageIndex < pmon.evolutionChain.length - 1 && (
                        <button className="excel-btn primary pulse" onClick={() => setActiveTab('evolve')}>
                          ✨ 진화의 방
                        </button>
                      )}
                      {pmon.stageIndex === pmon.evolutionChain.length - 1 && pmon.level >= 36 && (
                        <button className="excel-btn warning pulse" onClick={handleGraduate}>
                          🎓 졸업식 치르기
                        </button>
                      )}
                    </div>
                  </div>

                  {/* EXP Bar */}
                  <div className="gauge-row">
                    <div className="gauge-label">
                      <span>⭐ 레벨 {pmon.level}</span>
                      <span>{pmon.exp} / {pmon.maxExp} EXP</span>
                    </div>
                    <div className="gauge-track">
                      <div className="gauge-fill exp" style={{ width: `${Math.min(100, Math.round((pmon.exp / pmon.maxExp) * 100))}%` }} />
                    </div>
                  </div>

                  {/* 4 Status Gauges Grid */}
                  <div className="gauges-grid">
                    <div className="gauge-item">
                      <div className="gauge-label">
                        <span>🍎 배고픔</span>
                        <span>{pmon.hunger}/100</span>
                      </div>
                      <div className="gauge-track">
                        <div className="gauge-fill hunger" style={{ width: `${pmon.hunger}%`, backgroundColor: pmon.hunger > 30 ? '#10b981' : '#ef4444' }} />
                      </div>
                    </div>

                    <div className="gauge-item">
                      <div className="gauge-label">
                        <span>🧼 청결도</span>
                        <span>{pmon.cleanliness}/100</span>
                      </div>
                      <div className="gauge-track">
                        <div className="gauge-fill cleanliness" style={{ width: `${pmon.cleanliness}%`, backgroundColor: pmon.cleanliness > 30 ? '#06b6d4' : '#f59e0b' }} />
                      </div>
                    </div>

                    <div className="gauge-item">
                      <div className="gauge-label">
                        <span>💖 친밀도</span>
                        <span>{pmon.happiness}/100</span>
                      </div>
                      <div className="gauge-track">
                        <div className="gauge-fill happiness" style={{ width: `${pmon.happiness}%`, backgroundColor: '#ec4899' }} />
                      </div>
                    </div>

                    <div className="gauge-item">
                      <div className="gauge-label">
                        <span>⚡ 에너지</span>
                        <span>{pmon.energy}/100</span>
                      </div>
                      <div className="gauge-track">
                        <div className="gauge-fill energy" style={{ width: `${pmon.energy}%`, backgroundColor: '#eab308' }} />
                      </div>
                    </div>
                  </div>

                  {/* 🍎 Quick Care Actions */}
                  <div className="quick-actions-bar">
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      🎒 보유 아이템으로 즉시 돌보기:
                    </div>
                    <div className="inventory-chips-row">
                      {FARM_ITEMS.map(item => {
                        const qty = farmState.inventory[item.id] || 0;
                        return (
                          <button
                            key={item.id}
                            className={`care-item-btn ${qty > 0 ? 'available' : 'empty'}`}
                            onClick={() => handleUseItem(item)}
                            disabled={qty <= 0}
                            title={`${item.description} (보유: ${qty}개)`}
                          >
                            <span className="item-icon">{item.icon}</span>
                            <span className="item-name">{item.name}</span>
                            <span className="item-qty">x{qty}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-yard-card">
                <div style={{ fontSize: '3rem' }}>🐣</div>
                <h3>현재 농장에 포켓몬이 없습니다!</h3>
                <p>분양소에서 아기 포켓몬을 입양하여 사랑으로 키워보세요.</p>
                <button className="excel-btn primary" onClick={() => setActiveTab('adopt')} style={{ padding: '8px 24px', marginTop: 12 }}>
                  🐣 포켓몬 분양받으러 가기
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: 🐣 분양소 (Adoption Center)
           ========================================================================= */}
        {activeTab === 'adopt' && !visitingFarm && (
          <div className="farm-adopt-grid">
            <div className="adopt-banner">
              <h3>🐣 쥬니버 포켓몬 분양소</h3>
              <p>원하는 스타팅 포켓몬을 선택하여 입양하세요! 5% 확률로 희귀한 **이로치(Shiny)** 포켓몬이 탄생합니다.</p>
            </div>

            <div className="starter-cards-grid">
              {STARTER_CHAINS.map((chain, idx) => {
                const baby = chain[0];
                return (
                  <div key={baby.id} className="starter-adopt-card">
                    <div className="starter-avatar-box">
                      <img src={baby.showdownSprite || baby.sprite} alt={baby.name} />
                    </div>
                    <div className="starter-info">
                      <h4>{baby.name}</h4>
                      <div className="type-badge-row">
                        {baby.types.map(t => (
                          <span key={t} className="type-tag">{t}</span>
                        ))}
                      </div>
                      <p className="evolution-preview">
                        진화 경로: {chain.map(c => c.name).join(' ➔ ')}
                      </p>
                    </div>
                    <button className="excel-btn primary" onClick={() => handleAdoptPokemon(idx)}>
                      🐣 이 아이 입양하기
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: ✨ 진화의 방 (Evolution Chamber)
           ========================================================================= */}
        {activeTab === 'evolve' && !visitingFarm && (
          <div className="farm-evolve-container">
            {pmon ? (
              <>
                <div className="evolve-header">
                  <h3>✨ 신비한 진화의 방</h3>
                  <p>정성스럽게 돌보아 레벨과 친밀도를 달성하면 다음 단계로 진화합니다!</p>
                </div>

                <div className="evolve-stages-diagram">
                  {pmon.evolutionChain.map((st, idx) => {
                    const isCurrent = idx === pmon.stageIndex;
                    const isPassed = idx < pmon.stageIndex;

                    return (
                      <React.Fragment key={st.id}>
                        <div className={`stage-node ${isCurrent ? 'current' : isPassed ? 'passed' : 'locked'}`}>
                          <img src={st.showdownSprite || st.sprite} alt={st.name} />
                          <div className="stage-name">{st.name}</div>
                          <div className="stage-req">Lv.{st.minLevel}+</div>
                          {isCurrent && <span className="current-tag">현재</span>}
                        </div>
                        {idx < pmon.evolutionChain.length - 1 && (
                          <div className={`stage-arrow ${isPassed ? 'passed' : ''}`}>➔</div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {pmon.stageIndex < pmon.evolutionChain.length - 1 ? (
                  (() => {
                    const nextStage = pmon.evolutionChain[pmon.stageIndex + 1];
                    const levelMet = pmon.level >= nextStage.minLevel;
                    const happyMet = pmon.happiness >= nextStage.minHappiness;
                    const canEvolve = levelMet && happyMet;

                    return (
                      <div className="evolve-action-card">
                        <h4>다음 진화: [{nextStage.name}] 조건 달성표</h4>
                        <div className="req-checklist">
                          <div className={`check-item ${levelMet ? 'checked' : ''}`}>
                            {levelMet ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>레벨 조건: 필요 Lv.{nextStage.minLevel} (현재: Lv.{pmon.level})</span>
                          </div>
                          <div className={`check-item ${happyMet ? 'checked' : ''}`}>
                            {happyMet ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>친밀도 조건: 필요 {nextStage.minHappiness}+ (현재: {pmon.happiness})</span>
                          </div>
                        </div>

                        <button
                          className="excel-btn primary evolve-btn"
                          disabled={!canEvolve}
                          onClick={handleEvolve}
                        >
                          {canEvolve ? '✨ 지금 바로 진화시키기!' : '⏳ 조건을 먼저 달성해 주세요'}
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="evolve-action-card completed">
                    <Trophy size={32} style={{ color: '#d97706', marginBottom: 6 }} />
                    <h4>🎉 최종 진화 완료!</h4>
                    <p>[{pmon.name}]은(는) 이미 최강의 최종 진화체입니다. Lv.36 이상 달성 후 감동의 졸업식을 치러보세요!</p>
                    <button className="excel-btn warning" onClick={handleGraduate}>
                      🎓 졸업식 진행하기
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-yard-card">
                <p>돌보고 있는 포켓몬이 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: 💼 아르바이트 (Part-Time Jobs)
           ========================================================================= */}
        {activeTab === 'jobs' && !visitingFarm && (
          <div className="farm-jobs-layout">
            <div className="jobs-banner">
              <h3>💼 포켓몬 아르바이트 센터</h3>
              <p>포켓몬이 일을 도와주고 용돈(코인)과 경험치를 벌어옵니다!</p>
            </div>

            <div className="jobs-list-grid">
              {FARM_JOBS.map(job => {
                const canWork = pmon && pmon.level >= job.minLevel && pmon.energy >= job.energyCost && pmon.hunger >= job.hungerCost;
                return (
                  <div key={job.id} className="job-card">
                    <div className="job-icon-col">
                      <span className="job-emoji">{job.icon}</span>
                    </div>
                    <div className="job-details">
                      <h4>{job.title}</h4>
                      <p className="job-desc">{job.desc}</p>
                      <div className="job-costs-row">
                        <span>⚡ 체력 -{job.energyCost}</span>
                        <span>🍎 배고픔 -{job.hungerCost}</span>
                        <span>최소 Lv.{job.minLevel}</span>
                      </div>
                    </div>
                    <div className="job-reward-action">
                      <div className="reward-badge">
                        <span>🪙 +{job.rewardCoins} P</span>
                        <span style={{ fontSize: '0.72rem', color: '#107c41' }}>+{job.expReward} EXP</span>
                      </div>
                      <button
                        className="excel-btn primary"
                        onClick={() => handleWorkJob(job)}
                        disabled={!canWork}
                      >
                        알바 시작
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: 🛍️ 열매 상점 (Item Shop)
           ========================================================================= */}
        {activeTab === 'shop' && !visitingFarm && (
          <div className="farm-shop-layout">
            <div className="shop-banner">
              <h3>🛍️ 쥬니버 포켓몬 마트</h3>
              <p>맛있는 나무열매와 목욕 용품, 활력 비타민을 구매하여 포켓몬을 돌보세요!</p>
            </div>

            <div className="shop-items-grid">
              {FARM_ITEMS.map(item => (
                <div key={item.id} className="shop-item-card">
                  <div className="item-icon-box">{item.icon}</div>
                  <h4>{item.name}</h4>
                  <p className="item-desc">{item.description}</p>
                  <div className="item-price-row">
                    <span className="price-tag">🪙 {item.price} P</span>
                    <button className="excel-btn primary" onClick={() => handleBuyItem(item)}>
                      구매하기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: 🎓 명예의 전당 & 졸업 앨범 (Diplomas)
           ========================================================================= */}
        {activeTab === 'diplomas' && !visitingFarm && (
          <div className="farm-diplomas-layout">
            <div className="diplomas-banner">
              <h3>🎓 포켓농장 명예의 전당 (Graduation Hall of Fame)</h3>
              <p>지극정성으로 키워 졸업시킨 역대 포켓몬들의 졸업 증서 앨범입니다.</p>
            </div>

            {farmState.graduatedPokemon.length > 0 ? (
              <div className="diplomas-grid">
                {farmState.graduatedPokemon.map(dip => (
                  <div key={dip.id} className="diploma-card" onClick={() => setSelectedDiploma(dip)}>
                    <div className="diploma-cap-icon">🎓</div>
                    <img src={dip.sprite} alt={dip.name} className="diploma-sprite" />
                    <h4>{dip.nickname}</h4>
                    <span className="diploma-title">{dip.title}</span>
                    <span className="diploma-date">{dip.graduatedAt} 졸업</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-yard-card">
                <p>아직 졸업한 포켓몬이 없습니다. 포켓몬을 끝까지 키워 멋진 졸업식을 치러보세요!</p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 7: 🚶‍♂️ 이웃 농장 탐방 & 방명록 (Social)
           ========================================================================= */}
        {activeTab === 'neighbors' && (
          <div className="farm-social-layout">
            {visitingFarm ? (
              /* 이웃 농장 방문 뷰 */
              <div className="visiting-farm-container">
                <div className="visiting-header">
                  <button className="excel-btn" onClick={() => setVisitingFarm(null)}>
                    ◀ 이웃 목록으로 돌아가기
                  </button>
                  <h3>🏡 {visitingFarm.farm.farmName}</h3>
                  <button className="excel-btn primary pulse" onClick={handleSendHeartToNeighbor}>
                    💖 쓰다듬고 응원하기 (+20 코인)
                  </button>
                </div>

                {/* 이웃 포켓몬 마당 */}
                <div className="farm-pasture-screen">
                  {visitingFarm.farm.activePokemon ? (
                    <div className="farm-pokemon-stage">
                      <img
                        src={visitingFarm.farm.activePokemon.sprites.showdownFront || visitingFarm.farm.activePokemon.sprites.front}
                        alt={visitingFarm.farm.activePokemon.nickname}
                        className="farm-active-sprite"
                      />
                      <div className="pet-shadow"></div>
                      <div className="pet-nametag">
                        {visitingFarm.farm.activePokemon.nickname} (Lv.{visitingFarm.farm.activePokemon.level})
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', paddingTop: 60, color: '#64748b' }}>
                      현재 돌보고 있는 포켓몬이 없습니다.
                    </div>
                  )}
                </div>

                {/* 방명록 섹션 */}
                <div className="guestbook-section">
                  <h4>📝 {visitingFarm.owner}님의 방명록</h4>
                  <form onSubmit={handleAddGuestbookMessage} className="guestbook-form">
                    <input
                      type="text"
                      value={guestbookInput}
                      onChange={e => setGuestbookInput(e.target.value)}
                      placeholder="따뜻한 한 줄 방명록을 남겨보세요! (예: 포켓몬 너무 멋져요~🐾)"
                      maxLength={80}
                      required
                    />
                    <button type="submit" className="excel-btn primary">
                      <Send size={13} /> 남기기
                    </button>
                  </form>

                  <div className="guestbook-entries-list">
                    {visitingFarm.guestbook.length > 0 ? (
                      visitingFarm.guestbook.map(entry => (
                        <div key={entry.id} className="guestbook-item">
                          <div className="gb-author">
                            <strong>👤 {entry.author}</strong>
                            <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div className="gb-message">{entry.message}</div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '12px' }}>
                        아직 작성된 방명록이 없습니다. 첫 번째 방명록을 남겨보세요!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* 이웃 농장 목록 뷰 */
              <div className="neighbors-list-container">
                <div className="neighbors-header">
                  <h3>🚶‍♂️ 활성 이웃 농장 둘러보기</h3>
                  <div className="search-bar">
                    <input
                      type="text"
                      value={neighborSearch}
                      onChange={e => setNeighborSearch(e.target.value)}
                      placeholder="친구 닉네임 검색..."
                    />
                  </div>
                </div>

                <div className="neighbors-grid">
                  {neighborList
                    .filter(n => n.username.toLowerCase().includes(neighborSearch.toLowerCase()))
                    .map(neighbor => (
                      <div key={neighbor.username} className="neighbor-card">
                        <div className="neighbor-avatar">
                          {neighbor.activePokemon ? (
                            <img src={neighbor.activePokemon.sprites.front} alt={neighbor.activePokemon.name} />
                          ) : (
                            <span>🏡</span>
                          )}
                        </div>
                        <div className="neighbor-info">
                          <h4>{neighbor.farmName}</h4>
                          <span className="owner-tag">농장주: {neighbor.username}</span>
                          <div className="stats-badges">
                            <span>🎓 {neighbor.graduatedCount}마리 졸업</span>
                            <span>💖 {neighbor.heartsCount} 하트</span>
                          </div>
                        </div>
                        <button className="excel-btn primary" onClick={() => handleVisitNeighbor(neighbor.username)}>
                          놀러가기 ➔
                        </button>
                      </div>
                    ))}

                  {neighborList.length === 0 && (
                    <div className="empty-yard-card" style={{ gridColumn: '1 / -1' }}>
                      <p>현재 접속 중인 다른 이웃 농장이 없습니다. 친구를 초대해 보세요!</p>
                    </div>
                  )}
                </div>

                {/* 내 방명록 모아보기 */}
                <div className="my-guestbook-box">
                  <h4>📬 내 농장에 도착한 방명록 ({farmState.guestbook.length}건)</h4>
                  <div className="guestbook-entries-list">
                    {farmState.guestbook.map(entry => (
                      <div key={entry.id} className="guestbook-item">
                        <div className="gb-author">
                          <strong>👤 {entry.author}</strong>
                          <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="gb-message">{entry.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✨ EVOLUTION DRAMATIC MODAL */}
      {evolvingModal && (
        <div className="farm-modal-overlay">
          <div className={`evolution-modal-box ${evolvingModal.stage}`}>
            <Sparkles size={36} className="evolve-sparkle-icon" />
            {evolvingModal.stage === 'flashing' ? (
              <>
                <h2>어라...? [{evolvingModal.oldName}]의 상태가...!</h2>
                <div className="evolving-glow-circle">
                  <img src={evolvingModal.sprite} alt="진화 중" className="glow-sprite" />
                </div>
                <p>포켓몬이 눈부신 빛에 휩싸이고 있습니다...!</p>
              </>
            ) : (
              <>
                <h2>축하합니다! [{evolvingModal.newName}](으)로 진화했습니다!</h2>
                <div className="evolved-sprite-box">
                  <img src={evolvingModal.sprite} alt="진화 완료" className="evolved-sprite" />
                </div>
                <button className="excel-btn primary" onClick={() => { setEvolvingModal(null); setActiveTab('yard'); }}>
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🎓 GRADUATION DIPLOMA MODAL */}
      {(graduatingModal || selectedDiploma) && (
        <div className="farm-modal-overlay" onClick={() => { setGraduatingModal(null); setSelectedDiploma(null); }}>
          <div className="diploma-modal-frame" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => { setGraduatingModal(null); setSelectedDiploma(null); }}>
              <X size={16} />
            </button>
            <div className="diploma-inner-certificate">
              <div className="cert-header">
                <div className="cert-seal">🎓</div>
                <h2>포 켓 농 장 졸 업 증 서</h2>
                <span className="cert-no">제 {((graduatingModal || selectedDiploma)?.id || '').substring(0, 12)} 호</span>
              </div>

              <div className="cert-body">
                <img src={(graduatingModal || selectedDiploma)?.sprite} alt="졸업생" className="cert-pokemon-sprite" />
                <div className="cert-name-block">
                  <strong>포켓몬: {(graduatingModal || selectedDiploma)?.nickname} ({(graduatingModal || selectedDiploma)?.name})</strong>
                  <span>육성 농장주: {(graduatingModal || selectedDiploma)?.ownerName}</span>
                </div>
                <p className="cert-text">
                  위 포켓몬은 포켓농장에서 지극한 사랑과 정성으로 훌륭하게 성장하여
                  모든 교육 및 진화 과정을 완벽히 수료하였으므로, 본 명예 졸업 증서를 수여합니다.
                </p>
                <div className="cert-footer">
                  <span>졸업일시: {(graduatingModal || selectedDiploma)?.graduatedAt}</span>
                  <strong className="cert-principal">쥬니버 포켓농장 학장 로토무 (인)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
