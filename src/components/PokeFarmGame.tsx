import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import type { FarmState, FarmPokemon, FarmItem, PartTimeJob, GraduationDiploma, GuestbookEntry, ExpeditionArea, IncubatingEgg } from '../types/farm';
import { 
  STARTER_CHAINS, 
  FARM_ITEMS, 
  FARM_JOBS, 
  EXPEDITION_AREAS,
  LOTTERY_SYMBOLS,
  drawLotteryReels,
  loadFarmState, 
  saveFarmState, 
  createNewFarmPokemon, 
  hatchBabyPokemon,
  playPokemonCry,
  getMaxExpForLevel 
} from '../services/pokeFarmService';
import { 
  Sparkles, Trophy, Volume2, Send, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import './PokeFarmGame.css';

interface PokeFarmGameProps {
  username: string;
  onLeaveRoom?: () => void;
}

type FarmTab = 'yard' | 'adopt' | 'evolve' | 'jobs' | 'expedition' | 'daycare' | 'lottery' | 'shop' | 'diplomas' | 'neighbors';

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

  // 🐣 온보딩 위저드 상태 (농장주 이름 입력 ➔ 스타팅 포켓몬 선택)
  const [onboardingStep, setOnboardingStep] = useState<'name' | 'starter'>('name');
  const [initOwnerName, setInitOwnerName] = useState(username || '지우');
  const [initFarmName, setInitFarmName] = useState(`${username || '지우'}의 포켓농장`);
  const [selectedStarterIdx, setSelectedStarterIdx] = useState(0);
  const [starterNickname, setStarterNickname] = useState('');
  const [genFilter, setGenFilter] = useState<'all' | 'gen1-2' | 'gen3-4' | 'gen5-6' | 'gen7-9' | 'special'>('all');

  // 애니메이션 & 이펙트 상태
  const [floatingHeart, setFloatingHeart] = useState<{ id: number; x: number; y: number } | null>(null);
  const [actionAlert, setActionAlert] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [evolvingModal, setEvolvingModal] = useState<{ active: boolean; stage: 'flashing' | 'done'; oldName: string; newName: string; sprite: string } | null>(null);
  const [graduatingModal, setGraduatingModal] = useState<GraduationDiploma | null>(null);
  const [selectedDiploma, setSelectedDiploma] = useState<GraduationDiploma | null>(null);

  // 💼 아르바이트 현장 체험 애니메이션 모달 상태
  const [jobShiftModal, setJobShiftModal] = useState<{
    active: boolean;
    job: PartTimeJob;
    progress: number;
    statusText: string;
    isDone: boolean;
    rewardGained: {
      coins: number;
      exp: number;
      levelUp: boolean;
      newLevel: number;
    } | null;
  } | null>(null);

  // 🌲 사내 탐험 진행 애니메이션 모달 상태
  const [expeditionModal, setExpeditionModal] = useState<{
    active: boolean;
    area: ExpeditionArea;
    progress: number;
    statusText: string;
    isDone: boolean;
    rewardGained: {
      coins: number;
      exp: number;
      levelUp: boolean;
      newLevel: number;
      foundItems: { item: FarmItem; qty: number }[];
    } | null;
  } | null>(null);

  // 🥚 알 부화 드라마틱 모달 상태
  const [hatchingModal, setHatchingModal] = useState<{
    active: boolean;
    stage: 'wobble' | 'crack' | 'hatched';
    eggName: string;
    isGolden: boolean;
    babyPokemon: FarmPokemon | null;
    nicknameInput: string;
  } | null>(null);

  // 🎰 일일 럭키 사내 복권 슬롯 상태
  const [slotReels, setSlotReels] = useState<[string, string, string]>(['⚡', '⚡', '⚡']);
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [slotSpinResult, setSlotSpinResult] = useState<{
    title: string;
    desc: string;
    coinsWon: number;
    isJackpot: boolean;
    wonItem?: FarmItem;
  } | null>(null);

  // 🌟 팜 쓰다듬기 고유 스킬 모션 상태
  const [petSkillEffect, setPetSkillEffect] = useState<{
    id: number;
    skillName: string;
    type: string;
    icon: string;
    particles: string[];
  } | null>(null);
  const [isPetJumping, setIsPetJumping] = useState(false);

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

  // 🥚 알 부화기 온기 증가 헬퍼
  const addEggWarmth = (amount: number, reason: string) => {
    setFarmState(prev => {
      if (!prev.incubatingEgg || prev.incubatingEgg.progress >= 100) return prev;
      const nextProgress = Math.min(100, prev.incubatingEgg.progress + amount);
      if (nextProgress >= 100) {
        showAlert(`🐣 인큐베이터의 [${prev.incubatingEgg.name}]이(가) 온기를 가득 머금고 부화할 준비가 되었습니다! (${reason})`, 'success');
      }
      return {
        ...prev,
        incubatingEgg: {
          ...prev.incubatingEgg,
          progress: nextProgress
        }
      };
    });
  };

  const pmon = farmState.activePokemon;

  // 1. 포켓몬 쓰다듬기 & 고유 스킬 모션 이펙트
  const handlePetPokemon = (e?: React.MouseEvent) => {
    if (!pmon) return;
    playPokemonCry(pmon.speciesId);
    addEggWarmth(5, '포켓몬 쓰다듬기');

    // 스킬 모션 정보 결정
    let skillName = '애교부리기';
    let skillType = 'normal';
    let skillIcon = '⭐';
    let particles = ['⭐', '✨', '💛', '💖', '🎉'];

    if (pmon.types.includes('water')) {
      skillName = pmon.level >= 30 ? '하이드로펌프' : '물대포';
      skillType = 'water';
      skillIcon = '🌊';
      particles = ['🌊', '💦', '🫧', '💧', '✨'];
    } else if (pmon.types.includes('fire')) {
      skillName = pmon.level >= 30 ? '화염방사' : '불꽃세례';
      skillType = 'fire';
      skillIcon = '🔥';
      particles = ['🔥', '💥', '☄️', '♨️', '✨'];
    } else if (pmon.types.includes('grass')) {
      skillName = pmon.level >= 30 ? '솔라빔' : '잎날가르기';
      skillType = 'grass';
      skillIcon = '🍃';
      particles = ['🍃', '🌸', '🌿', '🌱', '✨'];
    } else if (pmon.types.includes('electric')) {
      skillName = pmon.level >= 30 ? '볼트태클' : '10만볼트';
      skillType = 'electric';
      skillIcon = '⚡';
      particles = ['⚡', '⚡', '🌟', '💛', '✨'];
    } else if (pmon.types.includes('fairy')) {
      skillName = '문포스';
      skillType = 'fairy';
      skillIcon = '💖';
      particles = ['💖', '🌙', '🌸', '✨', '💕'];
    } else if (pmon.types.includes('dragon')) {
      skillName = '용의파동';
      skillType = 'dragon';
      skillIcon = '🐉';
      particles = ['🐉', '☄️', '💫', '🔷', '✨'];
    } else if (pmon.types.includes('ghost') || pmon.types.includes('psychic')) {
      skillName = '사이코키네시스';
      skillType = 'psychic';
      skillIcon = '🔮';
      particles = ['🔮', '🌌', '👻', '💜', '✨'];
    } else if (pmon.types.includes('fighting')) {
      skillName = '인파이트';
      skillType = 'fighting';
      skillIcon = '🥊';
      particles = ['🥊', '💥', '⚡', '💪', '✨'];
    }

    setPetSkillEffect({
      id: Date.now(),
      skillName,
      type: skillType,
      icon: skillIcon,
      particles
    });
    setIsPetJumping(true);

    const clientX = e ? e.clientX : window.innerWidth / 2;
    const clientY = e ? e.clientY : window.innerHeight / 2;
    setFloatingHeart({ id: Date.now(), x: clientX, y: clientY });

    setTimeout(() => setIsPetJumping(false), 700);
    setTimeout(() => {
      setFloatingHeart(null);
      setPetSkillEffect(null);
    }, 1400);

    setFarmState(prev => {
      if (!prev.activePokemon) return prev;
      const newHappiness = Math.min(100, prev.activePokemon.happiness + 5);
      // 🌟 Lv 16 이상일 때 쓰다듬기 경험치 살짝 추가 (15 EXP)
      const expGain = prev.activePokemon.level >= 16 ? 15 : 10;
      const newExp = prev.activePokemon.exp + expGain;
      let newLevel = prev.activePokemon.level;
      let curExp = newExp;
      let maxExp = getMaxExpForLevel(newLevel);

      while (curExp >= maxExp) {
        curExp -= maxExp;
        newLevel += 1;
        maxExp = getMaxExpForLevel(newLevel);
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

    // 🍬 1. 이상한사탕 특수 효과 (즉시 1레벨업!)
    if (item.id === 'rare_candy') {
      setFarmState(prev => {
        if (!prev.activePokemon) return prev;
        const target = prev.activePokemon;
        const newLevel = target.level + 1;
        const maxExp = getMaxExpForLevel(newLevel);
        return {
          ...prev,
          inventory: {
            ...prev.inventory,
            [item.id]: currentQty - 1
          },
          activePokemon: {
            ...target,
            level: newLevel,
            exp: 0,
            maxExp,
            happiness: Math.min(100, target.happiness + 30)
          }
        };
      });
      playPokemonCry(pmon.speciesId);
      showAlert(`🎉 [이상한사탕]의 신비한 힘으로 [${pmon.nickname}]이(가) 즉시 Lv.${pmon.level + 1}이 되었습니다!`, 'success');
      return;
    }

    // 💎 2. 반짝이는 원석 매각 (300 코인 획득)
    if (item.id === 'shiny_stone') {
      setFarmState(prev => ({
        ...prev,
        coins: prev.coins + 300,
        inventory: {
          ...prev.inventory,
          [item.id]: currentQty - 1
        }
      }));
      showAlert(`💎 [반짝이는 원석]을 사내 보석상에 매각하여 300 코인을 획득했습니다!`, 'success');
      return;
    }

    // 👑 3. 전설의 황금 왕관 매각 (1,000 코인 획득)
    if (item.id === 'gold_crown') {
      setFarmState(prev => ({
        ...prev,
        coins: prev.coins + 1000,
        inventory: {
          ...prev.inventory,
          [item.id]: currentQty - 1
        }
      }));
      showAlert(`👑 [전설의 황금 왕관]을 사내 역사관에 기증하여 1,000 코인을 획득했습니다!`, 'success');
      return;
    }

    // 🥚 4. 의문의 알 / 황금알 인큐베이터 입고
    if (item.id === 'mystery_egg' || item.id === 'golden_egg') {
      handlePlaceEggInIncubator(item);
      return;
    }

    if (item.id === 'mild_soap') {
      addEggWarmth(15, '따뜻한 거품 목욕');
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
      let maxExp = getMaxExpForLevel(newLevel);

      while (newExp >= maxExp) {
        newExp -= maxExp;
        newLevel += 1;
        maxExp = getMaxExpForLevel(newLevel);
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

  // 3. 아르바이트 수행 (체험 모달 개시)
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

    playPokemonCry(pmon.speciesId);

    // 알바 작업 모달 개시
    setJobShiftModal({
      active: true,
      job,
      progress: 0,
      statusText: '🏢 현장 도착! 업무를 준비하고 있습니다...',
      isDone: false,
      rewardGained: null
    });
  };

  // 💼 아르바이트 현장 진행 애니메이션 타이머
  useEffect(() => {
    if (!jobShiftModal || !jobShiftModal.active || jobShiftModal.isDone) return;

    const interval = setInterval(() => {
      setJobShiftModal(prev => {
        if (!prev || prev.isDone) return prev;
        const nextProgress = Math.min(100, prev.progress + 14);

        let statusText = '🏢 현장 도착! 업무 준비 중...';
        const isWater = pmon?.types.includes('water');
        const isGrass = pmon?.types.includes('grass');
        const isFire = pmon?.types.includes('fire');
        const isElectric = pmon?.types.includes('electric');

        if (nextProgress >= 20 && nextProgress < 65) {
          if (prev.job.id === 'job_garden') {
            statusText = isWater
              ? '🌊 [물대포/파도타기] 기술로 꽃밭에 시원한 물줄기를 뿜어냅니다!'
              : isGrass
              ? '🍃 [광합성 & 덩굴채찍]으로 싱그러운 정원을 정성스레 가꿉니다!'
              : '🚿 귀여운 물뿌리개로 꽃 하나하나에 촉촉하게 물을 주는 중!';
          } else if (prev.job.id === 'job_mail') {
            statusText = '📬 사내 중요 서류를 신속 정확하게 배달하는 중! 🏃‍♂️💨';
          } else if (prev.job.id === 'job_coffee') {
            statusText = isFire
              ? '🔥 [불꽃세례]로 장인의 프리미엄 원두를 로스팅 중!'
              : '☕ 향긋한 프리미엄 핸드드립 커피를 정성껏 추출 중! ☕✨';
          } else if (prev.job.id === 'job_generator') {
            statusText = isElectric
              ? '⚡ [10만볼트] 고출력 전기 충전으로 배터리를 급속 충전 중!'
              : '🔋 에너지 가득 다이나모 발전 휠을 힘차게 돌리는 중!';
          } else {
            statusText = '🕶️ VIP 대표님을 빈틈없이 든든하게 에스코트 경호 중!';
          }
        } else if (nextProgress >= 65 && nextProgress < 95) {
          statusText = '✨ 마무리 품질 검수 및 현장 정리 정돈 중...';
        } else if (nextProgress >= 100) {
          statusText = '🎉 업무 완수! 급여 명세서가 발급되었습니다.';
        }

        if (nextProgress >= 100) {
          if (pmon) {
            let newExp = pmon.exp + prev.job.expReward;
            let newLevel = pmon.level;
            let maxExp = getMaxExpForLevel(newLevel);
            let didLevelUp = false;

            while (newExp >= maxExp) {
              newExp -= maxExp;
              newLevel += 1;
              maxExp = getMaxExpForLevel(newLevel);
              didLevelUp = true;
            }

            setFarmState(fPrev => {
              if (!fPrev.activePokemon) return fPrev;
              const target = fPrev.activePokemon;
              return {
                ...fPrev,
                coins: fPrev.coins + prev.job.rewardCoins,
                activePokemon: {
                  ...target,
                  energy: Math.max(0, target.energy - prev.job.energyCost),
                  hunger: Math.max(0, target.hunger - prev.job.hungerCost),
                  cleanliness: Math.max(0, target.cleanliness - prev.job.cleanlinessCost),
                  level: newLevel,
                  exp: newExp,
                  maxExp,
                  jobsCompleted: target.jobsCompleted + 1
                }
              };
            });

            addEggWarmth(20, '아르바이트 완수');

            return {
              ...prev,
              progress: 100,
              statusText: '🎉 업무 완수! 급여 명세서가 발급되었습니다.',
              isDone: true,
              rewardGained: {
                coins: prev.job.rewardCoins,
                exp: prev.job.expReward,
                levelUp: didLevelUp,
                newLevel
              }
            };
          }
        }

        return {
          ...prev,
          progress: nextProgress,
          statusText
        };
      });
    }, 280);

    return () => clearInterval(interval);
  }, [jobShiftModal?.active, jobShiftModal?.isDone, pmon]);

  // 🌲 3-2. 사내 뒷산 탐험 개시
  const handleStartExpedition = (area: ExpeditionArea) => {
    if (!pmon) return;
    if (pmon.level < area.minLevel) {
      showAlert(`탐험 참여 조건 부족: Lv.${area.minLevel} 이상 필요합니다.`, 'warn');
      return;
    }
    if (pmon.energy < area.energyCost) {
      showAlert('체력이 부족합니다! 비타민 음료를 먹이거나 휴식을 취해주세요.', 'warn');
      return;
    }
    if (pmon.hunger < area.hungerCost) {
      showAlert('배가 너무 고파서 탐험을 떠날 수 없습니다! 열매를 먹여주세요.', 'warn');
      return;
    }

    playPokemonCry(pmon.speciesId);

    setExpeditionModal({
      active: true,
      area,
      progress: 0,
      statusText: '🎒 탐험 배낭을 메고 목적지로 출발합니다!',
      isDone: false,
      rewardGained: null
    });
  };

  // 🌲 사내 뒷산 탐험 진행 애니메이션 타이머
  useEffect(() => {
    if (!expeditionModal || !expeditionModal.active || expeditionModal.isDone) return;

    const interval = setInterval(() => {
      setExpeditionModal(prev => {
        if (!prev || prev.isDone) return prev;
        const nextProgress = Math.min(100, prev.progress + 12);

        let statusText = '🗺️ 목적지에 도착하여 주변 지형을 정찰 중...';
        if (nextProgress >= 20 && nextProgress < 50) {
          statusText = '🔍 수풀과 덤불 사이를 조심스럽게 헤치며 숨겨진 길을 탐색하는 중...';
        } else if (nextProgress >= 50 && nextProgress < 75) {
          statusText = '✨ 앗! 바위 틈과 보관함에서 무언가 반짝이는 보물 상자를 발견했습니다! 🎁';
        } else if (nextProgress >= 75 && nextProgress < 95) {
          statusText = '🏃‍♂️ 발각되지 않도록 전리품을 배낭에 단단히 챙겨 본부로 귀환하는 중!';
        } else if (nextProgress >= 100) {
          statusText = '🎉 탐험 대성공! 전리품 보고서가 도착했습니다.';
        }

        if (nextProgress >= 100) {
          if (pmon) {
            const gainedCoins = Math.floor(Math.random() * (prev.area.rewardCoinsMax - prev.area.rewardCoinsMin + 1)) + prev.area.rewardCoinsMin;
            const gainedExp = Math.floor(Math.random() * (prev.area.rewardExpMax - prev.area.rewardExpMin + 1)) + prev.area.rewardExpMin;

            const foundItems: { item: FarmItem; qty: number }[] = [];
            const inventoryAdd: Record<string, number> = {};

            prev.area.dropItems.forEach(drop => {
              if (Math.random() < drop.chance) {
                const itemObj = FARM_ITEMS.find(i => i.id === drop.itemId);
                if (itemObj) {
                  foundItems.push({ item: itemObj, qty: 1 });
                  inventoryAdd[drop.itemId] = (inventoryAdd[drop.itemId] || 0) + 1;
                }
              }
            });

            let newExp = pmon.exp + gainedExp;
            let newLevel = pmon.level;
            let maxExp = getMaxExpForLevel(newLevel);
            let didLevelUp = false;

            while (newExp >= maxExp) {
              newExp -= maxExp;
              newLevel += 1;
              maxExp = getMaxExpForLevel(newLevel);
              didLevelUp = true;
            }

            setFarmState(fPrev => {
              if (!fPrev.activePokemon) return fPrev;
              const target = fPrev.activePokemon;
              const nextInv = { ...fPrev.inventory };
              Object.entries(inventoryAdd).forEach(([k, v]) => {
                nextInv[k] = (nextInv[k] || 0) + v;
              });

              return {
                ...fPrev,
                coins: fPrev.coins + gainedCoins,
                inventory: nextInv,
                activePokemon: {
                  ...target,
                  energy: Math.max(0, target.energy - prev.area.energyCost),
                  hunger: Math.max(0, target.hunger - prev.area.hungerCost),
                  cleanliness: Math.max(0, target.cleanliness - prev.area.cleanlinessCost),
                  level: newLevel,
                  exp: newExp,
                  maxExp
                }
              };
            });

            addEggWarmth(25, '탐험 완수');

            return {
              ...prev,
              progress: 100,
              statusText: '🎉 탐험 대성공! 전리품 보고서가 도착했습니다.',
              isDone: true,
              rewardGained: {
                coins: gainedCoins,
                exp: gainedExp,
                levelUp: didLevelUp,
                newLevel,
                foundItems
              }
            };
          }
        }

        return {
          ...prev,
          progress: nextProgress,
          statusText
        };
      });
    }, 280);

    return () => clearInterval(interval);
  }, [expeditionModal?.active, expeditionModal?.isDone, pmon]);

  // 🥚 3-3. 인큐베이터에 알 넣기
  const handlePlaceEggInIncubator = (eggItem: FarmItem) => {
    if (farmState.incubatingEgg) {
      showAlert('인큐베이터에 이미 품고 있는 알이 있습니다! 먼저 부화시켜 주세요.', 'warn');
      return;
    }
    const currentQty = farmState.inventory[eggItem.id] || 0;
    if (currentQty <= 0) {
      showAlert(`보유 중인 [${eggItem.name}]이 없습니다. 상점이나 탐험에서 획득해 보세요!`, 'warn');
      return;
    }

    const isGolden = eggItem.id === 'golden_egg';
    const newEgg: IncubatingEgg = {
      id: `egg_${Date.now()}`,
      name: eggItem.name,
      icon: eggItem.icon,
      isGolden,
      progress: 0,
      acquiredAt: new Date().toISOString()
    };

    setFarmState(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [eggItem.id]: currentQty - 1
      },
      incubatingEgg: newEgg
    }));

    showAlert(`🥚 [${eggItem.name}]을(를) 인큐베이터에 넣었습니다! 쓰다듬기, 목욕, 알바, 탐험으로 온기를 모아주세요!`, 'success');
  };

  // 🐣 3-4. 알 부화 시작 (모달 오픈 & 3단계 연출)
  const handleStartHatching = () => {
    if (!farmState.incubatingEgg || farmState.incubatingEgg.progress < 100) {
      showAlert('알의 온기가 아직 부족합니다! (100% 도달 필요)', 'warn');
      return;
    }

    const egg = farmState.incubatingEgg;
    const { chainIdx, isShiny } = hatchBabyPokemon(egg.isGolden);
    const newBaby = createNewFarmPokemon(chainIdx, undefined, isShiny);

    setHatchingModal({
      active: true,
      stage: 'wobble',
      eggName: egg.name,
      isGolden: egg.isGolden,
      babyPokemon: newBaby,
      nicknameInput: newBaby.name
    });

    // 1단계 -> 2단계: 금 가기
    setTimeout(() => {
      setHatchingModal(prev => prev ? { ...prev, stage: 'crack' } : null);
    }, 1400);

    // 2단계 -> 3단계: 부화 완료!
    setTimeout(() => {
      setHatchingModal(prev => prev ? { ...prev, stage: 'hatched' } : null);
      playPokemonCry(newBaby.speciesId);
    }, 2800);
  };

  // 🎉 3-5. 부화된 아기 포켓몬 수령 (대표 파트너로 교체 or 보육소에 보관)
  const handleConfirmHatch = (choice: 'setActive' | 'sendToReserve') => {
    if (!hatchingModal || !hatchingModal.babyPokemon) return;

    const baby = {
      ...hatchingModal.babyPokemon,
      nickname: hatchingModal.nicknameInput.trim() || hatchingModal.babyPokemon.name
    };

    setFarmState(prev => {
      let nextActive = prev.activePokemon;
      const nextReserve = [...(prev.reservePokemon || [])];

      if (choice === 'setActive') {
        if (prev.activePokemon) {
          nextReserve.unshift(prev.activePokemon);
        }
        nextActive = baby;
      } else {
        nextReserve.unshift(baby);
      }

      return {
        ...prev,
        activePokemon: nextActive,
        reservePokemon: nextReserve,
        incubatingEgg: null
      };
    });

    setHatchingModal(null);
    showAlert(
      choice === 'setActive'
        ? `🌟 갓 태어난 [${baby.nickname}]이(가) 내 새로운 대표 파트너가 되었습니다!`
        : `🏡 [${baby.nickname}]이(가) 보육소 목장에 안전하게 등록되었습니다!`,
      'success'
    );
  };

  // 🔄 3-6. 보육소 목장의 포켓몬으로 대표 파트너 교체하기
  const handleSwitchActivePokemon = (targetUid: string) => {
    setFarmState(prev => {
      const reserves = [...(prev.reservePokemon || [])];
      const targetIdx = reserves.findIndex(p => p.uid === targetUid);
      if (targetIdx === -1) return prev;

      const targetMon = reserves[targetIdx];
      reserves.splice(targetIdx, 1);

      if (prev.activePokemon) {
        reserves.unshift(prev.activePokemon);
      }

      return {
        ...prev,
        activePokemon: targetMon,
        reservePokemon: reserves
      };
    });

    showAlert('✨ 대표 파트너 포켓몬을 성공적으로 교체했습니다!', 'success');
  };

  // 🎰 3-7. 일일 럭키 사내 복권 슬롯 추첨
  const handleSpinLottery = () => {
    if (isSlotSpinning) return;

    const lottery = farmState.lotteryState || {
      lastDate: new Date().toISOString().split('T')[0],
      freeSpinsLeft: 3,
      jackpotPool: 2000
    };

    const isFree = lottery.freeSpinsLeft > 0;
    const cost = isFree ? 0 : 50;

    if (!isFree && farmState.coins < cost) {
      showAlert('복권 추첨 비용(50P)이 부족합니다! 알바나 탐험으로 코인을 모아보세요.', 'warn');
      return;
    }

    if (pmon) playPokemonCry(pmon.speciesId);
    setIsSlotSpinning(true);
    setSlotSpinResult(null);

    // 비용 차감 및 잭팟 풀 적립 (유료인 경우 25P는 잭팟 풀로 누적)
    setFarmState(prev => {
      const prevLottery = prev.lotteryState || lottery;
      return {
        ...prev,
        coins: prev.coins - cost,
        lotteryState: {
          ...prevLottery,
          freeSpinsLeft: Math.max(0, prevLottery.freeSpinsLeft - (isFree ? 1 : 0)),
          jackpotPool: prevLottery.jackpotPool + (!isFree ? 25 : 5)
        }
      };
    });

    // 릴 셔플 애니메이션 인터벌
    const icons = LOTTERY_SYMBOLS.map(s => s.icon);
    let counter = 0;
    const shuffleTimer = setInterval(() => {
      counter++;
      setSlotReels([
        icons[Math.floor(Math.random() * icons.length)],
        icons[Math.floor(Math.random() * icons.length)],
        icons[Math.floor(Math.random() * icons.length)]
      ]);
    }, 100);

    // 1.8초 후 최종 당첨 결과 결정
    setTimeout(() => {
      clearInterval(shuffleTimer);
      const drawn = drawLotteryReels();
      setSlotReels([drawn[0].icon, drawn[1].icon, drawn[2].icon]);
      setIsSlotSpinning(false);

      // 온기 +5% 보너스
      addEggWarmth(5, '사내 복권 참여');

      // 당첨 규칙 판정
      const [s1, s2, s3] = drawn;
      const currentJackpot = farmState.lotteryState?.jackpotPool || 2000;

      // 1. 대박 잭팟: 777 피카츄 3개!
      if (s1.id === 'jackpot' && s2.id === 'jackpot' && s3.id === 'jackpot') {
        const jackpotWin = currentJackpot;
        const goldenEggItem = FARM_ITEMS.find(i => i.id === 'golden_egg');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + jackpotWin,
          inventory: {
            ...prev.inventory,
            golden_egg: (prev.inventory.golden_egg || 0) + 1
          },
          lotteryState: {
            ...prev.lotteryState!,
            jackpotPool: 1000
          }
        }));
        setSlotSpinResult({
          title: '🚨 MEGA JACKPOT 대박 잭팟 달성! 🚨',
          desc: `사내 누적 잭팟 상금 ${jackpotWin.toLocaleString()}P 전액 수령! 추가로 🌟 황금빛 전설의 알을 획득했습니다!`,
          coinsWon: jackpotWin,
          isJackpot: true,
          wonItem: goldenEggItem
        });
        showAlert(`🎉 MEGA JACKPOT! 사내 잭팟 상금 ${jackpotWin.toLocaleString()}P 당첨!`, 'success');
        return;
      }

      // 2. 이상한사탕 3개
      if (s1.id === 'candy' && s2.id === 'candy' && s3.id === 'candy') {
        const candyItem = FARM_ITEMS.find(i => i.id === 'rare_candy');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 300,
          inventory: {
            ...prev.inventory,
            rare_candy: (prev.inventory.rare_candy || 0) + 1
          }
        }));
        setSlotSpinResult({
          title: '🍬 스위트 캔디 잭팟!',
          desc: '즉시 1레벨을 올려주는 🍬 이상한사탕 1개와 🪙 300P를 획득했습니다!',
          coinsWon: 300,
          isJackpot: false,
          wonItem: candyItem
        });
        return;
      }

      // 3. 의문의 알 3개
      if (s1.id === 'egg' && s2.id === 'egg' && s3.id === 'egg') {
        const eggItem = FARM_ITEMS.find(i => i.id === 'mystery_egg');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 400,
          inventory: {
            ...prev.inventory,
            mystery_egg: (prev.inventory.mystery_egg || 0) + 1
          }
        }));
        setSlotSpinResult({
          title: '🥚 미스터리 에그 잭팟!',
          desc: '부화기에 품을 수 있는 🥚 의문의 포켓몬 알과 🪙 400P를 획득했습니다!',
          coinsWon: 400,
          isJackpot: false,
          wonItem: eggItem
        });
        return;
      }

      // 4. 거품비누 3개
      if (s1.id === 'soap' && s2.id === 'soap' && s3.id === 'soap') {
        const soapItem = FARM_ITEMS.find(i => i.id === 'mild_soap');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 250,
          inventory: {
            ...prev.inventory,
            mild_soap: (prev.inventory.mild_soap || 0) + 2
          }
        }));
        setSlotSpinResult({
          title: '🧼 버블버블 클린 잭팟!',
          desc: '깨끗한 거품비누 2개와 🪙 250P를 획득했습니다!',
          coinsWon: 250,
          isJackpot: false,
          wonItem: soapItem
        });
        return;
      }

      // 5. 오랭열매 3개
      if (s1.id === 'berry' && s2.id === 'berry' && s3.id === 'berry') {
        const berryItem = FARM_ITEMS.find(i => i.id === 'oran_berry');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 150,
          inventory: {
            ...prev.inventory,
            oran_berry: (prev.inventory.oran_berry || 0) + 3
          }
        }));
        setSlotSpinResult({
          title: '🫐 달콤한 오랭열매 파티!',
          desc: '맛있는 오랭열매 3개와 🪙 150P를 획득했습니다!',
          coinsWon: 150,
          isJackpot: false,
          wonItem: berryItem
        });
        return;
      }

      // 6. 커피 3개
      if (s1.id === 'coffee' && s2.id === 'coffee' && s3.id === 'coffee') {
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 80
        }));
        setSlotSpinResult({
          title: '☕ 탕비실 바리스타 상',
          desc: '회사 탕비실 커피 3잔 일치! 🪙 80P를 획득했습니다.',
          coinsWon: 80,
          isJackpot: false
        });
        return;
      }

      // 7. 2개 일치 (소박 당첨)
      if (s1.id === s2.id || s2.id === s3.id || s1.id === s3.id) {
        const reward = 40;
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + reward
        }));
        setSlotSpinResult({
          title: '✨ 2개 심볼 일치 (소박 당첨)',
          desc: `아깝습니다! 심볼 2개 일치로 🪙 ${reward}P를 획득했습니다.`,
          coinsWon: reward,
          isJackpot: false
        });
        return;
      }

      // 8. 불일치 (위로금)
      const consolation = 10;
      setFarmState(prev => ({
        ...prev,
        coins: prev.coins + consolation
      }));
      setSlotSpinResult({
        title: '🌱 꽝! 다음 기회에...',
        desc: `아쉽게도 일치하지 않았습니다. 위로금 🪙 ${consolation}P가 지급되었습니다.`,
        coinsWon: consolation,
        isJackpot: false
      });
    }, 1800);
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

    const isTargetShiny = pmon.isShiny;
    const evolvedFront = isTargetShiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${nextStage.id}.png`
      : nextStage.sprite;
    const evolvedShowdown = isTargetShiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${nextStage.id}.gif`
      : nextStage.showdownSprite;

    // 진화 애니메이션 모달 시작
    setEvolvingModal({
      active: true,
      stage: 'flashing',
      oldName: pmon.name,
      newName: nextStage.name,
      sprite: evolvedShowdown
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
              front: evolvedFront,
              showdownFront: evolvedShowdown
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

    const isShinyChance = Math.random() < 0.05; // 5% 전설의 포켓몬 확률
    const newMon = createNewFarmPokemon(chainIndex, undefined, isShinyChance);

    setFarmState(prev => ({
      ...prev,
      activePokemon: newMon
    }));

    setActiveTab('yard');
    playPokemonCry(newMon.speciesId);
    showAlert(`🐣 [${newMon.name}]을(를) 성공적으로 분양받았습니다! ${isShinyChance ? '✨ [전설의 포켓몬] 당첨!' : ''}`, 'success');
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

  // 9. 온보딩 완료 처리 (농장 설립 & 첫 파트너 포켓몬 분양)
  const handleCompleteOnboarding = () => {
    const isShinyChance = Math.random() < 0.05; // 5% 전설의 포켓몬 확률
    const newMon = createNewFarmPokemon(selectedStarterIdx, starterNickname.trim() || undefined, isShinyChance);
    const cleanOwner = initOwnerName.trim() || '지우';
    const cleanFarm = initFarmName.trim() || `${cleanOwner}의 포켓농장`;

    localStorage.setItem('pokefarm_saved_owner', cleanOwner);

    setFarmState(prev => ({
      ...prev,
      ownerName: cleanOwner,
      farmName: cleanFarm,
      isInitialized: true,
      activePokemon: newMon
    }));

    playPokemonCry(newMon.speciesId);
    showAlert(`🎉 [${cleanFarm}]이 정식 개장되었습니다! 첫 파트너 [${newMon.name}]과(와) 함께 사랑으로 키워보세요!`, 'success');
  };

  // 🐣 만약 아직 농장이 설립되지 않았다면 온보딩 2단계 위저드 표시
  if (!farmState.isInitialized) {
    const selectedChain = STARTER_CHAINS[selectedStarterIdx] || STARTER_CHAINS[0];
    const starterBaby = selectedChain[0];

    return (
      <div className="poke-farm-container excel-stealth-theme">
        <div className="excel-formula-bar">
          <div className="excel-name-box">Farm!Setup</div>
          <div className="excel-fx-icon">fx</div>
          <div className="excel-formula-input">=ESTABLISH_NEW_FARM(Step="{onboardingStep}")</div>
        </div>

        <div className="farm-onboarding-wrapper">
          <div className="onboarding-card">
            {onboardingStep === 'name' ? (
              /* STEP 1: 농장주 & 농장 이름 설정 */
              <div className="onboarding-step-content">
                <div className="onboarding-badge">STEP 1 / 2</div>
                <div className="onboarding-icon">🏡</div>
                <h2>포켓농장 개설 신고서</h2>
                <p className="onboarding-desc">
                  포켓농장에 오신 것을 환영합니다!<br />
                  먼저 농장주님의 닉네임과 농장 이름을 지어주세요.
                </p>

                <div className="onboarding-form">
                  <div className="onboarding-input-group">
                    <label>👤 농장주 닉네임</label>
                    <input
                      type="text"
                      value={initOwnerName}
                      onChange={e => {
                        setInitOwnerName(e.target.value);
                        setInitFarmName(`${e.target.value}의 포켓농장`);
                      }}
                      placeholder="예: 지우"
                      maxLength={12}
                    />
                  </div>

                  <div className="onboarding-input-group">
                    <label>🏷️ 농장 이름</label>
                    <input
                      type="text"
                      value={initFarmName}
                      onChange={e => setInitFarmName(e.target.value)}
                      placeholder="예: 지우의 힐링 포켓농장"
                      maxLength={20}
                    />
                  </div>

                  <button
                    className="excel-btn primary onboarding-next-btn"
                    onClick={() => {
                      if (!initOwnerName.trim()) {
                        showAlert('농장주 이름을 입력해 주세요!', 'warn');
                        return;
                      }
                      setOnboardingStep('starter');
                    }}
                  >
                    다음: 파트너 포켓몬 선택하기 ➔
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: 첫 번째 스타팅 포켓몬 선택 */
              <div className="onboarding-step-content">
                <div className="onboarding-badge">STEP 2 / 2</div>
                <h2>🐣 첫 번째 파트너 포켓몬 선택</h2>
                <p className="onboarding-desc">
                  함께할 첫 아기 포켓몬을 선택하세요! 5% 확률로 특별한 전설의 포켓몬이 등장합니다.
                </p>

                {/* Selected Preview Box */}
                <div className="selected-starter-preview-banner">
                  <img src={starterBaby.showdownSprite || starterBaby.sprite} alt={starterBaby.name} className="preview-sprite" />
                  <div className="preview-text">
                    <h3>{starterBaby.name}</h3>
                    <span className="types-text">타입: {starterBaby.types.join('/')}</span>
                    <span className="evolution-text">진화: {selectedChain.map(c => c.name).join(' ➔ ')}</span>
                  </div>
                </div>

                {/* Generation Filter Chips */}
                <div className="gen-filter-chips">
                  {[
                    { id: 'all', label: `전체 (${STARTER_CHAINS.length}종)` },
                    { id: 'gen1-2', label: '1~2세대' },
                    { id: 'gen3-4', label: '3~4세대' },
                    { id: 'gen5-6', label: '5~6세대' },
                    { id: 'gen7-9', label: '7~9세대' },
                    { id: 'special', label: '드래곤/희귀' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      className={`gen-chip ${genFilter === f.id ? 'active' : ''}`}
                      onClick={() => setGenFilter(f.id as typeof genFilter)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Starter Picker Grid */}
                <div className="onboarding-starter-grid">
                  {STARTER_CHAINS.map((chain, idx) => ({ chain, originalIdx: idx }))
                    .filter(({ chain }) => {
                      if (genFilter === 'all') return true;
                      const cat = chain[0].genCategory || 'gen1-2';
                      return cat === genFilter;
                    })
                    .map(({ chain, originalIdx }) => {
                      const baby = chain[0];
                      const isSelected = originalIdx === selectedStarterIdx;
                      return (
                        <div
                          key={baby.id}
                          className={`onboarding-starter-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedStarterIdx(originalIdx);
                            playPokemonCry(baby.id);
                          }}
                        >
                          <img src={baby.sprite} alt={baby.name} />
                          <span>{baby.name}</span>
                        </div>
                      );
                    })}
                </div>

                {/* Nickname Input & Welcome Bonus Info */}
                <div className="onboarding-extra-section">
                  <div className="onboarding-input-group">
                    <label>✨ 포켓몬 닉네임 (선택 사항)</label>
                    <input
                      type="text"
                      value={starterNickname}
                      onChange={e => setStarterNickname(e.target.value)}
                      placeholder={`기본값: ${starterBaby.name}`}
                      maxLength={10}
                    />
                  </div>

                  <div className="welcome-bonus-box">
                    <strong>🎁 웰컴 스타터 개장 지원금:</strong>
                    <span>🪙 500 코인 + 🫐 오랭열매 5개 + 🧼 거품비누 3개 + ⚽ 장난감 2개</span>
                  </div>

                  <div className="onboarding-actions-row">
                    <button className="excel-btn" onClick={() => setOnboardingStep('name')}>
                      ◀ 이전 단계
                    </button>
                    <button className="excel-btn primary onboarding-finish-btn" onClick={handleCompleteOnboarding}>
                      🎉 포켓농장 정식 개장하기!
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            <span className="farm-sub">농장주: <strong>{farmState.ownerName}</strong> | 포켓농장 라이프</span>
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
        <button className={`farm-tab ${activeTab === 'expedition' ? 'active' : ''}`} onClick={() => { setActiveTab('expedition'); setVisitingFarm(null); }}>
          🌲 사내 탐험 (Expedition)
        </button>
        <button className={`farm-tab ${activeTab === 'daycare' ? 'active' : ''}`} onClick={() => { setActiveTab('daycare'); setVisitingFarm(null); }}>
          🥚 알 부화소 (Daycare)
        </button>
        <button className={`farm-tab ${activeTab === 'lottery' ? 'active' : ''}`} onClick={() => { setActiveTab('lottery'); setVisitingFarm(null); }}>
          🎰 행운 복권 (Lottery)
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
                    {/* Pokémon Visual Sprite & Skill FX */}
                    <div className="farm-pokemon-stage">
                      {pmon.isShiny && <span className="shiny-sparkle-tag">✨ SHINY</span>}

                      {/* 🌟 Pet Skill Pop Banner */}
                      {petSkillEffect && (
                        <div className={`pet-skill-banner skill-${petSkillEffect.type}`}>
                          <span className="skill-icon-anim">{petSkillEffect.icon}</span>
                          <span className="skill-name-text">[{petSkillEffect.skillName}] 발동!</span>
                        </div>
                      )}

                      {/* 💥 Skill Aura & Burst Particles */}
                      {petSkillEffect && (
                        <div className={`pet-skill-aura-ring aura-${petSkillEffect.type}`}>
                          {petSkillEffect.particles.map((pt, i) => (
                            <span key={i} className={`skill-particle pt-${i + 1}`}>
                              {pt}
                            </span>
                          ))}
                        </div>
                      )}

                      <img
                        src={pmon.sprites.showdownFront || pmon.sprites.front}
                        alt={pmon.nickname}
                        className={`farm-active-sprite ${isPetJumping ? 'pet-skill-jump' : ''}`}
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
                    <div className="floating-heart" style={{ left: '50%', top: '35%' }}>
                      💖 +5 애정도!
                    </div>
                  )}

                  <div className="pasture-touch-hint">
                    💡 포켓몬을 터치/클릭하면 고유 스킬 모션과 함께 애정도(+5) 및 EXP(+10)가 상승합니다!
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3>🐣 둡박사 포켓몬 분양소</h3>
                  <p>원하는 포켓몬을 선택하여 입양하세요! 5% 확률로 희귀한 전설의 포켓몬이 탄생합니다.</p>
                </div>
                {/* Generation Filter Chips */}
                <div className="gen-filter-chips">
                  {[
                    { id: 'all', label: `전체 (${STARTER_CHAINS.length}종)` },
                    { id: 'gen1-2', label: '1~2세대' },
                    { id: 'gen3-4', label: '3~4세대' },
                    { id: 'gen5-6', label: '5~6세대' },
                    { id: 'gen7-9', label: '7~9세대' },
                    { id: 'special', label: '드래곤/희귀' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      className={`gen-chip ${genFilter === f.id ? 'active' : ''}`}
                      onClick={() => setGenFilter(f.id as typeof genFilter)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="starter-cards-grid">
              {STARTER_CHAINS.map((chain, idx) => ({ chain, originalIdx: idx }))
                .filter(({ chain }) => {
                  if (genFilter === 'all') return true;
                  const cat = chain[0].genCategory || 'gen1-2';
                  return cat === genFilter;
                })
                .map(({ chain, originalIdx }) => {
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
                      <button className="excel-btn primary" onClick={() => handleAdoptPokemon(originalIdx)}>
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
            TAB 5: 🌲 사내 뒷산 탐험 (Expedition)
           ========================================================================= */}
        {activeTab === 'expedition' && !visitingFarm && (
          <div className="farm-expedition-layout">
            <div className="expedition-banner">
              <div className="expedition-banner-icon">🗺️</div>
              <div>
                <h3>🌲 신비의 사내 뒷산 탐험대 (Office Expedition)</h3>
                <p>
                  포켓몬을 파견하여 회사 안팎의 숨겨진 비밀 장소를 탐험시키세요! 
                  고액 코인과 경험치, 그리고 즉시 레벨업하는 <strong>🍬 이상한사탕</strong>과 <strong>👑 전설의 황금 왕관</strong>을 물어옵니다!
                </p>
              </div>
            </div>

            <div className="expedition-list-grid">
              {EXPEDITION_AREAS.map(area => {
                const canExplore = pmon && pmon.level >= area.minLevel && pmon.energy >= area.energyCost && pmon.hunger >= area.hungerCost;
                return (
                  <div key={area.id} className="expedition-card">
                    <div className="expedition-header-row">
                      <span className="expedition-emoji">{area.icon}</span>
                      <div className="expedition-meta">
                        <h4>{area.name}</h4>
                        <span className="expedition-duration-badge">⏱️ {area.durationSec}초 코스</span>
                      </div>
                    </div>

                    <p className="expedition-desc">{area.desc}</p>

                    <div className="expedition-costs-row">
                      <span>⚡ 체력 -{area.energyCost}</span>
                      <span>🍎 배고픔 -{area.hungerCost}</span>
                      <span>🧼 청결 -{area.cleanlinessCost}</span>
                      <span className={pmon && pmon.level >= area.minLevel ? 'level-ok' : 'level-warn'}>
                        최소 Lv.{area.minLevel}
                      </span>
                    </div>

                    <div className="expedition-drops-row">
                      <span className="drops-label">🎁 발견 가능 전리품:</span>
                      <div className="drops-badges">
                        {area.dropItems.map(d => {
                          const itemObj = FARM_ITEMS.find(i => i.id === d.itemId);
                          return (
                            <span key={d.itemId} className="drop-badge" title={`${itemObj?.name || d.itemId} (발견 확률: ${Math.round(d.chance * 100)}%)`}>
                              {itemObj?.icon} {itemObj?.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="expedition-footer-row">
                      <div className="expedition-reward-preview">
                        <span className="coin-preview">🪙 {area.rewardCoinsMin}~{area.rewardCoinsMax} P</span>
                        <span className="exp-preview">✨ {area.rewardExpMin}~{area.rewardExpMax} EXP</span>
                      </div>
                      <button
                        className="excel-btn primary expedition-go-btn"
                        onClick={() => handleStartExpedition(area)}
                        disabled={!canExplore}
                      >
                        🎒 탐험 출발
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: 🥚 알 부화소 & 보육소 (Daycare & Incubator)
           ========================================================================= */}
        {activeTab === 'daycare' && !visitingFarm && (
          <div className="farm-daycare-layout">
            {/* Banner */}
            <div className="daycare-banner">
              <div className="daycare-banner-icon">🥚</div>
              <div>
                <h3>🥚 포켓 데이케어 & 알 인큐베이터 (Egg Incubator)</h3>
                <p>
                  상점이나 탐험에서 발견한 <strong>의문의 알</strong>을 품어 귀여운 아기 포켓몬으로 부화시키세요!
                  쓰다듬기(+5%), 목욕(+15%), 알바(+20%), 탐험(+25%)을 통해 온기를 100% 모으면 알이 깨어납니다!
                </p>
              </div>
            </div>

            {/* Top Section: Incubator Chamber */}
            <div className="incubator-chamber-card">
              <div className="chamber-header">
                <h4>🌡️ 첨단 보온 인큐베이터 (Current Incubator)</h4>
                <span className="chamber-badge">
                  {farmState.incubatingEgg ? '가동 중 (Active)' : '비어 있음 (Empty)'}
                </span>
              </div>

              {farmState.incubatingEgg ? (
                <div className="incubator-active-view">
                  <div className="egg-display-pod">
                    <div className={`incubator-egg-avatar ${farmState.incubatingEgg.isGolden ? 'golden-egg' : 'normal-egg'} ${farmState.incubatingEgg.progress >= 100 ? 'ready-shake' : 'incubating-float'}`}>
                      <span className="egg-symbol">{farmState.incubatingEgg.icon}</span>
                      <div className="warmth-heat-waves">
                        <span>♨️</span>
                        <span>♨️</span>
                      </div>
                    </div>

                    <div className="incubator-egg-info">
                      <h3>{farmState.incubatingEgg.name}</h3>
                      <span className="egg-rarity-tag">
                        {farmState.incubatingEgg.isGolden ? '🌟 전설의 황금알 (100% 이로치)' : '🐣 신비의 포켓몬 알'}
                      </span>
                      <p className="egg-warmth-status">
                        {farmState.incubatingEgg.progress >= 100
                          ? '🎉 온기가 가득 찼습니다! 알이 기우뚱거리며 깨어날 준비를 마쳤습니다!'
                          : `🔥 부화 온기 충전 중... (${Math.round(farmState.incubatingEgg.progress)}% 달성)`}
                      </p>

                      {/* Warmth Progress Bar */}
                      <div className="warmth-bar-track">
                        <div
                          className={`warmth-bar-fill ${farmState.incubatingEgg.isGolden ? 'golden' : ''}`}
                          style={{ width: `${farmState.incubatingEgg.progress}%` }}
                        />
                      </div>

                      <div className="warmth-tips-row">
                        <span>💡 온기 획득법: 쓰다듬기(+5%) | 거품목욕(+15%) | 알바(+20%) | 탐험(+25%)</span>
                      </div>

                      {farmState.incubatingEgg.progress >= 100 && (
                        <button
                          className="excel-btn primary hatch-action-btn"
                          onClick={handleStartHatching}
                        >
                          🐣 지금 바로 알 부화시키기!
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="incubator-empty-view">
                  <div className="empty-pod-icon">🪹</div>
                  <div className="empty-pod-info">
                    <h5>현재 인큐베이터가 비어 있습니다</h5>
                    <p>보유 중인 의문의 알이나 황금빛 전설의 알을 넣어 정성껏 품어보세요!</p>

                    <div className="place-egg-actions">
                      {(farmState.inventory['mystery_egg'] || 0) > 0 && (
                        <button
                          className="excel-btn primary"
                          onClick={() => {
                            const item = FARM_ITEMS.find(i => i.id === 'mystery_egg');
                            if (item) handlePlaceEggInIncubator(item);
                          }}
                        >
                          🥚 의문의 알 넣기 (보유: {farmState.inventory['mystery_egg']}개)
                        </button>
                      )}
                      {(farmState.inventory['golden_egg'] || 0) > 0 && (
                        <button
                          className="excel-btn primary golden-btn"
                          onClick={() => {
                            const item = FARM_ITEMS.find(i => i.id === 'golden_egg');
                            if (item) handlePlaceEggInIncubator(item);
                          }}
                        >
                          🌟 황금빛 전설의 알 넣기 (보유: {farmState.inventory['golden_egg']}개)
                        </button>
                      )}
                      {(farmState.inventory['mystery_egg'] || 0) <= 0 && (farmState.inventory['golden_egg'] || 0) <= 0 && (
                        <button
                          className="excel-btn"
                          onClick={() => setActiveTab('shop')}
                        >
                          🛍️ 상점에서 알 구하러 가기
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section: Reserve Daycare Pasture */}
            <div className="daycare-reserve-card">
              <div className="chamber-header">
                <h4>🏡 보육소 목장 (대기실 포켓몬 목록)</h4>
                <span className="chamber-badge">
                  보관 중인 파트너: {farmState.reservePokemon?.length || 0}마리
                </span>
              </div>

              {farmState.reservePokemon && farmState.reservePokemon.length > 0 ? (
                <div className="reserve-pokemon-grid">
                  {farmState.reservePokemon.map(mon => (
                    <div key={mon.uid} className="reserve-mon-card">
                      <img
                        src={mon.sprites.showdownFront || mon.sprites.front}
                        alt={mon.name}
                        className="reserve-sprite"
                      />
                      <div className="reserve-mon-info">
                        <h5>{mon.nickname} {mon.isShiny && '✨'}</h5>
                        <span className="reserve-level">Lv.{mon.level} {mon.name}</span>
                        <div className="reserve-types">
                          {mon.types.map(t => (
                            <span key={t} className={`type-tag ${t}`}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <button
                        className="excel-btn primary switch-partner-btn"
                        onClick={() => handleSwitchActivePokemon(mon.uid)}
                      >
                        ⭐ 대표 파트너로 교체
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-reserve-box">
                  <p>보육소 목장에 쉬고 있는 다른 포켓몬이 없습니다. 알을 부화시켜 더 많은 친구들을 만나보세요!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: 🎰 일일 럭키 사내 복권 (Lottery & Slot)
           ========================================================================= */}
        {activeTab === 'lottery' && !visitingFarm && (
          <div className="farm-lottery-layout">
            {/* Banner */}
            <div className="lottery-banner">
              <div className="lottery-banner-icon">🎰</div>
              <div>
                <h3>🎰 일일 럭키 사내 복권 (Office Lucky Slot)</h3>
                <p>
                  매일 3회 무료 추첨! 엑셀 난수 생성 알고리즘으로 돌아가는 사내 슬롯머신입니다.
                  <strong> 777 피카츄 잭팟</strong>이 터지면 사내 누적 잭팟 상금과 <strong>🌟 황금빛 전설의 알</strong>을 획득합니다!
                </p>
              </div>
            </div>

            {/* Jackpot Display Board */}
            <div className="jackpot-display-board">
              <div className="jackpot-neon-label">
                <span>🔥 ACCUMULATED JACKPOT POOL 🔥</span>
              </div>
              <div className="jackpot-prize-number">
                🪙 {(farmState.lotteryState?.jackpotPool || 2000).toLocaleString()} P
              </div>
              <span className="jackpot-sub-notice">
                * 유료 복권 구매 시마다 상금 풀에 25P씩 실시간 누적 적립됩니다! (복권 참여 시 알 온기 +5%)
              </span>
            </div>

            {/* Main Slot Machine Chamber */}
            <div className="slot-machine-frame">
              <div className="slot-screen-bezel">
                <div className="slot-reels-container">
                  <div className={`slot-reel-cell ${isSlotSpinning ? 'spinning' : ''}`}>
                    <span className="reel-symbol">{slotReels[0]}</span>
                  </div>
                  <div className={`slot-reel-cell ${isSlotSpinning ? 'spinning delay-1' : ''}`}>
                    <span className="reel-symbol">{slotReels[1]}</span>
                  </div>
                  <div className={`slot-reel-cell ${isSlotSpinning ? 'spinning delay-2' : ''}`}>
                    <span className="reel-symbol">{slotReels[2]}</span>
                  </div>
                </div>
              </div>

              {/* Spin Control Panel */}
              <div className="slot-controls-panel">
                <div className="spins-status-info">
                  <span className="free-spins-badge">
                    🎁 오늘 남은 무료 추첨: <strong>{farmState.lotteryState?.freeSpinsLeft || 0}회</strong>
                  </span>
                  <span className="coin-cost-badge">
                    {(farmState.lotteryState?.freeSpinsLeft || 0) > 0 ? '무료 (Free)' : '회당 🪙 50 P'}
                  </span>
                </div>

                <button
                  className={`excel-btn primary spin-lottery-btn ${isSlotSpinning ? 'spinning' : ''}`}
                  onClick={handleSpinLottery}
                  disabled={isSlotSpinning || ((farmState.lotteryState?.freeSpinsLeft || 0) <= 0 && farmState.coins < 50)}
                >
                  {isSlotSpinning ? '🎲 슬롯 회전 중...!' : '🎰 복권 추첨 레버 당기기!'}
                </button>
              </div>

              {/* Spin Result Alert Box */}
              {slotSpinResult && (
                <div className={`slot-result-alert-box ${slotSpinResult.isJackpot ? 'jackpot-alert' : ''}`}>
                  <h4>{slotSpinResult.title}</h4>
                  <p>{slotSpinResult.desc}</p>
                  {slotSpinResult.wonItem && (
                    <div className="lottery-won-item-tag">
                      {slotSpinResult.wonItem.icon} <strong>{slotSpinResult.wonItem.name}</strong> 획득!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payout Guide Table */}
            <div className="lottery-payout-table-card">
              <div className="chamber-header">
                <h4>📜 복권 당첨 상금 및 전리품 안내표</h4>
                <span className="chamber-badge">배당률 표</span>
              </div>
              <div className="payout-grid">
                <div className="payout-row jackpot">
                  <span className="payout-symbols">⚡ ⚡ ⚡</span>
                  <div className="payout-desc">
                    <strong>MEGA JACKPOT (777 피카츄)</strong>
                    <span>사내 누적 잭팟 상금 전액 + 🌟 황금빛 전설의 알</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">🍬 🍬 🍬</span>
                  <div className="payout-desc">
                    <strong>스위트 캔디 잭팟</strong>
                    <span>🍬 이상한사탕 1개 (즉시 1레벨업!) + 🪙 300 P</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">🥚 🥚 🥚</span>
                  <div className="payout-desc">
                    <strong>미스터리 에그 잭팟</strong>
                    <span>🥚 의문의 포켓몬 알 1개 + 🪙 400 P</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">🧼 🧼 🧼</span>
                  <div className="payout-desc">
                    <strong>버블버블 클린 잭팟</strong>
                    <span>🧼 거품비누 2개 + 🪙 250 P</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">🫐 🫐 🫐</span>
                  <div className="payout-desc">
                    <strong>달콤한 오랭열매 파티</strong>
                    <span>🫐 오랭열매 3개 + 🪙 150 P</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">☕ ☕ ☕</span>
                  <div className="payout-desc">
                    <strong>탕비실 바리스타 상</strong>
                    <span>🪙 80 P</span>
                  </div>
                </div>
                <div className="payout-row sub">
                  <span className="payout-symbols">아무 심볼 2개 일치</span>
                  <div className="payout-desc">
                    <strong>소박 행운상</strong>
                    <span>🪙 40 P</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 8: 🛍️ 열매 상점 (Item Shop)
           ========================================================================= */}
        {activeTab === 'shop' && !visitingFarm && (
          <div className="farm-shop-layout">
            <div className="shop-banner">
              <h3>🛍️ 둡박사의 포켓몬 마트</h3>
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

      {/* 💼 PART-TIME JOB INTERACTIVE SHIFT MODAL */}
      {jobShiftModal && (
        <div className="farm-modal-overlay">
          <div className="job-shift-modal-card">
            <div className="job-modal-header">
              <div className="job-badge">
                <span className="job-badge-icon">{jobShiftModal.job.icon}</span>
                <strong>{jobShiftModal.job.title}</strong>
              </div>
              {jobShiftModal.isDone && (
                <button className="modal-close-btn" onClick={() => setJobShiftModal(null)}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 🎬 Dynamic Job Stage View */}
            <div className={`job-stage-view stage-${jobShiftModal.job.id}`}>
              {/* Stage Specific Environment Props */}
              {jobShiftModal.job.id === 'job_garden' && (
                <div className="garden-env">
                  <div className="garden-flowerbed">
                    <span className="flower f1">🌸</span>
                    <span className="flower f2">🌻</span>
                    <span className="flower f3">🌷</span>
                    <span className="flower f4">🌼</span>
                    <span className="flower f5">🌹</span>
                  </div>
                  {/* Skill/Tool Action */}
                  {pmon?.types.includes('water') ? (
                    <div className="water-skill-effect">
                      <span className="water-wave">🌊</span>
                      <span className="water-drop d1">💦</span>
                      <span className="water-drop d2">💧</span>
                      <span className="water-drop d3">💦</span>
                    </div>
                  ) : pmon?.types.includes('grass') ? (
                    <div className="grass-skill-effect">
                      <span className="leaf l1">🍃</span>
                      <span className="leaf l2">🌿</span>
                      <span className="leaf l3">✨</span>
                    </div>
                  ) : (
                    <div className="watering-can-tool">
                      <span className="can-icon">🚿</span>
                      <span className="water-drop d1">💧</span>
                      <span className="water-drop d2">💧</span>
                    </div>
                  )}
                </div>
              )}

              {jobShiftModal.job.id === 'job_mail' && (
                <div className="mail-env">
                  <div className="office-hallway-bg">
                    <span className="post-box">📮</span>
                    <span className="mail-parcel p1">📦</span>
                    <span className="mail-parcel p2">✉️</span>
                  </div>
                  {pmon?.types.includes('flying') ? (
                    <div className="flying-courier-effect">
                      <span className="wing-wind">💨</span>
                      <span className="floating-envelope">✉️</span>
                    </div>
                  ) : pmon?.types.includes('psychic') || pmon?.types.includes('ghost') ? (
                    <div className="psychic-courier-effect">
                      <span className="psychic-aura">🔮</span>
                      <span className="floating-box">📦</span>
                    </div>
                  ) : (
                    <div className="dash-courier-effect">
                      <span className="speed-lines">💨💨</span>
                      <span className="courier-bag">🎒</span>
                    </div>
                  )}
                </div>
              )}

              {jobShiftModal.job.id === 'job_coffee' && (
                <div className="coffee-env">
                  <div className="coffee-counter-bg">
                    <span className="espresso-machine">☕</span>
                    <span className="coffee-beans">🫘</span>
                    <span className="coffee-cup">🥤</span>
                  </div>
                  {pmon?.types.includes('fire') ? (
                    <div className="fire-roast-effect">
                      <span className="fire-flame">🔥</span>
                      <span className="coffee-steam">♨️</span>
                    </div>
                  ) : (
                    <div className="drip-coffee-effect">
                      <span className="coffee-pot">🫖</span>
                      <span className="coffee-steam">♨️</span>
                      <span className="coffee-heart">🤎</span>
                    </div>
                  )}
                </div>
              )}

              {jobShiftModal.job.id === 'job_generator' && (
                <div className="generator-env">
                  <div className="server-room-bg">
                    <span className="server-rack">🖥️</span>
                    <span className="battery-icon">🔋</span>
                  </div>
                  {pmon?.types.includes('electric') ? (
                    <div className="lightning-charge-effect">
                      <span className="bolt b1">⚡</span>
                      <span className="bolt b2">⚡</span>
                      <span className="sparkle">✨</span>
                    </div>
                  ) : (
                    <div className="wheel-charge-effect">
                      <span className="gear-spin">⚙️</span>
                      <span className="charge-spark">💡</span>
                    </div>
                  )}
                </div>
              )}

              {jobShiftModal.job.id === 'job_ceo_security' && (
                <div className="security-env">
                  <div className="penthouse-bg">
                    <span className="skyline">🏙️</span>
                    <span className="luxury-desk">💼</span>
                  </div>
                  <div className="security-guard-effect">
                    <span className="sunglasses-icon">🕶️</span>
                    <span className="shield-aura">🛡️</span>
                  </div>
                </div>
              )}

              {/* 🐾 Active Working Pokémon Sprite */}
              <div className={`working-pokemon-wrapper ${jobShiftModal.isDone ? 'done-bounce' : 'working-motion'}`}>
                <img
                  src={pmon?.sprites.showdownFront || pmon?.sprites.front}
                  alt={pmon?.name}
                  className="working-pokemon-sprite"
                />
                <div className="worker-tag">
                  <span>Lv.{pmon?.level} {pmon?.nickname}</span>
                </div>
              </div>
            </div>

            {/* 📊 Work Progress & Status */}
            <div className="job-status-section">
              <div className="status-bubble">
                <p>{jobShiftModal.statusText}</p>
              </div>

              <div className="job-progress-bar-wrap">
                <div className="job-progress-fill" style={{ width: `${jobShiftModal.progress}%` }}>
                  <span className="progress-percent">{jobShiftModal.progress}%</span>
                </div>
              </div>
            </div>

            {/* 💰 Settlement / Actions */}
            {!jobShiftModal.isDone ? (
              <div className="job-working-actions">
                <button
                  className="excel-btn cheer-btn"
                  onClick={() => {
                    setJobShiftModal(prev => prev ? { ...prev, progress: Math.min(99, prev.progress + 20) } : null);
                    if (pmon) playPokemonCry(pmon.speciesId);
                  }}
                >
                  ❤️ 신나게 응원하기! (+속도 UP)
                </button>
              </div>
            ) : (
              <div className="job-salary-receipt">
                <div className="receipt-header">
                  <h4>🧾 아르바이트 급여 정산서</h4>
                  <span>{jobShiftModal.job.title} 완수</span>
                </div>
                <div className="receipt-grid">
                  <div className="receipt-row gain">
                    <span>🪙 수당 지급:</span>
                    <strong>+{jobShiftModal.rewardGained?.coins} P</strong>
                  </div>
                  <div className="receipt-row gain">
                    <span>⭐ 경험치 획득:</span>
                    <strong>+{jobShiftModal.rewardGained?.exp} EXP</strong>
                  </div>
                  <div className="receipt-row cost">
                    <span>⚡ 체력 소모:</span>
                    <span>-{jobShiftModal.job.energyCost}</span>
                  </div>
                  <div className="receipt-row cost">
                    <span>🍎 배고픔 소모:</span>
                    <span>-{jobShiftModal.job.hungerCost}</span>
                  </div>
                </div>
                {jobShiftModal.rewardGained?.levelUp && (
                  <div className="job-levelup-badge">
                    🎊 LEVEL UP! Lv.{jobShiftModal.rewardGained.newLevel} 달성!
                  </div>
                )}
                <button
                  className="excel-btn primary confirm-receipt-btn"
                  onClick={() => setJobShiftModal(null)}
                >
                  💰 급여 수령 및 확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌲 EXPEDITION LIVE PROGRESS MODAL */}
      {expeditionModal && expeditionModal.active && (
        <div className="farm-modal-overlay">
          <div className="job-shift-modal-card expedition-modal-card">
            {/* Modal Header */}
            <div className="job-modal-header">
              <div className="job-badge">
                <span className="job-badge-icon">{expeditionModal.area.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{expeditionModal.area.name} 탐험 중</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    파견 대원: <strong>{pmon?.nickname || '포켓몬'}</strong> | 신비의 사내 탐험대
                  </span>
                </div>
              </div>
              {expeditionModal.isDone && (
                <button className="modal-close-btn" onClick={() => setExpeditionModal(null)}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Animation Stage */}
            <div className={`job-stage-view expedition-stage-view stage-${expeditionModal.area.id}`}>
              {/* Background Theme */}
              <div className="expedition-env-decor">
                {expeditionModal.area.id === 'exp_pantry' && (
                  <div className="pantry-decor">
                    <span className="decor-item">☕</span>
                    <span className="decor-item">🍪</span>
                    <span className="decor-item">🧃</span>
                  </div>
                )}
                {expeditionModal.area.id === 'exp_rooftop' && (
                  <div className="rooftop-decor">
                    <span className="decor-item">🌸</span>
                    <span className="decor-item">☀️</span>
                    <span className="decor-item">🌿</span>
                  </div>
                )}
                {expeditionModal.area.id === 'exp_server_room' && (
                  <div className="server-decor">
                    <span className="decor-item">🖥️</span>
                    <span className="decor-item">🗄️</span>
                    <span className="decor-item">⚡</span>
                  </div>
                )}
                {expeditionModal.area.id === 'exp_mountain' && (
                  <div className="mountain-decor">
                    <span className="decor-item">🌲</span>
                    <span className="decor-item">⛰️</span>
                    <span className="decor-item">✨</span>
                  </div>
                )}
              </div>

              {/* Walking Pokemon Sprite */}
              <div className="working-pokemon-wrapper">
                <img
                  src={pmon?.sprites.showdownFront || pmon?.sprites.front}
                  alt="탐험 포켓몬"
                  className={`working-pokemon-sprite ${expeditionModal.isDone ? 'done-bounce' : 'expedition-walking'}`}
                />
                {!expeditionModal.isDone && (
                  <div className="expedition-walk-dust">
                    <span>💨</span>
                  </div>
                )}
                <div className="worker-tag">
                  <span>Lv.{pmon?.level} {pmon?.nickname}</span>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="job-status-section">
              <div className="status-bubble">
                <p>{expeditionModal.statusText}</p>
              </div>

              <div className="job-progress-bar-wrap">
                <div
                  className="job-progress-fill expedition-fill"
                  style={{ width: `${expeditionModal.progress}%` }}
                >
                  <span className="progress-percent">{Math.round(expeditionModal.progress)}%</span>
                </div>
              </div>
            </div>

            {/* Completion Result & Claim Button */}
            {expeditionModal.isDone && expeditionModal.rewardGained ? (
              <div className="job-salary-receipt expedition-receipt">
                <div className="receipt-header">
                  <h4>📜 사내 탐험 전리품 보고서</h4>
                  <span>{expeditionModal.area.name} 완수</span>
                </div>
                <div className="receipt-grid">
                  <div className="receipt-row gain">
                    <span>🪙 획득 지원금</span>
                    <strong>+{expeditionModal.rewardGained.coins} P</strong>
                  </div>
                  <div className="receipt-row gain">
                    <span>✨ 탐험 경험치</span>
                    <strong>+{expeditionModal.rewardGained.exp} EXP</strong>
                  </div>
                  {expeditionModal.rewardGained.levelUp && (
                    <div className="receipt-row levelup-alert">
                      <span>🎉 레벨업 달성!</span>
                      <strong>Lv.{expeditionModal.rewardGained.newLevel}</strong>
                    </div>
                  )}
                </div>

                {/* Found Items List */}
                {expeditionModal.rewardGained.foundItems.length > 0 ? (
                  <div className="found-items-box">
                    <span className="found-title">🎁 획득한 보물 아이템:</span>
                    <div className="found-items-list">
                      {expeditionModal.rewardGained.foundItems.map((fi, idx) => (
                        <span key={idx} className="found-item-chip">
                          {fi.item.icon} <strong>{fi.item.name}</strong> x{fi.qty}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="no-items-text" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '6px 0', textAlign: 'center' }}>
                    아쉽게도 이번엔 특별한 보물 아이템을 발견하지 못했습니다.
                  </p>
                )}

                <button
                  className="excel-btn primary claim-shift-btn"
                  onClick={() => setExpeditionModal(null)}
                >
                  🎁 전리품 수령 완료
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 🥚 EGG HATCHING DRAMATIC MODAL */}
      {hatchingModal && hatchingModal.active && (
        <div className="farm-modal-overlay">
          <div className={`hatching-modal-box ${hatchingModal.stage}`}>
            <Sparkles size={36} className="hatch-sparkle-icon" />

            {hatchingModal.stage === 'wobble' && (
              <div className="hatch-phase-view">
                <h2>어라...?! 알의 상태가...!</h2>
                <div className="hatch-egg-pod wobble">
                  <span className="pod-egg-graphic">{hatchingModal.isGolden ? '🌟' : '🥚'}</span>
                </div>
                <p>알이 따스한 온기를 뿜으며 기우뚱기우뚱 흔들리고 있습니다...!</p>
              </div>
            )}

            {hatchingModal.stage === 'crack' && (
              <div className="hatch-phase-view">
                <h2>금이 가기 시작했다...!!</h2>
                <div className="hatch-egg-pod crack">
                  <span className="pod-egg-graphic">{hatchingModal.isGolden ? '🌟' : '🥚'}</span>
                  <div className="crack-burst-lines">💥✨⚡</div>
                </div>
                <p>알 껍질 사이로 눈부신 빛이 새어 나옵니다...!</p>
              </div>
            )}

            {hatchingModal.stage === 'hatched' && hatchingModal.babyPokemon && (
              <div className="hatch-phase-view hatched">
                <h2>축하합니다! 새로운 생명이 탄생했습니다! 🎉</h2>
                <div className="hatched-baby-pod">
                  <img
                    src={hatchingModal.babyPokemon.sprites.showdownFront || hatchingModal.babyPokemon.sprites.front}
                    alt="아기 포켓몬"
                    className="hatched-baby-sprite"
                  />
                  {hatchingModal.babyPokemon.isShiny && (
                    <span className="shiny-badge-floating">✨ SHINY!</span>
                  )}
                </div>

                <div className="hatched-details">
                  <h3>
                    [{hatchingModal.babyPokemon.name}]이(가) 알에서 태어났습니다!
                  </h3>
                  <div className="hatched-types-row">
                    {hatchingModal.babyPokemon.types.map(t => (
                      <span key={t} className={`type-tag ${t}`}>{t}</span>
                    ))}
                  </div>

                  <div className="hatched-name-input-box">
                    <label>✨ 아기 포켓몬 닉네임 설정:</label>
                    <input
                      type="text"
                      value={hatchingModal.nicknameInput}
                      onChange={e => setHatchingModal({ ...hatchingModal, nicknameInput: e.target.value })}
                      placeholder={hatchingModal.babyPokemon.name}
                      maxLength={10}
                    />
                  </div>

                  <div className="hatched-action-buttons">
                    <button
                      className="excel-btn primary choice-btn"
                      onClick={() => handleConfirmHatch('setActive')}
                    >
                      ⭐ 지금 바로 내 대표 파트너로 교체!
                    </button>
                    <button
                      className="excel-btn choice-btn"
                      onClick={() => handleConfirmHatch('sendToReserve')}
                    >
                      🏡 보육소 목장에 등록하기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <strong className="cert-principal">포켓농장 학장 김두부 (인)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
