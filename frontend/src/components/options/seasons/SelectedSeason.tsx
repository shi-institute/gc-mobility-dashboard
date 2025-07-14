import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { SelectMany, SelectOne } from '../../common';
import { SelectedItem, SelectedOption } from '../../common/Select/SelectedOption';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedSeasonProps {
  seasonsList: string[];
}

export function SelectedSeason({ seasonsList }: SelectedSeasonProps) {
  const [isCompareEnabled] = useComparisonModeState();
  const [searchParams, setSearchParams] = useSearchParams();

  const getCleanSeasonsFromParams = () => {
    const seasonsParam = searchParams.get('seasons');
    return seasonsParam ? seasonsParam.split(',').filter((s) => s !== '') : [];
  };

  useEffect(() => {
    if (!isCompareEnabled) {
      const currentSeasons = getCleanSeasonsFromParams();
      if (currentSeasons.length > 1) {
        searchParams.set('seasons', currentSeasons[0]);
        setSearchParams(searchParams);
      }
    }
  }, [isCompareEnabled, searchParams, setSearchParams]);

  const selectSeasons = getCleanSeasonsFromParams();

  function handleSelectionChange(selected: string[]) {
    if (selected.length === 0) {
      searchParams.delete('seasons');
    } else {
      searchParams.set('seasons', selected.join(','));
    }
    setSearchParams(searchParams);
  }

  function handleSingleSeasonChange(value: string) {
    if (value === '') {
      searchParams.delete('seasons');
    } else {
      searchParams.set('seasons', value);
    }
    setSearchParams(searchParams);
  }

  function handleRemoveSeason(seasonToRemove: string) {
    let currentSeasons = getCleanSeasonsFromParams();
    let updatedSeasons = currentSeasons.filter((s) => s !== seasonToRemove);

    if (updatedSeasons.length === 0) {
      searchParams.delete('seasons');
    } else {
      searchParams.set('seasons', updatedSeasons.join(','));
    }
    setSearchParams(searchParams);
  }

  const selectedItemsForDisplay: SelectedItem[] = selectSeasons.map((season) => ({
    value: season,
    label: season,
  }));

  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Seasons:</label>
      <SelectMany
        options={seasonsList}
        onChange={handleSelectionChange}
        selectedOptions={selectSeasons}
      />
      {selectedItemsForDisplay.length > 0 && (
        <SelectedOption selectedItems={selectedItemsForDisplay} onRemove={handleRemoveSeason} />
      )}
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
