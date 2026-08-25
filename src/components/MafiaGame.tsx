import React, { useState, useEffect, useRef } from 'react';
import { type Socket } from 'socket.io-client';
import { getSessionToken } from '../socketUrl';
import { useSocket } from '../context/SocketContext';
import './MafiaGame.css';

interface Player {
  id: string;
  username: string;
  role: 'mafia' | 'citizen' | 'joker' | 'doctor' | 'police';
  isAlive: boolean;
  lives: number;
  isProtected: boolean;
}

interface GameState {
  phase: 'waiting' | 'day' | 'night' | 'voting' | 'mafia-voting' | 'game-over';
  players: Player[];
  currentPlayer: string;
  gameStarted: boolean;
  timeLeft: number;
  selectedPlayer: string | null;
  messages: GameMessage[];
  winner: string | null;
  voteUsed: boolean;
}

interface GameMessage {
  id: string;
  type: 'system' | 'player' | 'vote' | 'attack' | 'heal';
  content: string;
  timestamp: Date;
  player?: string;
}

type MafiaUpdateMessage =
  | { type: 'join'; data: { player?: Player; players?: Player[] } }
  | { type: 'reconnect-sync'; data: { players: Player[]; phase: GameState['phase']; gameStarted: boolean; timeLeft?: number; voteUsed?: boolean; mafiaCount?: number } }
  | { type: 'leave'; data: { playerId: string } }
  | { type: 'message'; data: GameMessage }
  | { type: 'game-start'; data: { players: Player[]; phase?: GameState['phase']; timeLeft?: number } }
  | { type: 'vote'; data: { targetId: string; player?: Partial<Player>; message: string } }
  | { type: 'vote-skip'; data: { message: string } }
  | { type: 'attack'; data: { targetId: string | null; player?: Partial<Player> | null; message: string } }
  | { type: 'game-over'; data: { winner: string; message: string } }
  | { type: 'phase-change'; data: { phase: GameState['phase']; message: string; timeLeft?: number } }
  | { type: 'timer-tick'; data: { timeLeft: number } };

const MafiaGame: React.FC<{ username: string; room: string; onLeaveRoom?: () => void }> = ({ username, room, onLeaveRoom }) => {
  const { socket } = useSocket();
  const [mafiaCount, setMafiaCount] = useState<number>(1);
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    players: [],
    currentPlayer: username,
    gameStarted: false,
    timeLeft: 180,
    selectedPlayer: null,
    messages: [],
    winner: null,
    voteUsed: false
  });

  const handleMafiaCountChange = (count: number) => {
    setMafiaCount(count);
    socketRef.current?.emit('mafia-set-mafia-count', { room, count });
  };

  const [inputMessage, setInputMessage] = useState('');
  const socketRef = useRef<Socket | null>(socket);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [attackedId, setAttackedId] = useState<string | null>(null);
  const [showVotePopup, setShowVotePopup] = useState(false);
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    socketRef.current = socket;
    if (!socket) return;

    const joinRoom = () => {
      socket.emit('join', { username, room, gameType: 'mafia', sessionToken: getSessionToken('mafia') });
    };

    if (socket.connected) {
      joinRoom();
    }

    const handleUpdate = (message: MafiaUpdateMessage) => {
      handleSocketMessage(message);
    };

    socket.on('connect', joinRoom);
    socket.on('mafia-update', handleUpdate);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('mafia-update', handleUpdate);
    };
  }, [socket, username, room]);

  // 메시지 자동 스크롤 (컨테이너 내부만 스크롤하여 창 크기 조절 시 전체 화면 점프/출렁임 방지)
  useEffect(() => {
    if (shouldAutoScrollRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [gameState.messages]);

  // 투표 팝업 서버 이벤트 수신 (사망자 제외)
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    const handleVotePopup = () => {
      setGameState(current => {
        const me = current.players.find(p => p.username === username);
        if (me && me.isAlive) {
          setShowVotePopup(true);
          setVoteTarget(null);
        }
        return current;
      });
    };
    socket.on('mafia-vote-popup', handleVotePopup);
    return () => {
      socket.off('mafia-vote-popup', handleVotePopup);
    };
  }, [username]);

  // 투표 시작
  const startVote = () => {
    if (socketRef.current) {
      socketRef.current.emit('mafia-vote-start', { room });
    }
  };

  // 투표 제출
  const submitVote = () => {
    if (socketRef.current && voteTarget) {
      socketRef.current.emit('mafia-vote', { room, targetId: voteTarget, voterId: username });
      setShowVotePopup(false);
    }
  };

  // AI 봇 추가
  const addBot = () => {
    if (socketRef.current) {
      socketRef.current.emit('mafia-add-bot', { room });
    }
  };

  // 방 나가기
  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('mafia-leave', { room });
    }
    if (onLeaveRoom) {
      onLeaveRoom();
    }
  };

  // 게임 다시 시작 (대기실 복귀)
  const restartGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('mafia-restart', { room });
    }
  };

  // Socket.IO 메시지 처리
  const handleSocketMessage = (message: MafiaUpdateMessage) => {
    const { type, data } = message;

    switch (type) {
      case 'timer-tick':
        setGameState(prev => ({
          ...prev,
          timeLeft: data.timeLeft
        }));
        break;

      case 'reconnect-sync':
        if (data.mafiaCount) setMafiaCount(data.mafiaCount);
        setGameState(prev => ({
          ...prev,
          players: data.players || prev.players,
          phase: data.phase || prev.phase,
          gameStarted: data.gameStarted ?? prev.gameStarted,
          timeLeft: data.timeLeft ?? prev.timeLeft,
          voteUsed: data.voteUsed ?? prev.voteUsed
        }));
        break;

      case 'join':
        setGameState(prev => ({
          ...prev,
          players: data.players || (data.player
            ? (prev.players.some(p => p.username === data.player!.username)
                ? prev.players.map(p => p.username === data.player!.username ? data.player! : p)
                : [...prev.players, data.player!])
            : prev.players)
        }));
        break;

      case 'leave':
        setGameState(prev => ({
          ...prev,
          players: prev.players.filter(p => p.id !== data.playerId)
        }));
        break;

      case 'message':
        setGameState(prev => ({
          ...prev,
          messages: [...prev.messages, data]
        }));
        break;

      case 'game-start':
        setGameState(prev => ({
          ...prev,
          players: data.players,
          gameStarted: true,
          phase: data.phase || 'day',
          timeLeft: data.timeLeft ?? 90,
          voteUsed: false,
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'system',
            content: '[SYS_START] 감사 세션이 시작되었습니다. 1분 30초간 라운드 토의 후 검증을 진행합니다.',
            timestamp: new Date()
          }]
        }));
        break;

      case 'vote':
        setGameState(prev => ({
          ...prev,
          voteUsed: true,
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'system',
            content: data.message,
            timestamp: new Date()
          }]
        }));

        if (data.player) {
          setGameState(prev => ({
            ...prev,
            players: prev.players.map(p =>
                p.id === data.targetId ? { ...p, ...data.player } : p
            )
          }));
        }
        break;

      case 'vote-skip':
        setGameState(prev => ({
          ...prev,
          voteUsed: true,
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'system',
            content: data.message,
            timestamp: new Date()
          }]
        }));
        break;

      case 'attack': {
        setAttackedId(data.targetId);
        const attackedPlayer = data.player;

        setGameState(prev => ({
          ...prev,
          players: prev.players.map(p =>
              data.targetId && attackedPlayer && p.id === data.targetId
                  ? { ...p, lives: attackedPlayer.lives ?? p.lives, isAlive: attackedPlayer.isAlive ?? p.isAlive }
                  : p
          ),
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'attack',
            content: data.message,
            timestamp: new Date()
          }]
        }));

        setTimeout(() => setAttackedId(null), 1000);
        break;
      }

      case 'game-over':
        setGameState(prev => ({
          ...prev,
          phase: 'game-over',
          winner: data.winner,
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'system',
            content: data.message,
            timestamp: new Date()
          }]
        }));
        break;

      case 'phase-change':
        setGameState(prev => ({
          ...prev,
          phase: data.phase,
          timeLeft: data.timeLeft ?? (data.phase === 'day' ? 90 : data.phase === 'voting' ? 20 : 30),
          voteUsed: data.phase === 'day' ? false : prev.voteUsed,
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'system',
            content: data.message,
            timestamp: new Date()
          }]
        }));
        break;
    }
  };

  const startGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('mafia-game-start', { room });
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !socketRef.current) return;

    const me = gameState.players.find(p => p.username === username);
    if (me && !me.isAlive && gameState.gameStarted && gameState.phase !== 'game-over') {
      return;
    }

    const newMessage: GameMessage = {
      id: Date.now().toString(),
      type: 'player',
      content: inputMessage,
      timestamp: new Date(),
      player: username
    };

    socketRef.current.emit('mafia-message', { room, message: newMessage });
    setInputMessage('');
  };

  const selectPlayer = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      selectedPlayer: playerId
    }));
  };

  const executeVote = () => {
    if (!gameState.selectedPlayer || !socketRef.current) return;
    socketRef.current.emit('mafia-vote', { room, targetId: gameState.selectedPlayer });
    setGameState(prev => ({
      ...prev,
      selectedPlayer: null
    }));
  };

  const executeMafiaAttack = () => {
    if (!gameState.selectedPlayer || !socketRef.current) return;
    socketRef.current.emit('mafia-attack', { room, targetId: gameState.selectedPlayer });
    setGameState(prev => ({
      ...prev,
      selectedPlayer: null
    }));
  };

  const executeDoctorHeal = () => {
    if (!gameState.selectedPlayer || !socketRef.current) return;
    socketRef.current.emit('mafia-doctor-heal', { room, targetId: gameState.selectedPlayer });
    setGameState(prev => ({ ...prev, selectedPlayer: null }));
  };

  const executePoliceInvestigate = () => {
    if (!gameState.selectedPlayer || !socketRef.current) return;
    socketRef.current.emit('mafia-police-investigate', { room, targetId: gameState.selectedPlayer });
    setGameState(prev => ({ ...prev, selectedPlayer: null }));
  };

  const myPlayer = gameState.players.find(p => p.username === username);
  const isDead = myPlayer ? !myPlayer.isAlive : false;
  const isChatDisabled = isDead && gameState.gameStarted && gameState.phase !== 'game-over';
  const currentPlayerRole = myPlayer?.role;
  const selectedPlayerData = gameState.players.find(p => p.id === gameState.selectedPlayer);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    shouldAutoScrollRef.current = isNearBottom;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      shouldAutoScrollRef.current = true;
      setShowScrollBtn(false);
    }
  };

  return (
    <div className="mafia-game-container excel-stealth-theme">
      {/* 📊 Excel Formula Bar */}
      <div className="excel-formula-bar">
        <div className="excel-name-box">
          {selectedPlayerData ? `CELL_${selectedPlayerData.username.substring(0, 6)}` : 'A1: AUDIT_SUMMARY'}
        </div>
        <div className="excel-fx-icon">fx</div>
        <div className="excel-formula-input">
          =MAFIA_AUDIT.LOG(Phase="{gameState.phase.toUpperCase()}", Workgroup="{room}", Active_Nodes={gameState.players.filter(p => p.isAlive).length})
        </div>
      </div>

      {/* 📋 Sheet Header Bar */}
      <div className="game-header">
        <div className="sheet-title-info">
          <span className="sheet-icon">📋</span>
          <h2>Table 02: Mafia_Role_Audit_Log.xlsx</h2>
        </div>
        <div className="game-info">
          <span className="excel-cell-badge phase">
            Status: {gameState.phase === 'day' ? '☀️ DAY_SHIFT' : gameState.phase === 'night' ? '🌙 NIGHT_AUDIT' : gameState.phase === 'voting' ? '⚖️ VOTE_VERIFICATION' : 'READY'}
          </span>
          <span className="excel-cell-badge timer">
            ⏱️ Time: {Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}
          </span>
          {onLeaveRoom && (
            <button onClick={leaveRoom} className="excel-btn leave-room-btn">
              ✖ Close Sheet
            </button>
          )}
        </div>
      </div>

      {!gameState.gameStarted ? (
        <div className="waiting-room">
          <div className="waiting-header">
            <h3>Workgroup Audit Session Initialization (Connected Nodes: {gameState.players.length}/6)</h3>
            <p className="excel-subtext">Review connected employee IDs before initiating security audit sequence.</p>
          </div>

          <div className="excel-table-wrapper">
            <table className="excel-grid-table">
              <thead>
                <tr>
                  <th className="excel-row-num-col">#</th>
                  <th>Col A: Employee_ID</th>
                  <th>Col B: System_Node_Type</th>
                  <th>Col C: Connection_Status</th>
                </tr>
              </thead>
              <tbody>
                {gameState.players.map((player, index) => (
                  <tr key={player.id}>
                    <td className="excel-row-num">{index + 1}</td>
                    <td className="excel-cell-name">
                      {player.username} {player.username === username ? '(You)' : ''}
                    </td>
                    <td>{player.username.startsWith('AI_') ? 'AUTOMATED_BOT' : 'WORKSTATION_CLIENT'}</td>
                    <td><span className="excel-status-tag active">ONLINE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {gameState.players.length >= 6 && (
            <div style={{ margin: '12px 0', background: '#f8f9fa', padding: '10px 14px', border: '1px solid #d4d4d4', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#201f1e' }}>🕵️ 마피아 인원 수 설정 (6인 이상):</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleMafiaCountChange(1)}
                  className={`excel-btn ${mafiaCount === 1 ? 'primary' : ''}`}
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  1명
                </button>
                <button
                  onClick={() => handleMafiaCountChange(2)}
                  className={`excel-btn ${mafiaCount === 2 ? 'primary' : ''}`}
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  2명
                </button>
              </div>
            </div>
          )}

          <div className="waiting-room-actions">
            <button onClick={addBot} className="excel-btn secondary">
              ➕ Insert AI_Worker Node (+1 Bot)
            </button>
            <button onClick={startGame} className="excel-btn primary">
              ▶ Execute Audit Session (F5)
            </button>
            {onLeaveRoom && (
              <button onClick={leaveRoom} className="excel-btn close">
                ✖ Disconnect Workgroup
              </button>
            )}
          </div>
        </div>
      ) : gameState.phase === 'game-over' ? (
        <div className="game-over">
          <div className="excel-summary-header">
            <h3>📊 Audit Execution Summary - Final Status Report</h3>
            <div className="winner-banner">
              RESULT: {gameState.winner === 'citizens' ? 'CITIZEN_AUDITORS_VICTORY' : 'MAFIA_SECURITY_OVERRIDE_VICTORY'}
            </div>
          </div>

          <div className="excel-table-wrapper">
            <table className="excel-summary-table">
              <thead>
                <tr>
                  <th className="excel-row-num-col">#</th>
                  <th>Col A: Employee_ID</th>
                  <th>Col B: Security_Clearance</th>
                  <th>Col C: Final_Audit_Status</th>
                </tr>
              </thead>
              <tbody>
                {gameState.players.map((player, idx) => (
                  <tr key={player.id} className={!player.isAlive ? 'inactive-row' : ''}>
                    <td className="excel-row-num">{idx + 1}</td>
                    <td className="excel-cell-name">{player.username}</td>
                    <td className="role-cell">
                      {player.role === 'mafia'
                        ? '🕵️ MAFIA'
                        : player.role === 'police'
                        ? '🔍 POLICE'
                        : player.role === 'doctor'
                        ? '🩺 DOCTOR'
                        : '👤 CITIZEN'}
                    </td>
                    <td>
                      {player.isAlive ? (
                        <span className="excel-status-tag active">SURVIVED ({player.lives} HP)</span>
                      ) : (
                        <span className="excel-status-tag terminated">TERMINATED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="waiting-room-actions" style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button onClick={restartGame} className="excel-btn primary">
              🔄 다시 시작 (대기실로 복귀)
            </button>
            {onLeaveRoom && (
              <button onClick={leaveRoom} className="excel-btn close">
                ✖ 방 완전히 나가기
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="game-area">
            {/* 📊 Player Cells Data Grid */}
            <div className="player-grid-section">
              <div className="excel-grid-column-header">
                <span className="excel-col-head row-num">#</span>
                <span className="excel-col-head flex-2">Col A: Employee_ID</span>
                <span className="excel-col-head flex-1">Col B: Health_Score</span>
                <span className="excel-col-head flex-1">Col C: Clearance</span>
              </div>
              <div className="player-grid">
                {gameState.players.map((player, idx) => (
                  <div
                    key={player.id}
                    className={`player-card ${!player.isAlive ? 'dead' : ''} ${gameState.selectedPlayer === player.id ? 'selected' : ''}`}
                    onClick={() => selectPlayer(player.id)}
                  >
                    <span className="player-row-index">{idx + 1}</span>
                    <div className="player-name">
                      {player.username}
                      {!player.isAlive && <span className="dead-tag">[INACTIVE]</span>}
                    </div>
                    <div className={`player-lives ${attackedId === player.id ? 'attacked' : ''}`}>
                      Score: {player.lives}/3
                    </div>
                    <div className="player-role">
                      {player.username === username && player.role ? (
                        <span className={`role-badge ${player.role}`}>
                          {player.role === 'mafia'
                            ? '🕵️ MAFIA'
                            : player.role === 'police'
                            ? '🔍 POLICE'
                            : player.role === 'doctor'
                            ? '🩺 DOCTOR'
                            : '👤 CITIZEN'}
                        </span>
                      ) : (
                        <span className="role-badge confidential">Confidential</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ⚡ Excel Control / Action Section */}
            <div className="action-area">
              {gameState.phase === 'day' && (
                <div className="day-actions">
                  <p className="excel-control-desc">1분 30초간 토의 후 검증 투표를 진행합니다.</p>
                  <button
                    onClick={startVote}
                    disabled={gameState.voteUsed}
                    className={`excel-btn ${gameState.voteUsed ? 'disabled' : 'primary'}`}
                  >
                    {gameState.voteUsed ? '검증 완료' : '▶ 검증 투표 시작'}
                  </button>
                  {gameState.voteUsed && (
                    <p className="vote-notice">[Notice] 해당 주기에 이미 검증 투표를 실행했습니다.</p>
                  )}
                </div>
              )}

              {/* 🪟 Microsoft Excel Vote Prompt Dialog */}
              {showVotePopup && (
                <div className="excel-modal-overlay">
                  <div className="excel-dialog-box">
                    <div className="excel-dialog-header">
                      <span className="excel-dialog-title">Microsoft Excel - Verification Prompt</span>
                      <button className="excel-dialog-close" onClick={() => setShowVotePopup(false)}>✕</button>
                    </div>
                    <div className="excel-dialog-body">
                      <p className="excel-dialog-desc">검증을 진행할 대상 Employee ID Cell을 선택하세요:</p>
                      <div className="excel-dialog-options">
                        {gameState.players.filter(p => p.isAlive).map(p => (
                          <button
                            key={p.id}
                            onClick={() => setVoteTarget(p.id)}
                            className={`excel-dialog-opt ${voteTarget === p.id ? 'selected' : ''}`}
                          >
                            Cell: {p.username}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="excel-dialog-footer">
                      <button onClick={submitVote} disabled={!voteTarget} className="excel-btn primary">
                        OK (Submit)
                      </button>
                      <button onClick={() => setShowVotePopup(false)} className="excel-btn secondary">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {gameState.phase === 'voting' && (
                <div className="voting-actions">
                  <p className="excel-control-desc">검증할 Target Cell을 선택한 후 실행하십시오.</p>
                  <button onClick={executeVote} disabled={!gameState.selectedPlayer} className="excel-btn primary">
                    ▶ Execute Verification Vote
                  </button>
                </div>
              )}

              {gameState.phase === 'night' && (
                <div className="night-role-actions">
                  {currentPlayerRole === 'mafia' && (
                    <div className="mafia-actions">
                      <p className="excel-control-desc">보안 차단(공격)할 Target Cell을 선택하십시오.</p>
                      <button onClick={executeMafiaAttack} disabled={!gameState.selectedPlayer} className="excel-btn primary danger">
                        🗡️ Execute Security Override (마피아 공격)
                      </button>
                    </div>
                  )}
                  {currentPlayerRole === 'doctor' && (
                    <div className="doctor-actions">
                      <p className="excel-control-desc">응급 치료(보호)할 Target Cell을 선택하십시오.</p>
                      <button onClick={executeDoctorHeal} disabled={!gameState.selectedPlayer} className="excel-btn primary">
                        🩺 Execute Emergency Medical Heal (의사 치료)
                      </button>
                    </div>
                  )}
                  {currentPlayerRole === 'police' && (
                    <div className="police-actions">
                      <p className="excel-control-desc">신원 기밀 조사할 Target Cell을 선택하십시오.</p>
                      <button onClick={executePoliceInvestigate} disabled={!gameState.selectedPlayer} className="excel-btn primary">
                        🔍 Execute Background Audit Check (경찰 조사)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 📝 Excel Log & Communication Grid */}
          <div className="chat-area">
            <div className="excel-log-header">
              <span className="col-ts">A: Time</span>
              <span className="col-user">B: User_ID</span>
              <span className="col-msg">C: Audit Log Record</span>
            </div>
            <div className="messages" ref={messagesContainerRef} onScroll={handleScroll}>
              {gameState.messages.map(message => (
                <div key={message.id} className={`message ${message.type}`}>
                  <span className="timestamp">
                    {typeof message.timestamp === 'string'
                      ? new Date(message.timestamp).toLocaleTimeString()
                      : message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.player ? (
                    <span className="player">{message.player}: </span>
                  ) : (
                    <span className="player sys-tag">[SYS_LOG]: </span>
                  )}
                  <span className="content">{message.content}</span>
                </div>
              ))}
              {showScrollBtn && (
                <button onClick={scrollToBottom} className="excel-scroll-btn">
                  ⬇ Bottom Cell
                </button>
              )}
            </div>

            <div className="message-input">
              <span className="input-prefix">fx</span>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isChatDisabled ? "💀 사망 처리된 플레이어입니다 (관전 전용 모드)" : "Enter audit comment or message... (Enter)"}
                disabled={isChatDisabled}
              />
              <button onClick={sendMessage} disabled={isChatDisabled} className="excel-btn primary">
                Insert Log
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MafiaGame;

