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
  const isSwapped = Math.random() > 0.5;
  const citizenWord = isSwapped ? pair.liarWord : pair.citizenWord;
  const liarWord = isSwapped ? pair.citizenWord : pair.liarWord;

  return {
    citizenWord,
    liarWord,
    citizenDef: getWordDefinition(citizenWord),
    liarDef: getWordDefinition(liarWord)
  };
}

export const WORD_DEFINITIONS = {
  '사과': '사과나무의 열매. 겉은 붉거나 노랗고 맛은 달고 십니다.',
  '오렌지': '감귤류에 속하는 나무의 열매. 주황색으로 즙이 많고 달콤함.',
  '피자': '밀가루 반죽 위에 치즈와 고기, 야채 등을 얹어 구운 이탈리아 요리.',
  '햄버거': '빵 사이에 고기 패티와 야채, 소스를 넣은 샌드위치.',
  '짜장면': '춘장에 고기와 야채를 볶아 국수에 비벼 먹는 한국식 중화요리.',
  '짬뽕': '해물과 야채를 볶아 매콤한 국물에 국수를 말아 먹는 음식.',
  '호랑이': '고양이과의 맹수로 몸에 검은 줄무늬가 있는 대표적 야생 동물.',
  '사자': '고양이과의 맹수로 갈기가 웅장하며 백수의 왕이라 불리는 동물.',
  '고양이': '고양이과의 소형 육식 동물로 귀엽고 야행성인 가목 축용 동물.',
  '강아지': '개 새끼 또는 어린 개를 친근하게 이르는 말.',
  '아이폰': '애플사에서 개발하여 판매하는 스마트폰 브랜드.',
  '갤럭시': '삼성전자에서 제조하여 판매하는 스마트폰 라인업 브랜드.',
  '노트북': '휴대할 수 있도록 작고 가볍게 만든 개인용 컴퓨터.',
  '태블릿': '터치스크린을 사용하여 손가락이나 펜으로 조작하는 휴대용 컴퓨터.',
  '학교': '학생들이 모여 선생님에게 지식과 교양을 배우는 교육 기관.',
  '도서관': '책이나 각종 자료를 수집, 보관하여 일반인이 읽을 수 있게 한 시설.',
  '병원': '의사나 간호사가 환자의 질병을 진단하고 치료하는 의료 기관.',
  '약국': '약사가 약품을 조제하고 판매하며 복약 지도하는 장소.',
  '영화관': '영화를 영상 매체로 관객에게 상영하는 시설이나 극장.',
  '공연장': '음악회, 연극, 무용 등의 공연 예술이 이루어지는 무대 시설.',
  '축구': '열한 명씩 팀을 이루어 공을 차서 상대 골대에 넣는 경기.',
  '농구': '다섯 명씩 팀을 이루어 공을 손으로 던져 상대 바스켓에 넣는 경기.',
  '수영장': '인공적으로 물을 채워 수영을 할 수 있도록 만든 시설.',
  '해수욕장': '바닷가에 마련되어 피서객들이 수영과 휴식을 즐기는 장소.',
  '피아노': '건반을 누르면 건반에 연결된 망치가 현을 쳐서 소리를 내는 건반 악기.',
  '바이올린': '활을 켜서 현을 진동시켜 소리를 내는 찰현 현악기.',
  '지하철': '도시 지하의 궤도를 달리며 승객을 수송하는 전동차 교통 수단.',
  '버스': '많은 승객을 태우고 정해진 노선을 따라 운행하는 대형 자동차.',
  '아메리카노': '에스프레소에 물을 섞어 옅게 만든 커피 음료.',
  '카페라떼': '에스프레소에 따뜻한 우유를 섞어 만든 미드급 커피 음료.'
};

export function getWordDefinition(word, item = null) {
  if (item) {
    let def = '';
    if (typeof item.definition === 'string' && item.definition.trim()) {
      def = item.definition;
    } else if (item.sense) {
      if (Array.isArray(item.sense) && item.sense[0]?.definition) {
        def = item.sense[0].definition;
      } else if (typeof item.sense === 'object' && item.sense.definition) {
        def = item.sense.definition;
      }
    }
    if (def) {
      const cleaned = def.replace(/<[^>]*>/g, '').replace(/\^/g, '').trim();
      if (cleaned) return cleaned;
    }
  }

  if (WORD_DEFINITIONS[word]) {
    return WORD_DEFINITIONS[word];
  }

  return `${word}은(는) 사전에 등재된 단어입니다.`;
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

const COMMON_SEARCH_CHARS = [
  '가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하',
  '물', '산', '해', '달', '별', '꽃', '새', '말', '소', '개', '집', '길', '책', '밥',
  '약', '전', '차', '공', '원', '국', '학교', '동물', '음식', '운동', '나무', '하늘'
];

function parseDictionaryResponse(data) {
  let jsonObj = null;
  if (typeof data === 'object' && data !== null) {
    jsonObj = data;
  } else if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('{')) {
      try {
        jsonObj = JSON.parse(trimmed);
      } catch (e) {}
    }
  }

  // 1. JSON 구조 파싱
  if (jsonObj && jsonObj.channel) {
    const rawItems = jsonObj.channel.item || jsonObj.channel.items;
    if (Array.isArray(rawItems)) {
      return rawItems.map(item => {
        const word = (item.word || '').replace(/\^/g, '').trim();
        let definition = '';
        if (typeof item.definition === 'string') {
          definition = item.definition;
        } else if (item.sense) {
          if (Array.isArray(item.sense)) definition = item.sense[0]?.definition || '';
          else if (typeof item.sense === 'object') definition = item.sense.definition || '';
        }
        return { word, definition: definition.replace(/<[^>]*>/g, '').trim() };
      });
    }
  }

  // 2. XML 응답 폴백 파싱 (국립국어원 API가 XML 반환 시)
  if (typeof data === 'string' && data.includes('<item>')) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(data)) !== null) {
      const itemContent = match[1];
      const wordMatch = itemContent.match(/<word>([^<]+)<\/word>/);
      const defMatch = itemContent.match(/<definition>([^<]+)<\/definition>/);
      if (wordMatch) {
        const word = wordMatch[1].replace(/\^/g, '').trim();
        const definition = defMatch ? defMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        items.push({ word, definition });
      }
    }
    return items;
  }

  return [];
}

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
    console.warn('[LiarGame] KOREAN_DICT_API_KEY 환경변수가 설정되지 않아 오프라인 단어 세트를 사용합니다.');
    return getRandomFallbackPair();
  }

  const MAX_ATTEMPTS = 3;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const randomQuery = COMMON_SEARCH_CHARS[Math.floor(Math.random() * COMMON_SEARCH_CHARS.length)];
      
      const response = await axios.get('https://opendict.korean.go.kr/api/search', {
        params: {
          key: API_KEY,
          req_type: 'json',
          type1: 'word',
          target: 1,
          num: 100,
          start: 1,
          advanced: 'y',
          q: randomQuery,
          part: 'word',
          sort: 'dict',
          method: 'include'
        },
        timeout: 4000
      });

      // API 에러 응답(Unregistered key 등) 감지
      if (typeof response.data === 'string' && response.data.includes('<error>')) {
        const errCodeMatch = response.data.match(/<error_code>([^<]+)<\/error_code>/);
        const errMsgMatch = response.data.match(/<message>([^<]+)<\/message>/);
        const code = errCodeMatch ? errCodeMatch[1] : 'Unknown';
        const msg = errMsgMatch ? errMsgMatch[1] : 'API Error';
        console.error(`[LiarGame API Error] 국립국어원 API 에러 (코드: ${code}, 메시지: ${msg})`);
        break;
      }

      const items = parseDictionaryResponse(response.data);
      if (!items || items.length < 2) {
        continue;
      }

      const validItems = items.filter(item => {
        return item.word.length >= 2 && item.word.length <= 4 && /^[가-힣]+$/.test(item.word);
      });

      if (validItems.length >= 2) {
        const shuffled = validItems.sort(() => 0.5 - Math.random());
        const item1 = shuffled[0];
        const item2 = shuffled[1];
        const word1 = item1.word;
        const word2 = item2.word;
        const def1 = getWordDefinition(word1, item1);
        const def2 = getWordDefinition(word2, item2);

        circuitState = CircuitState.CLOSED;
        consecutiveFailures = 0;

        console.log(`[LiarGame API Success] 외장 API 단어 조회 성공: "${word1}" vs "${word2}"`);

        return Math.random() > 0.5
          ? { citizenWord: word1, liarWord: word2, citizenDef: def1, liarDef: def2 }
          : { citizenWord: word2, liarWord: word1, citizenDef: def2, liarDef: def1 };
      }
    } catch (error) {
      console.warn(`[LiarGame API Attempt Failed] 시도 ${i+1}/${MAX_ATTEMPTS}: ${error.message}`);
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

