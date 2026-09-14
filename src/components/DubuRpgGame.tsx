import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DubuRpgGame.css';
import type {
  Direction,
  Item,
  Quest,
  SaveData,
  DialogLine,
  EndingType,
  EndingMeta,
  HeroType
} from '../types/dubuRpg';
import { GAME_MAPS, INITIAL_ITEMS, INITIAL_QUESTS, ENDINGS_DATA, HEROES_CONFIG } from '../data/dubuRpgData';
import { dubuAudio } from '../utils/dubuRpgAudio';

interface DubuRpgGameProps {
  username?: string;
  onLeaveRoom?: () => void;
}

const TILE_SIZE = 52;
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 600;

const NPC_DIALOG_PORTRAITS: Record<string, string> = {
  '집사': '/images/npc_butler.png',
  '다정한 집사': '/images/npc_butler.png',
  '순자 할머니': '/images/npc_grandma.png',
  '길고양이 나비': '/images/npc_cat.png',
  '나비': '/images/npc_cat.png',
  '나비의 은밀한 제안': '/images/npc_cat.png',
  '토끼 우체부 바니': '/images/npc_bunny.png',
  '바니': '/images/npc_bunny.png',
  '삐약이': '/images/npc_chicks.png',
  '아기 병아리 삐약이': '/images/npc_chicks.png',
  '초코': '/images/npc_choco.png',
  '댕댕이 친구 초코': '/images/npc_choco.png'
};

export const DubuRpgGame: React.FC<DubuRpgGameProps> = ({
  username = '두부집사',
  onLeaveRoom
}) => {
  // 🎮 Game State & Screen Scale
  const [gameState, setGameState] = useState<'title' | 'playing' | 'ending'>('title');
  const [zoomMode, setZoomMode] = useState<'normal' | 'large'>('large');
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

  // 🎒 Sub-Modals (Inventory, Quests, Guide, Settings)
  const [isBagModalOpen, setIsBagModalOpen] = useState<boolean>(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // 🐶 Hero Selection System ('dubu' | 'guruem')
  const [selectedHero, setSelectedHero] = useState<HeroType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dubu_rpg_hero');
      if (saved === 'guruem' || saved === 'dubu') return saved;
    }
    return 'dubu';
  });
  const selectedHeroRef = useRef<HeroType>(selectedHero);
  selectedHeroRef.current = selectedHero;

  // 🍞 Toast & Audio
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => dubuAudio.getMuted());

  // 🖼️ Canvas & Asset References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dubuWalkImgRef = useRef<HTMLImageElement | null>(null);
  const dubuSleepImgRef = useRef<HTMLImageElement | null>(null);
  const mapImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const npcSpritesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const transparentSpritesRef = useRef<{ [key: string]: HTMLCanvasElement }>({});
  const animFrameRef = useRef<number>(0);

  // 🐶 Dual Hero Sprites Cache (두부 & 구름이)
  const heroSpritesRef = useRef<Record<HeroType, {
    walkImg: HTMLImageElement | null;
    sleepImg: HTMLImageElement | null;
    stepFrames: { stepA: HTMLCanvasElement; stepB: HTMLCanvasElement } | null;
  }>>({
    dubu: { walkImg: null, sleepImg: null, stepFrames: null },
    guruem: { walkImg: null, sleepImg: null, stepFrames: null }
  });

  // 🐾 Smooth Grid Movement & Directional Animation Refs
  const moveAnimRef = useRef<{
    isMoving: boolean;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    startTime: number;
    duration: number;
    dir: Direction;
    stepIndex: number;
  }>({
    isMoving: false,
    startX: 7,
    startY: 6,
    targetX: 7,
    targetY: 6,
    startTime: 0,
    duration: 170,
    dir: 'down',
    stepIndex: 0
  });

  const visualPosRef = useRef<{ x: number; y: number }>({ x: 7, y: 6 });
  const currentGridPosRef = useRef<{ x: number; y: number; dir: Direction }>({ x: 7, y: 6, dir: 'down' });
  const heldDirectionsRef = useRef<Direction[]>([]);

  // 🐶 Strict Horizontal Facing ('left' | 'right' - ONLY changes when Left/Right keys are pressed!)
  const facingHRef = useRef<'left' | 'right'>('right');
  const walkStepFramesRef = useRef<{ stepA: HTMLCanvasElement; stepB: HTMLCanvasElement } | null>(null);

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

  // 🖼️ Preload Dubu Pixel Art, Walking Steps & Map Background Images
  useEffect(() => {
    const makeTransparentCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width || 256;
      c.height = img.naturalHeight || img.height || 256;
      const ctx = c.getContext('2d');
      if (!ctx) return c;
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Chroma-key out white/near-white pixel background
          if (r > 230 && g > 230 && b > 230) {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch {}
      return c;
    };

    const createWalkStepFrames = (baseImg: HTMLImageElement, hero: HeroType) => {
      const w = baseImg.naturalWidth || baseImg.width || 256;
      const h = baseImg.naturalHeight || baseImg.height || 256;

      const cA = document.createElement('canvas');
      cA.width = w;
      cA.height = h;
      const ctxA = cA.getContext('2d');
      if (!ctxA) return null;

      const cB = document.createElement('canvas');
      cB.width = w;
      cB.height = h;
      const ctxB = cB.getContext('2d');
      if (!ctxB) return null;

      if (hero === 'guruem') {
        // Guruem stepping: subtle vertical paw lift (NO horizontal shift)
        // Frame A: front paws lift 2px
        ctxA.drawImage(baseImg, 0, 0, w, 175, 0, 0, w, 175);
        ctxA.drawImage(baseImg, 35, 175, 80, h - 175, 35, 175, 80, h - 175);
        ctxA.drawImage(baseImg, 125, 175, 85, h - 175, 125, 173, 85, h - 175);

        // Frame B: hind paws lift 2px
        ctxB.drawImage(baseImg, 0, 0, w, 175, 0, 0, w, 175);
        ctxB.drawImage(baseImg, 35, 175, 80, h - 175, 35, 173, 80, h - 175);
        ctxB.drawImage(baseImg, 125, 175, 85, h - 175, 125, 175, 85, h - 175);
      } else {
        // Dubu stepping: subtle vertical paw lift (NO horizontal shift)
        // Frame A: front paws lift 2px
        ctxA.drawImage(baseImg, 0, 0, w, 175, 0, 0, w, 175);
        ctxA.drawImage(baseImg, 55, 175, 70, h - 175, 55, 175, 70, h - 175);
        ctxA.drawImage(baseImg, 130, 175, 85, h - 175, 130, 173, 85, h - 175);

        // Frame B: hind paws lift 2px
        ctxB.drawImage(baseImg, 0, 0, w, 175, 0, 0, w, 175);
        ctxB.drawImage(baseImg, 55, 175, 70, h - 175, 55, 173, 70, h - 175);
        ctxB.drawImage(baseImg, 130, 175, 85, h - 175, 130, 175, 85, h - 175);
      }

      return { stepA: cA, stepB: cB };
    };

    // Preload Dubu
    const dubuWalk = new Image();
    dubuWalk.src = '/images/trainer_dubu.png';
    dubuWalk.onload = () => {
      const frames = createWalkStepFrames(dubuWalk, 'dubu');
      heroSpritesRef.current.dubu.stepFrames = frames;
      walkStepFramesRef.current = frames;
    };
    if (dubuWalk.complete && dubuWalk.naturalWidth > 0) {
      const frames = createWalkStepFrames(dubuWalk, 'dubu');
      heroSpritesRef.current.dubu.stepFrames = frames;
      walkStepFramesRef.current = frames;
    }
    heroSpritesRef.current.dubu.walkImg = dubuWalk;
    dubuWalkImgRef.current = dubuWalk;

    const dubuSleep = new Image();
    dubuSleep.src = '/images/dubu_cushion_sleep.png';
    heroSpritesRef.current.dubu.sleepImg = dubuSleep;
    dubuSleepImgRef.current = dubuSleep;

    // Preload Guruem
    const guruemWalk = new Image();
    guruemWalk.src = '/images/trainer_guruem.png';
    guruemWalk.onload = () => {
      const frames = createWalkStepFrames(guruemWalk, 'guruem');
      heroSpritesRef.current.guruem.stepFrames = frames;
    };
    if (guruemWalk.complete && guruemWalk.naturalWidth > 0) {
      heroSpritesRef.current.guruem.stepFrames = createWalkStepFrames(guruemWalk, 'guruem');
    }
    heroSpritesRef.current.guruem.walkImg = guruemWalk;

    const guruemSleep = new Image();
    guruemSleep.src = '/images/guruem_cushion_sleep.png';
    heroSpritesRef.current.guruem.sleepImg = guruemSleep;

    // Preload dialog portraits
    const dubuFace = new Image();
    dubuFace.src = '/images/dubu_dialog_face.jpg';
    const guruemFace = new Image();
    guruemFace.src = '/images/guruem_dialog_face.jpg';

    // Preload directional step sprites (down, up, side)
    const stepKeys = ['down', 'up', 'side'];
    stepKeys.forEach(key => {
      const img = new Image();
      img.src = `/images/dubu_step_${key}.jpg`;
      img.onload = () => {
        transparentSpritesRef.current[key] = makeTransparentCanvas(img);
      };
    });

    const mapKeys = ['home', 'garden', 'village', 'forest', 'rainbow_hill'];
    mapKeys.forEach(k => {
      const img = new Image();
      img.src = `/images/map_${k}.jpg`;
      mapImagesRef.current[k] = img;
    });

    // 🧑‍🌾 Preload NPC pixel art character sprites
    const npcMap: Record<string, string> = {
      human_owner: '/images/npc_butler.png',
      npc_grandma: '/images/npc_grandma.png',
      npc_bunny_postman: '/images/npc_bunny.png',
      chick_piyak: '/images/npc_chicks.png',
      npc_cat_nabi: '/images/npc_cat.png',
      npc_dog_choco: '/images/npc_choco.png'
    };
    Object.entries(npcMap).forEach(([id, src]) => {
      const img = new Image();
      img.src = src;
      npcSpritesRef.current[id] = img;
    });
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

  // 🐶 Hero Selection Handler
  const handleSelectHero = useCallback((hero: HeroType) => {
    setSelectedHero(hero);
    selectedHeroRef.current = hero;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dubu_rpg_hero', hero);
    }
    dubuAudio.playBark();
    showToast(`✨ 주인공이 [${HEROES_CONFIG[hero].name}]로 변경되었습니다! (${HEROES_CONFIG[hero].title})`);
  }, [showToast]);

  // 📝 Dynamic Hero Dialog / Text Formatter
  const formatHeroText = useCallback((text: string) => {
    if (selectedHero === 'dubu') return text;
    return text
      .replace(/두부야/g, '구름아')
      .replace(/두부는/g, '구름이는')
      .replace(/두부의/g, '구름이의')
      .replace(/두부/g, '구름이');
  }, [selectedHero]);

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
      heroId: selectedHero,
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
    selectedHero,
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
    if (data.heroId) {
      setSelectedHero(data.heroId);
      selectedHeroRef.current = data.heroId;
      if (typeof window !== 'undefined') {
        localStorage.setItem('dubu_rpg_hero', data.heroId);
      }
    }
    const pos = data.playerPos || { x: 7, y: 6, dir: 'down' };
    setPlayerPos(pos);
    currentGridPosRef.current = { ...pos };
    if (pos.dir === 'left') {
      facingHRef.current = 'left';
    } else if (pos.dir === 'right') {
      facingHRef.current = 'right';
    }
    visualPosRef.current = { x: pos.x, y: pos.y };
    moveAnimRef.current = {
      isMoving: false,
      startX: pos.x,
      startY: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      startTime: 0,
      duration: 170,
      dir: pos.dir,
      stepIndex: 0
    };
    heldDirectionsRef.current = [];
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
    if (dialogState.isOpen || isSaveModalOpen || isSettingsModalOpen) return;
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
      showToast(`${nearbyNpc.name}: "${formatHeroText('두부야 멍멍 소리가 너무 맑고 씩씩하구나! ❤️')}"`);
    }

    setTimeout(() => setIsBarking(false), 500);
  }, [dialogState.isOpen, isSaveModalOpen, isSettingsModalOpen, currentMapId, playerPos, showToast, formatHeroText]);

  // 👃 ACTION 2: 킁킁! 냄새맡기 (Sniff)
  const handleSniff = useCallback(() => {
    if (dialogState.isOpen || isSaveModalOpen || isSettingsModalOpen) return;
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
  }, [dialogState.isOpen, isSaveModalOpen, isSettingsModalOpen, currentMapId, collectedItemIds, showToast]);

  // 🐾 ACTION 3: 꼬리 살랑살랑 흔들기 (Wag)
  const handleWag = useCallback(() => {
    if (dialogState.isOpen || isSaveModalOpen || isSettingsModalOpen) return;
    setIsWagging(true);
    dubuAudio.playWag();
    setWagsCount(w => w + 1);
    setHappiness(h => Math.min(100, h + 5));
    showToast(formatHeroText('🐾 두부가 신나게 꼬리를 살랑살랑 흔듭니다! (행복도 UP!)'));
    setTimeout(() => setIsWagging(false), 800);
  }, [dialogState.isOpen, isSaveModalOpen, isSettingsModalOpen, showToast, formatHeroText]);

  // 🛌 ACTION 4: 발라당 눕기 (Belly Rub / Relax - dubu1.jpg)
  const handleBellyRub = useCallback(() => {
    if (dialogState.isOpen || isSaveModalOpen || isSettingsModalOpen) return;
    setIsRelaxing(prev => !prev);
    dubuAudio.playBellyRub();
    setBellyRubsCount(b => b + 1);
    setHp(100);
    setHappiness(100);
    showToast(formatHeroText('🛌 두부가 등을 대고 발라당 누워 뒹굴거립니다~ 힐링 100%! (체력/행복도 완충)'));
  }, [dialogState.isOpen, isSaveModalOpen, isSettingsModalOpen, showToast, formatHeroText]);

  // 🔍 ACTION 5: 조사 / 상호작용 (Interact)
  const handleInteract = useCallback(() => {
    if (dialogState.isOpen) {
      advanceDialog();
      return;
    }
    if (isSaveModalOpen || isSettingsModalOpen) return;

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

  // 🚶 Smooth Grid Movement (한 칸 부드러운 보간 이동)
  const tryStartMove = useCallback((dir: Direction) => {
    if (
      dialogState.isOpen ||
      isSaveModalOpen ||
      isSettingsModalOpen ||
      isBagModalOpen ||
      isQuestModalOpen ||
      isGuideModalOpen ||
      isEndingsModalOpen
    ) {
      return;
    }
    setIsRelaxing(false);

    // If currently moving between tiles, turn facing direction
    if (moveAnimRef.current.isMoving) {
      moveAnimRef.current.dir = dir;
      if (dir === 'left') {
        facingHRef.current = 'left';
      } else if (dir === 'right') {
        facingHRef.current = 'right';
      }
      return;
    }

    const currentMap = GAME_MAPS[currentMapId] || GAME_MAPS.home;
    let dx = 0;
    let dy = 0;
    if (dir === 'up') dy = -1;
    else if (dir === 'down') dy = 1;
    else if (dir === 'left') dx = -1;
    else if (dir === 'right') dx = 1;

    // Use currentGridPosRef as the authoritative source of position to prevent asynchronous React state lag
    const curX = currentGridPosRef.current.x;
    const curY = currentGridPosRef.current.y;
    const newX = curX + dx;
    const newY = curY + dy;

    // Face the target direction & update horizontal facing ONLY on left/right
    currentGridPosRef.current.dir = dir;
    if (dir === 'left') {
      facingHRef.current = 'left';
    } else if (dir === 'right') {
      facingHRef.current = 'right';
    }

    // Check bounds
    if (newX < 0 || newX >= currentMap.width || newY < 0 || newY >= currentMap.height) {
      setPlayerPos(prev => ({ ...prev, dir }));
      return;
    }

    // Check walls / obstacles / water
    const tile = currentMap.tiles[newY]?.[newX];
    if (tile === 1 || tile === 2) {
      setPlayerPos(prev => ({ ...prev, dir }));
      return;
    }

    // Check NPC collision
    if (currentMap.npcs.some(n => n.x === newX && n.y === newY)) {
      setPlayerPos(prev => ({ ...prev, dir }));
      return;
    }

    // Check Portals
    const portal = currentMap.portals.find(p => p.x === newX && p.y === newY);
    if (portal) {
      dubuAudio.playMapTransition();
      setCurrentMapId(portal.targetMapId);
      currentGridPosRef.current = {
        x: portal.targetX,
        y: portal.targetY,
        dir: portal.targetDir
      };
      setPlayerPos({
        x: portal.targetX,
        y: portal.targetY,
        dir: portal.targetDir
      });
      if (portal.targetDir === 'left') {
        facingHRef.current = 'left';
      } else if (portal.targetDir === 'right') {
        facingHRef.current = 'right';
      }
      visualPosRef.current = { x: portal.targetX, y: portal.targetY };
      moveAnimRef.current = {
        isMoving: false,
        startX: portal.targetX,
        startY: portal.targetY,
        targetX: portal.targetX,
        targetY: portal.targetY,
        startTime: 0,
        duration: 170,
        dir: portal.targetDir,
        stepIndex: 0
      };
      showToast(`🚪 [${portal.label}]에 도착했습니다.`);

      if (portal.targetMapId === 'garden' || portal.targetMapId === 'village') {
        if (!quests.quest_morning.completed) {
          updateQuest('quest_morning', 1, true);
        }
      }

      setTimeout(() => handleSaveGame('auto'), 200);
      return;
    }

    // Advance authoritative grid position immediately
    currentGridPosRef.current = { x: newX, y: newY, dir };
    setPlayerPos({ x: newX, y: newY, dir });

    // Begin smooth tile step!
    const nextStepIndex = moveAnimRef.current.stepIndex + 1;
    moveAnimRef.current = {
      isMoving: true,
      startX: curX,
      startY: curY,
      targetX: newX,
      targetY: newY,
      startTime: performance.now(),
      duration: 170,
      dir,
      stepIndex: nextStepIndex
    };

    if (nextStepIndex % 2 === 0) {
      dubuAudio.playWag();
    }
  }, [
    dialogState.isOpen,
    isSaveModalOpen,
    isSettingsModalOpen,
    isBagModalOpen,
    isQuestModalOpen,
    isGuideModalOpen,
    isEndingsModalOpen,
    currentMapId,
    collectedItemIds,
    showToast,
    quests.quest_morning.completed,
    updateQuest,
    handleSaveGame
  ]);

  // 🔗 Stable handlers ref to prevent keyboard listener teardown during movement
  const handlersRef = useRef({
    gameState,
    dialogState,
    advanceDialog,
    isSaveModalOpen,
    isSettingsModalOpen,
    isBagModalOpen,
    isQuestModalOpen,
    isGuideModalOpen,
    isEndingsModalOpen,
    setIsSaveModalOpen,
    setIsSettingsModalOpen,
    setIsBagModalOpen,
    setIsQuestModalOpen,
    setIsGuideModalOpen,
    setIsEndingsModalOpen,
    tryStartMove,
    handleInteract,
    handleBark,
    handleSniff,
    handleWag,
    handleBellyRub
  });

  handlersRef.current = {
    gameState,
    dialogState,
    advanceDialog,
    isSaveModalOpen,
    isSettingsModalOpen,
    isBagModalOpen,
    isQuestModalOpen,
    isGuideModalOpen,
    isEndingsModalOpen,
    setIsSaveModalOpen,
    setIsSettingsModalOpen,
    setIsBagModalOpen,
    setIsQuestModalOpen,
    setIsGuideModalOpen,
    setIsEndingsModalOpen,
    tryStartMove,
    handleInteract,
    handleBark,
    handleSniff,
    handleWag,
    handleBellyRub
  };

  // Blur active button when playing to prevent button focus scroll issues
  useEffect(() => {
    if (gameState === 'playing') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [gameState]);

  // ⌨️ Keyboard Listeners with Smooth Continuous Walking (Stable listener with Capture)
  useEffect(() => {
    const isScrollKey = (e: KeyboardEvent): boolean => {
      const scrollKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Up', 'Down', 'Left', 'Right',
        ' ', 'Spacebar',
        'PageUp', 'PageDown', 'Home', 'End'
      ];
      const scrollCodes = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Space', 'PageUp', 'PageDown', 'Home', 'End',
        'Numpad8', 'Numpad2', 'Numpad4', 'Numpad6'
      ];
      const scrollKeyCodes = [32, 33, 34, 35, 36, 37, 38, 39, 40];

      return (
        scrollKeys.includes(e.key) ||
        scrollCodes.includes(e.code) ||
        scrollKeyCodes.includes(e.keyCode)
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        gameState: curGameState,
        dialogState: curDialogState,
        advanceDialog: curAdvanceDialog,
        isSaveModalOpen: curIsSave,
        isSettingsModalOpen: curIsSettings,
        isBagModalOpen: curIsBag,
        isQuestModalOpen: curIsQuest,
        isGuideModalOpen: curIsGuide,
        isEndingsModalOpen: curIsEndings,
        setIsSaveModalOpen: curSetIsSave,
        setIsSettingsModalOpen: curSetIsSettings,
        setIsBagModalOpen: curSetIsBag,
        setIsQuestModalOpen: curSetIsQuest,
        setIsGuideModalOpen: curSetIsGuide,
        setIsEndingsModalOpen: curSetIsEndings,
        tryStartMove: curTryStartMove,
        handleInteract: curHandleInteract,
        handleBark: curHandleBark,
        handleSniff: curHandleSniff,
        handleWag: curHandleWag,
        handleBellyRub: curHandleBellyRub
      } = handlersRef.current;

      if (curGameState !== 'playing') return;

      // 🛑 1. Bulletproof Scroll Prevention for arrow & space keys during gameplay
      if (isScrollKey(e)) {
        e.preventDefault();
        e.stopPropagation();
      }

      // 🛑 2. Escape Menu / Modal toggle
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        if (curDialogState.isOpen) {
          curAdvanceDialog();
        } else if (curIsSettings) {
          curSetIsSettings(false);
        } else if (curIsBag) {
          curSetIsBag(false);
        } else if (curIsQuest) {
          curSetIsQuest(false);
        } else if (curIsGuide) {
          curSetIsGuide(false);
        } else if (curIsEndings) {
          curSetIsEndings(false);
        } else {
          curSetIsSave(prev => !prev);
        }
        return;
      }

      // 🛑 3. Advance dialogue
      if (curDialogState.isOpen) {
        if (
          ['Enter', ' ', 'z', 'Z'].includes(e.key) ||
          ['Enter', 'Space', 'KeyZ'].includes(e.code)
        ) {
          e.preventDefault();
          curAdvanceDialog();
        }
        return;
      }

      // 🛑 4. Block movement/actions while any modal is open
      if (
        curIsSave ||
        curIsSettings ||
        curIsBag ||
        curIsQuest ||
        curIsGuide ||
        curIsEndings
      ) {
        return;
      }

      // 🚶 5. Direction Input (Supports Arrow keys, WASD, and Numpad)
      let pressedDir: Direction | null = null;
      if (
        e.key === 'ArrowUp' ||
        e.key === 'Up' ||
        e.code === 'ArrowUp' ||
        e.code === 'Numpad8' ||
        e.key === 'w' ||
        e.key === 'W' ||
        e.code === 'KeyW'
      ) {
        pressedDir = 'up';
      } else if (
        e.key === 'ArrowDown' ||
        e.key === 'Down' ||
        e.code === 'ArrowDown' ||
        e.code === 'Numpad2' ||
        e.key === 's' ||
        e.key === 'S' ||
        e.code === 'KeyS'
      ) {
        pressedDir = 'down';
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'Left' ||
        e.code === 'ArrowLeft' ||
        e.code === 'Numpad4' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.code === 'KeyA'
      ) {
        pressedDir = 'left';
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'Right' ||
        e.code === 'ArrowRight' ||
        e.code === 'Numpad6' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.code === 'KeyD'
      ) {
        pressedDir = 'right';
      }

      if (pressedDir) {
        if (!heldDirectionsRef.current.includes(pressedDir)) {
          heldDirectionsRef.current.push(pressedDir);
        }
        curTryStartMove(pressedDir);
        return;
      }

      // 🐾 6. Action keys
      if (
        e.key === ' ' ||
        e.code === 'Space' ||
        e.key === 'Enter' ||
        e.code === 'Enter' ||
        e.key === 'z' ||
        e.key === 'Z' ||
        e.code === 'KeyZ'
      ) {
        e.preventDefault();
        curHandleInteract();
      } else if (
        e.key === 'c' ||
        e.key === 'C' ||
        e.code === 'KeyC' ||
        e.key === 'ㅊ'
      ) {
        e.preventDefault();
        curHandleBark();
      } else if (
        e.key === 'v' ||
        e.key === 'V' ||
        e.code === 'KeyV' ||
        e.key === 'ㅍ'
      ) {
        e.preventDefault();
        curHandleSniff();
      } else if (
        e.key === 'x' ||
        e.key === 'X' ||
        e.code === 'KeyX' ||
        e.key === 'ㅌ'
      ) {
        e.preventDefault();
        curHandleWag();
      } else if (
        e.key === 'b' ||
        e.key === 'B' ||
        e.code === 'KeyB' ||
        e.key === 'ㅠ'
      ) {
        e.preventDefault();
        curHandleBellyRub();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let releasedDir: Direction | null = null;
      if (
        e.key === 'ArrowUp' ||
        e.key === 'Up' ||
        e.code === 'ArrowUp' ||
        e.code === 'Numpad8' ||
        e.key === 'w' ||
        e.key === 'W' ||
        e.code === 'KeyW'
      ) {
        releasedDir = 'up';
      } else if (
        e.key === 'ArrowDown' ||
        e.key === 'Down' ||
        e.code === 'ArrowDown' ||
        e.code === 'Numpad2' ||
        e.key === 's' ||
        e.key === 'S' ||
        e.code === 'KeyS'
      ) {
        releasedDir = 'down';
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'Left' ||
        e.code === 'ArrowLeft' ||
        e.code === 'Numpad4' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.code === 'KeyA'
      ) {
        releasedDir = 'left';
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'Right' ||
        e.code === 'ArrowRight' ||
        e.code === 'Numpad6' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.code === 'KeyD'
      ) {
        releasedDir = 'right';
      }

      if (releasedDir) {
        heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== releasedDir);
      }
    };

    const handleWindowBlur = () => {
      heldDirectionsRef.current = [];
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

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
      const now = performance.now();

      // 🚶 Smooth Movement Interpolation (한 칸 부드러운 보간 이동)
      let isWalkingNow = false;
      let walkProgress = 0;
      let stepCycle = 0;

      if (moveAnimRef.current.isMoving) {
        const elapsed = now - moveAnimRef.current.startTime;
        walkProgress = Math.min(1, elapsed / moveAnimRef.current.duration);
        stepCycle = moveAnimRef.current.stepIndex;
        isWalkingNow = true;

        // Smoothstep progress for natural, fluid stepping
        const t = walkProgress;
        const smoothT = t * t * (3 - 2 * t);

        const curVisualX =
          moveAnimRef.current.startX +
          (moveAnimRef.current.targetX - moveAnimRef.current.startX) * smoothT;
        const curVisualY =
          moveAnimRef.current.startY +
          (moveAnimRef.current.targetY - moveAnimRef.current.startY) * smoothT;

        visualPosRef.current = { x: curVisualX, y: curVisualY };

        if (walkProgress >= 1) {
          // Reached target tile!
          const targetX = moveAnimRef.current.targetX;
          const targetY = moveAnimRef.current.targetY;
          const currentDir = moveAnimRef.current.dir;

          currentGridPosRef.current = { x: targetX, y: targetY, dir: currentDir };
          setPlayerPos({ x: targetX, y: targetY, dir: currentDir });
          visualPosRef.current = { x: targetX, y: targetY };
          moveAnimRef.current.isMoving = false;

          // Seamless continuous walking if key is still held down
          if (heldDirectionsRef.current.length > 0) {
            const nextDir = heldDirectionsRef.current[heldDirectionsRef.current.length - 1];
            tryStartMove(nextDir);
          }
        }
      } else {
        if (
          heldDirectionsRef.current.length > 0 &&
          !dialogState.isOpen &&
          !isSaveModalOpen &&
          !isSettingsModalOpen &&
          !isBagModalOpen &&
          !isQuestModalOpen &&
          !isGuideModalOpen &&
          !isEndingsModalOpen
        ) {
          const nextDir = heldDirectionsRef.current[heldDirectionsRef.current.length - 1];
          tryStartMove(nextDir);
        }
      }

      // 1. Camera calculation with zoom level (smoothly centers on Dubu's visual position)
      const scale = zoomMode === 'large' ? 1.3 : 1.0;

      const playerPixelX = visualPosRef.current.x * TILE_SIZE + TILE_SIZE / 2;
      const playerPixelY = visualPosRef.current.y * TILE_SIZE + TILE_SIZE / 2;

      const viewW = CANVAS_WIDTH / scale;
      const viewH = CANVAS_HEIGHT / scale;

      let camX = playerPixelX - viewW / 2;
      let camY = playerPixelY - viewH / 2;

      // Clamp camera
      const mapPixelWidth = currentMap.width * TILE_SIZE;
      const mapPixelHeight = currentMap.height * TILE_SIZE;
      camX = Math.max(0, Math.min(camX, Math.max(0, mapPixelWidth - viewW)));
      camY = Math.max(0, Math.min(camY, Math.max(0, mapPixelHeight - viewH)));

      // If map is smaller than viewport, center map
      if (mapPixelWidth < viewW) camX = -(viewW - mapPixelWidth) / 2;
      if (mapPixelHeight < viewH) camY = -(viewH - mapPixelHeight) / 2;

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

      ctx.scale(scale, scale);
      ctx.translate(-camX, -camY);

      // 2. Render Full Map Background (Gorgeous AI Generated Pixel Art Map)
      const mapBgImg = mapImagesRef.current[currentMapId];
      if (mapBgImg && mapBgImg.complete && mapBgImg.naturalWidth > 0) {
        ctx.drawImage(mapBgImg, 0, 0, mapPixelWidth, mapPixelHeight);
      } else {
        // Fallback tile renderer if image still loading
        for (let y = 0; y < currentMap.height; y++) {
          for (let x = 0; x < currentMap.width; x++) {
            const tile = currentMap.tiles[y][x];
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;

            if (currentMap.theme === 'indoor') {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#fef3c7' : '#fde68a';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              if (tile === 1) {
                ctx.fillStyle = '#b45309';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              }
            } else {
              if (tile === 0 || tile === 3) {
                ctx.fillStyle = (x + y) % 2 === 0 ? '#86efac' : '#4ade80';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              } else if (tile === 1) {
                ctx.fillStyle = '#166534';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              } else if (tile === 2) {
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              } else if (tile === 4) {
                ctx.fillStyle = '#fed7aa';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              }
            }
          }
        }
      }

      // 3. Atmospheric Particle & Lighting Effects
      if (currentMapId === 'home') {
        // Warm window sunbeam light ray
        const sunGrad = ctx.createLinearGradient(
          mapPixelWidth * 0.45, 0,
          mapPixelWidth * 0.75, mapPixelHeight
        );
        sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
        sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0.02)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.moveTo(mapPixelWidth * 0.38, 0);
        ctx.lineTo(mapPixelWidth * 0.62, 0);
        ctx.lineTo(mapPixelWidth * 0.9, mapPixelHeight);
        ctx.lineTo(mapPixelWidth * 0.5, mapPixelHeight);
        ctx.closePath();
        ctx.fill();
      } else if (currentMapId === 'garden') {
        // Floating golden pollen & sparkles
        for (let i = 0; i < 12; i++) {
          const sx = (Math.sin(frame * 0.02 + i * 2.3) * 0.5 + 0.5) * mapPixelWidth;
          const sy = (frame * 0.4 + i * 80) % mapPixelHeight;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(253, 224, 71, 0.6)' : 'rgba(244, 63, 94, 0.5)';
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMapId === 'forest') {
        // Enchanted floating forest spores
        for (let i = 0; i < 16; i++) {
          const sx = (Math.sin(frame * 0.015 + i * 1.7) * 0.5 + 0.5) * mapPixelWidth;
          const sy = (frame * 0.3 + i * 60) % mapPixelHeight;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.5)' : 'rgba(74, 222, 128, 0.5)';
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMapId === 'rainbow_hill') {
        // Shimmering starlight particles
        for (let i = 0; i < 20; i++) {
          const sx = (Math.cos(frame * 0.02 + i * 1.9) * 0.5 + 0.5) * mapPixelWidth;
          const sy = (frame * 0.5 + i * 50) % mapPixelHeight;
          ctx.fillStyle = ['#f43f5e', '#eab308', '#38bdf8', '#c084fc'][i % 4];
          ctx.font = '14px sans-serif';
          ctx.fillText('✨', sx, sy);
        }
      }

      // 4. Render Portals with glowing aura & clear visual indicators
      currentMap.portals.forEach(portal => {
        const px = portal.x * TILE_SIZE;
        const py = portal.y * TILE_SIZE;

        if (currentMapId === 'home') {
          // Warm glowing welcome wooden doormat under the painted wooden door
          const aura = Math.sin(frame * 0.08) * 4;
          const grad = ctx.createRadialGradient(
            px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10, 4,
            px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10, TILE_SIZE * 0.85 + aura
          );
          grad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
          grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.2)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10, TILE_SIZE * 0.8, 14, 0, 0, Math.PI * 2);
          ctx.fill();

          // Wooden woven doormat
          ctx.fillStyle = 'rgba(120, 53, 15, 0.9)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(px + 4, py + 22, TILE_SIZE - 8, 22, 6);
          } else {
            ctx.rect(px + 4, py + 22, TILE_SIZE - 8, 22);
          }
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Cute paw print on mat
          ctx.fillStyle = '#fef08a';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🐾', px + TILE_SIZE / 2, py + 38);

          // Exit arrow indicator
          const bounce = Math.sin(frame * 0.1) * 3;
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 11px Pretendard, sans-serif';
          ctx.fillText('▼ 나가기', px + TILE_SIZE / 2, py + 16 + bounce);
        } else {
          // Outdoor portals: glowing aura & portal ring
          const aura = Math.sin(frame * 0.08) * 4;
          ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 + aura, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE - 6, 20, 7, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '22px Pretendard, sans-serif';
          ctx.textAlign = 'center';
          const bounce = Math.sin(frame * 0.1) * 3;
          ctx.fillText('🚪', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 6 + bounce);
        }
      });

      // 5. Render Interactables
      currentMap.interactables.forEach(item => {
        const px = item.x * TILE_SIZE;
        const py = item.y * TILE_SIZE;
        const isCollected = collectedItemIds.includes(item.id);

        if (currentMapId === 'home') {
          // In Dubu's cozy room, items are beautifully pre-rendered on the background map
          // Render elegant sparkles and interactive cues without cluttering
          if (item.type === 'bed') {
            const zzzBob = Math.sin(frame * 0.08) * 3;
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💤', px + TILE_SIZE / 2 + 6, py + TILE_SIZE / 2 - 8 + zzzBob);

            const glow = Math.sin(frame * 0.05) * 2;
            ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
            ctx.beginPath();
            ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10, 22 + glow, 10 + glow * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (item.type === 'water') {
            const glint = Math.sin(frame * 0.07);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.beginPath();
            ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 12, 16, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            if (glint > 0.4) {
              ctx.font = '13px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('💧', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 6);
            }
          } else if (item.type === 'food') {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
            ctx.beginPath();
            ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 12, 16, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            const glint = Math.sin(frame * 0.07 + 1);
            if (glint > 0.4) {
              ctx.font = '13px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('✨', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 6);
            }
          }
        } else {
          // Ground shadow
          ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
          ctx.beginPath();
          ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE - 4, 18, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          if (item.type === 'save_crystal') {
            const glow = Math.sin(frame * 0.08) * 6;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 20 + glow, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🔮', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10);
          } else if (item.type === 'giant_basket') {
            ctx.font = '32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🍠', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10);
            const steamY = py + 2 - (frame * 0.4 % 14);
            ctx.font = '13px sans-serif';
            ctx.fillText('♨️', px + TILE_SIZE / 2, steamY);
          } else if (!isCollected) {
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.icon, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10);
          }
        }

        // Sniff sparkle wave over hidden treasures
        if (sniffSparkles.some(s => s.x === item.x && s.y === item.y)) {
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2.5;
          const radius = (frame * 2.5) % 32;
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = '20px sans-serif';
          ctx.fillText('✨', px + TILE_SIZE / 2, py);
        }
      });

      // 6. Render NPCs with grounded pixel art character sprites
      currentMap.npcs.forEach(npc => {
        const px = npc.x * TILE_SIZE;
        const py = npc.y * TILE_SIZE;

        // Ground shadow firmly under feet
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.beginPath();
        ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE - 3, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle idle breathing motion (firmly grounded, 1.5px vertical bounce)
        const idleBob = Math.sin(frame * 0.05 + npc.x * 1.5) * 1.5;

        // Render pixel art character sprite if loaded
        const spriteImg = npcSpritesRef.current[npc.id];
        if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
          const spriteW = 46;
          const spriteH = 52;
          const drawX = px + (TILE_SIZE - spriteW) / 2;
          const drawY = py + TILE_SIZE - spriteH - 4 + idleBob;
          ctx.drawImage(spriteImg, drawX, drawY, spriteW, spriteH);
        } else {
          // Fallback emoji
          ctx.font = '34px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(npc.sprite, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10 + idleBob);
        }

        // Animated "💬" talk bubble when player is nearby
        const distToPlayer = Math.hypot(npc.x - playerPos.x, npc.y - playerPos.y);
        if (distToPlayer <= 2.2) {
          const bubbleY = py - 26 + Math.sin(frame * 0.1) * 3;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, bubbleY, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💬', px + TILE_SIZE / 2, bubbleY + 4);
        }

        // Stylish Name Badge Pill
        ctx.font = 'bold 11px Pretendard, sans-serif';
        const textWidth = ctx.measureText(npc.name).width;
        const badgeW = Math.max(52, textWidth + 14);
        const badgeH = 17;
        const badgeX = px + (TILE_SIZE - badgeW) / 2;
        const badgeY = py - 13;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, px + TILE_SIZE / 2, badgeY + 12);
      });

      // 7. Render Dubu (Smooth Leg Movement & Directional Sprites)
      const dubuX = visualPosRef.current.x * TILE_SIZE;
      const dubuY = visualPosRef.current.y * TILE_SIZE;
      const curDir = moveAnimRef.current.isMoving ? moveAnimRef.current.dir : playerPos.dir;

      // Natural trotting bounce (pure vertical hop, NO rotational tilt)
      const walkBob = isWalkingNow ? -Math.sin(walkProgress * Math.PI) * 3 : 0;

      // Soft Ground Shadow under Dubu
      const shadowRadiusX = 22 - (isWalkingNow ? Math.abs(walkBob) * 0.7 : 0);
      const shadowRadiusY = 8 - (isWalkingNow ? Math.abs(walkBob) * 0.3 : 0);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
      ctx.beginPath();
      ctx.ellipse(
        dubuX + TILE_SIZE / 2,
        dubuY + TILE_SIZE - 4,
        shadowRadiusX,
        shadowRadiusY,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 🐶 Strict Horizontal Facing (ONLY changes when user presses Left/Right keys!)
      const isLeft = facingHRef.current === 'left';

      // Little dust puff particle behind paws when stepping
      if (isWalkingNow && walkProgress > 0.2 && walkProgress < 0.7) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        const puffOffsetX = isLeft ? 14 : -14;
        const puffOffsetY = curDir === 'down' ? -12 : curDir === 'up' ? 12 : 0;
        ctx.beginPath();
        ctx.arc(
          dubuX + TILE_SIZE / 2 + puffOffsetX,
          dubuY + TILE_SIZE - 2 + puffOffsetY,
          3.5 * (1 - walkProgress),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      const curHero = selectedHeroRef.current;
      const heroSprites = heroSpritesRef.current[curHero];

      if (isRelaxing && heroSprites.sleepImg && heroSprites.sleepImg.complete) {
        // 🛌 Lying down tummy up on cushion - Extra Large 88x88!
        const sleepW = 88;
        const sleepH = 88;
        ctx.drawImage(
          heroSprites.sleepImg,
          dubuX - (sleepW - TILE_SIZE) / 2,
          dubuY - (sleepH - TILE_SIZE) / 2,
          sleepW,
          sleepH
        );

        // Sleeping Zzz and Hearts
        ctx.font = '20px Pretendard';
        ctx.fillStyle = '#ec4899';
        const zOffset = (frame * 0.6) % 35;
        ctx.fillText('💤', dubuX + 44, dubuY - zOffset);
        ctx.fillText('❤️', dubuX + 10, dubuY - zOffset);
      } else {
        // 🐶 Active / Walking Dog (Direction locked to facingHRef, moving legs without flicker)
        ctx.save();
        const drawW = 74;
        const drawH = 74;
        const drawX = dubuX - (drawW - TILE_SIZE) / 2;
        const drawY = dubuY - (drawH - TILE_SIZE) + walkBob;

        // Horizontal flip around center ONLY when facing left
        const centerX = drawX + drawW / 2;
        const centerY = drawY + drawH / 2;
        ctx.translate(centerX, centerY);
        if (isLeft) {
          ctx.scale(-1, 1);
        }
        ctx.translate(-centerX, -centerY);

        // Direction & Leg Step sprite selection
        let spriteToDraw: HTMLCanvasElement | HTMLImageElement | null = heroSprites.walkImg;
        if (isWalkingNow) {
          const stepFrames = heroSprites.stepFrames;
          if (stepFrames) {
            spriteToDraw = stepCycle % 2 === 0 ? stepFrames.stepA : stepFrames.stepB;
          }
        }

        if (spriteToDraw) {
          ctx.drawImage(spriteToDraw, drawX, drawY, drawW, drawH);
        }
        ctx.restore();

        // Barking shockwave effect
        if (isBarking) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(dubuX + TILE_SIZE / 2, dubuY + TILE_SIZE / 2, 38, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = 'bold 18px Pretendard';
          ctx.fillStyle = '#b45309';
          ctx.fillText('멍멍! 🐾', dubuX + TILE_SIZE / 2, dubuY - 14);
        }

        // Sniffing ripple effect
        if (isSniffing) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(dubuX + TILE_SIZE / 2, dubuY + TILE_SIZE / 2, 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = '18px Pretendard';
          ctx.fillText('👃✨', dubuX + TILE_SIZE / 2, dubuY - 14);
        }

        // Wagging tail effect (positioned behind Dubu relative to horizontal facing)
        if (isWagging || isWalkingNow) {
          ctx.font = '18px Pretendard';
          ctx.fillStyle = '#f59e0b';
          const tailOffset = Math.sin(now * 0.02) * 3;
          const tailX = isLeft ? dubuX - 10 : dubuX + 54;
          ctx.fillText('💨🐾', tailX, dubuY + 14 + tailOffset);
        }
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
    collectedItemIds,
    zoomMode,
    tryStartMove
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
            {/* 🐶 CURRENT SELECTED HERO BADGE */}
            <div
              className={`title-hero-preview-badge ${selectedHero}`}
              onClick={() => setIsSettingsModalOpen(true)}
              title="클릭하여 주인공 및 설정 변경"
              style={{ cursor: 'pointer' }}
            >
              <span>주인공:</span>
              <img
                src={HEROES_CONFIG[selectedHero].dialogImg}
                alt={HEROES_CONFIG[selectedHero].name}
                className="title-hero-avatar-mini"
              />
              <strong>{HEROES_CONFIG[selectedHero].name}</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({HEROES_CONFIG[selectedHero].englishName})</span>
              <span style={{ marginLeft: 4, color: '#f59e0b', fontSize: '0.78rem' }}>⚙️ 변경</span>
            </div>

            <div className="dubu-title-buttons">
              <button
                className="dubu-rpg-btn primary"
                onClick={() => {
                  setGameState('playing');
                  dubuAudio.startBgm();
                  dubuAudio.playBark();
                  showToast(formatHeroText(`🐾 ${HEROES_CONFIG[selectedHero].name}의 따뜻한 모험이 시작되었습니다! 방 안을 탐색해보세요.`));
                }}
              >
                🐾 새로운 모험 시작 ({HEROES_CONFIG[selectedHero].name})
              </button>

              <button
                className="dubu-rpg-btn"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
                }}
                onClick={() => setIsSettingsModalOpen(true)}
              >
                ⚙️ 게임 설정 & 주인공 변경 (두부 / 구름이)
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
              💡 <strong>진엔딩 1개 + 가짜엔딩 3개 지원:</strong> 댕댕이 친구들의 선택에 따라 다양한 엔딩을 경험해 보세요!
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
                src={HEROES_CONFIG[selectedHero].dialogImg}
                alt={`${HEROES_CONFIG[selectedHero].name} 프로필`}
                className="hud-avatar"
              />
              <div className="hud-name-box">
                <span className="hud-dog-name">
                  {HEROES_CONFIG[selectedHero].name} <span>({HEROES_CONFIG[selectedHero].englishName})</span>
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
                onClick={() => setIsSettingsModalOpen(true)}
                title="게임 설정 & 주인공 캐릭터 변경"
              >
                ⚙️ 설정
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
                  setZoomMode(z => (z === 'large' ? 'normal' : 'large'));
                  showToast(zoomMode === 'large' ? '🗺️ 전체 넓게 보기 (1.0x)' : `🐶 ${HEROES_CONFIG[selectedHero].name} 크게 보기 (1.3x 확대)`);
                }}
                title="화면 확대/축소"
              >
                {zoomMode === 'large' ? `🔍 ${HEROES_CONFIG[selectedHero].name} 크게` : '🗺️ 넓은 뷰'}
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
                  {dialogState.lines[dialogState.lineIndex]?.speaker === '두부' ||
                  dialogState.lines[dialogState.lineIndex]?.speaker === '구름이' ||
                  dialogState.lines[dialogState.lineIndex]?.speaker === HEROES_CONFIG[selectedHero].name ? (
                    <img
                      src={HEROES_CONFIG[selectedHero].dialogImg}
                      alt={HEROES_CONFIG[selectedHero].name}
                      className="tsukuru-dialog-portrait-img"
                    />
                  ) : NPC_DIALOG_PORTRAITS[dialogState.lines[dialogState.lineIndex]?.speaker || ''] ? (
                    <img
                      src={NPC_DIALOG_PORTRAITS[dialogState.lines[dialogState.lineIndex]?.speaker || '']}
                      alt={dialogState.lines[dialogState.lineIndex]?.speaker}
                      className="tsukuru-dialog-portrait-img npc-pixel-avatar"
                    />
                  ) : (
                    <div className="tsukuru-dialog-emoji-avatar">
                      {dialogState.lines[dialogState.lineIndex]?.speaker === '다람쥐 도토리'
                        ? '🐿️'
                        : '📜'}
                    </div>
                  )}
                </div>
                <div className="tsukuru-dialog-body">
                  <div className="tsukuru-dialog-speaker">
                    [{formatHeroText(dialogState.lines[dialogState.lineIndex]?.speaker || '안내')}]
                  </div>
                  <p className="tsukuru-dialog-text">
                    {formatHeroText(dialogState.displayedText)}
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
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!heldDirectionsRef.current.includes('up')) heldDirectionsRef.current.push('up');
                  tryStartMove('up');
                }}
                onPointerUp={() => {
                  heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== 'up');
                }}
                onPointerLeave={() => {
                  heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== 'up');
                }}
                onClick={() => tryStartMove('up')}
              >
                ▲
              </button>
              <div />
              <button
                className="touch-dpad-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!heldDirectionsRef.current.includes('left')) heldDirectionsRef.current.push('left');
                  tryStartMove('left');
                }}
                onPointerUp={() => {
                  heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== 'left');
                }}
                onPointerLeave={() => {
                  heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== 'left');
                }}
                onClick={() => tryStartMove('left')}
              >
                ◀
              </button>
              <button
                className="touch-dpad-btn"
                onClick={handleInteract}
                title="조사 / 대화"
              >
                ●
              </button>
              <button
                className="touch-dpad-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!heldDirectionsRef.current.includes('right')) heldDirectionsRef.current.push('right');
                  tryStartMove('right');
                }}
                onPointerUp={() => {
                  heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== 'right');
                }}
                onPointerLeave={() => {
                  heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== 'right');
                }}
                onClick={() => tryStartMove('right')}
              >
                ▶
              </button>
              <div />
              <button
                className="touch-dpad-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!heldDirectionsRef.current.includes('down')) heldDirectionsRef.current.push('down');
                  tryStartMove('down');
                }}
                onPointerUp={() => {
                  heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== 'down');
                }}
                onPointerLeave={() => {
                  heldDirectionsRef.current = heldDirectionsRef.current.filter(d => d !== 'down');
                }}
                onClick={() => tryStartMove('down')}
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

      {/* ⚙️ SETTINGS & HERO SELECTION MODAL */}
      {isSettingsModalOpen && (
        <div
          className="dubu-modal-backdrop"
          onClick={() => setIsSettingsModalOpen(false)}
        >
          <div
            className="dubu-save-modal settings-modal"
            style={{ maxWidth: 660 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="save-modal-header">
              <h3 className="save-modal-title">
                ⚙️ <span>게임 설정 & 주인공 캐릭터 선택</span>
              </h3>
              <button
                className="save-modal-close-btn"
                onClick={() => setIsSettingsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="save-modal-body">
              {/* 🐶 SECTION 1: PROTAGONIST SELECTION */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                  🐾 주인공 댕댕이 선택 (언제든 변경 가능)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                  게임을 이끌어갈 사랑스러운 댕댕이를 선택하세요. 게임 내 아바타, 걷기/눕기 모션, 대화창 얼굴이 즉시 바뀝니다!
                </div>

                <div className="hero-selection-grid">
                  {(['dubu', 'guruem'] as HeroType[]).map(heroId => {
                    const hero = HEROES_CONFIG[heroId];
                    const isSelected = selectedHero === heroId;
                    return (
                      <div
                        key={heroId}
                        className={`hero-card ${isSelected ? `selected-${heroId}` : ''}`}
                        onClick={() => handleSelectHero(heroId)}
                      >
                        {isSelected && (
                          <div className="hero-active-badge">
                            ✓ 현재 선택됨
                          </div>
                        )}
                        <div className="hero-avatar-wrap">
                          <img
                            src={hero.dialogImg}
                            alt={hero.name}
                            className="hero-avatar-img"
                          />
                        </div>
                        <div className="hero-card-name">
                          <span>{hero.name}</span>
                        </div>
                        <div className="hero-card-subtitle">
                          {hero.breed} • {hero.title}
                        </div>
                        <p className="hero-card-desc">
                          {hero.desc}
                        </p>
                        <div className="hero-card-quote">
                          {hero.tagline}
                        </div>
                        <button
                          type="button"
                          className={`hero-select-btn ${isSelected ? 'is-active' : 'is-inactive'}`}
                          onClick={e => {
                            e.stopPropagation();
                            handleSelectHero(heroId);
                          }}
                        >
                          {isSelected ? '✓ 플레이 중' : `${hero.name}로 변경하기`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 🎛️ SECTION 2: AUDIO & DISPLAY SETTINGS */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>
                  🎮 게임 환경 설정
                </div>

                {/* BGM & SFX Toggle */}
                <div className="settings-control-row">
                  <div className="settings-control-info">
                    <span className="settings-control-label">🎵 BGM & 효과음 사운드</span>
                    <span className="settings-control-sub">배경음악과 발걸음, 멍멍 소리 등 효과음을 켜거나 끕니다.</span>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle-btn ${!isMuted ? 'active' : ''}`}
                    onClick={() => {
                      const muted = dubuAudio.toggleMute();
                      setIsMuted(muted);
                    }}
                  >
                    {isMuted ? '🔇 음소거 중' : '🔊 사운드 ON'}
                  </button>
                </div>

                {/* Zoom Mode Toggle */}
                <div className="settings-control-row">
                  <div className="settings-control-info">
                    <span className="settings-control-label">🔍 화면 뷰 배율 (주인공 확대)</span>
                    <span className="settings-control-sub">
                      {zoomMode === 'large'
                        ? '1.3배 확대 뷰: 댕댕이의 귀여운 발걸음과 모션을 크게 감상합니다.'
                        : '1.0배 표준 뷰: 전체 맵을 한눈에 넓게 조망합니다.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle-btn ${zoomMode === 'large' ? 'active' : ''}`}
                    onClick={() => {
                      setZoomMode(z => (z === 'large' ? 'normal' : 'large'));
                    }}
                  >
                    {zoomMode === 'large' ? '🔍 1.3x 확대 보기' : '🗺️ 1.0x 표준 뷰'}
                  </button>
                </div>
              </div>

              {/* Bottom Confirm Button */}
              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="dubu-rpg-btn primary"
                  style={{ minWidth: 120 }}
                  onClick={() => setIsSettingsModalOpen(false)}
                >
                  ✓ 설정 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DubuRpgGame;
