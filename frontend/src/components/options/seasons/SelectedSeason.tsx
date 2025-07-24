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

  const currentSelectedSeasons = searchParams.get('seasons')?.split(',').filter(notEmpty) || [];

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
  const selectedOptions = currentSelectedSeasons
    .map((season) => {
      return options.find((option) => option.value === season);
    })
    .filter(notEmpty);

  function handleChange(value: string | string[]) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        searchParams.delete('seasons');
      } else {
        searchParams.set('seasons', value.join(','));
      }
    } else {
      if (value === '') {
        searchParams.delete('seasons');
      } else {
        searchParams.set('seasons', value);
      }
    }
    setSearchParams(searchParams);
  }

  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Seasons:</label>
      <SelectMany options={options} onChange={handleChange} selectedOptions={selectedOptions} />
    </div>
  ) : (
    <div>
      <label> Select a Single Season:</label>
      <SelectOne options={options} onChange={handleChange} value={selectedOptions[0]?.value} />
    </div>
  );
}
