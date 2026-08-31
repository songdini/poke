import { useState, useEffect } from 'react';
import './App.css';
import Chat from './components/Chat';
import MafiaGame from './components/MafiaGame';
import LiarGame from './components/LiarGame';
import TelestrationsGame from './components/TelestrationsGame';
import NumberBaseballGame from './components/NumberBaseballGame';
import SudokuGame from './components/SudokuGame';
import MinesweeperGame from './components/MinesweeperGame';
import WordleGame from './components/WordleGame';
import PokeBattle from './components/PokeBattle';
import { PokeFarmGame } from './components/PokeFarmGame';
import TetrisGame from './components/TetrisGame';
import BossScreen from './components/BossScreen';
import { SocketProvider } from './context/SocketContext';

export type GameKey =
  | 'pokefarm'
  | 'pokebattle'
  | 'catchmind'
  | 'mafia'
  | 'liar'
  | 'telestrations'
  | 'numberbaseball'
  | 'sudoku'
  | 'minesweeper'
  | 'wordle'
  | 'tetris';

export interface GameSession {
  username: string;
  room: string;
  gameType: GameKey;
}

export interface GameMeta {
  key: GameKey;
  name: string;
  excelName: string;
  icon: string;
  desc: string;
  badge: string;
  themeColor: string;
}

export const GAMES_LIST: GameMeta[] = [
  {
    key: 'pokefarm',
    name: '두부월드 미니홈피 (포켓농장)',
    excelName: 'Dubuworld_Minihompy_Lifecycle.xlsx',
    icon: '🏠',
    desc: '아기 포켓몬 육성 & 두부월드 미니룸 스티커 꾸미기 & 1촌 파도타기',
    badge: 'MAIN',
    themeColor: '#10b981'
  },
  {
    key: 'pokebattle',
    name: '포켓몬 3v3 배틀',
    excelName: 'PokeBattle_3v3_Simulation.xlsx',
    icon: '⚡',
    desc: '3대3 턴제 실시간 포켓몬 대전 & 타입 상성 배틀',
    badge: 'HOT',
    themeColor: '#ef4444'
  },
  {
    key: 'catchmind',
    name: '캐치마인드',
    excelName: 'Catchmind_Draw_Analytics.csv',
    icon: '🎨',
    desc: '실시간 그림 그리고 단어 맞추기 멀티 게임',
    badge: 'POPULAR',
    themeColor: '#3b82f6'
  },
  {
    key: 'mafia',
    name: '마피아 게임',
    excelName: 'Mafia_Role_Audit_Log.xlsx',
    icon: '🕵️',
    desc: '직업 부여, 밤/낮 투표, 심리 추리 생존전',
    badge: 'MULTI',
    themeColor: '#8b5cf6'
  },
  {
    key: 'liar',
    name: '라이어 게임',
    excelName: 'Liar_Keyword_CrossCheck.xlsx',
    icon: '🤥',
    desc: '제시어를 모르는 라이어를 찾는 심리 단어게임',
    badge: 'PARTY',
    themeColor: '#ec4899'
  },
  {
    key: 'telestrations',
    name: '텔레스트레이션',
    excelName: 'Telestrations_Sequence_Map.xlsx',
    icon: '📝',
    desc: '그림 릴레이! 그리고 맞추는 릴레이 스케치',
    badge: 'FUN',
    themeColor: '#f59e0b'
  },
  {
    key: 'numberbaseball',
    name: '숫자야구',
    excelName: 'NumberBaseball_BullsCows_Audit.xlsx',
    icon: '⚾',
    desc: '3자리 숫자 추리! 스트라이크 & 볼 수리 검증',
    badge: 'LOGIC',
    themeColor: '#10b981'
  },
  {
    key: 'sudoku',
    name: '스도쿠',
    excelName: 'Sudoku_Matrix_Solver.xlsx',
    icon: '🧩',
    desc: '9x9 행렬 스도쿠 퍼즐 마스터',
    badge: 'PUZZLE',
    themeColor: '#06b6d4'
  },
  {
    key: 'minesweeper',
    name: '지뢰찾기',
    excelName: 'Minesweeper_Grid_Risk_Analysis.xlsx',
    icon: '💣',
    desc: '클래식 지뢰 탐지 & 그리드 생존 게임',
    badge: 'RETRO',
    themeColor: '#f97316'
  },
  {
    key: 'wordle',
    name: '워들 (Wordle)',
    excelName: 'Wordle_Text_Parser_2026.xlsx',
    icon: '🔤',
    desc: '5글자 비밀 단어 추정 퍼즐',
    badge: 'WORD',
    themeColor: '#64748b'
  },
  {
    key: 'tetris',
    name: '포켓 테트리스',
    excelName: 'Tetris_Block_Matrix_Optimization.xlsx',
    icon: '🧱',
    desc: '점수 기록, AI & 친구 1:1 대전, 아이템전 & 실시간 공격 배틀',
    badge: 'HOT',
    themeColor: '#6366f1'
  }
];

function AppMain() {
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('poke_active_game') as GameKey;
      if (saved) return saved;
    }
    return 'pokefarm';
  });
  const [isBossMode, setIsBossMode] = useState(false);
  const [visitingFarmUser, setVisitingFarmUser] = useState<string | null>(null);

  const [formUsername, setFormUsername] = useState('');
  const [formRoom, setFormRoom] = useState('');

  const [gameSessions, setGameSessions] = useState<Record<GameKey, GameSession | null>>(() => {
    const savedOwner = (typeof window !== 'undefined' && localStorage.getItem('pokefarm_saved_owner')) || '지우';
    return {
      pokefarm: { username: savedOwner, room: 'local', gameType: 'pokefarm' },
      catchmind: null,
      mafia: null,
      liar: null,
      telestrations: null,
      numberbaseball: null,
      sudoku: null,
      minesweeper: null,
      wordle: null,
      pokebattle: null,
      tetris: null
    };
  });

  // 🚨 Emergency Boss Key Keyboard Listener (F2 or ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || e.key === 'Escape') {
        e.preventDefault();
        setIsBossMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGameSelection = (gameType: GameKey) => {
    setSelectedGame(gameType);
    localStorage.setItem('poke_active_game', gameType);
    if (gameType === 'pokefarm') {
      // 🌟 기존에 육성하던 농장주 이름 우선 복원
      const farmUser = localStorage.getItem('pokefarm_saved_owner') || formUsername.trim() || '지우';
      localStorage.setItem('pokefarm_saved_owner', farmUser);
      setGameSessions(prev => ({
        ...prev,
        pokefarm: { username: farmUser, room: 'local', gameType: 'pokefarm' }
      }));
    }
  };

  const handleJoinChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = ((formData.get('username') as string) || formUsername).trim();
    const room = ((formData.get('room') as string) || formRoom).trim();

    if (username && room && selectedGame) {
      setGameSessions(prev => ({
        ...prev,
        [selectedGame]: { username, room, gameType: selectedGame }
      }));
    }
  };

  const handleLeaveGame = (gameKey: GameKey) => {
    if (selectedGame === gameKey) {
      localStorage.removeItem('poke_active_game');
    }
    setGameSessions(prev => ({
      ...prev,
      [gameKey]: null
    }));
  };

  const generateRandomName = () => {
    const randId = Math.floor(100 + Math.random() * 900);
    setFormUsername(`유저_${randId}`);
  };

  const generateRandomRoom = () => {
    const randRoom = Math.floor(100 + Math.random() * 900);
    setFormRoom(`ROOM_${randRoom}`);
  };

  const handleUserLogin = (user: string) => {
    localStorage.setItem('pokefarm_saved_owner', user);
    setFormUsername(user);
    setGameSessions(prev => ({
      ...prev,
      pokefarm: { username: user, room: 'local', gameType: 'pokefarm' }
    }));
  };

  const handleUserLogout = () => {
    localStorage.removeItem('pokefarm_saved_owner');
    setGameSessions(prev => ({
      ...prev,
      pokefarm: { username: '', room: 'local', gameType: 'pokefarm' }
    }));
  };

  const renderActiveGameViewport = () => {
    if (!selectedGame) return null;
    const currentMeta = GAMES_LIST.find(g => g.key === selectedGame);
    return (
      <div className="dubu-game-viewport">
        {selectedGame !== 'pokefarm' && (
          <div className="game-global-topbar">
            <button className="topbar-home-btn" onClick={() => handleGameSelection('pokefarm')}>
              🏠 두부 미니홈피로 돌아가기
            </button>
            <div className="topbar-game-tag">
              <span className="topbar-game-icon">{currentMeta?.icon}</span>
              <span className="topbar-game-name">{currentMeta?.name}</span>
            </div>
            <div className="topbar-switch-box">
              <select
                value={selectedGame}
                onChange={(e) => handleGameSelection(e.target.value as GameKey)}
                className="topbar-game-select"
              >
                {GAMES_LIST.map(g => (
                  <option key={g.key} value={g.key}>
                    {g.icon} {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div style={{ display: selectedGame === 'pokefarm' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.pokefarm && (
            <PokeFarmGame
              username={gameSessions.pokefarm.username}
              initialVisitingUser={visitingFarmUser}
              onClearInitialVisitingUser={() => setVisitingFarmUser(null)}
              onLeaveRoom={() => handleLeaveGame('pokefarm')}
              onSelectGame={(gameKey) => handleGameSelection(gameKey as GameKey)}
              onUserLogin={handleUserLogin}
              onUserLogout={handleUserLogout}
            />
          )}
        </div>
        <div style={{ display: selectedGame === 'catchmind' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.catchmind && (
            <Chat username={gameSessions.catchmind.username} room={gameSessions.catchmind.room} onLeaveRoom={() => handleLeaveGame('catchmind')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'mafia' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.mafia && (
            <MafiaGame username={gameSessions.mafia.username} room={gameSessions.mafia.room} onLeaveRoom={() => handleLeaveGame('mafia')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'liar' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.liar && (
            <LiarGame username={gameSessions.liar.username} room={gameSessions.liar.room} onLeaveRoom={() => handleLeaveGame('liar')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'telestrations' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.telestrations && (
            <TelestrationsGame username={gameSessions.telestrations.username} room={gameSessions.telestrations.room} onLeaveRoom={() => handleLeaveGame('telestrations')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'numberbaseball' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.numberbaseball && (
            <NumberBaseballGame username={gameSessions.numberbaseball.username} room={gameSessions.numberbaseball.room} onLeaveRoom={() => handleLeaveGame('numberbaseball')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'sudoku' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.sudoku && (
            <SudokuGame username={gameSessions.sudoku.username} room={gameSessions.sudoku.room} onLeaveRoom={() => handleLeaveGame('sudoku')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'minesweeper' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.minesweeper && (
            <MinesweeperGame username={gameSessions.minesweeper.username} room={gameSessions.minesweeper.room} onLeaveRoom={() => handleLeaveGame('minesweeper')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'wordle' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.wordle && (
            <WordleGame username={gameSessions.wordle.username} room={gameSessions.wordle.room} onLeaveRoom={() => handleLeaveGame('wordle')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'pokebattle' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.pokebattle && (
            <PokeBattle username={gameSessions.pokebattle.username} room={gameSessions.pokebattle.room} onLeaveRoom={() => handleLeaveGame('pokebattle')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'tetris' ? 'block' : 'none', minHeight: '100%', width: '100%' }}>
          {gameSessions.tetris && (
            <TetrisGame username={gameSessions.tetris.username} room={gameSessions.tetris.room} onLeaveRoom={() => handleLeaveGame('tetris')} />
          )}
        </div>
      </div>
    );
  };

  /* ----------------------------------------------------
   * 🌟 MODERN CLEAN JOIN CARD (No Excel theme)
   * ---------------------------------------------------- */
  const renderGameJoinCard = (gameMeta: GameMeta) => {
    return (
      <div className="dubu-join-container">
        <div className="dubu-join-card">
          <div className="dubu-join-header" style={{ borderBottomColor: gameMeta.themeColor }}>
            <div className="dubu-join-icon" style={{ background: gameMeta.themeColor }}>
              {gameMeta.icon}
            </div>
            <div className="dubu-join-title-box">
              <h2>{gameMeta.name}</h2>
              <p>{gameMeta.desc}</p>
            </div>
            <button className="dubu-card-back-btn" onClick={() => handleGameSelection('pokefarm')}>
              🏠 미니홈피로
            </button>
          </div>

          <form onSubmit={handleJoinChat} className="dubu-join-form">
            <div className="dubu-form-group">
              <div className="dubu-label-row">
                <label htmlFor="dubu-username">👤 플레이어 닉네임</label>
                <button
                  type="button"
                  className="dubu-quick-btn"
                  onClick={generateRandomName}
                >
                  🎲 랜덤 닉네임
                </button>
              </div>
              <input
                type="text"
                id="dubu-username"
                name="username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="닉네임을 입력하세요 (2~100자)"
                required
                minLength={2}
                maxLength={100}
                autoComplete="off"
              />
            </div>

            <div className="dubu-form-group">
              <div className="dubu-label-row">
                <label htmlFor="dubu-room">🔑 방 코드 (Room Code)</label>
                <button
                  type="button"
                  className="dubu-quick-btn"
                  onClick={generateRandomRoom}
                >
                  🎲 방 코드 생성
                </button>
              </div>
              <input
                type="text"
                id="dubu-room"
                name="room"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                placeholder="입장할 방 코드를 입력하세요 (예: ROOM_101)"
                required
                minLength={2}
                maxLength={100}
                autoComplete="off"
              />
            </div>

            <div className="dubu-join-actions">
              <button
                type="submit"
                className="dubu-btn primary"
                style={{ background: gameMeta.themeColor || '#10b981' }}
              >
                🚀 게임 방 입장하기
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  /* ----------------------------------------------------
   * 🌟 MODERN ALL GAMES GRID VIEW (오락실 목록)
   * ---------------------------------------------------- */
  const renderAllGamesGridView = () => {
    return (
      <div className="dubu-all-games-container">
        <div className="dubu-all-games-hero">
          <div className="dubu-hero-badge">🎮 DUBU ARCADE</div>
          <h2>두부월드 오락실 & 미니게임 천국</h2>
          <p>포켓몬 3v3 배틀부터 테트리스, 캐치마인드, 마피아까지 10종의 실시간 멀티게임을 즐겨보세요!</p>
        </div>

        <div className="dubu-games-cards-grid">
          {GAMES_LIST.map((game) => {
            const hasSession = !!gameSessions[game.key];
            const isSelected = selectedGame === game.key;
            return (
              <div
                key={game.key}
                className={`dubu-game-card ${isSelected ? 'selected' : ''} ${hasSession ? 'has-session' : ''}`}
                onClick={() => handleGameSelection(game.key)}
              >
                <div className="dubu-card-header">
                  <div className="dubu-card-icon" style={{ background: game.themeColor }}>
                    {game.icon}
                  </div>
                  <span className={`dubu-badge ${hasSession ? 'active' : ''}`}>
                    {hasSession ? '● 플레이중' : game.badge}
                  </span>
                </div>
                <div className="dubu-card-body">
                  <h3>{game.name}</h3>
                  <p>{game.desc}</p>
                </div>
                <div className="dubu-card-footer">
                  <span>{hasSession ? '세션 바로가기' : '플레이하기'}</span>
                  <span className="arrow">➔</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const currentMeta = selectedGame ? GAMES_LIST.find(g => g.key === selectedGame) : null;
  const currentSession = selectedGame ? gameSessions[selectedGame] : null;
  const currentSavedOwner = (typeof window !== 'undefined' && localStorage.getItem('pokefarm_saved_owner')) || '지우';
  const isGamePlaying = Boolean(selectedGame && selectedGame !== 'pokefarm' && currentSession);

  return (
    <div className={`dubu-portal-app ${isGamePlaying ? 'is-game-playing' : ''}`}>
      {/* 🚨 Emergency Boss Key Screen Overlay */}
      {isBossMode && <BossScreen onToggle={() => setIsBossMode(false)} />}

      {/* 🌟 Global Sleek Portal Header */}
      <header className="dubu-portal-navbar">
        <div className="navbar-brand-section" onClick={() => handleGameSelection('pokefarm')}>
          <span className="navbar-logo">🏡</span>
          <div className="navbar-brand-text">
            <h1 className="navbar-title">
              두부월드 <span className="navbar-accent">& 오락실</span>
            </h1>
            <span className="navbar-subtitle">DUBUWORLD METAVERSE</span>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <nav className="navbar-nav-tabs">
          <button
            className={`navbar-tab ${selectedGame === 'pokefarm' ? 'active' : ''}`}
            onClick={() => handleGameSelection('pokefarm')}
          >
            🏠 두부 미니홈피
          </button>
          <button
            className={`navbar-tab ${!selectedGame ? 'active' : ''}`}
            onClick={() => setSelectedGame(null)}
          >
            🎮 두부 오락실 (10종)
          </button>
          {selectedGame && selectedGame !== 'pokefarm' && (
            <div className="navbar-active-game-pill" style={{ borderColor: currentMeta?.themeColor }}>
              <span className="game-dot" style={{ background: currentMeta?.themeColor }}>
                ●
              </span>
              <span>
                {currentMeta?.icon} {currentMeta?.name}
              </span>
              <button
                className="pill-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGameSelection('pokefarm');
                }}
                title="미니홈피로 돌아가기"
              >
                ✕
              </button>
            </div>
          )}
        </nav>

        {/* Right User Status & Actions */}
        <div className="navbar-right-section">
          <button
            className="navbar-boss-btn"
            onClick={() => setIsBossMode(true)}
            title="긴급 화면 가리기 (F2 / ESC)"
          >
            ⚡ 긴급 화면 가리기
          </button>
          <div className="navbar-user-chip">
            <span className="user-icon">👤</span>
            <span className="user-name">{currentSavedOwner}</span>
          </div>
        </div>
      </header>

      {/* 🌟 Main Responsive Viewport */}
      <main className="dubu-main-viewport">
        {!selectedGame ? (
          renderAllGamesGridView()
        ) : selectedGame === 'pokefarm' ? (
          renderActiveGameViewport()
        ) : !currentSession ? (
          renderGameJoinCard(currentMeta || GAMES_LIST[0])
        ) : (
          renderActiveGameViewport()
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <SocketProvider>
      <AppMain />
    </SocketProvider>
  );
}

export default App;
