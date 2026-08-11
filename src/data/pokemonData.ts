import type { PokemonData } from '../types/pokemon';

export const POKEMON_ROSTER: PokemonData[] = [
  {
    id: 25,
    name: 'Pikachu',
    koreanName: '피카츄',
    types: ['electric'],
    stats: { hp: 120, attack: 85, defense: 60, spAtk: 90, spDef: 80, speed: 105 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/25.gif',
    },
    moves: [
      { id: '10万볼트', name: '10만볼트', type: 'electric', category: 'special', power: 90, accuracy: 100, maxPp: 15, pp: 15, description: '강한 전기를 내뿜어 공격한다.' },
      { id: '볼트태클', name: '볼트태클', type: 'electric', category: 'physical', power: 120, accuracy: 100, maxPp: 10, pp: 10, description: '전기를 두르고 강력하게 돌진한다.' },
      { id: '아이언테일', name: '아이언테일', type: 'steel', category: 'physical', power: 100, accuracy: 75, maxPp: 15, pp: 15, description: '단단한 꼬리로 때려 공격한다.' },
      { id: '전광석화', name: '전광석화', type: 'normal', category: 'physical', power: 40, accuracy: 100, maxPp: 30, pp: 30, description: '엄청난 스피드로 선제공격한다.' }
    ]
  },
  {
    id: 6,
    name: 'Charizard',
    koreanName: '리자몽',
    types: ['fire', 'flying'],
    stats: { hp: 156, attack: 104, defense: 98, spAtk: 129, spDef: 105, speed: 120 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/6.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/6.gif',
    },
    moves: [
      { id: '화염방사', name: '화염방사', type: 'fire', category: 'special', power: 90, accuracy: 100, maxPp: 15, pp: 15, description: '세찬 화염을 뿜어 공격한다.' },
      { id: '에어슬래시', name: '에어슬래시', type: 'flying', category: 'special', power: 75, accuracy: 95, maxPp: 15, pp: 15, description: '공기 날카로운 바람으로 벤다.' },
      { id: '드래곤클로', name: '드래곤클로', type: 'dragon', category: 'physical', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '예리한 손톱으로 적을 베어 낸다.' },
      { id: '오버히트', name: '오버히트', type: 'fire', category: 'special', power: 130, accuracy: 90, maxPp: 5, pp: 5, description: '풀파워로 대폭발 화염을 뿜는다.' }
    ]
  },
  {
    id: 9,
    name: 'Blastoise',
    koreanName: '거북왕',
    types: ['water'],
    stats: { hp: 158, attack: 98, defense: 120, spAtk: 105, spDef: 125, speed: 98 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/9.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/9.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/9.gif',
    },
    moves: [
      { id: '하이드로펌프', name: '하이드로펌프', type: 'water', category: 'special', power: 110, accuracy: 80, maxPp: 5, pp: 5, description: '대량의 수압으로 날려버린다.' },
      { id: '파도타기', name: '파도타기', type: 'water', category: 'special', power: 90, accuracy: 100, maxPp: 15, pp: 15, description: '큰 파도를 일으켜 공격한다.' },
      { id: '냉동빔', name: '냉동빔', type: 'ice', category: 'special', power: 90, accuracy: 100, maxPp: 10, pp: 10, description: '영하의 냉기를 발사한다.' },
      { id: '러스터캐논', name: '러스터캐논', type: 'steel', category: 'special', power: 80, accuracy: 100, maxPp: 10, pp: 10, description: '빛나는 금속 광선을 쏜다.' }
    ]
  },
  {
    id: 3,
    name: 'Venusaur',
    koreanName: '이상해꽃',
    types: ['grass', 'poison'],
    stats: { hp: 160, attack: 97, defense: 103, spAtk: 120, spDef: 120, speed: 90 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/3.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/3.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/3.gif',
    },
    moves: [
      { id: '솔라빔', name: '솔라빔', type: 'grass', category: 'special', power: 120, accuracy: 100, maxPp: 10, pp: 10, description: '태양광 에너지를 집약해 방사한다.' },
      { id: '오물폭탄', name: '오물폭탄', type: 'poison', category: 'special', power: 90, accuracy: 100, maxPp: 10, pp: 10, description: '더러운 오물을 던져 폭발시킨다.' },
      { id: '기가드레인', name: '기가드레인', type: 'grass', category: 'special', power: 75, accuracy: 100, maxPp: 10, pp: 10, description: '상대의 영양을 흡수해 HP를 회복한다.' },
      { id: '지진', name: '지진', type: 'ground', category: 'physical', power: 100, accuracy: 100, maxPp: 10, pp: 10, description: '땅을 강하게 흔들어 대미지를 준다.' }
    ]
  },
  {
    id: 150,
    name: 'Mewtwo',
    koreanName: '뮤츠',
    types: ['psychic'],
    stats: { hp: 186, attack: 130, defense: 100, spAtk: 174, spDef: 100, speed: 150 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/150.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/150.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/150.gif',
    },
    moves: [
      { id: '사이코키네시스', name: '사이코키네시스', type: 'psychic', category: 'special', power: 90, accuracy: 100, maxPp: 10, pp: 10, description: '강력한 염동력으로 공격한다.' },
      { id: '파동탄', name: '파동탄', type: 'fighting', category: 'special', power: 80, accuracy: 100, maxPp: 20, pp: 20, description: '체내의 파동을 제어하여 날린다.' },
      { id: '섀도볼', name: '섀도볼', type: 'ghost', category: 'special', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '어둠의 구체를 내던져 공격한다.' },
      { id: '사이코브레이크', name: '사이코브레이크', type: 'psychic', category: 'special', power: 100, accuracy: 100, maxPp: 10, pp: 10, description: '물질화한 실체파를 적에게 날린다.' }
    ]
  },
  {
    id: 94,
    name: 'Gengar',
    koreanName: '팬텀',
    types: ['ghost', 'poison'],
    stats: { hp: 140, attack: 75, defense: 70, spAtk: 150, spDef: 85, speed: 130 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/94.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/94.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/94.gif',
    },
    moves: [
      { id: '섀도볼', name: '섀도볼', type: 'ghost', category: 'special', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '어둠의 구체를 내던져 공격한다.' },
      { id: '오물웨이브', name: '오물웨이브', type: 'poison', category: 'special', power: 95, accuracy: 100, maxPp: 10, pp: 10, description: '오물 파도로 주위를 삼킨다.' },
      { id: '기합구슬', name: '기합구슬', type: 'fighting', category: 'special', power: 120, accuracy: 70, maxPp: 5, pp: 5, description: '기합을 모아 파괴력 있는 구체를 던진다.' },
      { id: '10万볼트', name: '10만볼트', type: 'electric', category: 'special', power: 90, accuracy: 100, maxPp: 15, pp: 15, description: '강한 전기를 내뿜어 공격한다.' }
    ]
  },
  {
    id: 448,
    name: 'Lucario',
    koreanName: '루카리오',
    types: ['fighting', 'steel'],
    stats: { hp: 150, attack: 130, defense: 80, spAtk: 135, spDef: 80, speed: 110 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/448.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/448.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/448.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/448.gif',
    },
    moves: [
      { id: '파동탄', name: '파동탄', type: 'fighting', category: 'special', power: 80, accuracy: 100, maxPp: 20, pp: 20, description: '파동을 뭉쳐 적에게 발사한다.' },
      { id: '인파이트', name: '인파이트', type: 'fighting', category: 'physical', power: 120, accuracy: 100, maxPp: 5, pp: 5, description: '방어를 버리고 육박해 난타한다.' },
      { id: '불렛펀치', name: '불렛펀치', type: 'steel', category: 'physical', power: 40, accuracy: 100, maxPp: 30, pp: 30, description: '탄환처럼 빠르게 권격을 날린다.' },
      { id: '신속', name: '신속', type: 'normal', category: 'physical', power: 80, accuracy: 100, maxPp: 5, pp: 5, description: '눈에 보이지 않는 스피드로 선제공격.' }
    ]
  },
  {
    id: 149,
    name: 'Dragonite',
    koreanName: '망나뇽',
    types: ['dragon', 'flying'],
    stats: { hp: 170, attack: 154, defense: 115, spAtk: 120, spDef: 120, speed: 100 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/149.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/149.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/149.gif',
    },
    moves: [
      { id: '역린', name: '역린', type: 'dragon', category: 'physical', power: 120, accuracy: 100, maxPp: 10, pp: 10, description: '날뛰어 대미지를 준다.' },
      { id: '공중날기', name: '공중날기', type: 'flying', category: 'physical', power: 90, accuracy: 95, maxPp: 15, pp: 15, description: '높이 날아올라 공격한다.' },
      { id: '불꽃펀치', name: '불꽃펀치', type: 'fire', category: 'physical', power: 75, accuracy: 100, maxPp: 15, pp: 15, description: '불꽃을 띤 주먹으로 친다.' },
      { id: '지진', name: '지진', type: 'ground', category: 'physical', power: 100, accuracy: 100, maxPp: 10, pp: 10, description: '땅을 강하게 흔들어 대미지를 준다.' }
    ]
  },
  {
    id: 445,
    name: 'Garchomp',
    koreanName: '한카리아스',
    types: ['dragon', 'ground'],
    stats: { hp: 180, attack: 150, defense: 115, spAtk: 90, spDef: 105, speed: 122 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/445.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/445.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/445.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/445.gif',
    },
    moves: [
      { id: '지진', name: '지진', type: 'ground', category: 'physical', power: 100, accuracy: 100, maxPp: 10, pp: 10, description: '땅을 흔들어 광범위 대미지를 준다.' },
      { id: '드래곤다이브', name: '드래곤다이브', type: 'dragon', category: 'physical', power: 100, accuracy: 75, maxPp: 10, pp: 10, description: '무시무시한 살기로 돌진한다.' },
      { id: '스톤샤워', name: '스톤샤워', type: 'rock', category: 'physical', power: 75, accuracy: 90, maxPp: 10, pp: 10, description: '큰 바위를 던져 공격한다.' },
      { id: '독찌르기', name: '독찌르기', type: 'poison', category: 'physical', power: 80, accuracy: 100, maxPp: 20, pp: 20, description: '독이 든 촉수나 촉각으로 찌른다.' }
    ]
  },
  {
    id: 130,
    name: 'Gyarados',
    koreanName: '갸라도스',
    types: ['water', 'flying'],
    stats: { hp: 175, attack: 145, defense: 99, spAtk: 80, spDef: 120, speed: 101 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/130.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/130.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/130.gif',
    },
    moves: [
      { id: '폭포오르기', name: '폭포오르기', type: 'water', category: 'physical', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '폭포를 오르듯 돌진한다.' },
      { id: '얼음의송곳니', name: '얼음의송곳니', type: 'ice', category: 'physical', power: 65, accuracy: 95, maxPp: 15, pp: 15, description: '냉기를 띤 송곳니로 문다.' },
      { id: '깨물어부수기', name: '깨물어부수기', type: 'dark', category: 'physical', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '날카로운 이빨로 깨물어 부순다.' },
      { id: '파괴광선', name: '파괴광선', type: 'normal', category: 'special', power: 150, accuracy: 90, maxPp: 5, pp: 5, description: '강력한 광선을 내뿜는다.' }
    ]
  },
  {
    id: 282,
    name: 'Gardevoir',
    koreanName: '가디안',
    types: ['psychic', 'fairy'],
    stats: { hp: 148, attack: 75, defense: 85, spAtk: 145, spDef: 135, speed: 100 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/282.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/282.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/282.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/282.gif',
    },
    moves: [
      { id: '문포스', name: '문포스', type: 'fairy', category: 'special', power: 95, accuracy: 100, maxPp: 15, pp: 15, description: '달의 힘을 빌려 공격한다.' },
      { id: '사이코키네시스', name: '사이코키네시스', type: 'psychic', category: 'special', power: 90, accuracy: 100, maxPp: 10, pp: 10, description: '강력한 염동력으로 공격한다.' },
      { id: '섀도볼', name: '섀도볼', type: 'ghost', category: 'special', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '어둠의 구체를 내던진다.' },
      { id: '10万볼트', name: '10만볼트', type: 'electric', category: 'special', power: 90, accuracy: 100, maxPp: 15, pp: 15, description: '전기 충격을 보낸다.' }
    ]
  },
  {
    id: 248,
    name: 'Tyranitar',
    koreanName: '마기라스',
    types: ['rock', 'dark'],
    stats: { hp: 180, attack: 154, defense: 130, spAtk: 105, spDef: 120, speed: 81 },
    sprites: {
      front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/248.png',
      back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/248.png',
      showdownFront: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/248.gif',
      showdownBack: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/248.gif',
    },
    moves: [
      { id: '스톤에지', name: '스톤에지', type: 'rock', category: 'physical', power: 100, accuracy: 80, maxPp: 5, pp: 5, description: '뾰족한 바위로 공격한다.' },
      { id: '깨물어부수기', name: '깨물어부수기', type: 'dark', category: 'physical', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '날카로운 이빨로 깨문다.' },
      { id: '지진', name: '지진', type: 'ground', category: 'physical', power: 100, accuracy: 100, maxPp: 10, pp: 10, description: '땅을 강하게 흔든다.' },
      { id: '불꽃펀치', name: '불꽃펀치', type: 'fire', category: 'physical', power: 75, accuracy: 100, maxPp: 15, pp: 15, description: '불꽃을 띤 주먹으로 친다.' }
    ]
  }
];
