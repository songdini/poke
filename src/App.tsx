import { useState } from 'react'
import './App.css'
import Chat from './components/Chat'
import MafiaGame from './components/MafiaGame'
import LiarGame from './components/LiarGame'
import TelestrationsGame from './components/TelestrationsGame';
import NumberBaseballGame from './components/NumberBaseballGame';
import SudokuGame from './components/SudokuGame';
import { SocketProvider } from './context/SocketContext';

type GameKey = 'catchmind' | 'mafia' | 'liar' | 'telestrations' | 'numberbaseball' | 'sudoku';

interface GameSession {
  username: string;
  room: string;
  gameType: GameKey;
}

function App() {
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(null);
  const [activeTab, setActiveTab] = useState('Home');
  const [gameSessions, setGameSessions] = useState<Record<GameKey, GameSession | null>>({
    catchmind: null,
    mafia: null,
    liar: null,
    telestrations: null,
    numberbaseball: null,
    sudoku: null
  });

  const handleGameSelection = (gameType: GameKey) => {
    setSelectedGame(gameType);
  };

  const handleJoinChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string).trim();
    const room = (formData.get('room') as string).trim();
    
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

  const renderContent = () => {
    if (!selectedGame) {
      return (
        <div className="excel-sheet-content">
          <div className="excel-banner">
            <h2>📊 Q3_Quarterly_Financial_Report_2026.xlsx</h2>
            <p>Worksheet: Select Task Module / Data Table to Execute</p>
          </div>
          
          <div className="game-selection">
            <button 
              className={`game-option catchmind ${gameSessions.catchmind ? 'has-active-session' : ''}`}
              onClick={() => handleGameSelection('catchmind')}
            >
              <div className="game-icon">📊</div>
              <div className="game-info">
                <h3>Table 01: Catchmind_Draw_Analytics.csv</h3>
                <p>Drawing Canvas & Visual Matcher | Status: {gameSessions.catchmind ? '● LIVE SESSION ACTIVE' : 'Ready'}</p>
              </div>
              <span className="excel-cell-tag">{gameSessions.catchmind ? 'ACTIVE' : 'MOD_01'}</span>
            </button>
            
            <button 
              className={`game-option mafia ${gameSessions.mafia ? 'has-active-session' : ''}`}
              onClick={() => handleGameSelection('mafia')}
            >
              <div className="game-icon">📋</div>
              <div className="game-info">
                <h3>Table 02: Mafia_Role_Audit_Log.xlsx</h3>
                <p>Confidential Role Verification & Elimination Log | Status: {gameSessions.mafia ? '● LIVE SESSION ACTIVE' : 'Ready'}</p>
              </div>
              <span className="excel-cell-tag">{gameSessions.mafia ? 'ACTIVE' : 'MOD_02'}</span>
            </button>

            <button
              className={`game-option liar ${gameSessions.liar ? 'has-active-session' : ''}`}
              onClick={() => handleGameSelection('liar')}
            >
              <div className="game-icon">📈</div>
              <div className="game-info">
                <h3>Table 03: Liar_Keyword_CrossCheck.xlsx</h3>
                <p>Anomalous Value Detector & Interrogation Sheet | Status: {gameSessions.liar ? '● LIVE SESSION ACTIVE' : 'Ready'}</p>
              </div>
              <span className="excel-cell-tag">{gameSessions.liar ? 'ACTIVE' : 'MOD_03'}</span>
            </button>

            <button
              className={`game-option telestrations ${gameSessions.telestrations ? 'has-active-session' : ''}`}
              onClick={() => handleGameSelection('telestrations')}
            >
              <div className="game-icon">📑</div>
              <div className="game-info">
                <h3>Table 04: Telestrations_Sequence_Map.xlsx</h3>
                <p>Sequential Data Propagation & Image Chain | Status: {gameSessions.telestrations ? '● LIVE SESSION ACTIVE' : 'Ready'}</p>
              </div>
              <span className="excel-cell-tag">{gameSessions.telestrations ? 'ACTIVE' : 'MOD_04'}</span>
            </button>

            <button
              className={`game-option numberbaseball ${gameSessions.numberbaseball ? 'has-active-session' : ''}`}
              onClick={() => handleGameSelection('numberbaseball')}
            >
              <div className="game-icon">⚾</div>
              <div className="game-info">
                <h3>Table 05: NumberBaseball_BullsCows_Audit.xlsx</h3>
                <p>3-Digit Deductive Math & Logic Audit | Status: {gameSessions.numberbaseball ? '● LIVE SESSION ACTIVE' : 'Ready'}</p>
              </div>
              <span className="excel-cell-tag">{gameSessions.numberbaseball ? 'ACTIVE' : 'MOD_05'}</span>
            </button>

            <button
              className={`game-option sudoku ${gameSessions.sudoku ? 'has-active-session' : ''}`}
              onClick={() => handleGameSelection('sudoku')}
            >
              <div className="game-icon">🧩</div>
              <div className="game-info">
                <h3>Table 06: Sudoku_Matrix_Solver.xlsx</h3>
                <p>9x9 Grid Deductive Logic & Matrix Solver | Status: {gameSessions.sudoku ? '● LIVE SESSION ACTIVE' : 'Ready'}</p>
              </div>
              <span className="excel-cell-tag">{gameSessions.sudoku ? 'ACTIVE' : 'MOD_06'}</span>
            </button>
          </div>
        </div>
      );
    }

    const currentSession = gameSessions[selectedGame];

    if (!currentSession) {
      return (
        <div className="excel-sheet-content">
          <div className="game-header">
            <button className="back-button" onClick={handleBackToMainSheet}>
              ◀ Return to Main Sheet (Ctrl+Z)
            </button>
            <h1>
              {selectedGame === 'catchmind'
                ? '📊 Catchmind_Draw_Analytics.csv'
                : selectedGame === 'mafia'
                ? '📋 Mafia_Role_Audit_Log.xlsx'
                : selectedGame === 'liar'
                ? '📈 Liar_Keyword_CrossCheck.xlsx'
                : selectedGame === 'telestrations'
                ? '📑 Telestrations_Sequence_Map.xlsx'
                : selectedGame === 'numberbaseball'
                ? '⚾ NumberBaseball_BullsCows_Audit.xlsx'
                : '🧩 Sudoku_Matrix_Solver.xlsx'}
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

    return (
      <div className="excel-game-viewport">
        <div style={{ display: selectedGame === 'catchmind' ? 'block' : 'none', height: '100%' }}>
          {gameSessions.catchmind && (
            <Chat username={gameSessions.catchmind.username} room={gameSessions.catchmind.room} onLeaveRoom={() => handleLeaveGame('catchmind')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'mafia' ? 'block' : 'none', height: '100%' }}>
          {gameSessions.mafia && (
            <MafiaGame username={gameSessions.mafia.username} room={gameSessions.mafia.room} onLeaveRoom={() => handleLeaveGame('mafia')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'liar' ? 'block' : 'none', height: '100%' }}>
          {gameSessions.liar && (
            <LiarGame username={gameSessions.liar.username} room={gameSessions.liar.room} onLeaveRoom={() => handleLeaveGame('liar')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'telestrations' ? 'block' : 'none', height: '100%' }}>
          {gameSessions.telestrations && (
            <TelestrationsGame username={gameSessions.telestrations.username} room={gameSessions.telestrations.room} onLeaveRoom={() => handleLeaveGame('telestrations')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'numberbaseball' ? 'block' : 'none', height: '100%' }}>
          {gameSessions.numberbaseball && (
            <NumberBaseballGame username={gameSessions.numberbaseball.username} room={gameSessions.numberbaseball.room} onLeaveRoom={() => handleLeaveGame('numberbaseball')} />
          )}
        </div>
        <div style={{ display: selectedGame === 'sudoku' ? 'block' : 'none', height: '100%' }}>
          {gameSessions.sudoku && (
            <SudokuGame username={gameSessions.sudoku.username} room={gameSessions.sudoku.room} onLeaveRoom={() => handleLeaveGame('sudoku')} />
          )}
        </div>
      </div>
    );
  };

  return (
    <SocketProvider>
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
            <button className="toolbar-tool-btn">equiv;</button>
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
              {renderContent()}
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
            <button
              className={`sheet-tab ${selectedGame === 'catchmind' ? 'active' : ''} ${gameSessions.catchmind ? 'has-session' : ''}`}
              onClick={() => handleGameSelection('catchmind')}
            >
              🎨 Sheet2 - Catchmind {gameSessions.catchmind && <span className="tab-live-dot">●</span>}
            </button>
            <button
              className={`sheet-tab ${selectedGame === 'mafia' ? 'active' : ''} ${gameSessions.mafia ? 'has-session' : ''}`}
              onClick={() => handleGameSelection('mafia')}
            >
              🕵️ Sheet3 - Mafia {gameSessions.mafia && <span className="tab-live-dot">●</span>}
            </button>
            <button
              className={`sheet-tab ${selectedGame === 'liar' ? 'active' : ''} ${gameSessions.liar ? 'has-session' : ''}`}
              onClick={() => handleGameSelection('liar')}
            >
              🤥 Sheet4 - Liar {gameSessions.liar && <span className="tab-live-dot">●</span>}
            </button>
            <button
              className={`sheet-tab ${selectedGame === 'telestrations' ? 'active' : ''} ${gameSessions.telestrations ? 'has-session' : ''}`}
              onClick={() => handleGameSelection('telestrations')}
            >
              📝 Sheet5 - Telestrations {gameSessions.telestrations && <span className="tab-live-dot">●</span>}
            </button>
            <button
              className={`sheet-tab ${selectedGame === 'numberbaseball' ? 'active' : ''} ${gameSessions.numberbaseball ? 'has-session' : ''}`}
              onClick={() => handleGameSelection('numberbaseball')}
            >
              ⚾ Sheet6 - 숫자야구 {gameSessions.numberbaseball && <span className="tab-live-dot">●</span>}
            </button>
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
    </SocketProvider>
  );
}

export default App
