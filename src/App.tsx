import { useState, useEffect } from 'react'
import './App.css'
import Chat from './components/Chat'
import MafiaGame from './components/MafiaGame'
import LiarGame from './components/LiarGame'
import TelestrationsGame from './components/TelestrationsGame';
import NumberBaseballGame from './components/NumberBaseballGame';
import SudokuGame from './components/SudokuGame';
import MinesweeperGame from './components/MinesweeperGame';
import WordleGame from './components/WordleGame';
import PokeBattle from './components/PokeBattle';
import BossScreen from './components/BossScreen';
import { SocketProvider } from './context/SocketContext';

type GameKey = 'catchmind' | 'mafia' | 'liar' | 'telestrations' | 'numberbaseball' | 'sudoku' | 'minesweeper' | 'wordle' | 'pokebattle';

interface GameSession {
  username: string;
  room: string;
  gameType: GameKey;
}

interface GameMeta {
  key: GameKey;
  name: string;
  excelName: string;
  icon: string;
  desc: string;
  badge: string;
  themeColor: string;
}

const GAMES_LIST: GameMeta[] = [
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
  }
];

function App() {
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(null);
  const [activeTab, setActiveTab] = useState('Home');
  const [isBossMode, setIsBossMode] = useState(false);

  // Default to Mobile UI if screen width <= 768px
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  const [formUsername, setFormUsername] = useState('');
  const [formRoom, setFormRoom] = useState('');

  const [gameSessions, setGameSessions] = useState<Record<GameKey, GameSession | null>>({
    catchmind: null,
    mafia: null,
    liar: null,
    telestrations: null,
    numberbaseball: null,
    sudoku: null,
    minesweeper: null,
    wordle: null,
    pokebattle: null
  });

  // Handle window resize auto-switch if user hasn't explicitly set preference
  useEffect(() => {
    const handleResize = () => {
      // Auto adjust if screen is resized
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setGameSessions(prev => ({
      ...prev,
      [gameKey]: null
    }));
  };

  const handleBackToMainSheet = () => {
    setSelectedGame(null);
  };

  const generateRandomName = () => {
    const randId = Math.floor(100 + Math.random() * 900);
    setFormUsername(`유저_${randId}`);
  };

  const generateRandomRoom = () => {
    setFormRoom('ROOM1');
  };

  const renderActiveGameViewport = () => {
    if (!selectedGame) return null;
    return (
      <div className={`excel-game-viewport ${isMobileMode ? 'mobile-game-viewport' : ''}`}>
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
      </div>
    );
  };

  /* ----------------------------------------------------
   * 📱 MOBILE UI LAYOUT
   * ---------------------------------------------------- */
  const renderMobileUI = () => {
    const currentMeta = selectedGame ? GAMES_LIST.find(g => g.key === selectedGame) : null;
    const currentSession = selectedGame ? gameSessions[selectedGame] : null;

    return (
      <div className="mobile-app-window">
        {/* Mobile Modern Header */}
        <header className="mobile-header">
          <div className="mobile-header-left">
            {selectedGame ? (
              <button className="mobile-back-btn" onClick={handleBackToMainSheet}>
                ◀ 목록
              </button>
            ) : (
              <div className="mobile-app-brand">
                <span className="brand-logo">🎮</span>
                <span className="brand-title">POKE PLAY</span>
              </div>
            )}
          </div>

          <div className="mobile-header-center">
            <span className="mobile-header-game-title">
              {currentMeta ? `${currentMeta.icon} ${currentMeta.name}` : '모바일 멀티 게임 센터'}
            </span>
          </div>

          <div className="mobile-header-right">
            <button
              className="mobile-mode-toggle-btn"
              onClick={() => setIsMobileMode(false)}
              title="컴퓨터용 엑셀위장 모드로 전환"
            >
              💻 엑셀위장
            </button>
            <button
              className="mobile-boss-btn"
              onClick={() => setIsBossMode(true)}
              title="긴급 화면 가리기 (F2)"
            >
              ⚡
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Scroll Active Session Bar */}
        <nav className="mobile-sessions-nav">
          <button
            className={`mobile-nav-chip ${!selectedGame ? 'active' : ''}`}
            onClick={handleBackToMainSheet}
          >
            🏠 게임 선택
          </button>
          {GAMES_LIST.map((game) => {
            const hasSession = !!gameSessions[game.key];
            const isSelected = selectedGame === game.key;
            return (
              <button
                key={game.key}
                className={`mobile-nav-chip ${isSelected ? 'active' : ''} ${hasSession ? 'has-session' : ''}`}
                onClick={() => handleGameSelection(game.key)}
              >
                <span>{game.icon} {game.name}</span>
                {hasSession && <span className="mobile-live-dot">●</span>}
              </button>
            );
          })}
        </nav>

        {/* Mobile Main Body */}
        <main className="mobile-main-body">
          {!selectedGame ? (
            /* 1. Mobile Home Game Cards Grid */
            <div className="mobile-home-container">
              <div className="mobile-hero-banner">
                <div className="mobile-hero-tag">📱 MOBILE MODE</div>
                <h2>즐거운 멀티게임 라이브</h2>
                <p>터치로 간편하게 즐기는 9가지 게임 파티!</p>
              </div>

              <div className="mobile-game-grid">
                {GAMES_LIST.map((game) => {
                  const hasSession = !!gameSessions[game.key];
                  return (
                    <div
                      key={game.key}
                      className={`mobile-game-card ${hasSession ? 'has-active-session' : ''}`}
                      onClick={() => handleGameSelection(game.key)}
                    >
                      <div className="mobile-card-top">
                        <div className="mobile-card-icon-box" style={{ background: game.themeColor }}>
                          <span>{game.icon}</span>
                        </div>
                        <span className={`mobile-badge ${hasSession ? 'active-badge' : ''}`}>
                          {hasSession ? '● 플레이중' : game.badge}
                        </span>
                      </div>
                      <div className="mobile-card-body">
                        <h3>{game.name}</h3>
                        <p>{game.desc}</p>
                      </div>
                      <div className="mobile-card-footer">
                        <span>{hasSession ? '게임 세션 입장' : '입장하기'}</span>
                        <span className="arrow">➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !currentSession ? (
            /* 2. Mobile Join Room Form View */
            <div className="mobile-join-container">
              <div className="mobile-join-card">
                <button className="mobile-card-close-btn" onClick={handleBackToMainSheet}>
                  ✕
                </button>
                <div className="mobile-join-header" style={{ borderBottomColor: currentMeta?.themeColor }}>
                  <div className="mobile-join-icon" style={{ background: currentMeta?.themeColor }}>
                    {currentMeta?.icon}
                  </div>
                  <h2>{currentMeta?.name}</h2>
                  <p>{currentMeta?.desc}</p>
                </div>

                <form onSubmit={handleJoinChat} className="mobile-join-form">
                  <div className="mobile-form-group">
                    <div className="mobile-label-row">
                      <label htmlFor="mobile-username">닉네임 / ID</label>
                      <button
                        type="button"
                        className="mobile-quick-fill-btn"
                        onClick={generateRandomName}
                      >
                        🎲 랜덤 ID 생성
                      </button>
                    </div>
                    <input
                      type="text"
                      id="mobile-username"
                      name="username"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="닉네임을 입력하세요 (2~20자)"
                      required
                      minLength={2}
                      maxLength={20}
                      autoComplete="off"
                    />
                  </div>

                  <div className="mobile-form-group">
                    <div className="mobile-label-row">
                      <label htmlFor="mobile-room">방 코드 (Room Code)</label>
                      <button
                        type="button"
                        className="mobile-quick-fill-btn"
                        onClick={generateRandomRoom}
                      >
                        🔑 ROOM1 채우기
                      </button>
                    </div>
                    <input
                      type="text"
                      id="mobile-room"
                      name="room"
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      placeholder="방 코드를 입력하세요 (예: ROOM1)"
                      required
                      minLength={2}
                      maxLength={20}
                      autoComplete="off"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mobile-join-submit-btn"
                    style={{ background: currentMeta?.themeColor || '#10b981' }}
                  >
                    🚀 게임 시작하기
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* 3. Mobile Game Viewport View */
            renderActiveGameViewport()
          )}
        </main>
      </div>
    );
  };

  /* ----------------------------------------------------
   * 💻 EXCEL STEALTH DESKTOP LAYOUT
   * ---------------------------------------------------- */
  const renderDesktopExcelContent = () => {
    if (!selectedGame) {
      return (
        <div className="excel-sheet-content">
          <div className="excel-banner">
            <h2>📊 Q3_Quarterly_Financial_Report_2026.xlsx</h2>
            <p>Worksheet: Select Task Module / Data Table to Execute</p>
          </div>
          
          <div className="game-selection">
            {GAMES_LIST.map((game, idx) => {
              const hasSession = !!gameSessions[game.key];
              const modCode = `MOD_0${idx + 1}`;
              return (
                <button
                  key={game.key}
                  className={`game-option ${game.key} ${hasSession ? 'has-active-session' : ''}`}
                  onClick={() => handleGameSelection(game.key)}
                >
                  <div className="game-icon">{game.icon}</div>
                  <div className="game-info">
                    <h3>Table 0{idx + 1}: {game.excelName}</h3>
                    <p>{game.desc} | Status: {hasSession ? '● LIVE SESSION ACTIVE' : 'Ready'}</p>
                  </div>
                  <span className="excel-cell-tag">{hasSession ? 'ACTIVE' : modCode}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    const currentSession = gameSessions[selectedGame];

    if (!currentSession) {
      const meta = GAMES_LIST.find(g => g.key === selectedGame);
      return (
        <div className="excel-sheet-content">
          <div className="game-header">
            <button className="back-button" onClick={handleBackToMainSheet}>
              ◀ Return to Main Sheet (Ctrl+Z)
            </button>
            <h1>
              {meta ? `${meta.icon} ${meta.excelName}` : 'Excel Worksheet'}
            </h1>
            <p className="excel-subtext">
              Enter User Credentials and Workgroup Session Key to Load Cell Data:
            </p>
          </div>
          
          <form onSubmit={handleJoinChat} className="join-form">
            <div className="form-group">
              <label htmlFor="username">User_ID (Cell B2)</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="e.g. Employee_1042"
                required
                minLength={2}
                maxLength={20}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="room">Workgroup_ID / Room_Code (Cell B3)</label>
              <input
                type="text"
                id="room"
                name="room"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                placeholder="e.g. FIN_DEPT_01"
                required
                minLength={2}
                maxLength={20}
              />
            </div>
            
            <button type="submit" className="join-button">
              ▶ Load Worksheet Data (Enter)
            </button>
          </form>
        </div>
      );
    }

    return renderActiveGameViewport();
  };

  return (
    <SocketProvider>
      {/* 🚨 Emergency Boss Key Screen Overlay */}
      {isBossMode && <BossScreen onToggle={() => setIsBossMode(false)} />}

      {isMobileMode ? (
        renderMobileUI()
      ) : (
        <div className="excel-app-window">
          {/* Excel Top Title Bar */}
          <div className="excel-title-bar">
            <div className="excel-title-left">
              <span className="excel-app-icon">📊</span>
              <span className="excel-doc-title">Q3_Quarterly_Financial_Report_2026.xlsx - Excel</span>
              <span className="excel-autosave">AutoSave <span className="excel-toggle-on">ON</span></span>
            </div>
            <div className="excel-title-center">
              <div className="excel-search-box">
                <span>🔍 Search (Alt+Q)</span>
              </div>
            </div>
            <div className="excel-title-right">
              <button
                onClick={() => setIsMobileMode(true)}
                style={{
                  background: '#047857',
                  color: '#ffffff',
                  border: '1px solid #6ee7b7',
                  padding: '2px 8px',
                  borderRadius: '2px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginRight: '6px'
                }}
                title="모바일 전용 UI 화면으로 전환"
              >
                📱 모바일 UI 모드
              </button>
              <button
                onClick={() => setIsBossMode(true)}
                style={{
                  background: '#0b5a2f',
                  color: '#ffffff',
                  border: '1px solid #8bf7b5',
                  padding: '2px 8px',
                  borderRadius: '2px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginRight: '6px'
                }}
                title="긴급 보스키 (F2 / ESC)"
              >
                ⚡ Stealth View (F2)
              </button>
              <span className="excel-user-profile">👤 KIMSJ (Corp)</span>
              <div className="excel-window-controls">
                <span>─</span>
                <span>🗖</span>
                <span className="close-btn">✕</span>
              </div>
            </div>
          </div>

          {/* Excel Ribbon Tabs */}
          <div className="excel-ribbon-tabs">
            {['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Automate', 'Help'].map((tab) => (
              <button
                key={tab}
                className={`ribbon-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Excel Ribbon Toolbar Icons */}
          <div className="excel-ribbon-toolbar">
            <div className="toolbar-group">
              <span className="toolbar-btn">📋 Paste</span>
              <span className="toolbar-btn">✂️ Cut</span>
              <span className="toolbar-btn">📄 Copy</span>
            </div>
            <div className="toolbar-separator" />
            <div className="toolbar-group">
              <select className="excel-font-select" defaultValue="Segoe UI">
                <option value="Segoe UI">Segoe UI</option>
                <option value="Calibri">Calibri</option>
                <option value="Aptos">Aptos</option>
                <option value="Arial">Arial</option>
              </select>
              <select className="excel-size-select" defaultValue="11">
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
              </select>
              <button className="toolbar-tool-btn bold">B</button>
              <button className="toolbar-tool-btn italic">I</button>
              <button className="toolbar-tool-btn underline">U</button>
              <button className="toolbar-tool-btn fill">🪣</button>
              <button className="toolbar-tool-btn color">🎨</button>
            </div>
            <div className="toolbar-separator" />
            <div className="toolbar-group">
              <button className="toolbar-tool-btn">≡</button>
              <button className="toolbar-tool-btn">≡</button>
              <button className="toolbar-tool-btn">Merge & Center ▾</button>
            </div>
            <div className="toolbar-separator" />
            <div className="toolbar-group">
              <span className="toolbar-btn">📊 Conditional Formatting</span>
              <span className="toolbar-btn">▦ Format as Table</span>
            </div>
          </div>

          {/* Excel Formula Bar */}
          <div className="excel-formula-bar">
            <div className="excel-name-box">B4</div>
            <div className="excel-fx-btn">fx</div>
            <div className="excel-formula-input">
              {selectedGame
                ? `=VLOOKUP("${selectedGame.toUpperCase()}", WORKGROUP_DATA, 2, FALSE)`
                : `=SUM(A1:B100)`}
            </div>
          </div>

          {/* Excel Sheet Body Container */}
          <div className="excel-body-container">
            {/* Column Header Row */}
            <div className="excel-col-headers">
              <div className="col-header-corner"></div>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'].map((col) => (
                <div key={col} className="col-header-cell">{col}</div>
              ))}
            </div>

            {/* Main Grid View */}
            <div className="excel-grid-workspace">
              <div className="excel-row-numbers">
                {Array.from({ length: 25 }, (_, i) => (
                  <div key={i} className="row-number-cell">{i + 1}</div>
                ))}
              </div>
              <div className="excel-main-content-cell">
                {renderDesktopExcelContent()}
              </div>
            </div>
          </div>

          {/* Excel Sheet Tabs Footer */}
          <div className="excel-sheet-footer">
            <div className="excel-sheet-tabs">
              <button
                className={`sheet-tab ${!selectedGame ? 'active' : ''}`}
                onClick={handleBackToMainSheet}
              >
                📊 Sheet1 - Summary
              </button>
              {GAMES_LIST.map((game, idx) => {
                const hasSession = !!gameSessions[game.key];
                const isSelected = selectedGame === game.key;
                return (
                  <button
                    key={game.key}
                    className={`sheet-tab ${isSelected ? 'active' : ''} ${hasSession ? 'has-session' : ''}`}
                    onClick={() => handleGameSelection(game.key)}
                  >
                    {game.icon} Sheet{idx + 2} - {game.name} {hasSession && <span className="tab-live-dot">●</span>}
                  </button>
                );
              })}
              <span className="new-sheet-btn">➕</span>
            </div>

            <div className="excel-status-bar">
              <span className="status-item">Ready</span>
              <span className="status-item">⚡ Calculation: Automatic</span>
              <span className="status-item">AVERAGE: 4,892.10</span>
              <span className="status-item">COUNT: 14</span>
              <span className="status-item">SUM: $128,450.00</span>
              <div className="zoom-slider">
                <span>100%</span>
                <input type="range" min="50" max="200" defaultValue="100" />
              </div>
            </div>
          </div>
        </div>
      )}
    </SocketProvider>
  );
}

export default App
