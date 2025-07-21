import { useState, useEffect, useRef } from 'react';
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

  // Socket.IO 연결
  useEffect(() => {
    const socket = io('http://localhost:3001');
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
          voteUsed: false, // 새로운 날이 시작되면 투표 사용 가능
          messages: [...prev.messages, {
            id: Date.now().toString(),
            type: 'system',
            content: '게임이 시작되었습니다! 2분간 대화 후 밤이 됩니다.',
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
            p.id === data.targetId ? { ...p, isAlive: false, lives: 0 } : p
          );

          setGameState(prev => ({
            ...prev,
            players: updatedPlayers,
            voteUsed: true, // 투표 사용됨
            messages: [...prev.messages, {
              id: Date.now().toString(),
              type: 'vote',
              content: `${targetPlayer.username}이(가) 투표받아 사망했습니다.`,
              timestamp: new Date()
            }]
          }));

          checkGameEnd();
        }
        break;
      
      case 'attack':
        const attackedPlayer = gameState.players.find(p => p.id === data.targetId);
        if (!attackedPlayer) return;

        const updatedPlayersAfterAttack = gameState.players.map(p => {
          if (p.id === data.targetId) {
            const newLives = Math.max(0, p.lives - 1);
            return { ...p, lives: newLives, isAlive: newLives > 0 };
          }
          return p;
        });

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
        break;
      
      case 'heal':
        const healedPlayer = gameState.players.find(p => p.id === data.targetId);
        if (!healedPlayer) return;

        const updatedPlayersAfterHeal = gameState.players.map(p => {
          if (p.id === data.targetId) {
            const newLives = Math.min(3, p.lives + 1);
            return { ...p, lives: newLives, isAlive: newLives > 0 };
          }
          return p;
        });

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

  // 마피아 공격
  const executeMafiaAttack = () => {
    if (!gameState.selectedPlayer || !socketRef.current) return;

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

  return (
    <div className="mafia-game-container">
      <div className="game-header">
        <h2>🕵️ 마피아 게임</h2>
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
                  <div className="player-lives">❤️ {player.lives}</div>
                  {player.username === username && (
                    <div className="player-role">역할: {player.role}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="action-area">
              {gameState.phase === 'day' && (
                <div className="day-actions">
                  <p>2분간 대화 후 투표를 진행합니다.</p>
                  <button 
                    onClick={() => setGameState(prev => ({ ...prev, phase: 'voting' }))}
                    disabled={gameState.voteUsed} // 투표를 이미 사용했으면 비활성화
                    className={gameState.voteUsed ? 'disabled' : ''}
                  >
                    {gameState.voteUsed ? '투표 완료' : '투표 시작'}
                  </button>
                  {gameState.voteUsed && (
                    <p className="vote-notice">오늘은 이미 투표를 완료했습니다.</p>
                  )}
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
            <div className="messages">
              {gameState.messages.map(message => (
                <div key={message.id} className={`message ${message.type}`}>
                  <span className="timestamp">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.player && <span className="player">{message.player}: </span>}
                  <span className="content">{message.content}</span>
                </div>
              ))}
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