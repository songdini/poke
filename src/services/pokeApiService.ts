import type { PokemonData, PokemonType, Move } from '../types/pokemon';
import { POKEMON_ROSTER } from '../data/pokemonData';

// Type Name Translation Dictionary (PokeAPI english -> PokemonType)
const TYPE_MAP: Record<string, PokemonType> = {
  normal: 'normal',
  fire: 'fire',
  water: 'water',
  grass: 'grass',
  electric: 'electric',
  ice: 'ice',
  fighting: 'fighting',
  poison: 'poison',
  ground: 'ground',
  flying: 'flying',
  psychic: 'psychic',
  bug: 'bug',
  rock: 'rock',
  ghost: 'ghost',
  dragon: 'dragon',
  steel: 'steel',
  fairy: 'fairy',
  dark: 'dark'
};

// Preset Moves per Type for Dynamic Move Assignment
const TYPE_MOVES: Record<PokemonType, Move[]> = {
  fire: [
    { id: '화염방사', name: '화염방사', type: 'fire', category: 'special', power: 90, accuracy: 100, maxPp: 15, pp: 15, description: '세찬 화염을 뿜어 공격한다.' },
    { id: '불꽃세례', name: '불꽃세례', type: 'fire', category: 'special', power: 40, accuracy: 100, maxPp: 25, pp: 25, description: '작은 불꽃을 뿜어 공격한다.' },
    { id: '불꽃펀치', name: '불꽃펀치', type: 'fire', category: 'physical', power: 75, accuracy: 100, maxPp: 15, pp: 15, description: '불꽃을 띤 주먹으로 공격.' }
  ],
  water: [
    { id: '하이드로펌프', name: '하이드로펌프', type: 'water', category: 'special', power: 110, accuracy: 80, maxPp: 5, pp: 5, description: '대량의 수압으로 공격한다.' },
    { id: '파도타기', name: '파도타기', type: 'water', category: 'special', power: 90, accuracy: 100, maxPp: 15, pp: 15, description: '큰 파도를 일으켜 공격한다.' },
    { id: '물대포', name: '물대포', type: 'water', category: 'special', power: 40, accuracy: 100, maxPp: 25, pp: 25, description: '물을 강하게 분사한다.' }
  ],
  grass: [
    { id: '솔라빔', name: '솔라빔', type: 'grass', category: 'special', power: 120, accuracy: 100, maxPp: 10, pp: 10, description: '태양 빛을 모아 강하게 발사한다.' },
    { id: '기가드레인', name: '기가드레인', type: 'grass', category: 'special', power: 75, accuracy: 100, maxPp: 10, pp: 10, description: '체력을 흡수한다.' },
    { id: '잎날가르기', name: '잎날가르기', type: 'grass', category: 'physical', power: 55, accuracy: 95, maxPp: 25, pp: 25, description: '날카로운 잎사귀로 베어 낸다.' }
  ],
  electric: [
    { id: '10万볼트', name: '10만볼트', type: 'electric', category: 'special', power: 90, accuracy: 100, maxPp: 15, pp: 15, description: '강한 전기를 내뿜는다.' },
    { id: '볼트태클', name: '볼트태클', type: 'electric', category: 'physical', power: 120, accuracy: 100, maxPp: 10, pp: 10, description: '전기를 두르고 돌진한다.' },
    { id: '전기쇼크', name: '전기쇼크', type: 'electric', category: 'special', power: 40, accuracy: 100, maxPp: 30, pp: 30, description: '작은 전기를 보낸다.' }
  ],
  normal: [
    { id: '파괴광선', name: '파괴광선', type: 'normal', category: 'special', power: 150, accuracy: 90, maxPp: 5, pp: 5, description: '강력한 파괴 광선을 발사한다.' },
    { id: '전광석화', name: '전광석화', type: 'normal', category: 'physical', power: 40, accuracy: 100, maxPp: 30, pp: 30, description: '빠른 스피드로 선제공격.' },
    { id: '몸통박치기', name: '몸통박치기', type: 'normal', category: 'physical', power: 40, accuracy: 100, maxPp: 35, pp: 35, description: '몸 전체로 부딪쳐 공격한다.' }
  ],
  ice: [
    { id: '냉동빔', name: '냉동빔', type: 'ice', category: 'special', power: 90, accuracy: 100, maxPp: 10, pp: 10, description: '영하의 냉기를 발사한다.' },
    { id: '눈보라', name: '눈보라', type: 'ice', category: 'special', power: 110, accuracy: 70, maxPp: 5, pp: 5, description: '격렬한 얼음 눈보라로 때린다.' }
  ],
  fighting: [
    { id: '인파이트', name: '인파이트', type: 'fighting', category: 'physical', power: 120, accuracy: 100, maxPp: 5, pp: 5, description: '육박하여 연타 공격을 펼친다.' },
    { id: '파동탄', name: '파동탄', type: 'fighting', category: 'special', power: 80, accuracy: 100, maxPp: 20, pp: 20, description: '체내의 파동 구체를 발사한다.' }
  ],
  poison: [
    { id: '오물폭탄', name: '오물폭탄', type: 'poison', category: 'special', power: 90, accuracy: 100, maxPp: 10, pp: 10, description: '더러운 오물을 던져 폭발시킨다.' },
    { id: '독찌르기', name: '독찌르기', type: 'poison', category: 'physical', power: 80, accuracy: 100, maxPp: 20, pp: 20, description: '독이 든 촉수로 찌른다.' }
  ],
  ground: [
    { id: '지진', name: '지진', type: 'ground', category: 'physical', power: 100, accuracy: 100, maxPp: 10, pp: 10, description: '땅을 강하게 흔들어 공격한다.' },
    { id: '구멍파기', name: '구멍파기', type: 'ground', category: 'physical', power: 80, accuracy: 100, maxPp: 10, pp: 10, description: '땅속으로 팠다가 공격한다.' }
  ],
  flying: [
    { id: '에어슬래시', name: '에어슬래시', type: 'flying', category: 'special', power: 75, accuracy: 95, maxPp: 15, pp: 15, description: '날카로운 바람 칼날로 벤다.' },
    { id: '공중날기', name: '공중날기', type: 'flying', category: 'physical', power: 90, accuracy: 95, maxPp: 15, pp: 15, description: '높이 날아올라 급강하 공격한다.' }
  ],
  psychic: [
    { id: '사이코키네시스', name: '사이코키네시스', type: 'psychic', category: 'special', power: 90, accuracy: 100, maxPp: 10, pp: 10, description: '염동력 파동으로 적을 공격.' },
    { id: '사이크트라이크', name: '사이크트라이크', type: 'psychic', category: 'special', power: 100, accuracy: 100, maxPp: 10, pp: 10, description: '물질화한 염동파로 공격한다.' }
  ],
  bug: [
    { id: '벌레의사자', name: '벌레의사자', type: 'bug', category: 'special', power: 90, accuracy: 100, maxPp: 10, pp: 10, description: '벌레의 진동 음파로 공격.' },
    { id: '시저크로스', name: '시저크로스', type: 'bug', category: 'physical', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '낫이나 가위 모양으로 교차 베기.' }
  ],
  rock: [
    { id: '스톤에지', name: '스톤에지', type: 'rock', category: 'physical', power: 100, accuracy: 80, maxPp: 5, pp: 5, description: '뾰족한 바위 칼날로 공격.' },
    { id: '스톤샤워', name: '스톤샤워', type: 'rock', category: 'physical', power: 75, accuracy: 90, maxPp: 10, pp: 10, description: '바위 폭포를 퍼부어 공격한다.' }
  ],
  ghost: [
    { id: '섀도볼', name: '섀도볼', type: 'ghost', category: 'special', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '어둠의 구체를 내던져 공격.' },
    { id: '야습', name: '야습', type: 'ghost', category: 'physical', power: 40, accuracy: 100, maxPp: 30, pp: 30, description: '그림자 속에서 선제 공격한다.' }
  ],
  dragon: [
    { id: '역린', name: '역린', type: 'dragon', category: 'physical', power: 120, accuracy: 100, maxPp: 10, pp: 10, description: '격분하여 대미지를 준다.' },
    { id: '용의파동', name: '용의파동', type: 'dragon', category: 'special', power: 85, accuracy: 100, maxPp: 10, pp: 10, description: '용의 기운 충격파를 발사한다.' }
  ],
  steel: [
    { id: '러스터캐논', name: '러스터캐논', type: 'steel', category: 'special', power: 80, accuracy: 100, maxPp: 10, pp: 10, description: '빛나는 금속 광선을 발사한다.' },
    { id: '아이언헤드', name: '아이언헤드', type: 'steel', category: 'physical', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '강철 머리로 박치기한다.' }
  ],
  fairy: [
    { id: '문포스', name: '문포스', type: 'fairy', category: 'special', power: 95, accuracy: 100, maxPp: 15, pp: 15, description: '달의 힘을 발산해 공격한다.' },
    { id: '드레인키스', name: '드레인키스', type: 'fairy', category: 'special', power: 50, accuracy: 100, maxPp: 10, pp: 10, description: '키스로 HP를 흡수한다.' }
  ],
  dark: [
    { id: '깨물어부수기', name: '깨물어부수기', type: 'dark', category: 'physical', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '날카로운 이빨로 깨문다.' },
    { id: '악의파동', name: '악의파동', type: 'dark', category: 'special', power: 80, accuracy: 100, maxPp: 15, pp: 15, description: '악의 감정 오라를 발사한다.' }
  ]
};

export type GenRange = 'gen1-2' | 'gen1-5' | 'all';

const GEN_MAX_IDS: Record<GenRange, number> = {
  'gen1-2': 251, // 1~2세대 (관동/성도)
  'gen1-5': 649, // 1~5세대 (하나)
  'all': 1025    // 1~9세대
};

// Fetch single random Pokemon dynamically from PokeAPI with Generation Range filter
export async function fetchRandomSinglePokemonFromApi(idOverride?: number, genRange: GenRange = 'gen1-2'): Promise<PokemonData> {
  const maxId = GEN_MAX_IDS[genRange] || 251;
  const pokemonId = idOverride || Math.floor(Math.random() * maxId) + 1;

  try {
    const [pokeRes, speciesRes] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`)
    ]);

    if (!pokeRes.ok || !speciesRes.ok) throw new Error('PokeAPI response not OK');

    const pokeData = await pokeRes.json();
    const speciesData = await speciesRes.json();

    // Extract Korean Name
    const koNameObj = speciesData.names?.find((n: { language: { name: string }; name: string }) => n.language.name === 'ko');
    const koreanName = koNameObj ? koNameObj.name : pokeData.name;

    // Extract Types
    const types: PokemonType[] = pokeData.types.map((t: { type: { name: string } }) => TYPE_MAP[t.type.name] || 'normal');

    // Extract Base Stats
    const statsMap: Record<string, number> = {};
    pokeData.stats.forEach((s: { stat: { name: string }; base_stat: number }) => {
      statsMap[s.stat.name] = s.base_stat;
    });

    const stats = {
      hp: (statsMap['hp'] || 80) + 60,
      attack: statsMap['attack'] || 85,
      defense: statsMap['defense'] || 80,
      spAtk: statsMap['special-attack'] || 85,
      spDef: statsMap['special-defense'] || 80,
      speed: statsMap['speed'] || 80
    };

    // Build Sprites
    const showdownFront = pokeData.sprites?.other?.showdown?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemonId}.gif`;
    const showdownBack = pokeData.sprites?.other?.showdown?.back_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${pokemonId}.gif`;
    const front = pokeData.sprites?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
    const back = pokeData.sprites?.back_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokemonId}.png`;

    // Generate 4 Moves based on Types
    const primaryType = types[0] || 'normal';
    const secondaryType = types[1] || 'normal';

    const primaryMoves = TYPE_MOVES[primaryType] || TYPE_MOVES['normal'];
    const secondaryMoves = TYPE_MOVES[secondaryType] || TYPE_MOVES['normal'];
    const normalMoves = TYPE_MOVES['normal'];

    const moves: Move[] = [
      primaryMoves[0],
      secondaryMoves[0] || primaryMoves[1] || normalMoves[0],
      primaryMoves[1] || normalMoves[1],
      normalMoves[0]
    ];

    return {
      id: pokemonId,
      name: pokeData.name,
      koreanName,
      types,
      stats,
      sprites: {
        front,
        back,
        showdownFront,
        showdownBack
      },
      moves
    };
  } catch (err) {
    console.warn(`[PokeAPI Fetch Fallback] Failed for ID ${pokemonId}, using preset roster item:`, err);
    const randomIndex = Math.floor(Math.random() * POKEMON_ROSTER.length);
    return POKEMON_ROSTER[randomIndex];
  }
}

// Fetch 3 Random Pokemon Concurrently with Gen Filter
export async function fetchRandomTeamFromApi(count = 3, genRange: GenRange = 'gen1-2'): Promise<PokemonData[]> {
  const maxId = GEN_MAX_IDS[genRange] || 251;
  const ids: number[] = [];
  while (ids.length < count) {
    const randomId = Math.floor(Math.random() * maxId) + 1;
    if (!ids.includes(randomId)) {
      ids.push(randomId);
    }
  }

  const team = await Promise.all(ids.map(id => fetchRandomSinglePokemonFromApi(id, genRange)));
  return team;
}
