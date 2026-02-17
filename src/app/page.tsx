'use client';

import SearchForm from '@/components/SearchForm';
import type { SearchRequest } from '@/types/game';

export default function Home() {
  const handleSearch = (req: SearchRequest) => {
    window.open('/results?q=' + encodeURIComponent(JSON.stringify(req)), '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gaia Project Game Search
          </h1>
          <p className="text-gray-600">
            Search and analyze Board Game Arena Gaia Project games
          </p>
        </header>

        <SearchForm onSearch={handleSearch} />
      </div>
    </div>
  );
}
