import type { FarmPokemon, EvolutionStage, FarmItem, PartTimeJob, FarmState, ExpeditionArea, NeighborFarmData, ExpeditionStoryEvent } from '../types/farm';
import type { PokemonType } from '../types/pokemon';

export const FARM_STORAGE_KEY = 'pokefarm_save_data_v1';

// 🌟 스타팅 및 분양 가능 포켓몬 진화 체인 목록
export const STARTER_CHAINS: EvolutionStage[][] = [
  // =========================================================================
  // 🔴 1세대 스타팅 (Kanto Starters + Pikachu + Pidgeotto) - 5종
  // =========================================================================

  // 1. 이상해씨 ➔ 이상해풀 ➔ 이상해꽃
  [
    {
      id: 1,
      name: '이상해씨',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif',
      genCategory: 'gen1',
      isStarter: true
    },
    {
      id: 2,
      name: '이상해풀',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/2.gif',
      genCategory: 'gen1',
      isStarter: true
    },
    {
      id: 3,
      name: '이상해꽃',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/3.gif',
      genCategory: 'gen1',
      isStarter: true
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
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/4.gif',
      genCategory: 'gen1',
      isStarter: true
    },
    {
      id: 5,
      name: '리자드',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/5.gif',
      genCategory: 'gen1',
      isStarter: true
    },
    {
      id: 6,
      name: '리자몽',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif',
      genCategory: 'gen1',
      isStarter: true
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
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif',
      genCategory: 'gen1',
      isStarter: true
    },
    {
      id: 8,
      name: '어니부기',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/8.gif',
      genCategory: 'gen1',
      isStarter: true
    },
    {
      id: 9,
      name: '거북왕',
      minLevel: 36,
      minHappiness: 80,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/9.gif',
      genCategory: 'gen1',
      isStarter: true
    }
  ],

  // 4. 피카츄 ➔ 라이츄 (피츄 제외, 피카츄부터 스타팅 시작)
  [
    {
      id: 25,
      name: '피카츄',
      minLevel: 1,
      minHappiness: 0,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
      genCategory: 'gen1',
      isStarter: true
    },
    {
      id: 26,
      name: '라이츄',
      minLevel: 30,
      minHappiness: 60,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/26.gif',
      genCategory: 'gen1',
      isStarter: true
    }
  ],

  // 5. 피존 ➔ 피죤투 (구구 제외, 피존부터 스타팅 시작)
  [
    {
      id: 17,
      name: '피존',
      minLevel: 1,
      minHappiness: 0,
      types: ['normal', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/17.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/17.gif',
      genCategory: 'gen1',
      isStarter: true
    },
    {
      id: 18,
      name: '피죤투',
      minLevel: 36,
      minHappiness: 70,
      types: ['normal', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/18.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/18.gif',
      genCategory: 'gen1',
      isStarter: true
    }
  ],

  // =========================================================================
  // 🌿 2~3세대 스타팅 (Johto & Hoenn Starters) - 6종
  // =========================================================================

  // 6. 치코리타 ➔ 베이리프 ➔ 메가니움
  [
    {
      id: 152,
      name: '치코리타',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/152.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/152.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 153,
      name: '베이리프',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/153.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/153.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 154,
      name: '메가니움',
      minLevel: 32,
      minHappiness: 80,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/154.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/154.gif',
      genCategory: 'gen2-3',
      isStarter: true
    }
  ],

  // 7. 브케인 ➔ 마그케인 ➔ 블레이범
  [
    {
      id: 155,
      name: '브케인',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/155.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/155.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 156,
      name: '마그케인',
      minLevel: 14,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/156.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/156.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 157,
      name: '블레이범',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/157.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/157.gif',
      genCategory: 'gen2-3',
      isStarter: true
    }
  ],

  // 8. 리아코 ➔ 엘리게이 ➔ 장크로다일
  [
    {
      id: 158,
      name: '리아코',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/158.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/158.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 159,
      name: '엘리게이',
      minLevel: 18,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/159.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/159.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 160,
      name: '장크로다일',
      minLevel: 30,
      minHappiness: 80,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/160.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/160.gif',
      genCategory: 'gen2-3',
      isStarter: true
    }
  ],

  // 9. 나무지기 ➔ 나무돌이 ➔ 나무킹
  [
    {
      id: 252,
      name: '나무지기',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/252.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/252.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 253,
      name: '나무돌이',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/253.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/253.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 254,
      name: '나무킹',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/254.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/254.gif',
      genCategory: 'gen2-3',
      isStarter: true
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
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 256,
      name: '영치코',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/256.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/256.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 257,
      name: '번치코',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/257.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/257.gif',
      genCategory: 'gen2-3',
      isStarter: true
    }
  ],

  // 11. 물짱이 ➔ 늪짱이 ➔ 대짱이
  [
    {
      id: 258,
      name: '물짱이',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/258.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/258.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 259,
      name: '늪짱이',
      minLevel: 16,
      minHappiness: 40,
      types: ['water', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/259.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/259.gif',
      genCategory: 'gen2-3',
      isStarter: true
    },
    {
      id: 260,
      name: '대짱이',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/260.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/260.gif',
      genCategory: 'gen2-3',
      isStarter: true
    }
  ],

  // =========================================================================
  // ⚡ 4~5세대 스타팅 (Sinnoh & Unova Starters) - 6종
  // =========================================================================

  // 12. 모부기 ➔ 수풀부기 ➔ 토대부기
  [
    {
      id: 387,
      name: '모부기',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/387.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/387.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 388,
      name: '수풀부기',
      minLevel: 18,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/388.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/388.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 389,
      name: '토대부기',
      minLevel: 32,
      minHappiness: 80,
      types: ['grass', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/389.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/389.gif',
      genCategory: 'gen4-5',
      isStarter: true
    }
  ],

  // 13. 불꽃숭이 ➔ 파이숭이 ➔ 초염몽
  [
    {
      id: 390,
      name: '불꽃숭이',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/390.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/390.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 391,
      name: '파이숭이',
      minLevel: 14,
      minHappiness: 40,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/391.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/391.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 392,
      name: '초염몽',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/392.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/392.gif',
      genCategory: 'gen4-5',
      isStarter: true
    }
  ],

  // 14. 팽도리 ➔ 팽태자 ➔ 엠페르트
  [
    {
      id: 393,
      name: '팽도리',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/393.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/393.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 394,
      name: '팽태자',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/394.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/394.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 395,
      name: '엠페르트',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'steel'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/395.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/395.gif',
      genCategory: 'gen4-5',
      isStarter: true
    }
  ],

  // 15. 주리비얀 ➔ 샤비 ➔ 샤로다
  [
    {
      id: 495,
      name: '주리비얀',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/495.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/495.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 496,
      name: '샤비',
      minLevel: 17,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/496.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/496.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 497,
      name: '샤로다',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/497.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/497.gif',
      genCategory: 'gen4-5',
      isStarter: true
    }
  ],

  // 16. 뚜꾸리 ➔ 차오꿀 ➔ 염무왕
  [
    {
      id: 498,
      name: '뚜꾸리',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/498.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/498.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 499,
      name: '차오꿀',
      minLevel: 17,
      minHappiness: 40,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/499.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/499.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 500,
      name: '염무왕',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/500.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/500.gif',
      genCategory: 'gen4-5',
      isStarter: true
    }
  ],

  // 17. 수댕이 ➔ 쌍검자비 ➔ 대검귀
  [
    {
      id: 501,
      name: '수댕이',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/501.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/501.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 502,
      name: '쌍검자비',
      minLevel: 17,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/502.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/502.gif',
      genCategory: 'gen4-5',
      isStarter: true
    },
    {
      id: 503,
      name: '대검귀',
      minLevel: 36,
      minHappiness: 80,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/503.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/503.gif',
      genCategory: 'gen4-5',
      isStarter: true
    }
  ],

  // =========================================================================
  // ✨ 6~7세대 스타팅 (Kalos & Alola Starters) - 6종
  // =========================================================================

  // 18. 도치마론 ➔ 도치보구 ➔ 브리가론
  [
    {
      id: 650,
      name: '도치마론',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/650.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/650.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 651,
      name: '도치보구',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/651.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/651.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 652,
      name: '브리가론',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/652.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/652.gif',
      genCategory: 'gen6-7',
      isStarter: true
    }
  ],

  // 19. 푸호꼬 ➔ 테르나 ➔ 마폭시
  [
    {
      id: 653,
      name: '푸호꼬',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/653.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/653.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 654,
      name: '테르나',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/654.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/654.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 655,
      name: '마폭시',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/655.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/655.gif',
      genCategory: 'gen6-7',
      isStarter: true
    }
  ],

  // 20. 개구마르 ➔ 개굴반장 ➔ 개굴닌자
  [
    {
      id: 656,
      name: '개구마르',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/656.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/656.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 657,
      name: '개굴반장',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/657.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/657.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 658,
      name: '개굴닌자',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'dark'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/658.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/658.gif',
      genCategory: 'gen6-7',
      isStarter: true
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
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 723,
      name: '빼미스로우',
      minLevel: 17,
      minHappiness: 40,
      types: ['grass', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/723.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/723.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 724,
      name: '모크나이퍼',
      minLevel: 34,
      minHappiness: 80,
      types: ['grass', 'ghost'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/724.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/724.gif',
      genCategory: 'gen6-7',
      isStarter: true
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
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 726,
      name: '냐오히트',
      minLevel: 17,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/726.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/726.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 727,
      name: '어흥염',
      minLevel: 34,
      minHappiness: 80,
      types: ['fire', 'dark'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/727.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/727.gif',
      genCategory: 'gen6-7',
      isStarter: true
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
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 729,
      name: '키요공',
      minLevel: 17,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/729.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/729.gif',
      genCategory: 'gen6-7',
      isStarter: true
    },
    {
      id: 730,
      name: '누리레느',
      minLevel: 34,
      minHappiness: 80,
      types: ['water', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/730.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/730.gif',
      genCategory: 'gen6-7',
      isStarter: true
    }
  ],

  // =========================================================================
  // 🔮 8~9세대 스타팅 (Galar & Paldea Starters) - 6종
  // =========================================================================

  // 24. 흥나숭 ➔ 채키몽 ➔ 고릴타
  [
    {
      id: 810,
      name: '흥나숭',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/810.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/810.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 811,
      name: '채키몽',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/811.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/811.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 812,
      name: '고릴타',
      minLevel: 35,
      minHappiness: 80,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/812.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/812.gif',
      genCategory: 'gen8-9',
      isStarter: true
    }
  ],

  // 25. 염버니 ➔ 래비풋 ➔ 에이스번
  [
    {
      id: 813,
      name: '염버니',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/813.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/813.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 814,
      name: '래비풋',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/814.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/814.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 815,
      name: '에이스번',
      minLevel: 35,
      minHappiness: 80,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/815.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/815.gif',
      genCategory: 'gen8-9',
      isStarter: true
    }
  ],

  // 26. 울머기 ➔ 누겔레온 ➔ 인텔리레온
  [
    {
      id: 816,
      name: '울머기',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/816.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/816.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 817,
      name: '누겔레온',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/817.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/817.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 818,
      name: '인텔리레온',
      minLevel: 35,
      minHappiness: 80,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/818.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/818.gif',
      genCategory: 'gen8-9',
      isStarter: true
    }
  ],

  // 27. 나오하 ➔ 나로테 ➔ 마스카나
  [
    {
      id: 906,
      name: '나오하',
      minLevel: 1,
      minHappiness: 0,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/906.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/906.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 907,
      name: '나로테',
      minLevel: 16,
      minHappiness: 40,
      types: ['grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/907.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/907.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 908,
      name: '마스카나',
      minLevel: 36,
      minHappiness: 80,
      types: ['grass', 'dark'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/908.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/908.gif',
      genCategory: 'gen8-9',
      isStarter: true
    }
  ],

  // 28. 뜨아거 ➔ 악뜨거 ➔ 라우드본
  [
    {
      id: 909,
      name: '뜨아거',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/909.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/909.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 910,
      name: '악뜨거',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/910.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/910.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 911,
      name: '라우드본',
      minLevel: 36,
      minHappiness: 80,
      types: ['fire', 'ghost'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/911.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/911.gif',
      genCategory: 'gen8-9',
      isStarter: true
    }
  ],

  // 29. 꾸왁스 ➔ 아꾸왁 ➔ 웨이니발
  [
    {
      id: 912,
      name: '꾸왁스',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/912.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/912.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 913,
      name: '아꾸왁',
      minLevel: 16,
      minHappiness: 40,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/913.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/913.gif',
      genCategory: 'gen8-9',
      isStarter: true
    },
    {
      id: 914,
      name: '웨이니발',
      minLevel: 36,
      minHappiness: 80,
      types: ['water', 'fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/914.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/914.gif',
      genCategory: 'gen8-9',
      isStarter: true
    }
  ],

  // =========================================================================
  // 🥚 알 부화소 전용 포켓몬 (Daycare Egg Hatch Only - 분양소 분양 불가)
  // =========================================================================

  // 30. 이브이 ➔ 8대 이브이즈 (확률 진화: 샤미드/쥬피썬더/부스터/에브이/블래키/리피아/글레이시아/님피아)
  [
    {
      id: 133,
      name: '이브이',
      minLevel: 1,
      minHappiness: 0,
      types: ['normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/133.gif',
      genCategory: 'special',
      isEeveeBranch: true
    },
    {
      id: 134,
      name: '이브이즈 (8종 확률 진화)',
      minLevel: 25,
      minHappiness: 60,
      types: ['normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/133.gif',
      genCategory: 'special'
    }
  ],

  // 31. 잉어킹 ➔ 갸라도스 (대기만성)
  [
    {
      id: 129,
      name: '잉어킹',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/129.gif',
      genCategory: 'special'
    },
    {
      id: 130,
      name: '갸라도스',
      minLevel: 20,
      minHappiness: 50,
      types: ['water', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/130.gif',
      genCategory: 'special'
    }
  ],

  // 32. 리오르 ➔ 루카리오
  [
    {
      id: 447,
      name: '리오르',
      minLevel: 1,
      minHappiness: 0,
      types: ['fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/447.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/447.gif',
      genCategory: 'special'
    },
    {
      id: 448,
      name: '루카리오',
      minLevel: 30,
      minHappiness: 75,
      types: ['fighting', 'steel'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/448.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/448.gif',
      genCategory: 'special'
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
  ],

  // 34. 가라르 포니타 ➔ 가라르 날쌩마 (영롱한 유니콘)
  [
    {
      id: 10161,
      name: '가라르 포니타',
      minLevel: 1,
      minHappiness: 0,
      types: ['psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10161.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10161.gif',
      genCategory: 'special'
    },
    {
      id: 10162,
      name: '가라르 날쌩마',
      minLevel: 40,
      minHappiness: 75,
      types: ['psychic', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10162.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10162.gif',
      genCategory: 'special'
    }
  ],

  // 35. 가라르 지그제구리 ➔ 가라르 직구리 ➔ 가로막구리 (펑크 락커)
  [
    {
      id: 10171,
      name: '가라르 지그제구리',
      minLevel: 1,
      minHappiness: 0,
      types: ['dark', 'normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10171.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10171.gif',
      genCategory: 'special'
    },
    {
      id: 10172,
      name: '가라르 직구리',
      minLevel: 20,
      minHappiness: 45,
      types: ['dark', 'normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10172.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10172.gif',
      genCategory: 'special'
    },
    {
      id: 862,
      name: '가로막구리',
      minLevel: 35,
      minHappiness: 80,
      types: ['dark', 'normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/862.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/862.gif',
      genCategory: 'special'
    }
  ],

  // 36. 알로라 식스테일 ➔ 알로라 나인테일 (눈꽃 요정)
  [
    {
      id: 10103,
      name: '알로라 식스테일',
      minLevel: 1,
      minHappiness: 0,
      types: ['ice'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10103.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10103.gif',
      genCategory: 'special'
    },
    {
      id: 10104,
      name: '알로라 나인테일',
      minLevel: 36,
      minHappiness: 80,
      types: ['ice', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10104.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10104.gif',
      genCategory: 'special'
    }
  ],

  // 37. 알로라 라이츄 (서핑 팬케이크)
  [
    {
      id: 172,
      name: '알로라 피츄',
      minLevel: 1,
      minHappiness: 0,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/172.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/172.gif',
      genCategory: 'special'
    },
    {
      id: 25,
      name: '알로라 피카츄',
      minLevel: 15,
      minHappiness: 50,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
      genCategory: 'special'
    },
    {
      id: 10100,
      name: '알로라 라이츄',
      minLevel: 36,
      minHappiness: 85,
      types: ['electric', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10100.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10100.gif',
      genCategory: 'special'
    }
  ],

  // 38. 히스이 조로아 ➔ 히스이 조로아크 (원한의 요우코)
  [
    {
      id: 10238,
      name: '히스이 조로아',
      minLevel: 1,
      minHappiness: 0,
      types: ['normal', 'ghost'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10238.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10238.gif',
      genCategory: 'special'
    },
    {
      id: 10239,
      name: '히스이 조로아크',
      minLevel: 30,
      minHappiness: 75,
      types: ['normal', 'ghost'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10239.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10239.gif',
      genCategory: 'special'
    }
  ],

  // 39. 코스모그 ➔ 코스모움 ➔ 솔가레오 (전설의 태양사자)
  [
    {
      id: 789,
      name: '코스모그',
      minLevel: 1,
      minHappiness: 0,
      types: ['psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/789.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/789.gif',
      genCategory: 'special'
    },
    {
      id: 790,
      name: '코스모움',
      minLevel: 25,
      minHappiness: 50,
      types: ['psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/790.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/790.gif',
      genCategory: 'special'
    },
    {
      id: 791,
      name: '솔가레오',
      minLevel: 53,
      minHappiness: 90,
      types: ['psychic', 'steel'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/791.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/791.gif',
      genCategory: 'special'
    }
  ],

  // 40. 뮤 (환상의 시초)
  [
    {
      id: 151,
      name: '뮤',
      minLevel: 1,
      minHappiness: 0,
      types: ['psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/151.gif',
      genCategory: 'special'
    }
  ],

  // 41. 지라치 (천년의 소원별)
  [
    {
      id: 385,
      name: '지라치',
      minLevel: 1,
      minHappiness: 0,
      types: ['steel', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/385.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/385.gif',
      genCategory: 'special'
    }
  ],

  // 42. 빅티니 (승리의 별)
  [
    {
      id: 494,
      name: '빅티니',
      minLevel: 1,
      minHappiness: 0,
      types: ['psychic', 'fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/494.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/494.gif',
      genCategory: 'special'
    }
  ],

  // 43. 세레비 (숲의 시간 여행자)
  [
    {
      id: 251,
      name: '세레비',
      minLevel: 1,
      minHappiness: 0,
      types: ['psychic', 'grass'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/251.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/251.gif',
      genCategory: 'special'
    }
  ],

  // 44. 토게피 ➔ 토게틱 ➔ 토게키스 (행운의 축복)
  [
    {
      id: 175,
      name: '토게피',
      minLevel: 1,
      minHappiness: 0,
      types: ['fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/175.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/175.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 176,
      name: '토게틱',
      minLevel: 20,
      minHappiness: 50,
      types: ['fairy', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/176.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/176.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 468,
      name: '토게키스',
      minLevel: 36,
      minHappiness: 85,
      types: ['fairy', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/468.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/468.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 45. 애버라스 ➔ 데기라스 ➔ 마기라스 (모래바람 폭군)
  [
    {
      id: 246,
      name: '애버라스',
      minLevel: 1,
      minHappiness: 0,
      types: ['rock', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/246.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/246.gif',
      genCategory: 'special'
    },
    {
      id: 247,
      name: '데기라스',
      minLevel: 30,
      minHappiness: 45,
      types: ['rock', 'ground'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/247.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/247.gif',
      genCategory: 'special'
    },
    {
      id: 248,
      name: '마기라스',
      minLevel: 55,
      minHappiness: 90,
      types: ['rock', 'dark'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/248.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/248.gif',
      genCategory: 'special'
    }
  ],

  // 46. 아공이 ➔ 쉘곤 ➔ 보만다 (비행의 꿈 드래곤)
  [
    {
      id: 371,
      name: '아공이',
      minLevel: 1,
      minHappiness: 0,
      types: ['dragon'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/371.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/371.gif',
      genCategory: 'special'
    },
    {
      id: 372,
      name: '쉘곤',
      minLevel: 30,
      minHappiness: 45,
      types: ['dragon'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/372.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/372.gif',
      genCategory: 'special'
    },
    {
      id: 373,
      name: '보만다',
      minLevel: 50,
      minHappiness: 90,
      types: ['dragon', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/373.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/373.gif',
      genCategory: 'special'
    }
  ],

  // 47. 가디 ➔ 윈디 (의리의 불꽃 사자견)
  [
    {
      id: 58,
      name: '가디',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/58.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/58.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 59,
      name: '윈디',
      minLevel: 36,
      minHappiness: 75,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/59.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/59.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 48. 캐터피 ➔ 단데기 ➔ 버터플 (나비의 비상)
  [
    {
      id: 10,
      name: '캐터피',
      minLevel: 1,
      minHappiness: 0,
      types: ['bug'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 11,
      name: '단데기',
      minLevel: 7,
      minHappiness: 20,
      types: ['bug'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/11.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/11.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 12,
      name: '버터플',
      minLevel: 10,
      minHappiness: 50,
      types: ['bug', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/12.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/12.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 49. 메리프 ➔ 보송송 ➔ 전룡 (따뜻한 양털 램프)
  [
    {
      id: 179,
      name: '메리프',
      minLevel: 1,
      minHappiness: 0,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/179.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/179.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 180,
      name: '보송송',
      minLevel: 15,
      minHappiness: 40,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/180.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/180.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 181,
      name: '전룡',
      minLevel: 30,
      minHappiness: 80,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/181.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/181.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 50. 아보 ➔ 아보크 (맹독 코브라)
  [
    {
      id: 23,
      name: '아보',
      minLevel: 1,
      minHappiness: 0,
      types: ['poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/23.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/23.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 24,
      name: '아보크',
      minLevel: 22,
      minHappiness: 50,
      types: ['poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/24.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/24.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 51. 알로라 모래두지 ➔ 알로라 고지 (설산의 강철 두더지)
  [
    {
      id: 10101,
      name: '알로라 모래두지',
      minLevel: 1,
      minHappiness: 0,
      types: ['ice', 'steel'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10101.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10101.gif',
      genCategory: 'special'
    },
    {
      id: 10102,
      name: '알로라 고지',
      minLevel: 25,
      minHappiness: 60,
      types: ['ice', 'steel'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10102.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10102.gif',
      genCategory: 'special'
    }
  ],

  // 52. 삐 ➔ 삐삐 ➔ 픽시 (달맞이산 요정)
  [
    {
      id: 173,
      name: '삐',
      minLevel: 1,
      minHappiness: 0,
      types: ['fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/173.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/173.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 35,
      name: '삐삐',
      minLevel: 15,
      minHappiness: 45,
      types: ['fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/35.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/35.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 36,
      name: '픽시',
      minLevel: 30,
      minHappiness: 80,
      types: ['fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/36.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/36.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 53. 푸푸린 ➔ 푸린 ➔ 푸크린 (달콤한 자장가)
  [
    {
      id: 174,
      name: '푸푸린',
      minLevel: 1,
      minHappiness: 0,
      types: ['normal', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/174.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/174.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 39,
      name: '푸린',
      minLevel: 15,
      minHappiness: 45,
      types: ['normal', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/39.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 40,
      name: '푸크린',
      minLevel: 30,
      minHappiness: 80,
      types: ['normal', 'fairy'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/40.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/40.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 54. 야돈 ➔ 야도란 ➔ 야도킹 (느긋한 왕관 현자)
  [
    {
      id: 79,
      name: '야돈',
      minLevel: 1,
      minHappiness: 0,
      types: ['water', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/79.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/79.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 80,
      name: '야도란',
      minLevel: 25,
      minHappiness: 45,
      types: ['water', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/80.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/80.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 199,
      name: '야도킹',
      minLevel: 37,
      minHappiness: 80,
      types: ['water', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/199.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/199.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 55. 가라르 야돈 ➔ 가라르 야도란 ➔ 가라르 야도킹 (독침 쉘터)
  [
    {
      id: 10164,
      name: '가라르 야돈',
      minLevel: 1,
      minHappiness: 0,
      types: ['psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10164.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10164.gif',
      genCategory: 'special'
    },
    {
      id: 10165,
      name: '가라르 야도란',
      minLevel: 25,
      minHappiness: 45,
      types: ['poison', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10165.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10165.gif',
      genCategory: 'special'
    },
    {
      id: 10166,
      name: '가라르 야도킹',
      minLevel: 37,
      minHappiness: 80,
      types: ['poison', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10166.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10166.gif',
      genCategory: 'special'
    }
  ],

  // 56. 쥬쥬 ➔ 쥬레곤 (오로라 물개)
  [
    {
      id: 86,
      name: '쥬쥬',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/86.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/86.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 87,
      name: '쥬레곤',
      minLevel: 34,
      minHappiness: 75,
      types: ['water', 'ice'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/87.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/87.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 57. 별가사리 ➔ 아쿠스타 (신비의 코어)
  [
    {
      id: 120,
      name: '별가사리',
      minLevel: 1,
      minHappiness: 0,
      types: ['water'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/120.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/120.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 121,
      name: '아쿠스타',
      minLevel: 30,
      minHappiness: 75,
      types: ['water', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/121.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/121.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 58. 뽀뽀라 ➔ 루주라 (얼음 댄서)
  [
    {
      id: 238,
      name: '뽀뽀라',
      minLevel: 1,
      minHappiness: 0,
      types: ['ice', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/238.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/238.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 124,
      name: '루주라',
      minLevel: 30,
      minHappiness: 75,
      types: ['ice', 'psychic'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/124.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/124.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 59. 핑복 ➔ 럭키 ➔ 해피니스 (행복의 알천사)
  [
    {
      id: 440,
      name: '핑복',
      minLevel: 1,
      minHappiness: 0,
      types: ['normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/440.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/440.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 113,
      name: '럭키',
      minLevel: 20,
      minHappiness: 50,
      types: ['normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/113.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/113.gif',
      genCategory: 'gen1-2'
    },
    {
      id: 242,
      name: '해피니스',
      minLevel: 36,
      minHappiness: 85,
      types: ['normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/242.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/242.gif',
      genCategory: 'gen1-2'
    }
  ],

  // 60. 거다이맥스 버터플 (초특수 전설알 체인)
  [
    {
      id: 10,
      name: '캐터피',
      minLevel: 1,
      minHappiness: 0,
      types: ['bug'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10.gif',
      genCategory: 'special'
    },
    {
      id: 11,
      name: '단데기',
      minLevel: 7,
      minHappiness: 20,
      types: ['bug'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/11.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/11.gif',
      genCategory: 'special'
    },
    {
      id: 12,
      name: '버터플',
      minLevel: 10,
      minHappiness: 45,
      types: ['bug', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/12.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/12.gif',
      genCategory: 'special'
    },
    {
      id: 10198,
      name: '거다이맥스 버터플',
      minLevel: 36,
      minHappiness: 85,
      types: ['bug', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10198.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10198.gif',
      genCategory: 'special'
    }
  ],

  // 61. 거다이맥스 팬텀 (초특수 전설알 체인)
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
      minHappiness: 45,
      types: ['ghost', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/93.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/93.gif',
      genCategory: 'special'
    },
    {
      id: 94,
      name: '팬텀',
      minLevel: 38,
      minHappiness: 75,
      types: ['ghost', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/94.gif',
      genCategory: 'special'
    },
    {
      id: 10199,
      name: '거다이맥스 팬텀',
      minLevel: 45,
      minHappiness: 90,
      types: ['ghost', 'poison'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10199.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10199.gif',
      genCategory: 'special'
    }
  ],

  // 62. 거다이맥스 이브이 (초특수 전설알 체인)
  [
    {
      id: 133,
      name: '이브이',
      minLevel: 1,
      minHappiness: 0,
      types: ['normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/133.gif',
      genCategory: 'special'
    },
    {
      id: 10205,
      name: '거다이맥스 이브이',
      minLevel: 36,
      minHappiness: 85,
      types: ['normal'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10205.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10205.gif',
      genCategory: 'special'
    }
  ],

  // 63. 거다이맥스 리자몽 (초특수 전설알 체인)
  [
    {
      id: 4,
      name: '파이리',
      minLevel: 1,
      minHappiness: 0,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/4.gif',
      genCategory: 'special'
    },
    {
      id: 5,
      name: '리자드',
      minLevel: 16,
      minHappiness: 40,
      types: ['fire'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/5.gif',
      genCategory: 'special'
    },
    {
      id: 6,
      name: '리자몽',
      minLevel: 36,
      minHappiness: 75,
      types: ['fire', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif',
      genCategory: 'special'
    },
    {
      id: 10196,
      name: '거다이맥스 리자몽',
      minLevel: 45,
      minHappiness: 90,
      types: ['fire', 'flying'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10196.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10196.gif',
      genCategory: 'special'
    }
  ],

  // 64. 거다이맥스 피카츄 (초특수 전설알 체인)
  [
    {
      id: 172,
      name: '피츄',
      minLevel: 1,
      minHappiness: 0,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/172.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/172.gif',
      genCategory: 'special'
    },
    {
      id: 25,
      name: '피카츄',
      minLevel: 15,
      minHappiness: 45,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
      genCategory: 'special'
    },
    {
      id: 10197,
      name: '거다이맥스 피카츄',
      minLevel: 36,
      minHappiness: 85,
      types: ['electric'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10197.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10197.gif',
      genCategory: 'special'
    }
  ],

  // 65. 거다이맥스 라프라스 (초특수 전설알 체인)
  [
    {
      id: 131,
      name: '라프라스',
      minLevel: 1,
      minHappiness: 0,
      types: ['water', 'ice'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/131.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/131.gif',
      genCategory: 'special'
    },
    {
      id: 10204,
      name: '거다이맥스 라프라스',
      minLevel: 36,
      minHappiness: 85,
      types: ['water', 'ice'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10204.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10204.gif',
      genCategory: 'special'
    }
  ],

  // 66. 거다이맥스 괴력몬 (초특수 전설알 체인)
  [
    {
      id: 66,
      name: '알통몬',
      minLevel: 1,
      minHappiness: 0,
      types: ['fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/66.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/66.gif',
      genCategory: 'special'
    },
    {
      id: 67,
      name: '근육몬',
      minLevel: 20,
      minHappiness: 40,
      types: ['fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/67.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/67.gif',
      genCategory: 'special'
    },
    {
      id: 68,
      name: '괴력몬',
      minLevel: 36,
      minHappiness: 75,
      types: ['fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/68.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/68.gif',
      genCategory: 'special'
    },
    {
      id: 10201,
      name: '거다이맥스 괴력몬',
      minLevel: 45,
      minHappiness: 90,
      types: ['fighting'],
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10201.png',
      showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10201.gif',
      genCategory: 'special'
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
    name: '🥚 일반 포켓몬 알',
    icon: '🥚',
    category: 'special',
    description: '다양한 세대의 모든 일반 포켓몬이 부화하는 알. 인큐베이터에 넣고 정성으로 돌보면 아기 포켓몬이 탄생합니다!',
    price: 300,
    effect: { happiness: 15 }
  },
  {
    id: 'golden_egg',
    name: '🌟 전설 & 특수 포켓몬 알',
    icon: '🌟',
    category: 'special',
    description: '지방 리전폼·거다이맥스·전설 포켓몬이 등장하거나, 일반 포켓몬이 100% 확정 이로치(Shiny)로 부화하는 특별한 황금알!',
    price: 2000,
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
      { itemId: 'oran_berry', chance: 0.75 },
      { itemId: 'sitrus_berry', chance: 0.50 },
      { itemId: 'mystery_egg', chance: 0.07 },
      { itemId: 'poffin_cake', chance: 0.25 }
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
      { itemId: 'sitrus_berry', chance: 0.65 },
      { itemId: 'toy_ball', chance: 0.48 },
      { itemId: 'mystery_egg', chance: 0.12 },
      { itemId: 'energy_drink', chance: 0.38 },
      { itemId: 'shiny_stone', chance: 0.30 }
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
      { itemId: 'energy_drink', chance: 0.55 },
      { itemId: 'mystery_egg', chance: 0.18 },
      { itemId: 'full_heal', chance: 0.42 },
      { itemId: 'shiny_stone', chance: 0.42 },
      { itemId: 'rare_candy', chance: 0.30 }
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
      { itemId: 'full_heal', chance: 0.60 },
      { itemId: 'mystery_egg', chance: 0.25 },
      { itemId: 'rare_candy', chance: 0.45 },
      { itemId: 'shiny_stone', chance: 0.50 },
      { itemId: 'gold_crown', chance: 0.22 },
      { itemId: 'golden_egg', chance: 0.055 }
    ]
  }
];

// 🌲 사내 탐험 인터랙티브 스토리 인카운터 이벤트 목록
export const EXPEDITION_STORY_EVENTS: Record<string, ExpeditionStoryEvent[]> = {
  exp_pantry: [
    {
      id: 'pantry_snack_thief',
      areaId: 'exp_pantry',
      title: '🍪 탕비실 간식 도둑 로켓단의 습격!',
      npcName: '로켓단 간식 조무래기',
      npcPortrait: '😈',
      npcBadge: '탕비실 털이범',
      dialogue: [
        '히히히! 서랍 깊숙이 숨겨진 고급 버터쿠키와 오랭열매는 전부 우리 로켓단 차지다!',
        '어라? 쪼그만 포켓몬 녀석이 어디서 탕비실에 기어들어온 거지? 내 간식을 탐내는 거냐?!'
      ],
      choices: [
        {
          id: 'tackle',
          text: '⚔️ [몸통박치기!] 서랍을 들이받아 간식 바구니를 지켜낸다!',
          icon: '⚔️',
          reqDesc: '기본 성공률 70% (레벨 보정)',
          successRate: 0.70,
          successDialogue: '쿵! 당황한 로켓단이 커피 캔을 밟고 우스꽝스럽게 미끄러져 도망쳤습니다! 떨어진 간식과 코인을 획득했습니다.',
          failDialogue: '아야! 로켓단의 꿀밤에 맞아 엉덩방아를 찧었습니다. 간신히 한 개만 건져 탈출했습니다.',
          successResult: {
            title: '🏆 간식 사수 대승리!',
            grade: 'SUCCESS',
            coins: 160,
            exp: 90,
            items: [
              { itemId: 'oran_berry', qty: 2 },
              { itemId: 'mystery_egg', qty: 1 }
            ]
          },
          failResult: {
            title: '💦 꿀밤 맞고 퇴각...',
            grade: 'ESCAPE',
            coins: 40,
            exp: 25,
            items: [{ itemId: 'oran_berry', qty: 1 }],
            energyDamage: 10
          }
        },
        {
          id: 'coffee_bribe',
          text: '☕ [황금비율 믹스커피] 달콤한 커피를 타주며 평화 협상을 시도한다',
          icon: '☕',
          reqDesc: '기본 성공률 85% (친밀도 보정)',
          successRate: 0.85,
          successDialogue: '감동한 로켓단이 눈물을 글썽이며 "이게 얼마 만의 따뜻한 커피인가... 흑흑!"이라며 답례로 귀한 디저트와 코인을 쥐여주었습니다.',
          failDialogue: '로켓단이 "난 아메리카노파다!"라며 커피잔을 밀치고 도망쳤습니다. 소량의 코인만 주웠습니다.',
          successResult: {
            title: '🤝 눈물의 커피 평화 협상!',
            grade: 'SUCCESS',
            coins: 140,
            exp: 70,
            items: [
              { itemId: 'sitrus_berry', qty: 2 },
              { itemId: 'poffin_cake', qty: 1 }
            ]
          },
          failResult: {
            title: '☕ 커피 취향 불일치',
            grade: 'ESCAPE',
            coins: 35,
            exp: 20,
            items: [{ itemId: 'sitrus_berry', qty: 1 }]
          }
        },
        {
          id: 'stealth_snatch',
          text: '💨 [살금살금 은신] 로켓단이 한눈판 사이 쿠키 상자만 낚아채서 튄다!',
          icon: '💨',
          reqDesc: '기본 성공률 95% (안전한 선택)',
          successRate: 0.95,
          successDialogue: '완벽한 은신 기술! 로켓단이 등 돌린 틈을 타 스낵 바구니를 품에 안고 쏜살같이 본부로 복귀했습니다.',
          failDialogue: '바닥의 비닐봉지를 바스락 밟아 들킬 뻔했습니다! 헐레벌떡 빈손으로 도망쳤습니다.',
          successResult: {
            title: '✨ 닌자 급속 간식 탈취!',
            grade: 'SUCCESS',
            coins: 110,
            exp: 55,
            items: [
              { itemId: 'oran_berry', qty: 2 },
              { itemId: 'sitrus_berry', qty: 1 }
            ]
          },
          failResult: {
            title: '🏃 헐레벌떡 줄행랑',
            grade: 'ESCAPE',
            coins: 30,
            exp: 15,
            items: []
          }
        }
      ]
    }
  ],
  exp_rooftop: [
    {
      id: 'rooftop_poacher_event',
      areaId: 'exp_rooftop',
      title: '🌿 화단의 수상한 밀렵꾼과 길 잃은 아기새!',
      npcName: '선글라스 포켓몬 밀렵꾼',
      npcPortrait: '🕵️',
      npcBadge: '화단 침입자',
      dialogue: [
        '이 옥상정원 화단에 전설의 날개가 깃든 신비한 알이 숨겨져 있다는 소문을 들었다...',
        '비켜라 꼬마야! 순순히 화단을 비우지 않으면 네 녀석의 털까지 몽땅 뽑아버리겠다!'
      ],
      choices: [
        {
          id: 'surprise_attack',
          text: '⚡ [기습 공격!] 화단 뒤에서 덤불을 박차고 덮친다!',
          icon: '⚡',
          reqDesc: '기본 성공률 65% (레벨 보정)',
          successRate: 0.65,
          successDialogue: '명중! 밀렵꾼이 당황해 던진 그물이 제 발에 걸려 넘어졌습니다! 바닥에 떨어진 밀렵꾼의 보물 가방을 통째로 압수했습니다!',
          failDialogue: '밀렵꾼의 연막탄에 기침을 콜록거리며 물러섰습니다. 흙먼지를 뒤집어썼습니다.',
          successResult: {
            title: '🏆 밀렵꾼 완전 제압!',
            grade: 'SUCCESS',
            coins: 280,
            exp: 160,
            items: [
              { itemId: 'mystery_egg', qty: 1 },
              { itemId: 'shiny_stone', qty: 1 }
            ]
          },
          failResult: {
            title: '💨 연막탄에 당황!',
            grade: 'FAIL',
            coins: 60,
            exp: 35,
            items: [{ itemId: 'oran_berry', qty: 1 }],
            cleanlinessDamage: 25,
            energyDamage: 15
          }
        },
        {
          id: 'flower_wind',
          text: '🌸 [꽃바람 날리기] 꽃가루를 흩뿌려 재채기를 유도한다',
          icon: '🌸',
          reqDesc: '기본 성공률 80% (친밀도 보정)',
          successRate: 0.80,
          successDialogue: '에취! 에취! 밀렵꾼이 정신없이 재채기를 하는 틈을 타 신선한 최고급 열매와 장난감을 낚아챘습니다!',
          failDialogue: '바람이 반대로 불어 오히려 이쪽이 에취! 재채기를 하며 슬금슬금 빠져나왔습니다.',
          successResult: {
            title: '💐 지혜로운 꽃가루 작전!',
            grade: 'SUCCESS',
            coins: 200,
            exp: 120,
            items: [
              { itemId: 'toy_ball', qty: 1 },
              { itemId: 'sitrus_berry', qty: 2 }
            ]
          },
          failResult: {
            title: '🤧 재채기 연발 후퇴',
            grade: 'ESCAPE',
            coins: 50,
            exp: 30,
            items: [{ itemId: 'sitrus_berry', qty: 1 }]
          }
        },
        {
          id: 'call_pidgeot',
          text: '🕊️ [옥상 새들에게 신호] 야생 피죤투 무리에 도움을 요청한다',
          icon: '🕊️',
          reqDesc: '기본 성공률 75%',
          successRate: 0.75,
          successDialogue: '푸드덕! 거대한 피죤투 무리가 강림하여 거센 바람으로 밀렵꾼을 옥상 밖으로 날려버렸습니다! 피죤투가 신비한 사탕을 선물했습니다.',
          failDialogue: '피죤투들이 낮잠을 자느라 날아오지 않았습니다. 조용히 풀숲 사이로 기어 나왔습니다.',
          successResult: {
            title: '🦅 하늘의 수호신 강림!',
            grade: 'SUCCESS',
            coins: 240,
            exp: 140,
            items: [
              { itemId: 'rare_candy', qty: 1 },
              { itemId: 'sitrus_berry', qty: 1 }
            ]
          },
          failResult: {
            title: '🌿 조용한 풀숲 후퇴',
            grade: 'ESCAPE',
            coins: 55,
            exp: 30,
            items: []
          }
        }
      ]
    }
  ],
  exp_server_room: [
    {
      id: 'server_hacker_crisis',
      areaId: 'exp_server_room',
      title: '🗄️ 서버실 블랙아웃과 로켓단 사이버 해커!',
      npcName: '로켓단 사이버 해커',
      npcPortrait: '💻',
      npcBadge: '전산망 암흑 지배자',
      dialogue: [
        '크크큭... 사내 서버를 모조리 다운시키고 금고의 이상한사탕과 연구 데이터를 전부 가로채겠다!',
        '침입자 경보? 조무래기 포켓몬 따위가 내 기가바이트 바이러스 공격을 버틸 수 있을까?!'
      ],
      choices: [
        {
          id: 'pull_plug',
          text: '🔌 [물리적 랜선 차단!] 해킹 중인 메인 전원 코드를 꽉 물어 뽑아버린다!',
          icon: '🔌',
          reqDesc: '기본 성공률 70% (레벨 보정)',
          successRate: 0.70,
          successDialogue: '탁! 전원이 차단되자 해커가 "내 데이터가아악!" 비명을 지르며 백도어 USB와 보물 광물을 떨어뜨리고 도망쳤습니다!',
          failDialogue: '스파크가 찌릿! 털이 곤두서며 깜짝 놀랐습니다. 엉겁결에 뒤로 물러났습니다.',
          successResult: {
            title: '🛡️ 사내 서버 완벽 수호!',
            grade: 'SUCCESS',
            coins: 390,
            exp: 250,
            items: [
              { itemId: 'rare_candy', qty: 1 },
              { itemId: 'shiny_stone', qty: 1 },
              { itemId: 'energy_drink', qty: 1 }
            ]
          },
          failResult: {
            title: '⚡ 스파크 감전 탈출',
            grade: 'FAIL',
            coins: 80,
            exp: 50,
            items: [{ itemId: 'energy_drink', qty: 1 }],
            energyDamage: 25,
            cleanlinessDamage: 15
          }
        },
        {
          id: 'power_recharge',
          text: '⚡ [비상 발전기 가동] 전력 스위치를 올려 서버실 백업 전원을 켠다!',
          icon: '⚡',
          reqDesc: '기본 성공률 60% (고난도 대박)',
          successRate: 0.60,
          successDialogue: '위이잉! 환한 조명이 켜지자 보안 시스템이 작동하여 해커를 체포했습니다! 전산팀장님이 눈물을 흘리며 특급 보상을 건넸습니다!',
          failDialogue: '과전류로 퓨즈가 펑! 경보 사이렌이 울려 황급히 환기구로 탈출했습니다.',
          successResult: {
            title: '👑 전산망 구원의 영웅!',
            grade: 'JACKPOT',
            coins: 500,
            exp: 320,
            items: [
              { itemId: 'rare_candy', qty: 2 },
              { itemId: 'mystery_egg', qty: 1 },
              { itemId: 'full_heal', qty: 1 }
            ]
          },
          failResult: {
            title: '🚨 경보 벨 속 긴급 탈출',
            grade: 'ESCAPE',
            coins: 90,
            exp: 60,
            items: [{ itemId: 'energy_drink', qty: 1 }]
          }
        },
        {
          id: 'snatch_backpack',
          text: '🗂️ [보급품 배낭 슬쩍] 해커가 바닥에 내려놓은 전리품 가방만 낚아챈다!',
          icon: '🗂️',
          reqDesc: '기본 성공률 85%',
          successRate: 0.85,
          successDialogue: '나이스 캐치! 해커가 모니터에 집중하는 사이 고가의 상처약과 회복제가 가득 든 가방을 완벽히 회수했습니다!',
          failDialogue: '캐비닛 문이 삐걱 소리를 내어 해커에게 들킬 뻔했습니다. 음료 한 캔만 챙겨 도망쳤습니다.',
          successResult: {
            title: '🎒 해커의 보급품 회수 완료!',
            grade: 'SUCCESS',
            coins: 310,
            exp: 190,
            items: [
              { itemId: 'full_heal', qty: 1 },
              { itemId: 'energy_drink', qty: 2 }
            ]
          },
          failResult: {
            title: '🏃 아슬아슬 캐비닛 탈출',
            grade: 'ESCAPE',
            coins: 95,
            exp: 55,
            items: [{ itemId: 'energy_drink', qty: 1 }]
          }
        }
      ]
    }
  ],
  exp_mountain: [
    {
      id: 'mountain_apollo_shrine',
      areaId: 'exp_mountain',
      title: '⛰️ 안개 낀 절벽, 전설의 제단 결전!',
      npcName: '로켓단 특수간부 아폴로',
      npcPortrait: '🦹',
      npcBadge: '로켓단 총사령관',
      dialogue: [
        '이 사옥 뒷산 정상의 고대 제단에 잠든 황금빛 전설의 알... 드디어 내 손에 들어왔다!',
        '감히 어린 녀석이 방해를 해? 내 다크 포켓몬의 압도적인 암흑 파워를 보여주마!'
      ],
      choices: [
        {
          id: 'pray_guardian',
          text: '🌟 [전설의 제단 기도] 수호신에게 기도를 올려 기적의 힘을 깨운다! (친밀도 우대)',
          icon: '🌟',
          reqDesc: '친밀도 70+ 일 때 성공률 대폭 상승!',
          successRate: 0.55,
          successDialogue: '하늘에서 눈부신 오색 빛기둥이 쏟아지며 전설의 포켓몬이 강림했습니다! 악당 아폴로를 일격에 날려버리고 최고급 황금알과 전설의 왕관을 선물했습니다!',
          failDialogue: '안개가 짙어 목소리가 닿지 않았습니다. 아폴로의 거센 암흑 파동에 밀려 가파른 숲길을 굴러 떨어졌습니다.',
          successResult: {
            title: '👑 [초특급 잭팟] 전설의 수호신 강림!',
            grade: 'JACKPOT',
            coins: 680,
            exp: 480,
            items: [
              { itemId: 'golden_egg', qty: 1 },
              { itemId: 'gold_crown', qty: 1 },
              { itemId: 'rare_candy', qty: 1 }
            ]
          },
          failResult: {
            title: '💥 절벽 굴러떨어짐...',
            grade: 'FAIL',
            coins: 120,
            exp: 80,
            items: [{ itemId: 'oran_berry', qty: 1 }],
            energyDamage: 40,
            cleanlinessDamage: 30
          }
        },
        {
          id: 'partner_combo',
          text: '⚔️ [영혼의 유대 총공격!] 파트너와 호흡을 맞춰 보스에게 돌진한다!',
          icon: '⚔️',
          reqDesc: '기본 성공률 65% (레벨 30+ 우대)',
          successRate: 0.65,
          successDialogue: '대폭발과 함께 완벽한 승리! 쓰러진 아폴로가 황급히 헬기를 타고 도망치며 전설알과 사탕을 떨어뜨렸습니다!',
          failDialogue: '보스의 강력한 반격에 뒤로 날아갔습니다. 간신히 비상 약초만 챙겨 퇴각했습니다.',
          successResult: {
            title: '🏆 로켓단 총사령관 격파!',
            grade: 'JACKPOT',
            coins: 580,
            exp: 400,
            items: [
              { itemId: 'golden_egg', qty: 1 },
              { itemId: 'rare_candy', qty: 2 },
              { itemId: 'shiny_stone', qty: 1 }
            ]
          },
          failResult: {
            title: '😵 강타를 맞고 후퇴',
            grade: 'FAIL',
            coins: 140,
            exp: 90,
            items: [{ itemId: 'full_heal', qty: 1 }],
            energyDamage: 30
          }
        },
        {
          id: 'sled_escape',
          text: '💨 [황금 상자 낚아채기] 보물이 든 상자를 낚아채고 썰매 타고 급경사 활강!',
          icon: '💨',
          reqDesc: '기본 성공률 80% (안전한 고수익)',
          successRate: 0.80,
          successDialogue: '짜릿한 알프스급 썰매 활강! 아폴로의 고함 소리를 뒤로하고 막대한 전리품과 보석을 품에 안고 본부에 안전 착지했습니다!',
          failDialogue: '돌부리에 걸려 엉덩방아를 찧었지만 보석 한 개는 사수했습니다.',
          successResult: {
            title: '⛷️ 스릴 만점 전리품 활강!',
            grade: 'SUCCESS',
            coins: 460,
            exp: 300,
            items: [
              { itemId: 'shiny_stone', qty: 2 },
              { itemId: 'rare_candy', qty: 1 },
              { itemId: 'mystery_egg', qty: 1 }
            ]
          },
          failResult: {
            title: '🪵 돌부리에 쿵!',
            grade: 'ESCAPE',
            coins: 160,
            exp: 110,
            items: [{ itemId: 'shiny_stone', qty: 1 }],
            energyDamage: 15
          }
        }
      ]
    }
  ]
};

export function getRandomStoryEvent(areaId: string): ExpeditionStoryEvent {
  const events = EXPEDITION_STORY_EVENTS[areaId] || EXPEDITION_STORY_EVENTS['exp_pantry'];
  const idx = Math.floor(Math.random() * events.length);
  return events[idx];
}

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

/**
 * 🌟 진화 단계(stageIndex)에 따른 포켓몬 스탯(에너지, 청결도, 배고픔/포만도) 최대치 계산
 * - 0단계 (기본/아기 폼): 최대 100
 * - 1단계 (1차 진화 폼): 최대 150
 * - 2단계 (2차/최종 진화 폼): 최대 200
 * - 3단계 이상 (특수/메가 진화 폼): 최대 250
 */
export function getMaxStatForStage(stageIndex: number = 0): number {
  const stage = Math.max(0, stageIndex || 0);
  return 100 + stage * 50;
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

// 🦊 이브이 8대 진화체 목록 (확률 진화)
export const EEVEE_BRANCHES: EvolutionStage[] = [
  {
    id: 134,
    name: '샤미드',
    minLevel: 25,
    minHappiness: 60,
    types: ['water'],
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/134.png',
    showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/134.gif',
    genCategory: 'gen1-2'
  },
  {
    id: 135,
    name: '쥬피썬더',
    minLevel: 25,
    minHappiness: 60,
    types: ['electric'],
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/135.png',
    showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/135.gif',
    genCategory: 'gen1-2'
  },
  {
    id: 136,
    name: '부스터',
    minLevel: 25,
    minHappiness: 60,
    types: ['fire'],
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/136.png',
    showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/136.gif',
    genCategory: 'gen1-2'
  },
  {
    id: 196,
    name: '에브이',
    minLevel: 25,
    minHappiness: 60,
    types: ['psychic'],
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/196.png',
    showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/196.gif',
    genCategory: 'gen1-2'
  },
  {
    id: 197,
    name: '블래키',
    minLevel: 25,
    minHappiness: 60,
    types: ['dark'],
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/197.png',
    showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/197.gif',
    genCategory: 'gen1-2'
  },
  {
    id: 470,
    name: '리피아',
    minLevel: 25,
    minHappiness: 60,
    types: ['grass'],
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/470.png',
    showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/470.gif',
    genCategory: 'gen1-2'
  },
  {
    id: 471,
    name: '글레이시아',
    minLevel: 25,
    minHappiness: 60,
    types: ['ice'],
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/471.png',
    showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/471.gif',
    genCategory: 'gen1-2'
  },
  {
    id: 700,
    name: '님피아',
    minLevel: 25,
    minHappiness: 60,
    types: ['fairy'],
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/700.png',
    showdownSprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/700.gif',
    genCategory: 'gen1-2'
  }
];

export function getRandomEeveeEvolution(): EvolutionStage {
  const idx = Math.floor(Math.random() * EEVEE_BRANCHES.length);
  return EEVEE_BRANCHES[idx];
}

/**
 * 🥚 알에서 태어날 아기 포켓몬 결정 함수
 * - 일반 포켓몬 알(🥚): 오직 친근한 일반 포켓몬 풀에서만 부화 (1.5% 행운의 이로치)
 * - 전설 & 특수 포켓몬 알(🌟):
 *    ① 50% 확률: 지방 리전폼(알로라/가라르/히스이)/거다이맥스/전설/환상/600족 포켓몬 (20% 확률로 이로치 보너스!)
 *    ② 50% 확률: 일반 포켓몬 풀의 100% 확정 이로치(✨ Shiny) 탄생!
 */
export function hatchBabyPokemon(isGolden: boolean = false): {
  chainIdx: number;
  isShiny: boolean;
} {
  // 1. 특수/전설/리전폼/거다이맥스 체인과 일반 체인 엄격하게 분리
  const specialIndices: number[] = [];
  const normalIndices: number[] = [];

  STARTER_CHAINS.forEach((chain, idx) => {
    const isSpecial = chain.some(stage => stage.genCategory === 'special') ||
      chain.some(stage => 
        stage.name.includes('알로라') || 
        stage.name.includes('가라르') || 
        stage.name.includes('히스이') || 
        stage.name.includes('팔데아') || 
        stage.name.includes('거다이맥스') || 
        stage.name.includes('뮤') || 
        stage.name.includes('지라치') || 
        stage.name.includes('빅티니') || 
        stage.name.includes('세레비') || 
        stage.name.includes('코스모그') ||
        stage.name.includes('마기라스') ||
        stage.name.includes('보만다')
      );

    if (isSpecial) {
      specialIndices.push(idx);
    } else {
      normalIndices.push(idx);
    }
  });

  if (isGolden) {
    // 🌟 전설 & 특수 포켓몬 알: 방식 B (지방/거다이맥스/전설 포켓몬 OR 일반 포켓몬 100% 확정 이로치)
    const isSpecialPool = Math.random() < 0.5; // 50% 특수/지방/전설알, 50% 일반 포켓몬 확정 이로치

    if (isSpecialPool && specialIndices.length > 0) {
      // ① 지방 리전폼 / 거다이맥스 / 전설 포켓몬 등장 (20% 확률로 이로치 보너스)
      const chainIdx = specialIndices[Math.floor(Math.random() * specialIndices.length)];
      const isShiny = Math.random() < 0.20;
      return { chainIdx, isShiny };
    } else {
      // ② 일반 포켓몬 풀에서 100% 확정 이로치(✨ Shiny) 탄생!
      const pool = normalIndices.length > 0 ? normalIndices : Array.from({ length: STARTER_CHAINS.length }, (_, i) => i);
      const chainIdx = pool[Math.floor(Math.random() * pool.length)];
      return { chainIdx, isShiny: true };
    }
  } else {
    // 🥚 일반 포켓몬 알: 오직 친근한 일반 포켓몬들 풀에서만 부화 (희귀/리전폼/전설/거다이맥스 제외)
    const pool = normalIndices.length > 0 ? normalIndices : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const chainIdx = pool[Math.floor(Math.random() * pool.length)];
    const isShiny = Math.random() < 0.015;
    return { chainIdx, isShiny };
  }
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
      { id: 'stk_init_1', stickerId: 'heart', icon: '💖', label: '하트', x: 15, y: 20, type: 'sticker', scale: 1 },
      { id: 'stk_init_2', stickerId: 'star', icon: '⭐', label: '별', x: 80, y: 15, type: 'sticker', scale: 1 },
      { id: 'stk_init_3', stickerId: 'acorn', icon: '🌰', label: '둡토리', x: 45, y: 75, type: 'sticker', scale: 1 },
      { id: 'stk_init_4', stickerId: 'txt_welcome', text: '두부월드에 오신 것을 환영해요! ✨', label: '환영 말풍선', x: 28, y: 18, type: 'bubble', styleType: 'classic_bubble', scale: 1 }
    ],
    pokemonPlacements: {},
    statusMsg: '오늘도 포켓몬과 함께 즐거운 파밍 🎵 1촌 환영!',
    bgmSong: '프리스타일 - Y (Feat. 지선)',
    todayCount: 0,
    totalCount: 0,
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
    heartsCount: 0
  };
}

export const FARM_CURRENT_SAVE_KEY = 'pokefarm_save_data_current_active';

// 유효한 농장 세이브 데이터인지 판별 (생성 완료된 농장)
export function isValidFarmSave(state: any): state is FarmState {
  if (!state || typeof state !== 'object') return false;
  return !!(
    state.isInitialized ||
    state.activePokemon ||
    (state.graduatedPokemon && state.graduatedPokemon.length > 0) ||
    (state.ownerName && state.ownerName !== '지우' && state.ownerName.trim().length > 0)
  );
}

// 로컬스토리지 로드 (졸업생 0마리인 신규 농장도 정상 로드)
export function loadFarmState(ownerName?: string): FarmState {
  try {
    let parsed: FarmState | null = null;

    // 1순위: ownerName이 전달된 경우 해당 ownerName별 세이브 데이터 우선 로드
    if (ownerName && ownerName.trim()) {
      const ownerKey = `${FARM_STORAGE_KEY}_${ownerName.trim()}`;
      const ownerRaw = localStorage.getItem(ownerKey);
      if (ownerRaw) {
        try {
          const candidate = JSON.parse(ownerRaw) as FarmState;
          if (isValidFarmSave(candidate)) {
            parsed = candidate;
          }
        } catch (e) {}
      }
    }

    // 2순위: 가장 최근에 플레이하던 내 브라우저 통합 세이브 데이터 (FARM_CURRENT_SAVE_KEY)
    if (!parsed) {
      const currentActiveRaw = localStorage.getItem(FARM_CURRENT_SAVE_KEY);
      if (currentActiveRaw) {
        try {
          const candidate = JSON.parse(currentActiveRaw) as FarmState;
          if (isValidFarmSave(candidate)) {
            parsed = candidate;
          }
        } catch (e) {}
      }
    }

    // 3순위: 브라우저에 저장된 이전의 모든 pokefarm_save_data_ 키 자동 스캔 & 복구
    if (!parsed) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(FARM_STORAGE_KEY) && key !== FARM_CURRENT_SAVE_KEY) {
          const candidateRaw = localStorage.getItem(key);
          if (candidateRaw) {
            try {
              const candidate = JSON.parse(candidateRaw) as FarmState;
              if (isValidFarmSave(candidate)) {
                parsed = candidate;
                console.log(`[PokeFarm] 🌟 기존 농장 세이브 데이터 자동 복구 성공 (Key: ${key})`);
                break;
              }
            } catch (e) {}
          }
        }
      }
    }

    if (parsed && isValidFarmSave(parsed)) {
      parsed.reservePokemon = parsed.reservePokemon || [];
      parsed.graduatedPokemon = parsed.graduatedPokemon || [];
      parsed.stickers = parsed.stickers || [];
      parsed.pokemonPlacements = parsed.pokemonPlacements || {};
      if (parsed.incubatingEgg === undefined) parsed.incubatingEgg = null;
      parsed.isInitialized = true;

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

      // 💖 실제 수치 보정
      if (parsed.heartsCount === 12) {
        parsed.heartsCount = 0;
      }
      if (parsed.todayCount && parsed.todayCount > 100 && (!parsed.totalCount || parsed.totalCount > 4000)) {
        parsed.todayCount = 0;
        parsed.totalCount = 0;
      }
      parsed.heartsCount = parsed.heartsCount || 0;
      parsed.todayCount = parsed.todayCount || 0;
      parsed.totalCount = parsed.totalCount || 0;

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

      // 통합 키 및 ownerName 저장 동기화
      localStorage.setItem(FARM_CURRENT_SAVE_KEY, JSON.stringify(parsed));
      if (parsed.ownerName) {
        localStorage.setItem(`${FARM_STORAGE_KEY}_${parsed.ownerName}`, JSON.stringify(parsed));
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

// 로컬스토리지 저장 (졸업생 유무와 상관없이 설립된 농장 정상 저장)
export function saveFarmState(state: FarmState): void {
  try {
    if (!state || !isValidFarmSave(state)) {
      return;
    }
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

// 🌟 브라우저 및 로컬에 저장된 실제 유저 농장 목록 전체 스캔
export function getAllStoredFarms(): NeighborFarmData[] {
  const farmMap = new Map<string, NeighborFarmData>();

  try {
    // 1. 개별 농장 키 스캔 (FARM_STORAGE_KEY_xxx)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(FARM_STORAGE_KEY) && key !== FARM_CURRENT_SAVE_KEY) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const state = JSON.parse(raw) as FarmState;
          if (state && state.ownerName && isValidFarmSave(state)) {
            const cleanUser = state.ownerName.trim();
            farmMap.set(cleanUser, {
              username: cleanUser,
              farmName: state.farmName || `${cleanUser}님의 포켓농장`,
              activePokemon: state.activePokemon || null,
              reservePokemon: state.reservePokemon || [],
              graduatedPokemon: state.graduatedPokemon || [],
              graduatedCount: state.graduatedPokemon ? state.graduatedPokemon.length : 0,
              heartsCount: state.heartsCount || 0,
              bgTheme: state.bgTheme || 'classic',
              stickers: state.stickers || [],
              pokemonPlacements: state.pokemonPlacements || {},
              statusMsg: state.statusMsg || '',
              todayCount: state.todayCount || 0,
              totalCount: state.totalCount || 0,
              isOnline: true
            });
          }
        } catch (e) {
          // ignore error
        }
      }
    }

    // 2. 현재 활성 세이브 키(FARM_CURRENT_SAVE_KEY)를 최우선 덮어씌워 최신 상태 보장
    const currentRaw = localStorage.getItem(FARM_CURRENT_SAVE_KEY);
    if (currentRaw) {
      try {
        const state = JSON.parse(currentRaw) as FarmState;
        if (state && state.ownerName && isValidFarmSave(state)) {
          const cleanUser = state.ownerName.trim();
          farmMap.set(cleanUser, {
            username: cleanUser,
            farmName: state.farmName || `${cleanUser}님의 포켓농장`,
            activePokemon: state.activePokemon || null,
            reservePokemon: state.reservePokemon || [],
            graduatedPokemon: state.graduatedPokemon || [],
            graduatedCount: state.graduatedPokemon ? state.graduatedPokemon.length : 0,
            heartsCount: state.heartsCount || 0,
            bgTheme: state.bgTheme || 'classic',
            stickers: state.stickers || [],
            pokemonPlacements: state.pokemonPlacements || {},
            statusMsg: state.statusMsg || '',
            todayCount: state.todayCount || 0,
            totalCount: state.totalCount || 0,
            isOnline: true
          });
        }
      } catch (e) {}
    }
  } catch (err) {
    console.error('Failed to scan local farms:', err);
  }

  return Array.from(farmMap.values()).sort((a, b) => (b.heartsCount || 0) - (a.heartsCount || 0));
}

