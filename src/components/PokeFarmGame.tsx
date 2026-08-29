import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import type { FarmState, FarmPokemon, FarmItem, PartTimeJob, GraduationDiploma, EvolutionStage, GuestbookEntry, ExpeditionArea, IncubatingEgg, MinihompySticker, NeighborFarmData } from '../types/farm';
import { 
  STARTER_CHAINS, 
  FARM_ITEMS, 
  FARM_JOBS, 
  EXPEDITION_AREAS,
  LOTTERY_SYMBOLS,
  drawLotteryReels,
  loadFarmState, 
  saveFarmState, 
  createNewFarmPokemon, 
  hatchBabyPokemon,
  playPokemonCry,
  getMaxExpForLevel,
  getAllPokedexEntries,
  getAllStoredFarms
} from '../services/pokeFarmService';
import { 
  Sparkles, Trophy, Volume2, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import './PokeFarmGame.css';

interface PokeFarmGameProps {
  username: string;
  onLeaveRoom?: () => void;
  initialVisitingUser?: string | null;
  onClearInitialVisitingUser?: () => void;
  onSelectGame?: (gameKey: string) => void;
}

type FarmTab = 'minihome' | 'yard' | 'arcade' | 'neighbors' | 'adopt' | 'evolve' | 'jobs' | 'expedition' | 'daycare' | 'lottery' | 'shop' | 'diplomas';

export const ARCADE_GAMES = [
  { key: 'pokebattle', name: '포켓몬 3v3 배틀', icon: '⚡', desc: '3대3 턴제 실시간 포켓몬 대전 & 상성 배틀', badge: 'HOT', color: '#ef4444' },
  { key: 'tetris', name: '포켓 테트리스', icon: '🧱', desc: '점수 기록, AI & 친구 1:1 대전, 아이템전 & 실시간 배틀', badge: 'HOT', color: '#6366f1' },
  { key: 'catchmind', name: '캐치마인드', icon: '🎨', desc: '실시간 그림 그리고 단어 맞추기 멀티 게임', badge: 'POPULAR', color: '#3b82f6' },
  { key: 'mafia', name: '마피아 게임', icon: '🕵️', desc: '직업 부여, 밤/낮 투표, 심리 추리 생존전', badge: 'MULTI', color: '#8b5cf6' },
  { key: 'liar', name: '라이어 게임', icon: '🤥', desc: '제시어를 모르는 라이어를 찾는 심리 단어게임', badge: 'PARTY', color: '#ec4899' },
  { key: 'telestrations', name: '텔레스트레이션', icon: '📝', desc: '그림 릴레이! 그리고 맞추는 릴레이 스케치', badge: 'FUN', color: '#f59e0b' },
  { key: 'numberbaseball', name: '숫자야구', icon: '⚾', desc: '3자리 숫자 추리! 스트라이크 & 볼 수리 검증', badge: 'LOGIC', color: '#10b981' },
  { key: 'sudoku', name: '스도쿠 퍼즐', icon: '🧩', desc: '9x9 행렬 스도쿠 퍼즐 마스터 & 타임어택', badge: 'PUZZLE', color: '#06b6d4' },
  { key: 'minesweeper', name: '지뢰찾기', icon: '💣', desc: '클래식 지뢰 탐지 & 그리드 생존 게임', badge: 'RETRO', color: '#f97316' },
  { key: 'wordle', name: '워들 (Wordle)', icon: '🔤', desc: '5글자 비밀 단어 추정 퍼즐', badge: 'WORD', color: '#64748b' }
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

// 🎓 졸업생 포켓몬 진화 체인 탐색 헬퍼 (진화 전/후 모든 모습 지원)
export const getEvolutionChainForDiploma = (diploma: GraduationDiploma): EvolutionStage[] => {
  if (diploma.evolutionChain && diploma.evolutionChain.length > 0) {
    return diploma.evolutionChain;
  }
  // STARTER_CHAINS에서 speciesId 또는 name으로 탐색
  const found = STARTER_CHAINS.find(chain =>
    chain.some(st => st.id === diploma.speciesId || st.name === diploma.name || diploma.name.includes(st.name))
  );
  if (found) return found;

  // 단일 stage fallback
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

// 🎓 졸업생의 현재 선택된 외형 스프라이트 및 이름 반환 헬퍼
export const getDiplomaActiveSprite = (diploma: GraduationDiploma): { sprite: string; name: string; formIndex: number } => {
  const chain = getEvolutionChainForDiploma(diploma);
  const maxIdx = chain.length - 1;
  const formIdx = diploma.selectedFormIndex !== undefined ? Math.min(Math.max(0, diploma.selectedFormIndex), maxIdx) : maxIdx;
  const currentStage = chain[formIdx] || chain[maxIdx] || chain[0];

  let spr = currentStage.showdownSprite || currentStage.sprite || diploma.sprite;
  if (diploma.isShiny && currentStage.id) {
    spr = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${currentStage.id}.gif`;
  }

  return {
    sprite: spr,
    name: currentStage.name || diploma.name,
    formIndex: formIdx
  };
};

export const PokeFarmGame: React.FC<PokeFarmGameProps> = ({ username, onLeaveRoom, initialVisitingUser, onClearInitialVisitingUser, onSelectGame }) => {
  const { socket } = useSocket();

  // 농장 전체 로컬 상태
  const [farmState, setFarmState] = useState<FarmState>(() => loadFarmState(username));
  const [activeTab, setActiveTab] = useState<FarmTab>('minihome');

  // 💖 오늘 보낸 1촌 하트 횟수 (하루 최대 5회 제한)
  const [todayHeartsSent, setTodayHeartsSent] = useState<number>(() => getTodayHeartCountLocal(farmState.ownerName || username || '지우'));

  // 🐣 온보딩 위저드 상태 (농장주 이름 입력 ➔ 스타팅 포켓몬 선택)
  const [onboardingStep, setOnboardingStep] = useState<'name' | 'starter'>('name');
  const [initOwnerName, setInitOwnerName] = useState(username || '지우');
  const [initFarmName, setInitFarmName] = useState(`${username || '지우'}의 포켓농장`);
  const [selectedStarterIdx, setSelectedStarterIdx] = useState(0);
  const [starterNickname, setStarterNickname] = useState('');
  const [genFilter, setGenFilter] = useState<'all' | 'gen1-2' | 'gen3-4' | 'gen5-6' | 'gen7-9' | 'special'>('all');

  // 애니메이션 & 이펙트 상태
  const [floatingHeart, setFloatingHeart] = useState<{ id: number; x: number; y: number } | null>(null);
  const [actionAlert, setActionAlert] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [evolvingModal, setEvolvingModal] = useState<{ active: boolean; stage: 'flashing' | 'done'; oldName: string; newName: string; sprite: string } | null>(null);
  const [graduatingModal, setGraduatingModal] = useState<GraduationDiploma | null>(null);
  const [selectedDiploma, setSelectedDiploma] = useState<GraduationDiploma | null>(null);

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

  // 🌲 사내 탐험 진행 애니메이션 모달 상태
  const [expeditionModal, setExpeditionModal] = useState<{
    active: boolean;
    area: ExpeditionArea;
    progress: number;
    statusText: string;
    isDone: boolean;
    rewardGained: {
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
    icon: string;
    particles: string[];
  } | null>(null);
  const [isPetJumping, setIsPetJumping] = useState(false);

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
  const [minihompyTab, setMinihompyTab] = useState<'home' | 'miniroom' | 'arcade' | 'guestbook' | 'stickers' | 'neighbors'>('home');
  const [currentBgmSong, setCurrentBgmSong] = useState(farmState.bgmSong || '프리스타일 - Y (Feat. 지선)');
  const [isPlayingBgm, setIsPlayingBgm] = useState(false);

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
  const [decorSubtab, setDecorSubtab] = useState<'palette' | 'textmaker' | 'pokeplacements'>('palette');

  // 🌐 소켓 및 로컬 실제 유저 농장 동기화
  useEffect(() => {
    // 1. 브라우저 로컬스토리지에 저장된 실제 유저 농장 로드
    const storedFarms = getAllStoredFarms();
    setNeighborList(storedFarms);

    if (!socket) return;

    // 2. 서버에 내 농장 정보 동기화 및 전체 활성 농장 목록 요청
    if (farmState.isInitialized && farmState.ownerName) {
      socket.emit('farm-sync', { username: farmState.ownerName, farmData: farmState });
    }
    socket.emit('farm-get-list');

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
      }
    };

    const handleHeartReceived = ({ targetUsername, senderUsername, heartsCount, rewardCoins }: { targetUsername: string; senderUsername?: string; heartsCount: number; rewardCoins?: number }) => {
      if (targetUsername === farmState.ownerName) {
        const bonus = rewardCoins || 100;
        setFarmState(prev => ({
          ...prev,
          heartsCount,
          coins: prev.coins + bonus
        }));
        showAlert(`💖 [${senderUsername || '1촌 이웃'}]님이 내 농장에 응원 하트를 선물했습니다! (+${bonus} 코인 획득 🪙)`, 'success');
        setFloatingHeart({ id: Date.now(), x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
      if (visitingFarm && visitingFarm.owner === targetUsername) {
        setVisitingFarm(prev => prev ? { ...prev, farm: { ...prev.farm, heartsCount } } : null);
      }
    };

    const handleHeartSentSuccess = (data: { targetUsername: string; heartsCount: number; senderRewardCoins: number; todaySent: number; remainingHearts: number }) => {
      setTodayHeartsSent(data.todaySent);
      setTodayHeartCountLocal(farmState.ownerName, data.todaySent);
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
      if (res.success && res.farm) {
        setFarmState(prev => {
          const gradCount = res.farm.graduatedPokemon ? res.farm.graduatedPokemon.length : 0;
          showAlert(`🎉 서버 DB에서 [${res.farm.username || res.farm.ownerName}]님의 포켓농장 데이터(졸업생 ${gradCount}마리, 파트너 등)를 성공적으로 복원했습니다!`, 'success');
          return {
            ...prev,
            ...res.farm,
            ownerName: res.farm.username || prev.ownerName,
            isInitialized: true,
            todayCount: res.farm.todayCount !== undefined ? res.farm.todayCount : prev.todayCount,
            totalCount: res.farm.totalCount !== undefined ? res.farm.totalCount : prev.totalCount,
            heartsCount: res.farm.heartsCount !== undefined ? res.farm.heartsCount : prev.heartsCount,
            guestbook: res.guestbook || prev.guestbook || []
          };
        });
        setActiveTab('minihome');
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
    };
  }, [socket, farmState.ownerName, farmState.isInitialized]);

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

  // 이웃 미니홈피 놀러가기/구경가기
  const handleVisitNeighbor = (neighborUsername: string) => {
    if (!neighborUsername) return;
    if (neighborUsername === farmState.ownerName) {
      setVisitingFarm(null);
      setActiveTab('minihome');
      showAlert('내 포켓 미니홈피로 이동했습니다! 🏠', 'info');
      return;
    }

    if (socket && socket.connected) {
      socket.emit('farm-visit-request', { targetUsername: neighborUsername, visitorUsername: farmState.ownerName });
    }

    // 1. 로컬에 저장된 실제 유저 데이터 확인
    const targetSaved = loadFarmState(neighborUsername);
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
      showAlert(`🏠 [${targetSaved.farmName}] 미니홈피 구경을 시작합니다!`, 'success');
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
      showAlert(`🏠 [${foundNeighbor.farmName}] 미니홈피 구경을 시작합니다!`, 'success');
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
      const existing = prev.pokemonPlacements?.[id] || { uid: id, x: 45, y: 52, scale: 1, flipped: false, rotation: 0, tiltX: 0 };
      return {
        ...prev,
        pokemonPlacements: {
          ...(prev.pokemonPlacements || {}),
          [id]: { ...existing, flipped: !existing.flipped }
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
    setFarmState(prev => {
      const nextGrad = prev.graduatedPokemon.map(d => {
        if (d.id === diplomaId) {
          const chain = getEvolutionChainForDiploma(d);
          const stage = chain[formIndex] || chain[chain.length - 1];
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
      if (prev && prev.id === diplomaId) {
        const chain = getEvolutionChainForDiploma(prev);
        const stage = chain[formIndex] || chain[chain.length - 1];
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
    showAlert('✨ 졸업생 포켓몬의 미니룸 외형 모습이 변경되었습니다!', 'success');
  };

  // 포켓몬 위치 조회 헬퍼
  const getPokemonPlacement = (
    id: string,
    defaultX: number,
    defaultY: number,
    defaultScale = 1,
    defaultFlipped = false,
    defaultRotation = 0,
    defaultTiltX = 0
  ) => {
    const placements = visitingFarm ? visitingFarm.farm.pokemonPlacements : farmState.pokemonPlacements;
    const custom = placements?.[id];
    if (custom) {
      return {
        x: custom.x,
        y: custom.y,
        scale: custom.scale !== undefined ? custom.scale : defaultScale,
        flipped: custom.flipped !== undefined ? custom.flipped : defaultFlipped,
        rotation: custom.rotation !== undefined ? custom.rotation : defaultRotation,
        tiltX: custom.tiltX !== undefined ? custom.tiltX : defaultTiltX,
        tiltY: custom.tiltY !== undefined ? custom.tiltY : 0
      };
    }
    return {
      x: defaultX,
      y: defaultY,
      scale: defaultScale,
      flipped: defaultFlipped,
      rotation: defaultRotation,
      tiltX: defaultTiltX,
      tiltY: 0
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
            const place = getPokemonPlacement(id, 45, 52, 1, false, 0, 0);
            const isSelected = selectedDecorItem?.type === 'pokemon' && selectedDecorItem.id === id;
            const isDragging = dragState?.type === 'pokemon' && dragState.id === id;

            return (
              <div
                key="mon_active"
                className={`miniroom-pokemon free-drag ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${place.x}%`,
                  top: `${place.y}%`,
                  transform: `scale(${place.scale}) ${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${place.tiltY || 0}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: isDragging ? 50 : isSelected ? 40 : 20
                }}
                onPointerDown={(e) => handleStartDrag(e, 'pokemon', id, place.x, place.y)}
                title="드래그 이동 / 클릭하여 360도 회전 & 각도 조절!"
              >
                <div className={`pokemon-name-tag ${place.flipped ? 'unflip-tag' : ''}`}>
                  <span className="tag-lvl">Lv.{displayActivePokemon.level}</span>
                  <span className="tag-name">{displayActivePokemon.nickname || displayActivePokemon.name}</span>
                </div>
                <img
                  src={displayActivePokemon.sprites.showdownFront || displayActivePokemon.sprites.front}
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
            const place = getPokemonPlacement(id, defX, defY, 0.9, defFlip, 0, 0);
            const isSelected = selectedDecorItem?.type === 'pokemon' && selectedDecorItem.id === id;
            const isDragging = dragState?.type === 'pokemon' && dragState.id === id;

            return (
              <div
                key={mon.uid || idx}
                className={`miniroom-pokemon free-drag ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${place.x}%`,
                  top: `${place.y}%`,
                  transform: `scale(${place.scale}) ${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${place.tiltY || 0}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: isDragging ? 50 : isSelected ? 40 : 18
                }}
                onPointerDown={(e) => handleStartDrag(e, 'pokemon', id, place.x, place.y)}
                title="드래그 이동 / 클릭하여 360도 회전 & 각도 조절!"
              >
                <div className={`pokemon-name-tag compact ${place.flipped ? 'unflip-tag' : ''}`}>
                  <span>{mon.nickname || mon.name}</span>
                </div>
                <img
                  src={mon.sprites.showdownFront || mon.sprites.front}
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
            const place = getPokemonPlacement(id, defX, defY, 0.85, defFlip, 0, 0);
            const isSelected = selectedDecorItem?.type === 'pokemon' && selectedDecorItem.id === id;
            const isDragging = dragState?.type === 'pokemon' && dragState.id === id;
            const activeForm = getDiplomaActiveSprite(dip);

            return (
              <div
                key={dip.id || idx}
                className={`miniroom-pokemon free-drag ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${place.x}%`,
                  top: `${place.y}%`,
                  transform: `scale(${place.scale}) ${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg) rotateY(${place.tiltY || 0}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: isDragging ? 50 : isSelected ? 40 : 16
                }}
                onPointerDown={(e) => handleStartDrag(e, 'pokemon', id, place.x, place.y)}
                onClick={() => !dragState && setSelectedDiploma(dip)}
                title={`🎓 명예 졸업생 [${dip.nickname || dip.name}] - 현재 외형: ${activeForm.name} (드래그 이동 / 클릭 졸업증서 & 외형 변경)`}
              >
                <div className={`graduated-badge-tag ${place.flipped ? 'unflip-tag' : ''}`}>
                  🎓 {dip.nickname || dip.name} {activeForm.name !== (dip.nickname || dip.name) ? `(${activeForm.name})` : ''}
                </div>
                <img
                  src={activeForm.sprite}
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
                className={`miniroom-placed-item ${stk.text ? 'text-item' : 'sticker-item'} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  left: `${stk.x}%`,
                  top: `${stk.y}%`,
                  transform: `scale(${scale}) ${flipped ? 'scaleX(-1)' : ''} rotate(${rot}deg) rotateX(${tilt}deg)`,
                  transformOrigin: 'center center',
                  zIndex: isDragging ? 60 : isSelected ? 45 : 25
                }}
                onPointerDown={(e) => handleStartDrag(e, 'sticker', stk.id, stk.x, stk.y)}
              >
                {/* 1. 자유 텍스트 & 말풍선 */}
                {stk.text ? (
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
                  /* 2. 이모지/아이콘 스티커 */
                  <span className="stk-icon">{stk.icon}</span>
                )}

                {/* 개별 삭제 버튼 */}
                {!visitingFarm && (
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
            ? getPokemonPlacement(id, 45, 52, 1, false, 0, 0)
            : (farmState.stickers || []).find(s => s.id === id);
          const curRot = (isPokemon ? curPlacement?.rotation : (curPlacement as MinihompySticker)?.rotation) || 0;
          const curTilt = (isPokemon ? curPlacement?.tiltX : (curPlacement as MinihompySticker)?.tiltX) || 0;

          return (
            <div className="miniroom-item-editor-bar">
              <div className="editor-top-line">
                <span className="editor-target-name">
                  {isPokemon ? '🐾 포켓몬 미세 회전 & 연출' : '🎨 스티커/텍스트 회전 & 연출'}
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
                    title="바라보는 방향 반전"
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

                {/* 2. 🔄 360도 2D 평면 미세 회전 (Z축) */}
                <div className="control-row">
                  <span className="control-title">🔄 360° 회전:</span>
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
                    title="360도 미세 회전 조작"
                  />
                  <span className="angle-badge">{curRot}°</span>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleRotatePokemon(id, 5) : handleRotateSticker(id, 5)}>↷ +5°</button>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleRotatePokemon(id, 15) : handleRotateSticker(id, 15)}>↷ +15°</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonRotation(id, 0) : handleSetStickerRotation(id, 0)}>0° 정면</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonRotation(id, 45) : handleSetStickerRotation(id, 45)}>45°</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonRotation(id, 90) : handleSetStickerRotation(id, 90)}>90°</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonRotation(id, 180) : handleSetStickerRotation(id, 180)}>180°</button>
                </div>

                {/* 3. 📐 앞뒤 3D 입체 기울기 / 눕힘 (X축 Tilt) */}
                <div className="control-row">
                  <span className="control-title">📐 앞뒤 3D 눕힘:</span>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleTiltPokemonX(id, -10) : handleTiltStickerX(id, -10)}>⬆️ 앞 -10°</button>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    step="2"
                    value={curTilt}
                    onChange={e => isPokemon ? handleSetPokemonTiltX(id, Number(e.target.value)) : handleSetStickerTiltX(id, Number(e.target.value))}
                    className="angle-range-slider"
                    title="앞뒤 3D 기울기 (-60도 ~ +60도)"
                  />
                  <span className="angle-badge">{curTilt > 0 ? `+${curTilt}°` : `${curTilt}°`}</span>
                  <button className="editor-btn nudge-btn" onClick={() => isPokemon ? handleTiltPokemonX(id, 10) : handleTiltStickerX(id, 10)}>⬇️ 뒤 +10°</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonTiltX(id, 0) : handleSetStickerTiltX(id, 0)}>수평 0°</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonTiltX(id, -30) : handleSetStickerTiltX(id, -30)}>앞으로 -30°</button>
                  <button className="editor-btn mini" onClick={() => isPokemon ? handleSetPokemonTiltX(id, 30) : handleSetStickerTiltX(id, 30)}>뒤로 +30°</button>
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
    saveFarmState(farmState);
    if (socket && socket.connected && farmState.isInitialized && farmState.ownerName) {
      socket.emit('farm-sync', {
        username: farmState.ownerName,
        farmData: {
          farmName: farmState.farmName,
          activePokemon: farmState.activePokemon,
          reservePokemon: farmState.reservePokemon,
          graduatedPokemon: farmState.graduatedPokemon,
          graduatedCount: farmState.graduatedPokemon ? farmState.graduatedPokemon.length : 0,
          heartsCount: farmState.heartsCount,
          guestbook: farmState.guestbook,
          bgTheme: farmState.bgTheme,
          stickers: farmState.stickers,
          pokemonPlacements: farmState.pokemonPlacements,
          statusMsg: farmState.statusMsg,
          bgmSong: farmState.bgmSong,
          todayCount: farmState.todayCount,
          totalCount: farmState.totalCount
        }
      });
    }
  }, [farmState, socket]);

  // 소켓 이벤트 수신
  useEffect(() => {
    if (!socket) return;

    socket.emit('farm-get-list');

    socket.on('farm-list-update', (list: NeighborFarmData[]) => {
      setNeighborList(list.filter(item => item.username !== farmState.ownerName));
    });

    socket.on('farm-visit-data', (data: { success: boolean; farm: NeighborFarmData; guestbook: GuestbookEntry[] }) => {
      if (data.success && data.farm) {
        setVisitingFarm({
          owner: data.farm.username,
          farm: data.farm,
          guestbook: data.guestbook
        });
      }
    });

    socket.on('farm-heart-received', (data: { targetUsername: string; senderUsername: string; heartsCount: number }) => {
      if (data.targetUsername === farmState.ownerName) {
        setFarmState(prev => ({
          ...prev,
          heartsCount: data.heartsCount
        }));
        showAlert(`💖 [${data.senderUsername}]님이 내 포켓몬을 쓰다듬고 응원했습니다!`, 'success');
      }
    });

    socket.on('farm-guestbook-updated', (data: { targetUsername: string; entry: GuestbookEntry; guestbook: GuestbookEntry[] }) => {
      if (data.targetUsername === farmState.ownerName) {
        setFarmState(prev => ({
          ...prev,
          guestbook: data.guestbook
        }));
        showAlert(`📬 새로운 방명록이 도착했습니다: "${data.entry.message}"`, 'info');
      }
      if (visitingFarm && visitingFarm.owner === data.targetUsername) {
        setVisitingFarm(prev => prev ? { ...prev, guestbook: data.guestbook } : null);
      }
    });

    return () => {
      socket.off('farm-list-update');
      socket.off('farm-visit-data');
      socket.off('farm-heart-received');
      socket.off('farm-guestbook-updated');
    };
  }, [socket, farmState.ownerName, visitingFarm]);

  // 알림 토스트 헬퍼
  const showAlert = (text: string, type: 'success' | 'info' | 'warn' = 'info') => {
    setActionAlert({ text, type });
    setTimeout(() => setActionAlert(null), 3500);
  };

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

  // 1. 포켓몬 쓰다듬기 & 고유 스킬 모션 이펙트
  const handlePetPokemon = (e?: React.MouseEvent) => {
    if (!pmon) return;
    playPokemonCry(pmon.speciesId);
    addEggWarmth(1, '포켓몬 쓰다듬기');

    // 스킬 모션 정보 결정
    let skillName = '애교부리기';
    let skillType = 'normal';
    let skillIcon = '⭐';
    let particles = ['⭐', '✨', '💛', '💖', '🎉'];

    if (pmon.types.includes('water')) {
      skillName = pmon.level >= 30 ? '하이드로펌프' : '물대포';
      skillType = 'water';
      skillIcon = '🌊';
      particles = ['🌊', '💦', '🫧', '💧', '✨'];
    } else if (pmon.types.includes('fire')) {
      skillName = pmon.level >= 30 ? '화염방사' : '불꽃세례';
      skillType = 'fire';
      skillIcon = '🔥';
      particles = ['🔥', '💥', '☄️', '♨️', '✨'];
    } else if (pmon.types.includes('grass')) {
      skillName = pmon.level >= 30 ? '솔라빔' : '잎날가르기';
      skillType = 'grass';
      skillIcon = '🍃';
      particles = ['🍃', '🌸', '🌿', '🌱', '✨'];
    } else if (pmon.types.includes('electric')) {
      skillName = pmon.level >= 30 ? '볼트태클' : '10만볼트';
      skillType = 'electric';
      skillIcon = '⚡';
      particles = ['⚡', '⚡', '🌟', '💛', '✨'];
    } else if (pmon.types.includes('fairy')) {
      skillName = '문포스';
      skillType = 'fairy';
      skillIcon = '💖';
      particles = ['💖', '🌙', '🌸', '✨', '💕'];
    } else if (pmon.types.includes('dragon')) {
      skillName = '용의파동';
      skillType = 'dragon';
      skillIcon = '🐉';
      particles = ['🐉', '☄️', '💫', '🔷', '✨'];
    } else if (pmon.types.includes('ghost') || pmon.types.includes('psychic')) {
      skillName = '사이코키네시스';
      skillType = 'psychic';
      skillIcon = '🔮';
      particles = ['🔮', '🌌', '👻', '💜', '✨'];
    } else if (pmon.types.includes('fighting')) {
      skillName = '인파이트';
      skillType = 'fighting';
      skillIcon = '🥊';
      particles = ['🥊', '💥', '⚡', '💪', '✨'];
    }

    setPetSkillEffect({
      id: Date.now(),
      skillName,
      type: skillType,
      icon: skillIcon,
      particles
    });
    setIsPetJumping(true);

    const clientX = e ? e.clientX : window.innerWidth / 2;
    const clientY = e ? e.clientY : window.innerHeight / 2;
    setFloatingHeart({ id: Date.now(), x: clientX, y: clientY });

    setTimeout(() => setIsPetJumping(false), 700);
    setTimeout(() => {
      setFloatingHeart(null);
      setPetSkillEffect(null);
    }, 1400);

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

      let newHunger = target.hunger + (effect.hunger || 0);
      newHunger = Math.max(0, Math.min(100, newHunger));

      let newClean = target.cleanliness + (effect.cleanliness || 0);
      newClean = Math.max(0, Math.min(100, newClean));

      let newHappy = target.happiness + (effect.happiness || 0);
      newHappy = Math.max(0, Math.min(100, newHappy));

      let newEnergy = target.energy + (effect.energy || 0);
      newEnergy = Math.max(0, Math.min(100, newEnergy));

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

  // 🌲 3-2. 사내 뒷산 탐험 개시
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

    setExpeditionModal({
      active: true,
      area,
      progress: 0,
      statusText: '🎒 탐험 배낭을 메고 목적지로 출발합니다!',
      isDone: false,
      rewardGained: null
    });
  };

  // 🌲 사내 뒷산 탐험 진행 애니메이션 타이머
  useEffect(() => {
    if (!expeditionModal || !expeditionModal.active || expeditionModal.isDone) return;

    const interval = setInterval(() => {
      setExpeditionModal(prev => {
        if (!prev || prev.isDone) return prev;
        const nextProgress = Math.min(100, prev.progress + 12);

        let statusText = '🗺️ 목적지에 도착하여 주변 지형을 정찰 중...';
        if (nextProgress >= 20 && nextProgress < 50) {
          statusText = '🔍 수풀과 덤불 사이를 조심스럽게 헤치며 숨겨진 길을 탐색하는 중...';
        } else if (nextProgress >= 50 && nextProgress < 75) {
          statusText = '✨ 앗! 바위 틈과 보관함에서 무언가 반짝이는 보물 상자를 발견했습니다! 🎁';
        } else if (nextProgress >= 75 && nextProgress < 95) {
          statusText = '🏃‍♂️ 발각되지 않도록 전리품을 배낭에 단단히 챙겨 본부로 귀환하는 중!';
        } else if (nextProgress >= 100) {
          statusText = '🎉 탐험 대성공! 전리품 보고서가 도착했습니다.';
        }

        if (nextProgress >= 100) {
          if (pmon) {
            const gainedCoins = Math.floor(Math.random() * (prev.area.rewardCoinsMax - prev.area.rewardCoinsMin + 1)) + prev.area.rewardCoinsMin;
            const gainedExp = Math.floor(Math.random() * (prev.area.rewardExpMax - prev.area.rewardExpMin + 1)) + prev.area.rewardExpMin;

            const foundItems: { item: FarmItem; qty: number }[] = [];
            const inventoryAdd: Record<string, number> = {};

            prev.area.dropItems.forEach(drop => {
              if (Math.random() < drop.chance) {
                const itemObj = FARM_ITEMS.find(i => i.id === drop.itemId);
                if (itemObj) {
                  foundItems.push({ item: itemObj, qty: 1 });
                  inventoryAdd[drop.itemId] = (inventoryAdd[drop.itemId] || 0) + 1;
                }
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
                  energy: Math.max(0, target.energy - prev.area.energyCost),
                  hunger: Math.max(0, target.hunger - prev.area.hungerCost),
                  cleanliness: Math.max(0, target.cleanliness - prev.area.cleanlinessCost),
                  level: newLevel,
                  exp: newExp,
                  maxExp
                }
              };
            });

            addEggWarmth(10, '탐험 완수');

            return {
              ...prev,
              progress: 100,
              statusText: '🎉 탐험 대성공! 전리품 보고서가 도착했습니다.',
              isDone: true,
              rewardGained: {
                coins: gainedCoins,
                exp: gainedExp,
                levelUp: didLevelUp,
                newLevel,
                foundItems
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
  }, [expeditionModal?.active, expeditionModal?.isDone, pmon]);

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

    const nextStage = currentChain[nextIndex];
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
        return {
          ...prev,
          activePokemon: {
            ...target,
            speciesId: nextStage.id,
            name: nextStage.name,
            nickname: target.nickname === target.name ? nextStage.name : target.nickname,
            stageIndex: nextIndex,
            types: nextStage.types,
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

  // 7. 새로운 포켓몬 분양받기
  const handleAdoptPokemon = (chainIndex: number) => {
    if (farmState.activePokemon && !confirm('현재 돌보고 있는 포켓몬이 있습니다. 새 포켓몬으로 교체 분양받으시겠습니까?')) {
      return;
    }

    const isShinyChance = Math.random() < 0.05; // 5% 전설의 포켓몬 확률
    const newMon = createNewFarmPokemon(chainIndex, undefined, isShinyChance);

    setFarmState(prev => ({
      ...prev,
      activePokemon: newMon
    }));

    setActiveTab('yard');
    playPokemonCry(newMon.speciesId);
    showAlert(`🐣 [${newMon.name}]을(를) 성공적으로 분양받았습니다! ${isShinyChance ? '✨ [전설의 포켓몬] 당첨!' : ''}`, 'success');
  };



  // 9. 온보딩 완료 처리 (농장 설립 & 첫 파트너 포켓몬 분양)
  const handleCompleteOnboarding = () => {
    const isShinyChance = Math.random() < 0.05; // 5% 전설의 포켓몬 확률
    const newMon = createNewFarmPokemon(selectedStarterIdx, starterNickname.trim() || undefined, isShinyChance);
    const cleanOwner = initOwnerName.trim() || '지우';
    const cleanFarm = initFarmName.trim() || `${cleanOwner}의 포켓농장`;

    localStorage.setItem('pokefarm_saved_owner', cleanOwner);

    setFarmState(prev => ({
      ...prev,
      ownerName: cleanOwner,
      farmName: cleanFarm,
      isInitialized: true,
      activePokemon: newMon
    }));

    playPokemonCry(newMon.speciesId);
    showAlert(`🎉 [${cleanFarm}]이 정식 개장되었습니다! 첫 파트너 [${newMon.name}]과(와) 함께 사랑으로 키워보세요!`, 'success');
  };

  // 🐣 만약 아직 농장이 설립되지 않았다면 온보딩 2단계 위저드 표시
  if (!farmState.isInitialized) {
    const selectedChain = STARTER_CHAINS[selectedStarterIdx] || STARTER_CHAINS[0];
    const starterBaby = selectedChain[0];

    return (
      <div className="poke-farm-container dubu-modern-theme">
        <div className="farm-onboarding-wrapper">
          <div className="onboarding-card">
            {onboardingStep === 'name' ? (
              /* STEP 1: 농장주 & 농장 이름 설정 */
              <div className="onboarding-step-content">
                <div className="onboarding-badge">STEP 1 / 2</div>
                <div className="onboarding-icon">🏡</div>
                <h2>포켓농장 개설 신고서</h2>
                <p className="onboarding-desc">
                  포켓농장에 오신 것을 환영합니다!<br />
                  먼저 농장주님의 닉네임과 농장 이름을 지어주세요.
                </p>

                <div className="onboarding-form">
                  <div className="onboarding-input-group">
                    <label>👤 농장주 닉네임</label>
                    <input
                      type="text"
                      value={initOwnerName}
                      onChange={e => {
                        setInitOwnerName(e.target.value);
                        setInitFarmName(`${e.target.value}의 포켓농장`);
                      }}
                      placeholder="예: 지우"
                      maxLength={12}
                    />
                  </div>

                  <div className="onboarding-input-group">
                    <label>🏷️ 농장 이름</label>
                    <input
                      type="text"
                      value={initFarmName}
                      onChange={e => setInitFarmName(e.target.value)}
                      placeholder="예: 지우의 힐링 포켓농장"
                      maxLength={20}
                    />
                  </div>

                  <div className="onboarding-restore-box" style={{ margin: '10px 0 16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="excel-btn"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        borderRadius: '6px'
                      }}
                      onClick={() => {
                        if (!initOwnerName.trim()) {
                          showAlert('조회할 닉네임을 먼저 입력해 주세요!', 'warn');
                          return;
                        }
                        if (socket && socket.connected) {
                          socket.emit('farm-load-my-data', { username: initOwnerName.trim() });
                          showAlert(`🔍 [${initOwnerName.trim()}]님의 기존 농장 데이터를 서버 DB에서 조회 중입니다...`, 'info');
                        } else {
                          showAlert('서버와 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.', 'warn');
                        }
                      }}
                    >
                      ☁️ 서버 DB에서 이전 내 농장 데이터(졸업생/포켓몬) 찾아 복원하기
                    </button>
                  </div>

                  <button
                    className="excel-btn primary onboarding-next-btn"
                    onClick={() => {
                      if (!initOwnerName.trim()) {
                        showAlert('농장주 이름을 입력해 주세요!', 'warn');
                        return;
                      }
                      setOnboardingStep('starter');
                    }}
                  >
                    다음: 파트너 포켓몬 선택하기 ➔
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: 첫 번째 스타팅 포켓몬 선택 */
              <div className="onboarding-step-content">
                <div className="onboarding-badge">STEP 2 / 2</div>
                <h2>🐣 첫 번째 파트너 포켓몬 선택</h2>
                <p className="onboarding-desc">
                  함께할 첫 아기 포켓몬을 선택하세요! 5% 확률로 특별한 전설의 포켓몬이 등장합니다.
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
                    { id: 'all', label: `전체 (${STARTER_CHAINS.length}종)` },
                    { id: 'gen1-2', label: '1~2세대' },
                    { id: 'gen3-4', label: '3~4세대' },
                    { id: 'gen5-6', label: '5~6세대' },
                    { id: 'gen7-9', label: '7~9세대' },
                    { id: 'special', label: '드래곤/희귀' }
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
                      if (genFilter === 'all') return true;
                      const cat = chain[0].genCategory || 'gen1-2';
                      return cat === genFilter;
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
                      maxLength={10}
                    />
                  </div>

                  <div className="welcome-bonus-box">
                    <strong>🎁 웰컴 스타터 개장 지원금:</strong>
                    <span>🪙 500 코인 + 🫐 오랭열매 5개 + 🧼 거품비누 3개 + ⚽ 장난감 2개</span>
                  </div>

                  <div className="onboarding-actions-row">
                    <button className="excel-btn" onClick={() => setOnboardingStep('name')}>
                      ◀ 이전 단계
                    </button>
                    <button className="excel-btn primary onboarding-finish-btn" onClick={handleCompleteOnboarding}>
                      🎉 포켓농장 정식 개장하기!
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 🎮 두부 오락실 & 미니게임 뷰
  const renderArcadeGamesView = () => (
    <div className="dubu-arcade-view">
      <div className="dubu-arcade-header">
        <div className="arcade-header-left">
          <span className="arcade-header-icon">🎮</span>
          <div className="arcade-title-box">
            <h3>두부월드 오락실 & 사내 미니게임 센터</h3>
            <p>포켓몬 3v3 배틀, 테트리스, 캐치마인드 등 10종의 멀티 게임을 바로 플레이해보세요!</p>
          </div>
        </div>
      </div>

      <div className="arcade-games-grid">
        {ARCADE_GAMES.map((game) => (
          <div
            key={game.key}
            className="arcade-game-card"
            onClick={() => onSelectGame ? onSelectGame(game.key) : showAlert(`[${game.name}] 게임으로 이동합니다!`, 'info')}
          >
            <div className="arcade-card-top">
              <div className="arcade-icon-box" style={{ background: game.color }}>
                {game.icon}
              </div>
              <span className="arcade-badge" style={{ color: game.color, borderColor: game.color }}>
                {game.badge}
              </span>
            </div>
            <div className="arcade-card-body">
              <h4>{game.name}</h4>
              <p>{game.desc}</p>
            </div>
            <div className="arcade-card-footer">
              <button
                className="arcade-play-btn"
                style={{ background: game.color }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectGame) onSelectGame(game.key);
                }}
              >
                🚀 바로 플레이 ➔
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 👥 이웃 파도타기 & 실시간 인기농장 TOP 3 뷰
  const top3RealFarms = neighborList.slice(0, 3);

  const renderNeighborsView = () => (
    <div className="farm-social-layout">
      {/* 🏆 실시간 인기 포켓농장 TOP 3 (하트 랭킹 명예의 전당) */}
      <div className="sheet1-popular-farms-panel">
        <div className="sheet1-panel-header">
          <div className="sheet1-panel-header-left">
            <span className="sheet1-panel-icon">🏆</span>
            <div className="sheet1-panel-title-box">
              <h3>실시간 인기 포켓농장 TOP 3 (하트 랭킹)</h3>
              <p>전체 포켓농장 실제 유저들의 1촌 응원 하트(💖) 실시간 명예의 전당</p>
            </div>
          </div>
        </div>

        {top3RealFarms.length > 0 ? (
          <div className="sheet1-top3-grid">
            {top3RealFarms.map((farm, idx) => {
              const rankNum = idx + 1;
              const crown = rankNum === 1 ? '🥇 1위' : rankNum === 2 ? '🥈 2위' : '🥉 3위';
              return (
                <div key={farm.username} className={`sheet1-farm-card rank-${rankNum}`}>
                  <span className="sheet1-rank-badge">{crown}</span>
                  <div className="sheet1-farm-avatar-box">
                    {farm.activePokemon ? (
                      <img
                        src={farm.activePokemon.sprites.showdownFront || farm.activePokemon.sprites.front}
                        alt={farm.activePokemon.name}
                      />
                    ) : (
                      <span style={{ fontSize: '2rem' }}>🏡</span>
                    )}
                  </div>
                  <div className="sheet1-farm-info">
                    <div className="sheet1-farm-name" title={farm.farmName}>{farm.farmName}</div>
                    <div className="sheet1-farm-owner">👤 농장주: <b>{farm.username}</b></div>
                    <div className="sheet1-farm-stats">
                      <span className="hearts">💖 {farm.heartsCount.toLocaleString()}개</span>
                      <span className="graduated">🎓 {farm.graduatedCount}마리 졸업</span>
                    </div>
                  </div>
                  <button
                    className="sheet1-visit-btn"
                    onClick={() => handleVisitNeighbor(farm.username)}
                  >
                    🏠 미니홈피 구경가기 ➔
                  </button>
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
          <h3>👥 전체 이웃 농장 파도타기 ({neighborList.length}명)</h3>
          <div className="search-bar">
            <input
              type="text"
              value={neighborSearch}
              onChange={e => setNeighborSearch(e.target.value)}
              placeholder="친구 닉네임 / 농장 이름 검색..."
            />
          </div>
        </div>

        <div className="neighbors-grid">
          {neighborList
            .filter(n => n.username.toLowerCase().includes(neighborSearch.toLowerCase()) || (n.farmName && n.farmName.toLowerCase().includes(neighborSearch.toLowerCase())))
            .map(neighbor => (
              <div key={neighbor.username} className="neighbor-card">
                <div className="neighbor-avatar">
                  {neighbor.activePokemon ? (
                    <img src={neighbor.activePokemon.sprites.front} alt={neighbor.activePokemon.name} />
                  ) : (
                    <span>🏡</span>
                  )}
                </div>
                <div className="neighbor-info">
                  <h4>{neighbor.farmName}</h4>
                  <span className="owner-tag">농장주: {neighbor.username}</span>
                  <div className="stats-badges">
                    <span>🎓 {neighbor.graduatedCount}마리 졸업</span>
                    <span>💖 {neighbor.heartsCount} 하트</span>
                  </div>
                </div>
                <button className="excel-btn primary" onClick={() => handleVisitNeighbor(neighbor.username)}>
                  놀러가기 ➔
                </button>
              </div>
            ))}

          {neighborList.length === 0 && (
            <div className="empty-yard-card" style={{ gridColumn: '1 / -1' }}>
              <p>현재 접속 중인 다른 이웃 농장이 없습니다. 친구를 초대해 보세요!</p>
            </div>
          )}
        </div>

        {/* 내 방명록 모아보기 */}
        <div className="my-guestbook-box">
          <h4>📬 내 농장에 도착한 방명록 ({farmState.guestbook.length}건)</h4>
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
          {onLeaveRoom && (
            <button onClick={onLeaveRoom} className="excel-btn close" style={{ marginLeft: 6 }}>
              🚪 메인으로
            </button>
          )}
        </div>
      </div>

      {/* 🧭 Farm Navigation Tabs */}
      <nav className="farm-nav-tabs">
        <button className={`farm-tab ${activeTab === 'minihome' ? 'active' : ''}`} onClick={() => { setActiveTab('minihome'); setVisitingFarm(null); }}>
          🏠 두부 미니홈피 (Minihp)
        </button>
        <button className={`farm-tab ${activeTab === 'yard' ? 'active' : ''}`} onClick={() => { setActiveTab('yard'); setVisitingFarm(null); }}>
          🌿 내 농장 마당 (Farm)
        </button>
        <button className={`farm-tab ${activeTab === 'arcade' ? 'active' : ''}`} onClick={() => { setActiveTab('arcade'); setVisitingFarm(null); }}>
          🎮 두부 오락실 (Games)
        </button>
        <button className={`farm-tab ${activeTab === 'neighbors' ? 'active' : ''}`} onClick={() => setActiveTab('neighbors')}>
          👥 이웃 파도타기 (Neighbors)
        </button>
        <button className={`farm-tab ${activeTab === 'adopt' ? 'active' : ''}`} onClick={() => { setActiveTab('adopt'); setVisitingFarm(null); }}>
          🐣 분양소 (Adopt)
        </button>
        <button className={`farm-tab ${activeTab === 'evolve' ? 'active' : ''}`} onClick={() => { setActiveTab('evolve'); setVisitingFarm(null); }}>
          ✨ 진화의 방 (Evolve)
        </button>
        <button className={`farm-tab ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => { setActiveTab('jobs'); setVisitingFarm(null); }}>
          💼 아르바이트 (Jobs)
        </button>
        <button className={`farm-tab ${activeTab === 'expedition' ? 'active' : ''}`} onClick={() => { setActiveTab('expedition'); setVisitingFarm(null); }}>
          🌲 사내 탐험 (Expedition)
        </button>
        <button className={`farm-tab ${activeTab === 'daycare' ? 'active' : ''}`} onClick={() => { setActiveTab('daycare'); setVisitingFarm(null); }}>
          🥚 알 부화소 (Daycare)
        </button>
        <button className={`farm-tab ${activeTab === 'lottery' ? 'active' : ''}`} onClick={() => { setActiveTab('lottery'); setVisitingFarm(null); }}>
          🎰 행운 복권 (Lottery)
        </button>
        <button className={`farm-tab ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => { setActiveTab('shop'); setVisitingFarm(null); }}>
          🛍️ 상점 (Shop)
        </button>
        <button className={`farm-tab ${activeTab === 'diplomas' ? 'active' : ''}`} onClick={() => { setActiveTab('diplomas'); setVisitingFarm(null); }}>
          📖 도감 & 졸업 (Pokedex)
        </button>
      </nav>

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
            {/* 🌐 상단 브라우저 헤더 바 */}
            <div className="dubuworld-top-browser-bar">
              <div className="dubuworld-url-box">
                <span className="dubuworld-logo">Dubuworld</span>
                <span className="dubuworld-url-text">
                  http://minihp.dubuworld.com/poke_farm/{displayOwnerName}
                </span>
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
                    style={{ padding: '3px 10px', fontSize: '0.8rem' }}
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
                    </div>
                    <div className="detail-item">
                      <span>🎓 총 졸업:</span> <b>{displayGraduatedCount}마리</b>
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

                  {/* BGM 주크박스 플레이어 */}
                  <div className="dubuworld-bgm-widget">
                    <div className="bgm-header">
                      <span>🎵 Minihp BGM Jukebox</span>
                      <div className={`sound-wave-bars ${isPlayingBgm ? 'playing' : ''}`}>
                        <span className="bar b1"></span>
                        <span className="bar b2"></span>
                        <span className="bar b3"></span>
                        <span className="bar b4"></span>
                      </div>
                    </div>
                    <div className="bgm-title-scroll">
                      <span>▶ {currentBgmSong}</span>
                    </div>
                    <div className="bgm-controls">
                      <button
                        className="bgm-btn"
                        onClick={() => setIsPlayingBgm(!isPlayingBgm)}
                      >
                        {isPlayingBgm ? '⏸️ 일시정지' : '▶️ 재생'}
                      </button>
                      <select
                        className="bgm-select"
                        value={currentBgmSong}
                        onChange={e => setCurrentBgmSong(e.target.value)}
                      >
                        <option value="프리스타일 - Y (Feat. 지선)">🎵 프리스타일 - Y</option>
                        <option value="쿨 - 아로하 (Aroha)">🎵 쿨 - 아로하</option>
                        <option value="허밍어반스테레오 - Hawaiian Couple">🎵 Hawaiian Couple</option>
                        <option value="에픽하이 - Fly (Feat. Amin. J)">🎵 에픽하이 - Fly</option>
                        <option value="포켓몬 BGM - 태초마을 (Pallet Town)">🎵 태초마을 BGM</option>
                        <option value="포켓몬센터 - 힐링 멜로디">🎵 포켓몬센터 BGM</option>
                      </select>
                    </div>
                  </div>
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
                      className={`cytab ${minihompyTab === 'arcade' ? 'active' : ''}`}
                      onClick={() => setMinihompyTab('arcade')}
                    >
                      🎮 두부 오락실 (Games)
                    </button>
                    <button
                      className={`cytab ${minihompyTab === 'guestbook' ? 'active' : ''}`}
                      onClick={() => setMinihompyTab('guestbook')}
                    >
                      📝 방명록 ({displayGuestbook.length})
                    </button>
                    <button
                      className={`cytab ${minihompyTab === 'stickers' ? 'active' : ''}`}
                      onClick={() => setMinihompyTab('stickers')}
                    >
                      🎨 스티커 꾸미기
                    </button>
                    <button
                      className={`cytab ${minihompyTab === 'neighbors' ? 'active' : ''}`}
                      onClick={() => setMinihompyTab('neighbors')}
                    >
                      👥 이웃 파도타기
                    </button>
                  </div>

                  {/* 1. 홈 뷰 */}
                  {minihompyTab === 'home' && (
                    <div className="cytab-content home-view">
                      <div className="dubuworld-welcome-banner">
                        <h3>✨ Welcome to {displayFarmName}! ✨</h3>
                        <p>정성껏 키운 포켓몬들과 자랑스러운 졸업생들이 함께 어우러지는 두부월드 감성 미니홈피입니다.</p>
                      </div>

                      {/* 미니룸 미니 프리뷰 */}
                      <div className="miniroom-preview-box" onClick={() => setMinihompyTab('miniroom')}>
                        <div className="preview-label">🖼️ 클릭하여 미니룸 크게 보기 & 스티커 꾸미기 ➔</div>
                        {renderMiniroomCanvas({ compact: true })}
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

                      {/* 🌟 데코레이션 서브모드 탭 */}
                      <div className="decor-submode-tabs">
                        <button
                          className={`decor-subtab ${decorSubtab === 'palette' ? 'active' : ''}`}
                          onClick={() => setDecorSubtab('palette')}
                        >
                          🎨 가구 & 소품 팔레트 (90+)
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
                              const place = getPokemonPlacement('active', 45, 52, 1, false, 0, 0);
                              return (
                                <div className="poke-placement-card">
                                  <div className="placement-card-top">
                                    <div className="poke-thumb">
                                      <img
                                        src={displayActivePokemon.sprites.front}
                                        alt={displayActivePokemon.name}
                                        style={{
                                          transform: `${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg)`,
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
                                      <span>🔄 360° 회전:</span>
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
                                      <span>📐 앞뒤 눕힘:</span>
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
                              const place = getPokemonPlacement(id, idx === 0 ? 20 : idx === 1 ? 70 : 82, idx === 0 ? 58 : idx === 1 ? 58 : 48, 0.9, idx !== 0, 0, 0);
                              return (
                                <div key={mon.uid || idx} className="poke-placement-card">
                                  <div className="placement-card-top">
                                    <div className="poke-thumb">
                                      <img
                                        src={mon.sprites.front}
                                        alt={mon.name}
                                        style={{
                                          transform: `${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg)`,
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
                                      <span>🔄 360° 회전:</span>
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
                                      <span>📐 앞뒤 눕힘:</span>
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
                              const place = getPokemonPlacement(id, idx === 0 ? 12 : idx === 1 ? 26 : idx === 2 ? 72 : 86, idx === 0 ? 32 : idx === 1 ? 22 : idx === 2 ? 22 : 32, 0.85, idx >= 2, 0, 0);
                              const chain = getEvolutionChainForDiploma(dip);
                              const activeForm = getDiplomaActiveSprite(dip);

                              return (
                                <div key={dip.id || idx} className="poke-placement-card">
                                  <div className="placement-card-top">
                                    <div className="poke-thumb">
                                      <img
                                        src={activeForm.sprite}
                                        alt={activeForm.name}
                                        style={{
                                          transform: `${place.flipped ? 'scaleX(-1)' : ''} rotate(${place.rotation || 0}deg) rotateX(${place.tiltX || 0}deg)`,
                                          transition: 'transform 0.15s ease'
                                        }}
                                      />
                                      <div className="thumb-info">
                                        <strong>🎓 졸업: {dip.nickname || dip.name}</strong>
                                        <span>외형: <b>{activeForm.name}</b> ({dip.graduatedAt.slice(0, 10)} 졸업)</span>
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
                                      <span>🔄 360° 회전:</span>
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
                                      <span>📐 앞뒤 눕힘:</span>
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

                  {/* 5. 🎮 두부 오락실 & 미니게임 뷰 */}
                  {minihompyTab === 'arcade' && renderArcadeGamesView()}

                  {/* 6. 👥 이웃 파도타기 & 인기농장 TOP 3 뷰 */}
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
                  <div className="pasture-ground">
                    {/* Pokémon Visual Sprite & Skill FX */}
                    <div className="farm-pokemon-stage">
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

                      <img
                        src={pmon.sprites.showdownFront || pmon.sprites.front}
                        alt={pmon.nickname}
                        className={`farm-active-sprite ${isPetJumping ? 'pet-skill-jump' : ''}`}
                      />
                      <div className="pet-shadow"></div>
                      <div className="pet-nametag">
                        <span>{pmon.nickname} (Lv.{pmon.level})</span>
                        <button className="cry-btn" onClick={(e) => { e.stopPropagation(); playPokemonCry(pmon.speciesId); }} title="울음소리 듣기">
                          <Volume2 size={13} />
                        </button>
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
                    💡 포켓몬을 터치/클릭하면 고유 스킬 모션과 함께 애정도(+5) 및 EXP(+10)가 상승합니다!
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
                  <div className="gauges-grid">
                    <div className="gauge-item">
                      <div className="gauge-label">
                        <span>🍎 배고픔</span>
                        <span>{pmon.hunger}/100</span>
                      </div>
                      <div className="gauge-track">
                        <div className="gauge-fill hunger" style={{ width: `${pmon.hunger}%`, backgroundColor: pmon.hunger > 30 ? '#10b981' : '#ef4444' }} />
                      </div>
                    </div>

                    <div className="gauge-item">
                      <div className="gauge-label">
                        <span>🧼 청결도</span>
                        <span>{pmon.cleanliness}/100</span>
                      </div>
                      <div className="gauge-track">
                        <div className="gauge-fill cleanliness" style={{ width: `${pmon.cleanliness}%`, backgroundColor: pmon.cleanliness > 30 ? '#06b6d4' : '#f59e0b' }} />
                      </div>
                    </div>

                    <div className="gauge-item">
                      <div className="gauge-label">
                        <span>💖 친밀도</span>
                        <span>{pmon.happiness}/100</span>
                      </div>
                      <div className="gauge-track">
                        <div className="gauge-fill happiness" style={{ width: `${pmon.happiness}%`, backgroundColor: '#ec4899' }} />
                      </div>
                    </div>

                    <div className="gauge-item">
                      <div className="gauge-label">
                        <span>⚡ 에너지</span>
                        <span>{pmon.energy}/100</span>
                      </div>
                      <div className="gauge-track">
                        <div className="gauge-fill energy" style={{ width: `${pmon.energy}%`, backgroundColor: '#eab308' }} />
                      </div>
                    </div>
                  </div>

                  {/* 🍎 Quick Care Actions */}
                  <div className="quick-actions-bar">
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      🎒 보유 아이템으로 즉시 돌보기:
                    </div>
                    <div className="inventory-chips-row">
                      {FARM_ITEMS.map(item => {
                        const qty = farmState.inventory[item.id] || 0;
                        return (
                          <button
                            key={item.id}
                            className={`care-item-btn ${qty > 0 ? 'available' : 'empty'}`}
                            onClick={() => handleUseItem(item)}
                            disabled={qty <= 0}
                            title={`${item.description} (보유: ${qty}개)`}
                          >
                            <span className="item-icon">{item.icon}</span>
                            <span className="item-name">{item.name}</span>
                            <span className="item-qty">x{qty}</span>
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
                  <p>원하는 포켓몬을 선택하여 입양하세요! 5% 확률로 희귀한 전설의 포켓몬이 탄생합니다.</p>
                </div>
                {/* Generation Filter Chips */}
                <div className="gen-filter-chips">
                  {[
                    { id: 'all', label: `전체 (${STARTER_CHAINS.length}종)` },
                    { id: 'gen1-2', label: '1~2세대' },
                    { id: 'gen3-4', label: '3~4세대' },
                    { id: 'gen5-6', label: '5~6세대' },
                    { id: 'gen7-9', label: '7~9세대' },
                    { id: 'special', label: '드래곤/희귀' }
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
                  if (genFilter === 'all') return true;
                  const cat = chain[0].genCategory || 'gen1-2';
                  return cat === genFilter;
                })
                .map(({ chain, originalIdx }) => {
                  const baby = chain[0];
                  return (
                    <div key={baby.id} className="starter-adopt-card">
                      <div className="starter-avatar-box">
                        <img src={baby.showdownSprite || baby.sprite} alt={baby.name} />
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
                      <button className="excel-btn primary" onClick={() => handleAdoptPokemon(originalIdx)}>
                        🐣 이 아이 입양하기
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

                    return (
                      <div className="evolve-action-card">
                        <h4>다음 진화: [{nextStage.name}] 조건 달성표</h4>
                        <div className="req-checklist">
                          <div className={`check-item ${levelMet ? 'checked' : ''}`}>
                            {levelMet ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>레벨 조건: 필요 Lv.{nextStage.minLevel} (현재: Lv.{pmon.level})</span>
                          </div>
                          <div className={`check-item ${happyMet ? 'checked' : ''}`}>
                            {happyMet ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>친밀도 조건: 필요 {nextStage.minHappiness}+ (현재: {pmon.happiness})</span>
                          </div>
                        </div>

                        <button
                          className="excel-btn primary evolve-btn"
                          disabled={!canEvolve}
                          onClick={handleEvolve}
                        >
                          {canEvolve ? '✨ 지금 바로 진화시키기!' : '⏳ 조건을 먼저 달성해 주세요'}
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="evolve-action-card completed">
                    <Trophy size={32} style={{ color: '#d97706', marginBottom: 6 }} />
                    <h4>🎉 최종 진화 완료!</h4>
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
              <h3>🛍️ 둡박사의 포켓몬 마트</h3>
              <p>맛있는 나무열매와 목욕 용품, 활력 비타민을 구매하여 포켓몬을 돌보세요!</p>
            </div>

            <div className="shop-items-grid">
              {FARM_ITEMS.filter(item => item.category !== 'special').map(item => (
                <div key={item.id} className="shop-item-card">
                  <div className="item-icon-box">{item.icon}</div>
                  <h4>{item.name}</h4>
                  <p className="item-desc">{item.description}</p>
                  <div className="item-price-row">
                    <span className="price-tag">🪙 {item.price} P</span>
                    <button className="excel-btn primary" onClick={() => handleBuyItem(item)}>
                      구매하기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: 📖 포켓몬 졸업 도감 & 명예의 전당 (Pokedex & Diplomas)
           ========================================================================= */}
        {activeTab === 'diplomas' && !visitingFarm && (() => {
          const pokedexList = getAllPokedexEntries();
          const gradStats = new Map<number, { count: number; shinyCount: number; firstDate: string; maxLevel: number; nicknames: string[] }>();

          (farmState.graduatedPokemon || []).forEach(dip => {
            const existing = gradStats.get(dip.speciesId) || { count: 0, shinyCount: 0, firstDate: dip.graduatedAt, maxLevel: dip.finalLevel, nicknames: [] };
            existing.count += 1;
            if (dip.isShiny) existing.shinyCount += 1;
            if (dip.finalLevel > existing.maxLevel) existing.maxLevel = dip.finalLevel;
            if (!existing.nicknames.includes(dip.nickname)) existing.nicknames.push(dip.nickname);
            gradStats.set(dip.speciesId, existing);
          });

          const unlockedCount = pokedexList.filter(m => gradStats.has(m.speciesId)).length;
          const totalSpeciesCount = pokedexList.length;
          const totalGradCount = farmState.graduatedPokemon?.length || 0;
          const shinyGradCount = farmState.graduatedPokemon?.filter(d => d.isShiny).length || 0;
          const completionPct = Math.round((unlockedCount / totalSpeciesCount) * 100);

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
                    <h3>포켓농장 공식 졸업 도감 (Official Pokedex)</h3>
                    <p>정성으로 키워 졸업시킨 포켓몬만 컬러풀하게 활성화되는 명예의 도감입니다.</p>
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

                          {/* 🌟 마우스 호버 오버레이 (졸업시킨 횟수 및 정보 안내) */}
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
                                  <p>아직 졸업한 기록이 없습니다.<br/>Lv.36 달성 후 졸업식을 치르면 도감에 사진이 활성화됩니다!</p>
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
                /* 📜 기존 졸업 증서 앨범 뷰 */
                <div className="pokedex-diplomas-view">
                  {farmState.graduatedPokemon.length > 0 ? (
                    <div className="diplomas-grid">
                      {farmState.graduatedPokemon.map(dip => (
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
                      <p>아직 졸업한 포켓몬이 없습니다. 포켓몬을 끝까지 키워 멋진 졸업식을 치러보세요!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* =========================================================================
            TAB: 🎮 두부 오락실 & 미니게임 (Arcade)
           ========================================================================= */}
        {activeTab === 'arcade' && !visitingFarm && renderArcadeGamesView()}

        {/* =========================================================================
            TAB: 👥 이웃 농장 파도타기 & 인기 랭킹 (Social)
           ========================================================================= */}
        {activeTab === 'neighbors' && !visitingFarm && renderNeighborsView()}
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

      {/* 🌲 EXPEDITION LIVE PROGRESS MODAL */}
      {expeditionModal && expeditionModal.active && (
        <div className="farm-modal-overlay">
          <div className="job-shift-modal-card expedition-modal-card">
            {/* Modal Header */}
            <div className="job-modal-header">
              <div className="job-badge">
                <span className="job-badge-icon">{expeditionModal.area.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{expeditionModal.area.name} 탐험 중</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    파견 대원: <strong>{pmon?.nickname || '포켓몬'}</strong> | 신비의 사내 탐험대
                  </span>
                </div>
              </div>
              {expeditionModal.isDone && (
                <button className="modal-close-btn" onClick={() => setExpeditionModal(null)}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Animation Stage */}
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
                  className={`working-pokemon-sprite ${expeditionModal.isDone ? 'done-bounce' : 'expedition-walking'}`}
                />
                {!expeditionModal.isDone && (
                  <div className="expedition-walk-dust">
                    <span>💨</span>
                  </div>
                )}
                <div className="worker-tag">
                  <span>Lv.{pmon?.level} {pmon?.nickname}</span>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="job-status-section">
              <div className="status-bubble">
                <p>{expeditionModal.statusText}</p>
              </div>

              <div className="job-progress-bar-wrap">
                <div
                  className="job-progress-fill expedition-fill"
                  style={{ width: `${expeditionModal.progress}%` }}
                >
                  <span className="progress-percent">{Math.round(expeditionModal.progress)}%</span>
                </div>
              </div>
            </div>

            {/* Completion Result & Claim Button */}
            {expeditionModal.isDone && expeditionModal.rewardGained ? (
              <div className="job-salary-receipt expedition-receipt">
                <div className="receipt-header">
                  <h4>📜 사내 탐험 전리품 보고서</h4>
                  <span>{expeditionModal.area.name} 완수</span>
                </div>
                <div className="receipt-grid">
                  <div className="receipt-row gain">
                    <span>🪙 획득 지원금</span>
                    <strong>+{expeditionModal.rewardGained.coins} P</strong>
                  </div>
                  <div className="receipt-row gain">
                    <span>✨ 탐험 경험치</span>
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
                    아쉽게도 이번엔 특별한 보물 아이템을 발견하지 못했습니다.
                  </p>
                )}

                <button
                  className="excel-btn primary claim-shift-btn"
                  onClick={() => setExpeditionModal(null)}
                >
                  🎁 전리품 수령 완료
                </button>
              </div>
            ) : null}
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
                      maxLength={10}
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
                  <img src={activeForm.sprite} alt={activeForm.name} className="cert-pokemon-sprite" />
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
                              className={`cert-stage-btn ${isCur ? 'active' : ''}`}
                              onClick={() => handleSetDiplomaForm(dip.id, sIdx)}
                              title={`${st.name} 모습으로 미니룸에 표시`}
                            >
                              <img src={st.sprite} alt={st.name} />
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
    </div>
  );
};
