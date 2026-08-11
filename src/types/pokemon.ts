export type PokemonType = 
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' 
  | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying' 
  | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' 
  | 'steel' | 'fairy' | 'dark';

export interface Move {
  id: string;
  name: string;
  type: PokemonType;
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number;
  maxPp: number;
  pp: number;
  description: string;
}

export interface PokemonData {
  id: number;
  name: string;
  koreanName: string;
  types: PokemonType[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
  moves: Move[];
  sprites: {
    front: string;
    back: string;
    showdownFront: string;
    showdownBack: string;
  };
}

export interface BattlePokemon extends PokemonData {
  currentHp: number;
  maxHp: number;
  status: 'normal' | 'fainted';
  moves: Move[];
}

export interface PlayerTeam {
  trainerName: string;
  pokemonList: BattlePokemon[];
  activeIndex: number;
}

export interface BattleLog {
  id: string;
  timestamp: string;
  turn: number;
  text: string;
  type?: 'attack' | 'damage' | 'switch' | 'faint' | 'system' | 'super-effective' | 'not-very-effective';
}

// ⚔️ 타입 상성표 (Type Advantage Chart)
export const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, steel: 0.5, dark: 2 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 }
};

export const getTypeMultiplier = (attackerType: PokemonType, defenderTypes: PokemonType[]): number => {
  let multiplier = 1;
  defenderTypes.forEach(defType => {
    const mult = TYPE_CHART[attackerType]?.[defType];
    if (mult !== undefined) {
      multiplier *= mult;
    }
  });
  return multiplier;
};

export const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; border: string }> = {
  normal: { bg: '#A8A878', text: '#FFFFFF', border: '#8A8A59' },
  fire: { bg: '#F08030', text: '#FFFFFF', border: '#DD6610' },
  water: { bg: '#6890F0', text: '#FFFFFF', border: '#386CEB' },
  grass: { bg: '#78C850', text: '#FFFFFF', border: '#5CB030' },
  electric: { bg: '#F8D030', text: '#201F1E', border: '#E0B810' },
  ice: { bg: '#98D8D8', text: '#201F1E', border: '#69C6C6' },
  fighting: { bg: '#C03028', text: '#FFFFFF', border: '#9B221B' },
  poison: { bg: '#A040A0', text: '#FFFFFF', border: '#802880' },
  ground: { bg: '#E0C068', text: '#201F1E', border: '#CCAA40' },
  flying: { bg: '#A890F0', text: '#FFFFFF', border: '#8D70EC' },
  psychic: { bg: '#F85888', text: '#FFFFFF', border: '#EC2860' },
  bug: { bg: '#A8B820', text: '#FFFFFF', border: '#8D9B10' },
  rock: { bg: '#B8A038', text: '#FFFFFF', border: '#9B8420' },
  ghost: { bg: '#705898', text: '#FFFFFF', border: '#553E7B' },
  dragon: { bg: '#7038F8', text: '#FFFFFF', border: '#4C08EC' },
  steel: { bg: '#B8B8D0', text: '#201F1E', border: '#9797B8' },
  fairy: { bg: '#EE99AC', text: '#201F1E', border: '#E2738B' },
  dark: { bg: '#705848', text: '#FFFFFF', border: '#523E32' }
};
