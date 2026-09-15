import type { MapData, Quest, Item, EndingType, EndingMeta, HeroType } from '../types/dubuRpg';

export interface HeroInfo {
  id: HeroType;
  name: string;
  englishName: string;
  breed: string;
  title: string;
  desc: string;
  tagline: string;
  badge: string;
  spriteImg: string;
  dialogImg: string;
  sleepImg: string;
  badgeColor: string;
  accentColor: string;
  specialTrait: string;
  callName: string;
  topicName: string;
  possessiveName: string;
}

export const HEROES_CONFIG: Record<HeroType, HeroInfo> = {
  dubu: {
    id: 'dubu',
    name: '두부',
    englishName: 'Dubu',
    breed: '시골 믹스견',
    title: '씩씩한 모험 대장',
    desc: '호기심 많고 당당한 순백의 시골 강아지! 냄새맡기와 탐험을 제일 좋아해요.',
    tagline: '🐶 "세상 모든 보물은 내 코가 다 찾아낼 거야!"',
    badge: '🐾 씩씩한 모험가',
    spriteImg: '/images/trainer_dubu.png',
    dialogImg: '/images/dubu_dialog_face.jpg',
    sleepImg: '/images/dubu_cushion_sleep.png',
    badgeColor: '#f59e0b',
    accentColor: '#fbbf24',
    specialTrait: '킁킁 탐지 레이더 (보물 발견 확률 UP)',
    callName: '두부야',
    topicName: '두부는',
    possessiveName: '두부의'
  },
  guruem: {
    id: 'guruem',
    name: '구름이',
    englishName: 'Guruem',
    breed: '사랑스러운 말티즈',
    title: '복슬복슬 힐링 천사',
    desc: '구름처럼 뽀송뽀송하고 해맑은 미소를 지닌 댕댕이! 따뜻한 주황색 하네스를 매고 있어요.',
    tagline: '☁️ "보송보송 구름이와 함께라면 어디든 행복해!"',
    badge: '☁️ 힐링 댕댕이',
    spriteImg: '/images/trainer_guruem.png',
    dialogImg: '/images/guruem_dialog_face.jpg',
    sleepImg: '/images/guruem_cushion_sleep.png',
    badgeColor: '#38bdf8',
    accentColor: '#60a5fa',
    specialTrait: '구름 살랑 애교 (행복도 회복 속도 UP)',
    callName: '구름아',
    topicName: '구름이는',
    possessiveName: '구름이의'
  }
};

export const ENDINGS_DATA: Record<EndingType, EndingMeta> = {
  true_rainbow: {
    id: 'true_rainbow',
    type: 'true',
    title: '별빛 은하수 대축제: 영원히 함께하는 행복한 꼬리',
    badge: '🌟 TRUE ENDING',
    icon: '✨',
    image: '/images/dubu_rpg_title.jpg',
    desc: '4개의 영롱한 별빛 씨앗이 하나로 모여 밤하늘에 눈부신 별빛 은하수가 펼쳐졌습니다! 두부와 다정한 집사, 그리고 온 마을 친구들이 모두 건강하게 오래오래 함께하며 전설의 달콤 황금 고구마를 나누어 먹는 감동의 힐링 대축제! 두부의 꼬리 끝에서 퐁퐁 솟아난 따뜻한 행복의 별빛이 온 세상을 영원히 환하게 밝혔습니다! 🐶❤️✨',
    conditionHint: '모든 친구들(순자 할머니, 나비, 바니)의 퀘스트를 완료하고 4개의 별빛 조각을 모아 별빛 언덕의 황금 상자 열기'
  },
  fake_sleep: {
    id: 'fake_sleep',
    type: 'fake',
    title: '방석 밖은 위험해: 영원한 꿀잠 요정 두부',
    badge: '💤 FAKE ENDING 1',
    icon: '🛌',
    image: '/images/dubu_cushion_sleep.png',
    desc: '바깥세상 모험도 좋지만... 폭신한 잿빛 방석과 인형 친구들 품속이 세상에서 제일 좋아! 두부는 이불 속으로 쏙 파고들어 배를 발라당 까고 영원한 꿀잠 요정이 되었습니다. 오늘도 내일도 드르렁 쿨쿨 뒹굴뒹굴~ (체력 9999% 회복, Zzz...)',
    conditionHint: '두부의 방에서 푹신 방석 침대를 조사한 후 [방석 밖은 위험해! 하루 종일 꿀잠자기] 선택하기'
  },
  fake_sweet_potato: {
    id: 'fake_sweet_potato',
    type: 'fake',
    title: '볼살 빵빵: 고구마 독점 대왕 댕댕이',
    badge: '🍠 FAKE ENDING 2',
    icon: '👑',
    image: '/images/dubu_dialog_face.jpg',
    desc: '모험이고 별빛이고... 고구마가 최고야! 두부는 친구들에게 나눠줄 생각도 잊은 채 산더미 같은 달콤 고구마를 전부 혼자 와구와구 먹어치웠습니다. 그 결과 꽃바람 마을 제일의 통통하고 털찐 고구마 대왕 댕댕이가 되었습니다! 걸을 때마다 볼살과 뱃살이 퐁퐁 흔들립니다.',
    conditionHint: '마을 광장의 대형 꿀고구마 바구니를 조사하고 [배 터지게 전부 혼자 먹어치우기!]를 선택하거나 고구마 5개 연속 먹방하기'
  },
  fake_cat: {
    id: 'fake_cat',
    type: 'fake',
    title: '골골골~ 야옹! 냥냥제국의 명예 집사 두부',
    badge: '🐱 FAKE ENDING 3',
    icon: '🐾',
    image: '/images/trainer_dubu.png',
    desc: '두부는 더 이상 멍멍 짖지 않기로 결심했습니다. "골골골... 야옹~!" 고양이 나비에게 냥냥식 그루밍과 턱 긁기를 시전하여 냥냥제국 최고 명예 집사 댕댕이로 공식 임명되었습니다. 매일매일 최고급 츄르와 은빛 캣닢으로 만수무강 누리는 중!',
    conditionHint: '고양이 나비에게 캣닢을 전달한 후 [야옹~ 나비 님을 주인님으로 모시겠습니다!] 선택하기'
  }
};

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'sweet_potato_dry',
    name: '꿀고구마 말랭이',
    icon: '🍠',
    desc: '달콤하고 쫄깃한 고구마 말랭이! 두부의 최애 간식. (체력 +30 회복)',
    count: 2,
    usable: true
  }
];

export const INITIAL_QUESTS: Record<string, Quest> = {
  quest_morning: {
    id: 'quest_morning',
    title: '두부의 아침 산책',
    desc: '포근한 방에서 일어나 시원한 물을 마시고, 정원을 거쳐 마을로 나가 햇살을 만끽하자!',
    giver: '두부',
    giverIcon: '🐶',
    reward: '행복도 +20, 꿀고구마 말랭이 1개',
    completed: false,
    progress: 0,
    target: 1,
    targetHint: '방 남쪽 문으로 나가 정원을 지나 마을 광장으로 가보세요!'
  },
  quest_grandma: {
    id: 'quest_grandma',
    title: '순자 할머니의 사랑과 간식',
    desc: '마을 광장의 순자 할머니께 꼬리를 살랑살랑 흔들며 반갑게 인사드리자.',
    giver: '순자 할머니',
    giverIcon: '👵',
    reward: '꿀고구마 말랭이 2개, 행복도 +25',
    completed: false,
    progress: 0,
    target: 1,
    targetHint: '마을 광장 서쪽 쉼터 평상의 순자 할머니께 다가가 대화하세요.'
  },
  quest_cat_catnip: {
    id: 'quest_cat_catnip',
    title: '고양이 나비의 캣닢 심부름',
    desc: '솔바람 숲속 서쪽 개울가에 자라난 은빛 캣닢 풀잎을 킁킁 찾아 나비에게 가져다주자.',
    giver: '길고양이 나비',
    giverIcon: '🐱',
    reward: '파랑 별빛 조각, 생선 트릿',
    completed: false,
    progress: 0,
    target: 1,
    targetHint: '솔바람 숲 서쪽 개울가 다리 근처, 은빛 향기 물결이 퐁퐁 피어오르는 풀숲을 조사하세요!'
  },
  quest_bunny_letter: {
    id: 'quest_bunny_letter',
    title: '바니 우체부의 잃어버린 편지 가방',
    desc: '토끼 우체부가 숲속에서 잃어버린 편지 가방을 찾아주자. 숲속 흙길을 킁킁 탐색하자!',
    giver: '토끼 우체부 바니',
    giverIcon: '🐰',
    reward: '주황 별빛 조각, 황금 리본 목걸이',
    completed: false,
    progress: 0,
    target: 1,
    targetHint: '솔바람 숲 북동쪽 나무 밑 반짝이는 땅을 파보세요.'
  },
  quest_rainbow_stars: {
    id: 'quest_rainbow_stars',
    title: '별빛 언덕의 4대 소원 씨앗',
    desc: '마당, 마을, 숲, 호수 곳곳에서 4개의 별빛 조각을 모아 별빛 언덕 소원의 고목에게 전하자!',
    giver: '댕댕이 초코',
    giverIcon: '🐕',
    reward: '별빛 제단 열림, 행복도 +50',
    completed: false,
    progress: 0,
    target: 4,
    targetHint: '정원 흙더미, 나비의 보답, 바니의 보답, 은하수 호숫가에서 4개를 모으세요.'
  },
  quest_golden_sweet_potato: {
    id: 'quest_golden_sweet_potato',
    title: '전설의 황금 고구마 & 대축제',
    desc: '별빛 언덕 소원의 고목 상자를 열어 황금 고구마를 찾고 온 마을 친구들과 힐링 파티를 즐기자!',
    giver: '소원의 고목',
    giverIcon: '✨',
    reward: '✨ 해피 힐링 진엔딩 달성 ✨',
    completed: false,
    progress: 0,
    target: 1,
    targetHint: '4개 별빛 조각을 모두 모은 뒤 별빛 언덕 보물상자를 조사하세요!'
  }
};

// 🗺️ MAP 1: 두부의 포근한 방 (Dubu's Cozy Room)
const HOME_MAP: MapData = {
  id: 'home',
  name: '두부의 포근한 방',
  width: 14,
  height: 10,
  theme: 'indoor',
  bgImage: '/images/map_home.jpg',
  tiles: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  portals: [
    {
      x: 2,
      y: 9,
      targetMapId: 'garden',
      targetX: 8,
      targetY: 2,
      targetDir: 'down',
      label: '햇살 가득 정원으로'
    },
    {
      x: 3,
      y: 9,
      targetMapId: 'garden',
      targetX: 8,
      targetY: 2,
      targetDir: 'down',
      label: '햇살 가득 정원으로'
    }
  ],
  npcs: [
    {
      id: 'human_owner',
      name: '다정한 집사',
      role: '사랑하는 가족',
      x: 10,
      y: 5,
      sprite: '🧑‍💻',
      spriteImg: '/images/npc_butler.png',
      dir: 'down',
      dialogs: [
        { speaker: '집사', text: '두부야 안녕! 오늘도 잘 잤니? 아이 예뻐라~ (머리를 쓰다듬어 준다 ❤️)', sound: 'bark' },
        { speaker: '두부', text: '헤헤! 꼬리를 세차게 흔들며 집사의 손에 얼굴을 비볐다!', sound: 'wag' },
        { speaker: '집사', text: '오늘 날씨 정말 좋다! 정원에 나가서 꽃향기도 맡고 마을 친구들도 만나고 오렴!', sound: 'bell' }
      ]
    }
  ],
  interactables: [
    {
      id: 'cozy_bed',
      x: 10,
      y: 3,
      type: 'bed',
      icon: '🛌',
      name: '두부의 폭신폭신 침대',
      dialogs: [
        { speaker: '시스템', text: 'dubu1.jpg에 나온 전설의 폭신 회색 방석 침대입니다. 갈색 곰돌이와 분홍 인형이 함께 누워있습니다.', sound: 'bell' },
        {
          speaker: '두부의 선택',
          text: '포근한 방석 침대에서 어떻게 할까?',
          choices: [
            { label: '🛌 방석 밖은 위험해! 하루 종일 꿀잠자기 (Zzz...)', actionKey: 'trigger_sleep_ending' },
            { label: '🐾 잠깐 누워 쉬고 저장하기 (체력 100% 회복)', actionKey: 'rest_and_save' }
          ]
        }
      ]
    },
    {
      id: 'water_bowl',
      x: 3,
      y: 2,
      type: 'water',
      icon: '🥣',
      name: '신선한 물그릇',
      dialogs: [
        { speaker: '두부', text: '할짝할짝! 시원하고 맑은 물을 기분 좋게 꿀꺽 마셨습니다! 상쾌해졌다!', sound: 'bell' }
      ]
    },
    {
      id: 'food_bowl',
      x: 2,
      y: 2,
      type: 'food',
      icon: '🥩',
      name: '바삭바삭 사료 그릇',
      dialogs: [
        { speaker: '두부', text: '아작아작 고소한 강아지 맘마를 냠냠 맛있게 먹었다! 배가 든든하다!', sound: 'bell' }
      ]
    }
  ]
};

// 🗺️ MAP 2: 햇살 가득 정원 (Sunny Garden)
const GARDEN_MAP: MapData = {
  id: 'garden',
  name: '햇살 가득 정원',
  width: 16,
  height: 12,
  theme: 'garden',
  bgImage: '/images/map_garden.jpg',
  tiles: [
    [1, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 3, 0, 0, 0, 4, 4, 0, 0, 0, 3, 0, 0, 1],
    [1, 0, 3, 3, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 3, 3, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 3, 3, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 3, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 1]
  ],
  portals: [
    {
      x: 7,
      y: 0,
      targetMapId: 'home',
      targetX: 2,
      targetY: 8,
      targetDir: 'up',
      label: '두부의 방으로 들어가기'
    },
    {
      x: 8,
      y: 0,
      targetMapId: 'home',
      targetX: 3,
      targetY: 8,
      targetDir: 'up',
      label: '두부의 방으로 들어가기'
    },
    {
      x: 7,
      y: 11,
      targetMapId: 'village',
      targetX: 10,
      targetY: 2,
      targetDir: 'down',
      label: '꽃바람 마을 광장으로 나가기'
    },
    {
      x: 8,
      y: 11,
      targetMapId: 'village',
      targetX: 11,
      targetY: 2,
      targetDir: 'down',
      label: '꽃바람 마을 광장으로 나가기'
    }
  ],
  npcs: [
    {
      id: 'chick_piyak',
      name: '아기 병아리 삐약이',
      role: '정원의 귀요미',
      x: 5,
      y: 5,
      sprite: '🐥',
      spriteImg: '/images/npc_chicks.png',
      dir: 'left',
      dialogs: [
        { speaker: '삐약이', text: '삐약삐약! 두부 삼촌이다! 오늘 나비들이 마당에 많이 놀러왔어요!', sound: 'bell' },
        { speaker: '두부', text: '멍멍! (꼬리를 흔들며 상냥하게 코인사를 나눴다)', sound: 'bark' },
        { speaker: '삐약이', text: '저기 풀숲 구석에 뭔가 반짝이는 게 묻혀있는 것 같던데요? 코로 킁킁 찾아보세요!', sound: 'bell' }
      ]
    }
  ],
  interactables: [
    {
      id: 'garden_dig_star1',
      x: 3,
      y: 3,
      type: 'dig_spot',
      icon: '✨',
      name: '흙더미 속 비밀 보물',
      reqSniff: true,
      itemRewardId: 'rainbow_star_1',
      dialogs: [
        { speaker: '두부', text: '킁킁! 흙에서 향긋하고 신비로운 빛이 난다! 앞발로 열심히 팍팍 파헤쳤다!', sound: 'sniff' },
        { speaker: '시스템', text: '🎉 [초록 별빛 조각]을 발견했습니다! 소원의 별빛 씨앗 중 하나다!', sound: 'item' }
      ]
    },
    {
      id: 'garden_mailbox',
      x: 10,
      y: 2,
      type: 'mailbox',
      icon: '📫',
      name: '두부네 빨간 우체통',
      dialogs: [
        { speaker: '시스템', text: '따뜻한 사랑이 담긴 우체통입니다. 편지가 도착해 있습니다.', sound: 'bell' },
        { speaker: '편지', text: '💌 "두부야, 언제나 네 사랑스럽고 밝은 미소가 우리 모두의 큰 행복이란다!" - 동네 주민 일동', sound: 'bell' }
      ]
    }
  ]
};

// 🗺️ MAP 3: 꽃바람 마을 광장 (Flower Breeze Village Square)
const VILLAGE_MAP: MapData = {
  id: 'village',
  name: '꽃바람 마을 광장',
  width: 22,
  height: 16,
  theme: 'village',
  bgImage: '/images/map_village.jpg',
  tiles: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 0, 2, 2, 2, 2, 0, 4, 4, 4, 4, 4, 4, 4, 4],
    [1, 0, 0, 0, 0, 0, 0, 4, 0, 2, 2, 2, 2, 0, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  portals: [
    {
      x: 10,
      y: 0,
      targetMapId: 'garden',
      targetX: 7,
      targetY: 10,
      targetDir: 'up',
      label: '두부네 정원으로'
    },
    {
      x: 11,
      y: 0,
      targetMapId: 'garden',
      targetX: 8,
      targetY: 10,
      targetDir: 'up',
      label: '두부네 정원으로'
    },
    {
      x: 0,
      y: 5,
      targetMapId: 'forest',
      targetX: 20,
      targetY: 8,
      targetDir: 'left',
      label: '솔바람 숲 오솔길로'
    },
    {
      x: 0,
      y: 6,
      targetMapId: 'forest',
      targetX: 20,
      targetY: 8,
      targetDir: 'left',
      label: '솔바람 숲 오솔길로'
    },
    {
      x: 21,
      y: 5,
      targetMapId: 'rainbow_hill',
      targetX: 2,
      targetY: 7,
      targetDir: 'right',
      label: '별빛 언덕으로'
    },
    {
      x: 21,
      y: 6,
      targetMapId: 'rainbow_hill',
      targetX: 2,
      targetY: 7,
      targetDir: 'right',
      label: '별빛 언덕으로'
    }
  ],
  npcs: [
    {
      id: 'npc_grandma',
      name: '순자 할머니',
      role: '다정한 이웃 할머니',
      x: 7,
      y: 3,
      sprite: '👵',
      spriteImg: '/images/npc_grandma.png',
      dir: 'down',
      dialogs: [
        { speaker: '순자 할머니', text: '어이구~ 우리 귀여운 두부 왔네! 털이 어쩜 이리 하얗고 복슬복슬할까~', sound: 'bell' },
        { speaker: '두부', text: '멍! 멍! (기분 좋게 꼬리를 살랑살랑 흔들었다!)', sound: 'bark' },
        { speaker: '순자 할머니', text: '착하기도 하지~ 방금 가마솥에서 쪄낸 달콤한 [꿀고구마 말랭이] 좀 먹으렴!', sound: 'item' }
      ],
      questIdTrigger: 'quest_grandma'
    },
    {
      id: 'npc_cat_nabi',
      name: '길고양이 나비',
      role: '마을의 도도한 고양이',
      x: 15,
      y: 7,
      sprite: '🐱',
      spriteImg: '/images/npc_cat.png',
      dir: 'left',
      dialogs: [
        { speaker: '나비', text: '야옹~ 두부 안녕? 서쪽 솔바람 숲속 개울가에 향기로운 [싱싱한 캣닢]이 자라난다고 하던데...', sound: 'bell' },
        { speaker: '나비', text: '내 부탁을 들어주면, 내가 호숫가에서 건져둔 신비로운 [파랑 별빛 조각]을 줄게! 킁킁 찾아다 줄래?', sound: 'sniff' }
      ],
      questIdTrigger: 'quest_cat_catnip'
    },
    {
      id: 'npc_bunny_postman',
      name: '토끼 우체부 바니',
      role: '꽃바람 우체부',
      x: 5,
      y: 8,
      sprite: '🐰',
      spriteImg: '/images/npc_bunny.png',
      dir: 'right',
      dialogs: [
        { speaker: '바니', text: '으아앙 두부야! 솔바람 숲길에서 돌부리에 걸려 넘어지는 바람에 [편지 가방]을 잃어버렸어!', sound: 'bell' },
        { speaker: '바니', text: '너의 밝은 코로 숲속 어딘가에 떨어진 가방을 킁킁 찾아줄 수 있을까? 부탁해!', sound: 'sniff' }
      ],
      questIdTrigger: 'quest_bunny_letter'
    },
    {
      id: 'npc_dog_choco',
      name: '댕댕이 친구 초코',
      role: '활발한 갈색 강아지',
      x: 16,
      y: 4,
      sprite: '🐕',
      spriteImg: '/images/npc_choco.png',
      dir: 'down',
      dialogs: [
        { speaker: '초코', text: '두부야 왈왈! 오늘 동쪽 별빛 언덕에 전설의 은하수 별빛 축제가 열린대! 소원의 고목에 4개 별빛을 바치면 전설의 보물이 나온대!', sound: 'bark' },
        { speaker: '두부', text: '멍! (귀를 쫑긋 세우며 눈을 반짝였다!)', sound: 'wag' }
      ],
      questIdTrigger: 'quest_rainbow_stars'
    }
  ],
  interactables: [
    {
      id: 'village_save_crystal',
      x: 13,
      y: 8,
      type: 'save_crystal',
      icon: '🔮',
      name: '별빛 세이브 비석',
      dialogs: [
        { speaker: '시스템', text: '영롱한 푸른빛을 내뿜는 별빛 세이브 비석입니다. 지금까지의 모험 기록을 안전하게 중간 저장할 수 있습니다.', sound: 'bell' }
      ]
    },
    {
      id: 'fountain',
      x: 10,
      y: 6,
      type: 'water',
      icon: '⛲',
      name: '마을 중앙 분수대',
      dialogs: [
        { speaker: '두부', text: '분수대에서 맑은 물방울이 퐁퐁 솟구친다! 시원한 물방울에 코를 대고 킁킁거렸다.', sound: 'sniff' }
      ]
    },
    {
      id: 'giant_sweet_potato_basket',
      x: 14,
      y: 3,
      type: 'giant_basket',
      icon: '🍠',
      name: '특대 꿀고구마 바구니',
      dialogs: [
        { speaker: '시스템', text: '방금 쪄내어 김이 모락모락 피어오르는 달콤한 꿀고구마가 가득 담긴 특대 바구니입니다! 달콤한 단내가 진동합니다.', sound: 'bell' },
        {
          speaker: '두부의 선택',
          text: '산더미 같은 꿀고구마를 보고 침이 꼴깍 넘어간다...',
          choices: [
            { label: '🍠 배 터지게 전부 혼자 먹어치우기! (와구와구)', actionKey: 'eat_all_potatoes' },
            { label: '🌟 친구들과 나눌 수 있게 아껴두기', actionKey: 'keep_potatoes' }
          ]
        }
      ]
    }
  ]
};

// 🗺️ MAP 4: 솔바람 숲 오솔길 (Whispering Forest)
const FOREST_MAP: MapData = {
  id: 'forest',
  name: '솔바람 숲 오솔길',
  width: 22,
  height: 16,
  theme: 'forest',
  bgImage: '/images/map_forest.jpg',
  tiles: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [1, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [1, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 1, 0, 0, 2, 2, 4, 4, 2, 2, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  portals: [
    {
      x: 21,
      y: 6,
      targetMapId: 'village',
      targetX: 2,
      targetY: 5,
      targetDir: 'right',
      label: '꽃바람 마을 광장으로'
    },
    {
      x: 21,
      y: 7,
      targetMapId: 'village',
      targetX: 2,
      targetY: 6,
      targetDir: 'right',
      label: '꽃바람 마을 광장으로'
    }
  ],
  npcs: [
    {
      id: 'squirrel_dotori',
      name: '다람쥐 도토리',
      role: '숲의 수집가',
      x: 16,
      y: 3,
      sprite: '🐿️',
      dir: 'down',
      dialogs: [
        { speaker: '다람쥐 도토리', text: '안녕 두부야! 저기 서쪽 개울가 다리 옆 풀숲에서 싱그러운 은빛 향기가 피어오르고 있어! 나비가 찾는 [은빛 캣닢]인 것 같아!', sound: 'bell' },
        { speaker: '다람쥐 도토리', text: '그리고 숲속 나무 밑에 떨어진 반짝이는 가방은 토끼 아저씨 거 맞지? 둘 다 냄새로 킁킁 찾아봐!', sound: 'bell' },
        { speaker: '두부', text: '멍멍! (꼬리를 빠르게 흔들며 고마움을 전했다!)', sound: 'wag' }
      ]
    }
  ],
  interactables: [
    {
      id: 'forest_catnip',
      x: 6,
      y: 4,
      type: 'bush',
      icon: '🌿',
      name: '개울가 은빛 캣닢 풀숲 (향기 솔솔)',
      itemRewardId: 'catnip_leaf',
      dialogs: [
        { speaker: '두부', text: '킁킁! 싱그럽고 은은한 박하향 은빛 캣닢을 찾았다! 나비가 무척 좋아하겠다!', sound: 'sniff' },
        { speaker: '시스템', text: '🎉 [싱싱한 캣닢 잎]을 획득했습니다!', sound: 'item' }
      ]
    },
    {
      id: 'forest_lost_letter',
      x: 18,
      y: 4,
      type: 'dig_spot',
      icon: '🎒',
      name: '바니의 떨어진 우편 가방',
      reqSniff: true,
      itemRewardId: 'lost_letter_bag',
      dialogs: [
        { speaker: '두부', text: '킁킁! 나뭇잎 밑에서 토끼 우체부 바니의 가죽 가방 냄새가 난다!', sound: 'sniff' },
        { speaker: '시스템', text: '🎉 [바니의 우편 가방]을 찾았습니다! 바니에게 전해주자!', sound: 'item' }
      ]
    },
    {
      id: 'forest_berries',
      x: 4,
      y: 11,
      type: 'bush',
      icon: '🍓',
      name: '달콤 산딸기 덤불',
      itemRewardId: 'strawberry_berry',
      dialogs: [
        { speaker: '두부', text: '빨갛게 잘 익은 달콤한 산딸기를 따먹었다! 상큼달콤 기운 충전!', sound: 'item' }
      ]
    }
  ]
};

// 🗺️ MAP 5: 별빛 언덕 & 은하수 호수 (Starlight Hill & Milky Way Lake)
const RAINBOW_MAP: MapData = {
  id: 'rainbow_hill',
  name: '별빛 언덕 & 은하수 호수',
  width: 20,
  height: 15,
  theme: 'rainbow',
  bgImage: '/images/map_rainbow_hill.jpg',
  tiles: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 1],
    [1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 1],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  portals: [
    {
      x: 0,
      y: 6,
      targetMapId: 'village',
      targetX: 20,
      targetY: 5,
      targetDir: 'left',
      label: '꽃바람 마을 광장으로'
    },
    {
      x: 0,
      y: 7,
      targetMapId: 'village',
      targetX: 20,
      targetY: 6,
      targetDir: 'left',
      label: '꽃바람 마을 광장으로'
    }
  ],
  npcs: [
    {
      id: 'spirit_tree',
      name: '별빛 소원의 고목',
      role: '언덕의 수호신목',
      x: 10,
      y: 3,
      sprite: '🌳',
      dir: 'down',
      dialogs: [
        { speaker: '소원의 고목', text: '두부야, 참으로 맑고 착한 마음을 지닌 강아지로구나.', sound: 'bell' },
        { speaker: '소원의 고목', text: '친구들을 돕고 4개의 별빛 조각을 모두 모아오면, 별빛 전설의 보물상자가 열릴 것이니라.', sound: 'bell' }
      ]
    }
  ],
  interactables: [
    {
      id: 'rainbow_lake_star4',
      x: 14,
      y: 10,
      type: 'water',
      icon: '🌟',
      name: '은하수 호숫가 수초',
      reqSniff: true,
      itemRewardId: 'rainbow_star_4',
      dialogs: [
        { speaker: '두부', text: '호숫가 수초 사이에서 은은하게 빛나는 보랏빛 별을 건져 올렸다!', sound: 'sniff' },
        { speaker: '시스템', text: '🎉 [보라 별빛 조각]을 획득했습니다!', sound: 'item' }
      ]
    },
    {
      id: 'legendary_chest',
      x: 10,
      y: 5,
      type: 'chest',
      icon: '🎁',
      name: '별빛 전설의 황금 상자',
      dialogs: [
        { speaker: '시스템', text: '영롱한 별빛으로 감싸인 전설의 보물상자입니다. 4개의 별빛 조각이 모두 모이면 열립니다!', sound: 'bell' }
      ]
    }
  ]
};

export const GAME_MAPS: Record<string, MapData> = {
  home: HOME_MAP,
  garden: GARDEN_MAP,
  village: VILLAGE_MAP,
  forest: FOREST_MAP,
  rainbow_hill: RAINBOW_MAP
};
