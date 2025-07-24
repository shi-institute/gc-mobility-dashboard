import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { notEmpty } from '../../../utils';
import { SelectMany, SelectOne } from '../../common';
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

  const options = seasonsList.map((season) => {
    const quarter = season.split(':')[0] as 'Q2' | 'Q4';
    const year = season.split(':')[1];
    const label = `${year} ${quarter}`;

    const monthRanges = {
      Q2: 'April-June',
      Q4: 'October-December',
    };

    const subLabel = `${monthRanges[quarter]}, ${year}`;

    return { label, value: season, id: subLabel };
  });
  const selectedOptions = selectSeasons
    .map((season) => {
      return options.find((option) => option.value === season);
    })
    .filter(notEmpty);

  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Seasons:</label>
      <SelectMany
        options={options}
        onChange={handleSelectionChange}
        selectedOptions={selectedOptions}
      />
    </div>
  ) : (
    <div>
      <label> Select a Single Season:</label>
      <SelectOne
        options={options}
        onChange={handleSingleSeasonChange}
        value={selectedOptions[0]?.value}
      />
    </div>
  );
}
