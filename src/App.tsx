import { useState } from 'react'
import './App.css'
import Chat from './components/Chat'

interface UserData {
  username: string;
  room: string;
}

function App() {
  const [userData, setUserData] = useState<UserData | null>(null);

  const handleJoinChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const room = formData.get('room') as string;
    
    if (username.trim() && room.trim()) {
      setUserData({ username: username.trim(), room: room.trim() });
    }
  };

  if (!userData) {
    return (
      <div className="app">
        <div className="join-container">
          <h1>💬 실시간 채팅</h1>
          <p>채팅방에 입장하려면 정보를 입력해주세요.</p>
          
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
              <label htmlFor="room">채팅방</label>
              <input
                type="text"
                id="room"
                name="room"
                placeholder="채팅방 이름을 입력하세요"
                required
                minLength={2}
                maxLength={20}
              />
            </div>
            
            <button type="submit" className="join-button">
              채팅방 입장
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Chat username={userData.username} room={userData.room} />
    </div>
  );
}

export default App
