import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { SelectMany, SelectOne } from '../../common';
import { SelectedOption } from '../../common/Select/SelectedOption';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedSeasonProps {
  seasonsList: string[];
}

export function SelectedSeason({ seasonsList }: SelectedSeasonProps) {
  const [isCompareEnabled] = useComparisonModeState();
  const [searchParams, setSearchParams] = useSearchParams();

  // Add useEffect hook to remove extra seasons from URL params
  useEffect(() => {
    if (!isCompareEnabled) {
      const currentSeasons = searchParams.get('seasons')?.split(',') || [];
      if (currentSeasons.length > 1) {
        // If there's more than one season, keep only the first one
        searchParams.set('seasons', currentSeasons[0]);
        setSearchParams(searchParams);
      }
    }
  }, [isCompareEnabled, searchParams, setSearchParams]);

  const selectSeasons = searchParams.get('seasons')?.split(',') || [];

  function handleSelectionChange(selected: string[]) {
    searchParams.set('seasons', selected.join(','));
    setSearchParams(searchParams);
  }

  function handleSingleSeasonChange(value: string) {
    searchParams.set('seasons', value);
    setSearchParams(searchParams);
  }

  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Seasons:</label>
      <SelectMany
        options={seasonsList}
        onChange={handleSelectionChange}
        selectedOptions={selectSeasons}
      />
      <SelectedOption selectedOptions={selectSeasons} />
    </div>
  ) : (
    <div>
      <label> Select a Single Season:</label>
      <SelectOne
        onChange={handleSingleSeasonChange}
        options={seasonsList}
        value={selectSeasons[0]}
      />
    </div>
  );
}
