import axios from 'axios';

// 📚 다양하고 재미있는 오프라인 폴백 단어 세트
const FALLBACK_WORD_PAIRS = [
  { citizenWord: '사과', liarWord: '오렌지' },
  { citizenWord: '피자', liarWord: '햄버거' },
  { citizenWord: '짜장면', liarWord: '짬뽕' },
  { citizenWord: '호랑이', liarWord: '사자' },
  { citizenWord: '고양이', liarWord: '강아지' },
  { citizenWord: '아이폰', liarWord: '갤럭시' },
  { citizenWord: '노트북', liarWord: '태블릿' },
  { citizenWord: '학교', liarWord: '도서관' },
  { citizenWord: '병원', liarWord: '약국' },
  { citizenWord: '영화관', liarWord: '공연장' },
  { citizenWord: '축구', liarWord: '농구' },
  { citizenWord: '수영장', liarWord: '해수욕장' },
  { citizenWord: '피아노', liarWord: '바이올린' },
  { citizenWord: '지하철', liarWord: '버스' },
  { citizenWord: '아메리카노', liarWord: '카페라떼' }
];

// ⚡ 서킷 브레이커 상태 관리
const CircuitState = {
  CLOSED: 'CLOSED',       // 정상 작동 (API 호출)
  OPEN: 'OPEN',           // 서킷 차단됨 (API 호출 차단 & 오프라인 즉시 반환)
  HALF_OPEN: 'HALF_OPEN'   // 시범 테스트 중
};

let circuitState = CircuitState.CLOSED;
let consecutiveFailures = 0;
let lastFailureTime = 0;

const FAILURE_THRESHOLD = 3;      // 3회 연속 실패 시 차단
const COOLDOWN_MS = 60 * 1000;    // 1분간 차단 유효

function getRandomFallbackPair() {
  const randomIndex = Math.floor(Math.random() * FALLBACK_WORD_PAIRS.length);
  const pair = FALLBACK_WORD_PAIRS[randomIndex];
  return Math.random() > 0.5
    ? pair
    : { citizenWord: pair.liarWord, liarWord: pair.citizenWord };
}

export const generateRandomKoreanWord = (length = 3) => {
  const chosung = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  const jungsung = [
    'ㅏ', 'ㅐ', 'ㅑ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
    'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
  ];
  const jongsung = ['', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ'];

  const jungsungUnicodeIndex = [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20];
  const jongsungUnicodeIndex = [0, 1, 4, 7, 8, 16, 17, 19, 21, 22];

  let word = '';
  for (let i = 0; i < length; i++) {
    const cho = chosung[Math.floor(Math.random() * chosung.length)];
    const jungIndex = Math.floor(Math.random() * jungsung.length);
    const jongIndex = Math.floor(Math.random() * jongsung.length);

    const chosungIndex = chosung.indexOf(cho);
    const jungsungIndex = jungsungUnicodeIndex[jungIndex];
    const jongsungIndex = jongsungUnicodeIndex[jongIndex];
    
    const unicode = 0xAC00 + (chosungIndex * 588) + (jungsungIndex * 28) + jongsungIndex;
    word += String.fromCharCode(unicode);
  }
  return word;
};

export const getLiarGameWords = async () => {
  const now = Date.now();

  // 1. 서킷 차단(OPEN) 상태 검사
  if (circuitState === CircuitState.OPEN) {
    if (now - lastFailureTime > COOLDOWN_MS) {
      console.log('[Circuit Breaker] 1분 경과로 HALF_OPEN 상태로 진입하여 시범 API 조회를 시작합니다.');
      circuitState = CircuitState.HALF_OPEN;
    } else {
      console.log('[Circuit Breaker] API 차단 유지 중. 오프라인 단어 세트를 즉시 반환합니다.');
      return getRandomFallbackPair();
    }
  }

  const API_KEY = process.env.KOREAN_DICT_API_KEY;
  if (!API_KEY) {
    console.error('KOREAN_DICT_API_KEY가 설정되지 않았습니다.');
    return getRandomFallbackPair();
  }

  const MAX_ATTEMPTS = 3;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const randomCat = Math.floor(Math.random() * 68);
      const randomWord = generateRandomKoreanWord(1);
    
      const response = await axios.get('https://opendict.korean.go.kr/api/search', {
        params: {
          key: API_KEY,
          req_type: 'json',
          type1: 'word',
          target: 1,
          cat: randomCat,
          num: 100,
          start: 1,
          advanced: 'y',
          q: randomWord,
          part: 'word',
          sort: 'dict',
          letter_s: 2,
          method: 'include',
        },
        timeout: 1500
      });

      const items = response.data?.channel?.item;
      if (!items || !Array.isArray(items) || items.length < 2) {
        continue;
      }

      const validWords = items
        .map(item => item.word.replace(/\^/g, ''))
        .filter(word => 
          word.length >= 2 && 
          word.length <= 4 && 
          /^[가-힣]+$/.test(word)
        );
      
      if (validWords.length >= 2) {
        const shuffled = validWords.sort(() => 0.5 - Math.random());
        const word1 = shuffled[0];
        const word2 = shuffled[1];

        // 성공 시 서킷 브레이커 리셋
        circuitState = CircuitState.CLOSED;
        consecutiveFailures = 0;

        return Math.random() > 0.5
          ? { citizenWord: word1, liarWord: word2 }
          : { citizenWord: word2, liarWord: word1 };
      }
    } catch (error) {
      // 개별 요청 에러 발생 시 반복 진행
    }
  }

  // API 3회 시도 모두 실패 시 서킷 트립 처리
  consecutiveFailures++;
  lastFailureTime = Date.now();

  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitState = CircuitState.OPEN;
    console.warn(`[Circuit Breaker] 외장 API 연속 ${consecutiveFailures}회 실패. 1분간 서킷을 OPEN(차단)합니다.`);
  } else {
    console.warn(`[LiarGame] API 단어 가져오기 실패 (${consecutiveFailures}/${FAILURE_THRESHOLD}). 오프라인 단어 세트를 사용합니다.`);
  }

  return getRandomFallbackPair();
};
