import { useState } from 'react'
import './App.css'
import Chat from './components/Chat'
import MafiaGame from './components/MafiaGame'
import LiarGame from './components/LiarGame'
import TelestrationsGame from './components/TelestrationsGame';

interface UserData {
  username: string;
  room: string;
  gameType: 'catchmind' | 'mafia' | 'liar' | 'telestrations';
}

function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedGame, setSelectedGame] = useState<'catchmind' | 'mafia' | 'liar' | 'telestrations' | null>(null);

  const handleGameSelection = (gameType: 'catchmind' | 'mafia' | 'liar' | 'telestrations') => {
    setSelectedGame(gameType);
  };

  const handleJoinChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const room = formData.get('room') as string;
    
    if (username.trim() && room.trim() && selectedGame) {
      setUserData({ username: username.trim(), room: room.trim(), gameType: selectedGame });
    }
  };

  const handleBackToGameSelection = () => {
    setSelectedGame(null);
    setUserData(null);
  };

  if (!selectedGame) {
    return (
      <div className="app">
        <div className="join-container">
          <h1>🎮</h1>
          <p>선택</p>
          
          <div className="game-selection">
            <button 
              className="game-option catchmind"
              onClick={() => handleGameSelection('catchmind')}
            >
              <div className="game-icon">🎨</div>
              <div className="game-info">
                <h3>캐치마인드</h3>
                <p>그림을 그리고 맞추기</p>
              </div>
            </button>
            
            <button 
              className="game-option mafia"
              onClick={() => handleGameSelection('mafia')}
            >
              <div className="game-icon">🕵️</div>
              <div className="game-info">
                <h3>마피아</h3>
                <p>마피아 찾기</p>
              </div>
            </button>

            <button
              className="game-option liar"
              onClick={() => handleGameSelection('liar')}
            >
              <div className="game-icon">🤥</div>
              <div className="game-info">
                <h3>라이어</h3>
                <p>한 명만 다른 제시어! 라이어를 찾아라</p>
              </div>
            </button>

            <button
              className="game-option telestrations"
              onClick={() => handleGameSelection('telestrations')}
            >
              <div className="game-icon">📝</div>
              <div className="game-info">
                <h3>텔레스트레이션</h3>
                <p>단어와 그림이 돌고 돌아!</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="app">
        <div className="join-container">
          <div className="game-header">
            <button className="back-button" onClick={handleBackToGameSelection}>
              ← 뒤로가기
            </button>
            <h1>
              {selectedGame === 'catchmind'
                ? '🎨 캐치마인드'
                : selectedGame === 'mafia'
                ? '🕵️ 마피아'
                : selectedGame === 'liar'
                ? '🤥 라이어'
                : '📝 텔레스트레이션'}
            </h1>
            <p>
              {selectedGame === 'catchmind'
                ? '그림을 그리고 맞추세요.'
                : selectedGame === 'mafia'
                  ? '마피아를 찾아내세요.'
                  : selectedGame === 'liar' ? '라이어를 찾아내세요.' : '단어와 그림이 돌고 도세요.'}
            </p>
          </div>
          
          <form onSubmit={handleJoinChat} className="join-form">
            <div className="form-group">
              <label htmlFor="username">사용자 이름</label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="사용자 이름을 입력하세요"
                required
                minLength={2}
                maxLength={20}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="room">방</label>
              <input
                type="text"
                id="room"
                name="room"
                placeholder="방 이름을 입력하세요"
                required
                minLength={2}
                maxLength={20}
              />
            </div>
            
            <button type="submit" className="join-button">
              입장
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {userData.gameType === 'catchmind' ? (
        <Chat username={userData.username} room={userData.room} />
      ) : userData.gameType === 'mafia' ? (
        <MafiaGame username={userData.username} room={userData.room} />
      ) : userData.gameType === 'liar' ? (
        <LiarGame username={userData.username} room={userData.room} />
      ) : (
        <TelestrationsGame username={userData.username} room={userData.room} />
      )}
    </div>
  );
}

export default App
