import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './MafiaGame.css';

interface Player {
  id: string;
  username: string;
  role: 'mafia' | 'doctor' | 'citizen' | 'joker';
  isAlive: boolean;
  lives: number;
  isProtected: boolean;
}

interface GameState {
  phase: 'waiting' | 'day' | 'night' | 'voting' | 'mafia-voting' | 'doctor-healing' | 'game-over';
  players: Player[];
  currentPlayer: string;
  gameStarted: boolean;
  timeLeft: number;
  selectedPlayer: string | null;
  messages: GameMessage[];
  winner: string | null;
  voteUsed: boolean; // 하루에 한 번만 투표할 수 있도록 추가
}

interface GameMessage {
  id: string;
  type: 'system' | 'player' | 'vote' | 'attack' | 'heal';
  content: string;
  timestamp: Date;
  player?: string;
}

const MafiaGame: React.FC<{ username: string; room: string }> = ({ username, room }) => {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    players: [],
    currentPlayer: username,
    gameStarted: false,
    timeLeft: 120, // 2분
    selectedPlayer: null,
    messages: [],
    winner: null,
    voteUsed: false // 투표 사용 여부
  });

  const [inputMessage, setInputMessage] = useState('');
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attackedId, setAttackedId] = useState<string | null>(null); // 공격 애니메이션용
  const [showVotePopup, setShowVotePopup] = useState(false);
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Socket.IO 연결
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001';
    console.log('서버 주소:', serverUrl);
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO 연결됨');
      // 게임방 입장
      socket.emit('join', { username, room, gameType: 'mafia' });
    });

    socket.on('mafia-update', (message: any) => {
      handleSocketMessage(message);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO 연결 종료');
    });

    return () => {
      socket.disconnect();
    };
  }, [username, room]);

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.messages]);

  // 타이머 관리
  useEffect(() => {
    if (!gameState.gameStarted) return;
    if (gameState.phase !== 'day' && gameState.phase !== 'night') return;
    if (gameState.timeLeft <= 0) return;
    const timer = setInterval(() => {
      setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.gameStarted, gameState.phase, gameState.timeLeft]);

  // 낮(대화) 시간 90초로 단축
  // 낮 종료 시 자동 밤 전환
  useEffect(() => {
    if (gameState.phase === 'day' && gameState.timeLeft === 0) {
      setGameState(prev => ({
        ...prev,
        phase: 'night',
        timeLeft: 30,
        messages: [...prev.messages, {
          id: Date.now().toString(),
          type: 'system',
          content: '밤이 되었습니다. 마피아가 공격할 플레이어를 선택하세요.',
          timestamp: new Date()
        }]
      }));
    }
  }, [gameState.phase, gameState.timeLeft]);

  // 투표 팝업 서버 이벤트 수신
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    const handleVotePopup = () => {
      setShowVotePopup(true);
      setVoteTarget(null);
    };
    socket.on('mafia-vote-popup', handleVotePopup);
    return () => {
      socket.off('mafia-vote-popup', handleVotePopup);
    };
  }, []);

  // 투표 시작 (모든 클라이언트에 팝업 띄우기)
  const startVote = () => {
    if (socketRef.current) {
      socketRef.current.emit('mafia-vote-start', { room });
    }
  };

  // 투표 팝업에서 투표 실행
  const submitVote = () => {
    if (socketRef.current && voteTarget) {
      socketRef.current.emit('mafia-vote', { room, targetId: voteTarget, voterId: username });
      setShowVotePopup(false);
    }
  };

  // Socket.IO 메시지 처리
  const handleSocketMessage = (message: any) => {
    const { type, data } = message;
    
    switch (type) {
      case 'join':
        setGameState(prev => ({
          ...prev,
          players: [...prev.players, data.player]
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
        const players = data.players.map((player: any, index: number) => {
          let role: Player['role'] = 'citizen';
          
          if (index === 0) role = 'mafia';
          else if (index === 1 && data.players.length >= 4) role = 'doctor';
          else if (index === 2) role = 'joker';
          
          return {
            ...player,
            role,
            isAlive: true,
            lives: 3,
            isProtected: false
          };
        });

        setGameState(prev => ({
          ...prev,
          players,
          gameStarted: true,
          phase: 'day',
          timeLeft: 90, // 낮 1분 30초
          voteUsed: false, // 새로운 날이 시작되면 투표 사용 가능
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'system',
            content: '게임이 시작되었습니다! 1분 30초간 대화 후 밤이 됩니다.',
            timestamp: new Date()
          }]
        }));
        // 2분 후 밤으로 전환
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            phase: 'night',
            timeLeft: 30,
            messages: [...prev.messages, {
              id: Date.now().toString(),
              type: 'system',
              content: '밤이 되었습니다. 마피아가 공격할 플레이어를 선택하세요.',
              timestamp: new Date()
            }]
          }));
        }, 120000);
        break;
      
      case 'vote':
        const targetPlayer = gameState.players.find(p => p.id === data.targetId);
        if (!targetPlayer) return;

        if (targetPlayer.role === 'joker') {
          setGameState(prev => ({
            ...prev,
            phase: 'game-over',
            winner: 'joker',
            messages: [...prev.messages, {
              id: Date.now().toString(),
              type: 'system',
              content: `${targetPlayer.username}이(가) 투표받았습니다! 조커의 승리입니다!`,
              timestamp: new Date()
            }]
          }));
        } else {
          const updatedPlayers = gameState.players.map(p =>
            p.id === data.targetId
              ? { ...p, lives: data.player.lives, isAlive: data.player.isAlive }
              : p
          );

          setGameState(prev => ({
            ...prev,
            players: updatedPlayers,
            voteUsed: true, // 투표 사용됨
            messages: [...prev.messages, {
              id: Date.now().toString(),
              type: 'vote',
              content: `${targetPlayer.username}이(가) 투표받아 생명이 1 감소했습니다.`,
              timestamp: new Date()
            }]
          }));

          checkGameEnd();
        }
        break;
      
      case 'attack':
        console.log('클라이언트 attack 메시지 수신:', data);
        const attackedPlayer = gameState.players.find(p => p.id === data.targetId);
        if (!attackedPlayer) {
          console.log('공격 대상 없음:', data.targetId, gameState.players.map(p => p.id));
          return;
        }
        setAttackedId(data.targetId);
        const updatedPlayersAfterAttack = gameState.players.map(p =>
          p.id === data.targetId
            ? { ...p, lives: data.player.lives, isAlive: data.player.isAlive }
            : p
        );
        console.log('players 상태:', updatedPlayersAfterAttack);
        setGameState(prev => ({
          ...prev,
          players: updatedPlayersAfterAttack,
          phase: 'doctor-healing',
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'attack',
            content: `${attackedPlayer.username}이(가) 마피아의 공격을 받았습니다.`,
            timestamp: new Date()
          }]
        }));
        setTimeout(() => setAttackedId(null), 1000);
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            phase: 'day',
            timeLeft: 90,
            voteUsed: false,
            messages: [...prev.messages, {
              id: Date.now().toString(),
              type: 'system',
              content: '공격이 끝났습니다. 낮이 되었습니다! 1분 30초간 대화하세요.',
              timestamp: new Date()
            }]
          }));
        }, 2000);
        break;
      
      case 'heal':
        const healedPlayer = gameState.players.find(p => p.id === data.targetId);
        if (!healedPlayer) return;

        const updatedPlayersAfterHeal = gameState.players.map(p =>
          p.id === data.targetId
            ? { ...p, lives: data.player.lives, isAlive: data.player.isAlive }
            : p
        );

        setGameState(prev => ({
          ...prev,
          players: updatedPlayersAfterHeal,
          phase: 'day',
          timeLeft: 120,
          voteUsed: false, // 새로운 날이 시작되면 투표 사용 가능
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'heal',
            content: `${healedPlayer.username}이(가) 의사에 의해 치료되었습니다.`,
            timestamp: new Date()
          }]
        }));

        // 2분 후 다시 밤으로
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            phase: 'night',
            timeLeft: 30,
            messages: [...prev.messages, {
              id: Date.now().toString(),
              type: 'system',
              content: '밤이 되었습니다. 마피아가 공격할 플레이어를 선택하세요.',
              timestamp: new Date()
            }]
          }));
        }, 120000);
        break;
      
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
    }
  };

  // 게임 시작
  const startGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('mafia-game-start', { room });
    }
  };

  // 메시지 전송
  const sendMessage = () => {
    if (!inputMessage.trim() || !socketRef.current) return;

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

  // 플레이어 선택 (투표/공격/치료)
  const selectPlayer = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      selectedPlayer: playerId
    }));
  };

  // 투표 실행
  const executeVote = () => {
    if (!gameState.selectedPlayer || !socketRef.current) return;

    socketRef.current.emit('mafia-vote', { room, targetId: gameState.selectedPlayer });

    setGameState(prev => ({
      ...prev,
      selectedPlayer: null
    }));
  };

  // 마피아 공격 진단용 로그
  const executeMafiaAttack = () => {
    if (!gameState.selectedPlayer || !socketRef.current) return;
    console.log('마피아 공격 emit:', gameState.selectedPlayer);
    socketRef.current.emit('mafia-attack', { room, targetId: gameState.selectedPlayer });
    setGameState(prev => ({
      ...prev,
      selectedPlayer: null
    }));
  };

  // 의사 치료
  const executeDoctorHeal = () => {
    if (!gameState.selectedPlayer || !socketRef.current) return;

    socketRef.current.emit('mafia-heal', { room, targetId: gameState.selectedPlayer });

    setGameState(prev => ({
      ...prev,
      selectedPlayer: null
    }));
  };

  // 게임 종료 체크
  const checkGameEnd = () => {
    const alivePlayers = gameState.players.filter(p => p.isAlive);
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const aliveCitizens = alivePlayers.filter(p => p.role !== 'mafia');

    if (aliveMafia.length === 0) {
      if (socketRef.current) {
        socketRef.current.emit('mafia-game-over', { 
          room, 
          winner: 'citizens',
          message: '모든 마피아가 제거되었습니다! 시민의 승리입니다!'
        });
      }
    } else if (aliveCitizens.length === 0) {
      if (socketRef.current) {
        socketRef.current.emit('mafia-game-over', { 
          room, 
          winner: 'mafia',
          message: '모든 시민이 사망했습니다! 마피아의 승리입니다!'
        });
      }
    }
  };

  // 현재 플레이어의 역할 확인
  const currentPlayerRole = gameState.players.find(p => p.username === username)?.role;

  // 자동 스크롤 useEffect 제거
  // 대신 스크롤 위치 감지해서 버튼 표시
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 80) {
      setShowScrollBtn(true);
    } else {
      setShowScrollBtn(false);
    }
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="mafia-game-container">
      <div className="game-header">
        <h2>🕵️</h2>
        <div className="game-info">
          <span className="phase">{gameState.phase === 'day' ? '☀️ 낮' : '🌙 밤'}</span>
          <span className="timer">⏰ {Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      {!gameState.gameStarted ? (
        <div className="waiting-room">
          <h3>대기실</h3>
          <div className="player-list">
            {gameState.players.map(player => (
              <div key={player.id} className="player-item">
                {player.username}
              </div>
            ))}
          </div>
          <button onClick={startGame} className="start-button">
            게임 시작
          </button>
        </div>
      ) : gameState.phase === 'game-over' ? (
        <div className="game-over">
          <h3>게임 종료!</h3>
          <p className="winner">
            {gameState.winner === 'joker' ? '🎭 조커의 승리!' :
             gameState.winner === 'citizens' ? '👥 시민의 승리!' :
             gameState.winner === 'mafia' ? '🕵️ 마피아의 승리!' : ''}
          </p>
          <div className="final-players">
            {gameState.players.map(player => (
              <div key={player.id} className={`player-item ${!player.isAlive ? 'dead' : ''}`}>
                <span>{player.username}</span>
                <span className="role">{player.role}</span>
                <span className="lives">❤️ {player.lives}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="game-area">
            <div className="player-grid">
              {gameState.players.map(player => (
                <div 
                  key={player.id} 
                  className={`player-card ${!player.isAlive ? 'dead' : ''} ${gameState.selectedPlayer === player.id ? 'selected' : ''}`}
                  onClick={() => selectPlayer(player.id)}
                >
                  <div className="player-name">{player.username}</div>
                  <div className={`player-lives${attackedId === player.id ? ' attacked' : ''}`}>❤️ {player.lives}</div>
                  {player.username === username && (
                    <div className="player-role">역할: {player.role}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="action-area">
              {gameState.phase === 'day' && (
                <div className="day-actions">
                  <p>1분 30초간 대화 후 투표를 진행합니다.</p>
                  <button 
                    onClick={startVote}
                    disabled={gameState.voteUsed}
                    className={gameState.voteUsed ? 'disabled' : ''}
                  >
                    {gameState.voteUsed ? '투표 완료' : '투표 시작'}
                  </button>
                  {gameState.voteUsed && (
                    <p className="vote-notice">오늘은 이미 투표를 완료했습니다.</p>
                  )}
                </div>
              )}
              {/* 투표 팝업 */}
              {showVotePopup && (
                <div className="vote-popup" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#23272f', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.25)', textAlign: 'center', color: '#fff' }}>
                    <h3 style={{ color: '#fbbf24', marginBottom: 16 }}>투표</h3>
                    <div style={{ marginBottom: 16 }}>지목할 플레이어를 선택하세요.</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {gameState.players.filter(p => p.isAlive).map(p => (
                        <button key={p.id} onClick={() => setVoteTarget(p.id)} style={{ padding: 10, borderRadius: 8, border: voteTarget === p.id ? '2px solid #fbbf24' : '1px solid #333', background: voteTarget === p.id ? '#fbbf24' : '#23272f', color: voteTarget === p.id ? '#23272f' : '#fff', fontWeight: 600, cursor: 'pointer' }}>{p.username}</button>
                      ))}
                    </div>
                    <button onClick={submitVote} disabled={!voteTarget} style={{ padding: '10px 24px', background: '#fbbf24', color: '#23272f', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: voteTarget ? 'pointer' : 'not-allowed', opacity: voteTarget ? 1 : 0.5 }}>투표</button>
                  </div>
                </div>
              )}

              {gameState.phase === 'voting' && (
                <div className="voting-actions">
                  <p>투표할 플레이어를 선택하세요.</p>
                  <button onClick={executeVote} disabled={!gameState.selectedPlayer}>
                    투표 실행
                  </button>
                </div>
              )}

              {gameState.phase === 'night' && currentPlayerRole === 'mafia' && (
                <div className="mafia-actions">
                  <p>공격할 플레이어를 선택하세요.</p>
                  <button onClick={executeMafiaAttack} disabled={!gameState.selectedPlayer}>
                    공격 실행
                  </button>
                </div>
              )}

              {gameState.phase === 'doctor-healing' && currentPlayerRole === 'doctor' && (
                <div className="doctor-actions">
                  <p>치료할 플레이어를 선택하세요.</p>
                  <button onClick={executeDoctorHeal} disabled={!gameState.selectedPlayer}>
                    치료 실행
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="chat-area">
            <div className="messages" onScroll={handleScroll} style={{ position: 'relative' }}>
              {gameState.messages.map(message => (
                <div key={message.id} className={`message ${message.type}`}>
                  <span className="timestamp">
                    {typeof message.timestamp === 'string'
                      ? new Date(message.timestamp).toLocaleTimeString()
                      : message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.player && <span className="player">{message.player}: </span>}
                  <span className="content">{message.content}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
              {showScrollBtn && (
                <button onClick={scrollToBottom} style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 10, background: '#fbbf24', color: '#23272f', border: 'none', borderRadius: 20, padding: '8px 18px', fontWeight: 700, fontSize: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer' }}>
                  맨 아래로
                </button>
              )}
            </div>
            <div className="message-input">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="메시지를 입력하세요..."
              />
              <button onClick={sendMessage}>전송</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MafiaGame; 