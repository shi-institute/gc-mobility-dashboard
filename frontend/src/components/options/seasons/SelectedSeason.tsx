import { useSearchParams } from 'react-router';
import { SelectMany, SelectOne } from '../../common';
import { SelectedOption } from '../../common/Select/SelectedOption';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedSeasonProps {
  seasonsList: string[]; // This is the full list of available seasons
}

export function SelectedSeason({ seasonsList }: SelectedSeasonProps) {
  const [isCompareEnabled] = useComparisonModeState();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectSeasons = searchParams.get('seasons')?.split(',') || [];

  const filteredSeasonsForMany = seasonsList.filter((season) => !selectSeasons.includes(season));

  const optionsForSelectOne = seasonsList;

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
        options={filteredSeasonsForMany}
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
        options={optionsForSelectOne}
        value={selectSeasons[0]}
      />
    </div>
  );
}
