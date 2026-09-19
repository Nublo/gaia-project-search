'use client';

import SearchForm from '@/components/SearchForm';
import type { SearchRequest } from '@/types/game';
import { serializeSearchRequest } from '@/lib/search-url';

interface SearchSectionProps {
  lostFleetGameCount: number;
}

export default function SearchSection({ lostFleetGameCount }: SearchSectionProps) {
  const handleSearch = (req: SearchRequest) => {
    const qs = serializeSearchRequest(req);
    window.open('/results' + (qs ? '?' + qs : ''), '_blank');
  };

  return <SearchForm onSearch={handleSearch} lostFleetGameCount={lostFleetGameCount} />;
}
