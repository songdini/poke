import React, { useEffect, useState } from 'react';
import './App.css';

interface Pokemon {
  name: string;
  sprites: {
    front_default: string;
  };
  types: {
    type: {
      name: string;
    };
  }[];
}

function App() {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://pokeapi.co/api/v2/pokemon/ditto')
      .then((res) => {
        if (!res.ok) throw new Error('데이터를 불러올 수 없습니다.');
        return res.json();
      })
      .then((data) => {
        setPokemon(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="App"><p>로딩 중...</p></div>;
  if (error) return <div className="App"><p>에러: {error}</p></div>;
  if (!pokemon) return null;

  return (
    <div className="App">
      <header className="App-header">
        <h1>포켓몬 도감</h1>
        <div className="pokemon-card">
          <img src={pokemon.sprites.front_default} alt={pokemon.name} />
          <h2>{pokemon.name.toUpperCase()}</h2>
          <p>타입: {pokemon.types.map((t) => t.type.name).join(', ')}</p>
        </div>
      </header>
    </div>
  );
}

export default App;
