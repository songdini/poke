import React, { useState, useEffect, useRef } from 'react';
import { POKEMON_ROSTER } from '../data/pokemonData';
import type { 
  PokemonData, 
  BattlePokemon, 
  PlayerTeam, 
  BattleLog, 
  Move 
} from '../types/pokemon';
import { getTypeMultiplier, TYPE_COLORS } from '../types/pokemon';
import { Swords, RefreshCw, Trophy, Users, User, Dices, Briefcase, Eye, Save, RotateCcw, Table } from 'lucide-react';
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

const PokeBattle: React.FC<PokeBattleProps> = ({ username, room = 'default_room', onLeaveRoom }) => {
  const { socket } = useSocket();

  // Mode & Phase & Gen Range Filter & Spectator Role
  const [mode, setMode] = useState<BattleMode>('solo');
  const [phase, setPhase] = useState<BattlePhase>('draft');
  const [genRange, setGenRange] = useState<GenRange>('gen1-2');
  const [isPureStealth, setIsPureStealth] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'player' | 'spectator'>('player');
  const [spectatorCount, setSpectatorCount] = useState<number>(0);

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

  // Animations
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);
  const [playerDamageFloater, setPlayerDamageFloater] = useState<{ text: string; id: number } | null>(null);
  const [enemyDamageFloater, setEnemyDamageFloater] = useState<{ text: string; id: number } | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

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

            const me = update.data.players.find(p => p.username === username);
            const opponent = update.data.players.find(p => p.username !== username);

            if (me && me.team && opponent && opponent.team) {
              // Active Battler Perspective
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
              // Spectator Perspective
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
    const isSpecial = move.category === 'special';
    const attackStat = isSpecial ? attacker.stats.spAtk : attacker.stats.attack;
    const defenseStat = isSpecial ? defender.stats.spDef : defender.stats.defense;
    const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;
    const typeMult = getTypeMultiplier(move.type, defender.types);
    const randomVal = 0.85 + Math.random() * 0.15;
    const isCritical = Math.random() < 0.0625;
    const critMult = isCritical ? 1.5 : 1.0;

    const baseDamage = (((2 * level / 5 + 2) * move.power * (attackStat / defenseStat)) / 50 + 2);
    const totalDamage = Math.max(1, Math.floor(baseDamage * stab * typeMult * critMult * randomVal));

    return { damage: totalDamage, typeMult, isCritical };
  };

  // Execute Turn Action (Solo vs AI)
  const handleExecuteTurn = (move: Move, moveIndexOverride?: number) => {
    if (!playerTeam || !enemyTeam || isProcessingTurn) return;

    if (mode === 'pvp' || mode === 'pvp-random') {
      const activeMoves = playerTeam.pokemonList[playerTeam.activeIndex].moves;
      const foundIdx = activeMoves.findIndex(m => m.id === move.id);
      const moveIndex = moveIndexOverride !== undefined ? moveIndexOverride : (foundIdx >= 0 ? foundIdx : 0);
      setIsActionSubmitted(true);
      socket?.emit('pokebattle-action-submit', {
        room,
        action: { type: 'move', moveIndex }
      });

      // Safety timeout: unlock UI if turn takes longer than 8 seconds
      setTimeout(() => {
        setIsActionSubmitted(false);
      }, 8000);
      return;
    }

    setIsProcessingTurn(true);

    const updatedPlayerList = playerTeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));
    const updatedEnemyList = enemyTeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));

    let playerActiveIdx = playerTeam.activeIndex;
    let enemyActiveIdx = enemyTeam.activeIndex;

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

      if (isCritical) logText += ` 💥 Critical Impact`;
      if (typeMult >= 2.0) logText += ` ⚡ Super Effective (2.0x)`;
      else if (typeMult <= 0.5) logText += ` 🛡️ Not Very Effective (0.5x)`;

      addLog(logText, typeMult >= 2.0 ? 'super-effective' : 'attack');
      setEnemyDamageFloater({ text: `-${damage}`, id: Date.now() });

      // Immediate state update to animate enemy HP drop!
      setEnemyTeam({
        trainerName: enemyTeam.trainerName,
        pokemonList: [...updatedEnemyList],
        activeIndex: enemyActiveIdx
      });

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
          setEnemyTeam({
            trainerName: enemyTeam.trainerName,
            pokemonList: [...updatedEnemyList],
            activeIndex: enemyActiveIdx
          });
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

      if (isCritical) logText += ` 💥 Critical Impact`;
      if (typeMult >= 2.0) logText += ` ⚡ Super Effective (2.0x)`;

      addLog(logText, 'damage');
      setPlayerDamageFloater({ text: `-${damage}`, id: Date.now() });

      // Immediate state update to animate player HP drop!
      setPlayerTeam({
        trainerName: playerTeam.trainerName,
        pokemonList: [...updatedPlayerList],
        activeIndex: playerActiveIdx
      });

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
          setPlayerTeam({
            trainerName: playerTeam.trainerName,
            pokemonList: [...updatedPlayerList],
            activeIndex: playerActiveIdx
          });
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

  // Resolve PvP Simultaneous Turn (Sequential Step-by-Step Execution)
  const handleResolvePvpTurn = (
    p1Data: { playerId: string; username: string; action: PokeBattleAction },
    p2Data: { playerId: string; username: string; action: PokeBattleAction }
  ) => {
    if (!playerTeam || !enemyTeam) return;

    setIsActionSubmitted(false);
    setIsProcessingTurn(true);
    setTurn(prev => prev + 1);

    const myData = p1Data.username === username ? p1Data : p2Data;
    const oppData = p1Data.username === username ? p2Data : p1Data;

    const updatedPlayerList = playerTeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));
    const updatedEnemyList = enemyTeam.pokemonList.map(p => ({ ...p, moves: [...p.moves] }));

    let playerActiveIdx = playerTeam.activeIndex;
    let enemyActiveIdx = enemyTeam.activeIndex;

    // 1. Handle Switches First
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

    // Apply Switch state immediately
    setPlayerTeam({
      trainerName: playerTeam.trainerName,
      pokemonList: updatedPlayerList,
      activeIndex: playerActiveIdx
    });
    setEnemyTeam({
      trainerName: enemyTeam.trainerName,
      pokemonList: updatedEnemyList,
      activeIndex: enemyActiveIdx
    });

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

      if (isCritical) logText += ` 💥 Critical Impact`;
      if (typeMult >= 2.0) logText += ` ⚡ Super Effective (2.0x)`;
      else if (typeMult <= 0.5) logText += ` 🛡️ Not Very Effective (0.5x)`;

      addLog(logText, typeMult >= 2.0 ? 'super-effective' : 'attack');
      setEnemyDamageFloater({ text: `-${damage}`, id: Date.now() });

      // Immediate state flush for opponent HP bar drop animation!
      setEnemyTeam({
        trainerName: enemyTeam.trainerName,
        pokemonList: [...updatedEnemyList],
        activeIndex: enemyActiveIdx
      });

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
          setEnemyTeam({
            trainerName: enemyTeam.trainerName,
            pokemonList: [...updatedEnemyList],
            activeIndex: enemyActiveIdx
          });
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

      if (isCritical) logText += ` 💥 Critical Impact`;
      if (typeMult >= 2.0) logText += ` ⚡ Super Effective (2.0x)`;

      addLog(logText, 'damage');
      setPlayerDamageFloater({ text: `-${damage}`, id: Date.now() });

      // Immediate state flush for player HP bar drop animation!
      setPlayerTeam({
        trainerName: playerTeam.trainerName,
        pokemonList: [...updatedPlayerList],
        activeIndex: playerActiveIdx
      });

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
          setPlayerTeam({
            trainerName: playerTeam.trainerName,
            pokemonList: [...updatedPlayerList],
            activeIndex: playerActiveIdx
          });
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
    if (!playerTeam || isProcessingTurn || isActionSubmitted) return;
    if (targetIndex === playerTeam.activeIndex) return;
    if (playerTeam.pokemonList[targetIndex].status === 'fainted') return;

    if (mode === 'pvp' || mode === 'pvp-random') {
      setIsActionSubmitted(true);
      socket?.emit('pokebattle-action-submit', {
        room,
        action: { type: 'switch', switchIndex: targetIndex }
      });
      return;
    }

    setIsProcessingTurn(true);
    const oldMon = playerTeam.pokemonList[playerTeam.activeIndex];
    const newMon = playerTeam.pokemonList[targetIndex];
    playerTeam.activeIndex = targetIndex;

    addLog(`🔄 ${oldMon.koreanName} -> ${newMon.koreanName} 모델 전환`, 'switch');

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
        addLog(`☠️ ${newMon.koreanName} 모델 세션 종료`, 'faint');
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

  // Text Sparkline Renderer
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
        <div className="excel-ribbon-tab">Data</div>
        <div className="excel-ribbon-tab">Review</div>
        <div className="excel-ribbon-tab">View</div>
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

        {/* 💼 PURE STEALTH TOGGLE BUTTON */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className={`excel-btn ${isPureStealth ? 'primary' : ''}`}
            onClick={() => setIsPureStealth(prev => !prev)}
            style={{ fontWeight: 600 }}
          >
            {isPureStealth ? <Briefcase size={13} /> : <Eye size={13} />}
            {isPureStealth ? '💼 100% 엑셀 텍스트 위장 (ON)' : '👁️ 비주얼 그래픽 보기 (OFF)'}
          </button>

          <span className="excel-cell-badge" style={{ background: userRole === 'spectator' ? '#e0f2fe' : undefined, color: userRole === 'spectator' ? '#0369a1' : undefined }}>
            {userRole === 'spectator' ? '👀 관전자 (Spectator)' : '⚔️ 선수 (Battler)'}
          </span>
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
                  🔴 1~2세대 (관동/성도 251종)
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
                  ? '선택됨: 1~2세대 (이상해씨~세레비 251종) 무작위 추출'
                  : genRange === 'gen1-5'
                  ? '선택됨: 1~5세대 (649종) 무작위 추출'
                  : '선택됨: 1~9세대 (1025종) 무작위 추출'}
              </p>

              <button
                className="excel-btn primary"
                onClick={handleStartRandomPvPBattle}
                disabled={isDraftReady || isFetchingApi}
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
              >
                {isFetchingApi ? (
                  '🌐 PokeAPI 모델 로딩 중...'
                ) : isDraftReady ? (
                  '✓ 무작위 엔트리 제출 완료 (상대방 대기 중...)'
                ) : (
                  `🎲 PokeAPI 무작위 3v3 엔트리 뽑기 (${genRange === 'gen1-2' ? '1~2세대' : genRange === 'gen1-5' ? '1~5세대' : '1~9세대'})`
                )}
              </button>
              <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#64748b' }}>
                준비된 플레이어: {readyCount} / 2
              </div>
            </div>
          ) : (
            <>
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

              <div className="draft-grid">
                {POKEMON_ROSTER.map((mon) => {
                  const isSelected = selectedIds.includes(mon.id);
                  const selectIndex = selectedIds.indexOf(mon.id) + 1;
                  return (
                    <div 
                      key={mon.id}
                      className={`draft-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleDraft(mon.id)}
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
                            {t}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 3, fontFamily: 'Consolas, monospace' }}>
                        HP:{mon.stats.hp} ATK:{mon.stats.attack} SPD:{mon.stats.speed}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ⚔️ BATTLE ARENA (100% AUTHENTIC EXCEL WORKSHEET TABLE GRID) */}
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
                        {t}
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
                        {t}
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

          {/* 🎮 EXCEL CONTROLS PANEL */}
          {phase === 'battle' && (
            <div className="battle-controls-panel">
              {userRole === 'spectator' ? (
                <div style={{ flex: 1, textAlign: 'center', padding: '16px', fontSize: '0.88rem', fontWeight: 600, color: '#0078d4', fontFamily: 'Consolas, monospace', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  👀 [SPECTATOR_MODE: LIVE_STREAMING_BATTLE ({playerTeam?.trainerName} vs {enemyTeam?.trainerName})]
                  <div style={{ fontSize: '0.78rem', color: '#0369a1', marginTop: '4px', fontWeight: 'normal' }}>
                    두 트레이너의 3v3 배틀을 실시간 관전 중입니다. 기술 발사 및 체력 변화가 실시간 동기화됩니다.
                  </div>
                </div>
              ) : isActionSubmitted ? (
                <div style={{ flex: 1, textAlign: 'center', padding: '16px', fontSize: '0.88rem', fontWeight: 600, color: '#107c41', fontFamily: 'Consolas, monospace' }}>
                  ⌛ [STATUS: WAITING_FOR_OPPONENT_TRANSACTION_APPROVAL...]
                </div>
              ) : (
                <>
                  {/* Moves (4 Excel Action Buttons) */}
                  <div className="moves-grid">
                    {pActiveMon.moves.map((move, moveIdx) => {
                      const typeColor = TYPE_COLORS[move.type];
                      return (
                        <button
                          key={`${move.id}_${moveIdx}`}
                          className="move-btn"
                          onClick={() => handleExecuteTurn(move, moveIdx)}
                          disabled={isProcessingTurn || pActiveMon.status === 'fainted'}
                          style={{ borderColor: typeColor.border }}
                        >
                          <div className="move-title-row">
                            <span>{isPureStealth ? `=MACRO_DERIVATIVE("${move.name}")` : move.name}</span>
                            <span className="type-badge" style={{ background: typeColor.bg, color: typeColor.text }}>
                              {move.type}
                            </span>
                          </div>
                          <div className="move-info-row">
                            <span>Power: {move.power}</span>
                            <span>Acc: {move.accuracy}%</span>
                            <span>PP: {move.pp}/{move.maxPp}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bench Switch Panel */}
                  <div className="switch-panel">
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#605e5c', marginBottom: 2 }}>
                      🔄 Macro_Switch_Model
                    </div>
                    {playerTeam?.pokemonList.map((mon, idx) => (
                      <button
                        key={mon.id}
                        className="switch-pokemon-btn"
                        onClick={() => handleSwitchPokemon(idx)}
                        disabled={isProcessingTurn || idx === playerTeam.activeIndex || mon.status === 'fainted'}
                      >
                        {!isPureStealth && <img src={mon.sprites.front} alt={mon.koreanName} style={{ width: 22, height: 22 }} />}
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{isPureStealth ? `[MODEL_${mon.id}] ${mon.koreanName}` : mon.koreanName}</div>
                          <div style={{ fontSize: '0.68rem', color: '#605e5c' }}>{mon.currentHp}/{mon.maxHp} HP</div>
                        </div>
                        {idx === playerTeam.activeIndex && <span style={{ fontSize: '0.68rem', color: '#107c41', fontWeight: 700 }}>[ACTIVE]</span>}
                        {mon.status === 'fainted' && <span style={{ fontSize: '0.68rem', color: '#d13438', fontWeight: 700 }}>[FAINTED]</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 🏆 RESULT SCREEN */}
          {phase === 'result' && (
            <div className="excel-phase-card" style={{ textAlign: 'center', padding: '16px' }}>
              <Trophy size={32} style={{ color: '#d97706', marginBottom: 4 }} />
              <h3>📊 Financial_Battle_Simulation_Completed</h3>
              <p className="phase-description" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#107c41' }}>
                시뮬레이션 검증이 종료되었습니다. [재도전] 버튼을 눌러 다시 세션을 시작하십시오.
              </p>
              <button className="excel-btn primary" onClick={handleResetDraft} style={{ padding: '6px 20px', marginTop: 8 }}>
                🔄 새 모델 드래프트 & 재도전
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
        <div className="excel-sheet-tab">Pivot_Stats_Table</div>
        <div className="excel-sheet-tab">Type_Matrix</div>
        <div style={{ color: '#8a8886', padding: '0 6px', cursor: 'pointer' }}>+</div>
        <div className="excel-status-ready">STATUS: READY</div>
      </div>
    </div>
  );
};

export default PokeBattle;
