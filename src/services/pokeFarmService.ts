import type { FarmPokemon, EvolutionStage, FarmItem, PartTimeJob, FarmState, ExpeditionArea } from '../types/farm';
import type { PokemonType } from '../types/pokemon';

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
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/255.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 256,
      name: '영치코',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/256.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/256.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 257,
      name: '번치코',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/257.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/257.gif',
      genCategory: 'gen3-4'
    }
  ],

  // 11. 브케인 ➔ 마그케인 ➔ 블레이범
  [
    {
      id: 155,
      name: '브케인',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/155.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/155.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 156,
      name: '마그케인',
      minLevel: 14,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/156.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/156.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 157,
      name: '블레이범',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/157.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/157.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 12. 리아코 ➔ 엘리게이 ➔ 장크로다일
  [
    {
      id: 158,
      name: '리아코',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/158.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/158.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 159,
      name: '엘리게이',
      minLevel: 18,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/159.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/159.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 160,
      name: '장크로다일',
      minLevel: 30,
      minHappiness: 80,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/160.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/160.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 13. 치코리타 ➔ 베이리프 ➔ 메가니움
  [
    {
      id: 152,
      name: '치코리타',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/152.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/152.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 153,
      name: '베이리프',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/153.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/153.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 154,
      name: '메가니움',
      minLevel: 32,
      minHappiness: 80,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/154.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/154.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 14. 나무지기 ➔ 나무돌이 ➔ 나무킹
  [
    {
      id: 252,
      name: '나무지기',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/252.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/252.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 253,
      name: '나무돌이',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/253.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/253.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 254,
      name: '나무킹',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/254.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/254.gif',
      genCategory: 'gen3-4'
    }
  ],

  // 15. 물짱이 ➔ 늪짱이 ➔ 대짱이
  [
    {
      id: 258,
      name: '물짱이',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/258.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/258.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 259,
      name: '늪짱이',
      minLevel: 16,
      minHappiness: 40,
      types: ['water', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/259.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/259.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 260,
      name: '대짱이',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/260.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/260.gif',
      genCategory: 'gen3-4'
    }
  ],

  // 16. 불꽃숭이 ➔ 파이숭이 ➔ 초염몽
  [
    {
      id: 390,
      name: '불꽃숭이',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/390.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/390.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 391,
      name: '파이숭이',
      minLevel: 14,
      minHappiness: 40,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/391.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/391.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 392,
      name: '초염몽',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/392.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/392.gif',
      genCategory: 'gen3-4'
    }
  ],

  // 17. 모부기 ➔ 수풀부기 ➔ 토대부기
  [
    {
      id: 387,
      name: '모부기',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/387.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/387.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 388,
      name: '수풀부기',
      minLevel: 18,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/388.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/388.gif',
      genCategory: 'gen3-4'
    },
    {
      id: 389,
      name: '토대부기',
      minLevel: 32,
      minHappiness: 80,
      types: ['grass', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/389.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/389.gif',
      genCategory: 'gen3-4'
    }
  ],

  // 18. 주리비얀 ➔ 샤비 ➔ 샤로다
  [
    {
      id: 495,
      name: '주리비얀',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/495.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/495.gif',
      genCategory: 'gen5-6'
    },
    {
      id: 496,
      name: '샤비',
      minLevel: 17,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/496.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/496.gif',
      genCategory: 'gen5-6'
    },
    {
      id: 497,
      name: '샤로다',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/497.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/497.gif',
      genCategory: 'gen5-6'
    }
  ],

  // 19. 뚜꾸리 ➔ 차오꿀 ➔ 염무왕
  [
    {
      id: 498,
      name: '뚜꾸리',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/498.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/498.gif',
      genCategory: 'gen5-6'
    },
    {
      id: 499,
      name: '차오꿀',
      minLevel: 17,
      minHappiness: 40,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/499.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/499.gif',
      genCategory: 'gen5-6'
    },
    {
      id: 500,
      name: '염무왕',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/500.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/500.gif',
      genCategory: 'gen5-6'
    }
  ],

  // 20. 수댕이 ➔ 쌍검자비 ➔ 대검귀
  [
    {
      id: 501,
      name: '수댕이',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/501.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/501.gif',
      genCategory: 'gen5-6'
    },
    {
      id: 502,
      name: '쌍검자비',
      minLevel: 17,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/502.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/502.gif',
      genCategory: 'gen5-6'
    },
    {
      id: 503,
      name: '대검귀',
      minLevel: 36,
      minHappiness: 80,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/503.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/503.gif',
      genCategory: 'gen5-6'
    }
  ],

  // 21. 나몰빼미 ➔ 빼미스로우 ➔ 모크나이퍼
  [
    {
      id: 722,
      name: '나몰빼미',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/722.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/722.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 723,
      name: '빼미스로우',
      minLevel: 17,
      minHappiness: 40,
      types: ['grass', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/723.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/723.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 724,
      name: '모크나이퍼',
      minLevel: 34,
      minHappiness: 80,
      types: ['grass', 'ghost'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/724.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/724.gif',
      genCategory: 'gen7-9'
    }
  ],

  // 22. 냐오불 ➔ 냐오히트 ➔ 어흥염
  [
    {
      id: 725,
      name: '냐오불',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/725.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/725.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 726,
      name: '냐오히트',
      minLevel: 17,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/726.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/726.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 727,
      name: '어흥염',
      minLevel: 34,
      minHappiness: 80,
      types: ['fire', 'dark'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/727.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/727.gif',
      genCategory: 'gen7-9'
    }
  ],

  // 23. 누리공 ➔ 키요공 ➔ 누리레느
  [
    {
      id: 728,
      name: '누리공',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/728.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/728.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 729,
      name: '키요공',
      minLevel: 17,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/729.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/729.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 730,
      name: '누리레느',
      minLevel: 34,
      minHappiness: 80,
      types: ['water', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/730.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/730.gif',
      genCategory: 'gen7-9'
    }
  ],

  // 24. 염버니 ➔ 래비풋 ➔ 에이스번
  [
    {
      id: 813,
      name: '염버니',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/813.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/813.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 814,
      name: '래비풋',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/814.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/814.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 815,
      name: '에이스번',
      minLevel: 35,
      minHappiness: 80,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/815.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/815.gif',
      genCategory: 'gen7-9'
    }
  ],

  // 25. 뜨아거 ➔ 악뜨거 ➔ 라우드본
  [
    {
      id: 909,
      name: '뜨아거',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/909.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/909.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 910,
      name: '악뜨거',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/910.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/910.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 911,
      name: '라우드본',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'ghost'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/911.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/911.gif',
      genCategory: 'gen7-9'
    }
  ],

  // 26. 나오하 ➔ 나로테 ➔ 마스카나
  [
    {
      id: 906,
      name: '나오하',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/906.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/906.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 907,
      name: '나로테',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/907.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/907.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 908,
      name: '마스카나',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass', 'dark'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/908.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/908.gif',
      genCategory: 'gen7-9'
    }
  ],

  // 27. 꾸왁스 ➔ 아꾸왁 ➔ 웨이니발
  [
    {
      id: 912,
      name: '꾸왁스',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/912.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/912.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 913,
      name: '아꾸왁',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/913.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/913.gif',
      genCategory: 'gen7-9'
    },
    {
      id: 914,
      name: '웨이니발',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/914.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/914.gif',
      genCategory: 'gen7-9'
    }
  ],

  // 28. 미뇽 ➔ 신뇽 ➔ 망나뇽 (전설급 드래곤)
  [
    {
      id: 147,
      name: '미뇽',
      minLevel: 1,
      minHappiness: 0,
      types: ['dragon'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/147.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/147.gif',
      genCategory: 'special'
    },
    {
      id: 148,
      name: '신뇽',
      minLevel: 30,
      minHappiness: 50,
      types: ['dragon'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/148.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/148.gif',
      genCategory: 'special'
    },
    {
      id: 149,
      name: '망나뇽',
      minLevel: 55,
      minHappiness: 90,
      types: ['dragon', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/149.gif',
      genCategory: 'special'
    }
  ],

  // 29. 딥상어동 ➔ 한바이트 ➔ 한카리아스 (최강 600족)
  [
    {
      id: 443,
      name: '딥상어동',
      minLevel: 1,
      minHappiness: 0,
      types: ['dragon', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/443.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/443.gif',
      genCategory: 'special'
    },
    {
      id: 444,
      name: '한바이트',
      minLevel: 24,
      minHappiness: 50,
      types: ['dragon', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/444.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/444.gif',
      genCategory: 'special'
    },
    {
      id: 445,
      name: '한카리아스',
      minLevel: 48,
      minHappiness: 90,
      types: ['dragon', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/445.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/445.gif',
      genCategory: 'special'
    }
  ],

  // 30. 고오스 ➔ 고우스트 ➔ 팬텀 (인기 고스트)
  [
    {
      id: 92,
      name: '고오스',
      minLevel: 1,
      minHappiness: 0,
      types: ['ghost', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/92.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/92.gif',
      genCategory: 'special'
    },
    {
      id: 93,
      name: '고우스트',
      minLevel: 25,
      minHappiness: 40,
      types: ['ghost', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/93.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/93.gif',
      genCategory: 'special'
    },
    {
      id: 94,
      name: '팬텀',
      minLevel: 40,
      minHappiness: 80,
      types: ['ghost', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/94.gif',
      genCategory: 'special'
    }
  ],

  // 31. 고라파덕 ➔ 골덕 (명품 귀요미)
  [
    {
      id: 54,
      name: '고라파덕',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/54.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 55,
      name: '골덕',
      minLevel: 33,
      minHappiness: 70,
      types: ['water', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/55.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/55.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 32. 발챙이 ➔ 수륙챙이 ➔ 강챙이 (올챙이 삼총사)
  [
    {
      id: 60,
      name: '발챙이',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/60.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/60.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 61,
      name: '수륙챙이',
      minLevel: 25,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/61.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/61.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 62,
      name: '강챙이',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/62.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/62.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 33. 루리리 ➔ 마릴 ➔ 마릴리 (물요정 마릴)
  [
    {
      id: 298,
      name: '루리리',
      minLevel: 1,
      minHappiness: 0,
      types: ['normal', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/298.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/298.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 183,
      name: '마릴',
      minLevel: 15,
      minHappiness: 40,
      types: ['water', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/183.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/183.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 184,
      name: '마릴리',
      minLevel: 30,
      minHappiness: 80,
      types: ['water', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/184.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/184.gif',
      genCategory: 'gen1-2'
    }
  ]
];

export interface PokedexEntry {
  speciesId: number;
  name: string;
  types: PokemonType[];
  sprite: string;
  showdownSprite: string;
  baseSpeciesId: number;
  baseName: string;
  chainIndex: number;
}

/**
 * 33종 전체 진화 계열의 최종 진화체 도감 목록 반환
 */
export function getAllPokedexEntries(): PokedexEntry[] {
  return STARTER_CHAINS.map((chain, chainIndex) => {
    const finalStage = chain[chain.length - 1];
    const firstStage = chain[0];
    return {
      speciesId: finalStage.id,
      name: finalStage.name,
      types: finalStage.types,
      sprite: finalStage.sprite,
      showdownSprite: finalStage.showdownSprite,
      baseSpeciesId: firstStage.id,
      baseName: firstStage.name,
      chainIndex
    };
  });
}

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
  },
  {
    id: 'rare_candy',
    name: '이상한사탕',
    icon: '🍬',
    category: 'special',
    description: '신비한 에너지의 사탕. 포켓몬에게 먹이면 즉시 레벨이 1 오릅니다!',
    price: 350,
    effect: { happiness: 50, exp: 99999 }
  },
  {
    id: 'shiny_stone',
    name: '반짝이는 원석',
    icon: '💎',
    category: 'special',
    description: '탐험에서 발굴한 영롱한 광물. 상점에 300코인에 매각할 수 있습니다.',
    price: 300,
    effect: { happiness: 10 }
  },
  {
    id: 'gold_crown',
    name: '전설의 황금 왕관',
    icon: '👑',
    category: 'special',
    description: '뒷산 깊은 곳에서 발견된 전설의 보물! 상점에 1,000코인에 매각할 수 있습니다.',
    price: 1000,
    effect: { happiness: 100 }
  },
  {
    id: 'mystery_egg',
    name: '의문의 포켓몬 알',
    icon: '🥚',
    category: 'special',
    description: '신비한 기운의 알. 인큐베이터에 넣고 정성으로 돌보면 귀여운 아기 포켓몬이 탄생합니다!',
    price: 300,
    effect: { happiness: 15 }
  },
  {
    id: 'golden_egg',
    name: '황금빛 전설의 알',
    icon: '🌟',
    category: 'special',
    description: '영롱한 황금빛으로 빛나는 알. 부화 시 100% 확률로 반짝이는 이로치(Shiny) 포켓몬이 탄생합니다!',
    price: 800,
    effect: { happiness: 30 }
  }
];

// 🌲 사내 뒷산 탐험 구역 목록 (Expedition Areas)
export const EXPEDITION_AREAS: ExpeditionArea[] = [
  {
    id: 'exp_pantry',
    name: '탕비실 스낵 서고',
    icon: '☕',
    desc: '임직원 탕비실 찬장과 서랍을 몰래 탐색하여 달콤한 간식과 보급품을 찾아옵니다.',
    durationSec: 15,
    minLevel: 1,
    energyCost: 15,
    hungerCost: 15,
    cleanlinessCost: 10,
    rewardCoinsMin: 40,
    rewardCoinsMax: 90,
    rewardExpMin: 35,
    rewardExpMax: 65,
    dropItems: [
      { itemId: 'oran_berry', chance: 0.6 },
      { itemId: 'sitrus_berry', chance: 0.35 },
      { itemId: 'mystery_egg', chance: 0.03 },
      { itemId: 'poffin_cake', chance: 0.15 }
    ]
  },
  {
    id: 'exp_rooftop',
    name: '옥상 하늘정원',
    icon: '🌿',
    desc: '초록빛 잔디와 화단이 만발한 옥상정원에서 희귀 열매와 장난감을 채집합니다.',
    durationSec: 30,
    minLevel: 8,
    energyCost: 25,
    hungerCost: 20,
    cleanlinessCost: 15,
    rewardCoinsMin: 90,
    rewardCoinsMax: 160,
    rewardExpMin: 70,
    rewardExpMax: 120,
    dropItems: [
      { itemId: 'sitrus_berry', chance: 0.5 },
      { itemId: 'toy_ball', chance: 0.35 },
      { itemId: 'mystery_egg', chance: 0.06 },
      { itemId: 'energy_drink', chance: 0.25 },
      { itemId: 'shiny_stone', chance: 0.2 }
    ]
  },
  {
    id: 'exp_server_room',
    name: '지하 전산 문서고',
    icon: '🗄️',
    desc: '서버 랙과 먼지 쌓인 캐비닛 사이에서 고가치 보급품과 이상한사탕을 탐색합니다.',
    durationSec: 45,
    minLevel: 18,
    energyCost: 35,
    hungerCost: 30,
    cleanlinessCost: 25,
    rewardCoinsMin: 180,
    rewardCoinsMax: 280,
    rewardExpMin: 130,
    rewardExpMax: 200,
    dropItems: [
      { itemId: 'energy_drink', chance: 0.4 },
      { itemId: 'mystery_egg', chance: 0.10 },
      { itemId: 'full_heal', chance: 0.3 },
      { itemId: 'shiny_stone', chance: 0.3 },
      { itemId: 'rare_candy', chance: 0.2 }
    ]
  },
  {
    id: 'exp_mountain',
    name: '사옥 뒷산 신비의 숲길',
    icon: '⛰️',
    desc: '사옥 뒤편 울창한 안개 숲길 깊은 곳을 개척하여 전설의 황금 유물을 발굴합니다.',
    durationSec: 60,
    minLevel: 28,
    energyCost: 50,
    hungerCost: 40,
    cleanlinessCost: 35,
    rewardCoinsMin: 320,
    rewardCoinsMax: 500,
    rewardExpMin: 220,
    rewardExpMax: 350,
    dropItems: [
      { itemId: 'full_heal', chance: 0.45 },
      { itemId: 'mystery_egg', chance: 0.15 },
      { itemId: 'rare_candy', chance: 0.35 },
      { itemId: 'shiny_stone', chance: 0.4 },
      { itemId: 'gold_crown', chance: 0.15 },
      { itemId: 'golden_egg', chance: 0.03 }
    ]
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
    expReward: 110,
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
    expReward: 180,
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
    expReward: 320,
    energyCost: 60,
    hungerCost: 45,
    cleanlinessCost: 35,
    minLevel: 30
  }
];

/**
 * 📈 레벨별 필요 경험치 계산 공식
 * - 기존 1.3배 지수 폭증 공식 대신, 부드럽고 합리적인 레벨링 곡선 적용
 * - Lv 16 이상 진화/육성 구간에서 경험치 요구량이 비현실적으로 치솟는 문제 해결
 */
export function getMaxExpForLevel(level: number): number {
  if (level <= 1) return 100;
  if (level <= 15) {
    // Lv 1~15: 100 ~ 520 (레벨당 30씩 증가)
    return Math.round(100 + (level - 1) * 30);
  }
  if (level <= 35) {
    // Lv 16~35: 570 ~ 1520 (레벨당 50씩 증가 - 기존 5,000~200,000에서 대폭 완화!)
    return Math.round(520 + (level - 15) * 50);
  }
  // Lv 36~50+: 1600 ~ 2800 (레벨당 80씩 증가)
  return Math.round(1520 + (level - 35) * 80);
}

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
    maxExp: getMaxExpForLevel(1),
    hunger: 80,
    happiness: 60,
    cleanliness: 90,
    energy: 100,
    isShiny,
    types: firstStage.types,
    sprites: {
      front: isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${firstStage.id}.png`
        : firstStage.sprite,
      showdownFront: isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${firstStage.id}.gif`
        : firstStage.showdownSprite
    },
    evolutionChain: chain,
    adoptedAt: new Date().toISOString(),
    isGraduated: false,
    totalPats: 0,
    jobsCompleted: 0
  };
}

/**
 * 🥚 알에서 태어날 아기 포켓몬 결정 함수
 * @param isGolden 황금알 여부
 */
export function hatchBabyPokemon(isGolden: boolean = false): {
  chainIdx: number;
  isShiny: boolean;
} {
  const chainIdx = Math.floor(Math.random() * STARTER_CHAINS.length);
  // 🌟 이로치 확률 밸런스: 일반 알은 1.5%의 귀한 확률, 황금알은 100% 확정
  const isShiny = isGolden ? true : Math.random() < 0.015;
  return { chainIdx, isShiny };
}

export interface LotterySymbol {
  id: string;
  name: string;
  icon: string;
  weight: number;
}

export const LOTTERY_SYMBOLS: LotterySymbol[] = [
  { id: 'coffee', name: '탕비실 커피', icon: '☕', weight: 40 },
  { id: 'berry', name: '오랭열매', icon: '🫐', weight: 28 },
  { id: 'soap', name: '거품비누', icon: '🧼', weight: 18 },
  { id: 'candy', name: '이상한사탕', icon: '🍬', weight: 8 },
  { id: 'egg', name: '의문의 알', icon: '🥚', weight: 4 },
  { id: 'jackpot', name: '777 피카츄', icon: '⚡', weight: 2 }
];

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function drawLotteryReels(): [LotterySymbol, LotterySymbol, LotterySymbol] {
  const totalWeight = LOTTERY_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  const pickOne = (): LotterySymbol => {
    let rand = Math.random() * totalWeight;
    for (const sym of LOTTERY_SYMBOLS) {
      if (rand < sym.weight) return sym;
      rand -= sym.weight;
    }
    return LOTTERY_SYMBOLS[0];
  };
  return [pickOne(), pickOne(), pickOne()];
}

// 초기 농장 상태 생성 (온보딩 전)
export function getInitialFarmState(ownerName: string): FarmState {
  return {
    ownerName,
    farmName: `${ownerName}의 포켓농장`,
    isInitialized: false, // 처음 접속 시 농장 이름 & 스타팅 포켓몬 선택 온보딩 진행
    coins: 500, // 웰컴 스타터 지원금
    activePokemon: null,
    reservePokemon: [], // 🌟 보육소 목장 보관 포켓몬 리스트
    incubatingEgg: null, // 🌟 현재 인큐베이터에 품고 있는 알
    bgTheme: 'classic', // 🏠 두부월드 미니룸 기본 배경
    stickers: [
      { id: 'stk_init_1', stickerId: 'heart', icon: '💖', label: '하트', x: 15, y: 20 },
      { id: 'stk_init_2', stickerId: 'star', icon: '⭐', label: '별', x: 80, y: 15 },
      { id: 'stk_init_3', stickerId: 'acorn', icon: '🌰', label: '둡토리', x: 45, y: 75 },
      { id: 'stk_init_4', stickerId: 'bubble_grad', icon: '💬', label: '졸업 축하해!', x: 60, y: 25 }
    ],
    statusMsg: '오늘도 포켓몬과 함께 즐거운 파밍 🎵 1촌 환영!',
    bgmSong: '프리스타일 - Y (Feat. 지선)',
    todayCount: Math.floor(Math.random() * 50) + 120,
    totalCount: Math.floor(Math.random() * 1000) + 4200,
    lotteryState: {
      lastDate: getTodayDateString(),
      freeSpinsLeft: 3,
      jackpotPool: 2000
    },
    graduatedPokemon: [],
    inventory: {
      oran_berry: 5,
      mild_soap: 3,
      toy_ball: 2
    },
    guestbook: [
      {
        id: 'gb_welcome',
        author: '농장 관리인 김두부',
        message: '포켓농장에 오신 것을 환영합니다 둡둡! 포켓몬을 지극정성으로 키워 멋지게 졸업시켜 보세요 둡둡! 🐾',
        timestamp: new Date().toISOString()
      }
    ],
    heartsCount: 12
  };
}

export const FARM_CURRENT_SAVE_KEY = 'pokefarm_save_data_current_active';

// 로컬스토리지 로드 (새로고침, 닉네임 불일치 등에도 농장 데이터 절대 유실 방지)
export function loadFarmState(ownerName?: string): FarmState {
  try {
    // 1순위: 가장 최근에 플레이하던 내 브라우저 통합 세이브 데이터
    const currentActiveRaw = localStorage.getItem(FARM_CURRENT_SAVE_KEY);
    let parsed: FarmState | null = null;

    if (currentActiveRaw) {
      try {
        parsed = JSON.parse(currentActiveRaw) as FarmState;
      } catch (e) {
        parsed = null;
      }
    }

    // 2순위: ownerName별 세이브 데이터
    if ((!parsed || !parsed.isInitialized) && ownerName) {
      const ownerRaw = localStorage.getItem(`${FARM_STORAGE_KEY}_${ownerName}`);
      if (ownerRaw) {
        try {
          parsed = JSON.parse(ownerRaw) as FarmState;
        } catch (e) {
          parsed = null;
        }
      }
    }

    // 3순위: 브라우저에 저장된 이전의 모든 pokefarm_save_data_ 키 자동 스캔 & 복구
    if (!parsed || !parsed.isInitialized) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(FARM_STORAGE_KEY)) {
          const candidateRaw = localStorage.getItem(key);
          if (candidateRaw) {
            try {
              const candidate = JSON.parse(candidateRaw) as FarmState;
              if (candidate && (candidate.isInitialized || candidate.activePokemon || (candidate.graduatedPokemon && candidate.graduatedPokemon.length > 0))) {
                parsed = candidate;
                console.log(`[PokeFarm] 🌟 기존 농장 세이브 데이터 자동 복구 성공 (Key: ${key})`);
                break;
              }
            } catch (e) {
              // continue
            }
          }
        }
      }
    }

    if (parsed) {
      parsed.reservePokemon = parsed.reservePokemon || [];
      if (parsed.incubatingEgg === undefined) parsed.incubatingEgg = null;
      if (parsed.isInitialized === undefined) {
        parsed.isInitialized = !!(parsed.activePokemon || parsed.graduatedPokemon?.length > 0);
      }

      // ✨ 이로치 포켓몬의 스프라이트 URL이 일반 URL인 경우 최신 이로치 URL로 자동 보정
      const fixShinySprites = (mon: FarmPokemon) => {
        if (mon && mon.isShiny) {
          if (mon.sprites?.front && !mon.sprites.front.includes('/shiny/')) {
            mon.sprites.front = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${mon.speciesId}.png`;
          }
          if (mon.sprites?.showdownFront && !mon.sprites.showdownFront.includes('/shiny/')) {
            mon.sprites.showdownFront = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${mon.speciesId}.gif`;
          }
        }
      };
      if (parsed.activePokemon) fixShinySprites(parsed.activePokemon);
      parsed.reservePokemon?.forEach(fixShinySprites);

      // 🎰 일일 복권 상태 날짜 체크 및 무료 스핀 리셋
      const today = getTodayDateString();
      if (!parsed.lotteryState) {
        parsed.lotteryState = {
          lastDate: today,
          freeSpinsLeft: 3,
          jackpotPool: 2000
        };
      } else if (parsed.lotteryState.lastDate !== today) {
        parsed.lotteryState.lastDate = today;
        parsed.lotteryState.freeSpinsLeft = 3;
      }
      parsed.lotteryState.jackpotPool = Math.max(1000, parsed.lotteryState.jackpotPool || 2000);

      // 🌟 기존 세이브 데이터의 과도하게 뻥튀기된 maxExp를 새 공식으로 즉시 보정
      if (parsed.activePokemon) {
        const expectedMaxExp = getMaxExpForLevel(parsed.activePokemon.level);
        if (parsed.activePokemon.maxExp !== expectedMaxExp) {
          parsed.activePokemon.maxExp = expectedMaxExp;
          if (parsed.activePokemon.exp >= expectedMaxExp) {
            parsed.activePokemon.exp = Math.min(parsed.activePokemon.exp, expectedMaxExp - 1);
          }
        }
      }

      // 통합 키에도 동기화
      localStorage.setItem(FARM_CURRENT_SAVE_KEY, JSON.stringify(parsed));
      if (parsed.ownerName) {
        localStorage.setItem('pokefarm_saved_owner', parsed.ownerName);
      }

      return parsed;
    }
  } catch (err) {
    console.error('Failed to load farm state from localStorage:', err);
  }

  const fallbackOwner = ownerName || localStorage.getItem('pokefarm_saved_owner') || '지우';
  return getInitialFarmState(fallbackOwner);
}

// 로컬스토리지 저장 (통합 키 + 개별 키 동시 저장으로 완벽 보존)
export function saveFarmState(state: FarmState): void {
  try {
    const jsonStr = JSON.stringify(state);
    // 1. 현재 브라우저 활성 농장 통합 키 저장
    localStorage.setItem(FARM_CURRENT_SAVE_KEY, jsonStr);
    // 2. 농장주 이름별 키 저장
    if (state.ownerName) {
      localStorage.setItem(`${FARM_STORAGE_KEY}_${state.ownerName}`, jsonStr);
      localStorage.setItem('pokefarm_saved_owner', state.ownerName);
    }
  } catch (err) {
    console.error('Failed to save farm state to localStorage:', err);
  }
}
