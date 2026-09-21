'use client';

import SearchForm from '@/components/SearchForm';
import type { SearchRequest } from '@/types/game';
import { serializeSearchRequest } from '@/lib/search-url';

export default function SearchSection() {
  const handleSearch = (req: SearchRequest) => {
    const qs = serializeSearchRequest(req);
    window.open('/results' + (qs ? '?' + qs : ''), '_blank');
  };

  return <SearchForm onSearch={handleSearch} />;
}
