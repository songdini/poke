import React, { useState, useEffect, useRef } from 'react';
import { POKEMON_ROSTER } from '../data/pokemonData';
import type { 
  PokemonData, 
  BattlePokemon, 
  PlayerTeam, 
  BattleLog, 
  Move,
  PokemonType
} from '../types/pokemon';
import { getTypeMultiplier, TYPE_COLORS, TYPE_CHART } from '../types/pokemon';
import { 
  Swords, RefreshCw, Trophy, Users, User, Dices, 
  Briefcase, Eye, Save, RotateCcw, Table, 
  BookOpen, Info, Zap, X, Sparkles
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { getSessionToken } from '../socketUrl';
import { fetchRandomTeamFromApi, type GenRange } from '../services/pokeApiService';
import './PokeBattle.css';

interface PokeBattleProps {
  username: string;
  room?: string;
  onLeaveRoom?: () => void;
}

type BattleMode = 'solo' | 'pvp' | 'pvp-random';
type BattlePhase = 'draft' | 'battle' | 'result';

interface PokeBattleAction {
  type: 'move' | 'switch';
  moveIndex?: number;
  switchIndex?: number;
}

interface PokeBattleUpdatePayload {
  type: 'sync' | 'draft-update' | 'battle-start' | 'action-waiting' | 'turn-resolved' | 'restart';
  data: {
    phase?: BattlePhase;
    players?: Array<{ id: string; username: string; isHost: boolean; team: BattlePokemon[] | null }>;
    spectators?: Array<{ id: string; username: string }>;
    spectatorCount?: number;
    readyCount?: number;
    totalPlayers?: number;
    submittedCount?: number;
    currentTurn?: number;
    logs?: BattleLog[];
    p1Action?: { playerId: string; username: string; action: PokeBattleAction };
    p2Action?: { playerId: string; username: string; action: PokeBattleAction };
  };
}

// 🇰🇷 한국어 포켓몬 타입 이름 매핑
const KOREAN_TYPE_NAMES: Record<PokemonType, string> = {
  normal: '노말',
  fire: '불꽃',
  water: '물',
  grass: '풀',
  electric: '전기',
  ice: '얼음',
  fighting: '격투',
  poison: '독',
  ground: '땅',
  flying: '비행',
  psychic: '에스퍼',
  bug: '벌레',
  rock: '바위',
  ghost: '고스트',
  dragon: '드래곤',
  steel: '강철',
  fairy: '페어리',
  dark: '악'
};

const ALL_TYPES: PokemonType[] = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 
  'rock', 'ghost', 'dragon', 'steel', 'fairy', 'dark'
];

// ⚡ 상성 계산 및 초보자용 안내 문구 생성 헬퍼
const getEffectivenessInfo = (moveType: PokemonType, defenderTypes: PokemonType[]) => {
  const mult = getTypeMultiplier(moveType, defenderTypes);
  if (mult >= 2.0) {
    return {
      mult,
      label: `⚡ ${mult}x (매우 강함)`,
      badgeText: `🔥 ${mult}x 효과적!`,
      statusText: '효과가 굉장했다! (2배 이상 대미지)',
      bg: '#15803d',
      color: '#ffffff',
      tagBg: '#dcfce7',
      tagColor: '#15803d',
      tagBorder: '#86efac'
    };
  } else if (mult === 0) {
    return {
      mult,
      label: `🚫 0x (무효)`,
      badgeText: `🚫 0x 무효`,
      statusText: '효과가 없는 것 같다... (0 대미지)',
      bg: '#475569',
      color: '#ffffff',
      tagBg: '#f1f5f9',
      tagColor: '#475569',
      tagBorder: '#cbd5e1'
    };
  } else if (mult <= 0.5) {
    return {
      mult,
      label: `🛡️ ${mult}x (약함)`,
      badgeText: `🛡️ ${mult}x 반감`,
      statusText: '효과가 별로인 듯하다... (절반 이하 대미지)',
      bg: '#c2410c',
      color: '#ffffff',
      tagBg: '#ffedd5',
      tagColor: '#c2410c',
      tagBorder: '#fdba74'
    };
  }
  return {
    mult,
    label: `1.0x (보통)`,
    badgeText: `1.0x 보통`,
    statusText: '보통 대미지 (1.0배)',
    bg: '#f1f5f9',
    color: '#334155',
    tagBg: '#f8fafc',
    tagColor: '#64748b',
    tagBorder: '#e2e8f0'
  };
};

const PokeBattle: React.FC<PokeBattleProps> = ({ username, room = 'default_room', onLeaveRoom }) => {
  const { socket } = useSocket();

  // Mode & Phase & Gen Range Filter & Spectator Role
  const [mode, setMode] = useState<BattleMode>('solo');
  const [phase, setPhase] = useState<BattlePhase>('draft');
  const [genRange, setGenRange] = useState<GenRange>('gen1-2');
  const [isPureStealth, setIsPureStealth] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'player' | 'spectator'>('player');
  const [spectatorCount, setSpectatorCount] = useState<number>(0);
  const [showDebugHud, setShowDebugHud] = useState<boolean>(false);

  // Draft Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDraftReady, setIsDraftReady] = useState<boolean>(false);
  const [readyCount, setReadyCount] = useState<number>(0);
  const [isFetchingApi, setIsFetchingApi] = useState<boolean>(false);

  // Teams
  const [playerTeam, setPlayerTeam] = useState<PlayerTeam | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<PlayerTeam | null>(null);

  // Turn state
  const [turn, setTurn] = useState<number>(1);
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [isProcessingTurn, setIsProcessingTurn] = useState<boolean>(false);
  const [isActionSubmitted, setIsActionSubmitted] = useState<boolean>(false);

  // Animations & Floaters
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);
  const [playerDamageFloater, setPlayerDamageFloater] = useState<{ text: string; id: number } | null>(null);
  const [enemyDamageFloater, setEnemyDamageFloater] = useState<{ text: string; id: number } | null>(null);

  // 💡 초보자 UX & 툴팁 & 가이드 모달 상태
  const [hoveredMove, setHoveredMove] = useState<Move | null>(null);
  const [hoveredDraftPokemon, setHoveredDraftPokemon] = useState<PokemonData | null>(null);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<'rules' | 'types' | 'categories' | 'modes'>('rules');
  const [showTypeChartModal, setShowTypeChartModal] = useState<boolean>(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<PokemonType | 'all'>('all');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const playerTeamRef = useRef<PlayerTeam | null>(playerTeam);
  const enemyTeamRef = useRef<PlayerTeam | null>(enemyTeam);

  useEffect(() => {
    playerTeamRef.current = playerTeam;
  }, [playerTeam]);

  useEffect(() => {
    enemyTeamRef.current = enemyTeam;
  }, [enemyTeam]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // F4 Key for Emergency Pure Stealth Toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        setIsPureStealth(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add Log Entry
  const addLog = (text: string, type: BattleLog['type'] = 'system') => {
    const newLog: BattleLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      turn,
      text,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Convert PokemonData to BattlePokemon
  const createBattlePokemon = (data: PokemonData): BattlePokemon => ({
    ...data,
    currentHp: data.stats.hp,
    maxHp: data.stats.hp,
    status: 'normal',
    moves: data.moves.map(m => ({ ...m }))
  });

  // Socket.io PvP Room Listener
  useEffect(() => {
    if (!socket || (mode !== 'pvp' && mode !== 'pvp-random')) return;

    const joinRoom = () => {
      socket.emit('join', {
        username,
        room,
        gameType: 'pokebattle',
        sessionToken: getSessionToken('pokebattle')
      });
      socket.emit('pokebattle-join', { room });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleRoleUpdate = ({ role }: { role: 'player' | 'spectator' }) => {
      setUserRole(role);
      if (role === 'spectator') {
        addLog(`👀 관전자(Spectator)로 1v1 배틀 방에 입장하였습니다.`, 'system');
      }
    };

    const handlePokeBattleUpdate = (update: PokeBattleUpdatePayload) => {
      console.log(`[SOCKET_EVENT_RECV] ${username}:`, update.type, update.data);
      if (update.data.spectatorCount !== undefined) {
        setSpectatorCount(update.data.spectatorCount);
      }

      switch (update.type) {
        case 'sync':
        case 'draft-update':
          if (update.data.readyCount !== undefined) setReadyCount(update.data.readyCount);
          break;
        case 'battle-start':
          if (update.data.players && update.data.players.length === 2) {
            const p1 = update.data.players[0];
            const p2 = update.data.players[1];

            const cleanUser = username.trim().toLowerCase();
            const me = update.data.players.find(p => p.username.trim().toLowerCase() === cleanUser);
            const opponent = update.data.players.find(p => p.username.trim().toLowerCase() !== cleanUser);

            if (me && me.team && opponent && opponent.team) {
              setPlayerTeam({
                trainerName: me.username,
                pokemonList: me.team.map(createBattlePokemon),
                activeIndex: 0
              });
              setEnemyTeam({
                trainerName: opponent.username,
                pokemonList: opponent.team.map(createBattlePokemon),
                activeIndex: 0
              });
            } else if (p1 && p1.team && p2 && p2.team) {
              setPlayerTeam({
                trainerName: p1.username,
                pokemonList: p1.team.map(createBattlePokemon),
                activeIndex: 0
              });
              setEnemyTeam({
                trainerName: p2.username,
                pokemonList: p2.team.map(createBattlePokemon),
                activeIndex: 0
              });
            }

            setTurn(1);
            setLogs([]);
            setPhase('battle');
            addLog(`⚔️ 1v1 배틀 데이터 스트림 연결 완료 (${p1.username} vs ${p2.username})`, 'system');
          }
          break;
        case 'turn-resolved':
          if (update.data.p1Action && update.data.p2Action) {
            handleResolvePvpTurn(update.data.p1Action, update.data.p2Action);
          }
          break;
        case 'restart':
          setPhase('draft');
          setIsDraftReady(false);
          setIsActionSubmitted(false);
          setPlayerTeam(null);
          setEnemyTeam(null);
          break;
      }
    };

    socket.on('connect', joinRoom);
    socket.on('pokebattle-role', handleRoleUpdate);
    socket.on('pokebattle-update', handlePokeBattleUpdate);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('pokebattle-role', handleRoleUpdate);
      socket.off('pokebattle-update', handlePokeBattleUpdate);
    };
  }, [socket, mode, username, room]);

  // Handle Draft Selection
  const handleToggleDraft = (id: number) => {
    if (isDraftReady) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      if (selectedIds.length >= 3) return;
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Randomize Draft Team
  const handleRandomizeDraft = () => {
    if (isDraftReady) return;
    const shuffled = [...POKEMON_ROSTER].sort(() => 0.5 - Math.random());
    const randomPicked = shuffled.slice(0, 3).map(p => p.id);
    setSelectedIds(randomPicked);
  };

  // Start Battle / Submit Draft
  const handleStartBattle = () => {
    if (selectedIds.length !== 3) return;

    const playerPicked = selectedIds.map(id => POKEMON_ROSTER.find(p => p.id === id)!);
    const playerMonList = playerPicked.map(createBattlePokemon);

    if (mode === 'solo') {
      const availableForAi = POKEMON_ROSTER.filter(p => !selectedIds.includes(p.id));
      const shuffledAi = [...availableForAi].sort(() => 0.5 - Math.random());
      const enemyPicked = (shuffledAi.length >= 3 ? shuffledAi : [...POKEMON_ROSTER].sort(() => 0.5 - Math.random())).slice(0, 3);
      const enemyMonList = enemyPicked.map(createBattlePokemon);

      setPlayerTeam({
        trainerName: username || 'User_Session',
        pokemonList: playerMonList,
        activeIndex: 0
      });

      setEnemyTeam({
        trainerName: 'AI_Model_Ref',
        pokemonList: enemyMonList,
        activeIndex: 0
      });

      setTurn(1);
      setLogs([]);
      setPhase('battle');
      addLog(`⚔️ Solo 배틀 시뮬레이션 시작 (${playerMonList[0].koreanName} vs ${enemyMonList[0].koreanName})`, 'system');
    } else {
      setIsDraftReady(true);
      socket?.emit('pokebattle-draft-submit', { room, pokemonList: playerMonList });
      addLog(`🎯 데이터 모델 제출 완료. 상대방 승인 대기 중...`, 'system');
    }
  };

  // Dynamic PokeAPI Random PvP Draft Submit
  const handleStartRandomPvPBattle = async () => {
    setIsFetchingApi(true);
    try {
      const genLabel = genRange === 'gen1-2' ? '1~2세대(251종)' : genRange === 'gen1-5' ? '1~5세대(649종)' : '1~9세대(1025종)';
      addLog(`🌐 PokeAPI ${genLabel} 모델 인덱스 로딩 중...`, 'system');
      const randomTeamData = await fetchRandomTeamFromApi(3, genRange);
      const randomMonList = randomTeamData.map(createBattlePokemon);

      setIsDraftReady(true);
      socket?.emit('pokebattle-draft-submit', { room, pokemonList: randomMonList });
      addLog(`🎲 무작위 모델 인덱스([${randomMonList.map(p => p.koreanName).join(', ')}]) 생성 및 제출 완료.`, 'system');
    } catch (err) {
      console.error('Failed to fetch random team from PokeAPI', err);
      addLog(`⚠️ API 로딩 실패. 로컬 프리셋 매트릭스로 전환합니다.`, 'system');
      handleRandomizeDraft();
      handleStartBattle();
    } finally {
      setIsFetchingApi(false);
    }
  };

  // Damage Calculation Helper
  const calculateDamage = (attacker: BattlePokemon, defender: BattlePokemon, move: Move) => {
    const level = 50;
    const movePower = (move?.power && move.power > 0) ? move.power : 75;
    const isSpecial = move?.category === 'special';
    const attackStat = Math.max(1, isSpecial ? (attacker.stats.spAtk || 80) : (attacker.stats.attack || 80));
    const defenseStat = Math.max(1, isSpecial ? (defender.stats.spDef || 80) : (defender.stats.defense || 80));
    const stab = attacker.types?.includes(move?.type) ? 1.5 : 1.0;
    const typeMult = getTypeMultiplier(move?.type || 'normal', defender.types || ['normal']);
    const randomVal = 0.85 + Math.random() * 0.15;
    const isCritical = Math.random() < 0.0625;
    const critMult = isCritical ? 1.5 : 1.0;

    const baseDamage = (((2 * level / 5 + 2) * movePower * (attackStat / defenseStat)) / 50 + 2);
    const calculated = Math.floor(baseDamage * stab * typeMult * critMult * randomVal);
    const totalDamage = isNaN(calculated) || calculated <= 0 ? 25 : Math.max(18, calculated);

    return { damage: totalDamage, typeMult, isCritical };
  };

  // Execute Turn Action (Solo vs AI)
  const handleExecuteTurn = (move: Move, moveIndexOverride?: number) => {
    const currentPTeam = playerTeamRef.current;
    const currentETeam = enemyTeamRef.current;
    if (!currentPTeam || !currentETeam || isProcessingTurn) return;

    if (mode === 'pvp' || mode === 'pvp-random') {
      const activeMon = currentPTeam.pokemonList[currentPTeam.activeIndex];
      if (!activeMon || activeMon.status === 'fainted') return;

      const activeMoves = activeMon.moves;
      const foundIdx = activeMoves.findIndex(m => m.id === move.id);
      const moveIndex = moveIndexOverride !== undefined ? moveIndexOverride : (foundIdx >= 0 ? foundIdx : 0);
      setIsActionSubmitted(true);
      socket?.emit('pokebattle-action-submit', {
        room,
        action: { type: 'move', moveIndex }
      });

      setTimeout(() => {
        setIsActionSubmitted(false);
      }, 8000);
      return;
    }

    setIsProcessingTurn(true);

    const updatedPlayerList = currentPTeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));
    const updatedEnemyList = currentETeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));

    let playerActiveIdx = currentPTeam.activeIndex;
    let enemyActiveIdx = currentETeam.activeIndex;

    const pActive = updatedPlayerList[playerActiveIdx];
    const eActive = updatedEnemyList[enemyActiveIdx];

    const playerFirst = pActive.stats.speed >= eActive.stats.speed;

    const executePlayerHit = () => {
      const { damage, typeMult, isCritical } = calculateDamage(pActive, eActive, move);
      eActive.currentHp = Math.max(0, eActive.currentHp - damage);

      setEnemyShake(true);
      setTimeout(() => setEnemyShake(false), 400);

      let logText = isPureStealth 
        ? `[MACRO_EXECUTE] ${pActive.koreanName} -> ${move.name} (ΔHP: -${damage})`
        : `${pActive.koreanName}의 ${move.name}! (${damage} 대미지)`;

      if (isCritical) logText += ` 💥 급소 타격! (Critical)`;
      if (typeMult >= 2.0) logText += ` ⚡ 효과가 굉장했다! (${typeMult}배)`;
      else if (typeMult <= 0.5) logText += ` 🛡️ 효과가 별로인 듯하다... (${typeMult}배)`;

      addLog(logText, typeMult >= 2.0 ? 'super-effective' : 'attack');
      setEnemyDamageFloater({ text: `-${damage}`, id: Date.now() });

      setEnemyTeam(prev => prev ? {
        ...prev,
        pokemonList: updatedEnemyList.map(p => ({ ...p, moves: [...p.moves] })),
        activeIndex: enemyActiveIdx
      } : null);

      if (eActive.currentHp <= 0) {
        eActive.status = 'fainted';
        addLog(`☠️ 상대의 ${eActive.koreanName} 쓰러짐!`, 'faint');
        const nextEnemyIdx = updatedEnemyList.findIndex(p => p.status !== 'fainted');
        if (nextEnemyIdx === -1) {
          setPhase('result');
          addLog(`🏆 ${username} 트레이너 승리!`, 'system');
          setIsProcessingTurn(false);
          return false;
        } else {
          enemyActiveIdx = nextEnemyIdx;
          addLog(`🔄 상대가 ${updatedEnemyList[nextEnemyIdx].koreanName}(으)로 교체 출전`, 'switch');
          setEnemyTeam(prev => prev ? {
            ...prev,
            pokemonList: updatedEnemyList.map(p => ({ ...p, moves: [...p.moves] })),
            activeIndex: enemyActiveIdx
          } : null);
        }
      }
      return true;
    };

    const executeEnemyHit = () => {
      const enemyMove = eActive.moves[Math.floor(Math.random() * eActive.moves.length)];
      const { damage, typeMult, isCritical } = calculateDamage(eActive, pActive, enemyMove);

      pActive.currentHp = Math.max(0, pActive.currentHp - damage);
      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 400);

      let logText = isPureStealth
        ? `[REF_EXECUTE] ${eActive.koreanName} -> ${enemyMove.name} (ΔHP: -${damage})`
        : `상대 ${eActive.koreanName}의 ${enemyMove.name}! (${damage} 대미지)`;

      if (isCritical) logText += ` 💥 급소 타격! (Critical)`;
      if (typeMult >= 2.0) logText += ` ⚡ 효과가 굉장했다! (${typeMult}배)`;

      addLog(logText, 'damage');
      setPlayerDamageFloater({ text: `-${damage}`, id: Date.now() });

      setPlayerTeam(prev => prev ? {
        ...prev,
        pokemonList: updatedPlayerList.map(p => ({ ...p, moves: [...p.moves] })),
        activeIndex: playerActiveIdx
      } : null);

      if (pActive.currentHp <= 0) {
        pActive.status = 'fainted';
        addLog(`☠️ 내 ${pActive.koreanName} 쓰러짐!`, 'faint');
        const nextPlayerIdx = updatedPlayerList.findIndex(p => p.status !== 'fainted');
        if (nextPlayerIdx === -1) {
          setPhase('result');
          addLog(`💀 ${username} 트레이너 패배...`, 'system');
          setIsProcessingTurn(false);
          return false;
        } else {
          playerActiveIdx = nextPlayerIdx;
          addLog(`🔄 ${updatedPlayerList[nextPlayerIdx].koreanName}(이)가 교체 출전`, 'switch');
          setPlayerTeam(prev => prev ? {
            ...prev,
            pokemonList: updatedPlayerList.map(p => ({ ...p, moves: [...p.moves] })),
            activeIndex: playerActiveIdx
          } : null);
        }
      }
      return true;
    };

    if (playerFirst) {
      if (executePlayerHit() && eActive.status !== 'fainted') {
        setTimeout(() => {
          if (executeEnemyHit()) {
            setTurn(prev => prev + 1);
            setIsProcessingTurn(false);
          }
        }, 800);
      } else {
        setTurn(prev => prev + 1);
        setIsProcessingTurn(false);
      }
    } else {
      if (executeEnemyHit() && pActive.status !== 'fainted') {
        setTimeout(() => {
          if (executePlayerHit()) {
            setTurn(prev => prev + 1);
            setIsProcessingTurn(false);
          }
        }, 800);
      } else {
        setTurn(prev => prev + 1);
        setIsProcessingTurn(false);
      }
    }
  };

  // Resolve PvP Simultaneous Turn
  const handleResolvePvpTurn = (
    p1Data: { playerId: string; username: string; action: PokeBattleAction },
    p2Data: { playerId: string; username: string; action: PokeBattleAction }
  ) => {
    const currentPTeam = playerTeamRef.current;
    const currentETeam = enemyTeamRef.current;
    if (!currentPTeam || !currentETeam) return;

    setIsActionSubmitted(false);
    setIsProcessingTurn(true);
    setTurn(prev => prev + 1);

    const cleanUser = username.trim().toLowerCase();
    const myData = p1Data.username.trim().toLowerCase() === cleanUser ? p1Data : p2Data;
    const oppData = p1Data.username.trim().toLowerCase() === cleanUser ? p2Data : p1Data;

    const updatedPlayerList = currentPTeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));
    const updatedEnemyList = currentETeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));

    let playerActiveIdx = currentPTeam.activeIndex;
    let enemyActiveIdx = currentETeam.activeIndex;

    if (myData.action.type === 'switch' && myData.action.switchIndex !== undefined) {
      if (updatedPlayerList[myData.action.switchIndex]?.status !== 'fainted') {
        playerActiveIdx = myData.action.switchIndex;
        addLog(`🔄 ${username} 유저가 ${updatedPlayerList[playerActiveIdx].koreanName}(으)로 교체함`, 'switch');
      }
    }
    if (oppData.action.type === 'switch' && oppData.action.switchIndex !== undefined) {
      if (updatedEnemyList[oppData.action.switchIndex]?.status !== 'fainted') {
        enemyActiveIdx = oppData.action.switchIndex;
        addLog(`🔄 상대 ${oppData.username} 유저가 ${updatedEnemyList[enemyActiveIdx].koreanName}(으)로 교체함`, 'switch');
      }
    }

    setPlayerTeam(prev => prev ? {
      ...prev,
      pokemonList: updatedPlayerList.map(p => ({ ...p, moves: [...p.moves] })),
      activeIndex: playerActiveIdx
    } : null);
    setEnemyTeam(prev => prev ? {
      ...prev,
      pokemonList: updatedEnemyList.map(p => ({ ...p, moves: [...p.moves] })),
      activeIndex: enemyActiveIdx
    } : null);

    const pActive = updatedPlayerList[playerActiveIdx];
    const eActive = updatedEnemyList[enemyActiveIdx];

    const doPlayerHit = () => {
      if (myData.action.type !== 'move' || myData.action.moveIndex === undefined) return true;
      const myMove = pActive.moves[myData.action.moveIndex] || pActive.moves[0];
      const { damage, typeMult, isCritical } = calculateDamage(pActive, eActive, myMove);

      eActive.currentHp = Math.max(0, eActive.currentHp - damage);
      setEnemyShake(true);
      setTimeout(() => setEnemyShake(false), 400);

      let logText = isPureStealth 
        ? `[MACRO_EXECUTE] ${pActive.koreanName} -> ${myMove.name} (ΔHP: -${damage})`
        : `${pActive.koreanName}의 ${myMove.name}! (${damage} 대미지)`;

      if (isCritical) logText += ` 💥 급소 타격! (Critical)`;
      if (typeMult >= 2.0) logText += ` ⚡ 효과가 굉장했다! (${typeMult}배)`;
      else if (typeMult <= 0.5) logText += ` 🛡️ 효과가 별로인 듯하다... (${typeMult}배)`;

      addLog(logText, typeMult >= 2.0 ? 'super-effective' : 'attack');
      setEnemyDamageFloater({ text: `-${damage}`, id: Date.now() });

      setEnemyTeam(prev => prev ? {
        ...prev,
        pokemonList: updatedEnemyList.map(p => ({ ...p, moves: [...p.moves] })),
        activeIndex: enemyActiveIdx
      } : null);

      if (eActive.currentHp <= 0) {
        eActive.status = 'fainted';
        addLog(`☠️ 상대의 ${eActive.koreanName} 쓰러짐!`, 'faint');
        const nextEnemyIdx = updatedEnemyList.findIndex(p => p.status !== 'fainted');
        if (nextEnemyIdx === -1) {
          setPhase('result');
          addLog(`🏆 ${username} 트레이너 승리!`, 'system');
          setIsProcessingTurn(false);
          return false;
        } else {
          enemyActiveIdx = nextEnemyIdx;
          addLog(`🔄 상대가 ${updatedEnemyList[nextEnemyIdx].koreanName}(으)로 교체 출전`, 'switch');
          setEnemyTeam(prev => prev ? {
            ...prev,
            pokemonList: updatedEnemyList.map(p => ({ ...p, moves: [...p.moves] })),
            activeIndex: enemyActiveIdx
          } : null);
        }
      }
      return true;
    };

    const doOpponentHit = () => {
      if (oppData.action.type !== 'move' || oppData.action.moveIndex === undefined) return true;
      const oppMove = eActive.moves[oppData.action.moveIndex] || eActive.moves[0];
      const { damage, typeMult, isCritical } = calculateDamage(eActive, pActive, oppMove);

      pActive.currentHp = Math.max(0, pActive.currentHp - damage);
      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 400);

      let logText = isPureStealth
        ? `[REF_EXECUTE] ${eActive.koreanName} -> ${oppMove.name} (ΔHP: -${damage})`
        : `상대 ${eActive.koreanName}의 ${oppMove.name}! (${damage} 대미지)`;

      if (isCritical) logText += ` 💥 급소 타격! (Critical)`;
      if (typeMult >= 2.0) logText += ` ⚡ 효과가 굉장했다! (${typeMult}배)`;

      addLog(logText, 'damage');
      setPlayerDamageFloater({ text: `-${damage}`, id: Date.now() });

      setPlayerTeam(prev => prev ? {
        ...prev,
        pokemonList: updatedPlayerList.map(p => ({ ...p, moves: [...p.moves] })),
        activeIndex: playerActiveIdx
      } : null);

      if (pActive.currentHp <= 0) {
        pActive.status = 'fainted';
        addLog(`☠️ 내 ${pActive.koreanName} 쓰러짐!`, 'faint');
        const nextPlayerIdx = updatedPlayerList.findIndex(p => p.status !== 'fainted');
        if (nextPlayerIdx === -1) {
          setPhase('result');
          addLog(`💀 ${username} 트레이너 패배...`, 'system');
          setIsProcessingTurn(false);
          return false;
        } else {
          playerActiveIdx = nextPlayerIdx;
          addLog(`🔄 ${updatedPlayerList[nextPlayerIdx].koreanName}(이)가 교체 출전`, 'switch');
          setPlayerTeam(prev => prev ? {
            ...prev,
            pokemonList: updatedPlayerList.map(p => ({ ...p, moves: [...p.moves] })),
            activeIndex: playerActiveIdx
          } : null);
        }
      }
      return true;
    };

    const playerFirst = pActive.stats.speed >= eActive.stats.speed;

    if (playerFirst) {
      if (doPlayerHit() && eActive.status !== 'fainted') {
        setTimeout(() => {
          doOpponentHit();
          setIsProcessingTurn(false);
        }, 800);
      } else {
        setIsProcessingTurn(false);
      }
    } else {
      if (doOpponentHit() && pActive.status !== 'fainted') {
        setTimeout(() => {
          doPlayerHit();
          setIsProcessingTurn(false);
        }, 800);
      } else {
        setIsProcessingTurn(false);
      }
    }
  };

  // Switch Active Pokemon
  const handleSwitchPokemon = (targetIndex: number) => {
    const currentPTeam = playerTeamRef.current;
    if (!currentPTeam || isProcessingTurn || isActionSubmitted) return;
    if (targetIndex === currentPTeam.activeIndex) return;
    if (currentPTeam.pokemonList[targetIndex].status === 'fainted') return;

    if (mode === 'pvp' || mode === 'pvp-random') {
      setIsActionSubmitted(true);
      socket?.emit('pokebattle-action-submit', {
        room,
        action: { type: 'switch', switchIndex: targetIndex }
      });
      return;
    }

    setIsProcessingTurn(true);
    const oldMon = currentPTeam.pokemonList[currentPTeam.activeIndex];
    const newMon = currentPTeam.pokemonList[targetIndex];
    currentPTeam.activeIndex = targetIndex;

    addLog(`🔄 ${oldMon.koreanName} -> ${newMon.koreanName} 포켓몬 교체`, 'switch');

    setTimeout(() => {
      const eActive = enemyTeam!.pokemonList[enemyTeam!.activeIndex];
      const enemyMove = eActive.moves[Math.floor(Math.random() * eActive.moves.length)];
      const { damage } = calculateDamage(eActive, newMon, enemyMove);

      newMon.currentHp = Math.max(0, newMon.currentHp - damage);
      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 400);

      addLog(`🤖 상대 ${eActive.koreanName}의 틈새 공격 ${enemyMove.name}! (${damage} 대미지)`, 'damage');
      setPlayerDamageFloater({ text: `-${damage}`, id: Date.now() });

      if (newMon.currentHp <= 0) {
        newMon.status = 'fainted';
        addLog(`☠️ ${newMon.koreanName} 쓰러짐!`, 'faint');
      }

      setTurn(prev => prev + 1);
      setIsProcessingTurn(false);
    }, 600);
  };

  // Reset to Draft
  const handleResetDraft = () => {
    setSelectedIds([]);
    setIsDraftReady(false);
    setIsActionSubmitted(false);
    setPlayerTeam(null);
    setEnemyTeam(null);
    setPhase('draft');
    if (mode === 'pvp' || mode === 'pvp-random') {
      socket?.emit('pokebattle-restart', { room });
    }
  };

  const pActiveMon = playerTeam?.pokemonList[playerTeam.activeIndex];
  const eActiveMon = enemyTeam?.pokemonList[enemyTeam.activeIndex];

  // Sparkline Progress Bar Renderer
  const renderSparklineText = (hp: number, maxHp: number) => {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const totalBars = 10;
    const filledBars = Math.round(ratio * totalBars);
    const emptyBars = totalBars - filledBars;
    const barStr = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    const colorClass = ratio > 0.5 ? 'high' : ratio > 0.2 ? 'medium' : 'low';
    return (
      <span className={`excel-sparkline-text ${colorClass}`}>
        [{barStr}] {Math.round(ratio * 100)}% ({hp}/{maxHp})
      </span>
    );
  };

  return (
    <div className="poke-battle-container excel-stealth-theme">
      {/* 🟢 Authentic Excel Title Bar */}
      <div className="excel-title-bar">
        <div className="title-text">
          <Table size={14} />
          <span>Q3_Quarterly_Financial_Portfolio_Analysis_2026.xlsx - Excel</span>
        </div>
        <div className="quick-access-icons">
          <Save size={13} />
          <RotateCcw size={13} />
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Alt+F4: Hide</span>
        </div>
      </div>

      {/* 📊 Excel Ribbon Menu Bar */}
      <div className="excel-ribbon-menu">
        <div className="excel-ribbon-tab">File</div>
        <div className="excel-ribbon-tab">Home</div>
        <div className="excel-ribbon-tab">Insert</div>
        <div className="excel-ribbon-tab">Page Layout</div>
        <div className="excel-ribbon-tab active">Formulas</div>
        <div className="excel-ribbon-tab" onClick={() => setShowGuideModal(true)}>📖 사용법 가이드</div>
        <div className="excel-ribbon-tab" onClick={() => setShowTypeChartModal(true)}>📊 타입 상성표</div>
      </div>

      {/* 📊 Excel Formula Bar */}
      <div className="poke-formula-bar">
        <div className="excel-name-box">Cell B4</div>
        <div className="excel-fx-icon">fx</div>
        <div className="poke-formula-input">
          {phase === 'draft' && `=SUMIFS(PROJECTION_MODEL, RANGE, "${mode.toUpperCase()}")`}
          {phase === 'battle' && `=POKE_BATTLE_SIMULATOR("${pActiveMon?.koreanName}", "${eActiveMon?.koreanName}", TURN=${turn})`}
          {phase === 'result' && `=VLOOKUP("WINNER", FINANCIAL_AUDIT_LOG, 3, FALSE)`}
        </div>
      </div>

      {/* 🐞 REAL-TIME LIVE DEBUG HUD CONSOLE */}
      {showDebugHud && (phase === 'battle' || phase === 'result') && (
        <div style={{ background: '#0f172a', color: '#38bdf8', padding: '8px 12px', fontSize: '0.76rem', fontFamily: 'Consolas, monospace', borderBottom: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: 'bold', color: '#f43f5e', display: 'flex', justifyContent: 'space-between' }}>
            <span>🐞 [LIVE BATTLE REAL-TIME DEBUG HUD CONSOLE]</span>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => setShowDebugHud(false)}>✕ 닫기</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>👤 내 포켓몬 ({pActiveMon?.koreanName}): <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{pActiveMon?.currentHp} / {pActiveMon?.maxHp} HP</span> (상태: {pActiveMon?.status})</div>
            <div>🤖 상대 포켓몬 ({eActiveMon?.koreanName}): <span style={{ color: '#fb7185', fontWeight: 'bold' }}>{eActiveMon?.currentHp} / {eActiveMon?.maxHp} HP</span> (상태: {eActiveMon?.status})</div>
          </div>
        </div>
      )}

      {/* 📋 Ribbon Control Header */}
      <div className="poke-battle-header">
        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button 
            className={`excel-btn ${mode === 'solo' ? 'primary' : ''}`}
            onClick={() => setMode('solo')}
            disabled={phase !== 'draft'}
          >
            <User size={13} /> 🤖 솔로 (vs AI)
          </button>
          <button 
            className={`excel-btn ${mode === 'pvp' ? 'primary' : ''}`}
            onClick={() => setMode('pvp')}
            disabled={phase !== 'draft'}
          >
            <Users size={13} /> ⚔️ 대전 (선택)
          </button>
          <button 
            className={`excel-btn ${mode === 'pvp-random' ? 'primary' : ''}`}
            onClick={() => setMode('pvp-random')}
            disabled={phase !== 'draft'}
          >
            <Dices size={13} /> 🎲 대전 (랜덤)
          </button>
        </div>

        {/* 📖초보자 가이드 & 상성표 & 위장 버튼 */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="excel-btn beginner-guide-btn"
            onClick={() => setShowGuideModal(true)}
          >
            <BookOpen size={13} /> 📖 초보자 가이드 & 사용법
          </button>

          <button
            className="excel-btn type-chart-btn"
            onClick={() => setShowTypeChartModal(true)}
          >
            <Table size={13} /> 📊 타입 상성표
          </button>

          <button
            className={`excel-btn ${isPureStealth ? 'primary' : ''}`}
            onClick={() => setIsPureStealth(prev => !prev)}
            title="Alt+F4 단축키로 텍스트 모드 전환 가능"
          >
            {isPureStealth ? <Briefcase size={13} /> : <Eye size={13} />}
            {isPureStealth ? '💼 텍스트 위장 (ON)' : '👁️ 비주얼 보기'}
          </button>

          {spectatorCount > 0 && (
            <span className="excel-cell-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
              👀 관전자: {spectatorCount}명
            </span>
          )}
          <span className="excel-cell-badge">USER: {username}</span>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close">
              🚪 나가기
            </button>
          )}
        </div>
      </div>

      {/* 🎯 DRAFT PHASE */}
      {phase === 'draft' && (
        <div className="poke-draft-container">
          {mode === 'pvp-random' ? (
            <div className="excel-phase-card" style={{ textAlign: 'center', padding: '24px' }}>
              <Dices size={36} style={{ color: '#107c41', marginBottom: 6 }} />
              <h3>🎲 PokeAPI 무작위 3v3 랜덤 대전 모드</h3>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '12px 0' }}>
                <button
                  className={`excel-btn ${genRange === 'gen1-2' ? 'primary' : ''}`}
                  onClick={() => setGenRange('gen1-2')}
                  disabled={isDraftReady || isFetchingApi}
                >
                  🔴 1~2세대 (251종)
                </button>
                <button
                  className={`excel-btn ${genRange === 'gen1-5' ? 'primary' : ''}`}
                  onClick={() => setGenRange('gen1-5')}
                  disabled={isDraftReady || isFetchingApi}
                >
                  🟢 1~5세대 (649종)
                </button>
                <button
                  className={`excel-btn ${genRange === 'all' ? 'primary' : ''}`}
                  onClick={() => setGenRange('all')}
                  disabled={isDraftReady || isFetchingApi}
                >
                  🌐 1~9세대 (1025종)
                </button>
              </div>

              <p className="phase-description" style={{ maxWidth: '580px', margin: '6px auto 14px auto', fontSize: '0.82rem' }}>
                {genRange === 'gen1-2'
                  ? '선택됨: 1~2세대 (관동/성도 지방) 무작위 포켓몬 3마리 추출'
                  : genRange === 'gen1-5'
                  ? '선택됨: 1~5세대 무작위 포켓몬 3마리 추출'
                  : '선택됨: 1~9세대 전 세대 무작위 포켓몬 3마리 추출'}
              </p>

              <button
                className="excel-btn primary"
                onClick={handleStartRandomPvPBattle}
                disabled={isDraftReady || isFetchingApi}
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
              >
                {isFetchingApi ? (
                  '🌐 PokeAPI 데이터 생성 중...'
                ) : isDraftReady ? (
                  '✓ 무작위 엔트리 제출 완료 (상대방 대기 중...)'
                ) : (
                  `🎲 PokeAPI 3v3 엔트리 뽑기 및 시작`
                )}
              </button>
              <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#64748b' }}>
                준비된 대전 플레이어: {readyCount} / 2명
              </div>
            </div>
          ) : (
            <>
              {/* 초보자를 위한 안내 팁 바 */}
              <div className="beginner-banner-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: '#2563eb' }} />
                  <div>
                    <strong>1단계:</strong> 원하는 포켓몬 3마리를 클릭하여 엔트리를 구성하세요! ({selectedIds.length}/3)
                    <span style={{ marginLeft: 8, color: '#475569', fontSize: '0.78rem' }}>
                      💡 포켓몬 카드에 마우스를 올리면 능력치와 기술 정보를 확인할 수 있습니다.
                    </span>
                  </div>
                </div>
              </div>

              <div className="excel-card-header">
                <h3>🎯 3v3 배틀 엔트리 선택 ({selectedIds.length} / 3)</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="excel-btn" onClick={handleRandomizeDraft} disabled={isDraftReady}>
                    <RefreshCw size={13} /> 🎲 무작위 추첨
                  </button>
                  <button 
                    className="excel-btn primary" 
                    onClick={handleStartBattle}
                    disabled={selectedIds.length !== 3 || isDraftReady}
                  >
                    <Swords size={13} /> {isDraftReady ? '✓ 엔트리 제출됨' : mode === 'solo' ? '⚔️ 배틀 시작' : '⚔️ 대전 엔트리 제출'}
                  </button>
                </div>
              </div>

              {/* Draft Grid + Hover Preview Panel */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="draft-grid" style={{ flex: 1, minWidth: '300px' }}>
                  {POKEMON_ROSTER.map((mon) => {
                    const isSelected = selectedIds.includes(mon.id);
                    const selectIndex = selectedIds.indexOf(mon.id) + 1;
                    return (
                      <div 
                        key={mon.id}
                        className={`draft-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleDraft(mon.id)}
                        onMouseEnter={() => setHoveredDraftPokemon(mon)}
                        onMouseLeave={() => setHoveredDraftPokemon(null)}
                      >
                        {isSelected && <div className="draft-card-badge">#{selectIndex}</div>}
                        {!isPureStealth && <img src={mon.sprites.front} alt={mon.koreanName} className="draft-sprite" />}
                        <div className="draft-name">{isPureStealth ? `[ASSET_${mon.id}] ${mon.koreanName}` : mon.koreanName}</div>
                        <div className="type-badge-container">
                          {mon.types.map(t => (
                            <span 
                              key={t} 
                              className="type-badge"
                              style={{ background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].text }}
                            >
                              {KOREAN_TYPE_NAMES[t] || t}
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, fontFamily: 'Consolas, monospace' }}>
                          HP:{mon.stats.hp} ATK:{mon.stats.attack} SPD:{mon.stats.speed}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 🔍 Draft Pokemon Hover Preview Box */}
                <div className="draft-preview-panel">
                  {hoveredDraftPokemon ? (
                    <div className="draft-preview-card">
                      <div className="preview-header">
                        {!isPureStealth && (
                          <img src={hoveredDraftPokemon.sprites.front} alt={hoveredDraftPokemon.koreanName} className="preview-sprite" />
                        )}
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a' }}>{hoveredDraftPokemon.koreanName}</h4>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            {hoveredDraftPokemon.types.map(t => (
                              <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].text }}>
                                {KOREAN_TYPE_NAMES[t]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="preview-stats-grid">
                        <div><span>HP:</span> <strong>{hoveredDraftPokemon.stats.hp}</strong></div>
                        <div><span>공격:</span> <strong>{hoveredDraftPokemon.stats.attack}</strong></div>
                        <div><span>방어:</span> <strong>{hoveredDraftPokemon.stats.defense}</strong></div>
                        <div><span>특공:</span> <strong>{hoveredDraftPokemon.stats.spAtk}</strong></div>
                        <div><span>특방:</span> <strong>{hoveredDraftPokemon.stats.spDef}</strong></div>
                        <div><span>스피드:</span> <strong>{hoveredDraftPokemon.stats.speed}</strong></div>
                      </div>

                      <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                          📜 보유 기술 (4가지):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {hoveredDraftPokemon.moves.map(m => (
                            <div key={m.id} className="preview-move-item">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.76rem' }}>{m.name}</span>
                                <span className="type-badge" style={{ background: TYPE_COLORS[m.type].bg, color: TYPE_COLORS[m.type].text, fontSize: '0.6rem' }}>
                                  {KOREAN_TYPE_NAMES[m.type]}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                위력: {m.power || '—'} | 명중: {m.accuracy}% | {m.category === 'physical' ? '물리' : m.category === 'special' ? '특수' : '변화'}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '1px', fontStyle: 'italic' }}>
                                {m.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="draft-preview-placeholder">
                      <Info size={24} style={{ color: '#94a3b8', marginBottom: '6px' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>포켓몬 정보 미리보기</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px', textAlign: 'center' }}>
                        포켓몬 카드에 마우스를 올리면 상세 능력치와 4가지 기술 설명이 여기에 표시됩니다.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ⚔️ BATTLE ARENA */}
      {(phase === 'battle' || phase === 'result') && pActiveMon && eActiveMon && (
        <div className="poke-battle-arena">
          {/* EXCEL WORKSHEET GRID TABLE */}
          <table className="excel-grid-table">
            <thead>
              <tr>
                <th className="excel-row-header">#</th>
                <th style={{ width: '120px' }}>Column A (ID)</th>
                <th style={{ width: '180px' }}>Column B (Model_Name)</th>
                <th style={{ width: '140px' }}>Column C (Type_Class)</th>
                <th style={{ width: '120px' }}>Column D (Level)</th>
                <th>Column E (Sparkline_Bar / Status)</th>
                {!isPureStealth && <th style={{ width: '100px' }}>Graphic_Ref</th>}
              </tr>
            </thead>
            <tbody>
              {/* Row 4: Opponent Pokemon */}
              <tr>
                <td className="excel-row-header">4</td>
                <td>TARGET_01</td>
                <td style={{ fontWeight: 700, color: '#d13438' }}>
                  🤖 {enemyTeam?.trainerName}: {eActiveMon.koreanName}
                </td>
                <td>
                  <div className="type-badge-container">
                    {eActiveMon.types.map(t => (
                      <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].text }}>
                        {KOREAN_TYPE_NAMES[t] || t}
                      </span>
                    ))}
                  </div>
                </td>
                <td>Lv. 50</td>
                <td>
                  {renderSparklineText(eActiveMon.currentHp, eActiveMon.maxHp)}
                  {enemyDamageFloater && (
                    <span style={{ color: '#d13438', fontWeight: 'bold', marginLeft: 8 }}>
                      {enemyDamageFloater.text}
                    </span>
                  )}
                </td>
                {!isPureStealth && (
                  <td style={{ textAlign: 'center' }}>
                    <img 
                      src={eActiveMon.sprites.showdownFront || eActiveMon.sprites.front} 
                      alt={eActiveMon.koreanName}
                      className={enemyShake ? 'shake' : ''}
                      style={{ height: 42, objectFit: 'contain' }}
                    />
                  </td>
                )}
              </tr>

              {/* Row 8: Player Pokemon */}
              <tr className="excel-cell-active">
                <td className="excel-row-header">8</td>
                <td>ACTIVE_01</td>
                <td style={{ fontWeight: 700, color: '#107c41' }}>
                  👤 {playerTeam?.trainerName}: {pActiveMon.koreanName}
                </td>
                <td>
                  <div className="type-badge-container">
                    {pActiveMon.types.map(t => (
                      <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].text }}>
                        {KOREAN_TYPE_NAMES[t] || t}
                      </span>
                    ))}
                  </div>
                </td>
                <td>Lv. 50</td>
                <td>
                  {renderSparklineText(pActiveMon.currentHp, pActiveMon.maxHp)}
                  {playerDamageFloater && (
                    <span style={{ color: '#d13438', fontWeight: 'bold', marginLeft: 8 }}>
                      {playerDamageFloater.text}
                    </span>
                  )}
                </td>
                {!isPureStealth && (
                  <td style={{ textAlign: 'center' }}>
                    <img 
                      src={pActiveMon.sprites.showdownBack || pActiveMon.sprites.back || pActiveMon.sprites.front} 
                      alt={pActiveMon.koreanName}
                      className={playerShake ? 'shake' : ''}
                      style={{ height: 46, objectFit: 'contain' }}
                    />
                  </td>
                )}
              </tr>
            </tbody>
          </table>

          {/* ⚡ Beginner Turn & Speed Status Banner */}
          {phase === 'battle' && (
            <div className="battle-speed-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Zap size={15} style={{ color: pActiveMon.stats.speed >= eActiveMon.stats.speed ? '#16a34a' : '#ea580c' }} />
                {pActiveMon.stats.speed >= eActiveMon.stats.speed ? (
                  <span style={{ color: '#15803d', fontWeight: 600 }}>
                    ⚡ [스피드 우위] 내 {pActiveMon.koreanName}(SPD {pActiveMon.stats.speed})이(가) 상대 {eActiveMon.koreanName}(SPD {eActiveMon.stats.speed})보다 빨라 먼저 공격합니다!
                  </span>
                ) : (
                  <span style={{ color: '#c2410c', fontWeight: 600 }}>
                    🐢 [스피드 열세] 상대 {eActiveMon.koreanName}(SPD {eActiveMon.stats.speed})이(가) 내 {pActiveMon.koreanName}(SPD {pActiveMon.stats.speed})보다 빨라 먼저 공격합니다!
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={13} style={{ color: '#2563eb' }} />
                기술 버튼 위에 마우스를 올리면 <strong>[기술 상세 설명]</strong>과 <strong>[상성 대미지 힌트]</strong>를 볼 수 있습니다.
              </div>
            </div>
          )}

          {/* 🎮 EXCEL CONTROLS PANEL */}
          {phase === 'battle' && (
            <div className="battle-controls-panel">
              {userRole === 'spectator' ? (
                <div style={{ flex: 1, textAlign: 'center', padding: '16px', fontSize: '0.88rem', fontWeight: 600, color: '#0078d4', fontFamily: 'Consolas, monospace', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  👀 [SPECTATOR_MODE: LIVE_STREAMING_BATTLE ({playerTeam?.trainerName} vs {enemyTeam?.trainerName})]
                </div>
              ) : isActionSubmitted ? (
                <div style={{ flex: 1, textAlign: 'center', padding: '16px', fontSize: '0.88rem', fontWeight: 600, color: '#107c41', fontFamily: 'Consolas, monospace' }}>
                  ⌛ [STATUS: WAITING_FOR_OPPONENT_TRANSACTION_APPROVAL...]
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Moves Grid (4 Action Buttons) */}
                    <div className="moves-grid">
                      {pActiveMon.moves.map((move, moveIdx) => {
                        const typeColor = TYPE_COLORS[move.type];
                        const eff = getEffectivenessInfo(move.type, eActiveMon.types);
                        const isHovered = hoveredMove?.id === move.id;

                        return (
                          <button
                            key={`${move.id}_${moveIdx}`}
                            className={`move-btn ${isHovered ? 'hovered' : ''}`}
                            onClick={() => handleExecuteTurn(move, moveIdx)}
                            onMouseEnter={() => setHoveredMove(move)}
                            onMouseLeave={() => setHoveredMove(null)}
                            onFocus={() => setHoveredMove(move)}
                            onBlur={() => setHoveredMove(null)}
                            disabled={isProcessingTurn || pActiveMon.status === 'fainted'}
                            style={{ borderColor: typeColor.border }}
                          >
                            <div className="move-title-row">
                              <span className="move-name-text">
                                {isPureStealth ? `=MACRO_DERIVATIVE("${move.name}")` : move.name}
                                <Info size={12} className="move-info-icon" />
                              </span>
                              <span className="type-badge" style={{ background: typeColor.bg, color: typeColor.text }}>
                                {KOREAN_TYPE_NAMES[move.type] || move.type}
                              </span>
                            </div>

                            <div className="move-info-row">
                              <span>위력: {move.power || '—'}</span>
                              <span>명중: {move.accuracy}%</span>
                              <span>PP: {move.pp}/{move.maxPp}</span>
                            </div>

                            {/* 🔥 초보자를 위한 상성 배지 직접 표기 */}
                            <div className="move-effectiveness-row">
                              <span
                                className="move-effectiveness-tag"
                                style={{ background: eff.tagBg, color: eff.tagColor, border: `1px solid ${eff.tagBorder}` }}
                              >
                                {eff.badgeText}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                {move.category === 'physical' ? '🗡️물리' : move.category === 'special' ? '🔮특수' : '🛡️변화'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bench Switch Panel */}
                    <div className="switch-panel">
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#605e5c', marginBottom: 4 }}>
                        🔄 교체할 포켓몬 (Macro_Switch)
                      </div>
                      {playerTeam?.pokemonList.map((mon, idx) => (
                        <button
                          key={mon.id}
                          className="switch-pokemon-btn"
                          onClick={() => handleSwitchPokemon(idx)}
                          disabled={isProcessingTurn || idx === playerTeam.activeIndex || mon.status === 'fainted'}
                        >
                          {!isPureStealth && <img src={mon.sprites.front} alt={mon.koreanName} style={{ width: 24, height: 24 }} />}
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{isPureStealth ? `[MODEL_${mon.id}] ${mon.koreanName}` : mon.koreanName}</div>
                            <div style={{ fontSize: '0.68rem', color: '#605e5c' }}>{mon.currentHp}/{mon.maxHp} HP</div>
                          </div>
                          {idx === playerTeam.activeIndex && <span style={{ fontSize: '0.68rem', color: '#107c41', fontWeight: 700 }}>[출전중]</span>}
                          {mon.status === 'fainted' && <span style={{ fontSize: '0.68rem', color: '#d13438', fontWeight: 700 }}>[쓰러짐]</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 💬 Move Hover Tooltip Popover Overlay */}
                  {hoveredMove && (
                    <div className="move-tooltip-box">
                      <div className="tooltip-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Zap size={14} style={{ color: '#eab308' }} />
                          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a' }}>{hoveredMove.name}</h4>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span className="type-badge" style={{ background: TYPE_COLORS[hoveredMove.type].bg, color: TYPE_COLORS[hoveredMove.type].text }}>
                            {KOREAN_TYPE_NAMES[hoveredMove.type]}
                          </span>
                          <span className="category-badge">
                            {hoveredMove.category === 'physical' ? '🗡️ 물리 공격' : hoveredMove.category === 'special' ? '🔮 특수 공격' : '🛡️ 변화 기술'}
                          </span>
                        </div>
                      </div>

                      <div className="tooltip-stats-row">
                        <div>위력: <strong>{hoveredMove.power || '—'}</strong></div>
                        <div>명중률: <strong>{hoveredMove.accuracy}%</strong></div>
                        <div>PP: <strong>{hoveredMove.pp}/{hoveredMove.maxPp}</strong></div>
                      </div>

                      {/* 상대 포켓몬에 대한 상성 안내 */}
                      {eActiveMon && (
                        <div className="tooltip-target-info">
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '2px' }}>
                            🎯 상대 <strong>{eActiveMon.koreanName}</strong> ({eActiveMon.types.map(t => KOREAN_TYPE_NAMES[t]).join('/')} 타입) 대미지 상성:
                          </div>
                          {(() => {
                            const eff = getEffectivenessInfo(hoveredMove.type, eActiveMon.types);
                            return (
                              <div className="tooltip-eff-badge" style={{ background: eff.tagBg, color: eff.tagColor, border: `1px solid ${eff.tagBorder}` }}>
                                {eff.statusText}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="tooltip-description">
                        💬 {hoveredMove.description || '기술 설명 정보가 없습니다.'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🏆 RESULT SCREEN */}
          {phase === 'result' && (
            <div className="excel-phase-card" style={{ textAlign: 'center', padding: '16px' }}>
              <Trophy size={32} style={{ color: '#d97706', marginBottom: 4 }} />
              <h3>📊 포켓몬 배틀 종료</h3>
              <p className="phase-description" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#107c41' }}>
                배틀이 모두 완료되었습니다. 아래 [다시 도전하기] 버튼을 눌러 새 라운드를 시작하세요!
              </p>
              <button className="excel-btn primary" onClick={handleResetDraft} style={{ padding: '6px 20px', marginTop: 8 }}>
                🔄 새 엔트리 선택 & 다시 도전
              </button>
            </div>
          )}

          {/* 📊 BATTLE AUDIT LOG TABLE */}
          <div className="poke-log-container">
            <div style={{ padding: '3px 8px', background: '#f3f2f1', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #d4d4d4', color: '#605e5c' }}>
              📋 AUDIT LOG DATA STREAM (Range: A15:G50)
            </div>
            {logs.map((log) => (
              <div key={log.id} className={`poke-log-row ${log.type || ''}`}>
                <span style={{ color: '#8a8886' }}>[{log.timestamp}]</span>
                <span style={{ color: '#605e5c', fontWeight: 600 }}>[Turn {log.turn}]</span>
                <span>{log.text}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* 📑 Bottom Excel Sheet Tabs */}
      <div className="excel-sheet-tab-bar">
        <div className="excel-sheet-tab active">Sheet5_PokeBattle</div>
        <div className="excel-sheet-tab" onClick={() => setShowGuideModal(true)}>📖 Beginner_Guide</div>
        <div className="excel-sheet-tab" onClick={() => setShowTypeChartModal(true)}>📊 Type_Matrix</div>
        <div style={{ color: '#8a8886', padding: '0 6px', cursor: 'pointer' }}>+</div>
        <div className="excel-status-ready">STATUS: READY</div>
      </div>

      {/* 📖 초보자 가이드 & 사용법 모달 */}
      {showGuideModal && (
        <div className="poke-modal-backdrop" onClick={() => setShowGuideModal(false)}>
          <div className="poke-modal-card" onClick={e => e.stopPropagation()}>
            <div className="poke-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} style={{ color: '#2563eb' }} />
                <h3>📖 포켓몬 배틀 초보자 가이드 & 사용법</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowGuideModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="poke-modal-tabs">
              <button className={`modal-tab ${guideTab === 'rules' ? 'active' : ''}`} onClick={() => setGuideTab('rules')}>
                🎮 기본 배틀 규칙
              </button>
              <button className={`modal-tab ${guideTab === 'types' ? 'active' : ''}`} onClick={() => setGuideTab('types')}>
                ⚡ 타입 상성 보는 법
              </button>
              <button className={`modal-tab ${guideTab === 'categories' ? 'active' : ''}`} onClick={() => setGuideTab('categories')}>
                🗡️ 물리 vs 특수 공격
              </button>
              <button className={`modal-tab ${guideTab === 'modes' ? 'active' : ''}`} onClick={() => setGuideTab('modes')}>
                ⚔️ 배틀 모드 종류
              </button>
            </div>

            <div className="poke-modal-body">
              {guideTab === 'rules' && (
                <div className="guide-content-box">
                  <h4>🎮 기본 3대3 배틀 규칙</h4>
                  <ul>
                    <li><strong>1단계 (엔트리 선택):</strong> 드래프트 화면에서 3마리의 포켓몬을 클릭해 내 엔트리로 등록합니다.</li>
                    <li><strong>2단계 (스피드 순서):</strong> 두 포켓몬의 스피드(SPD) 능력치를 비교하여 <strong>스피드가 높은 포켓몬이 매 턴 먼저 기술을 발사</strong>합니다.</li>
                    <li><strong>3단계 (기술 사용 & 교체):</strong> 매 턴 4가지 기술 중 하나를 사용하거나, 위기 상황에는 벤치의 다른 포켓몬으로 교체할 수 있습니다.</li>
                    <li><strong>승리 조건:</strong> 상대방 포켓몬 3마리의 HP를 모두 0으로 만들어 쓰러뜨리면 승리합니다!</li>
                  </ul>
                </div>
              )}

              {guideTab === 'types' && (
                <div className="guide-content-box">
                  <h4>⚡ 타입 상성 배율 원리</h4>
                  <p>공격하는 기술의 타입과 받는 포켓몬의 타입에 따라 대미지가 배율로 달라집니다:</p>
                  <div className="type-guide-cards">
                    <div className="type-guide-card super">
                      <div className="badge">🔥 2.0배 (효과가 굉장했다!)</div>
                      <div>상성 우위! 대미지가 2배 이상 크게 들어갑니다. (예: 물 ➔ 불)</div>
                    </div>
                    <div className="type-guide-card not-very">
                      <div className="badge">🛡️ 0.5배 (효과가 별로다...)</div>
                      <div>상성 반감! 대미지가 절반 이하로 감소합니다. (예: 불 ➔ 물)</div>
                    </div>
                    <div className="type-guide-card no-effect">
                      <div className="badge">🚫 0배 (효과가 없다)</div>
                      <div>대미지가 0이 됩니다. (예: 전기 ➔ 땅)</div>
                    </div>
                  </div>
                  <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#15803d' }}>
                    💡 <strong>꿀팁:</strong> 배틀 중 기술 버튼 옆의 <code>🔥 2.0x 효과적!</code> 표지를 확인하면 상성을 외우지 않고도 손쉽게 공격할 수 있습니다!
                  </p>
                </div>
              )}

              {guideTab === 'categories' && (
                <div className="guide-content-box">
                  <h4>🗡️ 물리 vs 🔮 특수 vs 🛡️ 변화 기술</h4>
                  <div className="category-guide-item">
                    <h5>🗡️ 물리 공격 (Physical)</h5>
                    <p>내 포켓몬의 <strong>공격(ATK)</strong>과 상대 포켓몬의 <strong>방어(DEF)</strong> 능력치를 비교하여 대미지를 산출합니다. (예: 인파이트, 지진, 폭포오르기)</p>
                  </div>
                  <div className="category-guide-item">
                    <h5>🔮 특수 공격 (Special)</h5>
                    <p>내 포켓몬의 <strong>특수공격(Sp.ATK)</strong>과 상대 포켓몬의 <strong>특수방어(Sp.DEF)</strong> 능력치를 비교합니다. (예: 10만볼트, 화염방사, 냉동빔)</p>
                  </div>
                  <div className="category-guide-item">
                    <h5>🛡️ 변화 기술 (Status)</h5>
                    <p>직접적인 대미지 대신 능력치 상승/하락 또는 상태이상을 부여합니다.</p>
                  </div>
                </div>
              )}

              {guideTab === 'modes' && (
                <div className="guide-content-box">
                  <h4>⚔️ 3가지 배틀 모드</h4>
                  <ul>
                    <li><strong>🤖 솔로 (vs AI):</strong> AI 컴퓨터를 상대로 배틀 연습을 수행할 수 있는 혼자 하기 모드입니다.</li>
                    <li><strong>⚔️ 대전 (선택):</strong> 로컬 수록 포켓몬 중에서 내가 원하는 3마리를 픽하여 다른 사람과 대결하는 1v1 대전입니다.</li>
                    <li><strong>🎲 대전 (랜덤):</strong> PokeAPI 공식 서버 데이터를 연동하여 1~9세대전체 1,000여 종 중 3마리를 무작위 뽑아 대결하는 프리미엄 랜덤 대전입니다.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="poke-modal-footer">
              <button className="excel-btn primary" onClick={() => setShowGuideModal(false)}>
                확인 & 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 타입 상성표 매트릭스 모달 */}
      {showTypeChartModal && (
        <div className="poke-modal-backdrop" onClick={() => setShowTypeChartModal(false)}>
          <div className="poke-modal-card wide" onClick={e => e.stopPropagation()}>
            <div className="poke-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Table size={20} style={{ color: '#16a34a' }} />
                <h3>📊 18종 포켓몬 타입 상성표 (Type Advantage Matrix)</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowTypeChartModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Type Filter selector */}
            <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#475569' }}>공격 타입 필터:</span>
              <button
                className={`excel-btn ${selectedTypeFilter === 'all' ? 'primary' : ''}`}
                onClick={() => setSelectedTypeFilter('all')}
                style={{ fontSize: '0.7rem', padding: '2px 8px' }}
              >
                전체 (18종)
              </button>
              {ALL_TYPES.map(t => (
                <button
                  key={t}
                  className="type-badge"
                  onClick={() => setSelectedTypeFilter(t)}
                  style={{
                    background: TYPE_COLORS[t].bg,
                    color: TYPE_COLORS[t].text,
                    border: selectedTypeFilter === t ? '2px solid #000' : 'none',
                    cursor: 'pointer',
                    fontSize: '0.65rem'
                  }}
                >
                  {KOREAN_TYPE_NAMES[t]}
                </button>
              ))}
            </div>

            <div className="poke-modal-body" style={{ maxHeight: '420px', overflow: 'auto', padding: '12px' }}>
              <table className="type-matrix-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '80px' }}>공격 ➔ 방어</th>
                    {ALL_TYPES.map(t => (
                      <th key={t} style={{ background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].text, fontSize: '0.65rem', minWidth: '40px' }}>
                        {KOREAN_TYPE_NAMES[t]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_TYPES.filter(at => selectedTypeFilter === 'all' || selectedTypeFilter === at).map(attacker => (
                    <tr key={attacker}>
                      <td style={{ background: TYPE_COLORS[attacker].bg, color: TYPE_COLORS[attacker].text, fontWeight: 'bold', fontSize: '0.72rem' }}>
                        {KOREAN_TYPE_NAMES[attacker]}
                      </td>
                      {ALL_TYPES.map(defender => {
                        const mult = TYPE_CHART[attacker]?.[defender] ?? 1.0;
                        let cellBg = '#ffffff';
                        let cellColor = '#64748b';
                        if (mult >= 2.0) { cellBg = '#dcfce7'; cellColor = '#15803d'; }
                        else if (mult === 0) { cellBg = '#475569'; cellColor = '#ffffff'; }
                        else if (mult <= 0.5) { cellBg = '#ffedd5'; cellColor = '#c2410c'; }

                        return (
                          <td 
                            key={defender}
                            style={{ 
                              background: cellBg, 
                              color: cellColor, 
                              fontWeight: mult !== 1.0 ? 'bold' : 'normal',
                              textAlign: 'center',
                              fontSize: '0.72rem'
                            }}
                          >
                            {mult === 1 ? '1' : mult}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '10px', fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <span style={{ color: '#15803d', fontWeight: 'bold' }}>2 = 효과 굉장함 (2배)</span>
                <span style={{ color: '#c2410c', fontWeight: 'bold' }}>0.5 = 효과 반감 (0.5배)</span>
                <span style={{ color: '#475569', fontWeight: 'bold' }}>0 = 대미지 무효 (0배)</span>
              </div>
            </div>

            <div className="poke-modal-footer">
              <button className="excel-btn primary" onClick={() => setShowTypeChartModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokeBattle;
