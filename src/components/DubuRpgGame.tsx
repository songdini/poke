import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DubuRpgGame.css';
import type {
  Direction,
  Item,
  Quest,
  SaveData,
  DialogLine,
  EndingType,
  EndingMeta
} from '../types/dubuRpg';
import { GAME_MAPS, INITIAL_ITEMS, INITIAL_QUESTS, ENDINGS_DATA } from '../data/dubuRpgData';
import { dubuAudio } from '../utils/dubuRpgAudio';

interface DubuRpgGameProps {
  username?: string;
  onLeaveRoom?: () => void;
}

const TILE_SIZE = 40;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

export const DubuRpgGame: React.FC<DubuRpgGameProps> = ({
  username = '두부집사',
  onLeaveRoom
}) => {
  // 🎮 Game State
  const [gameState, setGameState] = useState<'title' | 'playing' | 'ending'>('title');
  const [currentMapId, setCurrentMapId] = useState<string>('home');
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number; dir: Direction }>({
    x: 7,
    y: 6,
    dir: 'down'
  });

  // 🏆 Multi-Ending System State
  const [activeEnding, setActiveEnding] = useState<EndingType | null>(null);
  const [unlockedEndings, setUnlockedEndings] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dubu_rpg_unlocked_endings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });
  const [isEndingsModalOpen, setIsEndingsModalOpen] = useState<boolean>(false);
  const [sweetPotatoesEatenCount, setSweetPotatoesEatenCount] = useState<number>(0);

  // 🐶 Actions & Animation States
  const [isRelaxing, setIsRelaxing] = useState<boolean>(false);
  const [isBarking, setIsBarking] = useState<boolean>(false);
  const [isSniffing, setIsSniffing] = useState<boolean>(false);
  const [isWagging, setIsWagging] = useState<boolean>(false);
  const [sniffSparkles, setSniffSparkles] = useState<Array<{ x: number; y: number }>>([]);

  // 💖 Stats & Inventory & Quests
  const [hp, setHp] = useState<number>(100);
  const [happiness, setHappiness] = useState<number>(75);
  const [barksCount, setBarksCount] = useState<number>(0);
  const [sniffsCount, setSniffsCount] = useState<number>(0);
  const [wagsCount, setWagsCount] = useState<number>(0);
  const [bellyRubsCount, setBellyRubsCount] = useState<number>(0);
  const [playTimeSeconds, setPlayTimeSeconds] = useState<number>(0);

  const [inventory, setInventory] = useState<Item[]>(INITIAL_ITEMS);
  const [quests, setQuests] = useState<Record<string, Quest>>(INITIAL_QUESTS);
  const [collectedItemIds, setCollectedItemIds] = useState<string[]>([]);
  const [unlockedEnding, setUnlockedEnding] = useState<boolean>(false);

  // 💬 Dialog System
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    lines: DialogLine[];
    lineIndex: number;
    displayedText: string;
    onComplete?: () => void;
  }>({
    isOpen: false,
    lines: [],
    lineIndex: 0,
    displayedText: ''
  });

  // 💾 Save / Load Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveTab, setSaveTab] = useState<'save' | 'load' | 'backup'>('save');
  const [saveSlots, setSaveSlots] = useState<{ [key: string]: SaveData | null }>({
    slot1: null,
    slot2: null,
    slot3: null,
    auto: null
  });

  // 🎒 Sub-Modals (Inventory, Quests, Guide)
  const [isBagModalOpen, setIsBagModalOpen] = useState<boolean>(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // 🍞 Toast & Audio
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => dubuAudio.getMuted());

  // 🖼️ Canvas & Asset References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dubuWalkImgRef = useRef<HTMLImageElement | null>(null);
  const dubuSleepImgRef = useRef<HTMLImageElement | null>(null);
  const walkStepRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // ⏱️ Playtime timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setPlayTimeSeconds(p => p + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // 🖼️ Preload Dubu Pixel Art Images
  useEffect(() => {
    const walkImg = new Image();
    walkImg.src = '/images/trainer_dubu.png';
    dubuWalkImgRef.current = walkImg;

    const sleepImg = new Image();
    sleepImg.src = '/images/dubu_cushion_sleep.png';
    dubuSleepImgRef.current = sleepImg;
  }, []);

  // 💾 Load save slot headers from localStorage
  const refreshSaveSlots = useCallback(() => {
    if (typeof window === 'undefined') return;
    const s1 = localStorage.getItem('dubu_rpg_save_slot_1');
    const s2 = localStorage.getItem('dubu_rpg_save_slot_2');
    const s3 = localStorage.getItem('dubu_rpg_save_slot_3');
    const auto = localStorage.getItem('dubu_rpg_auto_save');
    setSaveSlots({
      slot1: s1 ? JSON.parse(s1) : null,
      slot2: s2 ? JSON.parse(s2) : null,
      slot3: s3 ? JSON.parse(s3) : null,
      auto: auto ? JSON.parse(auto) : null
    });
  }, []);

  useEffect(() => {
    refreshSaveSlots();
  }, [refreshSaveSlots]);

  // 💾 Construct current SaveData
  const buildCurrentSaveData = useCallback((): SaveData => {
    const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS.home;
    const now = new Date();
    const saveDateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    return {
      version: 1,
      timestamp: Date.now(),
      saveDateStr,
      playerName: username,
      playTimeSeconds,
      mapId: currentMapId,
      mapName: currentMap.name,
      playerPos,
      stats: {
        happiness,
        hp,
        maxHp: 100,
        barks: barksCount,
        sniffs: sniffsCount,
        wags: wagsCount,
        bellyRubs: bellyRubsCount
      },
      inventory,
      quests,
      collectedItemIds,
      unlockedEnding,
      unlockedEndings
    };
  }, [
    currentMapId,
    username,
    playTimeSeconds,
    playerPos,
    happiness,
    hp,
    barksCount,
    sniffsCount,
    wagsCount,
    bellyRubsCount,
    inventory,
    quests,
    collectedItemIds,
    unlockedEnding,
    unlockedEndings
  ]);

  // 💾 Save to Slot
  const handleSaveGame = useCallback((slotKey: 'slot1' | 'slot2' | 'slot3' | 'auto') => {
    const data = buildCurrentSaveData();
    const storageKey =
      slotKey === 'auto'
        ? 'dubu_rpg_auto_save'
        : `dubu_rpg_save_${slotKey === 'slot1' ? 'slot_1' : slotKey === 'slot2' ? 'slot_2' : 'slot_3'}`;

    localStorage.setItem(storageKey, JSON.stringify(data));
    dubuAudio.playSaveSound();
    refreshSaveSlots();

    const slotLabel =
      slotKey === 'auto'
        ? '오토세이브'
        : slotKey === 'slot1'
        ? '슬롯 1'
        : slotKey === 'slot2'
        ? '슬롯 2'
        : '슬롯 3';
    showToast(`💾 [${slotLabel}]에 안전하게 중간 저장되었습니다!`);
  }, [buildCurrentSaveData, refreshSaveSlots, showToast]);

  // 📂 Load from SaveData
  const applySaveData = useCallback((data: SaveData) => {
    setCurrentMapId(data.mapId || 'home');
    setPlayerPos(data.playerPos || { x: 7, y: 6, dir: 'down' });
    setHp(data.stats?.hp ?? 100);
    setHappiness(data.stats?.happiness ?? 80);
    setBarksCount(data.stats?.barks ?? 0);
    setSniffsCount(data.stats?.sniffs ?? 0);
    setWagsCount(data.stats?.wags ?? 0);
    setBellyRubsCount(data.stats?.bellyRubs ?? 0);
    setPlayTimeSeconds(data.playTimeSeconds ?? 0);
    setInventory(data.inventory || INITIAL_ITEMS);
    setQuests(data.quests || INITIAL_QUESTS);
    setCollectedItemIds(data.collectedItemIds || []);
    setUnlockedEnding(data.unlockedEnding || false);
    if (data.unlockedEndings && Array.isArray(data.unlockedEndings)) {
      setUnlockedEndings(prev => {
        const merged = Array.from(new Set([...prev, ...data.unlockedEndings!]));
        if (typeof window !== 'undefined') {
          localStorage.setItem('dubu_rpg_unlocked_endings', JSON.stringify(merged));
        }
        return merged;
      });
    }

    setIsRelaxing(false);
    setGameState('playing');
    setIsSaveModalOpen(false);
    dubuAudio.playQuestComplete();
    showToast(`📂 [${data.mapName}]의 모험 데이터를 성공적으로 불러왔습니다!`);
  }, [showToast]);

  // 📂 Load from Slot
  const handleLoadGame = useCallback((slotKey: 'slot1' | 'slot2' | 'slot3' | 'auto') => {
    const data = saveSlots[slotKey];
    if (!data) {
      showToast('⚠️ 해당 슬롯에 저장된 데이터가 없습니다.');
      return;
    }
    applySaveData(data);
  }, [saveSlots, applySaveData, showToast]);

  // 🗑️ Delete Slot
  const handleDeleteSlot = (slotKey: 'slot1' | 'slot2' | 'slot3' | 'auto') => {
    if (!window.confirm('정말 이 세이브 슬롯을 삭제하시겠습니까?')) return;
    const storageKey =
      slotKey === 'auto'
        ? 'dubu_rpg_auto_save'
        : `dubu_rpg_save_${slotKey === 'slot1' ? 'slot_1' : slotKey === 'slot2' ? 'slot_2' : 'slot_3'}`;
    localStorage.removeItem(storageKey);
    refreshSaveSlots();
    showToast('🗑️ 세이브 데이터가 삭제되었습니다.');
  };

  // 📤 Export JSON Backup
  const handleExportBackup = () => {
    const fullBackup = {
      slot1: saveSlots.slot1,
      slot2: saveSlots.slot2,
      slot3: saveSlots.slot3,
      auto: saveSlots.auto,
      current: buildCurrentSaveData()
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dubu_rpg_save_backup_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('📤 세이브 백업 파일(.json)이 다운로드되었습니다!');
  };

  // 📥 Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.slot1) localStorage.setItem('dubu_rpg_save_slot_1', JSON.stringify(json.slot1));
        if (json.slot2) localStorage.setItem('dubu_rpg_save_slot_2', JSON.stringify(json.slot2));
        if (json.slot3) localStorage.setItem('dubu_rpg_save_slot_3', JSON.stringify(json.slot3));
        if (json.auto) localStorage.setItem('dubu_rpg_auto_save', JSON.stringify(json.auto));
        refreshSaveSlots();
        if (json.current) {
          applySaveData(json.current);
        }
        showToast('📥 세이브 파일이 성공적으로 복원되었습니다!');
      } catch {
        showToast('❌ 올바르지 않은 세이브 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 💬 Start Dialog
  const triggerDialog = useCallback((lines: DialogLine[], onComplete?: () => void) => {
    if (!lines || lines.length === 0) return;
    setDialogState({
      isOpen: true,
      lines,
      lineIndex: 0,
      displayedText: lines[0].text,
      onComplete
    });
    const sound = lines[0].sound;
    if (sound === 'bark') dubuAudio.playBark();
    else if (sound === 'sniff') dubuAudio.playSniff();
    else if (sound === 'wag') dubuAudio.playWag();
    else if (sound === 'item') dubuAudio.playItemCollect();
    else if (sound === 'fanfare') dubuAudio.playQuestComplete();
    else dubuAudio.playDialogChirp();
  }, []);

  // 🏆 Trigger Ending (진엔딩 1개 + 가짜엔딩 3개)
  const triggerEnding = useCallback((endingId: EndingType) => {
    setActiveEnding(endingId);
    setGameState('ending');
    setUnlockedEnding(true);

    setUnlockedEndings(prev => {
      if (!prev.includes(endingId)) {
        const next = [...prev, endingId];
        if (typeof window !== 'undefined') {
          localStorage.setItem('dubu_rpg_unlocked_endings', JSON.stringify(next));
        }
        return next;
      }
      return prev;
    });

    if (endingId === 'true_rainbow') {
      dubuAudio.playQuestComplete();
    } else if (endingId === 'fake_sleep') {
      dubuAudio.playBellyRub();
    } else if (endingId === 'fake_sweet_potato') {
      dubuAudio.playItemCollect();
    } else if (endingId === 'fake_cat') {
      dubuAudio.playBark();
    }
  }, []);

  // 💬 Next Dialog Page
  const advanceDialog = useCallback(() => {
    setDialogState(prev => {
      if (!prev.isOpen) return prev;
      // If current dialog line has choices, require selecting a choice
      if (prev.lines[prev.lineIndex]?.choices && prev.lines[prev.lineIndex].choices!.length > 0) {
        return prev;
      }

      const nextIdx = prev.lineIndex + 1;
      if (nextIdx < prev.lines.length) {
        const nextLine = prev.lines[nextIdx];
        const sound = nextLine.sound;
        if (sound === 'bark') dubuAudio.playBark();
        else if (sound === 'sniff') dubuAudio.playSniff();
        else if (sound === 'wag') dubuAudio.playWag();
        else if (sound === 'item') dubuAudio.playItemCollect();
        else if (sound === 'fanfare') dubuAudio.playQuestComplete();
        else dubuAudio.playDialogChirp();

        return {
          ...prev,
          lineIndex: nextIdx,
          displayedText: nextLine.text
        };
      } else {
        // Dialog ended
        if (prev.onComplete) {
          prev.onComplete();
        }
        return {
          isOpen: false,
          lines: [],
          lineIndex: 0,
          displayedText: ''
        };
      }
    });
  }, []);

  // 🎒 Add Item
  const addItem = useCallback((item: Item) => {
    setInventory(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => (i.id === item.id ? { ...i, count: i.count + item.count } : i));
      }
      return [...prev, item];
    });
    dubuAudio.playItemCollect();
    showToast(`🎒 [${item.name}]을(를) ${item.count}개 획득했습니다!`);
  }, [showToast]);

  // 🎯 Update Quest Progress
  const updateQuest = useCallback((questId: string, progress: number, completed = false) => {
    setQuests(prev => {
      const q = prev[questId];
      if (!q) return prev;
      const isNewlyDone = completed && !q.completed;
      if (isNewlyDone) {
        dubuAudio.playQuestComplete();
        showToast(`🎉 퀘스트 완료: [${q.title}]!`);
        setHappiness(h => Math.min(100, h + 20));
      }
      return {
        ...prev,
        [questId]: {
          ...q,
          progress: Math.min(q.target, progress),
          completed
        }
      };
    });
  }, [showToast]);

  // 🔀 Handle Interactive Dialog Choices (엔딩 분기점 처리)
  const handleChoiceAction = useCallback((actionKey: string) => {
    if (actionKey === 'trigger_sleep_ending') {
      setDialogState(prev => ({ ...prev, isOpen: false }));
      triggerEnding('fake_sleep');
    } else if (actionKey === 'rest_and_save') {
      setHp(100);
      setHappiness(100);
      dubuAudio.playBellyRub();
      setDialogState(prev => ({ ...prev, isOpen: false }));
      setIsSaveModalOpen(true);
      setSaveTab('save');
      showToast('🛌 편안하게 푹 쉬었습니다! (체력/행복도 100% 회복)');
    } else if (actionKey === 'eat_all_potatoes') {
      setDialogState(prev => ({ ...prev, isOpen: false }));
      triggerEnding('fake_sweet_potato');
    } else if (actionKey === 'keep_potatoes') {
      setDialogState(prev => ({ ...prev, isOpen: false }));
      addItem({
        id: 'sweet_potato_dry',
        name: '꿀고구마 말랭이',
        icon: '🍠',
        desc: '친구들과 나누기 위해 소중히 챙긴 고구마 말랭이! (체력 +30 회복)',
        count: 2,
        usable: true
      });
      showToast('🌟 친구들과 함께 나누기 위해 고구마 2개를 챙겼습니다!');
    } else if (actionKey === 'trigger_cat_ending') {
      setDialogState(prev => ({ ...prev, isOpen: false }));
      triggerEnding('fake_cat');
    } else if (actionKey === 'decline_cat_ending') {
      setDialogState(prev => ({ ...prev, isOpen: false }));
      addItem({
        id: 'rainbow_star_2',
        name: '파랑 별빛 조각',
        icon: '🔷',
        desc: '나비가 호숫가에서 건져둔 푸른 별빛 조각. 신비로운 빛을 뿜는다.',
        count: 1
      });
      updateQuest('quest_cat_catnip', 1, true);
      updateQuest('quest_rainbow_stars', quests.quest_rainbow_stars.progress + 1);
      showToast('🐶 "난 씩씩한 강아지야!" 나비가 흐뭇해하며 별빛 조각을 건넸습니다!');
    }
  }, [triggerEnding, addItem, updateQuest, quests.quest_rainbow_stars.progress, showToast]);

  // 🐶 ACTION 1: 멍멍! 짖기 (Bark)
  const handleBark = useCallback(() => {
    if (dialogState.isOpen || isSaveModalOpen) return;
    setIsBarking(true);
    dubuAudio.playBark();
    setBarksCount(c => c + 1);
    setHappiness(h => Math.min(100, h + 3));

    // Nearby NPCs react
    const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS.home;
    const nearbyNpc = currentMap.npcs.find(
      npc => Math.abs(npc.x - playerPos.x) <= 2 && Math.abs(npc.y - playerPos.y) <= 2
    );
    if (nearbyNpc) {
      showToast(`${nearbyNpc.name}: "두부야 멍멍 소리가 너무 맑고 씩씩하구나! ❤️"`);
    }

    setTimeout(() => setIsBarking(false), 500);
  }, [dialogState.isOpen, isSaveModalOpen, currentMapId, playerPos, showToast]);

  // 👃 ACTION 2: 킁킁! 냄새맡기 (Sniff)
  const handleSniff = useCallback(() => {
    if (dialogState.isOpen || isSaveModalOpen) return;
    setIsSniffing(true);
    dubuAudio.playSniff();
    setSniffsCount(c => c + 1);

    const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS.home;
    const hiddenSpots = currentMap.interactables.filter(
      item => item.reqSniff && !collectedItemIds.includes(item.id)
    );

    if (hiddenSpots.length > 0) {
      setSniffSparkles(hiddenSpots.map(h => ({ x: h.x, y: h.y })));
      showToast('👃 킁킁! 이 주변 어딘가에 숨겨진 보물의 냄새가 난다! ✨');
    } else {
      showToast('👃 킁킁... 주변에서 솔솔 풀잎과 흙내음이 느껴진다.');
    }

    setTimeout(() => {
      setIsSniffing(false);
      setSniffSparkles([]);
    }, 2500);
  }, [dialogState.isOpen, isSaveModalOpen, currentMapId, collectedItemIds, showToast]);

  // 🐾 ACTION 3: 꼬리 살랑살랑 흔들기 (Wag)
  const handleWag = useCallback(() => {
    if (dialogState.isOpen || isSaveModalOpen) return;
    setIsWagging(true);
    dubuAudio.playWag();
    setWagsCount(w => w + 1);
    setHappiness(h => Math.min(100, h + 5));
    showToast('🐾 두부가 신나게 꼬리를 살랑살랑 흔듭니다! (행복도 UP!)');
    setTimeout(() => setIsWagging(false), 800);
  }, [dialogState.isOpen, isSaveModalOpen, showToast]);

  // 🛌 ACTION 4: 발라당 눕기 (Belly Rub / Relax - dubu1.jpg)
  const handleBellyRub = useCallback(() => {
    if (dialogState.isOpen || isSaveModalOpen) return;
    setIsRelaxing(prev => !prev);
    dubuAudio.playBellyRub();
    setBellyRubsCount(b => b + 1);
    setHp(100);
    setHappiness(100);
    showToast('🛌 두부가 등을 대고 발라당 누워 뒹굴거립니다~ 힐링 100%! (체력/행복도 완충)');
  }, [dialogState.isOpen, isSaveModalOpen, showToast]);

  // 🔍 ACTION 5: 조사 / 상호작용 (Interact)
  const handleInteract = useCallback(() => {
    if (dialogState.isOpen) {
      advanceDialog();
      return;
    }
    if (isSaveModalOpen) return;

    const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS.home;
    const { x, y, dir } = playerPos;

    // Check facing tile or standing tile
    let targetX = x;
    let targetY = y;
    if (dir === 'up') targetY -= 1;
    if (dir === 'down') targetY += 1;
    if (dir === 'left') targetX -= 1;
    if (dir === 'right') targetX += 1;

    // 1. Check NPC
    const npc = currentMap.npcs.find(
      n => (n.x === targetX && n.y === targetY) || (Math.abs(n.x - x) <= 1 && Math.abs(n.y - y) <= 1)
    );
    if (npc) {
      if (npc.id === 'npc_grandma') {
        triggerDialog(npc.dialogs, () => {
          if (!quests.quest_grandma.completed) {
            addItem({
              id: 'sweet_potato_dry',
              name: '꿀고구마 말랭이',
              icon: '🍠',
              desc: '할머니의 사랑이 담긴 달콤 쫄깃 고구마 말랭이! (체력 +30 회복)',
              count: 2,
              usable: true
            });
            updateQuest('quest_grandma', 1, true);
          }
        });
        return;
      }

      if (npc.id === 'npc_cat_nabi') {
        const hasCatnip = inventory.find(i => i.id === 'catnip_leaf' && i.count > 0);
        if (hasCatnip && !quests.quest_cat_catnip.completed) {
          setInventory(prev => prev.filter(i => i.id !== 'catnip_leaf'));
          triggerDialog([
            { speaker: '나비', text: '야옹~! 그 싱그러운 향기는... 개울가의 신선한 캣닢이잖아! 고마워 두부야!', sound: 'bell' },
            {
              speaker: '나비의 은밀한 제안',
              text: '두부 너 강아지치고 꽤 마음에 든다냥... 혹시 내 전용 냥냥 집사가 되지 않을래?',
              sound: 'bell',
              choices: [
                { label: '🐱 야옹~ 나비 님을 주인님으로 모시겠습니다!', actionKey: 'trigger_cat_ending' },
                { label: '🐶 난 당당하고 씩씩한 멍멍이야! (거절)', actionKey: 'decline_cat_ending' }
              ]
            }
          ]);
          return;
        }
      }

      if (npc.id === 'npc_bunny_postman') {
        const hasLetter = inventory.find(i => i.id === 'lost_letter_bag' && i.count > 0);
        if (hasLetter && !quests.quest_bunny_letter.completed) {
          triggerDialog([
            { speaker: '바니', text: '앗!! 내 우편 가방이야! 숲속 흙길에서 찾아주다니... 역시 두부의 밝은 코는 최고야!', sound: 'bell' },
            { speaker: '바니', text: '마을 친구들에게 편지를 무사히 전할 수 있게 되었어! 이건 보답이야!', sound: 'item' }
          ], () => {
            setInventory(prev => prev.filter(i => i.id !== 'lost_letter_bag'));
            addItem({
              id: 'rainbow_star_3',
              name: '주황 별빛 조각',
              icon: '🔶',
              desc: '바니가 선물해준 따스한 노을빛 별빛 조각.',
              count: 1
            });
            updateQuest('quest_bunny_letter', 1, true);
            updateQuest('quest_rainbow_stars', quests.quest_rainbow_stars.progress + 1);
          });
          return;
        }
      }

      triggerDialog(npc.dialogs);
      return;
    }

    // 2. Check Interactable Objects
    const obj = currentMap.interactables.find(
      i => (i.x === targetX && i.y === targetY) || (i.x === x && i.y === y)
    );
    if (obj) {
      if (obj.type === 'save_crystal') {
        triggerDialog([
          ...obj.dialogs,
          { speaker: '시스템', text: '지금까지의 여정을 안전하게 저장하시겠습니까?', sound: 'bell' }
        ], () => {
          setIsSaveModalOpen(true);
          setSaveTab('save');
        });
        return;
      }

      if (obj.type === 'bed' || obj.type === 'giant_basket') {
        triggerDialog(obj.dialogs);
        return;
      }

      if (obj.type === 'chest') {
        // Check if player has 4 stars
        const starCount = [
          'rainbow_star_1',
          'rainbow_star_2',
          'rainbow_star_3',
          'rainbow_star_4'
        ].filter(id => inventory.some(item => item.id === id)).length;

        if (starCount >= 4 || quests.quest_rainbow_stars.completed) {
          triggerDialog([
            { speaker: '무지개 상자', text: '✨ 4개의 별빛 씨앗이 공명하며 찬란한 황금빛 상자가 활짝 열렸다! ✨', sound: 'fanfare' },
            { speaker: '시스템', text: '전설의 [황금 고구마]를 발견했습니다! 온 세상이 따뜻한 행복으로 물듭니다!', sound: 'item' }
          ], () => {
            addItem({
              id: 'golden_sweet_potato',
              name: '전설의 황금 고구마',
              icon: '🍠✨',
              desc: '기적을 부르는 전설의 달콤 황금 고구마! 두부와 친구들의 영원한 행복의 증표.',
              count: 1
            });
            updateQuest('quest_golden_sweet_potato', 1, true);
            triggerEnding('true_rainbow');
          });
          return;
        } else {
          triggerDialog([
            { speaker: '소원의 상자', text: `상자에는 4개의 별빛 홈이 파여 있습니다. (현재 발견한 별빛: ${starCount}/4개)`, sound: 'bell' },
            { speaker: '두부', text: '킁킁! 숲, 정원, 호수, 마을에서 별빛 조각을 더 찾아보자!', sound: 'sniff' }
          ]);
          return;
        }
      }

      // Check item rewards
      if (obj.itemRewardId && !collectedItemIds.includes(obj.id)) {
        triggerDialog(obj.dialogs, () => {
          setCollectedItemIds(prev => [...prev, obj.id]);
          if (obj.itemRewardId === 'rainbow_star_1') {
            addItem({
              id: 'rainbow_star_1',
              name: '초록 별빛 조각',
              icon: '🟩',
              desc: '정원 흙더미 속에서 발견한 싱그러운 초록빛 별빛.',
              count: 1
            });
            updateQuest('quest_rainbow_stars', quests.quest_rainbow_stars.progress + 1);
          } else if (obj.itemRewardId === 'rainbow_star_4') {
            addItem({
              id: 'rainbow_star_4',
              name: '보라 별빛 조각',
              icon: '🟪',
              desc: '별빛 호숫가 수초 사이에서 은은하게 빛나는 보랏빛 별.',
              count: 1
            });
            updateQuest('quest_rainbow_stars', quests.quest_rainbow_stars.progress + 1);
          } else if (obj.itemRewardId === 'catnip_leaf') {
            addItem({
              id: 'catnip_leaf',
              name: '싱싱한 캣닢 잎',
              icon: '🌿',
              desc: '나비가 애타게 찾던 향기로운 은빛 캣닢 풀잎.',
              count: 1
            });
            updateQuest('quest_cat_catnip', 1);
          } else if (obj.itemRewardId === 'lost_letter_bag') {
            addItem({
              id: 'lost_letter_bag',
              name: '바니의 우편 가방',
              icon: '🎒',
              desc: '토끼 우체부 바니가 잃어버린 소중한 편지 가방.',
              count: 1
            });
            updateQuest('quest_bunny_letter', 1);
          } else if (obj.itemRewardId === 'strawberry_berry') {
            addItem({
              id: 'strawberry_berry',
              name: '숲속 산딸기',
              icon: '🍓',
              desc: '상큼하고 달콤한 자연산 빨간 딸기. (체력 +15 회복)',
              count: 3,
              usable: true
            });
          }
        });
        return;
      }

      triggerDialog(obj.dialogs);
      return;
    }

    // Default sniff action if nothing directly in front
    handleSniff();
  }, [
    dialogState.isOpen,
    advanceDialog,
    isSaveModalOpen,
    currentMapId,
    playerPos,
    triggerDialog,
    quests,
    inventory,
    addItem,
    updateQuest,
    collectedItemIds,
    handleSniff
  ]);

  // 🚶 Move Player
  const movePlayer = useCallback((dx: number, dy: number, dir: Direction) => {
    if (dialogState.isOpen || isSaveModalOpen) return;
    setIsRelaxing(false); // Stand up if moving

    const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS.home;
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    // Check bounds
    if (newX < 0 || newX >= currentMap.width || newY < 0 || newY >= currentMap.height) {
      return;
    }

    // Check walls / obstacles
    const tile = currentMap.tiles[newY]?.[newX];
    if (tile === 1 || tile === 2) {
      // 1: wall, 2: water
      setPlayerPos(prev => ({ ...prev, dir }));
      return;
    }

    // Check NPC collision
    const isNpcOccupied = currentMap.npcs.some(n => n.x === newX && n.y === newY);
    if (isNpcOccupied) {
      setPlayerPos(prev => ({ ...prev, dir }));
      return;
    }

    // Check Portals
    const portal = currentMap.portals.find(p => p.x === newX && p.y === newY);
    if (portal) {
      dubuAudio.playMapTransition();
      setCurrentMapId(portal.targetMapId);
      setPlayerPos({
        x: portal.targetX,
        y: portal.targetY,
        dir: portal.targetDir
      });
      showToast(`🚪 [${portal.label}]에 도착했습니다.`);

      // Complete morning quest if stepping out into garden or village
      if (portal.targetMapId === 'garden' || portal.targetMapId === 'village') {
        if (!quests.quest_morning.completed) {
          updateQuest('quest_morning', 1, true);
        }
      }

      // Auto-save on map transition!
      setTimeout(() => {
        handleSaveGame('auto');
      }, 200);
      return;
    }

    // Step sound & movement
    walkStepRef.current += 1;
    if (walkStepRef.current % 3 === 0) {
      dubuAudio.playWag();
    }
    setPlayerPos({ x: newX, y: newY, dir });
  }, [
    dialogState.isOpen,
    isSaveModalOpen,
    currentMapId,
    playerPos,
    showToast,
    quests.quest_morning.completed,
    updateQuest,
    handleSaveGame
  ]);

  // ⌨️ Keyboard Listeners
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        if (dialogState.isOpen) {
          advanceDialog();
        } else {
          setIsSaveModalOpen(prev => !prev);
        }
        return;
      }

      if (dialogState.isOpen) {
        if (['Enter', ' ', 'z', 'Z'].includes(e.key)) {
          advanceDialog();
        }
        return;
      }

      if (isSaveModalOpen || isBagModalOpen || isQuestModalOpen || isGuideModalOpen) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          movePlayer(0, -1, 'up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          movePlayer(0, 1, 'down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          movePlayer(-1, 0, 'left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          movePlayer(1, 0, 'right');
          break;
        case ' ':
        case 'Enter':
        case 'z':
        case 'Z':
          handleInteract();
          break;
        case 'c':
        case 'C':
          handleBark();
          break;
        case 'v':
        case 'V':
          handleSniff();
          break;
        case 'x':
        case 'X':
          handleWag();
          break;
        case 'b':
        case 'B':
          handleBellyRub();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    dialogState.isOpen,
    advanceDialog,
    isSaveModalOpen,
    isBagModalOpen,
    isQuestModalOpen,
    isGuideModalOpen,
    movePlayer,
    handleInteract,
    handleBark,
    handleSniff,
    handleWag,
    handleBellyRub
  ]);

  // 🎨 CANVAS RENDERING LOOP
  useEffect(() => {
    if (gameState !== 'playing') return;

    let frame = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      frame++;
      const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS.home;

      // 1. Camera calculation (center on Dubu)
      const playerPixelX = playerPos.x * TILE_SIZE + TILE_SIZE / 2;
      const playerPixelY = playerPos.y * TILE_SIZE + TILE_SIZE / 2;

      let camX = playerPixelX - CANVAS_WIDTH / 2;
      let camY = playerPixelY - CANVAS_HEIGHT / 2;

      // Clamp camera
      const mapPixelWidth = currentMap.width * TILE_SIZE;
      const mapPixelHeight = currentMap.height * TILE_SIZE;
      camX = Math.max(0, Math.min(camX, mapPixelWidth - CANVAS_WIDTH));
      camY = Math.max(0, Math.min(camY, mapPixelHeight - CANVAS_HEIGHT));

      // If map is smaller than canvas, center map
      if (mapPixelWidth < CANVAS_WIDTH) camX = -(CANVAS_WIDTH - mapPixelWidth) / 2;
      if (mapPixelHeight < CANVAS_HEIGHT) camY = -(CANVAS_HEIGHT - mapPixelHeight) / 2;

      ctx.save();
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background color
      ctx.fillStyle =
        currentMap.theme === 'indoor'
          ? '#e2d5c3'
          : currentMap.theme === 'forest'
          ? '#2e5339'
          : currentMap.theme === 'rainbow'
          ? '#7dd3fc'
          : '#86efac';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.translate(-camX, -camY);

      // 2. Render Tiles
      for (let y = 0; y < currentMap.height; y++) {
        for (let x = 0; x < currentMap.width; x++) {
          const tile = currentMap.tiles[y][x];
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          if (currentMap.theme === 'indoor') {
            // Wood floor
            ctx.fillStyle = (x + y) % 2 === 0 ? '#fef3c7' : '#fde68a';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#fcd34d';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

            if (tile === 1) {
              // Wall
              ctx.fillStyle = '#b45309';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#92400e';
              ctx.fillRect(px, py + TILE_SIZE - 6, TILE_SIZE, 6);
            }
          } else {
            // Grass / Outdoor
            if (tile === 0 || tile === 3) {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#86efac' : '#4ade80';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

              // Flower petals
              if (tile === 3) {
                ctx.fillStyle = (x * y) % 3 === 0 ? '#f43f5e' : (x * y) % 3 === 1 ? '#eab308' : '#38bdf8';
                ctx.beginPath();
                ctx.arc(px + 12, py + 12, 4, 0, Math.PI * 2);
                ctx.arc(px + 28, py + 24, 4, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (tile === 1) {
              // Fence / Trees
              ctx.fillStyle = '#166534';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#15803d';
              ctx.beginPath();
              ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2.2, 0, Math.PI * 2);
              ctx.fill();
            } else if (tile === 2) {
              // Water
              ctx.fillStyle = '#38bdf8';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              // Animated ripple
              ctx.strokeStyle = '#bae6fd';
              ctx.lineWidth = 2;
              const rippleOffset = Math.sin(frame * 0.05 + x + y) * 4;
              ctx.beginPath();
              ctx.moveTo(px + 6, py + 16 + rippleOffset);
              ctx.lineTo(px + 32, py + 16 + rippleOffset);
              ctx.stroke();
            } else if (tile === 4) {
              // Stone path
              ctx.fillStyle = '#fed7aa';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              ctx.strokeStyle = '#fdba74';
              ctx.lineWidth = 1;
              ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            }
          }
        }
      }

      // 3. Render Portals with pulsing arrow
      currentMap.portals.forEach(portal => {
        const px = portal.x * TILE_SIZE;
        const py = portal.y * TILE_SIZE;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Pretendard';
        ctx.textAlign = 'center';
        const bounce = Math.sin(frame * 0.1) * 3;
        ctx.fillText('🚪', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 6 + bounce);
      });

      // 4. Render Interactables
      currentMap.interactables.forEach(item => {
        const px = item.x * TILE_SIZE;
        const py = item.y * TILE_SIZE;
        const isCollected = collectedItemIds.includes(item.id);

        if (item.type === 'bed') {
          // Cozy Bed
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 28, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#64748b';
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🛌', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 8);
        } else if (item.type === 'save_crystal') {
          // Save Monument
          const glow = Math.sin(frame * 0.08) * 4;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 16 + glow, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔮', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 8);
        } else if (!isCollected) {
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.icon, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 8);
        }

        // Sniff sparkle wave over hidden treasures
        if (sniffSparkles.some(s => s.x === item.x && s.y === item.y)) {
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2;
          const radius = (frame * 2) % 25;
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = '16px sans-serif';
          ctx.fillText('✨', px + TILE_SIZE / 2, py);
        }
      });

      // 5. Render NPCs
      currentMap.npcs.forEach(npc => {
        const px = npc.x * TILE_SIZE;
        const py = npc.y * TILE_SIZE;
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        const bounce = Math.sin(frame * 0.06 + npc.x) * 2;
        ctx.fillText(npc.sprite, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10 + bounce);

        // Name badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(px - 10, py - 14, TILE_SIZE + 20, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Pretendard';
        ctx.fillText(npc.name, px + TILE_SIZE / 2, py - 2);
      });

      // 6. Render Dubu (The Main Hero Dog!)
      const dubuX = playerPos.x * TILE_SIZE;
      const dubuY = playerPos.y * TILE_SIZE;
      const walkBob = Math.sin(walkStepRef.current * 0.5) * 3;

      if (isRelaxing && dubuSleepImgRef.current && dubuSleepImgRef.current.complete) {
        // 🛌 Lying down tummy up on cushion (like dubu1.jpg)
        ctx.drawImage(dubuSleepImgRef.current, dubuX - 10, dubuY - 10, 60, 60);

        // Sleeping Zzz and Hearts
        ctx.font = '16px Pretendard';
        ctx.fillStyle = '#ec4899';
        const zOffset = (frame * 0.5) % 30;
        ctx.fillText('💤', dubuX + 30, dubuY - zOffset);
        ctx.fillText('❤️', dubuX + 5, dubuY - zOffset);
      } else if (dubuWalkImgRef.current && dubuWalkImgRef.current.complete) {
        // 🐶 Walking / Standing Dubu
        ctx.save();
        const drawW = 50;
        const drawH = 50;
        const drawX = dubuX - 5;
        const drawY = dubuY - 8 + walkBob;

        if (playerPos.dir === 'left') {
          // Flip horizontally
          ctx.translate(drawX + drawW, drawY);
          ctx.scale(-1, 1);
          ctx.drawImage(dubuWalkImgRef.current, 0, 0, drawW, drawH);
        } else {
          ctx.drawImage(dubuWalkImgRef.current, drawX, drawY, drawW, drawH);
        }
        ctx.restore();

        // Barking shockwave effect
        if (isBarking) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(dubuX + TILE_SIZE / 2, dubuY + TILE_SIZE / 2, 28, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = '16px Pretendard';
          ctx.fillStyle = '#b45309';
          ctx.fillText('멍멍! 🐾', dubuX + TILE_SIZE / 2, dubuY - 10);
        }

        // Sniffing ripple effect
        if (isSniffing) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(dubuX + TILE_SIZE / 2, dubuY + TILE_SIZE / 2, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = '16px Pretendard';
          ctx.fillText('👃✨', dubuX + TILE_SIZE / 2, dubuY - 10);
        }

        // Wagging tail effect
        if (isWagging) {
          ctx.font = '16px Pretendard';
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('💨🐾', dubuX + 35, dubuY + 10);
        }
      } else {
        // Fallback emoji if image not yet loaded
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🐶', dubuX + TILE_SIZE / 2, dubuY + TILE_SIZE / 2 + 10);
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [
    gameState,
    currentMapId,
    playerPos,
    isRelaxing,
    isBarking,
    isSniffing,
    isWagging,
    sniffSparkles,
    collectedItemIds
  ]);

  const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS.home;

  return (
    <div className="dubu-rpg-container">
      {/* 🍞 TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="dubu-toast-notice">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 🌟 1. TITLE SCREEN VIEW */}
      {gameState === 'title' && (
        <div className="dubu-title-screen">
          <div className="dubu-title-hero">
            <img
              src="/images/dubu_rpg_title.jpg"
              alt="두부의 따뜻한 모험 타이틀"
              className="dubu-title-img"
            />
            <div className="dubu-title-overlay">
              <button
                className="dubu-sound-btn"
                onClick={() => {
                  const muted = dubuAudio.toggleMute();
                  setIsMuted(muted);
                }}
              >
                {isMuted ? '🔇 소리 켜기' : '🎵 BGM & 효과음 ON'}
              </button>
            </div>
          </div>

          <div className="dubu-title-controls">
            <div className="dubu-title-buttons">
              <button
                className="dubu-rpg-btn primary"
                onClick={() => {
                  setGameState('playing');
                  dubuAudio.startBgm();
                  dubuAudio.playBark();
                  showToast('🐾 두부의 따뜻한 모험이 시작되었습니다! 방 안을 탐색해보세요.');
                }}
              >
                🐾 새로운 모험 시작
              </button>

              <button
                className="dubu-rpg-btn secondary"
                onClick={() => {
                  setIsSaveModalOpen(true);
                  setSaveTab('load');
                }}
              >
                📂 모험 이어하기 (중간 세이브 불러오기)
              </button>

              <button
                className="dubu-rpg-btn outline"
                onClick={() => setIsEndingsModalOpen(true)}
              >
                🏆 엔딩 도감 ({unlockedEndings.length}/4)
              </button>

              <button
                className="dubu-rpg-btn outline"
                onClick={() => setIsGuideModalOpen(true)}
              >
                📖 힐링 조작법 & 스토리 안내
              </button>

              {onLeaveRoom && (
                <button className="dubu-rpg-btn outline" onClick={onLeaveRoom}>
                  🏠 오락실 메인으로
                </button>
              )}
            </div>

            <div className="dubu-title-footer-tips">
              💡 <strong>진엔딩 1개 + 가짜엔딩 3개 지원:</strong> 댕댕이 두부의 선택에 따라 다양한 엔딩을 경험해 보세요!
            </div>
          </div>
        </div>
      )}

      {/* 🌟 2. ACTIVE GAMEPLAY VIEW */}
      {gameState === 'playing' && (
        <div className="dubu-gameplay-wrapper">
          {/* TOP STATUS HUD */}
          <div className="dubu-rpg-top-hud">
            <div className="hud-left-profile">
              <img
                src="/images/dubu_dialog_face.jpg"
                alt="두부 프로필"
                className="hud-avatar"
              />
              <div className="hud-name-box">
                <span className="hud-dog-name">
                  두부 <span>(Dubu)</span>
                </span>
                <span className="hud-map-badge">📍 {currentMap.name}</span>
              </div>
            </div>

            <div className="hud-stats-group">
              <div className="hud-stat-item">
                <span>❤️ 체력 {hp}%</span>
                <div className="hud-bar-container">
                  <div
                    className="hud-bar-fill hp"
                    style={{ width: `${hp}%` }}
                  />
                </div>
              </div>

              <div className="hud-stat-item">
                <span>✨ 행복도 {happiness}%</span>
                <div className="hud-bar-container">
                  <div
                    className="hud-bar-fill happy"
                    style={{ width: `${happiness}%` }}
                  />
                </div>
              </div>

              <div className="hud-stat-item" title="플레이 타임">
                <span>⏱️ {Math.floor(playTimeSeconds / 60)}분 {playTimeSeconds % 60}초</span>
              </div>
            </div>

            <div className="hud-actions-group">
              <button
                className="hud-btn save-highlight"
                onClick={() => {
                  setIsSaveModalOpen(true);
                  setSaveTab('save');
                }}
                title="중간 세이브 메뉴 열기"
              >
                💾 중간 세이브
              </button>

              <button
                className="hud-btn"
                onClick={() => setIsBagModalOpen(true)}
                title="가방 열기"
              >
                🎒 가방 ({inventory.length})
              </button>

              <button
                className="hud-btn"
                onClick={() => setIsQuestModalOpen(true)}
                title="퀘스트 일지"
              >
                📜 퀘스트
              </button>

              <button
                className="hud-btn"
                onClick={() => setIsEndingsModalOpen(true)}
                title="엔딩 도감 확인"
              >
                🏆 엔딩 ({unlockedEndings.length}/4)
              </button>

              <button
                className="hud-btn"
                onClick={() => {
                  const muted = dubuAudio.toggleMute();
                  setIsMuted(muted);
                }}
                title="음악 켜기/끄기"
              >
                {isMuted ? '🔇' : '🎵'}
              </button>

              <button
                className="hud-btn"
                onClick={() => setGameState('title')}
                title="타이틀 화면으로 이동"
              >
                🏠 타이틀
              </button>
            </div>
          </div>

          {/* RETRO SCREEN CANVAS BOX */}
          <div className="dubu-canvas-frame">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="dubu-rpg-canvas"
            />

            {/* TSUKURU RETRO DIALOGUE BOX */}
            {dialogState.isOpen && (
              <div
                className="tsukuru-dialog-overlay"
                onClick={advanceDialog}
              >
                <div className="tsukuru-dialog-portrait-box">
                  {dialogState.lines[dialogState.lineIndex]?.speaker === '두부' ? (
                    <img
                      src="/images/dubu_dialog_face.jpg"
                      alt="두부"
                      className="tsukuru-dialog-portrait-img"
                    />
                  ) : (
                    <div className="tsukuru-dialog-emoji-avatar">
                      {dialogState.lines[dialogState.lineIndex]?.speaker === '집사'
                        ? '🧑‍💻'
                        : dialogState.lines[dialogState.lineIndex]?.speaker === '순자 할머니'
                        ? '👵'
                        : dialogState.lines[dialogState.lineIndex]?.speaker === '길고양이 나비' ||
                          dialogState.lines[dialogState.lineIndex]?.speaker === '나비'
                        ? '🐱'
                        : dialogState.lines[dialogState.lineIndex]?.speaker === '토끼 우체부 바니' ||
                          dialogState.lines[dialogState.lineIndex]?.speaker === '바니'
                        ? '🐰'
                        : dialogState.lines[dialogState.lineIndex]?.speaker === '삐약이'
                        ? '🐥'
                        : dialogState.lines[dialogState.lineIndex]?.speaker === '다람쥐 도토리'
                        ? '🐿️'
                        : '📜'}
                    </div>
                  )}
                </div>
                <div className="tsukuru-dialog-body">
                  <div className="tsukuru-dialog-speaker">
                    [{dialogState.lines[dialogState.lineIndex]?.speaker || '안내'}]
                  </div>
                  <p className="tsukuru-dialog-text">
                    {dialogState.displayedText}
                  </p>
                  {dialogState.lines[dialogState.lineIndex]?.choices && (
                    <div className="tsukuru-dialog-choices-box">
                      {dialogState.lines[dialogState.lineIndex].choices!.map(choice => (
                        <button
                          key={choice.actionKey}
                          className="tsukuru-choice-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChoiceAction(choice.actionKey);
                          }}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!dialogState.lines[dialogState.lineIndex]?.choices && (
                  <div className="tsukuru-dialog-arrow">▼</div>
                )}
              </div>
            )}
          </div>

          {/* 🐾 ACTION QUICK BAR */}
          <div className="dubu-action-quickbar">
            <button
              className="action-quick-btn"
              onClick={handleInteract}
              title="대화 및 조사하기"
            >
              🔍 조사 / 대화 <kbd>Space / Z</kbd>
            </button>

            <button
              className="action-quick-btn bark-btn"
              onClick={handleBark}
              title="귀엽게 멍멍 짖기"
            >
              🐶 멍멍! 짖기 <kbd>C</kbd>
            </button>

            <button
              className="action-quick-btn sniff-btn"
              onClick={handleSniff}
              title="코를 킁킁거리며 비밀 보물 찾기"
            >
              👃 킁킁 냄새맡기 <kbd>V</kbd>
            </button>

            <button
              className="action-quick-btn wag-btn"
              onClick={handleWag}
              title="꼬리 살랑살랑 흔들기"
            >
              🐾 꼬리흔들기 <kbd>X</kbd>
            </button>

            <button
              className="action-quick-btn belly-btn"
              onClick={handleBellyRub}
              title="바닥에 등을 대고 발라당 눕기 (dubu1.jpg)"
            >
              🛌 발라당 눕기 <kbd>B</kbd>
            </button>

            <button
              className="action-quick-btn"
              onClick={() => {
                setIsSaveModalOpen(true);
                setSaveTab('save');
              }}
              title="세이브 메뉴"
            >
              💾 세이브 <kbd>S / ESC</kbd>
            </button>
          </div>

          {/* 📱 VIRTUAL TOUCH D-PAD FOR MOBILE & MOUSE */}
          <div className="dubu-touch-controls">
            <div className="touch-dpad-grid">
              <div />
              <button
                className="touch-dpad-btn"
                onClick={() => movePlayer(0, -1, 'up')}
              >
                ▲
              </button>
              <div />
              <button
                className="touch-dpad-btn"
                onClick={() => movePlayer(-1, 0, 'left')}
              >
                ◀
              </button>
              <button
                className="touch-dpad-btn"
                onClick={handleInteract}
              >
                ●
              </button>
              <button
                className="touch-dpad-btn"
                onClick={() => movePlayer(1, 0, 'right')}
              >
                ▶
              </button>
              <div />
              <button
                className="touch-dpad-btn"
                onClick={() => movePlayer(0, 1, 'down')}
              >
                ▼
              </button>
              <div />
            </div>

            <div className="touch-action-buttons">
              <div className="touch-action-row">
                <button
                  className="touch-circle-btn"
                  onClick={handleBark}
                  title="멍멍"
                >
                  🐶
                </button>
                <button
                  className="touch-circle-btn"
                  onClick={handleSniff}
                  title="킁킁"
                >
                  👃
                </button>
                <button
                  className="touch-circle-btn"
                  onClick={handleWag}
                  title="꼬리"
                >
                  🐾
                </button>
                <button
                  className="touch-circle-btn"
                  onClick={handleBellyRub}
                  title="발라당"
                >
                  🛌
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 3. CELEBRATION ENDING VIEW (진엔딩 1개 + 가짜엔딩 3개) */}
      {gameState === 'ending' && (() => {
        const curEnding = ENDINGS_DATA[activeEnding || 'true_rainbow'] || ENDINGS_DATA.true_rainbow;
        const isTrue = curEnding.type === 'true';
        return (
          <div className="dubu-ending-overlay">
            <div className="dubu-ending-card">
              <div
                className={`ending-badge ${isTrue ? 'true' : 'fake'}`}
                style={{
                  background: isTrue ? '#10b981' : '#f59e0b',
                  color: '#ffffff'
                }}
              >
                {curEnding.badge}
              </div>
              <h2 className="ending-title">
                {curEnding.icon} {curEnding.title}
              </h2>
              <img
                src={curEnding.image}
                alt={curEnding.title}
                className="ending-cushion-img"
              />
              <p className="ending-desc">
                {curEnding.desc}
              </p>
              <div className="endings-summary-header" style={{ marginBottom: 16, width: '100%', boxSizing: 'border-box' }}>
                <span>🏆 엔딩 수집 현황</span>
                <span>{unlockedEndings.length} / 4개 해금</span>
              </div>
              <div className="dubu-title-buttons" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  className="dubu-rpg-btn"
                  style={{ background: '#ec4899', color: '#fff' }}
                  onClick={() => setIsEndingsModalOpen(true)}
                >
                  🏆 엔딩 도감 보기
                </button>
                <button
                  className="dubu-rpg-btn primary"
                  onClick={() => {
                    setGameState('playing');
                    showToast('🐾 자유 모험 모드로 돌아왔습니다. 다른 분기점도 찾아보세요!');
                  }}
                >
                  ✨ 계속 탐험하기
                </button>
                <button
                  className="dubu-rpg-btn outline"
                  onClick={() => {
                    handleSaveGame('auto');
                    setGameState('title');
                  }}
                >
                  🏠 세이브 후 타이틀로
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 💾 SAVE / LOAD MODAL */}
      {isSaveModalOpen && (
        <div
          className="dubu-modal-backdrop"
          onClick={() => setIsSaveModalOpen(false)}
        >
          <div
            className="dubu-save-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="save-modal-header">
              <h3 className="save-modal-title">
                💾 <span>두부의 중간 세이브 센터</span>
              </h3>
              <button
                className="save-modal-close-btn"
                onClick={() => setIsSaveModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="save-modal-tabs">
              <button
                className={`save-tab-btn ${saveTab === 'save' ? 'active' : ''}`}
                onClick={() => setSaveTab('save')}
              >
                💾 저장하기 (Save)
              </button>
              <button
                className={`save-tab-btn ${saveTab === 'load' ? 'active' : ''}`}
                onClick={() => setSaveTab('load')}
              >
                📂 불러오기 (Load)
              </button>
              <button
                className={`save-tab-btn ${saveTab === 'backup' ? 'active' : ''}`}
                onClick={() => setSaveTab('backup')}
              >
                📤 파일 백업/복원
              </button>
            </div>

            <div className="save-modal-body">
              {(saveTab === 'save' || saveTab === 'load') && (
                <>
                  {(['slot1', 'slot2', 'slot3', 'auto'] as const).map(slotKey => {
                    const data = saveSlots[slotKey];
                    const isAuto = slotKey === 'auto';
                    const slotLabel = isAuto
                      ? '오토세이브 (Auto Save)'
                      : slotKey === 'slot1'
                      ? '세이브 슬롯 1'
                      : slotKey === 'slot2'
                      ? '세이브 슬롯 2'
                      : '세이브 슬롯 3';

                    return (
                      <div
                        key={slotKey}
                        className={`save-slot-card ${!data ? 'is-empty' : ''}`}
                      >
                        <div className="slot-info-box">
                          <div className="slot-title-row">
                            <span className={`slot-badge ${isAuto ? 'auto' : ''}`}>
                              {isAuto ? 'AUTO' : slotKey.toUpperCase()}
                            </span>
                            <span className="slot-name">{slotLabel}</span>
                          </div>

                          {data ? (
                            <div className="slot-meta-row">
                              <span>📍 {data.mapName}</span>
                              <span>🕒 {data.saveDateStr}</span>
                              <span>❤️ {data.stats?.hp}%</span>
                              <span>✨ {data.stats?.happiness}%</span>
                            </div>
                          ) : (
                            <div className="slot-meta-row">
                              <span>비어있는 저장 슬롯입니다.</span>
                            </div>
                          )}
                        </div>

                        <div className="slot-actions">
                          {saveTab === 'save' && !isAuto && (
                            <button
                              className="slot-action-btn save"
                              onClick={() => handleSaveGame(slotKey)}
                            >
                              저장
                            </button>
                          )}
                          {saveTab === 'load' && data && (
                            <button
                              className="slot-action-btn load"
                              onClick={() => handleLoadGame(slotKey)}
                            >
                              불러오기
                            </button>
                          )}
                          {data && !isAuto && (
                            <button
                              className="slot-action-btn delete"
                              onClick={() => handleDeleteSlot(slotKey)}
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {saveTab === 'backup' && (
                <div className="save-backup-box">
                  <p className="save-backup-desc">
                    브라우저 캐시가 삭제되더라도 안전하게 세이브를 영구 보관할 수 있습니다.
                    세이브 파일을 JSON 파일로 다운로드하거나, 이전에 저장해둔 JSON 파일을 불러올 수 있습니다.
                  </p>
                  <div className="save-backup-btns">
                    <button
                      className="dubu-rpg-btn primary"
                      onClick={handleExportBackup}
                    >
                      📤 세이브 파일 다운로드 (.json)
                    </button>
                    <label className="dubu-rpg-btn secondary" style={{ cursor: 'pointer' }}>
                      📥 세이브 파일 불러오기 (.json)
                      <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={handleImportBackup}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎒 BAG INVENTORY MODAL */}
      {isBagModalOpen && (
        <div
          className="dubu-modal-backdrop"
          onClick={() => setIsBagModalOpen(false)}
        >
          <div
            className="dubu-save-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="save-modal-header">
              <h3 className="save-modal-title">
                🎒 <span>두부의 보물 가방</span>
              </h3>
              <button
                className="save-modal-close-btn"
                onClick={() => setIsBagModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="save-modal-body">
              {inventory.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>
                  가방이 비어있습니다. 마을과 숲에서 간식과 보물을 찾아보세요!
                </p>
              ) : (
                <div className="dubu-items-grid">
                  {inventory.map(item => (
                    <div key={item.id} className="item-card">
                      <span className="item-icon">{item.icon}</span>
                      <span className="item-name">{item.name}</span>
                      <span className="item-count">수량: {item.count}개</span>
                      <span className="item-desc">{item.desc}</span>
                      {item.usable && (
                        <button
                          className="slot-action-btn save"
                          style={{ marginTop: 6, fontSize: '0.75rem' }}
                          onClick={() => {
                            if (item.id === 'sweet_potato_dry' || item.id === 'strawberry_berry') {
                              setHp(100);
                              setHappiness(100);
                              dubuAudio.playItemCollect();
                              setInventory(prev =>
                                prev
                                  .map(i => (i.id === item.id ? { ...i, count: i.count - 1 } : i))
                                  .filter(i => i.count > 0)
                              );

                              if (item.id === 'sweet_potato_dry') {
                                const nextCount = sweetPotatoesEatenCount + 1;
                                setSweetPotatoesEatenCount(nextCount);
                                if (nextCount >= 5) {
                                  setIsBagModalOpen(false);
                                  showToast('🍠 꿀고구마를 5개나 연속으로 배 터지게 먹어치웠습니다!');
                                  triggerEnding('fake_sweet_potato');
                                } else {
                                  showToast(`😋 [${item.name}]을(를) 맛있게 냠냠! (누적 먹방: ${nextCount}/5개)`);
                                }
                              } else {
                                showToast(`😋 [${item.name}]을(를) 맛있게 냠냠 먹었습니다! 체력 회복!`);
                              }
                            }
                          }}
                        >
                          맛있게 먹기
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📜 QUEST LOG MODAL */}
      {isQuestModalOpen && (
        <div
          className="dubu-modal-backdrop"
          onClick={() => setIsQuestModalOpen(false)}
        >
          <div
            className="dubu-save-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="save-modal-header">
              <h3 className="save-modal-title">
                📜 <span>두부의 따뜻한 퀘스트 일지</span>
              </h3>
              <button
                className="save-modal-close-btn"
                onClick={() => setIsQuestModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="save-modal-body">
              <div className="dubu-quest-list">
                {Object.values(quests).map(q => (
                  <div
                    key={q.id}
                    className={`quest-card ${q.completed ? 'completed' : ''}`}
                  >
                    <div className="quest-header-row">
                      <span className="quest-title">
                        {q.completed ? '✅' : '⏳'} {q.title}
                      </span>
                      <span className="quest-giver">의뢰자: {q.giverIcon} {q.giver}</span>
                    </div>
                    <p className="quest-desc">{q.desc}</p>
                    <div className="quest-hint">
                      💡 {q.completed ? '완료되었습니다! (보상 획득)' : q.targetHint}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📖 GUIDE MODAL */}
      {isGuideModalOpen && (
        <div
          className="dubu-modal-backdrop"
          onClick={() => setIsGuideModalOpen(false)}
        >
          <div
            className="dubu-save-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="save-modal-header">
              <h3 className="save-modal-title">
                📖 <span>두부의 조작법 & 힐링 가이드</span>
              </h3>
              <button
                className="save-modal-close-btn"
                onClick={() => setIsGuideModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="save-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="quest-card">
                  <div className="quest-title">🎮 키보드 조작법</div>
                  <p className="quest-desc">
                    • <strong>이동:</strong> 방향키 (↑, ↓, ←, →) 또는 W, A, S, D<br />
                    • <strong>조사 / 대화:</strong> Space, Enter, Z<br />
                    • <strong>멍멍! 짖기:</strong> C 키 (동물 친구들에게 인사, 하트 뿅뿅)<br />
                    • <strong>킁킁! 냄새맡기:</strong> V 키 (흙더미/풀숲 속 숨겨진 보물 위치 탐지)<br />
                    • <strong>꼬리 살랑살랑:</strong> X 키 (행복도 충전 & 친구 호감도 상승)<br />
                    • <strong>발라당 눕기:</strong> B 키 (dubu1.jpg처럼 배를 보이고 누워 체력 100% 회복)<br />
                    • <strong>중간 세이브 & 메뉴:</strong> ESC 또는 S 키
                  </p>
                </div>

                <div className="quest-card">
                  <div className="quest-title">💾 중간 세이브 기능 안내</div>
                  <p className="quest-desc">
                    모험 도중 언제 어디서든 <code>ESC</code>나 <code>💾 세이브</code> 버튼을 눌러 슬롯 1, 2, 3에 현재 위치와 인벤토리를 그대로 중간 저장할 수 있습니다. 맵을 이동할 때마다 오토세이브가 작동하며, JSON 파일로 내 컴퓨터에 영구 백업할 수도 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🏆 ENDING COLLECTION MODAL (진엔딩 1개 + 가짜엔딩 3개 도감) */}
      {isEndingsModalOpen && (
        <div
          className="dubu-modal-backdrop"
          onClick={() => setIsEndingsModalOpen(false)}
        >
          <div
            className="dubu-save-modal"
            style={{ maxWidth: 680 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="save-modal-header">
              <h3 className="save-modal-title">
                🏆 <span>두부의 엔딩 도감 (진엔딩 1개 + 가짜엔딩 3개)</span>
              </h3>
              <button
                className="save-modal-close-btn"
                onClick={() => setIsEndingsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="save-modal-body">
              <div className="endings-summary-header" style={{ marginBottom: 14 }}>
                <span>✨ 총 엔딩 수집: <strong>{unlockedEndings.length} / 4개</strong></span>
                <span>{unlockedEndings.includes('true_rainbow') ? '🌟 진엔딩 달성완료!' : '⏳ 진엔딩 미달성'}</span>
              </div>
              <div className="endings-modal-grid">
                {(Object.values(ENDINGS_DATA) as EndingMeta[]).map(meta => {
                  const isUnlocked = unlockedEndings.includes(meta.id);
                  const isTrue = meta.type === 'true';
                  return (
                    <div
                      key={meta.id}
                      className={`ending-record-card ${isUnlocked ? 'unlocked' : ''} ${
                        isUnlocked && isTrue ? 'is-true' : ''
                      }`}
                    >
                      <img
                        src={meta.image}
                        alt={meta.title}
                        className="ending-record-img"
                        style={{
                          filter: isUnlocked ? 'none' : 'grayscale(100%) brightness(0.65)'
                        }}
                      />
                      <div className="ending-record-info">
                        <div className="ending-record-title">
                          <span className={`ending-record-badge ${isTrue ? 'true' : 'fake'}`}>
                            {meta.badge}
                          </span>
                          <span>{isUnlocked ? `${meta.icon} ${meta.title}` : '🔒 ??? (미해금 엔딩)'}</span>
                        </div>
                        <p className="ending-record-desc">
                          {isUnlocked ? meta.desc : '아직 발견하지 못한 이야기입니다. 힌트를 확인해 모험을 떠나보세요!'}
                        </p>
                        <div className="ending-record-hint">
                          💡 <strong>달성 힌트:</strong> {meta.conditionHint}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DubuRpgGame;
