import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import type { FarmState, FarmPokemon, FarmItem, PartTimeJob, GraduationDiploma, EvolutionStage, GuestbookEntry, ExpeditionArea, IncubatingEgg, MinihompySticker, NeighborFarmData, PokemonPlacement, ExpeditionStoryEvent, StoryChoice } from '../types/farm';
import { 
  STARTER_CHAINS, 
  FARM_ITEMS, 
  FARM_JOBS, 
  EXPEDITION_AREAS,
  LOTTERY_SYMBOLS,
  drawLotteryReels,
  loadFarmState, 
  getStoredNeighborFarm,
  saveFarmState, 
  createNewFarmPokemon, 
  hatchBabyPokemon,
  playPokemonCry,
  getMaxExpForLevel,
  getAllPokedexEntries,
  getAllStoredFarms,
  EEVEE_BRANCHES,
  getRandomEeveeEvolution,
  getRandomStoryEvent,
  getMaxStatForStage,
  getInitialFarmState,
  clearFarmLocalSession,
  getTodayDateString
} from '../services/pokeFarmService';
import { 
  Sparkles, Trophy, Volume2, VolumeX, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import './PokeFarmGame.css';

interface PokeFarmGameProps {
  username: string;
  onLeaveRoom?: () => void;
  initialVisitingUser?: string | null;
  onClearInitialVisitingUser?: () => void;
  onSelectGame?: (gameKey: string) => void;
  onUserLogin?: (username: string) => void;
  onUserLogout?: () => void;
}

type FarmTab = 'minihome' | 'yard' | 'adopt' | 'evolve' | 'jobs' | 'expedition' | 'daycare' | 'lottery' | 'shop' | 'diplomas';

export interface PokemonSkillDef {
  slot: 1 | 2 | 3;
  name: string;
  fxClass: string;
  icon: string;
  desc: string;
}

/**
 * 🌟 각 포켓몬 타입/계열별 최대 3개의 대표 고유스킬 프리셋 반환
 */
export function getPokemonSkillSet(pmon?: FarmPokemon | null): PokemonSkillDef[] {
  if (!pmon) {
    return [
      { slot: 1, name: '화염방사', fxClass: 'skill-fx-fireblast', icon: '🔥', desc: '전방으로 콰아아아 뿜어내는 3중 고열 불길 스트림' },
      { slot: 2, name: '대문자', fxClass: 'skill-fx-firekanji', icon: '☄️', desc: '거대한 불 대(大) 자 형상으로 폭발하는 업화' },
      { slot: 3, name: '회오리불꽃', fxClass: 'skill-fx-firespin', icon: '🌪️', desc: '나선으로 회오리치는 화염 폭풍 스트림' }
    ];
  }

  const types = pmon.types || [];

  if (types.includes('fire')) {
    return [
      { slot: 1, name: '화염방사', fxClass: 'skill-fx-fireblast', icon: '🔥', desc: '입에서 콰아아아 뿜어내는 3중 고열 불길 스트림' },
      { slot: 2, name: '대문자', fxClass: 'skill-fx-firekanji', icon: '☄️', desc: '거대한 불 대(大) 자 형상으로 폭발하는 업화' },
      { slot: 3, name: '회오리불꽃', fxClass: 'skill-fx-firespin', icon: '🌪️', desc: '나선으로 회오리치는 화염 폭풍 스트림' }
    ];
  }

  if (types.includes('water')) {
    return [
      { slot: 1, name: '하이드로펌프', fxClass: 'skill-fx-hydropump', icon: '💧', desc: '입에서 뿜어나오는 3중 고압 수류 제트 빔' },
      { slot: 2, name: '하이드로캐논', fxClass: 'skill-fx-hydrocannon', icon: '🌊', desc: '거대 물구체가 폭발하는 고압 수압 포격' },
      { slot: 3, name: '거품광선', fxClass: 'skill-fx-bubblebeam', icon: '🫧', desc: '무수히 쏟아지는 무지개빛 고속 거품 탄환' }
    ];
  }

  if (types.includes('grass')) {
    return [
      { slot: 1, name: '솔라빔', fxClass: 'skill-fx-solarbeam', icon: '🍃', desc: '태양의 에너지를 쏘아내는 에메랄드 레이저 빔' },
      { slot: 2, name: '덩굴채찍', fxClass: 'skill-fx-vinewhip', icon: '🌿', desc: '날카롭게 공간을 가르는 듀얼 덩굴 채찍 참격' },
      { slot: 3, name: '꽃잎댄스', fxClass: 'skill-fx-petaldance', icon: '🌸', desc: '회오리바람을 타고 난무하는 벚꽃 잎날 폭풍' }
    ];
  }

  if (types.includes('electric')) {
    return [
      { slot: 1, name: '10만볼트', fxClass: 'skill-fx-thunderbolt', icon: '⚡', desc: '전방으로 작렬하는 초고압 황금 번개 줄기' },
      { slot: 2, name: '번개 (낙뢰)', fxClass: 'skill-fx-thunderstorm', icon: '🌩️', desc: '하늘에서 내리꽂히는 거대한 백청색 벼락 기둥' },
      { slot: 3, name: '볼트태클', fxClass: 'skill-fx-volttackle', icon: '⚡', desc: '고압 전기를 휘감고 돌진하는 전기 충격 링' }
    ];
  }

  if (types.includes('ghost') || types.includes('dark')) {
    return [
      { slot: 1, name: '섀도볼', fxClass: 'skill-fx-shadowball', icon: '👻', desc: '보랏빛 암흑 플라즈마 스트림' },
      { slot: 2, name: '나이트헤드', fxClass: 'skill-fx-nightshade', icon: '😈', desc: '붉은 안광과 함께 뿜어지는 저주의 검은 파동' },
      { slot: 3, name: '오물폭탄', fxClass: 'skill-fx-sludgebomb', icon: '💀', desc: '독성 액포가 연쇄 폭발하는 세례' }
    ];
  }

  if (types.includes('psychic')) {
    return [
      { slot: 1, name: '사이코키네시스', fxClass: 'skill-fx-psychic', icon: '🔮', desc: '시공간을 왜곡하는 네온 핑크 염동력 파동 링' },
      { slot: 2, name: '사이코브레이크', fxClass: 'skill-fx-psystrike', icon: '🌀', desc: '염동력 크리스탈 결정 칼날 쐐기 광선' },
      { slot: 3, name: '프리즘배리어', fxClass: 'skill-fx-prismbarrier', icon: '🛡️', desc: '빛을 굴절시키는 무지개빛 육각형 프리즘 역장' }
    ];
  }

  if (types.includes('dragon')) {
    return [
      { slot: 1, name: '용의파동', fxClass: 'skill-fx-dracometeor', icon: '🐉', desc: '용의 형상으로 전방을 휩쓰는 드래곤 브레스' },
      { slot: 2, name: '용성군', fxClass: 'skill-fx-meteorshower', icon: '🌠', desc: '하늘에서 비처럼 쏟아지는 불타는 유성우 폭격' },
      { slot: 3, name: '역린', fxClass: 'skill-fx-outrage', icon: '💥', desc: '붉은 분노의 드래곤 오라와 폭주 충격파' }
    ];
  }

  if (types.includes('fighting') || types.includes('rock') || types.includes('steel')) {
    return [
      { slot: 1, name: '파동탄', fxClass: 'skill-fx-aurasphere', icon: '💥', desc: '타오르는 푸른 파동 에너지 탄환' },
      { slot: 2, name: '본러시', fxClass: 'skill-fx-bonerush', icon: '⚔️', desc: '빛나는 에너지 본 블레이드 연속 난타' },
      { slot: 3, name: '스톤에지', fxClass: 'skill-fx-stoneedge', icon: '🪨', desc: '솟구치는 날카로운 첨탑 암석과 지진파' }
    ];
  }

  if (types.includes('ice')) {
    return [
      { slot: 1, name: '눈보라', fxClass: 'skill-fx-blizzard', icon: '❄️', desc: '영하 273도의 혹한 얼음 결정 눈보라 폭풍' },
      { slot: 2, name: '냉동빔', fxClass: 'skill-fx-icebeam', icon: '🧊', desc: '모든 것을 얼려버리는 지그재그 빙결 레이저' },
      { slot: 3, name: '오로라베일', fxClass: 'skill-fx-auroraveil', icon: '🌨️', desc: '영롱한 극광 오로라 빛장막과 서릿발' }
    ];
  }

  if (types.includes('flying')) {
    return [
      { slot: 1, name: '에어슬래시', fxClass: 'skill-fx-hurricane', icon: '🌪️', desc: '초음속으로 전방을 가르는 청록빛 진공 칼날' },
      { slot: 2, name: '태풍폭풍', fxClass: 'skill-fx-typhoon', icon: '🌀', desc: '모든 것을 빨아들이는 상승기류 회오리' },
      { slot: 3, name: '브레이브버드', fxClass: 'skill-fx-bravebird', icon: '🪶', desc: '푸른 불꽃을 휘감은 맹금 조류 돌진 빔' }
    ];
  }

  if (types.includes('fairy')) {
    return [
      { slot: 1, name: '문포스', fxClass: 'skill-fx-watershuriken', icon: '🌙', desc: '달의 에너지를 응축해 쏘아내는 요정 광선' },
      { slot: 2, name: '매지컬샤인', fxClass: 'skill-fx-magicalshine', icon: '✨', desc: '사방을 밝히는 무지개빛 요정 섬광 폭발' },
      { slot: 3, name: '하트스톰', fxClass: 'skill-fx-heartstorm', icon: '💖', desc: '사랑의 하트들이 소용돌이치며 뿜어지는 세례' }
    ];
  }

  // 기본 노말
  return [
    { slot: 1, name: '파괴광선', fxClass: 'skill-fx-gigaimpact', icon: '⭐', desc: '모든 것을 파괴하는 거대한 황금빛 레이저 빔' },
    { slot: 2, name: '기가임팩트', fxClass: 'skill-fx-gigaforce', icon: '💥', desc: '황금빛 충격파 링으로 감싸며 터지는 폭발' },
    { slot: 3, name: '은혜갚기', fxClass: 'skill-fx-splashrush', icon: '🌟', desc: '하늘 높이 뿜어내는 기적의 별빛 폭죽' }
  ];
}

export interface PokemonSkillEffect {
  id: string;
  name: string;
  pokemonName: string;
  icon: string;
  price: number;
  description: string;
  fxClass: string;
  previewColor: string;
}

export const POKEMON_SKILL_EFFECTS: PokemonSkillEffect[] = [
  {
    id: 'fx_charmander_fire',
    name: '화염방사 & 대문자 (Continuous Flamethrower)',
    pokemonName: '파이리 / 브케인 / 아차모 / 불꽃숭이 / 뚜꾸리 / 푸호꼬 / 냐오불 / 염버니 / 뜨아거 / 부스터',
    icon: '🔥',
    price: 60,
    description: '입에서 전방으로 콰아아아 뿜어져 나오는 거대한 고열 화염방사 불길 스트림 (sill-example 원작 애니메이션 스타일)',
    fxClass: 'skill-fx-fireblast',
    previewColor: '#f97316'
  },
  {
    id: 'fx_squirtle_water',
    name: '하이드로펌프 & 물대포 (Hydro Pump Stream)',
    pokemonName: '꼬부기 / 리아코 / 물짱이 / 팽도리 / 수댕이 / 개구마르 / 누리공 / 울머기 / 꾸왁스 / 잉어킹 / 갸라도스 / 발챙이 / 마릴 / 샤미드',
    icon: '💧',
    price: 60,
    description: '입에서 맹렬한 기세로 뿜어져 나가는 3중 나선 고압 수류 빔과 물보라 버블 스트림',
    fxClass: 'skill-fx-hydropump',
    previewColor: '#0ea5e9'
  },
  {
    id: 'fx_bulbasaur_solar',
    name: '솔라빔 & 잎날가르기 (Solar Beam Cannon)',
    pokemonName: '이상해씨 / 치코리타 / 나무지기 / 모부기 / 주리비얀 / 도치마론 / 나몰빼미 / 흥나숭 / 나오하 / 리피아 / 세레비',
    icon: '🍃',
    price: 60,
    description: '전방으로 굵고 눈부시게 방출되는 에메랄드 태양 에너지 레이저와 회전하는 잎날 커터',
    fxClass: 'skill-fx-solarbeam',
    previewColor: '#22c55e'
  },
  {
    id: 'fx_pikachu_thunder',
    name: '100만볼트 & 볼트태클 (Thunderbolt Arc Surge)',
    pokemonName: '피카츄 / 라이츄 / 쥬피썬더 / 알로라 라이츄',
    icon: '⚡',
    price: 60,
    description: '뺨과 몸에서 전방으로 지그재그 작렬하는 초고압 황금 번개 줄기와 방전 스파크',
    fxClass: 'skill-fx-thunderbolt',
    previewColor: '#fbbf24'
  },
  {
    id: 'fx_gengar_shadow',
    name: '섀도볼 & 암흑 파동 (Shadow Void Stream)',
    pokemonName: '고오스 / 고우스트 / 팬텀 / 블래키 / 히스이 조로아크',
    icon: '👻',
    price: 70,
    description: '심연에서 소용돌이치며 뿜어나오는 보랏빛 암흑 플라즈마 기둥과 도깨비불 엠버',
    fxClass: 'skill-fx-shadowball',
    previewColor: '#a855f7'
  },
  {
    id: 'fx_mewtwo_psychic',
    name: '사이코키네시스 (Psychic Wave Distortion)',
    pokemonName: '뮤 / 뮤츠 / 에브이 / 고라파덕 / 골덕 / 지라치',
    icon: '🔮',
    price: 80,
    description: '전방으로 시공간을 왜곡하며 다중 방출되는 네온 핑크 염동력 파동 링과 광선',
    fxClass: 'skill-fx-psychic',
    previewColor: '#ec4899'
  },
  {
    id: 'fx_dragonite_meteor',
    name: '용성군 & 용의 파동 (Draco Dragon Breath)',
    pokemonName: '미뇽 / 신뇽 / 망나뇽 / 딥상어동 / 한카리아스',
    icon: '🐉',
    price: 80,
    description: '용의 형상으로 전방을 휩쓰는 청록-보랏빛 드래곤 에너지 브레스와 유성 스트림',
    fxClass: 'skill-fx-dracometeor',
    previewColor: '#8b5cf6'
  },
  {
    id: 'fx_lucario_aurasphere',
    name: '파동탄 & 대지의 분노 (Aura Sphere & Earth Wave)',
    pokemonName: '리오르 / 루카리오 / 애버라스 / 데기라스 / 마기라스 / 솔가레오',
    icon: '💥',
    price: 70,
    description: '타오르는 푸른 파동 에너지 탄환과 솟구치는 지각 충격파 펄스',
    fxClass: 'skill-fx-aurasphere',
    previewColor: '#3b82f6'
  },
  {
    id: 'fx_lapras_blizzard',
    name: '눈보라 & 절대영도 (Blizzard Freeze Stream)',
    pokemonName: '알로라 식스테일 / 알로라 나인테일 / 글레이시아',
    icon: '❄️',
    price: 60,
    description: '영하 273도의 얼음 결정과 눈보라 폭풍이 뿜어져 나오는 혹한의 냉기 브레스',
    fxClass: 'skill-fx-blizzard',
    previewColor: '#67e8f9'
  },
  {
    id: 'fx_pidgeot_tornado',
    name: '폭풍 & 에어슬래시 (Hurricane Slash Cyclone)',
    pokemonName: '피존 / 피죤투 / 비행 포켓몬',
    icon: '🌪️',
    price: 50,
    description: '초음속으로 전방을 가르는 반투명 청록색 진공 칼날 돌풍과 에어 소용돌이',
    fxClass: 'skill-fx-hurricane',
    previewColor: '#38bdf8'
  },
  {
    id: 'fx_greninja_watershuriken',
    name: '물수리검 & 문포스 (Water Shuriken & Moonblast)',
    pokemonName: '개굴닌자 / 토게피 / 토게틱 / 토게키스 / 님피아 / 빅티니',
    icon: '🌊',
    price: 70,
    description: '초고속 연사되는 듀얼 물수리검 궤적과 신비로운 핑크빛 요정 달빛 광선',
    fxClass: 'skill-fx-watershuriken',
    previewColor: '#0284c7'
  },
  {
    id: 'fx_snorlax_giga',
    name: '파괴광선 & 기가임팩트 (Hyper Beam Destruction)',
    pokemonName: '가로막구리 / 잉어킹 / 잠만보 / 일반 노말 포켓몬',
    icon: '⭐',
    price: 70,
    description: '모든 것을 관통하는 거대하고 묵직한 황금빛 파괴광선 레이저 빔 스트림',
    fxClass: 'skill-fx-gigaimpact',
    previewColor: '#eab308'
  },
  {
    id: 'fx_fire_kanji',
    name: '대문자 (Fire Blast Kanji Burst)',
    pokemonName: '불꽃 포켓몬 2스킬 (파이리/리자몽 등)',
    icon: '☄️',
    price: 65,
    description: '거대한 불 대(大) 자 형상으로 폭발하며 전방을 집어삼키는 업화',
    fxClass: 'skill-fx-firekanji',
    previewColor: '#dc2626'
  },
  {
    id: 'fx_fire_spin',
    name: '회오리불꽃 (Fire Spin Cyclone)',
    pokemonName: '불꽃 포켓몬 3스킬 (파이리/리자몽 등)',
    icon: '🌪️',
    price: 65,
    description: '이중 나선으로 회전하며 전방을 불태우는 거대 화염 회오리 스트림',
    fxClass: 'skill-fx-firespin',
    previewColor: '#f97316'
  },
  {
    id: 'fx_water_cannon',
    name: '하이드로캐논 (Hydro Cannon Blast)',
    pokemonName: '물 포켓몬 2스킬 (꼬부기/거북왕 등)',
    icon: '🌊',
    price: 65,
    description: '초고압 압축 물구체와 수압 충격파 링이 쏘아지는 헤비 캐논',
    fxClass: 'skill-fx-hydrocannon',
    previewColor: '#0284c7'
  },
  {
    id: 'fx_water_bubble',
    name: '거품광선 (Bubble Beam Shower)',
    pokemonName: '물 포켓몬 3스킬 (꼬부기/거북왕 등)',
    icon: '🫧',
    price: 60,
    description: '무수히 쏟아져 나오는 무지개빛 고속 거품 탄환 세례',
    fxClass: 'skill-fx-bubblebeam',
    previewColor: '#38bdf8'
  },
  {
    id: 'fx_grass_vinewhip',
    name: '덩굴채찍 (Vine Whip Slash)',
    pokemonName: '풀 포켓몬 2스킬 (이상해씨/이상해꽃 등)',
    icon: '🌿',
    price: 60,
    description: '날카롭게 공간을 가르는 듀얼 에메랄드 덩굴 채찍 참격',
    fxClass: 'skill-fx-vinewhip',
    previewColor: '#16a34a'
  },
  {
    id: 'fx_grass_petaldance',
    name: '꽃잎댄스 (Petal Dance Tornado)',
    pokemonName: '풀 포켓몬 3스킬 (이상해씨/이상해꽃 등)',
    icon: '🌸',
    price: 65,
    description: '회오리바람을 타고 난무하는 핑크빛 벚꽃 잎날 폭풍',
    fxClass: 'skill-fx-petaldance',
    previewColor: '#f472b6'
  },
  {
    id: 'fx_thunder_storm',
    name: '번개 낙뢰 (Thunder Storm Column)',
    pokemonName: '전기 포켓몬 2스킬 (피카츄/라이츄 등)',
    icon: '🌩️',
    price: 65,
    description: '하늘에서 내리꽂히는 거대하고 눈부신 백청색 벼락 기둥',
    fxClass: 'skill-fx-thunderstorm',
    previewColor: '#facc15'
  },
  {
    id: 'fx_thunder_volttackle',
    name: '볼트태클 (Volt Tackle Rush)',
    pokemonName: '전기 포켓몬 3스킬 (피카츄/라이츄 등)',
    icon: '⚡',
    price: 70,
    description: '초고압 전기를 온몸에 휘감고 돌진하는 고속 방전 링',
    fxClass: 'skill-fx-volttackle',
    previewColor: '#fbbf24'
  },
  {
    id: 'fx_ghost_nightshade',
    name: '나이트헤드 (Night Shade Gaze)',
    pokemonName: '고스트/악 포켓몬 2스킬 (팬텀 등)',
    icon: '😈',
    price: 65,
    description: '공포의 붉은 안광과 함께 전방으로 뿜어지는 저주의 검은 파동',
    fxClass: 'skill-fx-nightshade',
    previewColor: '#ef4444'
  },
  {
    id: 'fx_psychic_psystrike',
    name: '사이코브레이크 (Psystrike Blade)',
    pokemonName: '에스퍼 포켓몬 2스킬 (뮤/뮤츠 등)',
    icon: '🌀',
    price: 75,
    description: '염동력 크리스탈 결정 칼날 쐐기가 적을 꿰뚫는 광선',
    fxClass: 'skill-fx-psystrike',
    previewColor: '#ec4899'
  },
  {
    id: 'fx_dragon_meteorshower',
    name: '용성군 유성 폭격 (Meteor Shower Rain)',
    pokemonName: '드래곤 포켓몬 2스킬 (망나뇽 등)',
    icon: '🌠',
    price: 80,
    description: '하늘에서 비처럼 쏟아져 내리는 불타는 유성우 폭격',
    fxClass: 'skill-fx-meteorshower',
    previewColor: '#f97316'
  },
  {
    id: 'fx_fighting_bonerush',
    name: '본러시 & 인파이트 (Bone Rush Blades)',
    pokemonName: '격투 포켓몬 2스킬 (루카리오 등)',
    icon: '⚔️',
    price: 70,
    description: '푸른 에너지 본 블레이드로 연속 교차 난타하는 잔상',
    fxClass: 'skill-fx-bonerush',
    previewColor: '#3b82f6'
  }
];

export const DIVERSE_STICKERS = [
  // 🛋️ 1. 거실 & 인테리어 가구 (Living Room & Furniture)
  { id: 'sofa_leather', icon: '🛋️', label: '럭셔리 가죽 소파', category: 'living' },
  { id: 'armchair_wood', icon: '🪑', label: '원목 안락의자', category: 'living' },
  { id: 'table_wood', icon: '🪵', label: '앤틱 원목 티테이블', category: 'living' },
  { id: 'bookshelf_large', icon: '📚', label: '월넛 대형 책장', category: 'living' },
  { id: 'floor_lamp', icon: '🏮', label: '미니 무드 스탠드', category: 'living' },
  { id: 'mirror_full', icon: '🪞', label: '골드 프레임 전신거울', category: 'living' },
  { id: 'cuckoo_clock', icon: '🕰️', label: '레트로 뻐꾸기 벽시계', category: 'living' },
  { id: 'monstera_pot', icon: '🪴', label: '대형 몬스테라 화분', category: 'living' },
  { id: 'soft_rug', icon: '🧶', label: '포근한 원형 러그', category: 'living' },
  { id: 'smart_tv', icon: '📺', label: '벽걸이 스마트 TV', category: 'living' },
  { id: 'audio_speaker', icon: '🔊', label: '하이파이 오디오 스피커', category: 'living' },
  { id: 'brick_fireplace', icon: '🧱', label: '벽돌 벽난로', category: 'living' },
  { id: 'room_curtain', icon: '🚪', label: '아늑한 룸 파티션', category: 'living' },
  { id: 'tissue_box', icon: '🧻', label: '앤틱 티슈함', category: 'living' },

  // 🛏️ 2. 침실 & 힐링 휴식 (Bedroom & Cozy Comfort)
  { id: 'bed_king_fluffy', icon: '🛏️', label: '포근한 호텔 침대', category: 'bedroom' },
  { id: 'nightstand_drawer', icon: '🗄️', label: '침실 협탁 서랍장', category: 'bedroom' },
  { id: 'teddy_bear_plush', icon: '🧸', label: '폭신폭신 곰인형', category: 'bedroom' },
  { id: 'candle_warmer', icon: '🕯️', label: '아로마 캔들 워머', category: 'bedroom' },
  { id: 'alarm_clock_twin', icon: '⏰', label: '트윈벨 알람 시계', category: 'bedroom' },
  { id: 'dreamcatcher_feathers', icon: '🪶', label: '행운의 드림캐처', category: 'bedroom' },
  { id: 'hanger_closet', icon: '👗', label: '원목 옷걸이 행거', category: 'bedroom' },
  { id: 'cozy_slippers', icon: '🩴', label: '폭신 룸 슬리퍼', category: 'bedroom' },
  { id: 'music_box_melody', icon: '🎶', label: '태엽 멜로디 오르골', category: 'bedroom' },
  { id: 'night_sky_globe', icon: '🌌', label: '오로라 룸 조명', category: 'bedroom' },
  { id: 'sleep_mask_pillow', icon: '💤', label: '꿀잠 안대 & 베개', category: 'bedroom' },

  // 💻 3. 서재 & 게이밍 PC룸 (Study & PC Gaming Zone)
  { id: 'rgb_gaming_pc', icon: '🖥️', label: 'RGB 게이밍 데스크탑', category: 'gaming' },
  { id: 'laptop_pro_metal', icon: '💻', label: '슬림 노트북', category: 'gaming' },
  { id: 'console_controller', icon: '🎮', label: '무선 게임 패드', category: 'gaming' },
  { id: 'vr_headset_meta', icon: '🥽', label: 'VR 헤드셋', category: 'gaming' },
  { id: 'gaming_headphones', icon: '🎧', label: '서라운드 게이밍 헤드셋', category: 'gaming' },
  { id: 'retro_arcade_machine', icon: '🕹️', label: '레트로 아케이드 오락기', category: 'gaming' },
  { id: 'mechanical_keyboard', icon: '⌨️', label: '기계식 게이밍 키보드', category: 'gaming' },
  { id: 'rgb_gaming_mouse', icon: '🖱️', label: '초경량 게이밍 마우스', category: 'gaming' },
  { id: 'telescope_astro', icon: '🔭', label: '천체 망원경', category: 'gaming' },
  { id: 'chess_set_wood', icon: '♟️', label: '클래식 원목 체스판', category: 'gaming' },
  { id: 'artist_easel_paint', icon: '🎨', label: '미술 이젤 & 캔버스', category: 'gaming' },
  { id: 'streaming_mic', icon: '🎙️', label: '방송용 콘덴서 마이크', category: 'gaming' },
  { id: 'magic_spellbook', icon: '📖', label: '고대 마법 서적', category: 'gaming' },

  // ☕ 4. 키친 & 홈카페 브런치 (Kitchen & Cafe Corner)
  { id: 'espresso_machine', icon: '☕', label: '에스프레소 머신', category: 'kitchen' },
  { id: 'vintage_teapot', icon: '🫖', label: '영국식 앤틱 티세트', category: 'kitchen' },
  { id: 'fluffy_pancakes', icon: '🥞', label: '달콤 메이플 팬케이크', category: 'kitchen' },
  { id: 'sweet_cupcake', icon: '🧁', label: '딸기 생크림 컵케이크', category: 'kitchen' },
  { id: 'celebration_cake', icon: '🎂', label: '생일 축하 홀케이크', category: 'kitchen' },
  { id: 'tropical_cocktail', icon: '🍹', label: '석양 트로피컬 음료', category: 'kitchen' },
  { id: 'boba_milk_tea', icon: '🧋', label: '타피오카 버블 밀크티', category: 'kitchen' },
  { id: 'icecream_parfait', icon: '🍨', label: '초코 파르페 아이스크림', category: 'kitchen' },
  { id: 'glazed_donut_box', icon: '🍩', label: '달콤 글레이즈드 도넛', category: 'kitchen' },
  { id: 'fresh_pizza_slice', icon: '🍕', label: '치즈 듬뿍 화덕 피자', category: 'kitchen' },
  { id: 'toaster_toast', icon: '🍞', label: '바삭한 팝업 토스터', category: 'kitchen' },
  { id: 'vintage_wine_bottle', icon: '🍷', label: '고급 빈티지 와인', category: 'kitchen' },

  // 🌿 5. 가든 & 테라스 캠핑 (Garden & Nature Camp)
  { id: 'cactus_flower_pot', icon: '🌵', label: '미니 선인장 화분', category: 'garden' },
  { id: 'sakura_bonsai_tree', icon: '🌸', label: '분홍 벚꽃 분재', category: 'garden' },
  { id: 'sunflower_vase', icon: '🌻', label: '해바라기 꽃병', category: 'garden' },
  { id: 'tulip_flower_basket', icon: '🌷', label: '파스텔 튤립 꽃다발', category: 'garden' },
  { id: 'red_rose_vase', icon: '🌹', label: '화려한 붉은 장미', category: 'garden' },
  { id: 'camping_tent_cozy', icon: '⛺', label: '아늑한 캠핑 텐트', category: 'garden' },
  { id: 'campfire_logs', icon: '🔥', label: '타오르는 모닥불', category: 'garden' },
  { id: 'picnic_lunch_basket', icon: '🧺', label: '소풍 피크닉 바구니', category: 'garden' },
  { id: 'terrace_parasol', icon: '⛱️', label: '비치 테라스 파라솔', category: 'garden' },
  { id: 'marble_fountain', icon: '⛲', label: '유럽풍 대리석 분수대', category: 'garden' },
  { id: 'pine_tree_mini', icon: '🌲', label: '사시사철 솔나무', category: 'garden' },
  { id: 'palm_tree_island', icon: '🌴', label: '남국 야자수 나무', category: 'garden' },
  { id: 'white_bird_cage', icon: '🕊️', label: '행복의 하얀 새장', category: 'garden' },

  // 🏆 6. 포켓몬 & 굿즈 컬렉션 (Pokemon Goods & Trophies)
  { id: 'pokeball_standard', icon: '🔴', label: '몬스터볼', category: 'pokemon' },
  { id: 'greatball_blue_c', icon: '🔵', label: '수퍼볼', category: 'pokemon' },
  { id: 'ultraball_gold_c', icon: '🟡', label: '하이퍼볼', category: 'pokemon' },
  { id: 'masterball_purple_c', icon: '🟣', label: '마스터볼', category: 'pokemon' },
  { id: 'cherish_ball_rare', icon: '💝', label: '프레셔스볼', category: 'pokemon' },
  { id: 'pokemon_gym_badge', icon: '🎖️', label: '체육관 챔피언 뱃지', category: 'pokemon' },
  { id: 'gold_champion_trophy', icon: '🏆', label: '황금 챔피언 트로피', category: 'pokemon' },
  { id: 'shining_gold_crown', icon: '👑', label: '황금 왕관', category: 'pokemon' },
  { id: 'golden_magikarp_statue', icon: '🐟', label: '황금 잉어킹 동상', category: 'pokemon' },
  { id: 'mystic_crystal_orb', icon: '🔮', label: '신비한 마법 수정구슬', category: 'pokemon' },
  { id: 'sparkling_diamond_gem', icon: '💎', label: '샤이니 다이아몬드', category: 'pokemon' },
  { id: 'lightning_spark_bolt', icon: '⚡', label: '백만볼트 번개', category: 'pokemon' },
  { id: 'mysterious_egg_gold', icon: '🥚', label: '황금빛 전설의 알', category: 'pokemon' },
  { id: 'hero_courage_sword', icon: '⚔️', label: '용기의 성검', category: 'pokemon' },
  { id: 'guardian_shield_def', icon: '🛡️', label: '수호의 은빛 방패', category: 'pokemon' },

  // 💖 7. 두부월드 감성 & 파티 (Dubuworld Nostalgia & Party)
  { id: 'dubu_acorn_special', icon: '🌰', label: '두부월드 황금 둡토리', category: 'emotional' },
  { id: 'polaroid_instant_cam', icon: '📷', label: '클래식 폴라로이드 사진기', category: 'emotional' },
  { id: 'retro_cassette_player', icon: '📼', label: '레트로 카세트 테이프', category: 'emotional' },
  { id: 'secret_love_letter', icon: '💌', label: '비밀 러브레터', category: 'emotional' },
  { id: 'lucky_four_clover', icon: '🍀', label: '행운의 네잎클로버', category: 'emotional' },
  { id: 'pink_ribbon_satin', icon: '🎀', label: '새틴 핑크 리본', category: 'emotional' },
  { id: 'sparkling_mirror_ball', icon: '🪩', label: '반짝반짝 미러볼', category: 'emotional' },
  { id: 'party_popper_confetti', icon: '🎉', label: '축하 파티 폭죽', category: 'emotional' },
  { id: 'colorful_balloon_cluster', icon: '🎈', label: '파스텔 축하 풍선', category: 'emotional' },
  { id: 'night_fireworks_show', icon: '🎆', label: '밤하늘 축제 불꽃', category: 'emotional' },
  { id: 'champagne_toast_cheers', icon: '🥂', label: '축배 샴페인 건배', category: 'emotional' },
  { id: 'grad_cap_diploma', icon: '🎓', label: '명예 졸업 학사모', category: 'emotional' },

  // 💬 8. 감정 & 미니 이모지 (Expressions & Status)
  { id: 'sparkles_glow_star', icon: '✨', label: '블링블링 반짝이', category: 'emoji' },
  { id: 'heart_flame_burn', icon: '❤️‍🔥', label: '불타는 열정 하트', category: 'emoji' },
  { id: 'sleeping_zzz_cozy', icon: '💤', label: '쿨쿨 달콤한 잠', category: 'emoji' },
  { id: 'sweat_nervous_drop', icon: '💦', label: '삐질 당황 땀방울', category: 'emoji' },
  { id: 'thought_cloud_bubble', icon: '💭', label: '몽글몽글 생각 구름', category: 'emoji' },
  { id: 'singing_music_melody', icon: '🎵', label: '흥겨운 콧노래 멜로디', category: 'emoji' },
  { id: 'dizzy_spinning_stars', icon: '💫', label: '어질어질 별빛 회전', category: 'emoji' },
  { id: 'love_kiss_mark', icon: '💋', label: '달콤한 핑크 뽀뽀', category: 'emoji' },
  { id: 'bright_idea_lightbulb', icon: '💡', label: '번뜩이는 영감 전구', category: 'emoji' },
  { id: 'fighting_fire_spirit', icon: '🔥', label: '불타는 승부욕 투지', category: 'emoji' }
];

// 💖 1촌 응원 하트 일일 5회 제한 로컬 헬퍼
const getTodayHeartCountLocal = (owner: string): number => {
  if (typeof window === 'undefined' || !owner) return 0;
  const today = new Date().toLocaleDateString('sv-SE');
  const count = parseInt(localStorage.getItem(`pokefarm_hearts_given_${owner}_${today}`) || '0', 10);
  return isNaN(count) ? 0 : count;
};

const setTodayHeartCountLocal = (owner: string, count: number) => {
  if (typeof window === 'undefined' || !owner) return;
  const today = new Date().toLocaleDateString('sv-SE');
  localStorage.setItem(`pokefarm_hearts_given_${owner}_${today}`, String(count));
};

// 🎓 졸업생 포켓몬 진화 체인 탐색 헬퍼 (진화 전/후 모든 모습 완벽 지원)
export const getEvolutionChainForDiploma = (diploma: GraduationDiploma): EvolutionStage[] => {
  // 1. STARTER_CHAINS에서 전체 진화 체인 우선 탐색 (파이리->리자드->리자몽 등 모든 단계 복원)
  const fullChain = STARTER_CHAINS.find(chain =>
    chain.some(st => st.id === diploma.speciesId || st.name === diploma.name || diploma.name.includes(st.name))
  );
  if (fullChain && fullChain.length > 1) {
    return fullChain;
  }

  // 2. diploma에 저장된 evolutionChain이 2단계 이상이면 사용
  if (diploma.evolutionChain && diploma.evolutionChain.length > 0) {
    return diploma.evolutionChain;
  }

  // 3. 단일 stage fallback
  return [{
    id: diploma.speciesId,
    name: diploma.name,
    minLevel: 1,
    minHappiness: 0,
    sprite: diploma.sprite,
    showdownSprite: diploma.sprite,
    types: []
  }];
};

// 🐾 포켓몬 스프라이트 URL 생성기 (앞모습, 뒷모습/뒷태, 쇼다운 GIF, 이로치 완벽 지원)
export function getPokemonSpriteUrl(
  speciesId: number,
  options: {
    isShiny?: boolean;
    isBack?: boolean;
    animated?: boolean;
  } = {}
): string {
  const { isShiny = false, isBack = false, animated = true } = options;

  if (animated) {
    if (isBack) {
      return isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/shiny/${speciesId}.gif`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${speciesId}.gif`;
    } else {
      return isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${speciesId}.gif`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${speciesId}.gif`;
    }
  } else {
    if (isBack) {
      return isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/shiny/${speciesId}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${speciesId}.png`;
    } else {
      return isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${speciesId}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`;
    }
  }
}

// 🔄 3D 방향/시선 각도(0~360°)에 따라 앞/뒤 스프라이트 및 3D Y축 회전 각도를 매끄럽게 계산하는 헬퍼
export function computePokemonVisualAngle(turnAngle: number): { isBack: boolean; visualRotateY: number } {
  const norm = ((turnAngle % 360) + 360) % 360;
  if (norm > 90 && norm < 270) {
    // 90도 ~ 270도: 뒤돌아보는 각도 (Back Sprite 및 3D Y축 매끄러운 회전)
    return {
      isBack: true,
      visualRotateY: norm - 180
    };
  } else {
    // 270도 ~ 90도: 정면 바라보는 각도 (Front Sprite 및 3D Y축 매끄러운 회전)
    return {
      isBack: false,
      visualRotateY: norm > 180 ? norm - 360 : norm
    };
  }
}

// 🎓 졸업생의 현재 선택된 외형 스프라이트 및 이름 반환 헬퍼
export const getDiplomaActiveSprite = (
  diploma: GraduationDiploma,
  isBackView = false
): { sprite: string; name: string; formIndex: number; fallbackSprite: string } => {
  const chain = getEvolutionChainForDiploma(diploma);
  const maxIdx = chain.length - 1;
  const formIdx = diploma.selectedFormIndex !== undefined ? Math.min(Math.max(0, diploma.selectedFormIndex), maxIdx) : maxIdx;
  const currentStage = chain[formIdx] || chain[maxIdx] || chain[0];

  const spr = getPokemonSpriteUrl(currentStage.id, {
    isShiny: diploma.isShiny,
    isBack: isBackView,
    animated: true
  });
  const fallback = isBackView
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${currentStage.id}.png`
    : (currentStage.showdownSprite || currentStage.sprite || diploma.sprite);

  return {
    sprite: spr,
    name: currentStage.name || diploma.name,
    formIndex: formIdx,
    fallbackSprite: fallback
  };
};

export const PokeFarmGame: React.FC<PokeFarmGameProps> = ({
  username,
  onLeaveRoom,
  initialVisitingUser,
  onClearInitialVisitingUser,
  onSelectGame: _onSelectGame,
  onUserLogin,
  onUserLogout
}) => {
  const { socket } = useSocket();

  // 농장 전체 로컬 상태
  const [farmState, setFarmState] = useState<FarmState>(() => loadFarmState(username));
  const [activeTab, setActiveTab] = useState<FarmTab>('minihome');
  const isServerSyncReadyRef = useRef(false); // 🛡️ 서버 최신 데이터 로드 확인 전까지 구버전 덮어쓰기 방지

  // 💖 오늘 보낸 1촌 하트 횟수 (하루 최대 5회 제한)
  const [todayHeartsSent, setTodayHeartsSent] = useState<number>(() => getTodayHeartCountLocal(farmState.ownerName || username || '지우'));

  // 🔊 포켓몬 쓰다듬기 효과음(울음소리) ON/OFF 토글 상태 (기본 ON)
  const [isPetSoundEnabled, setIsPetSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pokefarm_pet_sound_enabled');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  // 🐣 온보딩 위저드 상태 (스타팅 포켓몬 선택)
  const [onboardingStep, setOnboardingStep] = useState<'name' | 'starter'>('name');
  const [selectedStarterIdx, setSelectedStarterIdx] = useState(0);
  const [starterNickname, setStarterNickname] = useState('');
  const [genFilter, setGenFilter] = useState<'all' | 'gen1' | 'gen2-3' | 'gen4-5' | 'gen6-7' | 'gen8-9'>('all');
  const [shopCategory, setShopCategory] = useState<'all' | 'egg' | 'food' | 'bath' | 'toy' | 'medicine'>('all');

  // 🔐 회원가입 및 로그인 모달/화면 상태
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // 로그인 폼
  const [loginUsername, setLoginUsername] = useState(username && username !== '지우' ? username : '');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 회원가입 폼
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerFarmName, setRegisterFarmName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // 비밀번호 변경 모달
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 로그아웃 확인 모달
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 🔴 몬스터볼 등장 애니메이션 분양 모달 상태
  const [adoptRevealModal, setAdoptRevealModal] = useState<{
    active: boolean;
    chainIndex: number;
    baby: EvolutionStage;
    chain: EvolutionStage[];
    stage: 'wobble' | 'burst' | 'emerge';
    nickname: string;
  } | null>(null);

  // 애니메이션 & 이펙트 상태
  const [floatingHeart, setFloatingHeart] = useState<{ id: number; x: number; y: number } | null>(null);
  const [actionAlert, setActionAlert] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [evolvingModal, setEvolvingModal] = useState<{ active: boolean; stage: 'flashing' | 'done'; oldName: string; newName: string; sprite: string } | null>(null);
  const [graduatingModal, setGraduatingModal] = useState<GraduationDiploma | null>(null);
  const [selectedDiploma, setSelectedDiploma] = useState<GraduationDiploma | null>(null);

  // 🧭 네비게이션 탭 가로 스크롤 & 마우스 휠 & 드래그 상태
  const navTabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkNavScroll = useCallback(() => {
    if (!navTabsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = navTabsRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  const handleNavWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!navTabsRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      navTabsRef.current.scrollLeft += e.deltaY * 0.9;
      checkNavScroll();
    }
  };

  const handleTabsMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!navTabsRef.current) return;
    setIsDraggingTabs(true);
    dragStartXRef.current = e.pageX - navTabsRef.current.offsetLeft;
    dragScrollLeftRef.current = navTabsRef.current.scrollLeft;
    hasDraggedRef.current = false;
  };

  const handleTabsMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTabs || !navTabsRef.current) return;
    const x = e.pageX - navTabsRef.current.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    navTabsRef.current.scrollLeft = dragScrollLeftRef.current - walk;
    checkNavScroll();
  };

  const handleTabsMouseUpOrLeave = () => {
    setIsDraggingTabs(false);
  };

  const handleScrollNav = (direction: 'left' | 'right') => {
    if (!navTabsRef.current) return;
    const scrollAmount = direction === 'left' ? -240 : 240;
    navTabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(checkNavScroll, 220);
  };

  const handleTabClick = (callback: () => void) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    callback();
  };

  useEffect(() => {
    checkNavScroll();
    const handleResize = () => checkNavScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkNavScroll]);

  useEffect(() => {
    if (!navTabsRef.current) return;
    const activeBtn = navTabsRef.current.querySelector<HTMLButtonElement>('.farm-tab.active');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    checkNavScroll();
  }, [activeTab, checkNavScroll]);

  // 💼 아르바이트 현장 체험 애니메이션 모달 상태
  const [jobShiftModal, setJobShiftModal] = useState<{
    active: boolean;
    job: PartTimeJob;
    progress: number;
    statusText: string;
    isDone: boolean;
    rewardGained: {
      coins: number;
      exp: number;
      levelUp: boolean;
      newLevel: number;
    } | null;
  } | null>(null);

  // 🌲 사내 탐험 스토리 인터랙션 모달 상태
  const [expeditionModal, setExpeditionModal] = useState<{
    active: boolean;
    area: ExpeditionArea;
    stage: 'walking' | 'event' | 'resolving' | 'result';
    progress: number;
    statusText: string;
    storyEvent: ExpeditionStoryEvent | null;
    selectedChoice: StoryChoice | null;
    isSuccess: boolean | null;
    resolutionText: string;
    diceRoll: number;
    requiredRoll: number;
    rewardGained: {
      title: string;
      grade: 'JACKPOT' | 'SUCCESS' | 'ESCAPE' | 'FAIL';
      coins: number;
      exp: number;
      levelUp: boolean;
      newLevel: number;
      foundItems: { item: FarmItem; qty: number }[];
    } | null;
  } | null>(null);

  // 🥚 알 부화 드라마틱 모달 상태
  const [hatchingModal, setHatchingModal] = useState<{
    active: boolean;
    stage: 'wobble' | 'crack' | 'hatched';
    eggName: string;
    isGolden: boolean;
    babyPokemon: FarmPokemon | null;
    nicknameInput: string;
  } | null>(null);

  // 🎰 일일 럭키 사내 복권 슬롯 상태
  const [slotReels, setSlotReels] = useState<[string, string, string]>(['⚡', '⚡', '⚡']);
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [slotSpinResult, setSlotSpinResult] = useState<{
    title: string;
    desc: string;
    coinsWon: number;
    isJackpot: boolean;
    wonItem?: FarmItem;
  } | null>(null);

  // 🌟 팜 쓰다듬기 고유 스킬 모션 상태
  const [petSkillEffect, setPetSkillEffect] = useState<{
    id: number;
    skillName: string;
    type: string;
    fxClass?: string;
    icon: string;
    particles: string[];
  } | null>(null);
  const [isPetJumping, setIsPetJumping] = useState(false);
  const [selectedSkillSlot, setSelectedSkillSlot] = useState<1 | 2 | 3>(1);

  // 🏡 보육소 목장 정렬 및 필터 상태
  const [daycareSort, setDaycareSort] = useState<'recent' | 'species' | 'shiny' | 'type' | 'level'>('species');
  const [daycareFilter, setDaycareFilter] = useState<string>('all');
  const [daycareSearch, setDaycareSearch] = useState<string>('');

  // 📖 포켓몬 졸업 도감 상태
  const [pokedexSubView, setPokedexSubView] = useState<'pokedex' | 'diplomas'>('pokedex');
  const [pokedexFilter, setPokedexFilter] = useState<'all' | 'unlocked' | 'locked' | 'shiny'>('all');
  const [pokedexHoverId, setPokedexHoverId] = useState<number | null>(null);

  // 이웃 탐방 상태
  const [neighborList, setNeighborList] = useState<NeighborFarmData[]>([]);
  const [visitingFarm, setVisitingFarm] = useState<{ owner: string; farm: NeighborFarmData; guestbook: GuestbookEntry[] } | null>(null);
  const [guestbookInput, setGuestbookInput] = useState('');
  const [neighborSearch, setNeighborSearch] = useState('');

  // ⛺ 두부월드 미니홈피 상태
  const [minihompyTab, setMinihompyTab] = useState<'home' | 'miniroom' | 'pokedex' | 'guestbook' | 'stickers' | 'neighbors'>('home');

  // 🎨 미니룸 인터랙티브 드래그 & 데코레이션 상태
  const miniroomCanvasRef = React.useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'sticker' | 'pokemon';
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [selectedDecorItem, setSelectedDecorItem] = useState<{
    type: 'sticker' | 'pokemon';
    id: string;
  } | null>(null);

  // ✍️ 자유 텍스트 & 말풍선 제작 상태
  const [customTextContent, setCustomTextContent] = useState('');
  const [customTextStyle, setCustomTextStyle] = useState<'classic_bubble' | 'retro_sign' | 'neon_glow' | 'pink_ribbon' | 'gold_badge' | 'plain_text'>('classic_bubble');
  const [customTextColor, setCustomTextColor] = useState('#1e293b');
  const [customFontSize, setCustomFontSize] = useState<number>(14);
  const [stickerCategory, setStickerCategory] = useState<'all' | 'living' | 'bedroom' | 'gaming' | 'kitchen' | 'garden' | 'pokemon' | 'emotional' | 'emoji'>('all');
  const [stickerSearch, setStickerSearch] = useState('');
  const [decorSubtab, setDecorSubtab] = useState<'palette' | 'skilleffects' | 'textmaker' | 'pokeplacements'>('palette');

  // 👥 모든 농장(내 농장 포함) 하트 랭킹 계산 (React Hooks 규칙 준수를 위해 상단에 선언)
  const allFarmsRanked: NeighborFarmData[] = React.useMemo(() => {
    const map = new Map<string, NeighborFarmData>();

    // 1. 이웃 목록 추가
    neighborList.forEach(n => {
      if (n.username) map.set(n.username, n);
    });

    // 2. 내 농장도 랭킹 산정에 포함 (내 하트수 반영)
    if (farmState.isInitialized && farmState.ownerName) {
      map.set(farmState.ownerName, {
        username: farmState.ownerName,
        farmName: farmState.farmName || `${farmState.ownerName}님의 포켓농장`,
        activePokemon: farmState.activePokemon || null,
        reservePokemon: farmState.reservePokemon || [],
        graduatedPokemon: farmState.graduatedPokemon || [],
        graduatedCount: farmState.graduatedPokemon ? farmState.graduatedPokemon.length : 0,
        heartsCount: farmState.heartsCount || 0,
        bgTheme: farmState.bgTheme || 'classic',
        stickers: farmState.stickers || [],
        pokemonPlacements: farmState.pokemonPlacements || {},
        statusMsg: farmState.statusMsg || '',
        todayCount: farmState.todayCount || 0,
        totalCount: farmState.totalCount || 0,
        isOnline: true
      });
    }

    return Array.from(map.values()).sort((a, b) => (b.heartsCount || 0) - (a.heartsCount || 0));
  }, [neighborList, farmState]);

  // 🏆 실시간 인기 포켓농장 TOP 3 (내 농장도 하트가 높으면 1, 2, 3위에 당당히 표시!)
  const top3RealFarms = allFarmsRanked.slice(0, 3);

  // 🌐 소켓 및 로컬 실제 유저 농장 동기화
  useEffect(() => {
    // 1. 브라우저 로컬스토리지에 저장된 실제 유저 농장 로드
    const storedFarms = getAllStoredFarms();
    setNeighborList(storedFarms);

    if (!socket) return;

    // 2. 🛡️ 서버에서 최신 농장 데이터를 우선 요청 (절대로 로컬의 구버전 데이터로 서버를 먼저 덮어쓰지 않음)
    const targetUser = (farmState.ownerName && farmState.ownerName !== '지우')
      ? farmState.ownerName
      : (username && username.trim() && username !== '지우' ? username.trim() : null);

    if (targetUser) {
      socket.emit('farm-load-my-data', { username: targetUser });
    } else {
      isServerSyncReadyRef.current = true;
    }
    socket.emit('farm-get-list');
    socket.emit('farm-get-top3');

    const handleListUpdate = (serverFarms: NeighborFarmData[]) => {
      if (Array.isArray(serverFarms)) {
        const map = new Map<string, NeighborFarmData>();
        storedFarms.forEach(f => map.set(f.username, f));
        serverFarms.forEach(f => map.set(f.username, f));
        setNeighborList(Array.from(map.values()).sort((a, b) => (b.heartsCount || 0) - (a.heartsCount || 0)));
      }
    };

    const handleVisitData = (res: { success: boolean; farm: NeighborFarmData | null; guestbook: GuestbookEntry[] }) => {
      if (res.success && res.farm) {
        setVisitingFarm({
          owner: res.farm.username,
          farm: res.farm,
          guestbook: res.guestbook || []
        });
        setActiveTab('minihome');
        setMinihompyTab('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const handleHeartReceived = ({ targetUsername, senderUsername, heartsCount, rewardCoins }: { targetUsername: string; senderUsername?: string; heartsCount: number; rewardCoins?: number }) => {
      if (targetUsername === farmState.ownerName) {
        const bonus = rewardCoins || 100;
        setFarmState(prev => {
          const next = {
            ...prev,
            heartsCount,
            coins: prev.coins + bonus
          };
          saveFarmState(next);
          return next;
        });
        showAlert(`💖 [${senderUsername || '1촌 이웃'}]님이 내 농장에 응원 하트를 선물했습니다! (+${bonus} 코인 획득 🪙 | 누적 하트: ${heartsCount}개)`, 'success');
        setFloatingHeart({ id: Date.now(), x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
      // 이웃 목록에서도 해당 유저의 하트 수 업데이트
      setNeighborList(prev => prev.map(f => f.username === targetUsername ? { ...f, heartsCount } : f));
      if (visitingFarm && visitingFarm.owner === targetUsername) {
        setVisitingFarm(prev => prev ? { ...prev, farm: { ...prev.farm, heartsCount } } : null);
      }
    };

    const handleHeartSentSuccess = (data: { targetUsername: string; heartsCount: number; senderRewardCoins: number; todaySent: number; remainingHearts: number }) => {
      setTodayHeartsSent(data.todaySent);
      setTodayHeartCountLocal(farmState.ownerName, data.todaySent);
      // 이웃 목록 실시간 반영
      setNeighborList(prev => prev.map(f => f.username === data.targetUsername ? { ...f, heartsCount: data.heartsCount } : f));
      if (visitingFarm && visitingFarm.owner === data.targetUsername) {
        setVisitingFarm(prev => prev ? { ...prev, farm: { ...prev.farm, heartsCount: data.heartsCount } } : null);
      }
    };

    const handleHeartFailed = (data: { reason: string; message: string; todaySent?: number }) => {
      if (data.todaySent !== undefined) {
        setTodayHeartsSent(data.todaySent);
        setTodayHeartCountLocal(farmState.ownerName, data.todaySent);
      }
      showAlert(data.message, 'warn');
    };

    const handleDailyHeartsInfo = (data: { todaySent: number; remainingHearts: number }) => {
      setTodayHeartsSent(data.todaySent);
      setTodayHeartCountLocal(farmState.ownerName, data.todaySent);
    };

    const handleGuestbookUpdated = ({ targetUsername, guestbook }: { targetUsername: string; guestbook: GuestbookEntry[] }) => {
      if (targetUsername === farmState.ownerName) {
        setFarmState(prev => ({ ...prev, guestbook }));
      }
      if (visitingFarm && visitingFarm.owner === targetUsername) {
        setVisitingFarm(prev => prev ? { ...prev, guestbook } : null);
      }
    };

    const handleVisitUpdated = (data: { targetUsername: string; todayCount: number; totalCount: number }) => {
      if (data.targetUsername === farmState.ownerName) {
        setFarmState(prev => ({ ...prev, todayCount: data.todayCount, totalCount: data.totalCount }));
      }
      if (visitingFarm && visitingFarm.owner === data.targetUsername) {
        setVisitingFarm(prev => prev ? {
          ...prev,
          farm: { ...prev.farm, todayCount: data.todayCount, totalCount: data.totalCount }
        } : null);
      }
    };

    const handleMyDataLoaded = (res: { success: boolean; farm: any; guestbook: GuestbookEntry[] }) => {
      isServerSyncReadyRef.current = true;
      if (res.success && res.farm) {
        setFarmState(prev => {
          // 🛡️ 보안 가드: 서버에서 날아온 데이터의 주인이 현재 내 농장주와 다르면 덮어쓰기 원천 차단
          const incomingOwner = res.farm.username || res.farm.ownerName;
          if (prev.ownerName && incomingOwner && prev.ownerName !== incomingOwner && prev.ownerName !== '지우') {
            console.warn(`[PokeFarm] ⚠️ 다른 유저(${incomingOwner})의 데이터가 내 농장(${prev.ownerName})에 유입되는 것을 안전하게 차단했습니다.`);
            return prev;
          }

          const serverTime = res.farm.lastActive || 0;
          const localTime = prev.lastActive || 0;

          // 로컬 데이터가 서버 데이터보다 5초 이상 최신인 오프라인 플레이 상황이 아니라면 서버 최신 데이터로 동기화
          if (prev.isInitialized && localTime > (serverTime + 5000)) {
            return prev;
          }

          const updatedHearts = res.farm.heartsCount !== undefined ? Math.max(res.farm.heartsCount, prev.heartsCount) : prev.heartsCount;

          // 🛡️ 코인 안전 보존: 로컬에서 획득한 코인이 서버의 과거 세이브로 인해 깎이지 않도록 보호
          const updatedCoins = Math.max(
            res.farm.coins !== undefined && res.farm.coins !== null ? Number(res.farm.coins) : 0,
            prev.coins !== undefined && prev.coins !== null ? Number(prev.coins) : 0
          );
          // 🛡️ 인벤토리 안전 병합: 로컬 획득 아이템이 서버 구버전 데이터로 덮어씌워져 소실되는 것을 방지
          const mergedInventory = { ...(prev.inventory || {}) };
          if (res.farm.inventory) {
            Object.entries(res.farm.inventory).forEach(([k, v]) => {
              mergedInventory[k] = Math.max(mergedInventory[k] || 0, Number(v) || 0);
            });
          }

          const merged: FarmState = {
            ...prev,
            ...res.farm,
            coins: updatedCoins,
            inventory: mergedInventory,
            ownerName: incomingOwner || prev.ownerName,
            isInitialized: true,
            heartsCount: updatedHearts,
            incubatingEgg: res.farm.incubatingEgg !== undefined ? res.farm.incubatingEgg : prev.incubatingEgg,
            lotteryState: res.farm.lotteryState || prev.lotteryState,
            lastActive: serverTime || Date.now(),
            todayCount: res.farm.todayCount !== undefined ? res.farm.todayCount : prev.todayCount,
            totalCount: res.farm.totalCount !== undefined ? res.farm.totalCount : prev.totalCount,
            guestbook: res.guestbook || prev.guestbook || []
          };
          saveFarmState(merged);
          return merged;
        });
      }
    };

    // 🔐 로그인 결과 처리
    const handleLoginResult = (res: { success: boolean; reason?: string; message?: string; farm?: any; guestbook?: GuestbookEntry[] }) => {
      setIsLoggingIn(false);
      if (res.success && res.farm) {
        const loadedFarm = res.farm;
        const cleanUser = loadedFarm.username || loadedFarm.ownerName;
        // 🛡️ 로컬에 해당 유저의 기존 세이브가 있다면 코인 및 인벤토리를 안전하게 최대치로 병합
        const localSaved = getStoredNeighborFarm(cleanUser);
        const safeCoins = Math.max(
          loadedFarm.coins !== undefined && loadedFarm.coins !== null ? Number(loadedFarm.coins) : 0,
          localSaved?.coins !== undefined ? Number(localSaved.coins) : 0,
          1000
        );
        const safeInventory = { ...(loadedFarm.inventory || {}) };
        if (localSaved?.inventory) {
          Object.entries(localSaved.inventory).forEach(([k, v]) => {
            safeInventory[k] = Math.max(safeInventory[k] || 0, Number(v) || 0);
          });
        }

        const newState: FarmState = {
          ...getInitialFarmState(cleanUser),
          ...loadedFarm,
          coins: safeCoins,
          inventory: safeInventory,
          ownerName: cleanUser,
          isInitialized: true,
          guestbook: res.guestbook || []
        };
        setFarmState(newState);
        saveFarmState(newState);
        localStorage.setItem('pokefarm_saved_owner', cleanUser);
        if (onUserLogin) {
          onUserLogin(cleanUser);
        }
        showAlert(res.message || `🎉 [${cleanUser}]님의 농장 데이터를 성공적으로 불러왔습니다!`, 'success');
        setLoginError('');
        setLoginPassword('');
        if (loadedFarm.activePokemon) {
          playPokemonCry(loadedFarm.activePokemon.speciesId);
        }
      } else {
        setLoginError(res.message || '로그인에 실패했습니다.');
        showAlert(res.message || '로그인 실패', 'warn');
      }
    };

    // 🔐 회원가입 및 신규 개설 결과 처리
    const handleRegisterResult = (res: { success: boolean; reason?: string; message?: string; farm?: any; guestbook?: GuestbookEntry[] }) => {
      setIsRegistering(false);
      if (res.success && res.farm) {
        const loadedFarm = res.farm;
        const cleanUser = loadedFarm.username || loadedFarm.ownerName;
        const newState: FarmState = {
          ...getInitialFarmState(cleanUser),
          ...loadedFarm,
          ownerName: cleanUser,
          isInitialized: true,
          guestbook: res.guestbook || []
        };
        setFarmState(newState);
        saveFarmState(newState);
        localStorage.setItem('pokefarm_saved_owner', cleanUser);
        if (onUserLogin) {
          onUserLogin(cleanUser);
        }
        showAlert(`🎉 [${cleanUser}]님의 포켓농장이 정식 개설되었습니다! 환영합니다!`, 'success');
        setRegisterError('');
        setRegisterPassword('');
        setRegisterPasswordConfirm('');
        if (loadedFarm.activePokemon) {
          playPokemonCry(loadedFarm.activePokemon.speciesId);
        }
      } else {
        setRegisterError(res.message || '농장 개설에 실패했습니다.');
        showAlert(res.message || '농장 개설 실패', 'warn');
      }
    };

    // 🔐 비밀번호 변경 결과 처리
    const handleChangePasswordResult = (res: { success: boolean; message?: string }) => {
      setIsChangingPassword(false);
      if (res.success) {
        setShowChangePasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setChangePasswordError('');
        showAlert(res.message || '비밀번호가 성공적으로 변경되었습니다.', 'success');
      } else {
        setChangePasswordError(res.message || '비밀번호 변경에 실패했습니다.');
      }
    };

    socket.emit('farm-get-daily-hearts', { username: farmState.ownerName });

    socket.on('farm-list-update', handleListUpdate);
    socket.on('farm-visit-data', handleVisitData);
    socket.on('farm-visit-updated', handleVisitUpdated);
    socket.on('farm-heart-received', handleHeartReceived);
    socket.on('farm-heart-sent-success', handleHeartSentSuccess);
    socket.on('farm-heart-failed', handleHeartFailed);
    socket.on('farm-daily-hearts-info', handleDailyHeartsInfo);
    socket.on('farm-guestbook-updated', handleGuestbookUpdated);
    socket.on('farm-my-data-loaded', handleMyDataLoaded);
    socket.on('farm-login-result', handleLoginResult);
    socket.on('farm-register-result', handleRegisterResult);
    socket.on('farm-change-password-result', handleChangePasswordResult);

    return () => {
      socket.off('farm-list-update', handleListUpdate);
      socket.off('farm-visit-data', handleVisitData);
      socket.off('farm-visit-updated', handleVisitUpdated);
      socket.off('farm-heart-received', handleHeartReceived);
      socket.off('farm-heart-sent-success', handleHeartSentSuccess);
      socket.off('farm-heart-failed', handleHeartFailed);
      socket.off('farm-daily-hearts-info', handleDailyHeartsInfo);
      socket.off('farm-guestbook-updated', handleGuestbookUpdated);
      socket.off('farm-my-data-loaded', handleMyDataLoaded);
      socket.off('farm-login-result', handleLoginResult);
      socket.off('farm-register-result', handleRegisterResult);
      socket.off('farm-change-password-result', handleChangePasswordResult);
    };
  }, [socket, farmState.ownerName, farmState.isInitialized, onUserLogin]);

  // 📌 외부(시트1 게임목록 상단 등)에서 특정 유저 미니홈피 방문 요청 시 자동 전환
  useEffect(() => {
    if (initialVisitingUser) {
      handleVisitNeighbor(initialVisitingUser);
      if (onClearInitialVisitingUser) {
        onClearInitialVisitingUser();
      }
    }
  }, [initialVisitingUser]);

  // 방문 여부에 따른 미니홈피 표시 값 (실제 DB 및 카운터 기준, 0 완벽 지원)
  const currentTodayCount = visitingFarm ? (visitingFarm.farm.todayCount ?? 0) : (farmState.todayCount ?? 0);
  const currentTotalCount = visitingFarm ? (visitingFarm.farm.totalCount ?? 0) : (farmState.totalCount ?? 0);
  const displayOwnerName = visitingFarm ? visitingFarm.owner : farmState.ownerName;
  const displayFarmName = visitingFarm ? visitingFarm.farm.farmName : farmState.farmName;
  const displayActivePokemon = visitingFarm ? visitingFarm.farm.activePokemon : farmState.activePokemon;
  const displayReservePokemons = visitingFarm ? (visitingFarm.farm.reservePokemon || []) : farmState.reservePokemon;
  const displayGraduatedPokemons = visitingFarm ? (visitingFarm.farm.graduatedPokemon || []) : farmState.graduatedPokemon;
  const displayGraduatedCount = visitingFarm ? (visitingFarm.farm.graduatedPokemon ? visitingFarm.farm.graduatedPokemon.length : (visitingFarm.farm.graduatedCount || 0)) : farmState.graduatedPokemon.length;
  const displayHeartsCount = visitingFarm ? (visitingFarm.farm.heartsCount ?? 0) : (farmState.heartsCount ?? 0);
  const displayGuestbook = visitingFarm ? visitingFarm.guestbook : farmState.guestbook;
  const currentBgTheme = visitingFarm ? (visitingFarm.farm.bgTheme || 'classic') : (farmState.bgTheme || 'classic');
  const currentStickers = visitingFarm ? (visitingFarm.farm.stickers || []) : (farmState.stickers || []);
  const currentStatusMsg = visitingFarm ? (visitingFarm.farm.statusMsg || '이웃의 농장에 놀러왔습니다 🎵') : (farmState.statusMsg || '오늘도 포켓몬과 함께 즐거운 파밍 🎵 1촌 환영!');

  // 👥 이웃 농장 목록 새로고침 헬퍼
  const refreshNeighbors = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('farm-get-list');
      socket.emit('farm-get-top3');
      if (farmState.ownerName) {
        socket.emit('farm-load-my-data', { username: farmState.ownerName });
      }
    }
    const localFarms = getAllStoredFarms();
    setNeighborList(localFarms.filter(f => f.username !== farmState.ownerName));
  }, [socket, farmState.ownerName]);

  // 이웃 미니홈피 놀러가기/구경가기
  const handleVisitNeighbor = (neighborUsername: string) => {
    if (!neighborUsername) return;
    if (neighborUsername === farmState.ownerName) {
      setVisitingFarm(null);
      setActiveTab('minihome');
      setMinihompyTab('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showAlert('내 포켓 미니홈피로 돌아왔습니다! 🏠', 'info');
      return;
    }

    if (socket && socket.connected) {
      socket.emit('farm-visit-request', { targetUsername: neighborUsername, visitorUsername: farmState.ownerName });
    }

    // 1. 로컬에 저장된 실제 유저 데이터 확인 (내 활성 세션을 절대 덮어쓰지 않는 순수 읽기)
    const targetSaved = getStoredNeighborFarm(neighborUsername);
    if (targetSaved && targetSaved.isInitialized && targetSaved.ownerName === neighborUsername) {
      setVisitingFarm({
        owner: targetSaved.ownerName,
        farm: {
          username: targetSaved.ownerName,
          farmName: targetSaved.farmName,
          activePokemon: targetSaved.activePokemon,
          reservePokemon: targetSaved.reservePokemon || [],
          graduatedPokemon: targetSaved.graduatedPokemon || [],
          graduatedCount: targetSaved.graduatedPokemon?.length || 0,
          heartsCount: targetSaved.heartsCount ?? 0,
          bgTheme: targetSaved.bgTheme || 'classic',
          stickers: targetSaved.stickers || [],
          pokemonPlacements: targetSaved.pokemonPlacements || {},
          statusMsg: targetSaved.statusMsg || '',
          todayCount: targetSaved.todayCount ?? 0,
          totalCount: targetSaved.totalCount ?? 0,
          isOnline: true
        },
        guestbook: targetSaved.guestbook || []
      });
      setActiveTab('minihome');
      setMinihompyTab('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showAlert(`🏠 [${targetSaved.farmName}] 미니홈피로 파도타기 완료!`, 'success');
      return;
    }

    // 2. 이웃 목록에서 확인
    const foundNeighbor = neighborList.find(n => n.username === neighborUsername);
    if (foundNeighbor) {
      setVisitingFarm({
        owner: foundNeighbor.username,
        farm: foundNeighbor,
        guestbook: []
      });
      setActiveTab('minihome');
      setMinihompyTab('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showAlert(`🏠 [${foundNeighbor.farmName}] 미니홈피로 파도타기 완료!`, 'success');
    }
  };

  // 1촌 응원 하트 보내기 (하루 5회 제한, 자기 자신 금지, 보답 코인 보상)
  const handleSendHeartToCurrentFarm = () => {
    // 1. 자기 농장인 경우 차단
    if (!visitingFarm || visitingFarm.owner === farmState.ownerName) {
      showAlert('내 농장에는 하트를 보낼 수 없습니다! 1촌 이웃 농장을 방문해 따뜻한 하트를 선물해 보세요. 💖', 'warn');
      return;
    }

    // 2. 일일 5회 제한 검사
    const currentSent = getTodayHeartCountLocal(farmState.ownerName);
    if (currentSent >= 5 || todayHeartsSent >= 5) {
      showAlert('오늘 보낼 수 있는 1촌 응원 하트(하루 최대 5회)를 모두 선물하셨습니다! 내일 다시 응원해 주세요. 🌟', 'warn');
      return;
    }

    const targetUser = visitingFarm.owner;
    const nextSent = currentSent + 1;
    setTodayHeartsSent(nextSent);
    setTodayHeartCountLocal(farmState.ownerName, nextSent);

    // 발신자에게도 즉시 보답 코인 +20
    setFarmState(prev => ({ ...prev, coins: prev.coins + 20 }));

    setVisitingFarm(prev => prev ? {
      ...prev,
      farm: { ...prev.farm, heartsCount: prev.farm.heartsCount + 1 }
    } : null);

    if (socket && socket.connected) {
      socket.emit('farm-send-heart', { targetUsername: targetUser, senderUsername: farmState.ownerName });
    }

    const remaining = Math.max(0, 5 - nextSent);
    showAlert(`💖 [${targetUser}]님에게 1촌 응원 하트를 선물했습니다! (보답으로 +20 코인 획득 🪙, 오늘 남은 하트: ${remaining}/5회)`, 'success');
    setFloatingHeart({ id: Date.now(), x: window.innerWidth / 2, y: window.innerHeight / 2 });
  };

  // 방명록 등록
  const handleAddGuestbookEntry = () => {
    if (!guestbookInput.trim()) {
      showAlert('방명록 내용을 입력해 주세요!', 'warn');
      return;
    }
    const newEntry: GuestbookEntry = {
      id: `gb_${Date.now()}`,
      author: farmState.ownerName,
      message: guestbookInput.trim(),
      timestamp: new Date().toISOString()
    };

    if (visitingFarm) {
      setVisitingFarm(prev => prev ? {
        ...prev,
        guestbook: [newEntry, ...prev.guestbook]
      } : null);
      if (socket && socket.connected) {
        socket.emit('farm-guestbook-add', { targetUsername: visitingFarm.owner, entry: newEntry });
      }
    } else {
      setFarmState(prev => ({
        ...prev,
        guestbook: [newEntry, ...prev.guestbook]
      }));
    }
    setGuestbookInput('');
    showAlert('📬 방명록이 성공적으로 등록되었습니다!', 'success');
  };

  // 방명록 삭제
  const handleDeleteGuestbookEntry = (id: string) => {
    if (visitingFarm) {
      setVisitingFarm(prev => prev ? {
        ...prev,
        guestbook: prev.guestbook.filter(g => g.id !== id)
      } : null);
    } else {
      setFarmState(prev => ({
        ...prev,
        guestbook: prev.guestbook.filter(g => g.id !== id)
      }));
    }
    showAlert('🗑️ 방명록이 삭제되었습니다.', 'info');
  };

  // 스티커 추가
  const handleAddSticker = (stickerId: string, icon: string, label: string) => {
    if (visitingFarm) {
      showAlert('이웃의 미니홈피 스티커는 수정할 수 없습니다.', 'warn');
      return;
    }
    const newSticker: MinihompySticker = {
      id: `stk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      stickerId,
      icon,
      label,
      type: 'sticker',
      x: Math.floor(Math.random() * 50) + 25,
      y: Math.floor(Math.random() * 40) + 20,
      scale: 1,
      flipped: false
    };
    setFarmState(prev => ({
      ...prev,
      stickers: [...(prev.stickers || []), newSticker]
    }));
    showAlert(`🎨 [${label}] 스티커를 미니룸에 붙였습니다! 드래그하여 배치해보세요.`, 'success');
    setSelectedDecorItem({ type: 'sticker', id: newSticker.id });
  };

  // 자유 텍스트 & 말풍선 추가
  const handleAddCustomTextSticker = () => {
    if (visitingFarm) return;
    if (!customTextContent.trim()) {
      showAlert('작성할 텍스트 내용을 입력해주세요!', 'warn');
      return;
    }

    const newTextSticker: MinihompySticker = {
      id: `txt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      stickerId: `txt_${customTextStyle}`,
      text: customTextContent.trim(),
      label: customTextContent.trim().slice(0, 10),
      type: customTextStyle === 'classic_bubble' ? 'bubble' : 'text',
      styleType: customTextStyle,
      color: customTextColor,
      fontSize: customFontSize,
      x: 35,
      y: 20,
      scale: 1,
      flipped: false
    };

    setFarmState(prev => ({
      ...prev,
      stickers: [...(prev.stickers || []), newTextSticker]
    }));
    setCustomTextContent('');
    showAlert('✍️ 자유 텍스트/말풍선이 미니룸에 추가되었습니다! 드래그하여 원하는 위치에 놓아보세요.', 'success');
    setMinihompyTab('miniroom');
    setSelectedDecorItem({ type: 'sticker', id: newTextSticker.id });
  };

  // 💥 포켓몬 고유스킬 이펙트 구매 및 미니룸 배치
  const handleAddSkillEffect = (effect: PokemonSkillEffect) => {
    if (visitingFarm) return;
    if (farmState.coins < effect.price) {
      showAlert(`🪙 코인이 부족합니다! (필요: ${effect.price}P, 보유: ${farmState.coins}P)`, 'warn');
      return;
    }

    if (!window.confirm(`🪙 [${effect.name}] 스킬 이펙트를 ${effect.price} 코인으로 구매하여 미니룸에 배치하시겠습니까?\n(보유 코인: ${farmState.coins}P ➔ 잔액: ${farmState.coins - effect.price}P)`)) {
      return;
    }

    const newEffectSticker: MinihompySticker = {
      id: `fx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      stickerId: effect.id,
      skillFxId: effect.fxClass || effect.id,
      icon: effect.icon,
      label: effect.name,
      type: 'skill_fx',
      x: 45,
      y: 45,
      scale: 1.2,
      flipped: false,
      rotation: 0,
      tiltX: 0
    };

    setFarmState(prev => ({
      ...prev,
      coins: prev.coins - effect.price,
      stickers: [...(prev.stickers || []), newEffectSticker]
    }));

    showAlert(`✨ [${effect.name}] 스킬 이펙트를 구매하여 미니룸에 배치했습니다! (-${effect.price}P) 포켓몬 위에 씌워보세요!`, 'success');
    setSelectedDecorItem({ type: 'sticker', id: newEffectSticker.id });
  };

  // 스티커 크기 조절
  const handleScaleSticker = (id: string, delta: number) => {
    if (visitingFarm) return;
    setFarmState(prev => ({
      ...prev,
      stickers: (prev.stickers || []).map(s => {
        if (s.id !== id) return s;
        const curScale = s.scale || 1;
        const nextScale = Math.max(0.5, Math.min(2.2, Math.round((curScale + delta) * 10) / 10));
        return { ...s, scale: nextScale };
      })
    }));
  };

  // 스티커 360도 평면 회전 조작
  const handleSetStickerRotation = (id: string, angle: number) => {
    if (visitingFarm) return;
    const normalized = Math.round(((angle % 360) + 360) % 360);
    setFarmState(prev => ({
      ...prev,
      stickers: (prev.stickers || []).map(s => s.id === id ? { ...s, rotation: normalized } : s)
    }));
  };

  const handleRotateSticker = (id: string, delta: number) => {
    if (visitingFarm) return;
    setFarmState(prev => ({
      ...prev,
      stickers: (prev.stickers || []).map(s => {
        if (s.id !== id) return s;
        const cur = s.rotation || 0;
        const next = Math.round(((cur + delta) % 360 + 360) % 360);
        return { ...s, rotation: next };
      })
    }));
  };

  // 스티커 앞뒤 3D 기울기 (TiltX: -60 ~ +60도)
  const handleSetStickerTiltX = (id: string, tilt: number) => {
    if (visitingFarm) return;
    const clamped = Math.max(-60, Math.min(60, Math.round(tilt)));
    setFarmState(prev => ({
      ...prev,
      stickers: (prev.stickers || []).map(s => s.id === id ? { ...s, tiltX: clamped } : s)
    }));
  };

  const handleTiltStickerX = (id: string, delta: number) => {
    if (visitingFarm) return;
    setFarmState(prev => ({
      ...prev,
      stickers: (prev.stickers || []).map(s => {
        if (s.id !== id) return s;
        const cur = s.tiltX || 0;
        const next = Math.max(-60, Math.min(60, cur + delta));
        return { ...s, tiltX: next };
      })
    }));
  };

  // 스티커 좌우 반전
  const handleFlipSticker = (id: string) => {
    if (visitingFarm) return;
    setFarmState(prev => ({
      ...prev,
      stickers: (prev.stickers || []).map(s => {
        if (s.id !== id) return s;
        return { ...s, flipped: !s.flipped };
      })
    }));
  };

  // 스티커 제거
  const handleRemoveSticker = (id: string) => {
    if (visitingFarm) return;
    setFarmState(prev => ({
      ...prev,
      stickers: (prev.stickers || []).filter(s => s.id !== id)
    }));
    if (selectedDecorItem?.id === id) {
      setSelectedDecorItem(null);
    }
  };

  // 스티커 전체 삭제
  const handleClearAllStickers = () => {
    if (visitingFarm) return;
    if (window.confirm('미니룸의 모든 스티커와 텍스트를 제거하시겠습니까?')) {
      setFarmState(prev => ({ ...prev, stickers: [] }));
      setSelectedDecorItem(null);
      showAlert('🧹 미니룸 스티커를 모두 지웠습니다.', 'info');
    }
  };

  // 포켓몬 크기 조절
  const handleScalePokemon = (id: string, delta: number) => {
    if (visitingFarm) return;
    setFarmState(prev => {
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0 };
      const curScale = existing.scale || 1;
      const nextScale = Math.max(0.6, Math.min(1.8, Math.round((curScale + delta) * 10) / 10));
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, scale: nextScale }
        }
      };
    });
  };

  // 포켓몬 360도 평면 회전 조작 (0 ~ 360도)
  const handleSetPokemonRotation = (id: string, angle: number) => {
    if (visitingFarm) return;
    const normalized = Math.round(((angle % 360) + 360) % 360);
    setFarmState(prev => {
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0 };
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, rotation: normalized }
        }
      };
    });
  };

  const handleRotatePokemon = (id: string, delta: number) => {
    if (visitingFarm) return;
    setFarmState(prev => {
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0 };
      const cur = existing.rotation || 0;
      const next = Math.round(((cur + delta) % 360 + 360) % 360);
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, rotation: next }
        }
      };
    });
  };

  // 포켓몬 앞뒤 3D 기울기 / 눕힘 (TiltX: -60 ~ +60도)
  const handleSetPokemonTiltX = (id: string, tilt: number) => {
    if (visitingFarm) return;
    const clamped = Math.max(-60, Math.min(60, Math.round(tilt)));
    setFarmState(prev => {
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0 };
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, tiltX: clamped }
        }
      };
    });
  };

  const handleTiltPokemonX = (id: string, delta: number) => {
    if (visitingFarm) return;
    setFarmState(prev => {
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0 };
      const cur = existing.tiltX || 0;
      const next = Math.max(-60, Math.min(60, cur + delta));
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, tiltX: next }
        }
      };
    });
  };

  // 포켓몬 좌우 반전 (바라보는 방향 전환)
  const handleFlipPokemon = (id: string) => {
    if (visitingFarm) return;
    setFarmState(prev => {
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0, isBackView: false };
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, flipped: !existing.flipped }
        }
      };
    });
  };

  // 🔄 포켓몬 3D 시선/방향 360° 미세 턴 조작 (0 ~ 360도 연속 회전)
  const handleSetPokemonTiltY = (id: string, angle: number) => {
    if (visitingFarm) return;
    const normalized = Math.round(((angle % 360) + 360) % 360);
    setFarmState(prev => {
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0, tiltY: 0 };
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, tiltY: normalized, isBackView: normalized > 90 && normalized < 270 }
        }
      };
    });
  };

  const handleTurnPokemonY = (id: string, delta: number) => {
    if (visitingFarm) return;
    setFarmState(prev => {
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0, tiltY: 0 };
      const cur = existing.tiltY !== undefined ? existing.tiltY : (existing.isBackView ? 180 : 0);
      const next = Math.round(((cur + delta) % 360 + 360) % 360);
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, tiltY: next, isBackView: next > 90 && next < 270 }
        }
      };
    });
  };

  // 포켓몬 위치 초기화
  const handleResetPokemonPlacement = (id: string) => {
    if (visitingFarm) return;
    setFarmState(prev => {
      const next = { ...(prev.pokemonPlacements || {}) };
      delete next[id];
      return {
        ...prev,
        pokemonPlacements: next
      };
    });
    showAlert('📍 포켓몬 위치 및 회전 각도를 초기화했습니다.', 'info');
  };

  // 🎓 졸업생 포켓몬 진화 전/후 외형 모습 변경 핸들러
  const handleSetDiplomaForm = (diplomaId: string, formIndex: number) => {
    if (visitingFarm) return;

    let updatedName = '';

    setFarmState(prev => {
      const nextGrad = (prev.graduatedPokemon || []).map((d, idx) => {
        const isTarget = d.id === diplomaId || d.pokemonUid === diplomaId || String(d.id) === String(diplomaId) || diplomaId === `grad_${d.id}` || diplomaId === `grad_${idx}`;
        if (isTarget) {
          const chain = getEvolutionChainForDiploma(d);
          const stage = chain[formIndex] || chain[chain.length - 1];
          updatedName = stage.name;
          let spr = stage.showdownSprite || stage.sprite;
          if (d.isShiny && stage.id) {
            spr = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${stage.id}.gif`;
          }
          return {
            ...d,
            selectedFormIndex: formIndex,
            displaySprite: spr,
            displayName: stage.name
          };
        }
        return d;
      });
      return {
        ...prev,
        graduatedPokemon: nextGrad
      };
    });

    setSelectedDiploma(prev => {
      if (!prev) return null;
      const isTarget = prev.id === diplomaId || prev.pokemonUid === diplomaId || String(prev.id) === String(diplomaId) || !diplomaId;
      if (isTarget) {
        const chain = getEvolutionChainForDiploma(prev);
        const stage = chain[formIndex] || chain[chain.length - 1];
        if (!updatedName) updatedName = stage.name;
        let spr = stage.showdownSprite || stage.sprite;
        if (prev.isShiny && stage.id) {
          spr = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${stage.id}.gif`;
        }
        return {
          ...prev,
          selectedFormIndex: formIndex,
          displaySprite: spr,
          displayName: stage.name
        };
      }
      return prev;
    });

    setGraduatingModal(prev => {
      if (!prev) return null;
      const isTarget = prev.id === diplomaId || prev.pokemonUid === diplomaId || String(prev.id) === String(diplomaId) || !diplomaId;
      if (isTarget) {
        const chain = getEvolutionChainForDiploma(prev);
        const stage = chain[formIndex] || chain[chain.length - 1];
        if (!updatedName) updatedName = stage.name;
        let spr = stage.showdownSprite || stage.sprite;
        if (prev.isShiny && stage.id) {
          spr = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${stage.id}.gif`;
        }
        return {
          ...prev,
          selectedFormIndex: formIndex,
          displaySprite: spr,
          displayName: stage.name
        };
      }
      return prev;
    });

    showAlert(`✨ 미니룸에 표시될 졸업생 포켓몬 외형이 [${updatedName || '선택한 진화 형태'}] 모습으로 변경되었습니다!`, 'success');
  };

  // 포켓몬 위치 및 3D 방향 조회 헬퍼
  const getPokemonPlacement = (
    id: string,
    defaultX: number,
    defaultY: number,
    defaultScale = 1,
    defaultFlipped = false,
    defaultRotation = 0,
    defaultTiltX = 0,
    defaultTiltY = 0
  ) => {
    const placements = visitingFarm ? visitingFarm.farm.pokemonPlacements : farmState.pokemonPlacements;
    const custom = placements?.[id];
    if (custom) {
      const turnY = custom.tiltY !== undefined ? custom.tiltY : (custom.isBackView ? 180 : defaultTiltY);
      return {
        x: custom.x,
        y: custom.y,
        scale: custom.scale !== undefined ? custom.scale : defaultScale,
        flipped: custom.flipped !== undefined ? custom.flipped : defaultFlipped,
        rotation: custom.rotation !== undefined ? custom.rotation : defaultRotation,
        tiltX: custom.tiltX !== undefined ? custom.tiltX : defaultTiltX,
        tiltY: turnY,
        isBackView: custom.isBackView !== undefined ? custom.isBackView : (turnY > 90 && turnY < 270)
      };
    }
    const turnY = defaultTiltY;
    return {
      x: defaultX,
      y: defaultY,
      scale: defaultScale,
      flipped: defaultFlipped,
      rotation: defaultRotation,
      tiltX: defaultTiltX,
      tiltY: turnY,
      isBackView: turnY > 90 && turnY < 270
    };
  };

  // 🎯 인터랙티브 드래그 시작 핸들러
  const handleStartDrag = (
    e: React.PointerEvent,
    type: 'sticker' | 'pokemon',
    id: string,
    currentX: number,
    currentY: number
  ) => {
    if (visitingFarm) return; // 이웃 방문 시 읽기 전용
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}

    setDragState({
      type,
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: currentX,
      origY: currentY
    });
    setSelectedDecorItem({ type, id });
  };

  // 🎯 캔버스 위에서 드래그 이동 핸들러
  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!dragState || !miniroomCanvasRef.current) return;
    const rect = miniroomCanvasRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaXPercent = ((e.clientX - dragState.startX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragState.startY) / rect.height) * 100;

    const newX = Math.max(2, Math.min(92, Math.round((dragState.origX + deltaXPercent) * 10) / 10));
    const newY = Math.max(2, Math.min(88, Math.round((dragState.origY + deltaYPercent) * 10) / 10));

    if (dragState.type === 'sticker') {
      setFarmState(prev => ({
        ...prev,
        stickers: (prev.stickers || []).map(s => s.id === dragState.id ? { ...s, x: newX, y: newY } : s)
      }));
    } else if (dragState.type === 'pokemon') {
      setFarmState(prev => {
        const existing = prev.pokemonPlacements?.[dragState.id] || { uid: dragState.id, x: dragState.origX, y: dragState.origY, scale: 1, flipped: false };
        return {
          ...prev,
          pokemonPlacements: {
            ...(prev.pokemonPlacements || {}),
            [dragState.id]: {
              ...existing,
              x: newX,
              y: newY
            }
          }
        };
      });
    }
  };

  // 🎯 드래그 종료 핸들러
  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDragState(null);
    }
  };

  // 💥 포켓몬 지속 방출형 고유스킬 스트림 렌더러 (sill-example.png 스타일 연속 방출 모션)
  const renderSkillStreamFx = (fxClass: string, symbolIcon: string) => {
    switch (fxClass) {
      case 'skill-fx-fireblast':
        return (
          <div className="skill-blast-stream stream-fire">
            <svg className="stream-svg fire-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fireOuterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="40%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
                <linearGradient id="fireMidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="35%" stopColor="#fbbf24" />
                  <stop offset="85%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
                <linearGradient id="fireCoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <filter id="fireGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path className="fire-wave wave-1" fill="url(#fireOuterGrad)" filter="url(#fireGlow)"
                d="M 0 45 C 35 32, 65 18, 105 12 C 145 6, 185 0, 215 8 C 235 15, 240 30, 240 46 C 238 62, 225 78, 200 86 C 160 98, 120 90, 85 74 C 50 60, 20 54, 0 53 Z" />
              <path className="fire-wave wave-2" fill="url(#fireMidGrad)"
                d="M 0 46 C 30 36, 60 25, 95 22 C 130 16, 165 15, 190 25 C 210 34, 215 47, 210 56 C 198 68, 170 78, 140 74 C 105 70, 65 64, 0 52 Z" />
              <path className="fire-wave wave-3" fill="url(#fireCoreGrad)"
                d="M 0 47 C 25 41, 55 35, 85 34 C 115 32, 145 36, 168 45 C 178 50, 172 54, 155 57 C 128 60, 90 56, 0 51 Z" />
            </svg>
            <div className="stream-particles fire-embers">
              <span className="ember eb-1" />
              <span className="ember eb-2" />
              <span className="ember eb-3" />
              <span className="ember eb-4" />
              <span className="ember eb-5" />
            </div>
          </div>
        );

      case 'skill-fx-hydropump':
        return (
          <div className="skill-blast-stream stream-water">
            <svg className="stream-svg water-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waterOuterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
                <linearGradient id="waterCoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#bae6fd" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
                <filter id="waterGlow">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path className="water-wave wave-1" fill="url(#waterOuterGrad)" filter="url(#waterGlow)"
                d="M 0 45 C 40 28, 80 14, 125 14 C 165 14, 205 20, 225 32 C 240 42, 240 54, 225 64 C 200 75, 160 80, 120 80 C 75 78, 35 62, 0 53 Z" />
              <path className="water-wave wave-2" fill="url(#waterCoreGrad)"
                d="M 0 46 C 35 36, 75 26, 115 26 C 155 26, 195 32, 210 42 C 220 48, 220 54, 210 58 C 190 64, 150 68, 115 68 C 70 65, 30 55, 0 50 Z" />
              <path className="water-spiral" stroke="#ffffff" strokeWidth="3" fill="none" strokeDasharray="8 6"
                d="M 0 48 Q 60 22, 120 48 T 240 48" />
            </svg>
            <div className="stream-particles water-bubbles">
              <span className="bubble bb-1" />
              <span className="bubble bb-2" />
              <span className="bubble bb-3" />
              <span className="bubble bb-4" />
              <span className="bubble bb-5" />
            </div>
          </div>
        );

      case 'skill-fx-thunderbolt':
        return (
          <div className="skill-blast-stream stream-thunder">
            <svg className="stream-svg thunder-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <defs>
                <filter id="thunderGlow">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <polyline className="thunder-bolt bolt-outer" stroke="#facc15" strokeWidth="12" fill="none" opacity="0.8"
                points="0,48 30,30 60,62 95,20 130,68 165,24 200,64 240,46" />
              <polyline className="thunder-bolt bolt-main" stroke="#ffffff" strokeWidth="6" fill="none" filter="url(#thunderGlow)"
                points="0,48 30,30 60,62 95,20 130,68 165,24 200,64 240,46" />
              <polyline className="thunder-branch br-1" stroke="#fef08a" strokeWidth="3" fill="none"
                points="95,20 120,6 155,14" />
              <polyline className="thunder-branch br-2" stroke="#fef08a" strokeWidth="3" fill="none"
                points="130,68 158,86 188,78" />
            </svg>
            <div className="stream-particles thunder-sparks">
              <span className="spark sp-1" />
              <span className="spark sp-2" />
              <span className="spark sp-3" />
              <span className="spark sp-4" />
              <span className="spark sp-5" />
            </div>
          </div>
        );

      case 'skill-fx-solarbeam':
        return (
          <div className="skill-blast-stream stream-solar">
            <svg className="stream-svg solar-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="solarBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="25%" stopColor="#fef08a" />
                  <stop offset="65%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
                <filter id="solarGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <rect className="solar-beam-core" x="0" y="36" width="240" height="24" rx="12" fill="url(#solarBeamGrad)" filter="url(#solarGlow)" />
              <rect className="solar-beam-center" x="0" y="42" width="240" height="12" rx="6" fill="#ffffff" />
              <ellipse className="solar-ring ring-1" cx="65" cy="48" rx="16" ry="32" fill="none" stroke="#86efac" strokeWidth="3" />
              <ellipse className="solar-ring ring-2" cx="140" cy="48" rx="18" ry="36" fill="none" stroke="#4ade80" strokeWidth="3" />
              <ellipse className="solar-ring ring-3" cx="210" cy="48" rx="20" ry="40" fill="none" stroke="#22c55e" strokeWidth="3" />
            </svg>
            <div className="stream-particles solar-leaves">
              <span className="leaf-particle lf-1">🍃</span>
              <span className="leaf-particle lf-2">🌿</span>
              <span className="leaf-particle lf-3">🍃</span>
              <span className="leaf-particle lf-4">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-shadowball':
        return (
          <div className="skill-blast-stream stream-shadow">
            <svg className="stream-svg shadow-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="shadowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#7e22ce" />
                  <stop offset="100%" stopColor="#3b0764" />
                </linearGradient>
                <filter id="shadowGlow">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path className="shadow-smoke sm-1" fill="url(#shadowGrad)" filter="url(#shadowGlow)"
                d="M 0 45 C 35 18, 70 12, 115 18 C 160 24, 195 8, 225 24 C 242 38, 238 68, 210 80 C 170 92, 130 75, 85 80 C 40 85, 20 62, 0 52 Z" />
              <path className="shadow-smoke sm-2" fill="#581c87" opacity="0.85"
                d="M 0 46 C 30 28, 65 22, 105 30 C 145 38, 180 26, 205 38 C 220 48, 215 65, 190 70 C 155 75, 120 62, 80 65 C 40 66, 18 56, 0 50 Z" />
            </svg>
            <div className="stream-particles shadow-wisps">
              <span className="wisp ws-1">👻</span>
              <span className="wisp ws-2">🟣</span>
              <span className="wisp ws-3">✨</span>
              <span className="wisp ws-4">🟣</span>
            </div>
          </div>
        );

      case 'skill-fx-psychic':
        return (
          <div className="skill-blast-stream stream-psychic">
            <svg className="stream-svg psychic-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="psychicGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="50%" stopColor="#db2777" />
                  <stop offset="100%" stopColor="#9d174d" />
                </linearGradient>
                <filter id="psychicGlow">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <rect className="psychic-core-beam" x="0" y="42" width="240" height="14" rx="7" fill="#fbcfe8" filter="url(#psychicGlow)" />
              <ellipse className="psychic-wave-ring pw-1" cx="45" cy="49" rx="12" ry="24" fill="none" stroke="#f472b6" strokeWidth="2.5" />
              <ellipse className="psychic-wave-ring pw-2" cx="105" cy="49" rx="18" ry="34" fill="none" stroke="#ec4899" strokeWidth="3" />
              <ellipse className="psychic-wave-ring pw-3" cx="170" cy="49" rx="24" ry="44" fill="none" stroke="#db2777" strokeWidth="3.5" />
              <ellipse className="psychic-wave-ring pw-4" cx="228" cy="49" rx="28" ry="50" fill="none" stroke="#be185d" strokeWidth="4" />
            </svg>
            <div className="stream-particles psychic-sparkles">
              <span className="p-sparkle ps-1">🔮</span>
              <span className="p-sparkle ps-2">✨</span>
              <span className="p-sparkle ps-3">💖</span>
              <span className="p-sparkle ps-4">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-hurricane':
        return (
          <div className="skill-blast-stream stream-hurricane">
            <svg className="stream-svg hurricane-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <path className="hurricane-slash s-1" stroke="#38bdf8" strokeWidth="6" fill="none" opacity="0.9"
                d="M 0 45 C 50 15, 120 10, 240 25" />
              <path className="hurricane-slash s-2" stroke="#ffffff" strokeWidth="4" fill="none"
                d="M 0 48 C 60 48, 140 46, 240 48" />
              <path className="hurricane-slash s-3" stroke="#0284c7" strokeWidth="6" fill="none" opacity="0.9"
                d="M 0 52 C 50 82, 120 86, 240 70" />
            </svg>
            <div className="stream-particles hurricane-gust">
              <span className="gust g-1">🌪️</span>
              <span className="gust g-2">💨</span>
              <span className="gust g-3">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-dracometeor':
        return (
          <div className="skill-blast-stream stream-draco">
            <svg className="stream-svg draco-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dracoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path className="draco-breath d-1" fill="url(#dracoGrad)" opacity="0.85"
                d="M 0 46 C 40 24, 85 15, 130 18 C 175 22, 210 10, 235 28 C 245 42, 238 65, 215 78 C 175 92, 130 82, 85 78 C 45 74, 20 60, 0 52 Z" />
            </svg>
            <div className="stream-particles draco-stars">
              <span className="d-star ds-1">🐉</span>
              <span className="d-star ds-2">🌠</span>
              <span className="d-star ds-3">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-gigaimpact':
        return (
          <div className="skill-blast-stream stream-giga">
            <svg className="stream-svg giga-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <rect className="giga-laser" x="0" y="34" width="240" height="28" rx="14" fill="#fbbf24" opacity="0.9" />
              <rect className="giga-core" x="0" y="40" width="240" height="16" rx="8" fill="#ffffff" />
            </svg>
            <div className="stream-particles giga-shocks">
              <span className="shock sk-1">💥</span>
              <span className="shock sk-2">⭐</span>
              <span className="shock sk-3">💥</span>
            </div>
          </div>
        );

      case 'skill-fx-blizzard':
        return (
          <div className="skill-blast-stream stream-blizzard">
            <svg className="stream-svg blizzard-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <path className="blizzard-cone" fill="#38bdf8" opacity="0.75"
                d="M 0 46 C 50 20, 120 15, 240 20 C 235 50, 240 80, 240 80 C 120 85, 50 78, 0 52 Z" />
            </svg>
            <div className="stream-particles blizzard-flakes">
              <span className="flake fk-1">❄️</span>
              <span className="flake fk-2">💎</span>
              <span className="flake fk-3">❄️</span>
              <span className="flake fk-4">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-aurasphere':
        return (
          <div className="skill-blast-stream stream-aura">
            <svg className="stream-svg aura-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <path className="aura-blast" fill="#3b82f6" opacity="0.85"
                d="M 0 46 C 45 28, 90 20, 140 22 C 185 24, 215 32, 235 46 C 215 62, 185 70, 140 72 C 90 74, 45 66, 0 52 Z" />
            </svg>
            <div className="stream-particles aura-pulses">
              <span className="pulse pu-1">💥</span>
              <span className="pulse pu-2">🔵</span>
              <span className="pulse pu-3">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-watershuriken':
        return (
          <div className="skill-blast-stream stream-shuriken">
            <svg className="stream-svg shuriken-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <path className="water-blade" stroke="#0ea5e9" strokeWidth="6" fill="none"
                d="M 0 46 C 60 25, 120 65, 240 46" />
            </svg>
            <div className="stream-particles shuriken-stars">
              <span className="sh-star ss-1">🌊</span>
              <span className="sh-star ss-2">🌀</span>
              <span className="sh-star ss-3">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-firekanji':
        return (
          <div className="skill-blast-stream stream-firekanji">
            <svg className="stream-svg firekanji-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <circle cx="150" cy="50" r="38" fill="url(#fireMidGrad)" filter="url(#fireGlow)" opacity="0.85" />
              <line x1="80" y1="50" x2="220" y2="50" stroke="#f97316" strokeWidth="14" strokeLinecap="round" opacity="0.8" />
              <line x1="80" y1="50" x2="220" y2="50" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
              <path d="M 150 18 Q 140 50, 100 88" stroke="#dc2626" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M 150 18 Q 140 50, 100 88" stroke="#ffffff" strokeWidth="8" fill="none" strokeLinecap="round" />
              <path d="M 150 48 Q 165 65, 205 88" stroke="#dc2626" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M 150 48 Q 165 65, 205 88" stroke="#ffffff" strokeWidth="8" fill="none" strokeLinecap="round" />
            </svg>
            <div className="stream-particles fire-embers">
              <span className="ember eb-1" />
              <span className="ember eb-2" />
              <span className="ember eb-3" />
            </div>
          </div>
        );

      case 'skill-fx-firespin':
        return (
          <div className="skill-blast-stream stream-firespin">
            <svg className="stream-svg firespin-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <path className="fire-spin-path sp-1" stroke="#f97316" strokeWidth="12" fill="none" strokeDasharray="12 8"
                d="M 0 50 Q 60 15, 120 50 T 240 50" />
              <path className="fire-spin-path sp-2" stroke="#fef08a" strokeWidth="7" fill="none"
                d="M 0 50 Q 60 85, 120 50 T 240 50" />
            </svg>
            <div className="stream-particles fire-embers">
              <span className="ember eb-1" />
              <span className="ember eb-3" />
            </div>
          </div>
        );

      case 'skill-fx-hydrocannon':
        return (
          <div className="skill-blast-stream stream-hydrocannon">
            <svg className="stream-svg hydrocannon-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <circle cx="160" cy="50" r="36" fill="url(#waterOuterGrad)" filter="url(#waterGlow)" />
              <circle cx="160" cy="50" r="22" fill="url(#waterCoreGrad)" />
              <ellipse cx="90" cy="50" rx="20" ry="38" fill="none" stroke="#bae6fd" strokeWidth="4" />
              <ellipse cx="40" cy="50" rx="14" ry="26" fill="none" stroke="#38bdf8" strokeWidth="3" />
            </svg>
            <div className="stream-particles water-bubbles">
              <span className="bubble bb-1" />
              <span className="bubble bb-2" />
              <span className="bubble bb-3" />
            </div>
          </div>
        );

      case 'skill-fx-bubblebeam':
        return (
          <div className="skill-blast-stream stream-bubblebeam">
            <svg className="stream-svg bubblebeam-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <circle cx="50" cy="45" r="14" fill="#38bdf8" opacity="0.6" stroke="#ffffff" strokeWidth="2" />
              <circle cx="95" cy="30" r="20" fill="#bae6fd" opacity="0.7" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="110" cy="65" r="16" fill="#38bdf8" opacity="0.6" stroke="#ffffff" strokeWidth="2" />
              <circle cx="160" cy="42" r="24" fill="#7dd3fc" opacity="0.8" stroke="#ffffff" strokeWidth="3" />
              <circle cx="210" cy="58" r="18" fill="#bae6fd" opacity="0.7" stroke="#ffffff" strokeWidth="2" />
            </svg>
            <div className="stream-particles water-bubbles">
              <span className="bubble bb-1" />
              <span className="bubble bb-3" />
              <span className="bubble bb-4" />
            </div>
          </div>
        );

      case 'skill-fx-vinewhip':
        return (
          <div className="skill-blast-stream stream-vinewhip">
            <svg className="stream-svg vinewhip-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <path className="vine-whip-path vw-1" stroke="#22c55e" strokeWidth="7" fill="none" strokeLinecap="round"
                d="M 0 45 Q 70 10, 140 55 T 240 30" />
              <path className="vine-whip-path vw-2" stroke="#16a34a" strokeWidth="7" fill="none" strokeLinecap="round"
                d="M 0 55 Q 70 90, 140 45 T 240 70" />
              <path className="vine-whip-leaf" stroke="#86efac" strokeWidth="3" fill="none"
                d="M 120 48 Q 135 35, 150 48 T 180 48" />
            </svg>
            <div className="stream-particles solar-leaves">
              <span className="leaf-particle lf-1">🌿</span>
              <span className="leaf-particle lf-2">🍃</span>
            </div>
          </div>
        );

      case 'skill-fx-petaldance':
        return (
          <div className="skill-blast-stream stream-petaldance">
            <svg className="stream-svg petaldance-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <path className="petal-swirl" stroke="#f472b6" strokeWidth="8" fill="none" strokeDasharray="14 10"
                d="M 0 50 Q 60 15, 120 50 T 240 50" />
              <path className="petal-swirl" stroke="#fbcfe8" strokeWidth="4" fill="none"
                d="M 0 50 Q 60 85, 120 50 T 240 50" />
            </svg>
            <div className="stream-particles petal-particles">
              <span className="petal-particle pt-1">🌸</span>
              <span className="petal-particle pt-2">🌺</span>
              <span className="petal-particle pt-3">🌸</span>
              <span className="petal-particle pt-4">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-thunderstorm':
        return (
          <div className="skill-blast-stream stream-thunderstorm">
            <svg className="stream-svg thunderstorm-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <line x1="160" y1="0" x2="160" y2="100" stroke="#fef08a" strokeWidth="18" opacity="0.5" />
              <polyline points="160,0 145,35 175,60 150,100" stroke="#ffffff" strokeWidth="8" fill="none" filter="url(#thunderGlow)" />
              <ellipse cx="150" cy="90" rx="35" ry="10" fill="none" stroke="#facc15" strokeWidth="4" />
            </svg>
            <div className="stream-particles thunder-sparks">
              <span className="spark sp-1" />
              <span className="spark sp-2" />
              <span className="spark sp-3" />
            </div>
          </div>
        );

      case 'skill-fx-volttackle':
        return (
          <div className="skill-blast-stream stream-volttackle">
            <svg className="stream-svg volttackle-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <ellipse cx="140" cy="50" rx="45" ry="32" fill="url(#fireMidGrad)" opacity="0.6" />
              <circle cx="140" cy="50" r="25" fill="#ffffff" filter="url(#thunderGlow)" />
              <line x1="0" y1="50" x2="240" y2="50" stroke="#fef08a" strokeWidth="8" strokeDasharray="16 10" />
            </svg>
            <div className="stream-particles thunder-sparks">
              <span className="spark sp-1" />
              <span className="spark sp-4" />
            </div>
          </div>
        );

      case 'skill-fx-nightshade':
        return (
          <div className="skill-blast-stream stream-nightshade">
            <svg className="stream-svg nightshade-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <circle cx="50" cy="42" r="7" fill="#ef4444" filter="url(#shadowGlow)" />
              <circle cx="80" cy="42" r="7" fill="#ef4444" filter="url(#shadowGlow)" />
              <path className="shadow-smoke" fill="#3b0764" opacity="0.9"
                d="M 80 45 C 120 20, 160 15, 240 30 C 230 70, 170 85, 120 75 Z" />
            </svg>
            <div className="stream-particles shadow-wisps">
              <span className="wisp ws-1">😈</span>
              <span className="wisp ws-3">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-sludgebomb':
        return (
          <div className="skill-blast-stream stream-sludge">
            <svg className="stream-svg sludge-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <circle cx="70" cy="50" r="16" fill="#7e22ce" />
              <circle cx="130" cy="40" r="22" fill="#581c87" />
              <circle cx="190" cy="55" r="28" fill="#3b0764" />
            </svg>
            <div className="stream-particles shadow-wisps">
              <span className="wisp ws-2">💀</span>
              <span className="wisp ws-4">🟣</span>
            </div>
          </div>
        );

      case 'skill-fx-psystrike':
        return (
          <div className="skill-blast-stream stream-psystrike">
            <svg className="stream-svg psystrike-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <polygon points="60,40 120,50 60,60" fill="#f472b6" filter="url(#psychicGlow)" />
              <polygon points="120,32 200,50 120,68" fill="#ffffff" filter="url(#psychicGlow)" />
              <line x1="0" y1="50" x2="240" y2="50" stroke="#db2777" strokeWidth="6" />
            </svg>
            <div className="stream-particles psychic-sparkles">
              <span className="p-sparkle ps-1">🌀</span>
              <span className="p-sparkle ps-2">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-prismbarrier':
        return (
          <div className="skill-blast-stream stream-prism">
            <svg className="stream-svg prism-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <polygon points="120,15 160,15 180,50 160,85 120,85 100,50" fill="rgba(244,114,182,0.3)" stroke="#ec4899" strokeWidth="3" />
              <polygon points="150,25 180,25 195,50 180,75 150,75 135,50" fill="rgba(192,132,252,0.3)" stroke="#a855f7" strokeWidth="3" />
            </svg>
            <div className="stream-particles psychic-sparkles">
              <span className="p-sparkle ps-3">🛡️</span>
              <span className="p-sparkle ps-4">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-meteorshower':
        return (
          <div className="skill-blast-stream stream-meteor">
            <svg className="stream-svg meteor-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <line x1="80" y1="10" x2="160" y2="90" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />
              <circle cx="160" cy="90" r="14" fill="#fbbf24" filter="url(#fireGlow)" />
              <line x1="120" y1="5" x2="210" y2="75" stroke="#ec4899" strokeWidth="6" strokeLinecap="round" />
              <circle cx="210" cy="75" r="12" fill="#f472b6" />
            </svg>
            <div className="stream-particles draco-stars">
              <span className="d-star ds-1">🌠</span>
              <span className="d-star ds-2">☄️</span>
            </div>
          </div>
        );

      case 'skill-fx-outrage':
        return (
          <div className="skill-blast-stream stream-outrage">
            <svg className="stream-svg outrage-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <circle cx="130" cy="50" r="42" fill="url(#fireOuterGrad)" opacity="0.75" />
              <circle cx="130" cy="50" r="28" fill="#991b1b" />
            </svg>
            <div className="stream-particles fire-embers">
              <span className="ember eb-1" />
              <span className="ember eb-2" />
            </div>
          </div>
        );

      case 'skill-fx-bonerush':
        return (
          <div className="skill-blast-stream stream-bonerush">
            <svg className="stream-svg bonerush-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <line x1="70" y1="20" x2="180" y2="80" stroke="#60a5fa" strokeWidth="8" strokeLinecap="round" />
              <line x1="70" y1="80" x2="180" y2="20" stroke="#93c5fd" strokeWidth="8" strokeLinecap="round" />
            </svg>
            <div className="stream-particles aura-pulses">
              <span className="pulse pu-1">⚔️</span>
              <span className="pulse pu-2">💥</span>
            </div>
          </div>
        );

      case 'skill-fx-stoneedge':
        return (
          <div className="skill-blast-stream stream-stoneedge">
            <svg className="stream-svg stoneedge-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <polygon points="50,85 70,30 90,85" fill="#78350f" stroke="#b45309" strokeWidth="3" />
              <polygon points="110,90 140,15 170,90" fill="#92400e" stroke="#d97706" strokeWidth="3" />
              <polygon points="180,88 205,35 230,88" fill="#78350f" stroke="#b45309" strokeWidth="3" />
            </svg>
            <div className="stream-particles aura-pulses">
              <span className="pulse pu-1">🪨</span>
              <span className="pulse pu-3">💥</span>
            </div>
          </div>
        );

      case 'skill-fx-icebeam':
        return (
          <div className="skill-blast-stream stream-icebeam">
            <svg className="stream-svg icebeam-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <polyline points="0,50 30,35 60,65 100,30 140,70 180,35 240,50" stroke="#ffffff" strokeWidth="5" fill="none" filter="url(#waterGlow)" />
              <polyline points="0,50 30,35 60,65 100,30 140,70 180,35 240,50" stroke="#38bdf8" strokeWidth="10" fill="none" opacity="0.75" />
            </svg>
            <div className="stream-particles blizzard-flakes">
              <span className="flake fk-1">🧊</span>
              <span className="flake fk-2">❄️</span>
            </div>
          </div>
        );

      case 'skill-fx-auroraveil':
        return (
          <div className="skill-blast-stream stream-auroraveil">
            <svg className="stream-svg auroraveil-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <path d="M 0 35 Q 60 70, 120 35 T 240 35" stroke="#2dd4bf" strokeWidth="12" fill="none" opacity="0.7" />
              <path d="M 0 55 Q 60 20, 120 55 T 240 55" stroke="#c084fc" strokeWidth="10" fill="none" opacity="0.7" />
            </svg>
            <div className="stream-particles blizzard-flakes">
              <span className="flake fk-3">✨</span>
              <span className="flake fk-4">❄️</span>
            </div>
          </div>
        );

      case 'skill-fx-typhoon':
        return (
          <div className="skill-blast-stream stream-typhoon">
            <svg className="stream-svg typhoon-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <ellipse cx="140" cy="50" rx="35" ry="45" fill="none" stroke="#38bdf8" strokeWidth="6" strokeDasharray="14 8" />
              <ellipse cx="140" cy="50" rx="18" ry="24" fill="none" stroke="#ffffff" strokeWidth="4" />
            </svg>
            <div className="stream-particles hurricane-gust">
              <span className="gust g-1">🌀</span>
              <span className="gust g-2">💨</span>
            </div>
          </div>
        );

      case 'skill-fx-bravebird':
        return (
          <div className="skill-blast-stream stream-bravebird">
            <svg className="stream-svg bravebird-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <polygon points="60,20 180,50 60,80 90,50" fill="#0284c7" filter="url(#waterGlow)" />
              <polygon points="80,30 190,50 80,70 105,50" fill="#ffffff" />
            </svg>
            <div className="stream-particles hurricane-gust">
              <span className="gust g-1">🪶</span>
              <span className="gust g-3">✨</span>
            </div>
          </div>
        );

      case 'skill-fx-magicalshine':
        return (
          <div className="skill-blast-stream stream-magicalshine">
            <svg className="stream-svg magicalshine-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <circle cx="140" cy="50" r="32" fill="#ffffff" filter="url(#psychicGlow)" />
              <line x1="80" y1="50" x2="200" y2="50" stroke="#f472b6" strokeWidth="6" />
              <line x1="140" y1="10" x2="140" y2="90" stroke="#fbbf24" strokeWidth="6" />
            </svg>
            <div className="stream-particles psychic-sparkles">
              <span className="p-sparkle ps-1">✨</span>
              <span className="p-sparkle ps-2">💖</span>
            </div>
          </div>
        );

      case 'skill-fx-heartstorm':
        return (
          <div className="skill-blast-stream stream-heartstorm">
            <div className="stream-particles heart-particles">
              <span className="heart-p hp-1">💖</span>
              <span className="heart-p hp-2">💕</span>
              <span className="heart-p hp-3">💓</span>
              <span className="heart-p hp-4">💖</span>
            </div>
          </div>
        );

      case 'skill-fx-gigaforce':
        return (
          <div className="skill-blast-stream stream-gigaforce">
            <svg className="stream-svg gigaforce-svg" viewBox="0 0 240 100" preserveAspectRatio="none">
              <ellipse cx="140" cy="50" rx="42" ry="42" fill="none" stroke="#eab308" strokeWidth="7" />
              <ellipse cx="140" cy="50" rx="24" ry="24" fill="#ffffff" />
            </svg>
            <div className="stream-particles giga-shocks">
              <span className="shock sk-1">💥</span>
              <span className="shock sk-2">⭐</span>
            </div>
          </div>
        );

      case 'skill-fx-splashrush':
        return (
          <div className="skill-blast-stream stream-splashrush">
            <div className="stream-particles splash-particles">
              <span className="splash-p sp-1">🐟</span>
              <span className="splash-p sp-2">✨</span>
              <span className="splash-p sp-3">🌟</span>
              <span className="splash-p sp-4">🎉</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="skill-blast-stream stream-generic">
            <span className="generic-icon">{symbolIcon}</span>
          </div>
        );
    }
  };

  // 🖼️ 미니룸 캔버스 렌더러
  const renderMiniroomCanvas = ({ compact = false }: { compact?: boolean }) => {
    const bgTheme = currentBgTheme || 'classic';
    const stickers = currentStickers || [];

    return (
      <div className="miniroom-viewport-wrapper">
        <div
          ref={miniroomCanvasRef}
          className={`miniroom-canvas-container bg-${bgTheme} ${compact ? 'compact' : ''} ${dragState ? 'is-dragging' : ''}`}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('miniroom-floor') || (e.target as HTMLElement).classList.contains('miniroom-wall')) {
              setSelectedDecorItem(null);
            }
          }}
        >
          {/* 🖼️ 배경 장식 */}
          <div className="miniroom-wall">
            <div className="miniroom-window">
              <span className="window-sun">☀️</span>
              <span className="window-cloud c1">☁️</span>
              <span className="window-cloud c2">☁️</span>
            </div>
          </div>
          <div className="miniroom-floor"></div>

          {/* 🐾 키우는 중인 메인 포켓몬 */}
          {displayActivePokemon && (() => {
            const id = 'active';
            const place = getPokemonPlacement(id, 45, 52, 1, false, 0, 0, 0);
            const isSelected = selectedDecorItem?.type === 'pokemon' && selectedDecorItem.id === id;
            const isDragging = dragState?.type === 'pokemon' && dragState.id === id;
            const { isBack, visualRotateY } = computePokemonVisualAngle(place.tiltY || 0);
            const spriteSrc = getPokemonSpriteUrl(displayActivePokemon.speciesId, {
              isShiny: displayActivePokemon.isShiny,
              isBack: isBack,
              animated: true
            });

            return (
              <div
                key="mon_active"
                className={`miniroom-pokemon free-drag ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${place.x}%`,
                  top: `${place.y}%`,
                  transform: `scale(${place.scale}) ${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${visualRotateY}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: isDragging ? 50 : isSelected ? 40 : 20
                }}
                onPointerDown={(e) => handleStartDrag(e, 'pokemon', id, place.x, place.y)}
                title={`[${displayActivePokemon.nickname || displayActivePokemon.name}] Lv.${displayActivePokemon.level}`}
              >
                <div className={`pokemon-name-tag ${place.flipped ? 'unflip-tag' : ''}`}>
                  <span className="tag-lvl">Lv.{displayActivePokemon.level}</span>
                  <span className="tag-name">{displayActivePokemon.nickname || displayActivePokemon.name}</span>
                </div>
                <img
                  src={spriteSrc}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (isBack) {
                      target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${displayActivePokemon.speciesId}.png`;
                    } else {
                      target.src = displayActivePokemon.sprites.front;
                    }
                  }}
                  alt={displayActivePokemon.name}
                  className="poke-sprite bounce"
                  draggable={false}
                />
              </div>
            );
          })()}

          {/* 🏡 키우는 중인 보육소 서브 포켓몬들 */}
          {displayReservePokemons.map((mon, idx) => {
            const id = `res_${mon.uid || idx}`;
            const defX = idx === 0 ? 20 : idx === 1 ? 70 : 82;
            const defY = idx === 0 ? 58 : idx === 1 ? 58 : 48;
            const defFlip = idx !== 0;
            const place = getPokemonPlacement(id, defX, defY, 0.9, defFlip, 0, 0, 0);
            const isSelected = selectedDecorItem?.type === 'pokemon' && selectedDecorItem.id === id;
            const isDragging = dragState?.type === 'pokemon' && dragState.id === id;
            const { isBack, visualRotateY } = computePokemonVisualAngle(place.tiltY || 0);
            const spriteSrc = getPokemonSpriteUrl(mon.speciesId, {
              isShiny: mon.isShiny,
              isBack: isBack,
              animated: true
            });

            return (
              <div
                key={mon.uid || idx}
                className={`miniroom-pokemon free-drag ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${place.x}%`,
                  top: `${place.y}%`,
                  transform: `scale(${place.scale}) ${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${visualRotateY}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: isDragging ? 50 : isSelected ? 40 : 18
                }}
                onPointerDown={(e) => handleStartDrag(e, 'pokemon', id, place.x, place.y)}
                title={`[${mon.nickname || mon.name}] Lv.${mon.level}`}
              >
                <div className={`pokemon-name-tag compact ${place.flipped ? 'unflip-tag' : ''}`}>
                  <span>{mon.nickname || mon.name}</span>
                </div>
                <img
                  src={spriteSrc}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (isBack) {
                      target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${mon.speciesId}.png`;
                    } else {
                      target.src = mon.sprites.front;
                    }
                  }}
                  alt={mon.name}
                  className="poke-sprite"
                  draggable={false}
                />
              </div>
            );
          })}

          {/* 🎓 졸업시킨 포켓몬들 (졸업 학사모 뱃지 🎓 & 진화 전/후 모습 커스텀 지원) */}
          {displayGraduatedPokemons.map((dip, idx) => {
            const id = `grad_${dip.id || idx}`;
            const defX = idx === 0 ? 12 : idx === 1 ? 26 : idx === 2 ? 72 : 86;
            const defY = idx === 0 ? 32 : idx === 1 ? 22 : idx === 2 ? 22 : 32;
            const defFlip = idx >= 2;
            const place = getPokemonPlacement(id, defX, defY, 0.85, defFlip, 0, 0, 0);
            const isSelected = selectedDecorItem?.type === 'pokemon' && selectedDecorItem.id === id;
            const isDragging = dragState?.type === 'pokemon' && dragState.id === id;
            const { isBack, visualRotateY } = computePokemonVisualAngle(place.tiltY || 0);
            const activeForm = getDiplomaActiveSprite(dip, isBack);

            return (
              <div
                key={dip.id || idx}
                className={`miniroom-pokemon free-drag ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${place.x}%`,
                  top: `${place.y}%`,
                  transform: `scale(${place.scale}) ${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${visualRotateY}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: isDragging ? 50 : isSelected ? 40 : 16
                }}
                onPointerDown={(e) => handleStartDrag(e, 'pokemon', id, place.x, place.y)}
                onClick={() => !dragState && setSelectedDiploma(dip)}
                title={`🎓 명예 졸업생 [${dip.nickname || dip.name}] - ${activeForm.name}`}
              >
                <div className={`graduated-badge-tag ${place.flipped ? 'unflip-tag' : ''}`}>
                  🎓 {dip.nickname || dip.name} {activeForm.name !== (dip.nickname || dip.name) ? `(${activeForm.name})` : ''}
                </div>
                <img
                  src={activeForm.sprite}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (isBack) {
                      target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${dip.speciesId}.png`;
                    } else {
                      target.src = activeForm.fallbackSprite || dip.sprite;
                    }
                  }}
                  alt={activeForm.name}
                  className="poke-sprite graduated-shine"
                  draggable={false}
                />
              </div>
            );
          })}

          {/* 🎨 배치된 스티커 & 자유 텍스트 / 말풍선들 */}
          {stickers.map(stk => {
            const isSelected = selectedDecorItem?.type === 'sticker' && selectedDecorItem.id === stk.id;
            const isDragging = dragState?.type === 'sticker' && dragState.id === stk.id;
            const scale = stk.scale || 1;
            const flipped = !!stk.flipped;
            const rot = stk.rotation || 0;
            const tilt = stk.tiltX || 0;

            return (
              <div
                key={stk.id}
                className={`miniroom-placed-item ${stk.type === 'skill_fx' ? 'skill-fx-item' : stk.text ? 'text-item' : 'sticker-item'} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${stk.x}%`,
                  top: `${stk.y}%`,
                  transform: `scale(${scale}) ${flipped ? 'scaleX(-1)' : ''} rotate(${rot}deg) rotateX(${tilt}deg)`,
                  transformOrigin: 'center center',
                  zIndex: isDragging ? 60 : isSelected ? 45 : (stk.type === 'skill_fx' ? 22 : 25)
                }}
                onPointerDown={(e) => handleStartDrag(e, 'sticker', stk.id, stk.x, stk.y)}
              >
                {/* 1. 고유스킬 이펙트 (💥 이펙트 클래스 매핑 및 파티클 렌더링) */}
                {stk.type === 'skill_fx' ? (() => {
                  const effectMeta = POKEMON_SKILL_EFFECTS.find(
                    e => e.id === stk.skillFxId || e.fxClass === stk.skillFxId || e.id === stk.stickerId
                  );
                  const activeFxClass = effectMeta?.fxClass || (stk.skillFxId?.startsWith('skill-fx-') ? stk.skillFxId : 'skill-fx-thunderbolt');
                  const symbolIcon = stk.icon || effectMeta?.icon || '⚡';

                  return (
                    <div className={`skill-fx-display ${activeFxClass}`}>
                      {renderSkillStreamFx(activeFxClass, symbolIcon)}
                    </div>
                  );
                })() : stk.text ? (
                  <div
                    className={`custom-decor-text style-${stk.styleType || 'classic_bubble'}`}
                    style={{
                      color: stk.color || '#1e293b',
                      fontSize: `${stk.fontSize || 14}px`
                    }}
                  >
                    <span className={flipped ? 'unflip-text' : ''}>{stk.text}</span>
                  </div>
                ) : (
                  /* 3. 이모지/아이콘 스티커 */
                  <span className="stk-icon">{stk.icon}</span>
                )}

                {/* 개별 삭제 버튼: 홈 화면(minihompyTab === 'home')에서는 절대 미노출, 오직 꾸미기 모드에서 선택되었을 때만 노출 */}
                {!visitingFarm && minihompyTab !== 'home' && isSelected && (
                  <button
                    className="stk-del-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSticker(stk.id);
                    }}
                    title="스티커 삭제"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 🎛️ 선택된 아이템 (스티커/포켓몬) 정밀 360도 회전 & 3D 틸트 조작 툴바 */}
        {!compact && selectedDecorItem && !visitingFarm && (() => {
          const isPokemon = selectedDecorItem.type === 'pokemon';
          const id = selectedDecorItem.id;
          const curPlacement = isPokemon
            ? getPokemonPlacement(id, 45, 52, 1, false, 0, 0, 0)
            : (farmState.stickers || []).find(s => s.id === id);
          const curRot = (isPokemon ? (curPlacement as PokemonPlacement)?.rotation : (curPlacement as MinihompySticker)?.rotation) || 0;
          const curTilt = (isPokemon ? (curPlacement as PokemonPlacement)?.tiltX : (curPlacement as MinihompySticker)?.tiltX) || 0;
          const curTurnY = isPokemon ? ((curPlacement as PokemonPlacement)?.tiltY || 0) : 0;

          return (
            <div className="miniroom-item-editor-bar">
              <div className="editor-top-line">
                <span className="editor-target-name">
                  {isPokemon ? '🐾 포켓몬 각도 및 방향 설정' : '🎨 스티커/텍스트 회전 & 연출'}
                </span>
                <button
                  className="editor-btn close"
                  onClick={() => setSelectedDecorItem(null)}
                  title="선택 해제"
                >
                  ✖ 선택 닫기
                </button>
              </div>

              <div className="editor-controls-grid">
                {/* 1. 크기 & 좌우 반전 */}
                <div className="control-row">
                  <span className="control-title">📐 크기/반전:</span>
                  <button
                    className="editor-btn"
                    onClick={() => isPokemon ? handleScalePokemon(id, -0.15) : handleScaleSticker(id, -0.15)}
                    title="축소"
                  >
                    ➖ 작게
                  </button>
                  <button
                    className="editor-btn"
                    onClick={() => isPokemon ? handleScalePokemon(id, 0.15) : handleScaleSticker(id, 0.15)}
                    title="확대"
                  >
                    ➕ 크게
                  </button>
                  <button
                    className="editor-btn"
                    onClick={() => isPokemon ? handleFlipPokemon(id) : handleFlipSticker(id)}
                    title="좌우 반전"
                  >
                    🔄 좌우반전
                  </button>
                  {isPokemon ? (
                    <button
                      className="editor-btn"
                      onClick={() => handleResetPokemonPlacement(id)}
                      title="위치 및 각도 초기화"
                    >
                      📍 위치/각도 초기화
                    </button>
                  ) : (
                    <button
                      className="editor-btn danger"
                      onClick={() => {
                        handleRemoveSticker(id);
                      }}
                      title="삭제"
                    >
                      🗑️ 삭제
                    </button>
                  )}
                </div>

                {/* 2. 🔄 3D 방향 / 시선 회전 (0° ~ 360° 미세 턴) - 포켓몬 전용 */}
                {isPokemon && (
                  <div className="control-row">
                    <span className="control-title">🔄 시선/방향 (3D 턴):</span>
                    <button className="editor-btn nudge-btn" onClick={() => handleTurnPokemonY(id, -15)}>↶ -15°</button>
                    <button className="editor-btn nudge-btn" onClick={() => handleTurnPokemonY(id, -5)}>↶ -5°</button>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="2"
                      value={curTurnY}
                      onChange={e => handleSetPokemonTiltY(id, Number(e.target.value))}
                      className="angle-range-slider"
                      title="360도 자유로운 방향 회전 (0도: 정면, 180도: 후면)"
                    />
                    <span className="angle-badge">{curTurnY}°</span>
                    <button className="editor-btn nudge-btn" onClick={() => handleTurnPokemonY(id, 5)}>↷ +5°</button>
                    <button className="editor-btn nudge-btn" onClick={() => handleTurnPokemonY(id, 15)}>↷ +15°</button>
                    <button className="editor-btn mini" onClick={() => handleSetPokemonTiltY(id, 0)}>0° 정면</button>
                    <button className="editor-btn mini" onClick={() => handleSetPokemonTiltY(id, 45)}>45°</button>
                    <button className="editor-btn mini" onClick={() => handleSetPokemonTiltY(id, 135)}>135°</button>
                    <button className="editor-btn mini" onClick={() => handleSetPokemonTiltY(id, 180)}>180° 후면</button>
                    <button className="editor-btn mini" onClick={() => handleSetPokemonTiltY(id, 225)}>225°</button>
                    <button className="editor-btn mini" onClick={() => handleSetPokemonTiltY(id, 315)}>315°</button>
                  </div>
                )}

                {/* 3. 🔄 2D 평면 회전 (Z축) */}
                <div className="control-row">
                  <span className="control-title">📐 평면 기울기:</span>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleRotatePokemon(id, -15) : handleRotateSticker(id, -15)}>↶ -15°</button>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleRotatePokemon(id, -5) : handleRotateSticker(id, -5)}>↶ -5°</button>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={curRot}
                    onChange={e => isPokemon ? handleSetPokemonRotation(id, Number(e.target.value)) : handleSetStickerRotation(id, Number(e.target.value))}
                    className="angle-range-slider"
                    title="2D 평면 회전"
                  />
                  <span className="angle-badge">{curRot}°</span>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleRotatePokemon(id, 5) : handleRotateSticker(id, 5)}>↷ +5°</button>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleRotatePokemon(id, 15) : handleRotateSticker(id, 15)}>↷ +15°</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonRotation(id, 0) : handleSetStickerRotation(id, 0)}>0°</button>
                </div>

                {/* 4. 📐 앞뒤 3D 상하 눕힘 (X축 Tilt) */}
                <div className="control-row">
                  <span className="control-title">📐 상하 눕힘:</span>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleTiltPokemonX(id, -10) : handleTiltStickerX(id, -10)}>⬆️ 앞 -10°</button>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    step="2"
                    value={curTilt}
                    onChange={e => isPokemon ? handleSetPokemonTiltX(id, Number(e.target.value)) : handleSetStickerTiltX(id, Number(e.target.value))}
                    className="angle-range-slider"
                    title="상하 3D 눕힘 (-60도 ~ +60도)"
                  />
                  <span className="angle-badge">{curTilt > 0 ? `+${curTilt}°` : `${curTilt}°`}</span>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleTiltPokemonX(id, 10) : handleTiltStickerX(id, 10)}>⬇️ 뒤 +10°</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonTiltX(id, 0) : handleSetStickerTiltX(id, 0)}>수평 0°</button>
                </div>

                {/* 4. 🌱 졸업생 외형 변신 (진화 전/후 폼 선택) */}
                {isPokemon && id.startsWith('grad_') && (() => {
                  const dipId = id.replace('grad_', '');
                  const diploma = farmState.graduatedPokemon.find(d => d.id === dipId || `grad_${d.id}` === id);
                  if (!diploma) return null;
                  const chain = getEvolutionChainForDiploma(diploma);
                  if (chain.length <= 1) return null;
                  const active = getDiplomaActiveSprite(diploma);

                  return (
                    <div className="control-row form-evolution-row">
                      <span className="control-title">🌱 외형 변신:</span>
                      <div className="form-evolution-buttons">
                        {chain.map((stage, sIdx) => {
                          const isCur = active.formIndex === sIdx;
                          return (
                            <button
                              key={stage.id || sIdx}
                              className={`editor-btn form-btn ${isCur ? 'active-form' : ''}`}
                              onClick={() => handleSetDiplomaForm(diploma.id, sIdx)}
                              title={`${stage.name} 모습으로 미니룸에 표시`}
                            >
                              <img src={stage.sprite} alt={stage.name} className="mini-form-sprite" />
                              <span>{sIdx === 0 ? '🐣 1단' : sIdx === chain.length - 1 ? '👑 최종' : `⚡ ${sIdx + 1}단`}: {stage.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // 상태 자동 저장 및 소켓 동기화
  useEffect(() => {
    if (!farmState.isInitialized || !farmState.ownerName || farmState.ownerName === '지우') {
      return;
    }
    saveFarmState(farmState);
    // 🛡️ 서버 데이터 로드가 완료되기 전에는 기기의 오래된 로컬 캐시로 서버를 덮어쓰지 않음
    if (!isServerSyncReadyRef.current) return;

    if (socket && socket.connected) {
      const now = Date.now();
      socket.emit('farm-sync', {
        username: farmState.ownerName,
        farmData: {
          farmName: farmState.farmName,
          activePokemon: farmState.activePokemon,
          reservePokemon: farmState.reservePokemon,
          graduatedPokemon: farmState.graduatedPokemon,
          graduatedCount: farmState.graduatedPokemon ? farmState.graduatedPokemon.length : 0,
          heartsCount: farmState.heartsCount,
          coins: farmState.coins,
          inventory: farmState.inventory,
          incubatingEgg: farmState.incubatingEgg,
          lotteryState: farmState.lotteryState,
          guestbook: farmState.guestbook,
          bgTheme: farmState.bgTheme,
          stickers: farmState.stickers,
          pokemonPlacements: farmState.pokemonPlacements,
          statusMsg: farmState.statusMsg,
          bgmSong: farmState.bgmSong,
          todayCount: farmState.todayCount,
          totalCount: farmState.totalCount,
          lastActive: now
        }
      });
    }
  }, [farmState, socket]);
  // 알림 토스트 헬퍼
  const showAlert = (text: string, type: 'success' | 'info' | 'warn' = 'info') => {
    setActionAlert({ text, type });
    setTimeout(() => setActionAlert(null), 3500);
  };

  // 🔊 쓰다듬기 효과음 토글 헬퍼
  const togglePetSound = () => {
    setIsPetSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('pokefarm_pet_sound_enabled', String(next));
      showAlert(next ? '🔊 쓰다듬기 효과음이 켜졌습니다.' : '🔇 쓰다듬기 효과음이 꺼졌습니다.', 'info');
      return next;
    });
  };

  // ⚡ 하루 지나면 모든 포켓몬 에너지 100% 자동 회복 검사 & 알림
  const checkDailyEnergyRecovery = useCallback(() => {
    const today = getTodayDateString();
    setFarmState(prev => {
      if (!prev.lastEnergyRecoveryDate) {
        return { ...prev, lastEnergyRecoveryDate: today };
      }
      if (prev.lastEnergyRecoveryDate !== today) {
        const recoverEnergy = (mon: FarmPokemon) => {
          const maxStat = getMaxStatForStage(mon.stageIndex);
          return { ...mon, energy: maxStat };
        };
        const updatedActive = prev.activePokemon ? recoverEnergy(prev.activePokemon) : null;
        const updatedReserve = prev.reservePokemon ? prev.reservePokemon.map(recoverEnergy) : [];

        showAlert('☀️ 새로운 하루가 시작되었습니다! 모든 포켓몬의 에너지가 100% 가득 회복되었습니다! ⚡', 'success');

        return {
          ...prev,
          activePokemon: updatedActive,
          reservePokemon: updatedReserve,
          lastEnergyRecoveryDate: today
        };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    checkDailyEnergyRecovery();
    const timer = setInterval(checkDailyEnergyRecovery, 30000);
    return () => clearInterval(timer);
  }, [checkDailyEnergyRecovery]);

  // 🥚 알 부화기 온기 증가 헬퍼
  const addEggWarmth = (amount: number, reason: string) => {
    setFarmState(prev => {
      if (!prev.incubatingEgg || prev.incubatingEgg.progress >= 100) return prev;
      const nextProgress = Math.min(100, prev.incubatingEgg.progress + amount);
      if (nextProgress >= 100) {
        showAlert(`🐣 인큐베이터의 [${prev.incubatingEgg.name}]이(가) 온기를 가득 머금고 부화할 준비가 되었습니다! (${reason})`, 'success');
      }
      return {
        ...prev,
        incubatingEgg: {
          ...prev.incubatingEgg,
          progress: nextProgress
        }
      };
    });
  };

  const pmon = farmState.activePokemon;

  // 1. 포켓몬 쓰다듬기 & 고유 스킬 모션 이펙트 (최대 3개 스킬 중 현재 슬롯 발동)
  const handlePetPokemon = (e?: React.MouseEvent, overrideSkill?: PokemonSkillDef) => {
    if (!pmon) return;
    if (isPetSoundEnabled) {
      playPokemonCry(pmon.speciesId);
    }
    addEggWarmth(1, '포켓몬 쓰다듬기');

    const skillSet = getPokemonSkillSet(pmon);
    const targetSkill = overrideSkill || skillSet.find(s => s.slot === selectedSkillSlot) || skillSet[0];

    const pType = pmon.types[0] || 'normal';
    let particles: string[] = ['⭐', '✨', '💫', targetSkill.icon, '🌟', '💥', '⚡', '🎉'];

    if (pType === 'fire' || targetSkill.icon === '🔥' || targetSkill.icon === '☄️') {
      particles = ['🔥', '💥', '☄️', '♨️', '✨', '🔥', '🌟', '💥'];
    } else if (pType === 'water' || targetSkill.icon === '💧' || targetSkill.icon === '🌊' || targetSkill.icon === '🫧') {
      particles = ['🌊', '💦', '🫧', '💧', '✨', '🌀', '💎', '🌊'];
    } else if (pType === 'grass' || targetSkill.icon === '🍃' || targetSkill.icon === '🌿' || targetSkill.icon === '🌸') {
      particles = ['🍃', '🌸', '🌿', '🌱', '✨', '🌺', '🍀', '🍃'];
    } else if (pType === 'electric' || targetSkill.icon === '⚡' || targetSkill.icon === '🌩️') {
      particles = ['⚡', '⚡', '🌟', '💛', '✨', '⚡', '💫', '⚡'];
    } else if (pType === 'dragon') {
      particles = ['🐲', '☄️', '🔥', '💥', '✨', '🌌', '⚡', '🌀'];
    } else if (pType === 'psychic') {
      particles = ['🔮', '✨', '💫', '🌌', '💜', '👁️', '🌀', '✨'];
    } else if (pType === 'ghost' || pType === 'dark') {
      particles = ['👻', '💀', '🌑', '💜', '🔥', '✨', '🖤', '🌪️'];
    } else if (pType === 'ice') {
      particles = ['❄️', '🧊', '💎', '🌨️', '✨', '💠', '⭐', '❄️'];
    } else if (pType === 'flying') {
      particles = ['🌪️', '💨', '🪶', '⚡', '✨', '🌀', '💫', '💨'];
    } else if (pType === 'fairy') {
      particles = ['💖', '✨', '🎀', '🌸', '🪄', '⭐', '💫', '🌟'];
    } else if (pType === 'fighting' || pType === 'rock' || pType === 'steel') {
      particles = ['💥', '👊', '🪨', '⚡', '✨', '⚔️', '🛡️', '💢'];
    }

    setPetSkillEffect({
      id: Date.now(),
      skillName: targetSkill.name,
      type: pType,
      fxClass: targetSkill.fxClass,
      icon: targetSkill.icon,
      particles
    });
    setIsPetJumping(true);

    const clientX = e ? e.clientX : window.innerWidth / 2;
    const clientY = e ? e.clientY : window.innerHeight / 2;
    setFloatingHeart({ id: Date.now(), x: clientX, y: clientY });

    setTimeout(() => setIsPetJumping(false), 900);
    setTimeout(() => {
      setFloatingHeart(null);
      setPetSkillEffect(null);
    }, 1500);

    setFarmState(prev => {
      if (!prev.activePokemon) return prev;
      const newHappiness = Math.min(100, prev.activePokemon.happiness + 5);
      // 🌟 Lv 16 이상일 때 쓰다듬기 경험치 살짝 추가 (15 EXP)
      const expGain = prev.activePokemon.level >= 16 ? 15 : 10;
      const newExp = prev.activePokemon.exp + expGain;
      let newLevel = prev.activePokemon.level;
      let curExp = newExp;
      let maxExp = getMaxExpForLevel(newLevel);

      while (curExp >= maxExp) {
        curExp -= maxExp;
        newLevel += 1;
        maxExp = getMaxExpForLevel(newLevel);
        showAlert(`🎉 레벨업! [${prev.activePokemon.nickname}]이(가) Lv.${newLevel}이 되었습니다!`, 'success');
      }

      return {
        ...prev,
        activePokemon: {
          ...prev.activePokemon,
          happiness: newHappiness,
          level: newLevel,
          exp: curExp,
          maxExp,
          totalPats: prev.activePokemon.totalPats + 1
        }
      };
    });
  };

  // 🎯 포켓몬 고유스킬 슬롯 직접 클릭 발동 (1, 2, 3번 스킬)
  const handleTriggerSkillSlot = (sk: PokemonSkillDef) => {
    setSelectedSkillSlot(sk.slot);
    handlePetPokemon(undefined, sk);
  };

  // ⌨️ 단축키 [C] 입력 시 화면 어디서든 포켓몬 쓰다듬기 처리 (꾹 누르기 반복 차단)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 꾹 누르고 있을 때 발생하는 OS 키보드 자동 반복(e.repeat) 무조건 차단 (1회 누를 때마다 1번만 발동)
      if (e.repeat) return;

      // 텍스트 입력창(input, textarea 등)에 포커스가 있을 때는 단축키 무시
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
         target.tagName === 'TEXTAREA' ||
         target.tagName === 'SELECT' ||
         target.isContentEditable)
      ) {
        return;
      }

      // 'c', 'C', 한글 'ㅊ' 키 입력 감지
      if (e.key === 'c' || e.key === 'C' || e.key === 'ㅊ' || e.code === 'KeyC') {
        if (pmon) {
          handlePetPokemon();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pmon]);

  // 2. 아이템 사용 (밥주기 / 목욕 / 장난감 / 치료)
  const handleUseItem = (item: FarmItem) => {
    if (!pmon) return;
    const currentQty = farmState.inventory[item.id] || 0;
    if (currentQty <= 0) {
      showAlert(`아이템 [${item.name}]이 부족합니다. 상점에서 구매해 주세요!`, 'warn');
      return;
    }

    // 🍬 1. 이상한사탕 특수 효과 (즉시 1레벨업!)
    if (item.id === 'rare_candy') {
      setFarmState(prev => {
        if (!prev.activePokemon) return prev;
        const target = prev.activePokemon;
        const newLevel = target.level + 1;
        const maxExp = getMaxExpForLevel(newLevel);
        return {
          ...prev,
          inventory: {
            ...prev.inventory,
            [item.id]: currentQty - 1
          },
          activePokemon: {
            ...target,
            level: newLevel,
            exp: 0,
            maxExp,
            happiness: Math.min(100, target.happiness + 30)
          }
        };
      });
      playPokemonCry(pmon.speciesId);
      showAlert(`🎉 [이상한사탕]의 신비한 힘으로 [${pmon.nickname}]이(가) 즉시 Lv.${pmon.level + 1}이 되었습니다!`, 'success');
      return;
    }

    // 💎 2. 반짝이는 원석 매각 (300 코인 획득)
    if (item.id === 'shiny_stone') {
      if (!window.confirm('💎 [반짝이는 원석]을 사내 보석상에 매각하고 300 코인을 받으시겠습니까?')) {
        return;
      }
      setFarmState(prev => ({
        ...prev,
        coins: prev.coins + 300,
        inventory: {
          ...prev.inventory,
          [item.id]: currentQty - 1
        }
      }));
      showAlert(`💎 [반짝이는 원석]을 사내 보석상에 매각하여 300 코인을 획득했습니다!`, 'success');
      return;
    }

    // 👑 3. 전설의 황금 왕관 매각 (1,000 코인 획득)
    if (item.id === 'gold_crown') {
      if (!window.confirm('👑 [전설의 황금 왕관]은 매우 귀중한 전설의 보물입니다!\n정말로 사내 역사관에 기증하고 1,000 코인을 받으시겠습니까?')) {
        return;
      }
      setFarmState(prev => ({
        ...prev,
        coins: prev.coins + 1000,
        inventory: {
          ...prev.inventory,
          [item.id]: currentQty - 1
        }
      }));
      showAlert(`👑 [전설의 황금 왕관]을 사내 역사관에 기증하여 1,000 코인을 획득했습니다!`, 'success');
      return;
    }

    // 🥚 4. 의문의 알 / 황금알 인큐베이터 입고
    if (item.id === 'mystery_egg' || item.id === 'golden_egg') {
      handlePlaceEggInIncubator(item);
      return;
    }

    if (item.id === 'mild_soap') {
      addEggWarmth(3, '따뜻한 거품 목욕');
    }

    setFarmState(prev => {
      if (!prev.activePokemon) return prev;
      const target = prev.activePokemon;
      const effect = item.effect;
      const maxStat = getMaxStatForStage(target.stageIndex);

      let newHunger = target.hunger + (effect.hunger || 0);
      newHunger = Math.max(0, Math.min(maxStat, newHunger));

      let newClean = target.cleanliness + (effect.cleanliness || 0);
      newClean = Math.max(0, Math.min(maxStat, newClean));

      let newHappy = target.happiness + (effect.happiness || 0);
      newHappy = Math.max(0, Math.min(100, newHappy));

      let newEnergy = target.energy + (effect.energy || 0);
      newEnergy = Math.max(0, Math.min(maxStat, newEnergy));

      let newExp = target.exp + (effect.exp || 0);
      let newLevel = target.level;
      let maxExp = getMaxExpForLevel(newLevel);

      while (newExp >= maxExp) {
        newExp -= maxExp;
        newLevel += 1;
        maxExp = getMaxExpForLevel(newLevel);
      }

      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [item.id]: currentQty - 1
        },
        activePokemon: {
          ...target,
          hunger: newHunger,
          cleanliness: newClean,
          happiness: newHappy,
          energy: newEnergy,
          level: newLevel,
          exp: newExp,
          maxExp
        }
      };
    });

    playPokemonCry(pmon.speciesId);
    showAlert(`✨ [${item.name}]을(를) 사용했습니다!`, 'success');
  };

  // 3. 아르바이트 수행 (체험 모달 개시)
  const handleWorkJob = (job: PartTimeJob) => {
    if (!pmon) return;
    if (pmon.level < job.minLevel) {
      showAlert(`아르바이트 참여 조건 부족: Lv.${job.minLevel} 이상 필요합니다.`, 'warn');
      return;
    }
    if (pmon.energy < job.energyCost) {
      showAlert('체력이 부족합니다! 비타민 음료를 먹이거나 휴식을 취해주세요.', 'warn');
      return;
    }
    if (pmon.hunger < job.hungerCost) {
      showAlert('배가 너무 고파서 일할 수 없습니다! 열매를 먹여주세요.', 'warn');
      return;
    }

    playPokemonCry(pmon.speciesId);

    // 알바 작업 모달 개시
    setJobShiftModal({
      active: true,
      job,
      progress: 0,
      statusText: '🏢 현장 도착! 업무를 준비하고 있습니다...',
      isDone: false,
      rewardGained: null
    });
  };

  // 💼 아르바이트 현장 진행 애니메이션 타이머
  useEffect(() => {
    if (!jobShiftModal || !jobShiftModal.active || jobShiftModal.isDone) return;

    const interval = setInterval(() => {
      setJobShiftModal(prev => {
        if (!prev || prev.isDone) return prev;
        const nextProgress = Math.min(100, prev.progress + 14);

        let statusText = '🏢 현장 도착! 업무 준비 중...';
        const isWater = pmon?.types.includes('water');
        const isGrass = pmon?.types.includes('grass');
        const isFire = pmon?.types.includes('fire');
        const isElectric = pmon?.types.includes('electric');

        if (nextProgress >= 20 && nextProgress < 65) {
          if (prev.job.id === 'job_garden') {
            statusText = isWater
              ? '🌊 [물대포/파도타기] 기술로 꽃밭에 시원한 물줄기를 뿜어냅니다!'
              : isGrass
              ? '🍃 [광합성 & 덩굴채찍]으로 싱그러운 정원을 정성스레 가꿉니다!'
              : '🚿 귀여운 물뿌리개로 꽃 하나하나에 촉촉하게 물을 주는 중!';
          } else if (prev.job.id === 'job_mail') {
            statusText = '📬 사내 중요 서류를 신속 정확하게 배달하는 중! 🏃‍♂️💨';
          } else if (prev.job.id === 'job_coffee') {
            statusText = isFire
              ? '🔥 [불꽃세례]로 장인의 프리미엄 원두를 로스팅 중!'
              : '☕ 향긋한 프리미엄 핸드드립 커피를 정성껏 추출 중! ☕✨';
          } else if (prev.job.id === 'job_generator') {
            statusText = isElectric
              ? '⚡ [10만볼트] 고출력 전기 충전으로 배터리를 급속 충전 중!'
              : '🔋 에너지 가득 다이나모 발전 휠을 힘차게 돌리는 중!';
          } else {
            statusText = '🕶️ VIP 대표님을 빈틈없이 든든하게 에스코트 경호 중!';
          }
        } else if (nextProgress >= 65 && nextProgress < 95) {
          statusText = '✨ 마무리 품질 검수 및 현장 정리 정돈 중...';
        } else if (nextProgress >= 100) {
          statusText = '🎉 업무 완수! 급여 명세서가 발급되었습니다.';
        }

        if (nextProgress >= 100) {
          if (pmon) {
            let newExp = pmon.exp + prev.job.expReward;
            let newLevel = pmon.level;
            let maxExp = getMaxExpForLevel(newLevel);
            let didLevelUp = false;

            while (newExp >= maxExp) {
              newExp -= maxExp;
              newLevel += 1;
              maxExp = getMaxExpForLevel(newLevel);
              didLevelUp = true;
            }

            setFarmState(fPrev => {
              if (!fPrev.activePokemon) return fPrev;
              const target = fPrev.activePokemon;
              return {
                ...fPrev,
                coins: fPrev.coins + prev.job.rewardCoins,
                activePokemon: {
                  ...target,
                  energy: Math.max(0, target.energy - prev.job.energyCost),
                  hunger: Math.max(0, target.hunger - prev.job.hungerCost),
                  cleanliness: Math.max(0, target.cleanliness - prev.job.cleanlinessCost),
                  level: newLevel,
                  exp: newExp,
                  maxExp,
                  jobsCompleted: target.jobsCompleted + 1
                }
              };
            });

            addEggWarmth(5, '아르바이트 완수');

            return {
              ...prev,
              progress: 100,
              statusText: '🎉 업무 완수! 급여 명세서가 발급되었습니다.',
              isDone: true,
              rewardGained: {
                coins: prev.job.rewardCoins,
                exp: prev.job.expReward,
                levelUp: didLevelUp,
                newLevel
              }
            };
          }
        }

        return {
          ...prev,
          progress: nextProgress,
          statusText
        };
      });
    }, 280);

    return () => clearInterval(interval);
  }, [jobShiftModal?.active, jobShiftModal?.isDone, pmon]);

  // 🌲 3-2. 사내 뒷산 탐험 개시 (스토리 인카운터)
  const handleStartExpedition = (area: ExpeditionArea) => {
    if (!pmon) return;
    if (pmon.level < area.minLevel) {
      showAlert(`탐험 참여 조건 부족: Lv.${area.minLevel} 이상 필요합니다.`, 'warn');
      return;
    }
    if (pmon.energy < area.energyCost) {
      showAlert('체력이 부족합니다! 비타민 음료를 먹이거나 휴식을 취해주세요.', 'warn');
      return;
    }
    if (pmon.hunger < area.hungerCost) {
      showAlert('배가 너무 고파서 탐험을 떠날 수 없습니다! 열매를 먹여주세요.', 'warn');
      return;
    }

    playPokemonCry(pmon.speciesId);
    const story = getRandomStoryEvent(area.id);

    setExpeditionModal({
      active: true,
      area,
      stage: 'walking',
      progress: 0,
      statusText: '🎒 탐험 배낭을 메고 신비로운 목적지로 출발합니다...',
      storyEvent: story,
      selectedChoice: null,
      isSuccess: null,
      resolutionText: '',
      diceRoll: 0,
      requiredRoll: 0,
      rewardGained: null
    });
  };

  // 🌲 1단계: 탐험 전반부 진행 (목적지 이동 ➔ 돌발 스토리 인카운터 발생)
  useEffect(() => {
    if (!expeditionModal || !expeditionModal.active || expeditionModal.stage !== 'walking') return;

    const interval = setInterval(() => {
      setExpeditionModal(prev => {
        if (!prev || prev.stage !== 'walking') return prev;
        const nextProgress = Math.min(50, prev.progress + 15);

        let statusText = '🗺️ 목적지에 도착하여 주변 지형을 수색 중...';
        if (nextProgress >= 30 && nextProgress < 50) {
          statusText = '🔍 수풀과 덤불 사이를 조심스럽게 헤치며 숨겨진 길을 탐색하는 중...';
        } else if (nextProgress >= 50) {
          statusText = '⚠️ 앗! 전방에서 돌발 상황이 발생했습니다! 선택의 순간입니다.';
        }

        if (nextProgress >= 50) {
          return {
            ...prev,
            stage: 'event',
            progress: 50,
            statusText
          };
        }

        return {
          ...prev,
          progress: nextProgress,
          statusText
        };
      });
    }, 280);

    return () => clearInterval(interval);
  }, [expeditionModal?.active, expeditionModal?.stage]);

  // 🌲 2단계: 유저 선택지 클릭 & 주사위/스탯 판정 & 결산
  const handleMakeStoryChoice = (choice: StoryChoice) => {
    if (!pmon || !expeditionModal || expeditionModal.stage !== 'event') return;

    playPokemonCry(pmon.speciesId);

    // 판정 확률 계산 (기본 확률 + 레벨 보너스 + 친밀도 보너스)
    const levelBonus = Math.floor(pmon.level * 0.6); // Lv.20 ➔ +12%
    const happinessBonus = pmon.happiness >= 70 ? 10 : 0; // 친밀도 70+ ➔ +10%
    const baseRate = Math.round(choice.successRate * 100);
    const targetSuccessRate = Math.min(95, Math.max(20, baseRate + levelBonus + happinessBonus));

    const roll = Math.floor(Math.random() * 100) + 1;
    const isSuccess = roll <= targetSuccessRate;
    const outcome = isSuccess ? choice.successResult : choice.failResult;
    const resolutionText = isSuccess ? choice.successDialogue : choice.failDialogue;

    setExpeditionModal(prev => prev ? {
      ...prev,
      stage: 'resolving',
      selectedChoice: choice,
      progress: 75,
      diceRoll: roll,
      requiredRoll: targetSuccessRate,
      isSuccess,
      resolutionText,
      statusText: isSuccess ? '✨ 판정 성공! 상황을 멋지게 해결했습니다!' : '💦 판정 아쉬움! 위기를 모면하며 탈출합니다.'
    } : null);

    // 1.4초 후 결산 완료 단계로 이동
    setTimeout(() => {
      // 인벤토리 & 보상 적용
      const gainedCoins = outcome.coins;
      const gainedExp = outcome.exp;
      const foundItems: { item: FarmItem; qty: number }[] = [];
      const inventoryAdd: Record<string, number> = {};

      outcome.items.forEach(it => {
        const itemObj = FARM_ITEMS.find(i => i.id === it.itemId);
        if (itemObj) {
          foundItems.push({ item: itemObj, qty: it.qty });
          inventoryAdd[it.itemId] = (inventoryAdd[it.itemId] || 0) + it.qty;
        }
      });

      let newExp = pmon.exp + gainedExp;
      let newLevel = pmon.level;
      let maxExp = getMaxExpForLevel(newLevel);
      let didLevelUp = false;

      while (newExp >= maxExp) {
        newExp -= maxExp;
        newLevel += 1;
        maxExp = getMaxExpForLevel(newLevel);
        didLevelUp = true;
      }

      const energyDmg = (!isSuccess && 'energyDamage' in choice.failResult ? choice.failResult.energyDamage : 0) || 0;
      const cleanDmg = (!isSuccess && 'cleanlinessDamage' in choice.failResult ? choice.failResult.cleanlinessDamage : 0) || 0;

      setFarmState(fPrev => {
        if (!fPrev.activePokemon) return fPrev;
        const target = fPrev.activePokemon;
        const nextInv = { ...fPrev.inventory };
        Object.entries(inventoryAdd).forEach(([k, v]) => {
          nextInv[k] = (nextInv[k] || 0) + v;
        });

        return {
          ...fPrev,
          coins: fPrev.coins + gainedCoins,
          inventory: nextInv,
          activePokemon: {
            ...target,
            energy: Math.max(0, target.energy - expeditionModal.area.energyCost - energyDmg),
            hunger: Math.max(0, target.hunger - expeditionModal.area.hungerCost),
            cleanliness: Math.max(0, target.cleanliness - expeditionModal.area.cleanlinessCost - cleanDmg),
            level: newLevel,
            exp: newExp,
            maxExp
          }
        };
      });

      addEggWarmth(15, '스토리 탐험 완수');

      setExpeditionModal(prev => prev ? {
        ...prev,
        stage: 'result',
        progress: 100,
        statusText: outcome.title,
        rewardGained: {
          title: outcome.title,
          grade: outcome.grade,
          coins: gainedCoins,
          exp: gainedExp,
          levelUp: didLevelUp,
          newLevel,
          foundItems
        }
      } : null);
    }, 1400);
  };

  // 🥚 3-3. 인큐베이터에 알 넣기
  const handlePlaceEggInIncubator = (eggItem: FarmItem) => {
    if (farmState.incubatingEgg) {
      showAlert('인큐베이터에 이미 품고 있는 알이 있습니다! 먼저 부화시켜 주세요.', 'warn');
      return;
    }
    const currentQty = farmState.inventory[eggItem.id] || 0;
    if (currentQty <= 0) {
      showAlert(`보유 중인 [${eggItem.name}]이 없습니다. 상점이나 탐험에서 획득해 보세요!`, 'warn');
      return;
    }

    const isGolden = eggItem.id === 'golden_egg';
    const newEgg: IncubatingEgg = {
      id: `egg_${Date.now()}`,
      name: eggItem.name,
      icon: eggItem.icon,
      isGolden,
      progress: 0,
      acquiredAt: new Date().toISOString()
    };

    setFarmState(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [eggItem.id]: currentQty - 1
      },
      incubatingEgg: newEgg
    }));

    showAlert(`🥚 [${eggItem.name}]을(를) 인큐베이터에 넣었습니다! 쓰다듬기, 목욕, 알바, 탐험으로 온기를 모아주세요!`, 'success');
  };

  // 🐣 3-4. 알 부화 시작 (모달 오픈 & 3단계 연출)
  const handleStartHatching = () => {
    if (!farmState.incubatingEgg || farmState.incubatingEgg.progress < 100) {
      showAlert('알의 온기가 아직 부족합니다! (100% 도달 필요)', 'warn');
      return;
    }

    const egg = farmState.incubatingEgg;
    const { chainIdx, isShiny } = hatchBabyPokemon(egg.isGolden);
    const newBaby = createNewFarmPokemon(chainIdx, undefined, isShiny);

    setHatchingModal({
      active: true,
      stage: 'wobble',
      eggName: egg.name,
      isGolden: egg.isGolden,
      babyPokemon: newBaby,
      nicknameInput: newBaby.name
    });

    // 1단계 -> 2단계: 금 가기
    setTimeout(() => {
      setHatchingModal(prev => prev ? { ...prev, stage: 'crack' } : null);
    }, 1400);

    // 2단계 -> 3단계: 부화 완료!
    setTimeout(() => {
      setHatchingModal(prev => prev ? { ...prev, stage: 'hatched' } : null);
      playPokemonCry(newBaby.speciesId);
    }, 2800);
  };

  // 🎉 3-5. 부화된 아기 포켓몬 수령 (대표 파트너로 교체 or 보육소에 보관)
  const handleConfirmHatch = (choice: 'setActive' | 'sendToReserve') => {
    if (!hatchingModal || !hatchingModal.babyPokemon) return;

    const baby = {
      ...hatchingModal.babyPokemon,
      nickname: hatchingModal.nicknameInput.trim() || hatchingModal.babyPokemon.name
    };

    setFarmState(prev => {
      let nextActive = prev.activePokemon;
      const nextReserve = [...(prev.reservePokemon || [])];

      if (choice === 'setActive') {
        if (prev.activePokemon) {
          nextReserve.unshift(prev.activePokemon);
        }
        nextActive = baby;
      } else {
        nextReserve.unshift(baby);
      }

      return {
        ...prev,
        activePokemon: nextActive,
        reservePokemon: nextReserve,
        incubatingEgg: null
      };
    });

    setHatchingModal(null);
    showAlert(
      choice === 'setActive'
        ? `🌟 갓 태어난 [${baby.nickname}]이(가) 내 새로운 대표 파트너가 되었습니다!`
        : `🏡 [${baby.nickname}]이(가) 보육소 목장에 안전하게 등록되었습니다!`,
      'success'
    );
  };

  // 🔄 3-6. 보육소 목장의 포켓몬으로 대표 파트너 교체하기
  const handleSwitchActivePokemon = (targetUid: string) => {
    setFarmState(prev => {
      const reserves = [...(prev.reservePokemon || [])];
      const targetIdx = reserves.findIndex(p => p.uid === targetUid);
      if (targetIdx === -1) return prev;

      const targetMon = reserves[targetIdx];
      reserves.splice(targetIdx, 1);

      if (prev.activePokemon) {
        reserves.unshift(prev.activePokemon);
      }

      return {
        ...prev,
        activePokemon: targetMon,
        reservePokemon: reserves
      };
    });

    showAlert('✨ 대표 파트너 포켓몬을 성공적으로 교체했습니다!', 'success');
  };

  // 🏥 3-6-1. 보육소 포켓몬을 포켓몬 센터로 보내기 (기능상 보육소 삭제 및 지원금 +100 코인 지급)
  const handleSendPokemonToCenter = (mon: FarmPokemon) => {
    if (visitingFarm) return;
    const confirmMsg = `정말로 [${mon.nickname || mon.name}](Lv.${mon.level})을(를) 포켓몬 센터로 보내시겠습니까?\n\n🏥 센터로 보내진 포켓몬은 간호순 누나와 함께 건강하게 보살핌을 받으며 넓은 세상으로 여행을 떠납니다.\n(감사의 마음으로 포켓농장 지원금 +100 P가 지급됩니다)`;
    if (!window.confirm(confirmMsg)) return;

    setFarmState(prev => {
      const nextReserves = (prev.reservePokemon || []).filter(p => p.uid !== mon.uid);
      const nextPlacements = { ...(prev.pokemonPlacements || {}) };
      const id = `res_${mon.uid}`;
      delete nextPlacements[id];

      return {
        ...prev,
        coins: prev.coins + 100,
        reservePokemon: nextReserves,
        pokemonPlacements: nextPlacements
      };
    });

    showAlert(`🏥 [${mon.nickname || mon.name}]을(를) 포켓몬 센터로 안전하게 보냈습니다. (지원금 +100 P 지급)`, 'success');
  };

  // 🎰 3-7. 일일 럭키 사내 복권 슬롯 추첨
  const handleSpinLottery = () => {
    if (isSlotSpinning) return;

    const lottery = farmState.lotteryState || {
      lastDate: new Date().toISOString().split('T')[0],
      freeSpinsLeft: 3,
      jackpotPool: 2000
    };

    const isFree = lottery.freeSpinsLeft > 0;
    const cost = isFree ? 0 : 50;

    if (!isFree && farmState.coins < cost) {
      showAlert('복권 추첨 비용(50P)이 부족합니다! 알바나 탐험으로 코인을 모아보세요.', 'warn');
      return;
    }

    if (pmon) playPokemonCry(pmon.speciesId);
    setIsSlotSpinning(true);
    setSlotSpinResult(null);

    // 비용 차감 및 잭팟 풀 적립 (유료인 경우 25P는 잭팟 풀로 누적)
    setFarmState(prev => {
      const prevLottery = prev.lotteryState || lottery;
      return {
        ...prev,
        coins: prev.coins - cost,
        lotteryState: {
          ...prevLottery,
          freeSpinsLeft: Math.max(0, prevLottery.freeSpinsLeft - (isFree ? 1 : 0)),
          jackpotPool: prevLottery.jackpotPool + (!isFree ? 25 : 5)
        }
      };
    });

    // 릴 셔플 애니메이션 인터벌
    const icons = LOTTERY_SYMBOLS.map(s => s.icon);
    let counter = 0;
    const shuffleTimer = setInterval(() => {
      counter++;
      setSlotReels([
        icons[Math.floor(Math.random() * icons.length)],
        icons[Math.floor(Math.random() * icons.length)],
        icons[Math.floor(Math.random() * icons.length)]
      ]);
    }, 100);

    // 1.8초 후 최종 당첨 결과 결정
    setTimeout(() => {
      clearInterval(shuffleTimer);
      const drawn = drawLotteryReels();
      setSlotReels([drawn[0].icon, drawn[1].icon, drawn[2].icon]);
      setIsSlotSpinning(false);

      // 온기 +2% 보너스
      addEggWarmth(2, '사내 복권 참여');

      // 당첨 규칙 판정
      const [s1, s2, s3] = drawn;
      const currentJackpot = farmState.lotteryState?.jackpotPool || 2000;

      // 1. 대박 잭팟: 777 피카츄 3개!
      if (s1.id === 'jackpot' && s2.id === 'jackpot' && s3.id === 'jackpot') {
        const jackpotWin = currentJackpot;
        const goldenEggItem = FARM_ITEMS.find(i => i.id === 'golden_egg');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + jackpotWin,
          inventory: {
            ...prev.inventory,
            golden_egg: (prev.inventory.golden_egg || 0) + 1
          },
          lotteryState: {
            ...prev.lotteryState!,
            jackpotPool: 1000
          }
        }));
        setSlotSpinResult({
          title: '🚨 MEGA JACKPOT 대박 잭팟 달성! 🚨',
          desc: `사내 누적 잭팟 상금 ${jackpotWin.toLocaleString()}P 전액 수령! 추가로 🌟 전설 & 특수 포켓몬 알을 획득했습니다!`,
          coinsWon: jackpotWin,
          isJackpot: true,
          wonItem: goldenEggItem
        });
        showAlert(`🎉 MEGA JACKPOT! 사내 잭팟 상금 ${jackpotWin.toLocaleString()}P 당첨!`, 'success');
        return;
      }

      // 2. 이상한사탕 3개
      if (s1.id === 'candy' && s2.id === 'candy' && s3.id === 'candy') {
        const candyItem = FARM_ITEMS.find(i => i.id === 'rare_candy');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 300,
          inventory: {
            ...prev.inventory,
            rare_candy: (prev.inventory.rare_candy || 0) + 1
          }
        }));
        setSlotSpinResult({
          title: '🍬 스위트 캔디 잭팟!',
          desc: '즉시 1레벨을 올려주는 🍬 이상한사탕 1개와 🪙 300P를 획득했습니다!',
          coinsWon: 300,
          isJackpot: false,
          wonItem: candyItem
        });
        return;
      }

      // 3. 일반 포켓몬 알 3개
      if (s1.id === 'egg' && s2.id === 'egg' && s3.id === 'egg') {
        const eggItem = FARM_ITEMS.find(i => i.id === 'mystery_egg');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 400,
          inventory: {
            ...prev.inventory,
            mystery_egg: (prev.inventory.mystery_egg || 0) + 1
          }
        }));
        setSlotSpinResult({
          title: '🥚 일반 포켓몬 알 잭팟!',
          desc: '부화기에 품을 수 있는 🥚 일반 포켓몬 알과 🪙 400P를 획득했습니다!',
          coinsWon: 400,
          isJackpot: false,
          wonItem: eggItem
        });
        return;
      }

      // 4. 거품비누 3개
      if (s1.id === 'soap' && s2.id === 'soap' && s3.id === 'soap') {
        const soapItem = FARM_ITEMS.find(i => i.id === 'mild_soap');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 250,
          inventory: {
            ...prev.inventory,
            mild_soap: (prev.inventory.mild_soap || 0) + 2
          }
        }));
        setSlotSpinResult({
          title: '🧼 버블버블 클린 잭팟!',
          desc: '깨끗한 거품비누 2개와 🪙 250P를 획득했습니다!',
          coinsWon: 250,
          isJackpot: false,
          wonItem: soapItem
        });
        return;
      }

      // 5. 오랭열매 3개
      if (s1.id === 'berry' && s2.id === 'berry' && s3.id === 'berry') {
        const berryItem = FARM_ITEMS.find(i => i.id === 'oran_berry');
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 150,
          inventory: {
            ...prev.inventory,
            oran_berry: (prev.inventory.oran_berry || 0) + 3
          }
        }));
        setSlotSpinResult({
          title: '🫐 달콤한 오랭열매 파티!',
          desc: '맛있는 오랭열매 3개와 🪙 150P를 획득했습니다!',
          coinsWon: 150,
          isJackpot: false,
          wonItem: berryItem
        });
        return;
      }

      // 6. 커피 3개
      if (s1.id === 'coffee' && s2.id === 'coffee' && s3.id === 'coffee') {
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + 80
        }));
        setSlotSpinResult({
          title: '☕ 탕비실 바리스타 상',
          desc: '회사 탕비실 커피 3잔 일치! 🪙 80P를 획득했습니다.',
          coinsWon: 80,
          isJackpot: false
        });
        return;
      }

      // 7. 2개 일치 (소박 당첨)
      if (s1.id === s2.id || s2.id === s3.id || s1.id === s3.id) {
        const reward = 40;
        setFarmState(prev => ({
          ...prev,
          coins: prev.coins + reward
        }));
        setSlotSpinResult({
          title: '✨ 2개 심볼 일치 (소박 당첨)',
          desc: `아깝습니다! 심볼 2개 일치로 🪙 ${reward}P를 획득했습니다.`,
          coinsWon: reward,
          isJackpot: false
        });
        return;
      }

      // 8. 불일치 (위로금)
      const consolation = 10;
      setFarmState(prev => ({
        ...prev,
        coins: prev.coins + consolation
      }));
      setSlotSpinResult({
        title: '🌱 꽝! 다음 기회에...',
        desc: `아쉽게도 일치하지 않았습니다. 위로금 🪙 ${consolation}P가 지급되었습니다.`,
        coinsWon: consolation,
        isJackpot: false
      });
    }, 1800);
  };

  // 4. 상점 아이템 구매
  const handleBuyItem = (item: FarmItem) => {
    if (farmState.coins < item.price) {
      showAlert('보유 코인이 부족합니다! 미니게임을 플레이하거나 아르바이트를 해보세요.', 'warn');
      return;
    }

    setFarmState(prev => ({
      ...prev,
      coins: prev.coins - item.price,
      inventory: {
        ...prev.inventory,
        [item.id]: (prev.inventory[item.id] || 0) + 1
      }
    }));

    showAlert(`🛍️ [${item.name}] 구매 완료!`, 'success');
  };

  // 5. 포켓몬 진화 (Evolution)
  const handleEvolve = () => {
    if (!pmon) return;
    const currentChain = pmon.evolutionChain;
    const nextIndex = pmon.stageIndex + 1;
    if (nextIndex >= currentChain.length) {
      showAlert('이미 최종 진화 단계에 도달했습니다!', 'info');
      return;
    }

    let nextStage = currentChain[nextIndex];

    // 🦊 이브이 8대 진화체 확률 분기 처리 (샤미드, 쥬피썬더, 부스터, 에브이, 블래키, 리피아, 글레이시아, 님피아)
    const isEeveeBranch = pmon.speciesId === 133 || currentChain[pmon.stageIndex]?.isEeveeBranch || nextStage.name.includes('이브이즈');
    if (isEeveeBranch) {
      nextStage = getRandomEeveeEvolution();
    }

    if (pmon.level < nextStage.minLevel || pmon.happiness < nextStage.minHappiness) {
      showAlert(`진화 조건 미달: Lv.${nextStage.minLevel} & 친밀도 ${nextStage.minHappiness} 이상 필요`, 'warn');
      return;
    }

    const isTargetShiny = pmon.isShiny;
    const evolvedFront = isTargetShiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${nextStage.id}.png`
      : nextStage.sprite;
    const evolvedShowdown = isTargetShiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${nextStage.id}.gif`
      : nextStage.showdownSprite;

    // 진화 애니메이션 모달 시작
    setEvolvingModal({
      active: true,
      stage: 'flashing',
      oldName: pmon.name,
      newName: nextStage.name,
      sprite: evolvedShowdown
    });

    setTimeout(() => {
      setEvolvingModal(prev => prev ? { ...prev, stage: 'done' } : null);
      playPokemonCry(nextStage.id);

      setFarmState(prev => {
        if (!prev.activePokemon) return prev;
        const target = prev.activePokemon;
        const updatedChain = isEeveeBranch
          ? [target.evolutionChain[0], nextStage]
          : target.evolutionChain;

        const newMaxStat = getMaxStatForStage(nextIndex);

        return {
          ...prev,
          activePokemon: {
            ...target,
            speciesId: nextStage.id,
            name: nextStage.name,
            nickname: target.nickname === target.name ? nextStage.name : target.nickname,
            stageIndex: nextIndex,
            types: nextStage.types,
            energy: newMaxStat,
            cleanliness: newMaxStat,
            hunger: newMaxStat,
            happiness: 100,
            evolutionChain: updatedChain,
            sprites: {
              front: evolvedFront,
              showdownFront: evolvedShowdown
            }
          }
        };
      });
    }, 2500);
  };

  // 6. 감동의 포켓몬 졸업식 (Graduation)
  const handleGraduate = () => {
    if (!pmon) return;
    const isFinalStage = pmon.stageIndex === pmon.evolutionChain.length - 1;
    if (!isFinalStage || pmon.level < 36) {
      showAlert('졸업 조건: 최종 진화 달성 및 Lv.36 이상 필요합니다.', 'warn');
      return;
    }

    const diploma: GraduationDiploma = {
      id: `diploma_${Date.now()}`,
      pokemonUid: pmon.uid,
      speciesId: pmon.speciesId,
      name: pmon.name,
      nickname: pmon.nickname,
      isShiny: pmon.isShiny,
      sprite: pmon.sprites.showdownFront || pmon.sprites.front,
      ownerName: farmState.ownerName,
      graduatedAt: new Date().toLocaleDateString('ko-KR'),
      finalLevel: pmon.level,
      totalDays: 1,
      jobsDone: pmon.jobsCompleted,
      title: pmon.level >= 50 ? '🌟 전설의 마스터 육성' : '🎓 명예 졸업생',
      evolutionChain: pmon.evolutionChain,
      selectedFormIndex: pmon.evolutionChain.length - 1,
      displaySprite: pmon.sprites.showdownFront || pmon.sprites.front,
      displayName: pmon.name
    };

    setGraduatingModal(diploma);
    playPokemonCry(pmon.speciesId);

    setFarmState(prev => ({
      ...prev,
      coins: prev.coins + 1000, // 졸업 장학금 +1,000 코인
      graduatedPokemon: [diploma, ...prev.graduatedPokemon],
      activePokemon: null // 새 포켓몬 분양받을 수 있게 비움
    }));
  };

  // 7. 새로운 포켓몬 분양받기 (몬스터볼 흔들림 -> 화려한 빛 폭발 -> 짜잔! 등장 모달)
  const handleAdoptPokemon = (chainIndex: number) => {
    if (farmState.activePokemon && !confirm('현재 돌보고 있는 포켓몬이 있습니다. 새 포켓몬으로 교체 분양받으시겠습니까?')) {
      return;
    }

    const selectedChain = STARTER_CHAINS[chainIndex] || STARTER_CHAINS[0];
    const baby = selectedChain[0];

    // 몬스터볼 흔들림 -> 폭발 광채 -> "짜잔! ✨" 등장 모달 오픈!
    setAdoptRevealModal({
      active: true,
      chainIndex,
      baby,
      chain: selectedChain,
      stage: 'wobble',
      nickname: ''
    });

    // 1단계: 흔들림 (650ms)
    setTimeout(() => {
      setAdoptRevealModal(prev => prev && prev.chainIndex === chainIndex ? { ...prev, stage: 'burst' } : prev);
    }, 650);

    // 2단계: 빛 폭발 후 짜잔 등장 (1300ms)
    setTimeout(() => {
      setAdoptRevealModal(prev => prev && prev.chainIndex === chainIndex ? { ...prev, stage: 'emerge' } : prev);
      playPokemonCry(baby.id);
    }, 1300);
  };

  // 입양 모달에서 최종 입양 확정
  const handleConfirmAdoption = (nickname?: string) => {
    if (!adoptRevealModal) return;
    const { chainIndex } = adoptRevealModal;
    const isShinyChance = Math.random() < 0.05; // 5% 확률
    const newMon = createNewFarmPokemon(chainIndex, nickname?.trim() || undefined, isShinyChance);

    setFarmState(prev => ({
      ...prev,
      activePokemon: newMon
    }));

    setAdoptRevealModal(null);
    setActiveTab('yard');
    playPokemonCry(newMon.speciesId);
    showAlert(`🎉 [${newMon.nickname || newMon.name}]을(를) 우리 농장에 입양했습니다! ${isShinyChance ? '✨ [샤이니 이로치] 당첨!' : ''}`, 'success');
  };



  // 🔐 1. 기존 농장 로그인 제출
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const cleanUser = loginUsername.trim();
    if (!cleanUser) {
      setLoginError('농장 아이디(닉네임)를 입력해주세요.');
      return;
    }
    if (!socket || !socket.connected) {
      setLoginError('서버에 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsLoggingIn(true);
    socket.emit('farm-login', {
      username: cleanUser,
      password: loginPassword
    });
  };

  // 🔐 2. 신규 농장 개설 1단계 -> 2단계
  const handleRegisterNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    const cleanUser = registerUsername.trim();
    if (!cleanUser || cleanUser.length < 2) {
      setRegisterError('농장주 닉네임(아이디)은 최소 2자 이상 입력해주세요.');
      return;
    }
    if (cleanUser.length > 30) {
      setRegisterError('아이디는 30자 이하로 입력해주세요.');
      return;
    }
    if (!registerPassword || registerPassword.length < 4) {
      setRegisterError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    if (registerPassword !== registerPasswordConfirm) {
      setRegisterError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setOnboardingStep('starter');
  };

  // 🔐 3. 신규 농장 개설 최종 완료 처리 (회원가입 & 첫 파트너 포켓몬 분양)
  const handleCompleteRegistration = () => {
    const isShinyChance = Math.random() < 0.05; // 5% 전설의 포켓몬 확률
    const newMon = createNewFarmPokemon(selectedStarterIdx, starterNickname.trim() || undefined, isShinyChance);
    const cleanOwner = registerUsername.trim();
    const cleanFarm = registerFarmName.trim() || `${cleanOwner}님의 포켓농장`;

    if (!socket || !socket.connected) {
      showAlert('서버와 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.', 'warn');
      return;
    }

    setIsRegistering(true);
    socket.emit('farm-register', {
      username: cleanOwner,
      password: registerPassword,
      farmData: {
        farmName: cleanFarm,
        activePokemon: newMon,
        reservePokemon: [],
        graduatedPokemon: [],
        graduatedCount: 0,
        heartsCount: 0,
        coins: 1500,
        inventory: { oran_berry: 5, mild_soap: 3, toy_ball: 2 },
        bgTheme: 'classic',
        stickers: [
          { id: 'stk_init_1', stickerId: 'heart', icon: '💖', label: '하트', x: 15, y: 20, type: 'sticker', scale: 1 },
          { id: 'stk_init_2', stickerId: 'star', icon: '⭐', label: '별', x: 80, y: 15, type: 'sticker', scale: 1 },
          { id: 'stk_init_3', stickerId: 'acorn', icon: '🌰', label: '둡토리', x: 45, y: 75, type: 'sticker', scale: 1 },
          { id: 'stk_init_4', stickerId: 'txt_welcome', text: '두부월드에 오신 것을 환영해요! ✨', label: '환영 말풍선', x: 28, y: 18, type: 'bubble', styleType: 'classic_bubble', scale: 1 }
        ],
        pokemonPlacements: {},
        statusMsg: '오늘도 포켓몬과 함께 즐거운 파밍 🎵 1촌 환영!',
        bgmSong: '프리스타일 - Y (Feat. 지선)'
      }
    });
  };

  // 🔐 4. 비밀번호 변경 제출
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    if (!newPassword || newPassword.length < 4) {
      setChangePasswordError('새 비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setChangePasswordError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    if (!socket || !socket.connected) {
      setChangePasswordError('서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    setIsChangingPassword(true);
    socket.emit('farm-change-password', {
      username: farmState.ownerName,
      oldPassword,
      newPassword
    });
  };

  // 🔐 5. 농장 로그아웃
  const handleLogout = () => {
    setShowLogoutConfirm(false);
    clearFarmLocalSession();
    const blankState = getInitialFarmState('');
    setFarmState(blankState);
    setLoginUsername('');
    setLoginPassword('');
    setAuthMode('login');
    if (onUserLogout) {
      onUserLogout();
    }
    showAlert('👋 정상적으로 로그아웃되었습니다. 다른 기기에서도 아이디와 비밀번호로 언제든 다시 로그인할 수 있습니다.', 'info');
  };

  // 🐣 아직 농장에 로그인하지 않았거나 개설되지 않은 경우: 로그인 & 신규 개설 포털 표시
  if (!farmState.isInitialized) {
    const selectedChain = STARTER_CHAINS[selectedStarterIdx] || STARTER_CHAINS[0];
    const starterBaby = selectedChain[0];

    return (
      <div className="poke-farm-container dubu-modern-theme">
        <div className="farm-onboarding-wrapper">
          <div className="onboarding-card auth-card">
            {/* 상단 모드 전환 탭 */}
            <div className="auth-tab-switch">
              <button
                type="button"
                className={`auth-mode-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setLoginError(''); }}
              >
                🔑 기존 농장 로그인 (기기 간 연동)
              </button>
              <button
                type="button"
                className={`auth-mode-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthMode('register'); setRegisterError(''); setOnboardingStep('name'); }}
              >
                🌱 새 농장 개설하기
              </button>
            </div>

            {authMode === 'login' ? (
              /* =============================================================
                 1. 기존 농장 로그인 모드 (어느 기기에서든 내 농장 불러오기)
                 ============================================================= */
              <div className="onboarding-step-content auth-step-content">
                <div className="onboarding-icon">🔑</div>
                <h2>두부월드 포켓농장 로그인</h2>
                <p className="onboarding-desc">
                  아이디와 비밀번호로 로그인하면 어느 기기에서든<br />
                  내 소중한 포켓몬과 미니홈피, 졸업생 데이터를 그대로 불러옵니다!
                </p>

                {loginError && (
                  <div className="auth-error-banner">
                    ⚠️ {loginError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="onboarding-form">
                  <div className="onboarding-input-group">
                    <label>👤 농장 아이디 (닉네임)</label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value)}
                      placeholder="내 농장 아이디를 입력하세요"
                      required
                      minLength={2}
                      maxLength={30}
                      autoFocus
                    />
                  </div>

                  <div className="onboarding-input-group">
                    <div className="input-label-row">
                      <label>🔒 농장 비밀번호</label>
                      <button
                        type="button"
                        className="toggle-pw-btn"
                        onClick={() => setShowLoginPassword(prev => !prev)}
                      >
                        {showLoginPassword ? '🙈 숨기기' : '👁️ 보기'}
                      </button>
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="비밀번호를 입력하세요"
                      required
                    />
                  </div>

                  <div className="auth-legacy-tip">
                    💡 <span>비밀번호 도입 이전에 생성된 기존 농장은 첫 로그인 시 입력한 비밀번호가 계정 비밀번호로 자동 설정됩니다.</span>
                  </div>

                  <button
                    type="submit"
                    className="excel-btn primary onboarding-next-btn auth-submit-btn"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? '🔄 농장 데이터 불러오는 중...' : '🚀 내 농장 불러오기 (로그인)'}
                  </button>

                  <div className="auth-switch-prompt">
                    아직 농장이 없으신가요?{' '}
                    <button
                      type="button"
                      className="auth-link-btn"
                      onClick={() => { setAuthMode('register'); setOnboardingStep('name'); }}
                    >
                      🌱 새 농장 개설하기 ➔
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* =============================================================
                 2. 새 농장 개설하기 모드 (회원가입 + 스타팅 분양)
                 ============================================================= */
              onboardingStep === 'name' ? (
                /* STEP 1: 농장주 닉네임, 농장 이름, 비밀번호 설정 */
                <div className="onboarding-step-content auth-step-content">
                  <div className="onboarding-badge">STEP 1 / 2</div>
                  <div className="onboarding-icon">🏡</div>
                  <h2>포켓농장 개설 신고서</h2>
                  <p className="onboarding-desc">
                    포켓농장에 오신 것을 환영합니다!<br />
                    농장주님의 닉네임과 다른 기기에서도 로그인할 비밀번호를 설정해주세요.
                  </p>

                  {registerError && (
                    <div className="auth-error-banner">
                      ⚠️ {registerError}
                    </div>
                  )}

                  <form onSubmit={handleRegisterNextStep} className="onboarding-form">
                    <div className="onboarding-input-group">
                      <label>👤 농장주 닉네임 (로그인 아이디)</label>
                      <input
                        type="text"
                        value={registerUsername}
                        onChange={e => {
                          setRegisterUsername(e.target.value);
                          if (!registerFarmName || registerFarmName.includes('포켓농장')) {
                            setRegisterFarmName(`${e.target.value}님의 포켓농장`);
                          }
                        }}
                        placeholder="예: 지우"
                        required
                        minLength={2}
                        maxLength={30}
                        autoFocus
                      />
                    </div>

                    <div className="onboarding-input-group">
                      <label>🏷️ 농장 이름</label>
                      <input
                        type="text"
                        value={registerFarmName}
                        onChange={e => setRegisterFarmName(e.target.value)}
                        placeholder="예: 지우의 힐링 포켓농장"
                        maxLength={50}
                      />
                    </div>

                    <div className="onboarding-input-group">
                      <div className="input-label-row">
                        <label>🔒 계정 비밀번호 (최소 4자)</label>
                        <button
                          type="button"
                          className="toggle-pw-btn"
                          onClick={() => setShowRegisterPassword(prev => !prev)}
                        >
                          {showRegisterPassword ? '🙈 숨기기' : '👁️ 보기'}
                        </button>
                      </div>
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerPassword}
                        onChange={e => setRegisterPassword(e.target.value)}
                        placeholder="4자 이상 비밀번호 입력"
                        required
                        minLength={4}
                      />
                    </div>

                    <div className="onboarding-input-group">
                      <label>🔒 비밀번호 확인</label>
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerPasswordConfirm}
                        onChange={e => setRegisterPasswordConfirm(e.target.value)}
                        placeholder="비밀번호 다시 입력"
                        required
                        minLength={4}
                      />
                      {registerPassword && registerPasswordConfirm && (
                        <div className={`pw-match-badge ${registerPassword === registerPasswordConfirm ? 'match' : 'mismatch'}`}>
                          {registerPassword === registerPasswordConfirm ? '✅ 비밀번호가 일치합니다' : '❌ 비밀번호가 일치하지 않습니다'}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="excel-btn primary onboarding-next-btn"
                    >
                      다음: 파트너 포켓몬 선택하기 ➔
                    </button>

                    <div className="auth-switch-prompt">
                      이미 농장 계정이 있으신가요?{' '}
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={() => { setAuthMode('login'); }}
                      >
                        🔑 기존 농장 로그인 ➔
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* STEP 2: 첫 번째 스타팅 포켓몬 선택 & 개장 */
                <div className="onboarding-step-content">
                  <div className="onboarding-badge">STEP 2 / 2</div>
                  <h2>🐣 첫 번째 파트너 포켓몬 선택</h2>
                  <p className="onboarding-desc">
                    함께할 첫 아기 포켓몬을 선택하세요! (※ 가라르/알로라/히스이 등 지방 리전폼 및 전설/환상 포켓몬은 분양받을 수 없으며, 상점의 [🌟 전설 & 특수 포켓몬 알]을 통해서만 부화시킬 수 있습니다)
                  </p>

                  {/* Selected Preview Box */}
                  <div className="selected-starter-preview-banner">
                    <img src={starterBaby.showdownSprite || starterBaby.sprite} alt={starterBaby.name} className="preview-sprite" />
                    <div className="preview-text">
                      <h3>{starterBaby.name}</h3>
                      <span className="types-text">타입: {starterBaby.types.join('/')}</span>
                      <span className="evolution-text">진화: {selectedChain.map(c => c.name).join(' ➔ ')}</span>
                    </div>
                  </div>

                  {/* Generation Filter Chips */}
                  <div className="gen-filter-chips">
                    {[
                      { id: 'all', label: '🌟 전체 스타팅 (29종)' },
                      { id: 'gen1', label: '🔴 1세대 (5종)' },
                      { id: 'gen2-3', label: '🌿 2~3세대 (6종)' },
                      { id: 'gen4-5', label: '⚡ 4~5세대 (6종)' },
                      { id: 'gen6-7', label: '✨ 6~7세대 (6종)' },
                      { id: 'gen8-9', label: '🔮 8~9세대 (6종)' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        className={`gen-chip ${genFilter === f.id ? 'active' : ''}`}
                        onClick={() => setGenFilter(f.id as typeof genFilter)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Starter Picker Grid */}
                  <div className="onboarding-starter-grid">
                    {STARTER_CHAINS.map((chain, idx) => ({ chain, originalIdx: idx }))
                      .filter(({ chain }) => {
                        if (!chain[0].isStarter) return false;
                        if (genFilter === 'all') return true;
                        return chain[0].genCategory === genFilter;
                      })
                      .map(({ chain, originalIdx }) => {
                        const baby = chain[0];
                        const isSelected = originalIdx === selectedStarterIdx;
                        return (
                          <div
                            key={baby.id}
                            className={`onboarding-starter-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedStarterIdx(originalIdx);
                              playPokemonCry(baby.id);
                            }}
                          >
                            <img src={baby.sprite} alt={baby.name} />
                            <span>{baby.name}</span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Nickname Input & Welcome Bonus Info */}
                  <div className="onboarding-extra-section">
                    <div className="onboarding-input-group">
                      <label>✨ 포켓몬 닉네임 (선택 사항)</label>
                      <input
                        type="text"
                        value={starterNickname}
                        onChange={e => setStarterNickname(e.target.value)}
                        placeholder={`기본값: ${starterBaby.name}`}
                        maxLength={100}
                      />
                    </div>

                    <div className="welcome-bonus-box">
                      <strong>🎁 웰컴 스타터 개장 지원금:</strong>
                      <span>🪙 1,500 코인 + 🫐 오랭열매 5개 + 🧼 거품비누 3개 + ⚽ 장난감 2개</span>
                    </div>

                    <div className="onboarding-actions-row">
                      <button className="excel-btn" onClick={() => setOnboardingStep('name')}>
                        ◀ 이전 단계
                      </button>
                      <button
                        className="excel-btn primary onboarding-finish-btn"
                        onClick={handleCompleteRegistration}
                        disabled={isRegistering}
                      >
                        {isRegistering ? '🔄 농장 개설 중...' : '🎉 포켓농장 정식 개장하기!'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // 📖 포켓몬 졸업 도감 렌더링 헬퍼 (내 도감 & 이웃 도감 공용)
  const renderPokedexContent = (graduatedList: GraduationDiploma[], ownerTitle: string, isNeighbor: boolean = false) => {
    const pokedexList = getAllPokedexEntries();
    const gradStats = new Map<number, { count: number; shinyCount: number; firstDate: string; maxLevel: number; nicknames: string[] }>();

    (graduatedList || []).forEach(dip => {
      const existing = gradStats.get(dip.speciesId) || { count: 0, shinyCount: 0, firstDate: dip.graduatedAt, maxLevel: dip.finalLevel, nicknames: [] };
      existing.count += 1;
      if (dip.isShiny) existing.shinyCount += 1;
      if (dip.finalLevel > existing.maxLevel) existing.maxLevel = dip.finalLevel;
      if (!existing.nicknames.includes(dip.nickname)) existing.nicknames.push(dip.nickname);
      gradStats.set(dip.speciesId, existing);
    });

    const unlockedCount = pokedexList.filter(m => gradStats.has(m.speciesId)).length;
    const totalSpeciesCount = pokedexList.length;
    const totalGradCount = graduatedList?.length || 0;
    const shinyGradCount = graduatedList?.filter(d => d.isShiny).length || 0;
    const completionPct = totalSpeciesCount > 0 ? Math.round((unlockedCount / totalSpeciesCount) * 100) : 0;

    let filteredPokedex = pokedexList;
    if (pokedexFilter === 'unlocked') {
      filteredPokedex = filteredPokedex.filter(m => gradStats.has(m.speciesId));
    } else if (pokedexFilter === 'locked') {
      filteredPokedex = filteredPokedex.filter(m => !gradStats.has(m.speciesId));
    } else if (pokedexFilter === 'shiny') {
      filteredPokedex = filteredPokedex.filter(m => (gradStats.get(m.speciesId)?.shinyCount || 0) > 0);
    }

    return (
      <div className="farm-pokedex-layout">
        {/* Header Banner & Sub View Switcher */}
        <div className="pokedex-top-banner">
          <div className="pokedex-banner-title">
            <div className="pokedex-book-icon">📖</div>
            <div>
              <h3>{isNeighbor ? `[${ownerTitle}]님의 포켓몬 졸업 도감` : '포켓농장 공식 졸업 도감 (Official Pokedex)'}</h3>
              <p>
                {isNeighbor
                  ? `[${ownerTitle}]님이 정성으로 키워 졸업시킨 포켓몬 컬렉션과 명예의 전당입니다.`
                  : '정성으로 키워 졸업시킨 포켓몬만 컬러풀하게 활성화되는 명예의 도감입니다.'}
              </p>
            </div>
          </div>

          <div className="pokedex-view-tabs">
            <button
              className={`pokedex-subtab-btn ${pokedexSubView === 'pokedex' ? 'active' : ''}`}
              onClick={() => setPokedexSubView('pokedex')}
            >
              📖 완성 도감 ({unlockedCount}/{totalSpeciesCount})
            </button>
            <button
              className={`pokedex-subtab-btn ${pokedexSubView === 'diplomas' ? 'active' : ''}`}
              onClick={() => setPokedexSubView('diplomas')}
            >
              📜 졸업 증서 앨범 ({totalGradCount}장)
            </button>
          </div>
        </div>

        {pokedexSubView === 'pokedex' ? (
          <>
            {/* Progress & KPI Ribbon */}
            <div className="pokedex-stats-bar">
              <div className="pokedex-kpi-col">
                <span className="pokedex-kpi-label">도감 등록률</span>
                <span className="pokedex-kpi-val">{completionPct}% ({unlockedCount}/{totalSpeciesCount}종)</span>
              </div>
              <div className="pokedex-bar-wrap">
                <div className="pokedex-bar-fill" style={{ width: `${completionPct}%` }} />
              </div>
              <div className="pokedex-kpi-tags">
                <span className="kpi-tag grad">🎓 총 졸업: {totalGradCount}마리</span>
                <span className="kpi-tag shiny">✨ 이로치 등록: {shinyGradCount}마리</span>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="pokedex-filter-bar">
              <button
                className={`pokedex-filter-chip ${pokedexFilter === 'all' ? 'active' : ''}`}
                onClick={() => setPokedexFilter('all')}
              >
                전체 ({totalSpeciesCount})
              </button>
              <button
                className={`pokedex-filter-chip ${pokedexFilter === 'unlocked' ? 'active' : ''}`}
                onClick={() => setPokedexFilter('unlocked')}
              >
                🌟 등록 완료 ({unlockedCount})
              </button>
              <button
                className={`pokedex-filter-chip ${pokedexFilter === 'locked' ? 'active' : ''}`}
                onClick={() => setPokedexFilter('locked')}
              >
                🔒 미등록 ({totalSpeciesCount - unlockedCount})
              </button>
              <button
                className={`pokedex-filter-chip ${pokedexFilter === 'shiny' ? 'active' : ''}`}
                onClick={() => setPokedexFilter('shiny')}
              >
                ✨ 이로치 ({pokedexList.filter(m => (gradStats.get(m.speciesId)?.shinyCount || 0) > 0).length})
              </button>
            </div>

            {/* 33종 도감 카드 그리드 */}
            <div className="pokedex-grid">
              {filteredPokedex.map(mon => {
                const stat = gradStats.get(mon.speciesId);
                const isUnlocked = !!stat;
                const hasShiny = (stat?.shinyCount || 0) > 0;
                const isHovered = pokedexHoverId === mon.speciesId;

                return (
                  <div
                    key={mon.speciesId}
                    className={`pokedex-card ${isUnlocked ? 'unlocked' : 'locked'} ${hasShiny ? 'has-shiny' : ''}`}
                    onMouseEnter={() => setPokedexHoverId(mon.speciesId)}
                    onMouseLeave={() => setPokedexHoverId(null)}
                  >
                    <div className="pokedex-card-header">
                      <span className="pokedex-id-no">#{String(mon.speciesId).padStart(3, '0')}</span>
                      {isUnlocked ? (
                        <span className="pokedex-grad-count-badge">🎓 {stat.count}회 졸업</span>
                      ) : (
                        <span className="pokedex-locked-label">🔒 미등록</span>
                      )}
                    </div>

                    <div className="pokedex-img-pod">
                      <img
                        src={isUnlocked ? (mon.showdownSprite || mon.sprite) : mon.sprite}
                        alt={isUnlocked ? mon.name : '미해금'}
                        className={`pokedex-sprite-img ${!isUnlocked ? 'silhouette-img' : ''}`}
                      />
                      {hasShiny && (
                        <span className="pokedex-shiny-ribbon">✨ SHINY</span>
                      )}
                    </div>

                    <div className="pokedex-card-footer">
                      <h4 className="pokedex-mon-name">
                        {isUnlocked ? mon.name : '???'}
                      </h4>
                      <div className="pokedex-types-row">
                        {isUnlocked ? (
                          mon.types.map(t => (
                            <span key={t} className={`type-tag ${t}`}>{t}</span>
                          ))
                        ) : (
                          <span className="type-tag locked-tag">미확인</span>
                        )}
                      </div>
                    </div>

                    {/* 호버 상세 정보 카드 */}
                    {isHovered && (
                      <div className="pokedex-hover-card">
                        {isUnlocked ? (
                          <div className="pokedex-hover-body">
                            <div className="hover-mon-name">
                              {mon.name} {hasShiny && '✨'}
                            </div>
                            <div className="hover-row grad-highlight">
                              🎓 <b>졸업 횟수: {stat.count}회</b>
                            </div>
                            {stat.shinyCount > 0 && (
                              <div className="hover-row shiny-highlight">
                                ✨ 이로치 졸업: <b>{stat.shinyCount}회</b>
                              </div>
                            )}
                            <div className="hover-row">
                              ⭐ 최고 레벨: <b>Lv.{stat.maxLevel}</b>
                            </div>
                            <div className="hover-row date">
                              📅 최초 졸업: {stat.firstDate}
                            </div>
                            {stat.nicknames.length > 0 && (
                              <div className="hover-row nicknames">
                                애칭: {stat.nicknames.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pokedex-hover-body locked">
                            <div className="hover-locked-title">🔒 미해금 포켓몬</div>
                            <p>
                              {isNeighbor
                                ? `[${ownerTitle}]님이 아직 졸업시키지 않은 포켓몬입니다.`
                                : '아직 졸업한 기록이 없습니다. Lv.36 달성 후 졸업식을 치르면 도감에 사진이 활성화됩니다!'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* 📜 졸업 증서 앨범 뷰 */
          <div className="pokedex-diplomas-view">
            {(graduatedList || []).length > 0 ? (
              <div className="diplomas-grid">
                {(graduatedList || []).map(dip => (
                  <div key={dip.id} className="diploma-card" onClick={() => setSelectedDiploma(dip)}>
                    <div className="diploma-cap-icon">🎓</div>
                    <img src={dip.sprite} alt={dip.name} className="diploma-sprite" />
                    <h4>{dip.nickname} {dip.isShiny && '✨'}</h4>
                    <span className="diploma-title">{dip.title}</span>
                    <span className="diploma-date">{dip.graduatedAt} 졸업</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-yard-card">
                <p>
                  {isNeighbor
                    ? `[${ownerTitle}]님이 아직 졸업시킨 포켓몬이 없습니다.`
                    : '아직 졸업한 포켓몬이 없습니다. 포켓몬을 끝까지 키워 멋진 졸업식을 치러보세요!'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderNeighborsView = () => (
    <div className="farm-social-layout">
      {/* 🏆 실시간 인기 포켓농장 TOP 3 (하트 랭킹 명예의 전당) */}
      <div className="sheet1-popular-farms-panel">
        <div className="sheet1-panel-header">
          <div className="sheet1-panel-header-left">
            <span className="sheet1-panel-icon">🏆</span>
            <div className="sheet1-panel-title-box">
              <h3>실시간 인기 포켓농장 TOP 3 (하트 랭킹)</h3>
              <p>전체 포켓농장 유저들의 1촌 응원 하트(💖) 실시간 명예의 전당</p>
            </div>
          </div>
          <button
            type="button"
            className="social-refresh-btn"
            onClick={() => {
              if (socket && socket.connected) {
                socket.emit('farm-get-list');
                socket.emit('farm-get-top3');
                if (farmState.ownerName) {
                  socket.emit('farm-load-my-data', { username: farmState.ownerName });
                }
              }
              const localFarms = getAllStoredFarms();
              setNeighborList(localFarms.filter(f => f.username !== farmState.ownerName));
              showAlert('🔄 이웃 농장 및 내 하트 랭킹을 최신 상태로 새로고침했습니다!', 'info');
            }}
            title="목록 새로고침"
          >
            🔄 새로고침
          </button>
        </div>

        {top3RealFarms.length > 0 ? (
          <div className="sheet1-top3-grid">
            {top3RealFarms.map((farm, idx) => {
              const rankNum = idx + 1;
              const crown = rankNum === 1 ? '🥇 1위' : rankNum === 2 ? '🥈 2위' : '🥉 3위';
              const pmon = farm.activePokemon;
              const isMyFarm = farm.username === farmState.ownerName;
              return (
                <div key={farm.username} className={`sheet1-farm-card rank-${rankNum} ${isMyFarm ? 'my-top-farm' : ''}`}>
                  <div className="sheet1-card-top-bar">
                    <span className="sheet1-rank-badge">{crown}</span>
                    <span className="sheet1-heart-pill">💖 {farm.heartsCount.toLocaleString()}개</span>
                  </div>

                  <div className="sheet1-farm-avatar-box">
                    {pmon ? (
                      <div className="sheet1-avatar-container">
                        {pmon.isShiny && <span className="sheet1-shiny-tag">✨ SHINY</span>}
                        <img
                          src={pmon.sprites.showdownFront || pmon.sprites.front}
                          alt={pmon.nickname || pmon.name}
                          className="sheet1-avatar-sprite"
                        />
                        <span className="sheet1-poke-level-badge">
                          Lv.{pmon.level} {pmon.nickname || pmon.name}
                        </span>
                      </div>
                    ) : (
                      <div className="sheet1-empty-avatar">🏡 포켓농장</div>
                    )}
                  </div>

                  <div className="sheet1-farm-info">
                    <div className="sheet1-farm-name" title={farm.farmName}>{farm.farmName}</div>
                    <div className="sheet1-farm-owner">
                      👤 농장주: <b>{farm.username}</b> {isMyFarm && <span className="my-farm-tag">✨ 내 농장</span>}
                    </div>
                    <div className="sheet1-farm-status-bubble">
                      💬 "{farm.statusMsg || '오늘도 포켓몬과 함께 즐거운 파밍 🎵'}"
                    </div>
                    <div className="sheet1-farm-stats">
                      <span className="stat-pill diplomas">🎓 {farm.graduatedCount}마리 졸업</span>
                    </div>
                  </div>

                  {isMyFarm ? (
                    <button
                      type="button"
                      className="sheet1-visit-btn my-farm-btn"
                      onClick={() => {
                        setVisitingFarm(null);
                        setActiveTab('minihome');
                        setMinihompyTab('home');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      🏡 내 미니홈피 관리 ➔
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="sheet1-visit-btn"
                      onClick={() => handleVisitNeighbor(farm.username)}
                      title={`${farm.farmName} 미니홈피 놀러가기`}
                    >
                      🚀 홈피 놀러가기 ➔
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="sheet1-empty-farms">
            <p>🌱 아직 등록된 이웃 농장이 없습니다. 친구에게 1촌 하트를 보내고 랭킹을 올려보세요!</p>
          </div>
        )}
      </div>

      {/* 전체 이웃 둘러보기 및 검색 */}
      <div className="neighbors-list-container">
        <div className="neighbors-header">
          <div className="neighbors-title-box">
            <h3>👥 전체 이웃 농장 파도타기 ({neighborList.length}명)</h3>
            <span className="neighbors-subtitle">다른 농장주의 미니홈피와 미니룸을 구경하고 응원 하트를 선물해보세요!</span>
          </div>
          <div className="neighbors-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={neighborSearch}
              onChange={e => setNeighborSearch(e.target.value)}
              placeholder="친구 닉네임 / 농장 이름 검색..."
            />
            {neighborSearch && (
              <button className="search-clear-btn" onClick={() => setNeighborSearch('')}>✕</button>
            )}
          </div>
        </div>

        <div className="neighbors-grid">
          {neighborList
            .filter(n => n.username.toLowerCase().includes(neighborSearch.toLowerCase()) || (n.farmName && n.farmName.toLowerCase().includes(neighborSearch.toLowerCase())))
            .map(neighbor => {
              const pmon = neighbor.activePokemon;
              return (
                <div key={neighbor.username} className="neighbor-card">
                  <div className="neighbor-avatar-box">
                    {pmon ? (
                      <div className="neighbor-avatar-wrapper">
                        {pmon.isShiny && <span className="neighbor-shiny-dot" title="이로치 포켓몬">✨</span>}
                        <img
                          src={pmon.sprites.showdownFront || pmon.sprites.front}
                          alt={pmon.nickname || pmon.name}
                          className="neighbor-sprite"
                        />
                      </div>
                    ) : (
                      <div className="neighbor-empty-sprite">🏡</div>
                    )}
                  </div>

                  <div className="neighbor-info">
                    <div className="neighbor-name-row">
                      <h4 className="neighbor-farm-title" title={neighbor.farmName}>{neighbor.farmName}</h4>
                    </div>
                    <div className="neighbor-owner-row">
                      <span className="neighbor-owner-badge">👤 {neighbor.username}</span>
                      {pmon && (
                        <span className="neighbor-poke-badge">
                          Lv.{pmon.level} {pmon.nickname || pmon.name}
                        </span>
                      )}
                    </div>
                    {neighbor.statusMsg && (
                      <p className="neighbor-status-text">"{neighbor.statusMsg}"</p>
                    )}
                    <div className="stats-badges">
                      <span className="stat-badge hearts">💖 {neighbor.heartsCount} 하트</span>
                      <span className="stat-badge diplomas">🎓 {neighbor.graduatedCount}마리</span>
                    </div>
                  </div>

                  <div className="neighbor-action-box">
                    <button
                      className="neighbor-visit-action-btn"
                      onClick={() => handleVisitNeighbor(neighbor.username)}
                      title={`${neighbor.farmName || neighbor.username} 미니홈피 놀러가기`}
                    >
                      놀러가기 ➔
                    </button>
                  </div>
                </div>
              );
            })}

          {neighborList.length === 0 && (
            <div className="empty-yard-card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>👥</div>
              <h4>아직 등록된 다른 이웃 농장이 없습니다</h4>
              <p>친구들을 포켓농장으로 초대하여 함께 서로의 미니홈피를 방문해 보세요!</p>
            </div>
          )}
        </div>

        {/* 내 방명록 모아보기 */}
        <div className="my-guestbook-box">
          <div className="my-gb-header">
            <h4>📬 내 농장에 도착한 최근 방명록 ({farmState.guestbook.length}건)</h4>
            <span className="my-gb-subtitle">이웃들이 남겨준 따뜻한 응원의 한마디입니다.</span>
          </div>
          {farmState.guestbook.length > 0 ? (
            <div className="guestbook-entries-list">
              {farmState.guestbook.map(entry => (
                <div key={entry.id} className="guestbook-item">
                  <div className="gb-author">
                    <strong>👤 {entry.author}</strong>
                    <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="gb-message">{entry.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gb-empty-placeholder">
              <p>아직 방명록이 비어있습니다. 이웃 농장에 먼저 방명록을 남겨 1촌을 맺어보세요! ✨</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="poke-farm-container dubu-modern-theme">
      {/* 📋 Farm Header & Navigation */}
      <div className="farm-header">
        <div className="farm-title-box">
          <span className="farm-logo">🏡</span>
          <div>
            <h2>{farmState.farmName}</h2>
            <span className="farm-sub">농장주: <strong>{farmState.ownerName}</strong> | 포켓농장 라이프</span>
          </div>
        </div>

        <div className="farm-kpi-bar">
          <span className="kpi-chip coins">🪙 {farmState.coins.toLocaleString()} P</span>
          <span className="kpi-chip hearts">💖 {farmState.heartsCount} 하트</span>
          <span className="kpi-chip diplomas">🎓 {farmState.graduatedPokemon.length}마리 졸업</span>
          <button
            type="button"
            onClick={() => {
              setShowChangePasswordModal(true);
              setOldPassword('');
              setNewPassword('');
              setNewPasswordConfirm('');
              setChangePasswordError('');
            }}
            className="excel-btn farm-auth-btn"
            title="농장 비밀번호 변경"
          >
            🔒 비밀번호 변경
          </button>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="excel-btn farm-auth-btn logout"
            title="농장 로그아웃 및 계정 전환"
          >
            🚪 로그아웃
          </button>
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close" style={{ marginLeft: 6 }}>
              🏠 메인으로
            </button>
          )}
        </div>
      </div>

      {/* 🧭 Farm Navigation Tabs Bar */}
      <div className="farm-nav-tabs-container">
        {canScrollLeft && (
          <button
            type="button"
            className="nav-scroll-btn left"
            onClick={() => handleScrollNav('left')}
            aria-label="왼쪽 탭으로 스크롤"
            title="왼쪽 탭으로 이동"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <nav
          ref={navTabsRef}
          className={`farm-nav-tabs ${isDraggingTabs ? 'is-dragging' : ''}`}
          onWheel={handleNavWheel}
          onMouseDown={handleTabsMouseDown}
          onMouseMove={handleTabsMouseMove}
          onMouseUp={handleTabsMouseUpOrLeave}
          onMouseLeave={handleTabsMouseUpOrLeave}
          onScroll={checkNavScroll}
        >
          <button className={`farm-tab ${activeTab === 'minihome' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('minihome'); setVisitingFarm(null); })}>
            🏠 두부 미니홈피 (Minihp)
          </button>
          <button className={`farm-tab ${activeTab === 'yard' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('yard'); setVisitingFarm(null); })}>
            🌿 내 농장 마당 (Farm)
          </button>
          <button className={`farm-tab ${activeTab === 'adopt' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('adopt'); setVisitingFarm(null); })}>
            🐣 분양소 (Adopt)
          </button>
          <button className={`farm-tab ${activeTab === 'evolve' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('evolve'); setVisitingFarm(null); })}>
            ✨ 진화의 방 (Evolve)
          </button>
          <button className={`farm-tab ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('jobs'); setVisitingFarm(null); })}>
            💼 아르바이트 (Jobs)
          </button>
          <button className={`farm-tab ${activeTab === 'expedition' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('expedition'); setVisitingFarm(null); })}>
            🌲 사내 탐험 (Expedition)
          </button>
          <button className={`farm-tab ${activeTab === 'daycare' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('daycare'); setVisitingFarm(null); })}>
            🥚 알 부화소 (Daycare)
          </button>
          <button className={`farm-tab ${activeTab === 'lottery' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('lottery'); setVisitingFarm(null); })}>
            🎰 행운 복권 (Lottery)
          </button>
          <button className={`farm-tab ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('shop'); setVisitingFarm(null); })}>
            🛍️ 상점 (Shop)
          </button>
          <button className={`farm-tab ${activeTab === 'diplomas' ? 'active' : ''}`} onClick={() => handleTabClick(() => { setActiveTab('diplomas'); setVisitingFarm(null); })}>
            📖 도감 & 졸업 (Pokedex)
          </button>
        </nav>

        {canScrollRight && (
          <button
            type="button"
            className="nav-scroll-btn right"
            onClick={() => handleScrollNav('right')}
            aria-label="오른쪽 탭으로 스크롤"
            title="오른쪽 탭으로 이동"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* ⚠️ Action Toast Alert */}
      {actionAlert && (
        <div className={`farm-toast-alert ${actionAlert.type}`}>
          {actionAlert.text}
        </div>
      )}

      {/* 📱 Main Tab Workspace */}
      <div className="farm-workspace-body">
        {/* =========================================================================
            TAB 0: ⛺ 두부월드 미니홈피 (Mini-homepage)
           ========================================================================= */}
        {(activeTab === 'minihome' || visitingFarm) && (
          <div className="dubuworld-minihompy-wrapper">
            {/* 🌐 상단 미니홈피 타이틀 바 */}
            <div className="dubuworld-top-browser-bar">
              <div className="dubuworld-header-title-box">
                <span className="dubuworld-title-icon">⛺</span>
                <h3 className="dubuworld-title-text">{displayFarmName}</h3>
                <span className="dubuworld-owner-tag">by {displayOwnerName}</span>
              </div>
              <div className="dubuworld-header-actions">
                <span className="dubuworld-visitor-counter">
                  <span className="today-badge">TODAY <b>{currentTodayCount}</b></span>
                  <span className="total-badge">TOTAL <b>{currentTotalCount.toLocaleString()}</b></span>
                </span>
                {visitingFarm && (
                  <button
                    className="excel-btn primary"
                    onClick={() => setVisitingFarm(null)}
                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                  >
                    🔙 내 미니홈피로 돌아가기
                  </button>
                )}
              </div>
            </div>

            {/* 🖼️ 미니홈피 메인 2단 프레임 */}
            <div className="dubuworld-main-frame">
              {/* ⬅️ 좌측 프로필 & 1촌 컬럼 */}
              <div className="dubuworld-profile-col">
                <div className="dubuworld-card profile-card">
                  {/* 방문자 수 카운터 */}
                  <div className="profile-today-bar">
                    <span className="today-label">TODAY</span>
                    <span className="today-val">{currentTodayCount}</span>
                    <span className="total-divider">|</span>
                    <span className="total-label">TOTAL</span>
                    <span className="total-val">{currentTotalCount.toLocaleString()}</span>
                  </div>

                  {/* 아바타 프로필 액자 (현재 메인 포켓몬) */}
                  <div className="dubuworld-photo-frame">
                    {displayActivePokemon ? (
                      <div className="profile-poke-avatar">
                        <img
                          src={displayActivePokemon.sprites.showdownFront || displayActivePokemon.sprites.front}
                          alt={displayActivePokemon.name}
                          className="profile-sprite"
                        />
                        <span className="profile-poke-badge">
                          Lv.{displayActivePokemon.level} {displayActivePokemon.nickname || displayActivePokemon.name}
                        </span>
                      </div>
                    ) : (
                      <div className="empty-avatar">🏡 포켓농장</div>
                    )}
                  </div>

                  {/* 프로필 상태 메시지 */}
                  <div className="dubuworld-status-box">
                    <div className="status-header">
                      <span>💬 Today Status</span>
                      {!visitingFarm && (
                        <button
                          className="dubuworld-icon-btn"
                          onClick={() => {
                            const newMsg = prompt('투데이 상태 메시지를 입력하세요:', currentStatusMsg);
                            if (newMsg !== null) {
                              setFarmState(prev => ({ ...prev, statusMsg: newMsg }));
                            }
                          }}
                          title="상태 메시지 수정"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                    <p className="status-msg-text">"{currentStatusMsg}"</p>
                  </div>

                  {/* 농장주 상세 정보 */}
                  <div className="profile-details-list">
                    <div className="detail-item">
                      <span>👤 농장주:</span> <b>{displayOwnerName}</b>
                    </div>
                    <div className="detail-item">
                      <span>🏡 농장명:</span> <b>{displayFarmName}</b>
                      {!visitingFarm && (
                        <button
                          className="dubuworld-icon-btn"
                          style={{ marginLeft: '6px', fontSize: '0.75rem', padding: '1px 4px' }}
                          onClick={() => {
                            const newFarmName = prompt('새로운 농장 이름을 입력하세요 (최대 100자):', farmState.farmName);
                            if (newFarmName && newFarmName.trim()) {
                              setFarmState(prev => ({ ...prev, farmName: newFarmName.trim().slice(0, 100) }));
                            }
                          }}
                          title="농장 이름 수정"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                    <div
                      className="detail-item clickable-diploma"
                      onClick={() => setMinihompyTab('pokedex')}
                      title="클릭하여 완성 도감 구경하기"
                    >
                      <span>🎓 총 졸업:</span> <b>{displayGraduatedCount}마리 ➔</b>
                    </div>
                    <div className="detail-item hearts">
                      <span>💖 1촌 하트:</span> <b className="heart-num">{displayHeartsCount}개</b>
                    </div>
                  </div>

                  {/* 1촌 응원 하트 버튼 (하루 5회 제한, 자기 자신 금지, 보답 코인) */}
                  {(!visitingFarm || visitingFarm.owner === farmState.ownerName) ? (
                    <button
                      className="dubuworld-heart-btn own-farm"
                      disabled
                      title="자신의 농장에는 하트를 보낼 수 없습니다. 이웃 농장을 방문해 응원해 보세요!"
                    >
                      💖 내 농장 1촌 하트 ({displayHeartsCount}개)
                    </button>
                  ) : (
                    <button
                      className="dubuworld-heart-btn"
                      onClick={handleSendHeartToCurrentFarm}
                      disabled={todayHeartsSent >= 5}
                      title={todayHeartsSent >= 5 ? '오늘 보낼 수 있는 하트 5회를 모두 사용하셨습니다.' : `이웃에게 하트를 선물하고 20코인을 받습니다. (남은 횟수: ${5 - todayHeartsSent}/5회)`}
                    >
                      {todayHeartsSent >= 5
                        ? '💖 오늘 하트 완료 (0/5회 남음)'
                        : `💖 1촌 응원 하트 선물하기! (${5 - todayHeartsSent}/5회 남음)`}
                    </button>
                  )}
                </div>
              </div>

              {/* ➡️ 우측 콘텐츠 & 두부월드 서브탭 컬럼 */}
              <div className="dubuworld-content-col">
                <div className="dubuworld-card content-card">
                  {/* 서브탭 바 */}
                  <div className="dubuworld-subtabs">
                    <button
                      className={`cytab ${minihompyTab === 'home' ? 'active' : ''}`}
                      onClick={() => setMinihompyTab('home')}
                    >
                      🏠 홈 (Home)
                    </button>
                    <button
                      className={`cytab ${minihompyTab === 'miniroom' ? 'active' : ''}`}
                      onClick={() => setMinihompyTab('miniroom')}
                    >
                      🖼️ 미니룸 (Miniroom)
                    </button>
                    <button
                      className={`cytab ${minihompyTab === 'pokedex' ? 'active' : ''}`}
                      onClick={() => setMinihompyTab('pokedex')}
                    >
                      📖 {visitingFarm ? `${displayOwnerName}의 도감` : '완성 도감'} ({displayGraduatedCount})
                    </button>
                    <button
                      className={`cytab ${minihompyTab === 'guestbook' ? 'active' : ''}`}
                      onClick={() => setMinihompyTab('guestbook')}
                    >
                      📝 방명록 ({displayGuestbook.length})
                    </button>
                    {!visitingFarm && (
                      <button
                        className={`cytab ${minihompyTab === 'stickers' ? 'active' : ''}`}
                        onClick={() => setMinihompyTab('stickers')}
                      >
                        🎨 스티커 꾸미기
                      </button>
                    )}
                    <button
                      className={`cytab neighbors-tab ${minihompyTab === 'neighbors' ? 'active' : ''}`}
                      onClick={() => {
                        setMinihompyTab('neighbors');
                        refreshNeighbors();
                      }}
                    >
                      ✨ 👥 이웃 파도타기
                    </button>
                  </div>

                  {/* 1. 홈 뷰 */}
                  {minihompyTab === 'home' && (
                    <div className="cytab-content home-view">
                      <div className="dubuworld-welcome-banner">
                        <h3>✨ Welcome to {displayFarmName}! ✨</h3>
                        <p>정성껏 키운 포켓몬들과 자랑스러운 졸업생들이 함께 어우러지는 두부월드 감성 미니홈피입니다.</p>
                      </div>

                      {/* 미니룸 프리뷰 (꾸미기 모드와 100% 동일한 1:1 크기 & 비율) */}
                      <div className="miniroom-preview-box" onClick={() => setMinihompyTab('stickers')}>
                        <div className="preview-label">🖼️ 클릭하여 스티커 & 방 꾸미기 ➔</div>
                        {renderMiniroomCanvas({ compact: false })}
                      </div>

                      {/* 📖 포켓몬 졸업 도감 바로가기 프리뷰 위젯 */}
                      <div className="pokedex-home-preview-widget" onClick={() => setMinihompyTab('pokedex')}>
                        <div className="pokedex-preview-header">
                          <div className="pokedex-preview-title">
                            <span className="pokedex-preview-icon">📖</span>
                            <div>
                              <strong>{visitingFarm ? `[${displayOwnerName}]님의 포켓몬 완성 도감` : '내 포켓농장 공식 졸업 도감'}</strong>
                              <span>총 {displayGraduatedCount}마리 졸업 완성 • 도감 및 증서 앨범 구경하기 ➔</span>
                            </div>
                          </div>
                          <span className="pokedex-go-btn">도감 열기 ➔</span>
                        </div>
                      </div>

                      {/* 최근 방명록 프리뷰 */}
                      <div className="recent-guestbook-widget">
                        <div className="section-title">
                          <h4>📬 최근 방명록 ({displayGuestbook.length})</h4>
                          <button className="dubuworld-link-btn" onClick={() => setMinihompyTab('guestbook')}>
                            방명록 쓰러가기 ➔
                          </button>
                        </div>
                        <div className="recent-gb-list">
                          {displayGuestbook.slice(0, 3).map(entry => (
                            <div key={entry.id} className="recent-gb-item">
                              <span className="gb-author-tag">👤 <b>{entry.author}</b></span>
                              <span className="gb-msg-preview">{entry.message}</span>
                              <span className="gb-date">{new Date(entry.timestamp).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. 미니룸 뷰 */}
                  {minihompyTab === 'miniroom' && (
                    <div className="cytab-content miniroom-view">
                      <div className="miniroom-toolbar">
                        <div className="bg-select-group">
                          <span>🎨 배경선택:</span>
                          {[
                            { key: 'classic', label: '🏠 클래식 우드룸' },
                            { key: 'pixel', label: '🌿 픽셀 팜 가든' },
                            { key: 'starry', label: '🌌 별빛 오로라 룸' },
                            { key: 'beach', label: '🏖️ 트로피컬 해변' },
                            { key: 'sakura', label: '🌸 벚꽃 블라썸' },
                            { key: 'center', label: '🏥 포켓몬 센터' },
                            { key: 'attic_cafe', label: '☕ 다락방 홈카페' },
                            { key: 'neon_arcade', label: '🎮 네온 게이밍룸' },
                            { key: 'luxury_penthouse', label: '🏰 로열 펜트하우스' },
                            { key: 'forest_camp', label: '⛺ 낭만 캠핑장' }
                          ].map(bg => (
                            <button
                              key={bg.key}
                              className={`bg-tab-btn ${currentBgTheme === bg.key ? 'active' : ''}`}
                              onClick={() => {
                                if (!visitingFarm) {
                                  setFarmState(prev => ({ ...prev, bgTheme: bg.key }));
                                }
                              }}
                            >
                              {bg.label}
                            </button>
                          ))}
                        </div>
                        <button
                          className="excel-btn"
                          onClick={() => setMinihompyTab('stickers')}
                        >
                          ✨ 스티커 붙이기
                        </button>
                      </div>

                      {renderMiniroomCanvas({ compact: false })}
                    </div>
                  )}

                  {/* 3. 📖 포켓몬 완성 도감 뷰 (내 도감 또는 이웃이 완성한 도감) */}
                  {minihompyTab === 'pokedex' && (
                    <div className="cytab-content pokedex-view">
                      {renderPokedexContent(displayGraduatedPokemons, displayOwnerName, !!visitingFarm)}
                    </div>
                  )}

                  {/* 3. 방명록 뷰 */}
                  {minihompyTab === 'guestbook' && (
                    <div className="cytab-content guestbook-view">
                      <div className="guestbook-input-card">
                        <h4>✍️ 방명록 작성하기</h4>
                        <div className="gb-input-row">
                          <input
                            type="text"
                            className="dubuworld-input"
                            value={guestbookInput}
                            onChange={e => setGuestbookInput(e.target.value)}
                            placeholder={`${displayOwnerName}님의 미니홈피에 따뜻한 응원의 한마디를 남겨보세요! ✨`}
                            onKeyDown={e => e.key === 'Enter' && handleAddGuestbookEntry()}
                          />
                          <button
                            className="dubuworld-btn primary"
                            onClick={handleAddGuestbookEntry}
                          >
                            📝 남기기
                          </button>
                        </div>
                      </div>

                      <div className="guestbook-full-list">
                        {displayGuestbook.map(entry => (
                          <div key={entry.id} className="dubuworld-gb-card">
                            <div className="gb-card-header">
                              <div className="gb-user-info">
                                <span className="gb-avatar">👤</span>
                                <strong>{entry.author}</strong>
                                <span className="gb-time">{new Date(entry.timestamp).toLocaleString()}</span>
                              </div>
                              {(!visitingFarm || entry.author === farmState.ownerName) && (
                                <button
                                  className="gb-delete-btn"
                                  onClick={() => handleDeleteGuestbookEntry(entry.id)}
                                  title="방명록 삭제"
                                >
                                  🗑️ 삭제
                                </button>
                              )}
                            </div>
                            <div className="gb-card-body">
                              {entry.message}
                            </div>
                          </div>
                        ))}

                        {displayGuestbook.length === 0 && (
                          <div className="empty-gb-box">
                            <p>아직 방명록이 없습니다. 첫 번째 응원의 메시지를 남겨보세요! 💌</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. 스티커 & 자유 꾸미기 뷰 */}
                  {minihompyTab === 'stickers' && (
                    <div className="cytab-content stickers-view">
                      <div className="sticker-shop-header">
                        <h4>🎨 두부월드 미니룸 데코레이션 스튜디오</h4>
                        <p>스티커 부착, 자유 텍스트/말풍선 작성, 포켓몬 위치 및 방향을 다채롭게 꾸며보세요!</p>
                      </div>

                      {/* 🖼️ 실시간 미니룸 캔버스 (홈 화면과 1:1 완벽 일치하는 360px 크기) */}
                      {renderMiniroomCanvas({ compact: false })}

                      {/* 🌟 데코레이션 서브모드 탭 */}
                      <div className="decor-submode-tabs">
                        <button
                          className={`decor-subtab ${decorSubtab === 'palette' ? 'active' : ''}`}
                          onClick={() => setDecorSubtab('palette')}
                        >
                          🎨 가구 & 소품 팔레트 (90+)
                        </button>
                        <button
                          className={`decor-subtab ${decorSubtab === 'skilleffects' ? 'active' : ''}`}
                          onClick={() => setDecorSubtab('skilleffects')}
                        >
                          💥 고유스킬 이펙트샵 (12종)
                        </button>
                        <button
                          className={`decor-subtab ${decorSubtab === 'textmaker' ? 'active' : ''}`}
                          onClick={() => setDecorSubtab('textmaker')}
                        >
                          ✍️ 자유 텍스트 & 말풍선 쓰기
                        </button>
                        <button
                          className={`decor-subtab ${decorSubtab === 'pokeplacements' ? 'active' : ''}`}
                          onClick={() => setDecorSubtab('pokeplacements')}
                        >
                          🐾 포켓몬 배치 & 연출
                        </button>
                      </div>

                      {/* 서브모드: 💥 포켓몬 고유스킬 이펙트 샵 */}
                      {decorSubtab === 'skilleffects' && (
                        <div className="decor-skilleffects-panel">
                          <div className="skilleffects-banner">
                            <div className="skilleffects-header-text">
                              <h4>💥 포켓몬 고유스킬 이펙트 컬렉션</h4>
                              <p>포켓몬의 화려한 시그니처 필살기 이펙트를 코인으로 구매하여 미니룸에 자유롭게 장착해보세요!</p>
                            </div>
                            <div className="skilleffects-coin-badge">
                              🪙 보유 코인: <b>{farmState.coins} P</b>
                            </div>
                          </div>

                          <div className="skilleffects-grid">
                            {POKEMON_SKILL_EFFECTS.map(fx => (
                              <div key={fx.id} className="skill-fx-card">
                                <div className="skill-fx-preview-box" style={{ background: `radial-gradient(circle, ${fx.previewColor}33 0%, rgba(15,23,42,0.8) 80%)` }}>
                                  <div className={`skill-fx-display preview-mini ${fx.fxClass}`}>
                                    {renderSkillStreamFx(fx.fxClass, fx.icon)}
                                  </div>
                                </div>
                                <div className="skill-fx-card-info">
                                  <div className="skill-fx-title-row">
                                    <span className="skill-fx-name">{fx.name}</span>
                                    <span className="skill-fx-tag">{fx.pokemonName}</span>
                                  </div>
                                  <p className="skill-fx-desc">{fx.description}</p>
                                  <button
                                    className="excel-btn primary skill-fx-buy-btn"
                                    onClick={() => handleAddSkillEffect(fx)}
                                  >
                                    🪙 {fx.price}P 로 구매 & 배치
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 서브모드 1: 스티커 & 가구 팔레트 */}
                      {decorSubtab === 'palette' && (
                        <div className="decor-palette-panel">
                          {/* 🔍 스티커 검색창 */}
                          <div className="decor-search-row">
                            <div className="decor-search-input-wrap">
                              <span className="search-icon">🔍</span>
                              <input
                                type="text"
                                className="dubuworld-input decor-search-input"
                                value={stickerSearch}
                                onChange={e => setStickerSearch(e.target.value)}
                                placeholder="가구 / 소품 / 굿즈 이름 검색 (예: 소파, 침대, PC, 커피, 화분, 트로피...)"
                              />
                              {stickerSearch && (
                                <button className="clear-search-btn" onClick={() => setStickerSearch('')}>✕</button>
                              )}
                            </div>
                          </div>

                          {/* 카테고리 필터 바 */}
                          <div className="decor-category-filters">
                            {[
                              { key: 'all', label: '🌟 전체 (90+)' },
                              { key: 'living', label: '🛋️ 거실 & 가구' },
                              { key: 'bedroom', label: '🛏️ 침실 & 휴식' },
                              { key: 'gaming', label: '💻 서재 & PC방' },
                              { key: 'kitchen', label: '☕ 키친 & 카페' },
                              { key: 'garden', label: '🌿 가든 & 캠핑' },
                              { key: 'pokemon', label: '🏆 포켓몬 & 굿즈' },
                              { key: 'emotional', label: '💖 감성 & 파티' },
                              { key: 'emoji', label: '💬 이모지' }
                            ].map(cat => (
                              <button
                                key={cat.key}
                                className={`cat-filter-chip ${stickerCategory === cat.key ? 'active' : ''}`}
                                onClick={() => setStickerCategory(cat.key as any)}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>

                          <div className="sticker-palette-grid">
                            {DIVERSE_STICKERS
                              .filter(stk => {
                                const matchesCat = stickerCategory === 'all' || stk.category === stickerCategory;
                                const query = stickerSearch.trim().toLowerCase();
                                const matchesQuery = !query || stk.label.toLowerCase().includes(query) || stk.icon.includes(query);
                                return matchesCat && matchesQuery;
                              })
                              .map(stk => (
                                <button
                                  key={stk.id}
                                  className="sticker-palette-item"
                                  onClick={() => handleAddSticker(stk.id, stk.icon, stk.label)}
                                  title={`${stk.label} 붙이기`}
                                >
                                  <span className="stk-icon">{stk.icon}</span>
                                  <span className="stk-label">{stk.label}</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* 서브모드 2: 자유 텍스트 & 말풍선 제작 */}
                      {decorSubtab === 'textmaker' && (
                        <div className="text-maker-panel">
                          <div className="maker-form-box">
                            <div className="maker-form-header">
                              <h4>✍️ 나만의 문구 / 말풍선 / 푯말 만들기</h4>
                              <p>원하는 메시지를 입력하고 스타일을 선택하여 미니룸에 붙여보세요!</p>
                            </div>

                            <div className="maker-input-row">
                              <label>💬 텍스트 내용 (최대 40자):</label>
                              <input
                                type="text"
                                className="dubuworld-input"
                                value={customTextContent}
                                onChange={e => setCustomTextContent(e.target.value)}
                                placeholder="예: 우리 꼬부기 오늘 30렙 달성! 1촌 환영해요 🎵"
                                maxLength={40}
                              />
                            </div>

                            <div className="maker-presets-row">
                              <label>🎨 스타일 테마 선택:</label>
                              <div className="presets-options-grid">
                                {[
                                  { key: 'classic_bubble', label: '💬 클래식 말풍선', desc: '싸이월드 감성 화이트 버블' },
                                  { key: 'retro_sign', label: '🏷️ 우드 표지판', desc: '따뜻한 나무 팻말 명판' },
                                  { key: 'neon_glow', label: '🔮 네온 사이버', desc: '빛나는 사이버 글로우' },
                                  { key: 'pink_ribbon', label: '🎀 러블리 핑크', desc: '파스텔 핑크 배너' },
                                  { key: 'gold_badge', label: '🌟 골드 챔피언', desc: '황금 명예 뱃지' },
                                  { key: 'plain_text', label: '📝 심플 투명 글자', desc: '배경 없이 선명한 폰트' }
                                ].map(pre => (
                                  <button
                                    key={pre.key}
                                    className={`preset-select-card ${customTextStyle === pre.key ? 'active' : ''}`}
                                    onClick={() => setCustomTextStyle(pre.key as any)}
                                  >
                                    <b>{pre.label}</b>
                                    <span>{pre.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="maker-details-row">
                              <div className="detail-col">
                                <label>🎨 글자 색상:</label>
                                <div className="color-swatches">
                                  {['#1e293b', '#ffffff', '#dc2626', '#db2777', '#d97706', '#059669', '#2563eb', '#7c3aed'].map(c => (
                                    <button
                                      key={c}
                                      className={`color-swatch ${customTextColor === c ? 'active' : ''}`}
                                      style={{ background: c }}
                                      onClick={() => setCustomTextColor(c)}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className="detail-col">
                                <label>📏 글자 크기:</label>
                                <div className="fontsize-buttons">
                                  {[
                                    { size: 12, label: '작게 (12px)' },
                                    { size: 14, label: '보통 (14px)' },
                                    { size: 18, label: '크게 (18px)' },
                                    { size: 22, label: '특대 (22px)' }
                                  ].map(f => (
                                    <button
                                      key={f.size}
                                      className={`font-size-btn ${customFontSize === f.size ? 'active' : ''}`}
                                      onClick={() => setCustomFontSize(f.size)}
                                    >
                                      {f.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 실시간 미리보기 */}
                            <div className="maker-preview-box">
                              <span className="preview-label">실시간 미리보기:</span>
                              <div className="preview-canvas-sub">
                                <div
                                  className={`custom-decor-text style-${customTextStyle}`}
                                  style={{
                                    color: customTextColor,
                                    fontSize: `${customFontSize}px`
                                  }}
                                >
                                  {customTextContent.trim() || '미리보기 텍스트입니다 ✨'}
                                </div>
                              </div>
                            </div>

                            <button
                              className="dubuworld-btn primary large-btn"
                              onClick={handleAddCustomTextSticker}
                            >
                              ✨ 미니룸에 붙이고 꾸미기 ➔
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 서브모드 3: 포켓몬 위치 & 방향 관리 */}
                      {decorSubtab === 'pokeplacements' && (
                        <div className="poke-placements-panel">
                          <div className="placements-header">
                            <h4>🐾 미니룸 포켓몬 연출 및 위치 관리</h4>
                            <p>포켓몬을 미니룸 캔버스에서 마우스/터치로 직접 드래그하여 자유롭게 배치할 수 있습니다!</p>
                          </div>

                          <div className="poke-placements-list">
                            {/* 대표 포켓몬 */}
                            {displayActivePokemon && (() => {
                              const place = getPokemonPlacement('active', 45, 52, 1, false, 0, 0, 0);
                              const { isBack, visualRotateY } = computePokemonVisualAngle(place.tiltY || 0);
                              const thumbSprite = getPokemonSpriteUrl(displayActivePokemon.speciesId, {
                                isShiny: displayActivePokemon.isShiny,
                                isBack: isBack,
                                animated: false
                              });

                              return (
                                <div className="poke-placement-card">
                                  <div className="placement-card-top">
                                    <div className="poke-thumb">
                                      <img
                                        src={thumbSprite}
                                        alt={displayActivePokemon.name}
                                        style={{
                                          transform: `${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${visualRotateY}deg)`,
                                          transition: 'transform 0.15s ease'
                                        }}
                                      />
                                      <div className="thumb-info">
                                        <strong>대표: {displayActivePokemon.nickname || displayActivePokemon.name}</strong>
                                        <span>Lv.{displayActivePokemon.level} (크기: {Math.round((place.scale || 1) * 100)}%)</span>
                                      </div>
                                    </div>
                                    <div className="poke-controls-row">
                                      <button className="excel-btn" onClick={() => handleFlipPokemon('active')}>🔄 좌우반전</button>
                                      <button className="excel-btn" onClick={() => handleScalePokemon('active', 0.1)}>➕ 확대</button>
                                      <button className="excel-btn" onClick={() => handleScalePokemon('active', -0.1)}>➖ 축소</button>
                                      <button className="excel-btn" onClick={() => handleResetPokemonPlacement('active')}>📍 초기화</button>
                                    </div>
                                  </div>
                                  <div className="poke-angles-row">
                                    <div className="angle-control-unit">
                                      <span>🔄 시선/방향 (3D 턴):</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        step="2"
                                        value={place.tiltY || 0}
                                        onChange={e => handleSetPokemonTiltY('active', Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.tiltY || 0}°</b>
                                    </div>
                                    <div className="angle-control-unit">
                                      <span>🔄 평면 회전:</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={place.rotation || 0}
                                        onChange={e => handleSetPokemonRotation('active', Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.rotation || 0}°</b>
                                    </div>
                                    <div className="angle-control-unit">
                                      <span>📐 상하 눕힘:</span>
                                      <input
                                        type="range"
                                        min="-60"
                                        max="60"
                                        step="2"
                                        value={place.tiltX || 0}
                                        onChange={e => handleSetPokemonTiltX('active', Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.tiltX || 0}°</b>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 보육소 포켓몬들 */}
                            {displayReservePokemons.map((mon, idx) => {
                              const id = `res_${mon.uid || idx}`;
                              const place = getPokemonPlacement(id, idx === 0 ? 20 : idx === 1 ? 70 : 82, idx === 0 ? 58 : idx === 1 ? 58 : 48, 0.9, idx !== 0, 0, 0, 0);
                              const { isBack, visualRotateY } = computePokemonVisualAngle(place.tiltY || 0);
                              const thumbSprite = getPokemonSpriteUrl(mon.speciesId, {
                                isShiny: mon.isShiny,
                                isBack: isBack,
                                animated: false
                              });

                              return (
                                <div key={mon.uid || idx} className="poke-placement-card">
                                  <div className="placement-card-top">
                                    <div className="poke-thumb">
                                      <img
                                        src={thumbSprite}
                                        alt={mon.name}
                                        style={{
                                          transform: `${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${visualRotateY}deg)`,
                                          transition: 'transform 0.15s ease'
                                        }}
                                      />
                                      <div className="thumb-info">
                                        <strong>보육소: {mon.nickname || mon.name}</strong>
                                        <span>Lv.{mon.level}</span>
                                      </div>
                                    </div>
                                    <div className="poke-controls-row">
                                      <button className="excel-btn" onClick={() => handleFlipPokemon(id)}>🔄 좌우반전</button>
                                      <button className="excel-btn" onClick={() => handleScalePokemon(id, 0.1)}>➕ 확대</button>
                                      <button className="excel-btn" onClick={() => handleScalePokemon(id, -0.1)}>➖ 축소</button>
                                      <button className="excel-btn" onClick={() => handleResetPokemonPlacement(id)}>📍 초기화</button>
                                    </div>
                                  </div>
                                  <div className="poke-angles-row">
                                    <div className="angle-control-unit">
                                      <span>🔄 시선/방향 (3D 턴):</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        step="2"
                                        value={place.tiltY || 0}
                                        onChange={e => handleSetPokemonTiltY(id, Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.tiltY || 0}°</b>
                                    </div>
                                    <div className="angle-control-unit">
                                      <span>🔄 평면 회전:</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={place.rotation || 0}
                                        onChange={e => handleSetPokemonRotation(id, Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.rotation || 0}°</b>
                                    </div>
                                    <div className="angle-control-unit">
                                      <span>📐 상하 눕힘:</span>
                                      <input
                                        type="range"
                                        min="-60"
                                        max="60"
                                        step="2"
                                        value={place.tiltX || 0}
                                        onChange={e => handleSetPokemonTiltX(id, Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.tiltX || 0}°</b>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* 졸업생 포켓몬들 (진화단계별 폼 변경 지원) */}
                            {displayGraduatedPokemons.map((dip, idx) => {
                              const id = `grad_${dip.id || idx}`;
                              const place = getPokemonPlacement(id, idx === 0 ? 12 : idx === 1 ? 26 : idx === 2 ? 72 : 86, idx === 0 ? 32 : idx === 1 ? 22 : idx === 2 ? 22 : 32, 0.85, idx >= 2, 0, 0, 0);
                              const chain = getEvolutionChainForDiploma(dip);
                              const { isBack, visualRotateY } = computePokemonVisualAngle(place.tiltY || 0);
                              const activeForm = getDiplomaActiveSprite(dip, isBack);

                              return (
                                <div key={dip.id || idx} className="poke-placement-card">
                                  <div className="placement-card-top">
                                    <div className="poke-thumb">
                                      <img
                                        src={activeForm.sprite}
                                        alt={activeForm.name}
                                        style={{
                                          transform: `${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${visualRotateY}deg)`,
                                          transition: 'transform 0.15s ease'
                                        }}
                                      />
                                      <div className="thumb-info">
                                        <strong>🎓 졸업: {dip.nickname || dip.name}</strong>
                                        <span>외형: <b>{activeForm.name}</b></span>
                                      </div>
                                    </div>
                                    <div className="poke-controls-row">
                                      <button className="excel-btn" onClick={() => handleFlipPokemon(id)}>🔄 좌우반전</button>
                                      <button className="excel-btn" onClick={() => handleScalePokemon(id, 0.1)}>➕ 확대</button>
                                      <button className="excel-btn" onClick={() => handleScalePokemon(id, -0.1)}>➖ 축소</button>
                                      <button className="excel-btn" onClick={() => handleResetPokemonPlacement(id)}>📍 초기화</button>
                                    </div>
                                  </div>

                                  {/* 🌱 진화 전/후 외형 선택 버튼 그룹 */}
                                  {chain.length > 1 && (
                                    <div className="form-evolution-bar">
                                      <span className="form-select-label">🌱 미니룸 표시 외형:</span>
                                      <div className="form-badges-wrap">
                                        {chain.map((stage, sIdx) => {
                                          const isSelected = activeForm.formIndex === sIdx;
                                          return (
                                            <button
                                              key={stage.id || sIdx}
                                              className={`form-stage-btn ${isSelected ? 'active' : ''}`}
                                              onClick={() => handleSetDiplomaForm(dip.id, sIdx)}
                                              title={`${stage.name} 모습으로 변경`}
                                            >
                                              <img src={stage.sprite} alt={stage.name} className="stage-mini-img" />
                                              <span>{sIdx === 0 ? '🐣 기본' : sIdx === chain.length - 1 ? '👑 최종' : `⚡ ${sIdx + 1}단`}: {stage.name}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  <div className="poke-angles-row">
                                    <div className="angle-control-unit">
                                      <span>🔄 시선/방향 (3D 턴):</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        step="2"
                                        value={place.tiltY || 0}
                                        onChange={e => handleSetPokemonTiltY(id, Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.tiltY || 0}°</b>
                                    </div>
                                    <div className="angle-control-unit">
                                      <span>🔄 평면 회전:</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={place.rotation || 0}
                                        onChange={e => handleSetPokemonRotation(id, Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.rotation || 0}°</b>
                                    </div>
                                    <div className="angle-control-unit">
                                      <span>📐 상하 눕힘:</span>
                                      <input
                                        type="range"
                                        min="-60"
                                        max="60"
                                        step="2"
                                        value={place.tiltX || 0}
                                        onChange={e => handleSetPokemonTiltX(id, Number(e.target.value))}
                                        className="angle-range-slider"
                                      />
                                      <b>{place.tiltX || 0}°</b>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="sticker-action-bar">
                        <span>현재 붙인 스티커/텍스트: <b>{currentStickers.length}개</b></span>
                        {!visitingFarm && (
                          <button
                            className="excel-btn close"
                            onClick={handleClearAllStickers}
                          >
                            🧹 스티커 모두 지우기
                          </button>
                        )}
                        <button
                          className="excel-btn primary"
                          onClick={() => setMinihompyTab('miniroom')}
                        >
                          🖼️ 미니룸 보러가기 ➔
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 👥 이웃 파도타기 & 인기농장 TOP 3 뷰 */}
                  {minihompyTab === 'neighbors' && renderNeighborsView()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 1: 🏡 내 농장 (Farm Yard)
           ========================================================================= */}
        {activeTab === 'yard' && !visitingFarm && (
          <div className="farm-yard-layout">
            {pmon ? (
              <>
                {/* 🌿 Interactive Farm Pasture Screen */}
                <div className="farm-pasture-screen" onClick={handlePetPokemon}>
                  <div className="pasture-clouds">☁️ ☀️ ☁️</div>

                  {/* 🔊 쓰다듬기 효과음 켜기/끄기 플로팅 버튼 */}
                  <div className="pasture-top-controls">
                    <button
                      className={`pasture-sound-toggle-btn ${isPetSoundEnabled ? 'active' : 'muted'}`}
                      onClick={(e) => { e.stopPropagation(); togglePetSound(); }}
                      title={isPetSoundEnabled ? '쓰다듬기 효과음 끄기 (현재 소리 켜짐)' : '쓰다듬기 효과음 켜기 (현재 무음)'}
                    >
                      {isPetSoundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                      <span>쓰다듬기 소리 {isPetSoundEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  <div className="pasture-ground">
                    {/* Pokémon Visual Sprite & Skill FX */}
                    <div className={`farm-pokemon-stage ${petSkillEffect ? `skill-casting skill-cast-${petSkillEffect.type}` : ''}`}>
                      {/* 🌟 주변 시네마틱 스포트라이트 플래시 */}
                      {petSkillEffect && (
                        <div className={`pasture-cinematic-flash flash-${petSkillEffect.type}`} />
                      )}

                      {pmon.isShiny && <span className="shiny-sparkle-tag">✨ SHINY</span>}

                      {/* 🌟 Pet Skill Pop Banner */}
                      {petSkillEffect && (
                        <div className={`pet-skill-banner skill-${petSkillEffect.type}`}>
                          <span className="skill-icon-anim">{petSkillEffect.icon}</span>
                          <span className="skill-name-text">[{petSkillEffect.skillName}] 발동!</span>
                        </div>
                      )}

                      {/* 💥 Skill Aura & Burst Particles */}
                      {petSkillEffect && (
                        <div className={`pet-skill-aura-ring aura-${petSkillEffect.type}`}>
                          {petSkillEffect.particles.map((pt, i) => (
                            <span key={i} className={`skill-particle pt-${i + 1}`}>
                              {pt}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 💥 바닥 지면 입체 충격파 링 */}
                      {petSkillEffect && (
                        <div className={`ground-shockwave-layer shockwave-${petSkillEffect.type}`}>
                          <div className="ground-shockwave sw-1" />
                          <div className="ground-shockwave sw-2" />
                          <div className="ground-shockwave sw-3" />
                        </div>
                      )}

                      {/* 💥 실시간 방출형 고유스킬 스트림 (자체 벡터 SVG + 끝단 폭발 임팩트 버스트) */}
                      {petSkillEffect && (
                        <div className={`pasture-live-skill-stream stream-type-${petSkillEffect.type}`}>
                          {renderSkillStreamFx(petSkillEffect.fxClass || 'skill-fx-fireblast', petSkillEffect.icon)}
                          <div className={`stream-impact-burst impact-${petSkillEffect.type}`}>
                            <div className="impact-flash" />
                            <div className="impact-ring ring-1" />
                            <div className="impact-ring ring-2" />
                            <div className="impact-sparks">
                              <span className="isp-1" />
                              <span className="isp-2" />
                              <span className="isp-3" />
                              <span className="isp-4" />
                            </div>
                          </div>
                        </div>
                      )}

                      <img
                        src={pmon.sprites.showdownFront || pmon.sprites.front}
                        alt={pmon.nickname}
                        className={`farm-active-sprite ${isPetJumping ? `pet-skill-cast-motion motion-${petSkillEffect?.type || 'normal'}` : ''}`}
                      />
                      <div className="pet-shadow"></div>
                      <div className="pet-nametag">
                        <span>{pmon.nickname} (Lv.{pmon.level})</span>
                        <button className="cry-btn" onClick={(e) => { e.stopPropagation(); playPokemonCry(pmon.speciesId); }} title="울음소리 듣기">
                          <Volume2 size={13} />
                        </button>
                        <button
                          className={`pet-mute-btn ${isPetSoundEnabled ? 'active' : 'muted'}`}
                          onClick={(e) => { e.stopPropagation(); togglePetSound(); }}
                          title={isPetSoundEnabled ? '쓰다듬기 효과음 끄기' : '쓰다듬기 효과음 켜기'}
                        >
                          {isPetSoundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                          <span>{isPetSoundEnabled ? '소리 ON' : '소리 OFF'}</span>
                        </button>
                      </div>

                      {/* ⚡ 포켓몬 고유스킬 3선 컨트롤러 (최대 3개 스킬 직접 발동) */}
                      <div className="pasture-skills-controller">
                        <div className="skills-btn-group">
                          {getPokemonSkillSet(pmon).map(sk => (
                            <button
                              key={sk.slot}
                              className={`skill-slot-btn ${selectedSkillSlot === sk.slot ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerSkillSlot(sk);
                              }}
                              title={sk.desc}
                            >
                              <span className="sk-icon">{sk.icon}</span>
                              <span className="sk-name">{sk.slot}. {sk.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Heart Effect */}
                  {floatingHeart && (
                    <div className="floating-heart" style={{ left: '50%', top: '35%' }}>
                      💖 +5 애정도!
                    </div>
                  )}

                  <div className="pasture-touch-hint">
                    <span>💡 포켓몬을 클릭하거나 키보드 <b>[C]</b> 키를 누르면 고유 스킬 모션과 함께 애정도(+5) 및 경험치가 상승합니다!</span>
                    <button
                      className={`pasture-hint-sound-btn ${isPetSoundEnabled ? 'active' : 'muted'}`}
                      onClick={(e) => { e.stopPropagation(); togglePetSound(); }}
                      title="쓰다듬을 때 효과음 켜기/끄기"
                    >
                      {isPetSoundEnabled ? '🔊 효과음 ON' : '🔇 효과음 OFF'}
                    </button>
                  </div>
                </div>

                {/* 📊 4대 상태 게이지 & 레벨 정보 */}
                <div className="farm-status-panel">
                  <div className="status-header-row">
                    <div>
                      <h3>{pmon.nickname}의 상태 대시보드</h3>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        종족: {pmon.name} | 타입: {pmon.types.join('/')} | 누적 애정: {pmon.totalPats}회
                      </span>
                    </div>
                    {/* 진화/졸업 바로가기 배지 */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {pmon.stageIndex < pmon.evolutionChain.length - 1 && (
                        <button className="excel-btn primary pulse" onClick={() => setActiveTab('evolve')}>
                          ✨ 진화의 방
                        </button>
                      )}
                      {pmon.stageIndex === pmon.evolutionChain.length - 1 && pmon.level >= 36 && (
                        <button className="excel-btn warning pulse" onClick={handleGraduate}>
                          🎓 졸업식 치르기
                        </button>
                      )}
                    </div>
                  </div>

                  {/* EXP Bar */}
                  <div className="gauge-row">
                    <div className="gauge-label">
                      <span>⭐ 레벨 {pmon.level}</span>
                      <span>{pmon.exp} / {pmon.maxExp} EXP</span>
                    </div>
                    <div className="gauge-track">
                      <div className="gauge-fill exp" style={{ width: `${Math.min(100, Math.round((pmon.exp / pmon.maxExp) * 100))}%` }} />
                    </div>
                  </div>

                  {/* 4 Status Gauges Grid */}
                  {(() => {
                    const maxStat = getMaxStatForStage(pmon.stageIndex);
                    return (
                      <div className="gauges-grid">
                        <div className="gauge-item">
                          <div className="gauge-label">
                            <span>🍎 배고픔</span>
                            <span>{pmon.hunger} / {maxStat}</span>
                          </div>
                          <div className="gauge-track">
                            <div
                              className="gauge-fill hunger"
                              style={{
                                width: `${Math.min(100, Math.round((pmon.hunger / maxStat) * 100))}%`,
                                backgroundColor: pmon.hunger > (maxStat * 0.3) ? '#10b981' : '#ef4444'
                              }}
                            />
                          </div>
                        </div>

                        <div className="gauge-item">
                          <div className="gauge-label">
                            <span>🧼 청결도</span>
                            <span>{pmon.cleanliness} / {maxStat}</span>
                          </div>
                          <div className="gauge-track">
                            <div
                              className="gauge-fill cleanliness"
                              style={{
                                width: `${Math.min(100, Math.round((pmon.cleanliness / maxStat) * 100))}%`,
                                backgroundColor: pmon.cleanliness > (maxStat * 0.3) ? '#06b6d4' : '#f59e0b'
                              }}
                            />
                          </div>
                        </div>

                        <div className="gauge-item">
                          <div className="gauge-label">
                            <span>💖 친밀도</span>
                            <span>{pmon.happiness} / 100</span>
                          </div>
                          <div className="gauge-track">
                            <div className="gauge-fill happiness" style={{ width: `${Math.min(100, pmon.happiness)}%`, backgroundColor: '#ec4899' }} />
                          </div>
                        </div>

                        <div className="gauge-item">
                          <div className="gauge-label">
                            <span>⚡ 에너지</span>
                            <span>{pmon.energy} / {maxStat}</span>
                          </div>
                          <div className="gauge-track">
                            <div
                              className="gauge-fill energy"
                              style={{
                                width: `${Math.min(100, Math.round((pmon.energy / maxStat) * 100))}%`,
                                backgroundColor: '#eab308'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 🍎 Quick Care Actions */}
                  <div className="quick-actions-bar">
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      🎒 보유 아이템으로 즉시 돌보기:
                    </div>
                    <div className="inventory-chips-row">
                      {FARM_ITEMS.map(item => {
                        const qty = farmState.inventory[item.id] || 0;
                        const isTreasure = item.id === 'shiny_stone' || item.id === 'gold_crown';
                        const isEgg = item.id === 'mystery_egg' || item.id === 'golden_egg';
                        return (
                          <button
                            key={item.id}
                            className={`care-item-btn ${qty > 0 ? 'available' : 'empty'} ${isTreasure ? 'treasure-item' : ''}`}
                            onClick={() => handleUseItem(item)}
                            disabled={qty <= 0}
                            title={
                              isTreasure
                                ? `💰 ${item.name} (보유: ${qty}개) - 클릭 시 코인으로 환전/기증`
                                : isEgg
                                ? `🥚 ${item.name} (보유: ${qty}개) - 클릭 시 인큐베이터 입고`
                                : `${item.description} (보유: ${qty}개)`
                            }
                          >
                            <span className="item-icon">{item.icon}</span>
                            <span className="item-name">{item.name}</span>
                            <span className="item-qty">x{qty}</span>
                            {isTreasure && qty > 0 && (
                              <span style={{ fontSize: '0.62rem', background: '#eab308', color: '#1e293b', borderRadius: '4px', padding: '0 3px', fontWeight: 800, marginLeft: 2 }}>
                                환전
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-yard-card">
                <div style={{ fontSize: '3rem' }}>🐣</div>
                <h3>현재 농장에 포켓몬이 없습니다!</h3>
                <p>분양소에서 아기 포켓몬을 입양하여 사랑으로 키워보세요.</p>
                <button className="excel-btn primary" onClick={() => setActiveTab('adopt')} style={{ padding: '8px 24px', marginTop: 12 }}>
                  🐣 포켓몬 분양받으러 가기
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: 🐣 분양소 (Adoption Center)
           ========================================================================= */}
        {activeTab === 'adopt' && !visitingFarm && (
          <div className="farm-adopt-grid">
            <div className="adopt-banner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3>🐣 둡박사 포켓몬 분양소</h3>
                  <p>스타팅 포켓몬을 몬스터볼에서 깨워 입양하세요! (※ 일반/전설 포켓몬은 [🥚 알 부화소]에서만 탄생합니다)</p>
                </div>
                {/* Generation Filter Chips - 1세대 독립 및 세대별 묶음 */}
                <div className="gen-filter-chips">
                  {[
                    { id: 'all', label: '🌟 전체 스타팅 (29종)' },
                    { id: 'gen1', label: '🔴 1세대 (5종)' },
                    { id: 'gen2-3', label: '🌿 2~3세대 (6종)' },
                    { id: 'gen4-5', label: '⚡ 4~5세대 (6종)' },
                    { id: 'gen6-7', label: '✨ 6~7세대 (6종)' },
                    { id: 'gen8-9', label: '🔮 8~9세대 (6종)' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      className={`gen-chip ${genFilter === f.id ? 'active' : ''}`}
                      onClick={() => setGenFilter(f.id as typeof genFilter)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="starter-cards-grid">
              {STARTER_CHAINS.map((chain, idx) => ({ chain, originalIdx: idx }))
                .filter(({ chain }) => {
                  if (!chain[0].isStarter) return false; // 🐣 오직 스타팅 포켓몬만 분양 가능!
                  if (genFilter === 'all') return true;
                  return chain[0].genCategory === genFilter;
                })
                .map(({ chain, originalIdx }) => {
                  const baby = chain[0];
                  return (
                    <div key={baby.id} className="starter-adopt-card" onClick={() => handleAdoptPokemon(originalIdx)}>
                      <div className="starter-pokeball-box">
                        <div className="pokeball-realistic-3d">
                          <svg viewBox="0 0 100 100" className="pokeball-svg">
                            <defs>
                              <radialGradient id={`pokeTop_${baby.id}`} cx="35%" cy="30%" r="70%">
                                <stop offset="0%" stopColor="#ff7878" />
                                <stop offset="45%" stopColor="#ef4444" />
                                <stop offset="100%" stopColor="#991b1b" />
                              </radialGradient>
                              <radialGradient id={`pokeBot_${baby.id}`} cx="35%" cy="65%" r="70%">
                                <stop offset="0%" stopColor="#ffffff" />
                                <stop offset="60%" stopColor="#f1f5f9" />
                                <stop offset="100%" stopColor="#cbd5e1" />
                              </radialGradient>
                              <radialGradient id={`pokeBtn_${baby.id}`} cx="40%" cy="35%" r="60%">
                                <stop offset="0%" stopColor="#ffffff" />
                                <stop offset="70%" stopColor="#e2e8f0" />
                                <stop offset="100%" stopColor="#94a3b8" />
                              </radialGradient>
                            </defs>
                            <circle cx="50" cy="50" r="46" fill="#0f172a" stroke="#020617" strokeWidth="4" />
                            <path d="M 6 50 A 44 44 0 0 1 94 50 Z" fill={`url(#pokeTop_${baby.id})`} />
                            <path d="M 6 50 A 44 44 0 0 0 94 50 Z" fill={`url(#pokeBot_${baby.id})`} />
                            <ellipse cx="38" cy="24" rx="14" ry="7" fill="white" opacity="0.45" transform="rotate(-20 38 24)" />
                            <rect x="6" y="46" width="88" height="8" fill="#0f172a" />
                            <circle cx="50" cy="50" r="14" fill="#0f172a" />
                            <circle cx="50" cy="50" r="10" fill={`url(#pokeBtn_${baby.id})`} stroke="#475569" strokeWidth="1.5" />
                            <circle cx="50" cy="50" r="5" fill="white" className="pokeball-core-btn-light" />
                          </svg>
                        </div>
                        <span className="pokeball-pulse-ring" />
                        <span className="pokeball-tap-hint">🔴 몬스터볼 오픈</span>
                      </div>
                      <div className="starter-info">
                        <h4>{baby.name}</h4>
                        <div className="type-badge-row">
                          {baby.types.map(t => (
                            <span key={t} className="type-tag">{t}</span>
                          ))}
                        </div>
                        <p className="evolution-preview">
                          진화 경로: {chain.map(c => c.name).join(' ➔ ')}
                        </p>
                      </div>
                      <button className="excel-btn primary adopt-open-btn" onClick={(e) => { e.stopPropagation(); handleAdoptPokemon(originalIdx); }}>
                        🔴 몬스터볼 열기 & 입양
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: ✨ 진화의 방 (Evolution Chamber)
           ========================================================================= */}
        {activeTab === 'evolve' && !visitingFarm && (
          <div className="farm-evolve-container">
            {pmon ? (
              <>
                <div className="evolve-header">
                  <h3>✨ 신비한 진화의 방</h3>
                  <p>정성스럽게 돌보아 레벨과 친밀도를 달성하면 다음 단계로 진화합니다!</p>
                </div>

                <div className="evolve-stages-diagram">
                  {pmon.evolutionChain.map((st, idx) => {
                    const isCurrent = idx === pmon.stageIndex;
                    const isPassed = idx < pmon.stageIndex;

                    return (
                      <React.Fragment key={st.id}>
                        <div className={`stage-node ${isCurrent ? 'current' : isPassed ? 'passed' : 'locked'}`}>
                          <img src={st.showdownSprite || st.sprite} alt={st.name} />
                          <div className="stage-name">{st.name}</div>
                          <div className="stage-req">Lv.{st.minLevel}+</div>
                          {isCurrent && <span className="current-tag">현재</span>}
                        </div>
                        {idx < pmon.evolutionChain.length - 1 && (
                          <div className={`stage-arrow ${isPassed ? 'passed' : ''}`}>➔</div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {pmon.stageIndex < pmon.evolutionChain.length - 1 ? (
                  (() => {
                    const nextStage = pmon.evolutionChain[pmon.stageIndex + 1];
                    const levelMet = pmon.level >= nextStage.minLevel;
                    const happyMet = pmon.happiness >= nextStage.minHappiness;
                    const canEvolve = levelMet && happyMet;

                    const isEeveeBranch = pmon.speciesId === 133 || pmon.evolutionChain[pmon.stageIndex]?.isEeveeBranch || nextStage.name.includes('이브이즈');

                    return (
                      <div className="evolve-action-card">
                        <h4>
                          {isEeveeBranch
                            ? '다음 진화: 🎲 8대 이브이즈 (샤미드·쥬피썬더·부스터·에브이·블래키·리피아·글레이시아·님피아 중 확률 진화)'
                            : `다음 진화: [${nextStage.name}] 조건 달성표`}
                        </h4>

                        {isEeveeBranch && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0', justifyContent: 'center' }}>
                            {EEVEE_BRANCHES.map(br => (
                              <div key={br.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 6px' }}>
                                <img src={br.sprite} alt={br.name} style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }} />
                                <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{br.name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="req-checklist">
                          <div className={`check-item ${levelMet ? 'checked' : ''}`}>
                            {levelMet ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>레벨 조건: 필요 Lv.{nextStage.minLevel} (현재: Lv.{pmon.level})</span>
                          </div>
                          <div className={`check-item ${happyMet ? 'checked' : ''}`}>
                            {happyMet ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>친밀도 조건: 필요 {nextStage.minHappiness}+ (현재: {pmon.happiness})</span>
                          </div>
                          <div className="check-item checked" style={{ color: '#059669', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                            <Sparkles size={16} />
                            <span>진화 혜택: 에너지·청결도·포만도 최대치 확장 ({getMaxStatForStage(pmon.stageIndex)} ➔ {getMaxStatForStage(pmon.stageIndex + 1)})</span>
                          </div>
                        </div>

                        <button
                          className="excel-btn primary evolve-btn"
                          disabled={!canEvolve}
                          onClick={handleEvolve}
                        >
                          {canEvolve 
                            ? (isEeveeBranch ? '🎲 지금 바로 8대 이브이즈로 진화시키기!' : '✨ 지금 바로 진화시키기!')
                            : '⏳ 조건을 먼저 달성해 주세요'}
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="evolve-action-card completed">
                    <Trophy size={32} style={{ color: '#d97706', marginBottom: 6 }} />
                    <h4>🎉 최종 진화 완료! (스탯 최대치: {getMaxStatForStage(pmon.stageIndex)})</h4>
                    <p>[{pmon.name}]은(는) 이미 최강의 최종 진화체입니다. Lv.36 이상 달성 후 감동의 졸업식을 치러보세요!</p>
                    <button className="excel-btn warning" onClick={handleGraduate}>
                      🎓 졸업식 진행하기
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-yard-card">
                <p>돌보고 있는 포켓몬이 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: 💼 아르바이트 (Part-Time Jobs)
           ========================================================================= */}
        {activeTab === 'jobs' && !visitingFarm && (
          <div className="farm-jobs-layout">
            <div className="jobs-banner">
              <h3>💼 포켓몬 아르바이트 센터</h3>
              <p>포켓몬이 일을 도와주고 용돈(코인)과 경험치를 벌어옵니다!</p>
            </div>

            <div className="jobs-list-grid">
              {FARM_JOBS.map(job => {
                const canWork = pmon && pmon.level >= job.minLevel && pmon.energy >= job.energyCost && pmon.hunger >= job.hungerCost;
                return (
                  <div key={job.id} className="job-card">
                    <div className="job-icon-col">
                      <span className="job-emoji">{job.icon}</span>
                    </div>
                    <div className="job-details">
                      <h4>{job.title}</h4>
                      <p className="job-desc">{job.desc}</p>
                      <div className="job-costs-row">
                        <span>⚡ 체력 -{job.energyCost}</span>
                        <span>🍎 배고픔 -{job.hungerCost}</span>
                        <span>최소 Lv.{job.minLevel}</span>
                      </div>
                    </div>
                    <div className="job-reward-action">
                      <div className="reward-badge">
                        <span>🪙 +{job.rewardCoins} P</span>
                        <span style={{ fontSize: '0.72rem', color: '#107c41' }}>+{job.expReward} EXP</span>
                      </div>
                      <button
                        className="excel-btn primary"
                        onClick={() => handleWorkJob(job)}
                        disabled={!canWork}
                      >
                        알바 시작
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: 🌲 사내 뒷산 탐험 (Expedition)
           ========================================================================= */}
        {activeTab === 'expedition' && !visitingFarm && (
          <div className="farm-expedition-layout">
            <div className="expedition-banner">
              <div className="expedition-banner-icon">🗺️</div>
              <div>
                <h3>🌲 신비의 사내 뒷산 탐험대 (Office Expedition)</h3>
                <p>
                  포켓몬을 파견하여 회사 안팎의 숨겨진 비밀 장소를 탐험시키세요! 
                  고액 코인과 경험치, 그리고 즉시 레벨업하는 <strong>🍬 이상한사탕</strong>과 <strong>👑 전설의 황금 왕관</strong>을 물어옵니다!
                </p>
              </div>
            </div>

            <div className="expedition-list-grid">
              {EXPEDITION_AREAS.map(area => {
                const canExplore = pmon && pmon.level >= area.minLevel && pmon.energy >= area.energyCost && pmon.hunger >= area.hungerCost;
                return (
                  <div key={area.id} className="expedition-card">
                    <div className="expedition-header-row">
                      <span className="expedition-emoji">{area.icon}</span>
                      <div className="expedition-meta">
                        <h4>{area.name}</h4>
                        <span className="expedition-duration-badge">⏱️ {area.durationSec}초 코스</span>
                      </div>
                    </div>

                    <p className="expedition-desc">{area.desc}</p>

                    <div className="expedition-costs-row">
                      <span>⚡ 체력 -{area.energyCost}</span>
                      <span>🍎 배고픔 -{area.hungerCost}</span>
                      <span>🧼 청결 -{area.cleanlinessCost}</span>
                      <span className={pmon && pmon.level >= area.minLevel ? 'level-ok' : 'level-warn'}>
                        최소 Lv.{area.minLevel}
                      </span>
                    </div>

                    <div className="expedition-drops-row">
                      <span className="drops-label">🎁 발견 가능 전리품:</span>
                      <div className="drops-badges">
                        {area.dropItems.map(d => {
                          const itemObj = FARM_ITEMS.find(i => i.id === d.itemId);
                          return (
                            <span key={d.itemId} className="drop-badge" title={`${itemObj?.name || d.itemId} (발견 확률: ${Math.round(d.chance * 100)}%)`}>
                              {itemObj?.icon} {itemObj?.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="expedition-footer-row">
                      <div className="expedition-reward-preview">
                        <span className="coin-preview">🪙 {area.rewardCoinsMin}~{area.rewardCoinsMax} P</span>
                        <span className="exp-preview">✨ {area.rewardExpMin}~{area.rewardExpMax} EXP</span>
                      </div>
                      <button
                        className="excel-btn primary expedition-go-btn"
                        onClick={() => handleStartExpedition(area)}
                        disabled={!canExplore}
                      >
                        🎒 탐험 출발
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: 🥚 알 부화소 & 보육소 (Daycare & Incubator)
           ========================================================================= */}
        {activeTab === 'daycare' && !visitingFarm && (
          <div className="farm-daycare-layout">
            {/* Banner */}
            <div className="daycare-banner">
              <div className="daycare-banner-icon">🥚</div>
              <div>
                <h3>🥚 포켓 데이케어 & 알 인큐베이터 (Egg Incubator)</h3>
                <p>
                  상점이나 탐험에서 발견한 <strong>일반 포켓몬 알</strong> 또는 <strong>전설 & 특수 포켓몬 알</strong>을 품어 귀여운 아기 포켓몬으로 부화시키세요!
                  쓰다듬기(+1%), 목욕(+3%), 알바(+5%), 탐험(+10%)을 통해 온기를 100% 모으면 알이 깨어납니다!
                </p>
              </div>
            </div>

            {/* Top Section: Incubator Chamber */}
            <div className="incubator-chamber-card">
              <div className="chamber-header">
                <h4>🌡️ 첨단 보온 인큐베이터 (Current Incubator)</h4>
                <span className="chamber-badge">
                  {farmState.incubatingEgg ? '가동 중 (Active)' : '비어 있음 (Empty)'}
                </span>
              </div>

              {farmState.incubatingEgg ? (
                <div className="incubator-active-view">
                  <div className="egg-display-pod">
                    <div className={`incubator-egg-avatar ${farmState.incubatingEgg.isGolden ? 'golden-egg' : 'normal-egg'} ${farmState.incubatingEgg.progress >= 100 ? 'ready-shake' : 'incubating-float'}`}>
                      <span className="egg-symbol">{farmState.incubatingEgg.icon}</span>
                      <div className="warmth-heat-waves">
                        <span>♨️</span>
                        <span>♨️</span>
                      </div>
                    </div>

                    <div className="incubator-egg-info">
                      <h3>{farmState.incubatingEgg.name}</h3>
                      <span className="egg-rarity-tag">
                        {farmState.incubatingEgg.isGolden ? '🌟 전설 & 특수 포켓몬 알 (100% 이로치/특수폼)' : '🥚 일반 포켓몬 알 (전 세대 포켓몬)'}
                      </span>
                      <p className="egg-warmth-status">
                        {farmState.incubatingEgg.progress >= 100
                          ? '🎉 온기가 가득 찼습니다! 알이 기우뚱거리며 깨어날 준비를 마쳤습니다!'
                          : `🔥 부화 온기 충전 중... (${Math.round(farmState.incubatingEgg.progress)}% 달성)`}
                      </p>

                      {/* Warmth Progress Bar */}
                      <div className="warmth-bar-track">
                        <div
                          className={`warmth-bar-fill ${farmState.incubatingEgg.isGolden ? 'golden' : ''}`}
                          style={{ width: `${farmState.incubatingEgg.progress}%` }}
                        />
                      </div>

                      <div className="warmth-tips-row">
                        <span>💡 온기 획득법: 쓰다듬기(+1%) | 거품목욕(+3%) | 알바완수(+5%) | 탐험완수(+10%) | 복권(+2%)</span>
                      </div>

                      {farmState.incubatingEgg.progress >= 100 && (
                        <button
                          className="excel-btn primary hatch-action-btn"
                          onClick={handleStartHatching}
                        >
                          🐣 지금 바로 알 부화시키기!
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="incubator-empty-view">
                  <div className="empty-pod-icon">🪹</div>
                  <div className="empty-pod-info">
                    <h5>현재 인큐베이터가 비어 있습니다</h5>
                    <p>보유 중인 일반 포켓몬 알이나 전설 & 특수 포켓몬 알을 넣어 정성껏 품어보세요!</p>

                    <div className="place-egg-actions">
                      {(farmState.inventory['mystery_egg'] || 0) > 0 && (
                        <button
                          className="excel-btn primary"
                          onClick={() => {
                            const item = FARM_ITEMS.find(i => i.id === 'mystery_egg');
                            if (item) handlePlaceEggInIncubator(item);
                          }}
                        >
                          🥚 일반 포켓몬 알 넣기 (보유: {farmState.inventory['mystery_egg']}개)
                        </button>
                      )}
                      {(farmState.inventory['golden_egg'] || 0) > 0 && (
                        <button
                          className="excel-btn primary golden-btn"
                          onClick={() => {
                            const item = FARM_ITEMS.find(i => i.id === 'golden_egg');
                            if (item) handlePlaceEggInIncubator(item);
                          }}
                        >
                          🌟 전설 & 특수 포켓몬 알 넣기 (보유: {farmState.inventory['golden_egg']}개)
                        </button>
                      )}
                      {(farmState.inventory['mystery_egg'] || 0) <= 0 && (farmState.inventory['golden_egg'] || 0) <= 0 && (
                        <button
                          className="excel-btn"
                          onClick={() => setActiveTab('shop')}
                        >
                          🛍️ 상점에서 알 구하러 가기
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section: Reserve Daycare Pasture */}
            <div className="daycare-reserve-card">
              <div className="chamber-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4>🏡 보육소 목장 (대기실 포켓몬 목록)</h4>
                  <span className="chamber-badge">
                    보관 중: {farmState.reservePokemon?.length || 0}마리
                  </span>
                </div>
              </div>

              {/* 🎛️ 보육소 스마트 정렬 & 필터 컨트롤 바 */}
              {farmState.reservePokemon && farmState.reservePokemon.length > 0 && (
                <div className="daycare-controls-bar">
                  <div className="daycare-sort-chips">
                    <span className="controls-label">정렬:</span>
                    <button
                      className={`daycare-chip-btn ${daycareSort === 'species' ? 'active' : ''}`}
                      onClick={() => setDaycareSort('species')}
                      title="같은 포켓몬끼리 나란히 묶어서 비교합니다"
                    >
                      🐾 종류별 (중복 비교)
                    </button>
                    <button
                      className={`daycare-chip-btn ${daycareSort === 'shiny' ? 'active' : ''}`}
                      onClick={() => setDaycareSort('shiny')}
                      title="반짝이는 이로치 포켓몬을 맨 앞으로 모읍니다"
                    >
                      ✨ 이로치 우선
                    </button>
                    <button
                      className={`daycare-chip-btn ${daycareSort === 'type' ? 'active' : ''}`}
                      onClick={() => setDaycareSort('type')}
                      title="같은 속성(타입)끼리 묶어서 정렬합니다"
                    >
                      🎨 타입별
                    </button>
                    <button
                      className={`daycare-chip-btn ${daycareSort === 'level' ? 'active' : ''}`}
                      onClick={() => setDaycareSort('level')}
                      title="레벨이 높은 순서대로 정렬합니다"
                    >
                      ⭐ 레벨순
                    </button>
                    <button
                      className={`daycare-chip-btn ${daycareSort === 'recent' ? 'active' : ''}`}
                      onClick={() => setDaycareSort('recent')}
                      title="최근에 부화/등록된 순서대로 정렬합니다"
                    >
                      🕒 최근순
                    </button>
                  </div>

                  <div className="daycare-filter-inputs">
                    <select
                      value={daycareFilter}
                      onChange={e => setDaycareFilter(e.target.value)}
                      className="daycare-select"
                    >
                      <option value="all">모든 속성</option>
                      <option value="shiny">✨ 이로치만</option>
                      <option value="fire">🔥 불꽃</option>
                      <option value="water">💧 물</option>
                      <option value="grass">🍃 풀</option>
                      <option value="electric">⚡ 전기</option>
                      <option value="dragon">🐉 드래곤</option>
                      <option value="ghost">👻 고스트</option>
                      <option value="poison">☠️ 독</option>
                      <option value="fairy">💖 페어리</option>
                      <option value="fighting">🥊 격투</option>
                      <option value="flying">🕊️ 비행</option>
                    </select>
                    <input
                      type="text"
                      placeholder="이름/닉네임 검색..."
                      value={daycareSearch}
                      onChange={e => setDaycareSearch(e.target.value)}
                      className="daycare-search-box"
                    />
                  </div>
                </div>
              )}

              {(() => {
                let list = [...(farmState.reservePokemon || [])];

                // 1. 검색어 필터
                if (daycareSearch.trim()) {
                  const q = daycareSearch.trim().toLowerCase();
                  list = list.filter(m => m.name.toLowerCase().includes(q) || m.nickname.toLowerCase().includes(q));
                }

                // 2. 타입 및 이로치 필터
                if (daycareFilter === 'shiny') {
                  list = list.filter(m => m.isShiny);
                } else if (daycareFilter !== 'all') {
                  list = list.filter(m => (m.types as string[]).includes(daycareFilter));
                }

                // 3. 정렬 옵션 적용
                if (daycareSort === 'species') {
                  list.sort((a, b) => {
                    if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
                    if (a.isShiny !== b.isShiny) return (b.isShiny ? 1 : 0) - (a.isShiny ? 1 : 0);
                    return b.level - a.level;
                  });
                } else if (daycareSort === 'shiny') {
                  list.sort((a, b) => {
                    if (a.isShiny !== b.isShiny) return (b.isShiny ? 1 : 0) - (a.isShiny ? 1 : 0);
                    if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
                    return b.level - a.level;
                  });
                } else if (daycareSort === 'type') {
                  list.sort((a, b) => {
                    const typeA = a.types[0] || '';
                    const typeB = b.types[0] || '';
                    if (typeA !== typeB) return typeA.localeCompare(typeB);
                    if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
                    return b.level - a.level;
                  });
                } else if (daycareSort === 'level') {
                  list.sort((a, b) => {
                    if (b.level !== a.level) return b.level - a.level;
                    if (a.isShiny !== b.isShiny) return (b.isShiny ? 1 : 0) - (a.isShiny ? 1 : 0);
                    return a.speciesId - b.speciesId;
                  });
                } else if (daycareSort === 'recent') {
                  list.reverse();
                }

                if (list.length === 0) {
                  return (
                    <div className="empty-reserve-box">
                      <p>
                        {farmState.reservePokemon?.length === 0
                          ? '보육소 목장에 쉬고 있는 다른 포켓몬이 없습니다. 알을 부화시켜 더 많은 친구들을 만나보세요!'
                          : '조건에 일치하는 보육소 포켓몬이 없습니다.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="reserve-pokemon-grid">
                    {list.map(mon => (
                      <div key={mon.uid} className={`reserve-mon-card ${mon.isShiny ? 'shiny-card' : ''}`}>
                        <div className="reserve-sprite-wrapper">
                          <img
                            src={mon.sprites.showdownFront || mon.sprites.front}
                            alt={mon.name}
                            className="reserve-sprite"
                          />
                          {mon.isShiny && (
                            <span className="shiny-badge-ribbon">✨ SHINY</span>
                          )}
                        </div>
                        <div className="reserve-mon-info">
                          <h5>
                            {mon.nickname} {mon.isShiny && <span style={{ color: '#f59e0b' }}>✨</span>}
                          </h5>
                          <span className="reserve-level">
                            #{String(mon.speciesId).padStart(3, '0')} Lv.{mon.level} {mon.name}
                          </span>
                          <div className="reserve-types">
                            {mon.types.map(t => (
                              <span key={t} className={`type-tag ${t}`}>{t}</span>
                            ))}
                          </div>
                        </div>
                        <div className="reserve-actions-row">
                          <button
                            className="excel-btn primary switch-partner-btn"
                            onClick={() => handleSwitchActivePokemon(mon.uid)}
                          >
                            ⭐ 대표 파트너로 교체
                          </button>
                          <button
                            className="excel-btn danger send-center-btn"
                            onClick={() => handleSendPokemonToCenter(mon)}
                            title="포켓몬 센터로 보내 건강하게 넓은 세상으로 보냅니다"
                          >
                            🏥 센터로 보내기
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: 🎰 일일 럭키 사내 복권 (Lottery & Slot)
           ========================================================================= */}
        {activeTab === 'lottery' && !visitingFarm && (
          <div className="farm-lottery-layout">
            {/* Banner */}
            <div className="lottery-banner">
              <div className="lottery-banner-icon">🎰</div>
              <div>
                <h3>🎰 일일 럭키 사내 복권 (Office Lucky Slot)</h3>
                <p>
                  매일 3회 무료 추첨! 엑셀 난수 생성 알고리즘으로 돌아가는 사내 슬롯머신입니다.
                  <strong> 777 피카츄 잭팟</strong>이 터지면 사내 누적 잭팟 상금과 <strong>🌟 황금빛 전설의 알</strong>을 획득합니다!
                </p>
              </div>
            </div>

            {/* Jackpot Display Board */}
            <div className="jackpot-display-board">
              <div className="jackpot-neon-label">
                <span>🔥 ACCUMULATED JACKPOT POOL 🔥</span>
              </div>
              <div className="jackpot-prize-number">
                🪙 {(farmState.lotteryState?.jackpotPool || 2000).toLocaleString()} P
              </div>
              <span className="jackpot-sub-notice">
                * 유료 복권 구매 시마다 상금 풀에 25P씩 실시간 누적 적립됩니다! (복권 참여 시 알 온기 +5%)
              </span>
            </div>

            {/* Main Slot Machine Chamber */}
            <div className="slot-machine-frame">
              <div className="slot-screen-bezel">
                <div className="slot-reels-container">
                  <div className={`slot-reel-cell ${isSlotSpinning ? 'spinning' : ''}`}>
                    <span className="reel-symbol">{slotReels[0]}</span>
                  </div>
                  <div className={`slot-reel-cell ${isSlotSpinning ? 'spinning delay-1' : ''}`}>
                    <span className="reel-symbol">{slotReels[1]}</span>
                  </div>
                  <div className={`slot-reel-cell ${isSlotSpinning ? 'spinning delay-2' : ''}`}>
                    <span className="reel-symbol">{slotReels[2]}</span>
                  </div>
                </div>
              </div>

              {/* Spin Control Panel */}
              <div className="slot-controls-panel">
                <div className="spins-status-info">
                  <span className="free-spins-badge">
                    🎁 오늘 남은 무료 추첨: <strong>{farmState.lotteryState?.freeSpinsLeft || 0}회</strong>
                  </span>
                  <span className="coin-cost-badge">
                    {(farmState.lotteryState?.freeSpinsLeft || 0) > 0 ? '무료 (Free)' : '회당 🪙 50 P'}
                  </span>
                </div>

                <button
                  className={`excel-btn primary spin-lottery-btn ${isSlotSpinning ? 'spinning' : ''}`}
                  onClick={handleSpinLottery}
                  disabled={isSlotSpinning || ((farmState.lotteryState?.freeSpinsLeft || 0) <= 0 && farmState.coins < 50)}
                >
                  {isSlotSpinning ? '🎲 슬롯 회전 중...!' : '🎰 복권 추첨 레버 당기기!'}
                </button>
              </div>

              {/* Spin Result Alert Box */}
              {slotSpinResult && (
                <div className={`slot-result-alert-box ${slotSpinResult.isJackpot ? 'jackpot-alert' : ''}`}>
                  <h4>{slotSpinResult.title}</h4>
                  <p>{slotSpinResult.desc}</p>
                  {slotSpinResult.wonItem && (
                    <div className="lottery-won-item-tag">
                      {slotSpinResult.wonItem.icon} <strong>{slotSpinResult.wonItem.name}</strong> 획득!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payout Guide Table */}
            <div className="lottery-payout-table-card">
              <div className="chamber-header">
                <h4>📜 복권 당첨 상금 및 전리품 안내표</h4>
                <span className="chamber-badge">배당률 표</span>
              </div>
              <div className="payout-grid">
                <div className="payout-row jackpot">
                  <span className="payout-symbols">⚡ ⚡ ⚡</span>
                  <div className="payout-desc">
                    <strong>MEGA JACKPOT (777 피카츄)</strong>
                    <span>사내 누적 잭팟 상금 전액 + 🌟 황금빛 전설의 알</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">🍬 🍬 🍬</span>
                  <div className="payout-desc">
                    <strong>스위트 캔디 잭팟</strong>
                    <span>🍬 이상한사탕 1개 (즉시 1레벨업!) + 🪙 300 P</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">🥚 🥚 🥚</span>
                  <div className="payout-desc">
                    <strong>미스터리 에그 잭팟</strong>
                    <span>🥚 의문의 포켓몬 알 1개 + 🪙 400 P</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">🧼 🧼 🧼</span>
                  <div className="payout-desc">
                    <strong>버블버블 클린 잭팟</strong>
                    <span>🧼 거품비누 2개 + 🪙 250 P</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">🫐 🫐 🫐</span>
                  <div className="payout-desc">
                    <strong>달콤한 오랭열매 파티</strong>
                    <span>🫐 오랭열매 3개 + 🪙 150 P</span>
                  </div>
                </div>
                <div className="payout-row">
                  <span className="payout-symbols">☕ ☕ ☕</span>
                  <div className="payout-desc">
                    <strong>탕비실 바리스타 상</strong>
                    <span>🪙 80 P</span>
                  </div>
                </div>
                <div className="payout-row sub">
                  <span className="payout-symbols">아무 심볼 2개 일치</span>
                  <div className="payout-desc">
                    <strong>소박 행운상</strong>
                    <span>🪙 40 P</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 8: 🛍️ 열매 상점 (Item Shop)
           ========================================================================= */}
        {activeTab === 'shop' && !visitingFarm && (
          <div className="farm-shop-layout">
            <div className="shop-banner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3>🛍️ 둡박사의 포켓몬 마트</h3>
                  <p>포켓몬 알, 맛있는 나무열매와 목욕 용품, 활력 비타민을 구매하여 포켓몬을 돌보세요!</p>
                </div>
                {/* Shop Category Filter Chips */}
                <div className="gen-filter-chips">
                  {[
                    { id: 'all', label: '전체 상품' },
                    { id: 'egg', label: '🥚 포켓몬 알 & 특수' },
                    { id: 'food', label: '🫐 나무열매/음식' },
                    { id: 'bath', label: '🧼 목욕/청결' },
                    { id: 'toy', label: '⚽ 장난감' },
                    { id: 'medicine', label: '🧪 회복/비타민' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      className={`gen-chip ${shopCategory === f.id ? 'active' : ''}`}
                      onClick={() => setShopCategory(f.id as typeof shopCategory)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="shop-items-grid">
              {FARM_ITEMS.filter(item => {
                if (item.id === 'shiny_stone' || item.id === 'gold_crown') return false; // 탐험 전용 환금 보물은 제외
                if (shopCategory === 'all') return true;
                if (shopCategory === 'egg') return item.id === 'mystery_egg' || item.id === 'golden_egg' || item.id === 'rare_candy';
                return item.category === shopCategory;
              }).map(item => {
                const isSpecialItem = item.id === 'mystery_egg' || item.id === 'golden_egg' || item.id === 'rare_candy';
                const isGolden = item.id === 'golden_egg';
                return (
                  <div key={item.id} className={`shop-item-card ${isGolden ? 'golden-egg-card' : isSpecialItem ? 'special-item-card' : ''}`}>
                    {isGolden && <span className="item-special-badge">🌟 전설&특수</span>}
                    {item.id === 'mystery_egg' && <span className="item-special-badge normal">🥚 일반부화</span>}
                    {item.id === 'rare_candy' && <span className="item-special-badge candy">🍬 즉시+1Lv</span>}
                    <div className="item-icon-box">{item.icon}</div>
                    <h4>{item.name}</h4>
                    <p className="item-desc">{item.description}</p>
                    <div className="item-price-row">
                      <span className="price-tag">🪙 {item.price} P</span>
                      <button className={`excel-btn primary ${isGolden ? 'golden-btn' : ''}`} onClick={() => handleBuyItem(item)}>
                        구매하기
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: 📖 포켓몬 졸업 도감 & 명예의 전당 (Pokedex & Diplomas)
           ========================================================================= */}
        {activeTab === 'diplomas' && (
          renderPokedexContent(displayGraduatedPokemons, displayOwnerName, !!visitingFarm)
        )}

      </div>

      {/* 💼 PART-TIME JOB INTERACTIVE SHIFT MODAL */}
      {jobShiftModal && (
        <div className="farm-modal-overlay">
          <div className="job-shift-modal-card">
            <div className="job-modal-header">
              <div className="job-badge">
                <span className="job-badge-icon">{jobShiftModal.job.icon}</span>
                <strong>{jobShiftModal.job.title}</strong>
              </div>
              {jobShiftModal.isDone && (
                <button className="modal-close-btn" onClick={() => setJobShiftModal(null)}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 🎬 Dynamic Job Stage View */}
            <div className={`job-stage-view stage-${jobShiftModal.job.id}`}>
              {/* Stage Specific Environment Props */}
              {jobShiftModal.job.id === 'job_garden' && (
                <div className="garden-env">
                  <div className="garden-flowerbed">
                    <span className="flower f1">🌸</span>
                    <span className="flower f2">🌻</span>
                    <span className="flower f3">🌷</span>
                    <span className="flower f4">🌼</span>
                    <span className="flower f5">🌹</span>
                  </div>
                  {/* Skill/Tool Action */}
                  {pmon?.types.includes('water') ? (
                    <div className="water-skill-effect">
                      <span className="water-wave">🌊</span>
                      <span className="water-drop d1">💦</span>
                      <span className="water-drop d2">💧</span>
                      <span className="water-drop d3">💦</span>
                    </div>
                  ) : pmon?.types.includes('grass') ? (
                    <div className="grass-skill-effect">
                      <span className="leaf l1">🍃</span>
                      <span className="leaf l2">🌿</span>
                      <span className="leaf l3">✨</span>
                    </div>
                  ) : (
                    <div className="watering-can-tool">
                      <span className="can-icon">🚿</span>
                      <span className="water-drop d1">💧</span>
                      <span className="water-drop d2">💧</span>
                    </div>
                  )}
                </div>
              )}

              {jobShiftModal.job.id === 'job_mail' && (
                <div className="mail-env">
                  <div className="office-hallway-bg">
                    <span className="post-box">📮</span>
                    <span className="mail-parcel p1">📦</span>
                    <span className="mail-parcel p2">✉️</span>
                  </div>
                  {pmon?.types.includes('flying') ? (
                    <div className="flying-courier-effect">
                      <span className="wing-wind">💨</span>
                      <span className="floating-envelope">✉️</span>
                    </div>
                  ) : pmon?.types.includes('psychic') || pmon?.types.includes('ghost') ? (
                    <div className="psychic-courier-effect">
                      <span className="psychic-aura">🔮</span>
                      <span className="floating-box">📦</span>
                    </div>
                  ) : (
                    <div className="dash-courier-effect">
                      <span className="speed-lines">💨💨</span>
                      <span className="courier-bag">🎒</span>
                    </div>
                  )}
                </div>
              )}

              {jobShiftModal.job.id === 'job_coffee' && (
                <div className="coffee-env">
                  <div className="coffee-counter-bg">
                    <span className="espresso-machine">☕</span>
                    <span className="coffee-beans">🫘</span>
                    <span className="coffee-cup">🥤</span>
                  </div>
                  {pmon?.types.includes('fire') ? (
                    <div className="fire-roast-effect">
                      <span className="fire-flame">🔥</span>
                      <span className="coffee-steam">♨️</span>
                    </div>
                  ) : (
                    <div className="drip-coffee-effect">
                      <span className="coffee-pot">🫖</span>
                      <span className="coffee-steam">♨️</span>
                      <span className="coffee-heart">🤎</span>
                    </div>
                  )}
                </div>
              )}

              {jobShiftModal.job.id === 'job_generator' && (
                <div className="generator-env">
                  <div className="server-room-bg">
                    <span className="server-rack">🖥️</span>
                    <span className="battery-icon">🔋</span>
                  </div>
                  {pmon?.types.includes('electric') ? (
                    <div className="lightning-charge-effect">
                      <span className="bolt b1">⚡</span>
                      <span className="bolt b2">⚡</span>
                      <span className="sparkle">✨</span>
                    </div>
                  ) : (
                    <div className="wheel-charge-effect">
                      <span className="gear-spin">⚙️</span>
                      <span className="charge-spark">💡</span>
                    </div>
                  )}
                </div>
              )}

              {jobShiftModal.job.id === 'job_ceo_security' && (
                <div className="security-env">
                  <div className="penthouse-bg">
                    <span className="skyline">🏙️</span>
                    <span className="luxury-desk">💼</span>
                  </div>
                  <div className="security-guard-effect">
                    <span className="sunglasses-icon">🕶️</span>
                    <span className="shield-aura">🛡️</span>
                  </div>
                </div>
              )}

              {/* 🐾 Active Working Pokémon Sprite */}
              <div className={`working-pokemon-wrapper ${jobShiftModal.isDone ? 'done-bounce' : 'working-motion'}`}>
                <img
                  src={pmon?.sprites.showdownFront || pmon?.sprites.front}
                  alt={pmon?.name}
                  className="working-pokemon-sprite"
                />
                <div className="worker-tag">
                  <span>Lv.{pmon?.level} {pmon?.nickname}</span>
                </div>
              </div>
            </div>

            {/* 📊 Work Progress & Status */}
            <div className="job-status-section">
              <div className="status-bubble">
                <p>{jobShiftModal.statusText}</p>
              </div>

              <div className="job-progress-bar-wrap">
                <div className="job-progress-fill" style={{ width: `${jobShiftModal.progress}%` }}>
                  <span className="progress-percent">{jobShiftModal.progress}%</span>
                </div>
              </div>
            </div>

            {/* 💰 Settlement / Actions */}
            {!jobShiftModal.isDone ? (
              <div className="job-working-actions">
                <button
                  className="excel-btn cheer-btn"
                  onClick={() => {
                    setJobShiftModal(prev => prev ? { ...prev, progress: Math.min(99, prev.progress + 20) } : null);
                    if (pmon) playPokemonCry(pmon.speciesId);
                  }}
                >
                  ❤️ 신나게 응원하기! (+속도 UP)
                </button>
              </div>
            ) : (
              <div className="job-salary-receipt">
                <div className="receipt-header">
                  <h4>🧾 아르바이트 급여 정산서</h4>
                  <span>{jobShiftModal.job.title} 완수</span>
                </div>
                <div className="receipt-grid">
                  <div className="receipt-row gain">
                    <span>🪙 수당 지급:</span>
                    <strong>+{jobShiftModal.rewardGained?.coins} P</strong>
                  </div>
                  <div className="receipt-row gain">
                    <span>⭐ 경험치 획득:</span>
                    <strong>+{jobShiftModal.rewardGained?.exp} EXP</strong>
                  </div>
                  <div className="receipt-row cost">
                    <span>⚡ 체력 소모:</span>
                    <span>-{jobShiftModal.job.energyCost}</span>
                  </div>
                  <div className="receipt-row cost">
                    <span>🍎 배고픔 소모:</span>
                    <span>-{jobShiftModal.job.hungerCost}</span>
                  </div>
                </div>
                {jobShiftModal.rewardGained?.levelUp && (
                  <div className="job-levelup-badge">
                    🎊 LEVEL UP! Lv.{jobShiftModal.rewardGained.newLevel} 달성!
                  </div>
                )}
                <button
                  className="excel-btn primary confirm-receipt-btn"
                  onClick={() => setJobShiftModal(null)}
                >
                  💰 급여 수령 및 확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌲 EXPEDITION LIVE STORY MODAL */}
      {expeditionModal && expeditionModal.active && (
        <div className="farm-modal-overlay">
          <div className={`job-shift-modal-card expedition-modal-card ${expeditionModal.stage}`}>
            {/* Modal Header */}
            <div className="job-modal-header">
              <div className="job-badge">
                <span className="job-badge-icon">{expeditionModal.area.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{expeditionModal.area.name} 스토리 탐험대</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    파견 대원: <strong>{pmon?.nickname || '포켓몬'} (Lv.{pmon?.level})</strong>
                  </span>
                </div>
              </div>
              {expeditionModal.stage === 'result' && (
                <button className="modal-close-btn" onClick={() => setExpeditionModal(null)}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Stage View: Walking & Pixel Environment */}
            <div className={`job-stage-view expedition-stage-view stage-${expeditionModal.area.id}`}>
              {/* Background Theme */}
              <div className="expedition-env-decor">
                {expeditionModal.area.id === 'exp_pantry' && (
                  <div className="pantry-decor">
                    <span className="decor-item">☕</span>
                    <span className="decor-item">🍪</span>
                    <span className="decor-item">🧃</span>
                  </div>
                )}
                {expeditionModal.area.id === 'exp_rooftop' && (
                  <div className="rooftop-decor">
                    <span className="decor-item">🌸</span>
                    <span className="decor-item">☀️</span>
                    <span className="decor-item">🌿</span>
                  </div>
                )}
                {expeditionModal.area.id === 'exp_server_room' && (
                  <div className="server-decor">
                    <span className="decor-item">🖥️</span>
                    <span className="decor-item">🗄️</span>
                    <span className="decor-item">⚡</span>
                  </div>
                )}
                {expeditionModal.area.id === 'exp_mountain' && (
                  <div className="mountain-decor">
                    <span className="decor-item">🌲</span>
                    <span className="decor-item">⛰️</span>
                    <span className="decor-item">✨</span>
                  </div>
                )}
              </div>

              {/* Walking Pokemon Sprite */}
              <div className="working-pokemon-wrapper">
                <img
                  src={pmon?.sprites.showdownFront || pmon?.sprites.front}
                  alt="탐험 포켓몬"
                  className={`working-pokemon-sprite ${expeditionModal.stage === 'result' ? 'done-bounce' : 'expedition-walking'}`}
                />
                {expeditionModal.stage === 'walking' && (
                  <div className="expedition-walk-dust">
                    <span>💨</span>
                  </div>
                )}
                <div className="worker-tag">
                  <span>Lv.{pmon?.level} {pmon?.nickname}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="job-progress-bar-wrap">
              <div
                className="job-progress-fill expedition-fill"
                style={{ width: `${expeditionModal.progress}%` }}
              >
                <span className="progress-percent">{Math.round(expeditionModal.progress)}%</span>
              </div>
            </div>

            {/* 🚶 Phase 1: Walking / Heading to Destination */}
            {expeditionModal.stage === 'walking' && (
              <div className="job-status-section">
                <div className="status-bubble">
                  <p>{expeditionModal.statusText}</p>
                </div>
                <div className="walking-dots-indicator" style={{ textAlign: 'center', padding: '6px', fontSize: '0.8rem', color: '#047857', fontWeight: 700 }}>
                  <span>🐾 숲길을 조심스럽게 헤쳐나가는 중...</span>
                </div>
              </div>
            )}

            {/* 💬 Phase 2: Story Dialogue & Choice Encounter Box */}
            {expeditionModal.stage === 'event' && expeditionModal.storyEvent && (
              <div className="story-dialogue-wrapper">
                <div className="story-dialogue-box">
                  {/* Left Portrait */}
                  <div className="story-portrait-frame">
                    <div className="portrait-avatar">{expeditionModal.storyEvent.npcPortrait}</div>
                    <span className="portrait-badge">{expeditionModal.storyEvent.npcBadge}</span>
                  </div>

                  {/* Right Dialogue & Choices */}
                  <div className="story-content">
                    <div className="story-speaker-tag">
                      <strong>{expeditionModal.storyEvent.npcName}</strong>
                      <span className="event-title-sub">{expeditionModal.storyEvent.title}</span>
                    </div>

                    <div className="story-speech-text">
                      {expeditionModal.storyEvent.dialogue.map((line, idx) => (
                        <p key={idx} className="speech-line">"{line}"</p>
                      ))}
                    </div>

                    {/* Interactive Choices */}
                    <div className="story-choices-list">
                      <span className="choices-prompt">❓ 어떻게 행동하시겠습니까? (선택이 운명을 결정합니다!)</span>
                      {expeditionModal.storyEvent.choices.map(choice => (
                        <button
                          key={choice.id}
                          className="story-choice-btn"
                          onClick={() => handleMakeStoryChoice(choice)}
                        >
                          <span className="choice-icon">{choice.icon}</span>
                          <div className="choice-text-col">
                            <strong>{choice.text}</strong>
                            {choice.reqDesc && <span className="choice-hint">{choice.reqDesc}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🎲 Phase 3: Resolving / Dice Roll Animation */}
            {expeditionModal.stage === 'resolving' && (
              <div className="story-resolving-box">
                <div className="dice-rolling-animation">
                  <span className="dice-icon">🎲</span>
                  <h4>주사위 굴리는 중... 운명의 판정!</h4>
                  <p>파트너 <strong>{pmon?.nickname}</strong>의 레벨과 친밀도로 상황을 돌파합니다!</p>
                  <div className="rolling-rate-bar">
                    <span>성공 기준 확률: <strong>{expeditionModal.requiredRoll}%</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* 📜 Phase 4: Day-End Result Report */}
            {expeditionModal.stage === 'result' && expeditionModal.rewardGained && (
              <div className={`job-salary-receipt expedition-receipt grade-${expeditionModal.rewardGained.grade.toLowerCase()}`}>
                <div className="receipt-header">
                  <div className={`story-grade-badge ${expeditionModal.rewardGained.grade.toLowerCase()}`}>
                    {expeditionModal.rewardGained.grade === 'JACKPOT' && '👑 [초특급 잭팟 대성공]'}
                    {expeditionModal.rewardGained.grade === 'SUCCESS' && '🎉 [탐험 스토리 완수 성공]'}
                    {expeditionModal.rewardGained.grade === 'ESCAPE' && '💨 [아슬아슬 줄행랑 탈출]'}
                    {expeditionModal.rewardGained.grade === 'FAIL' && '💥 [작전 실패 & 긴급 퇴각]'}
                  </div>
                  <h4>{expeditionModal.rewardGained.title}</h4>
                </div>

                {/* Resolution Story Narrative */}
                <div className="resolution-narrative-box">
                  <p>"{expeditionModal.resolutionText}"</p>
                </div>

                <div className="receipt-grid">
                  <div className="receipt-row gain">
                    <span>🪙 획득 지원금:</span>
                    <strong>+{expeditionModal.rewardGained.coins} P</strong>
                  </div>
                  <div className="receipt-row gain">
                    <span>✨ 탐험 경험치:</span>
                    <strong>+{expeditionModal.rewardGained.exp} EXP</strong>
                  </div>
                  {expeditionModal.rewardGained.levelUp && (
                    <div className="receipt-row levelup-alert">
                      <span>🎉 레벨업 달성!</span>
                      <strong>Lv.{expeditionModal.rewardGained.newLevel}</strong>
                    </div>
                  )}
                </div>

                {/* Found Items List */}
                {expeditionModal.rewardGained.foundItems.length > 0 ? (
                  <div className="found-items-box">
                    <span className="found-title">🎁 획득한 보물 아이템:</span>
                    <div className="found-items-list">
                      {expeditionModal.rewardGained.foundItems.map((fi, idx) => (
                        <span key={idx} className="found-item-chip">
                          {fi.item.icon} <strong>{fi.item.name}</strong> x{fi.qty}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="no-items-text" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '6px 0', textAlign: 'center' }}>
                    아쉽게도 이번엔 보물 아이템을 건지지 못했습니다.
                  </p>
                )}

                <button
                  className="excel-btn primary claim-shift-btn"
                  onClick={() => setExpeditionModal(null)}
                >
                  🎁 탐험 일지 기록 및 귀환
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🥚 EGG HATCHING DRAMATIC MODAL */}
      {hatchingModal && hatchingModal.active && (
        <div className="farm-modal-overlay">
          <div className={`hatching-modal-box ${hatchingModal.stage}`}>
            <Sparkles size={36} className="hatch-sparkle-icon" />

            {hatchingModal.stage === 'wobble' && (
              <div className="hatch-phase-view">
                <h2>어라...?! 알의 상태가...!</h2>
                <div className="hatch-egg-pod wobble">
                  <span className="pod-egg-graphic">{hatchingModal.isGolden ? '🌟' : '🥚'}</span>
                </div>
                <p>알이 따스한 온기를 뿜으며 기우뚱기우뚱 흔들리고 있습니다...!</p>
              </div>
            )}

            {hatchingModal.stage === 'crack' && (
              <div className="hatch-phase-view">
                <h2>금이 가기 시작했다...!!</h2>
                <div className="hatch-egg-pod crack">
                  <span className="pod-egg-graphic">{hatchingModal.isGolden ? '🌟' : '🥚'}</span>
                  <div className="crack-burst-lines">💥✨⚡</div>
                </div>
                <p>알 껍질 사이로 눈부신 빛이 새어 나옵니다...!</p>
              </div>
            )}

            {hatchingModal.stage === 'hatched' && hatchingModal.babyPokemon && (
              <div className="hatch-phase-view hatched">
                <h2>축하합니다! 새로운 생명이 탄생했습니다! 🎉</h2>
                <div className="hatched-baby-pod">
                  <img
                    src={hatchingModal.babyPokemon.sprites.showdownFront || hatchingModal.babyPokemon.sprites.front}
                    alt="아기 포켓몬"
                    className="hatched-baby-sprite"
                  />
                  {hatchingModal.babyPokemon.isShiny && (
                    <span className="shiny-badge-floating">✨ SHINY!</span>
                  )}
                </div>

                <div className="hatched-details">
                  <h3>
                    [{hatchingModal.babyPokemon.name}]이(가) 알에서 태어났습니다!
                  </h3>
                  <div className="hatched-types-row">
                    {hatchingModal.babyPokemon.types.map(t => (
                      <span key={t} className={`type-tag ${t}`}>{t}</span>
                    ))}
                  </div>

                  <div className="hatched-name-input-box">
                    <label>✨ 아기 포켓몬 닉네임 설정:</label>
                    <input
                      type="text"
                      value={hatchingModal.nicknameInput}
                      onChange={e => setHatchingModal({ ...hatchingModal, nicknameInput: e.target.value })}
                      placeholder={hatchingModal.babyPokemon.name}
                      maxLength={100}
                    />
                  </div>

                  <div className="hatched-action-buttons">
                    <button
                      className="excel-btn primary choice-btn"
                      onClick={() => handleConfirmHatch('setActive')}
                    >
                      ⭐ 지금 바로 내 대표 파트너로 교체!
                    </button>
                    <button
                      className="excel-btn choice-btn"
                      onClick={() => handleConfirmHatch('sendToReserve')}
                    >
                      🏡 보육소 목장에 등록하기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✨ EVOLUTION DRAMATIC MODAL */}
      {evolvingModal && (
        <div className="farm-modal-overlay">
          <div className={`evolution-modal-box ${evolvingModal.stage}`}>
            <Sparkles size={36} className="evolve-sparkle-icon" />
            {evolvingModal.stage === 'flashing' ? (
              <>
                <h2>어라...? [{evolvingModal.oldName}]의 상태가...!</h2>
                <div className="evolving-glow-circle">
                  <img src={evolvingModal.sprite} alt="진화 중" className="glow-sprite" />
                </div>
                <p>포켓몬이 눈부신 빛에 휩싸이고 있습니다...!</p>
              </>
            ) : (
              <>
                <h2>축하합니다! [{evolvingModal.newName}](으)로 진화했습니다!</h2>
                <div className="evolved-sprite-box">
                  <img src={evolvingModal.sprite} alt="진화 완료" className="evolved-sprite" />
                </div>
                <button className="excel-btn primary" onClick={() => { setEvolvingModal(null); setActiveTab('yard'); }}>
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🎓 GRADUATION DIPLOMA MODAL */}
      {(graduatingModal || selectedDiploma) && (() => {
        const dip = graduatingModal || selectedDiploma;
        if (!dip) return null;
        const chain = getEvolutionChainForDiploma(dip);
        const activeForm = getDiplomaActiveSprite(dip);

        return (
          <div className="farm-modal-overlay" onClick={() => { setGraduatingModal(null); setSelectedDiploma(null); }}>
            <div className="diploma-modal-frame" onClick={e => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => { setGraduatingModal(null); setSelectedDiploma(null); }}>
                <X size={16} />
              </button>
              <div className="diploma-inner-certificate">
                <div className="cert-header">
                  <div className="cert-seal">🎓</div>
                  <h2>포 켓 농 장 졸 업 증 서</h2>
                  <span className="cert-no">제 {(dip.id || '').substring(0, 12)} 호</span>
                </div>

                <div className="cert-body">
                  <img
                    src={activeForm.sprite}
                    alt={activeForm.name}
                    className="cert-pokemon-sprite"
                    onError={(e) => {
                      e.currentTarget.src = activeForm.fallbackSprite || dip.sprite;
                    }}
                  />
                  <div className="cert-name-block">
                    <strong>포켓몬: {dip.nickname} ({dip.name}) {activeForm.name !== dip.name ? `[현재 외형: ${activeForm.name}]` : ''}</strong>
                    <span>육성 농장주: {dip.ownerName}</span>
                  </div>

                  {/* 🌱 미니룸 표시 모습 변경 (진화 전/후 폼 선택) */}
                  {chain.length > 1 && !visitingFarm && (
                    <div className="cert-form-selector-box">
                      <span className="cert-form-title">🌱 미니룸 표시 모습 변경 (진화 전/후):</span>
                      <div className="cert-form-buttons">
                        {chain.map((st, sIdx) => {
                          const isCur = activeForm.formIndex === sIdx;
                          return (
                            <button
                              key={st.id || sIdx}
                              type="button"
                              className={`cert-stage-btn ${isCur ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDiplomaForm(dip.id, sIdx);
                              }}
                              title={`${st.name} 모습으로 미니룸에 표시`}
                            >
                              <img
                                src={st.sprite}
                                alt={st.name}
                                onError={(e) => {
                                  e.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${st.id}.png`;
                                }}
                              />
                              <span>{sIdx === 0 ? '🐣 기본' : sIdx === chain.length - 1 ? '👑 최종' : `⚡ ${sIdx + 1}단`}: {st.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className="cert-text">
                    위 포켓몬은 포켓농장에서 지극한 사랑과 정성으로 훌륭하게 성장하여
                    모든 교육 및 진화 과정을 완벽히 수료하였으므로, 본 명예 졸업 증서를 수여합니다.
                  </p>
                  <div className="cert-footer">
                    <span>졸업일시: {dip.graduatedAt}</span>
                    <strong className="cert-principal">포켓농장 학장 김두부 (인)</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🔴 몬스터볼 등장 애니메이션 모달 ("짜잔!" 이펙트) */}
      {adoptRevealModal && adoptRevealModal.active && (
        <div className="farm-modal-backdrop pokeball-reveal-backdrop">
          <div className={`pokeball-reveal-card stage-${adoptRevealModal.stage}`}>
            {/* 닫기 버튼 */}
            {adoptRevealModal.stage === 'emerge' && (
              <button className="modal-close-btn" onClick={() => setAdoptRevealModal(null)}>✕</button>
            )}

            {/* 1. 몬스터볼 흔들림 & 빛 발산 스테이지 */}
            {adoptRevealModal.stage !== 'emerge' ? (
              <div className="pokeball-opening-container">
                <div className="pokeball-glow-rays" />
                <div className={`pokeball-grand-model ${adoptRevealModal.stage === 'wobble' ? 'is-wobbling' : 'is-bursting'}`}>
                  <svg viewBox="0 0 100 100" className="pokeball-svg-modal">
                    <defs>
                      <radialGradient id="modalPokeTop" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#ff7878" />
                        <stop offset="45%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#991b1b" />
                      </radialGradient>
                      <radialGradient id="modalPokeBot" cx="35%" cy="65%" r="70%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="60%" stopColor="#f1f5f9" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                      </radialGradient>
                      <radialGradient id="modalPokeBtn" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="70%" stopColor="#e2e8f0" />
                        <stop offset="100%" stopColor="#94a3b8" />
                      </radialGradient>
                    </defs>
                    <circle cx="50" cy="50" r="46" fill="#0f172a" stroke="#020617" strokeWidth="4" />
                    <g className={`pokeball-top-half ${adoptRevealModal.stage === 'burst' ? 'top-fly-open' : ''}`}>
                      <path d="M 6 50 A 44 44 0 0 1 94 50 Z" fill="url(#modalPokeTop)" />
                      <ellipse cx="38" cy="24" rx="14" ry="7" fill="white" opacity="0.45" transform="rotate(-20 38 24)" />
                    </g>
                    <g className={`pokeball-bottom-half ${adoptRevealModal.stage === 'burst' ? 'bottom-lower' : ''}`}>
                      <path d="M 6 50 A 44 44 0 0 0 94 50 Z" fill="url(#modalPokeBot)" />
                    </g>
                    <rect x="6" y="46" width="88" height="8" fill="#0f172a" />
                    <circle cx="50" cy="50" r="14" fill="#0f172a" />
                    <circle cx="50" cy="50" r="10" fill="url(#modalPokeBtn)" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="5" fill="#facc15" className="pokeball-core-btn-pulsing" />
                  </svg>
                </div>
                {adoptRevealModal.stage === 'burst' && (
                  <div className="pokeball-blinding-burst">
                    <div className="burst-light-ring" />
                    <div className="burst-sparkle-stars">✨ 🌟 ⭐ 💫 💥</div>
                  </div>
                )}
                <div className="pokeball-status-text">
                  {adoptRevealModal.stage === 'wobble' ? (
                    <p className="wobble-text">🔴 몬스터볼이 반응하며 흔들리고 있습니다...!</p>
                  ) : (
                    <p className="burst-text">✨ 눈부신 빛과 함께 몬스터볼이 열립니다...!</p>
                  )}
                </div>
              </div>
            ) : (
              /* 2. "짜잔! ✨" 포켓몬 등장 스테이지 */
              <div className="pokemon-emerged-container">
                <div className="emerge-fanfare-header">
                  <div className="fanfare-badge">🎉 짜잔! 포켓몬 등장!</div>
                  <h2>{adoptRevealModal.baby.name}</h2>
                  <div className="type-badge-row">
                    {adoptRevealModal.baby.types.map(t => (
                      <span key={t} className="type-tag">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="emerged-sprite-stage">
                  <div className="emerge-light-pillar" />
                  <div className="emerge-particle-burst">✨ 🌟 ✨ ⭐ 💫</div>
                  <img
                    src={adoptRevealModal.baby.showdownSprite || adoptRevealModal.baby.sprite}
                    alt={adoptRevealModal.baby.name}
                    className="emerged-showdown-sprite bounce"
                  />
                </div>

                <div className="emerge-evolution-chain">
                  <span>진화 경로: {adoptRevealModal.chain.map(c => c.name).join(' ➔ ')}</span>
                </div>

                <div className="emerge-nickname-row">
                  <label>✨ 애칭 (닉네임 설정):</label>
                  <input
                    type="text"
                    className="dubuworld-input"
                    value={adoptRevealModal.nickname}
                    onChange={(e) => setAdoptRevealModal(prev => prev ? { ...prev, nickname: e.target.value } : null)}
                    placeholder={`기본값: ${adoptRevealModal.baby.name}`}
                    maxLength={30}
                  />
                </div>

                <div className="emerge-action-buttons">
                  <button
                    className="excel-btn primary pulse-btn-large"
                    onClick={() => handleConfirmAdoption(adoptRevealModal.nickname)}
                  >
                    💖 우리 농장으로 입양하기!
                  </button>
                  <button
                    className="excel-btn"
                    onClick={() => setAdoptRevealModal(null)}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔒 비밀번호 변경 모달 */}
      {showChangePasswordModal && (
        <div className="farm-modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
          <div className="farm-modal-dialog change-pw-modal" onClick={e => e.stopPropagation()}>
            <div className="farm-modal-header">
              <h3>🔒 농장 비밀번호 변경</h3>
              <button className="modal-close-btn" onClick={() => setShowChangePasswordModal(false)}>✕</button>
            </div>
            <form onSubmit={handleChangePasswordSubmit} className="change-pw-form">
              <p className="modal-desc">
                [<b>{farmState.ownerName}</b>] 농장의 새로운 비밀번호를 설정합니다.
              </p>

              {changePasswordError && (
                <div className="auth-error-banner">⚠️ {changePasswordError}</div>
              )}

              <div className="onboarding-input-group">
                <label>현재 비밀번호 (기존에 설정된 경우)</label>
                <input
                  type={showChangePassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="현재 비밀번호 (최초 설정 시 비워두기 가능)"
                />
              </div>

              <div className="onboarding-input-group">
                <div className="input-label-row">
                  <label>새 비밀번호 (최소 4자)</label>
                  <button
                    type="button"
                    className="toggle-pw-btn"
                    onClick={() => setShowChangePassword(prev => !prev)}
                  >
                    {showChangePassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <input
                  type={showChangePassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  required
                  minLength={4}
                />
              </div>

              <div className="onboarding-input-group">
                <label>새 비밀번호 확인</label>
                <input
                  type={showChangePassword ? 'text' : 'password'}
                  value={newPasswordConfirm}
                  onChange={e => setNewPasswordConfirm(e.target.value)}
                  placeholder="새 비밀번호 다시 입력"
                  required
                  minLength={4}
                />
              </div>

              <div className="modal-actions-row">
                <button type="button" className="excel-btn" onClick={() => setShowChangePasswordModal(false)}>
                  취소
                </button>
                <button type="submit" className="excel-btn primary" disabled={isChangingPassword}>
                  {isChangingPassword ? '변경 중...' : '비밀번호 변경하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚪 로그아웃 확인 모달 */}
      {showLogoutConfirm && (
        <div className="farm-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="farm-modal-dialog logout-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="farm-modal-header">
              <h3>🚪 농장 로그아웃</h3>
              <button className="modal-close-btn" onClick={() => setShowLogoutConfirm(false)}>✕</button>
            </div>
            <div className="logout-modal-body">
              <div className="logout-icon">👋</div>
              <p className="logout-confirm-text">
                [<b>{farmState.ownerName}</b>]님의 농장에서 로그아웃하시겠습니까?
              </p>
              <p className="logout-sub-text">
                농장 데이터는 서버 데이터베이스에 안전하게 영구 보관되며, 언제든지 어느 기기에서든 아이디와 비밀번호로 다시 로그인할 수 있습니다.
              </p>
              <div className="modal-actions-row">
                <button type="button" className="excel-btn" onClick={() => setShowLogoutConfirm(false)}>
                  계속 플레이하기
                </button>
                <button type="button" className="excel-btn close" onClick={handleLogout}>
                  🚪 로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
