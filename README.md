<h1 align="center">
  🕹️ 두부네 오락실 (Poke Arcade)
</h1>

<p align="center">
  <b>웹 기반 실시간 멀티플레이어 오락실 프로젝트!</b>  
  <br/>
  React 19 + TypeScript + Socket.IO 로 구현된 다양한 실시간 미니게임 플랫폼 🎯
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white"/>
  <img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
</p>

---

## 🚀 프로젝트 소개

**두부네 오락실**은 여러 유저가 웹 브라우저에서 실시간으로 함께 즐길 수 있는 미니게임 플랫폼입니다.  
사무실/학교에서도 티 안 나게 즐길 수 있는 **스텔스 테마(Excel 스타일 등)**와 풍부한 실시간 인터랙션을 제공합니다.

---

## 🎮 제공 게임 및 주요 기능

| 게임 | 설명 | 특징 / 테마 |
|---|---|---|
| ⚾ **숫자야구** | 4자리 중복 없는 숫자를 맞추는 뇌풀기 추리 게임 | **Excel 스텔스 테마**, 1인/1v1 대결 모드, 본인/상대방 시도 행 시각적 구분 |
| 🕵️ **마피아 게임** | 시민과 마피아 간의 대화 및 심리전 게임 | 마피아, 시민, 경찰, 의사, 조커 역할, 낮/밤 상태 자동 진행 및 투표 |
| 🤥 **라이어 게임** | 제시어를 모르는 라이어를 찾아내는 심리 추리 게임 | 카테고리별 제시어 지원, 라이어 지목 및 제시어 역전 시스템 |
| 🎨 **텔레스트레이션** | 실시간 캔버스에 그림을 그리고 단어를 맞추는 게임 | 실시간 그림 동기화, 브러시/색상 조절, 자동 정답 체크 |
| 💬 **실시간 채팅** | 게임 방 및 전체 실시간 메시징 | 이모지 피커 지원, 반응형 디자인 |

---

## 🛠️ 기술 스택

| 구분 | 기술 스택 |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 7, Lucide React, Emoji Picker React |
| **Backend** | Node.js, Express, Socket.IO 4 |
| **Reverse Proxy** | Nginx (정적 파일 서빙, 캐시 제어, HTTP Polling & WebSocket 프로토콜 전환) |
| **Infrastructure** | Docker, Docker Compose, AWS EC2 |

---

## ⚡ 최근 주요 업데이트 및 최적화 사항

- 🚀 **Docker 컨테이너 빌드 프로세스 최적화**
  - Dockerfile 멀티스테이지 빌드 시 `RUN npm run build:docker`로 타입체크를 분리하여 저사양 서버(EC2)에서 빌드 시간을 **95% 이상 단축 (5분+ ➔ 몇 초)**.
- 🐳 **`.dockerignore` 도입**
  - `node_modules`, `dist`, `.git` 등 불필요한 대용량 파일이 빌드 컨텍스트로 전달되는 것을 방지하여 빌드 속도 및 이미지 용량 최적화.
- 🌐 **Nginx 역프록시 & WebSocket 연결 문제 해결**
  - `map $http_upgrade $connection_upgrade` 구문을 추가하여 Socket.IO의 HTTP Long-Polling 요청과 WebSocket Upgrade 요청을 동적으로 안전하게 처리 (400 Bad Request 해결).
- 🔒 **CORS Origin 검증 보완**
  - 호스트 주소 끝의 슬래시(`/`) 정제 처리 및 `.env` 파일 기반의 `ALLOWED_ORIGINS` 동적 지원 추가.
- 🎨 **숫자야구 UI/UX 개선**
  - Excel 스텔스 테마 적용 및 **본인(내) 입력 행과 상대방 입력 행의 배경색/뱃지 시각적 구분** 추가.

---

## 📂 프로젝트 구조

```bash
poke/
 ├── src/                    # React 프론트엔드 소스코드
 │    ├── components/        # 각 게임 컴포넌트 (NumberBaseball, Mafia, Liar, Telestrations, Chat)
 │    ├── context/           # SocketContext (실시간 소켓 연결 관리)
 │    ├── socketUrl.ts       # 소켓 서버 주소 동적 바인딩
 │    └── App.tsx            # 메인 앱 및 라우팅
 ├── server/                 # Socket.IO 백엔드 서버
 │    ├── src/               # 게임 로직 및 소켓 이벤트 핸들러
 │    ├── server.js          # Express & Socket.IO 서버 진입점
 │    └── Dockerfile
 ├── public/                 # 정적 에셋
 ├── nginx.conf              # Nginx 웹서버 & 역프록시 설정
 ├── Dockerfile              # 프론트엔드 Nginx 멀티스테이지 빌드
 ├── docker-compose.yml      # 전체 서비스 오케스트레이션
 ├── .dockerignore
 └── README.md
```

---

## 🏎️ 실행 및 배포 방법

### 1. 로컬 개발 환경 실행
```bash
# 백엔드 서버 실행
cd server
npm install
npm run dev

# 프론트엔드 개발 서버 실행 (루트 디렉토리)
npm install
npm run dev
```

### 2. Docker Compose 배포
```bash
docker compose up -d --build
```
- 프론트엔드(Nginx)는 `http://localhost:80` (또는 EC2 IP)에서 실행됩니다.
- 백엔드(Socket.IO)는 `http://localhost:3001` 포트를 사용하며 Nginx 역프록시(`/socket.io/`)를 통해 연결됩니다.
