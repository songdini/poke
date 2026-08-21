<h1 align="center">
  🕹️ 두부네 오락실 (Poke Arcade)
</h1>

<p align="center">
  <b>웹 기반 실시간 멀티플레이어 & AI 오락실 플랫폼!</b>  
  <br/>
  React 19 + TypeScript + Socket.IO + Google Gemini AI 로 구현된 다양한 실시간 미니게임 🎯
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white"/>
  <img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
</p>

---

## 🚀 프로젝트 소개

**두부네 오락실**은 여러 유저가 웹 브라우저에서 실시간으로 함께 즐길 수 있는 미니게임 플랫폼입니다.  
사무실/학교에서도 티 안 나게 즐길 수 있는 **Excel Incognito(스텔스) 테마**와 **Google Gemini LLM 기반의 지능형 AI 봇**이 탑재되어 혼자서도, 친구들과도 몰입감 넘치는 플레이가 가능합니다.

---

## 🎮 제공 게임 라인업

| 게임 | 설명 | 특징 / 테마 |
|---|---|---|
| 🕵️ **마피아 게임** | 시민과 마피아 간의 고도의 심리 추리전 | **Gemini AI 봇 지원** (실시간 토론/투표/야간행동), 낮/밤 자동 진행, Excel 직급 감사 테마 |
| 🤥 **라이어 게임** | 제시어를 모르는 라이어를 색출하는 심리전 | **Gemini AI 봇 지원** (맥락 기반 은근한 힌트 & 블러핑), 국립국어원 사전 API 연동 |
| 💣 **지뢰찾기** | 9x9 ~ 16x30 그리드 리스크 분석 퍼즐 | Excel 시트 스타일, 3D 입체 셀 구분 및 **8색 고대비 숫자 팔레트** |
| ⚾ **숫자야구** | 4자리 중복 없는 숫자를 맞추는 뇌풀기 대결 | 1인/1v1 대결 모드, 본인/상대방 시도 행 시각적 구분, Excel 감사 테마 |
| ⚔️ **포켓몬 배틀** | 실시간 턴제 포켓몬 전략 배틀 | 타입 상성 매트릭스, **F4 비상 스텔스 모드**, 실시간 배틀 감사 로그 |
| 🟩 **워들 (Wordle)** | 5글자 영어 단어 추리 퍼즐 | 단어 유효성 검증, 실시간 스코어보드 |
| 🔢 **스도쿠** | 9x9 정통 스도쿠 퍼즐 | 셀 메모 기능, 난이도별 자동 생성 및 검증 |
| 🎨 **캐치마인드** | 실시간 캔버스에 그림을 그리고 맞추는 게임 | 실시간 획 동기화, 브러시/팔레트 도구, 자동 정답 판독기 |
| 💬 **실시간 채팅** | 게임 방 및 전체 실시간 메시징 | 스마트 스크롤 고정, 이모지 피커 지원 |

---

## 🧠 Google Gemini AI 엔진 (`server/src/aiService.js`)

마피아 및 라이어 게임에 **Google Gemini AI**를 탑재하여 실제 사람과 대화하는 듯한 심리전을 제공합니다.

- 🌐 **경량 REST API 직결**: 무거운 SDK 설치 없이 `axios`로 경량 REST API를 직접 호출하여 리눅스/도커 환경 의존성 문제 해결.
- ⚡ **지능형 속도 및 토큰 최적화**: 게임 대화에 최적화된 토큰 제한과 `thinkingBudget` 제어로 1~2초대 초고속 응답.
- 🛡️ **25초 쓰로틀링 & 429 Quota 방어**: 봇이 여러 명이어도 25초당 1개 봇만 순차적으로 API를 호출하도록 스케줄링하여 무료 티어 한도 초과(429) 원천 차단.
- 🧹 **다단계 JSON 복구 파서 & 메시지 정제기**: 따옴표 중복, 영문 생각 잔여물, 미완성 JSON을 실시간으로 감지하고 순수 한국어 대화로 자동 복구.

---

## 🛠️ 기술 스택

| 구분 | 기술 스택 |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 7, Lucide React, Emoji Picker React |
| **Backend** | Node.js, Express, Socket.IO 4, Axios |
| **AI / LLM** | Google Gemini REST API (`gemini-3.6-flash`, `gemini-2.0-flash` 등) |
| **Reverse Proxy** | Nginx (정적 파일 서빙, 캐시 제어, HTTP Polling & WebSocket 프로토콜 전환) |
| **Infrastructure** | Docker, Docker Compose, AWS EC2 |

---

## ⚡ 최근 주요 업데이트 내역

- 🤖 **Gemini AI 봇 심리전 & 발언 시스템 구축** (마피아 & 라이어 게임)
  - 봇들의 실시간 채팅 생성, 투표 타겟 추리, 라이어 게임 블러핑 & 힌트 발언 로직 탑재.
  - 전역 25초 안전 쓰로틀링 및 순차 턴 스케줄러를 적용하여 429 Rate Limit 원천 차단.
- 📱 **채팅 스마트 스크롤 & 리사이징 출렁임 해결**
  - `scrollIntoView` 대신 독립 컨테이너 `scrollTop` 스크롤 및 `overscroll-behavior: contain`을 적용하여 창 크기 조절 시 화면 튀김/점프 현상 완벽 방지.
- 🎨 **지뢰찾기 UI/UX 시각성 전면 개편**
  - 미개봉 셀(3D 입체 베벨)과 개봉 셀(플랫 화이트)의 명확한 시각적 분리.
  - 1번부터 8번까지 직관적이고 눈이 편안한 8가지 고대비 숫자 컬러 팔레트 적용.
- 🚀 **Docker 빌드 속도 95% 단축 & Nginx WebSocket 전환 안정화**
  - 타입체크와 빌드 스크립트 분리 및 `.dockerignore` 도입으로 빌드 타임 최적화.

---

## 📂 프로젝트 구조

```bash
poke/
 ├── src/                    # React 프론트엔드 소스코드
 │    ├── components/        # 각 게임 컴포넌트 (Mafia, Liar, Minesweeper, NumberBaseball, etc.)
 │    ├── context/           # SocketContext (실시간 소켓 연결 관리)
 │    ├── socketUrl.ts       # 소켓 서버 주소 동적 바인딩
 │    └── App.tsx            # 메인 앱 라우터
 ├── server/                 # Socket.IO 백엔드 서버
 │    ├── src/               # 게임 핸들러 및 서비스
 │    │    ├── socketHandlers/ # mafiaHandler, liarHandler, minesweeperHandler, etc.
 │    │    ├── aiService.js  # Google Gemini AI REST 연동 모듈
 │    │    └── dictionaryService.js # 국립국어원 사전 단어 연동
 │    ├── server.js          # Express & Socket.IO 엔트리포인트
 │    ├── .env.example       # 백엔드 환경변수 템플릿
 │    └── Dockerfile
 ├── nginx.conf              # Nginx 웹서버 & 역프록시 설정
 ├── docker-compose.yml      # 전체 서비스 컨테이너 오케스트레이션
 ├── .gitignore
 └── README.md
```

---

## 🏎️ 실행 및 배포 방법

### 1. 환경변수 설정
프로젝트 루트 또는 `server/` 디렉토리에 `.env` 파일을 생성합니다:
```env
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Google Gemini API 설정 (선택 사항: 미설정 시 기본 템플릿 봇으로 작동)
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
GEMINI_MODEL=gemini-3.6-flash
```

### 2. 로컬 개발 환경 실행
```bash
# 백엔드 서버 실행
cd server
npm install
npm run dev

# 프론트엔드 개발 서버 실행 (루트 디렉토리)
npm install
npm run dev
```

### 3. Docker Compose 배포
```bash
docker compose up -d --build
```
- 프론트엔드(Nginx): `http://localhost:80`
- 백엔드(Socket.IO): `http://localhost:3001` (Nginx 역프록시 `/socket.io/` 경유)
