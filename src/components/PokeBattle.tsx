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
import { Swords, RefreshCw, Trophy } from 'lucide-react';
import './PokeBattle.css';

interface PokeBattleProps {
  username: string;
  room?: string;
  onLeaveRoom?: () => void;
}

const PokeBattle: React.FC<PokeBattleProps> = ({ username, onLeaveRoom }) => {
  // Game Phase: 'draft' | 'battle' | 'result'
  const [phase, setPhase] = useState<'draft' | 'battle' | 'result'>('draft');

  // Draft selection (Player picks 3 Pokemon)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Teams
  const [playerTeam, setPlayerTeam] = useState<PlayerTeam | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<PlayerTeam | null>(null);

  // Turn state
  const [turn, setTurn] = useState<number>(1);
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [isProcessingTurn, setIsProcessingTurn] = useState<boolean>(false);

  // Animations
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);
  const [playerDamageFloater, setPlayerDamageFloater] = useState<{ text: string; id: number } | null>(null);
  const [enemyDamageFloater, setEnemyDamageFloater] = useState<{ text: string; id: number } | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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

  // Handle Draft Selection
  const handleToggleDraft = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      if (selectedIds.length >= 3) return;
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Randomize Draft Team
  const handleRandomizeDraft = () => {
    const shuffled = [...POKEMON_ROSTER].sort(() => 0.5 - Math.random());
    const randomPicked = shuffled.slice(0, 3).map(p => p.id);
    setSelectedIds(randomPicked);
  };

  // Start 3v3 Battle
  const handleStartBattle = () => {
    if (selectedIds.length !== 3) return;

    const playerPicked = selectedIds.map(id => POKEMON_ROSTER.find(p => p.id === id)!);
    const playerMonList = playerPicked.map(createBattlePokemon);

    // AI Team (pick 3 random different Pokemon)
    const availableForAi = POKEMON_ROSTER.filter(p => !selectedIds.includes(p.id));
    const shuffledAi = [...availableForAi].sort(() => 0.5 - Math.random());
    const enemyPicked = (shuffledAi.length >= 3 ? shuffledAi : [...POKEMON_ROSTER].sort(() => 0.5 - Math.random())).slice(0, 3);
    const enemyMonList = enemyPicked.map(createBattlePokemon);

    setPlayerTeam({
      trainerName: username || '플레이어',
      pokemonList: playerMonList,
      activeIndex: 0
    });

    setEnemyTeam({
      trainerName: '🤖 AI 라이벌 트레이너',
      pokemonList: enemyMonList,
      activeIndex: 0
    });

    setTurn(1);
    setLogs([]);
    setPhase('battle');
    addLog(`⚔️ 3v3 포켓몬 배틀이 시작되었습니다! ${playerMonList[0].koreanName} vs ${enemyMonList[0].koreanName}`, 'system');
  };

  // Execute Damage Calculation
  const calculateDamage = (attacker: BattlePokemon, defender: BattlePokemon, move: Move) => {
    const level = 50;
    const isSpecial = move.category === 'special';
    const attackStat = isSpecial ? attacker.stats.spAtk : attacker.stats.attack;
    const defenseStat = isSpecial ? defender.stats.spDef : defender.stats.defense;

    // STAB (Same-Type Attack Bonus)
    const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;

    // Type Multiplier
    const typeMult = getTypeMultiplier(move.type, defender.types);

    // Random variance (0.85 ~ 1.0)
    const randomVal = 0.85 + Math.random() * 0.15;

    // Critical Hit (6.25% chance)
    const isCritical = Math.random() < 0.0625;
    const critMult = isCritical ? 1.5 : 1.0;

    const baseDamage = (((2 * level / 5 + 2) * move.power * (attackStat / defenseStat)) / 50 + 2);
    const totalDamage = Math.max(1, Math.floor(baseDamage * stab * typeMult * critMult * randomVal));

    return { damage: totalDamage, typeMult, isCritical };
  };

  // Execute Single Battle Turn
  const handleExecuteTurn = (selectedMove: Move) => {
    if (!playerTeam || !enemyTeam || isProcessingTurn) return;

    setIsProcessingTurn(true);

    const pActive = playerTeam.pokemonList[playerTeam.activeIndex];
    const eActive = enemyTeam.pokemonList[enemyTeam.activeIndex];

    // Determine Turn Order by Speed
    const playerFirst = pActive.stats.speed >= eActive.stats.speed;

    const executePlayerAttack = () => {
      const { damage, typeMult, isCritical } = calculateDamage(pActive, eActive, selectedMove);
      const newEnemyHp = Math.max(0, eActive.currentHp - damage);
      eActive.currentHp = newEnemyHp;

      setEnemyShake(true);
      setTimeout(() => setEnemyShake(false), 400);

      let logText = `${pActive.koreanName}의 ${selectedMove.name}! (${damage} 대미지)`;
      if (isCritical) logText += ` 💥 급소에 맞았다!`;

      let logType: BattleLog['type'] = 'attack';
      if (typeMult >= 2.0) {
        logText += ` ⚡ 효과가 굉장했다!`;
        logType = 'super-effective';
      } else if (typeMult === 0) {
        logText += ` 🛡️ 효과가 없는 것 같다...`;
        logType = 'not-very-effective';
      } else if (typeMult <= 0.5) {
        logText += ` 🛡️ 효과가 별로인 듯하다...`;
        logType = 'not-very-effective';
      }

      addLog(logText, logType);
      setEnemyDamageFloater({ text: `-${damage}`, id: Date.now() });

      if (newEnemyHp <= 0) {
        eActive.status = 'fainted';
        addLog(`☠️ 상대의 ${eActive.koreanName}이(가) 쓰러졌습니다!`, 'faint');

        // Check if enemy team defeated
        const nextEnemyIdx = enemyTeam.pokemonList.findIndex(p => p.status !== 'fainted');
        if (nextEnemyIdx === -1) {
          setPhase('result');
          addLog(`🏆 ${username} 트레이너의 대승리! 모든 상대 포켓몬을 쓰러뜨렸습니다!`, 'system');
          setIsProcessingTurn(false);
          return false;
        } else {
          enemyTeam.activeIndex = nextEnemyIdx;
          addLog(`🤖 상대가 ${enemyTeam.pokemonList[nextEnemyIdx].koreanName}(을)를 내보냈다!`, 'switch');
        }
      }
      return true;
    };

    const executeEnemyAttack = () => {
      // Enemy AI selects best available move
      const enemyMove = eActive.moves[Math.floor(Math.random() * eActive.moves.length)];
      const { damage, typeMult, isCritical } = calculateDamage(eActive, pActive, enemyMove);

      const newPlayerHp = Math.max(0, pActive.currentHp - damage);
      pActive.currentHp = newPlayerHp;

      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 400);

      let logText = `🤖 상대 ${eActive.koreanName}의 ${enemyMove.name}! (${damage} 대미지)`;
      if (isCritical) logText += ` 💥 급소에 맞았다!`;

      let logType: BattleLog['type'] = 'damage';
      if (typeMult >= 2.0) {
        logText += ` ⚡ 효과가 굉장했다!`;
        logType = 'super-effective';
      } else if (typeMult <= 0.5) {
        logText += ` 🛡️ 효과가 별로인 듯하다...`;
        logType = 'not-very-effective';
      }

      addLog(logText, logType);
      setPlayerDamageFloater({ text: `-${damage}`, id: Date.now() });

      if (newPlayerHp <= 0) {
        pActive.status = 'fainted';
        addLog(`☠️ 내 ${pActive.koreanName}이(가) 쓰러졌습니다!`, 'faint');

        // Check player team defeated
        const nextPlayerIdx = playerTeam.pokemonList.findIndex(p => p.status !== 'fainted');
        if (nextPlayerIdx === -1) {
          setPhase('result');
          addLog(`💀 ${username} 트레이너의 패배... 모든 포켓몬이 쓰러졌습니다.`, 'system');
          setIsProcessingTurn(false);
          return false;
        } else {
          playerTeam.activeIndex = nextPlayerIdx;
          addLog(`🔄 ${playerTeam.pokemonList[nextPlayerIdx].koreanName}(이)가 교체 출전합니다!`, 'switch');
        }
      }
      return true;
    };

    // Sequential turn execution
    if (playerFirst) {
      const continueBattle = executePlayerAttack();
      if (continueBattle && eActive.status !== 'fainted') {
        setTimeout(() => {
          executeEnemyAttack();
          setTurn(prev => prev + 1);
          setIsProcessingTurn(false);
        }, 800);
      } else {
        setTurn(prev => prev + 1);
        setIsProcessingTurn(false);
      }
    } else {
      const continueBattle = executeEnemyAttack();
      if (continueBattle && pActive.status !== 'fainted') {
        setTimeout(() => {
          executePlayerAttack();
          setTurn(prev => prev + 1);
          setIsProcessingTurn(false);
        }, 800);
      } else {
        setTurn(prev => prev + 1);
        setIsProcessingTurn(false);
      }
    }
  };

  // Switch Active Pokemon
  const handleSwitchPokemon = (targetIndex: number) => {
    if (!playerTeam || isProcessingTurn) return;
    if (targetIndex === playerTeam.activeIndex) return;
    if (playerTeam.pokemonList[targetIndex].status === 'fainted') return;

    setIsProcessingTurn(true);

    const oldMon = playerTeam.pokemonList[playerTeam.activeIndex];
    const newMon = playerTeam.pokemonList[targetIndex];
    playerTeam.activeIndex = targetIndex;

    addLog(`🔄 ${oldMon.koreanName}(을)를 집어넣고 ${newMon.koreanName}(을)를 내보냈다!`, 'switch');

    // Enemy free attack on switch
    setTimeout(() => {
      const eActive = enemyTeam!.pokemonList[enemyTeam!.activeIndex];
      const enemyMove = eActive.moves[Math.floor(Math.random() * eActive.moves.length)];
      const { damage } = calculateDamage(eActive, newMon, enemyMove);

      newMon.currentHp = Math.max(0, newMon.currentHp - damage);
      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 400);

      addLog(`🤖 상대 ${eActive.koreanName}의 틈새 공격! ${enemyMove.name}! (${damage} 대미지)`, 'damage');
      setPlayerDamageFloater({ text: `-${damage}`, id: Date.now() });

      if (newMon.currentHp <= 0) {
        newMon.status = 'fainted';
        addLog(`☠️ 내 ${newMon.koreanName}이(가) 쓰러졌습니다!`, 'faint');
      }

      setTurn(prev => prev + 1);
      setIsProcessingTurn(false);
    }, 600);
  };

  // Reset to Draft
  const handleResetDraft = () => {
    setSelectedIds([]);
    setPlayerTeam(null);
    setEnemyTeam(null);
    setPhase('draft');
  };

  const pActiveMon = playerTeam?.pokemonList[playerTeam.activeIndex];
  const eActiveMon = enemyTeam?.pokemonList[enemyTeam.activeIndex];

  return (
    <div className="poke-battle-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar */}
      <div className="poke-formula-bar">
        <div className="excel-name-box">Sheet5!B3</div>
        <div className="excel-fx-icon">fx</div>
        <div className="poke-formula-input">
          {phase === 'draft' && `=SELECT_3V3_POKEMON_TEAM(ROSTER_COUNT=12)`}
          {phase === 'battle' && `=POKE_BATTLE_SIMULATOR("${pActiveMon?.koreanName}", "${eActiveMon?.koreanName}", TURN=${turn})`}
          {phase === 'result' && `=VLOOKUP(WINNER, BATTLE_RESULTS_DB, 1, FALSE)`}
        </div>
      </div>

      {/* 📋 Header */}
      <div className="poke-battle-header">
        <div className="poke-header-title">
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <h2>Sheet5_PokeBattle_Analysis.xlsx</h2>
        </div>
        <div className="game-info">
          <span className="excel-cell-badge phase">
            상태: {phase === 'draft' ? '엔트리 드래프트' : phase === 'battle' ? `배틀 진행 중 (Turn ${turn})` : '배틀 완료'}
          </span>
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
          <div className="excel-card-header">
            <h3>🎯 3v3 배틀 포켓몬 엔트리 선택 ({selectedIds.length} / 3)</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="excel-btn" onClick={handleRandomizeDraft}>
                <RefreshCw size={14} /> 🎲 무작위 추첨
              </button>
              <button 
                className="excel-btn primary" 
                onClick={handleStartBattle}
                disabled={selectedIds.length !== 3}
              >
                <Swords size={14} /> ⚔️ 3v3 배틀 시작 (Start)
              </button>
            </div>
          </div>
          <p className="phase-description">원하는 포켓몬 3마리를 선택하여 3v3 실시간 상성 배틀에 출전시키십시오.</p>

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
                  <img src={mon.sprites.front} alt={mon.koreanName} className="draft-sprite" />
                  <div className="draft-name">{mon.koreanName}</div>
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
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, fontFamily: 'Consolas, monospace' }}>
                    HP:{mon.stats.hp} ATK:{mon.stats.attack} SPD:{mon.stats.speed}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ⚔️ BATTLE ARENA PHASE */}
      {(phase === 'battle' || phase === 'result') && pActiveMon && eActiveMon && (
        <div className="poke-battle-arena">
          <div className="battle-field-container">
            {/* 🤖 ENEMY POKEMON STATUS CARD (Top Left) */}
            <div className="pokemon-status-card enemy">
              <div className="status-header">
                <span className="status-name">🤖 {eActiveMon.koreanName}</span>
                <span className="status-level">Lv.50</span>
              </div>
              <div className="type-badge-container" style={{ marginBottom: 6 }}>
                {eActiveMon.types.map(t => (
                  <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].text }}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="hp-bar-outer">
                <div 
                  className={`hp-bar-inner ${eActiveMon.currentHp / eActiveMon.maxHp > 0.5 ? 'high' : eActiveMon.currentHp / eActiveMon.maxHp > 0.2 ? 'medium' : 'low'}`}
                  style={{ width: `${(eActiveMon.currentHp / eActiveMon.maxHp) * 100}%` }}
                />
              </div>
              <div className="hp-text">{eActiveMon.currentHp} / {eActiveMon.maxHp} HP</div>
            </div>

            {/* 🤖 ENEMY SPRITE (Top Right) */}
            <div className="sprite-stage enemy">
              <img 
                src={eActiveMon.sprites.showdownFront || eActiveMon.sprites.front} 
                alt={eActiveMon.koreanName}
                className={`pokemon-battle-sprite ${enemyShake ? 'shake' : ''}`} 
              />
              {enemyDamageFloater && (
                <div key={enemyDamageFloater.id} className="damage-floater" style={{ top: '-10px', right: '40px' }}>
                  {enemyDamageFloater.text}
                </div>
              )}
            </div>

            {/* 👤 PLAYER SPRITE (Bottom Left) */}
            <div className="sprite-stage player">
              <img 
                src={pActiveMon.sprites.showdownBack || pActiveMon.sprites.back || pActiveMon.sprites.front} 
                alt={pActiveMon.koreanName}
                className={`pokemon-battle-sprite ${playerShake ? 'shake' : ''}`}
                style={{ transform: 'scale(1.15)' }}
              />
              {playerDamageFloater && (
                <div key={playerDamageFloater.id} className="damage-floater" style={{ top: '-10px', left: '40px' }}>
                  {playerDamageFloater.text}
                </div>
              )}
            </div>

            {/* 👤 PLAYER POKEMON STATUS CARD (Bottom Right) */}
            <div className="pokemon-status-card player">
              <div className="status-header">
                <span className="status-name">👤 {pActiveMon.koreanName}</span>
                <span className="status-level">Lv.50</span>
              </div>
              <div className="type-badge-container" style={{ marginBottom: 6 }}>
                {pActiveMon.types.map(t => (
                  <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].text }}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="hp-bar-outer">
                <div 
                  className={`hp-bar-inner ${pActiveMon.currentHp / pActiveMon.maxHp > 0.5 ? 'high' : pActiveMon.currentHp / pActiveMon.maxHp > 0.2 ? 'medium' : 'low'}`}
                  style={{ width: `${(pActiveMon.currentHp / pActiveMon.maxHp) * 100}%` }}
                />
              </div>
              <div className="hp-text">{pActiveMon.currentHp} / {pActiveMon.maxHp} HP</div>
            </div>
          </div>

          {/* 🎮 CONTROLS PANEL */}
          {phase === 'battle' && (
            <div className="battle-controls-panel">
              {/* Moves (4 Attack Buttons) */}
              <div className="moves-grid">
                {pActiveMon.moves.map((move) => {
                  const typeColor = TYPE_COLORS[move.type];
                  return (
                    <button
                      key={move.id}
                      className="move-btn"
                      onClick={() => handleExecuteTurn(move)}
                      disabled={isProcessingTurn || pActiveMon.status === 'fainted'}
                      style={{ borderColor: typeColor.border }}
                    >
                      <div className="move-title-row">
                        <span>{move.name}</span>
                        <span className="type-badge" style={{ background: typeColor.bg, color: typeColor.text }}>
                          {move.type}
                        </span>
                      </div>
                      <div className="move-info-row">
                        <span>위력: {move.power}</span>
                        <span>명중: {move.accuracy}%</span>
                        <span>PP: {move.pp}/{move.maxPp}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bench Switch Panel */}
              <div className="switch-panel">
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  🔄 엔트리 교체 (Bench)
                </div>
                {playerTeam?.pokemonList.map((mon, idx) => (
                  <button
                    key={mon.id}
                    className="switch-pokemon-btn"
                    onClick={() => handleSwitchPokemon(idx)}
                    disabled={isProcessingTurn || idx === playerTeam.activeIndex || mon.status === 'fainted'}
                  >
                    <img src={mon.sprites.front} alt={mon.koreanName} style={{ width: 28, height: 28 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{mon.koreanName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{mon.currentHp}/{mon.maxHp} HP</div>
                    </div>
                    {idx === playerTeam.activeIndex && <span style={{ fontSize: '0.7rem', color: '#107c41', fontWeight: 700 }}>[출전]</span>}
                    {mon.status === 'fainted' && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>[기절]</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 🏆 RESULT SCREEN */}
          {phase === 'result' && (
            <div className="excel-phase-card" style={{ textAlign: 'center' }}>
              <Trophy size={36} style={{ color: '#d97706', marginBottom: 8 }} />
              <h3>📊 3v3 포켓몬 배틀 최종 시뮬레이션 결과</h3>
              <p className="phase-description" style={{ fontSize: '1rem', fontWeight: 600, color: '#107c41' }}>
                배틀이 성공적으로 종료되었습니다. [재도전 / 새 엔트리] 버튼을 눌러 다시 플레이할 수 있습니다.
              </p>
              <button className="excel-btn primary" onClick={handleResetDraft} style={{ padding: '8px 24px', marginTop: 12 }}>
                🔄 새 엔트리 드래프트 & 재도전
              </button>
            </div>
          )}

          {/* 📊 BATTLE AUDIT LOG TABLE */}
          <div className="poke-log-container">
            <div style={{ padding: '4px 10px', background: '#f1f5f9', fontWeight: 700, fontSize: '0.78rem', borderBottom: '1px solid #cbd5e1' }}>
              📋 배틀 진행 로그 (Audit Log Data Stream)
            </div>
            {logs.map((log) => (
              <div key={log.id} className={`poke-log-row ${log.type || ''}`}>
                <span style={{ color: '#94a3b8' }}>[{log.timestamp}]</span>
                <span style={{ color: '#475569', fontWeight: 600 }}>[Turn {log.turn}]</span>
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
