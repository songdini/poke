import type { FarmPokemon, EvolutionStage, FarmItem, PartTimeJob, FarmState } from '../types/farm';

export const FARM_STORAGE_KEY = 'pokefarm_save_data_v1';

// 🌟 스타팅 및 분양 가능 포켓몬 진화 체인 목록
export const STARTER_CHAINS: EvolutionStage[][] = [
  // 1. 피츄 ➔ 피카츄 ➔ 라이츄
  [
    {
      id: 172,
      name: '피츄',
      minLevel: 1,
      minHappiness: 0,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/172.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/172.gif'
    },
    {
      id: 25,
      name: '피카츄',
      minLevel: 15,
      minHappiness: 50,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif'
    },
    {
      id: 26,
      name: '라이츄',
      minLevel: 36,
      minHappiness: 80,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/26.gif'
    }
  ],

  // 2. 파이리 ➔ 리자드 ➔ 리자몽
  [
    {
      id: 4,
      name: '파이리',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/4.gif'
    },
    {
      id: 5,
      name: '리자드',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/5.gif'
    },
    {
      id: 6,
      name: '리자몽',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif'
    }
  ],

  // 3. 꼬부기 ➔ 어니부기 ➔ 거북왕
  [
    {
      id: 7,
      name: '꼬부기',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif'
    },
    {
      id: 8,
      name: '어니부기',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/8.gif'
    },
    {
      id: 9,
      name: '거북왕',
      minLevel: 36,
      minHappiness: 80,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/9.gif'
    }
  ],

  // 4. 이상해씨 ➔ 이상해풀 ➔ 이상해꽃
  [
    {
      id: 1,
      name: '이상해씨',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif'
    },
    {
      id: 2,
      name: '이상해풀',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/2.gif'
    },
    {
      id: 3,
      name: '이상해꽃',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/3.gif'
    }
  ],

  // 5. 이브이 ➔ 님피아
  [
    {
      id: 133,
      name: '이브이',
      minLevel: 1,
      minHappiness: 0,
      types: ['normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/133.gif'
    },
    {
      id: 700,
      name: '님피아',
      minLevel: 25,
      minHappiness: 70,
      types: ['fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/700.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/700.gif'
    }
  ],

  // 6. 잉어킹 ➔ 갸라도스 (대기만성)
  [
    {
      id: 129,
      name: '잉어킹',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/129.gif'
    },
    {
      id: 130,
      name: '갸라도스',
      minLevel: 20,
      minHappiness: 50,
      types: ['water', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/130.gif'
    }
  ],

  // 7. 팽도리 ➔ 팽태자 ➔ 엠페르트
  [
    {
      id: 393,
      name: '팽도리',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/393.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/393.gif'
    },
    {
      id: 394,
      name: '팽태자',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/394.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/394.gif'
    },
    {
      id: 395,
      name: '엠페르트',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'steel'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/395.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/395.gif'
    }
  ],

  // 8. 개구마르 ➔ 개굴반장 ➔ 개굴닌자
  [
    {
      id: 656,
      name: '개구마르',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/656.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/656.gif'
    },
    {
      id: 657,
      name: '개굴반장',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/657.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/657.gif'
    },
    {
      id: 658,
      name: '개굴닌자',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'dark'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/658.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/658.gif'
    }
  ],

  // 9. 리오르 ➔ 루카리오
  [
    {
      id: 447,
      name: '리오르',
      minLevel: 1,
      minHappiness: 0,
      types: ['fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/447.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/447.gif'
    },
    {
      id: 448,
      name: '루카리오',
      minLevel: 30,
      minHappiness: 75,
      types: ['fighting', 'steel'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/448.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/448.gif'
    }
  ],

  // 10. 아차모 ➔ 영치코 ➔ 번치코
  [
    {
      id: 255,
      name: '아차모',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/255.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/255.gif'
    },
    {
      id: 256,
      name: '영치코',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/256.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/256.gif'
    },
    {
      id: 257,
      name: '번치코',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/257.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/257.gif'
    }
  ]
];

// 🍎 농장 상점 아이템 도감
export const FARM_ITEMS: FarmItem[] = [
  {
    id: 'oran_berry',
    name: '오랭열매',
    icon: '🫐',
    category: 'food',
    description: '달콤한 파란색 나무열매. 배고픔을 30 회복하고 소량의 경험치를 줍니다.',
    price: 30,
    effect: { hunger: 30, happiness: 10, exp: 25 }
  },
  {
    id: 'sitrus_berry',
    name: '자뭉열매',
    icon: '🍊',
    category: 'food',
    description: '풍부한 과즙의 영양 만점 열매. 배고픔을 60 회복하고 경험치를 크게 올립니다.',
    price: 60,
    effect: { hunger: 60, happiness: 20, exp: 60 }
  },
  {
    id: 'poffin_cake',
    name: '포핀 케이크',
    icon: '🍰',
    category: 'food',
    description: '포켓몬이 가장 좋아하는 최고급 디저트. 배고픔과 행복도를 대폭 채워줍니다.',
    price: 150,
    effect: { hunger: 100, happiness: 50, exp: 150 }
  },
  {
    id: 'mild_soap',
    name: '향기로운 거품비누',
    icon: '🧼',
    category: 'bath',
    description: '보글보글 부드러운 거품으로 몸을 씻겨줍니다. 청결도 50 상승.',
    price: 40,
    effect: { cleanliness: 50, happiness: 15, exp: 20 }
  },
  {
    id: 'fluffy_brush',
    name: '푹신푹신 빗',
    icon: '🪮',
    category: 'bath',
    description: '부드러운 빗질로 털을 가꿔줍니다. 청결도 100 & 친밀도 30 상승.',
    price: 90,
    effect: { cleanliness: 100, happiness: 35, exp: 50 }
  },
  {
    id: 'toy_ball',
    name: '몬스터볼 장난감',
    icon: '⚽',
    category: 'toy',
    description: '신나게 튀어오르는 탱탱볼. 재미있게 놀아주어 행복도와 경험치를 올립니다.',
    price: 50,
    effect: { happiness: 40, energy: -15, exp: 45 }
  },
  {
    id: 'energy_drink',
    name: '포켓몬 비타민 드링크',
    icon: '🧪',
    category: 'medicine',
    description: '지친 포켓몬의 기력을 채워주는 에너지 음료. 에너지 80 회복.',
    price: 80,
    effect: { energy: 80, happiness: 10 }
  },
  {
    id: 'full_heal',
    name: '만병통치 상처약',
    icon: '💊',
    category: 'medicine',
    description: '모든 상태이상을 완벽 치료하고 모든 게이지를 100으로 완전 회복시킵니다.',
    price: 200,
    effect: { hunger: 100, happiness: 100, cleanliness: 100, energy: 100, exp: 100 }
  }
];

// 💼 동물농장 스타일 포켓몬 아르바이트 목록
export const FARM_JOBS: PartTimeJob[] = [
  {
    id: 'job_garden',
    title: '사내 화단 물주기 알바',
    icon: '🌱',
    desc: '예쁜 꽃밭에 물을 흠뻑 주고 잔디를 정리합니다.',
    rewardCoins: 80,
    expReward: 40,
    energyCost: 20,
    hungerCost: 15,
    cleanlinessCost: 20,
    minLevel: 1
  },
  {
    id: 'job_mail',
    title: '사내 긴급 우편물 배달',
    icon: '📬',
    desc: '층마다 중요한 서류 봉투를 신속하게 전달합니다.',
    rewardCoins: 120,
    expReward: 60,
    energyCost: 30,
    hungerCost: 25,
    cleanlinessCost: 15,
    minLevel: 5
  },
  {
    id: 'job_coffee',
    title: '탕비실 스페셜 원두 로스팅',
    icon: '☕',
    desc: '회사 임직원들을 위한 고소한 원두를 볶고 음료를 준비합니다.',
    rewardCoins: 180,
    expReward: 90,
    energyCost: 40,
    hungerCost: 30,
    cleanlinessCost: 25,
    minLevel: 12
  },
  {
    id: 'job_generator',
    title: '데이터센터 비상 발전기 가동',
    icon: '⚡',
    desc: '대규모 전산망 유지를 위해 비상 전력을 힘차게 충전합니다.',
    rewardCoins: 250,
    expReward: 140,
    energyCost: 50,
    hungerCost: 40,
    cleanlinessCost: 30,
    minLevel: 20
  },
  {
    id: 'job_ceo_security',
    title: 'CEO실 특별 에스코트 경호',
    icon: '🕶️',
    desc: '중요 VIP 회의에 참석하는 대표님을 든든하게 경호합니다.',
    rewardCoins: 400,
    expReward: 250,
    energyCost: 60,
    hungerCost: 45,
    cleanlinessCost: 35,
    minLevel: 30
  }
];

// PokeAPI 공식 울음소리 오디오 재생
export function playPokemonCry(speciesId: number) {
  try {
    const audio = new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${speciesId}.ogg`);
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio playback prevented or unsupported:', e));
  } catch (e) {
    console.log('Audio error:', e);
  }
}

// 새 포켓몬 생성
export function createNewFarmPokemon(chainIndex: number, nickname?: string, isShiny = false): FarmPokemon {
  const chain = STARTER_CHAINS[chainIndex] || STARTER_CHAINS[0];
  const firstStage = chain[0];

  return {
    uid: `pmon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    speciesId: firstStage.id,
    name: firstStage.name,
    nickname: nickname || firstStage.name,
    stageIndex: 0,
    level: 1,
    exp: 0,
    maxExp: 100,
    hunger: 80,
    happiness: 60,
    cleanliness: 90,
    energy: 100,
    isShiny,
    types: firstStage.types,
    sprites: {
      front: firstStage.sprite,
      showdownFront: firstStage.showdownSprite
    },
    evolutionChain: chain,
    adoptedAt: new Date().toISOString(),
    isGraduated: false,
    totalPats: 0,
    jobsCompleted: 0
  };
}

// 초기 농장 상태 생성
export function getInitialFarmState(ownerName: string): FarmState {
  const defaultStarter = createNewFarmPokemon(0, `${ownerName}의 피츄`);

  return {
    ownerName,
    farmName: `${ownerName}의 행복한 포켓농장`,
    coins: 500, // 웰컴 스타터 지원금
    activePokemon: defaultStarter,
    graduatedPokemon: [],
    inventory: {
      oran_berry: 5,
      mild_soap: 3,
      toy_ball: 2
    },
    guestbook: [
      {
        id: 'gb_welcome',
        author: '농장 관리인 로토무',
        message: '포켓농장에 오신 것을 환영합니다 로토! 포켓몬을 지극정성으로 키워 멋지게 졸업시켜 보세요 로토! 🐾',
        timestamp: new Date().toISOString()
      }
    ],
    heartsCount: 0
  };
}

// 로컬스토리지 로드
export function loadFarmState(ownerName: string): FarmState {
  try {
    const raw = localStorage.getItem(`${FARM_STORAGE_KEY}_${ownerName}`);
    if (raw) {
      const parsed = JSON.parse(raw) as FarmState;
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load farm state from localStorage:', err);
  }
  return getInitialFarmState(ownerName);
}

// 로컬스토리지 저장
export function saveFarmState(state: FarmState): void {
  try {
    localStorage.setItem(`${FARM_STORAGE_KEY}_${state.ownerName}`, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save farm state to localStorage:', err);
  }
}
