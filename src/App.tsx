import React, { useEffect, useState } from 'react';
import './App.css';

interface PokemonListItem {
  name: string;
  url: string;
}

interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

const PAGE_SIZE = 10;

function getPokemonIdFromUrl(url: string) {
  const match = url.match(/\/pokemon\/(\d+)\/?$/);
  return match ? match[1] : '';
}

function App() {
  const [pokemonList, setPokemonList] = useState<PokemonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPokemonList([]);
    fetch(`https://pokeapi.co/api/v2/pokemon?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      .then((res) => {
        if (!res.ok) throw new Error('데이터를 불러올 수 없습니다.');
        return res.json();
      })
      .then((data: PokemonListResponse) => {
        setPokemonList(data.results);
        setTotal(data.count);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="App">
      <header className="App-header">
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            이전
          </button>
          <span style={{ margin: '0 16px' }}>
            {page + 1} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            다음
          </button>
        </div>
        {loading && <p>로딩 중...</p>}
        {error && <p>에러: {error}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
          {pokemonList.map((pokemon) => {
            const id = getPokemonIdFromUrl(pokemon.url);
            const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
            return (
              <div className="pokemon-card" key={pokemon.name}>
                <img src={imgUrl} alt={pokemon.name} />
                <h2>{pokemon.name.toUpperCase()}</h2>
              </div>
            );
          })}
        </div>
      </header>
    </div>
  );
}

export default App;
