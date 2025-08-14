import { useSearchParams } from 'react-router';
import { notEmpty } from '../../../utils';
import { SelectMany, SelectOne } from '../../common';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedJobAccessAreaProps {
  areasList: string[];
  forceCompare?: boolean;
}

export function SelectedJobAccessArea({ areasList, forceCompare }: SelectedJobAccessAreaProps) {
  const [_isComparing] = useComparisonModeState();
  const isComparing = forceCompare || _isComparing;
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSelectedAreas = searchParams.get('jobAreas')?.split(',').filter(notEmpty) || [];

  const options = areasList
    .map((value) => {
      const [area, season] = value.split('::');
      if (!area || !season) {
        return null;
      }

      const seasonLabel: [string, string | undefined] = (() => {
        if (season?.toLowerCase().includes('future')) {
          return ['Future', undefined];
        }

        const quarter = season.split(':')[0] as 'Q2' | 'Q4';
        const year = season.split(':')[1];
        const label = `${year} ${quarter}`;

        const monthRanges = {
          Q2: 'April-June',
          Q4: 'October-December',
        };
        const subLabel = `${monthRanges[quarter]}, ${year}`;

        return [label, subLabel];
      })();

      const label = `${area} (${seasonLabel[0]})`;
      const subLabel = seasonLabel[1] || '‾‾supressId';

      return { label, value, id: subLabel };
    })
    .filter(notEmpty);

  const selectedOptions = currentSelectedAreas
    .map((area) => {
      return options.find((option) => option.value === area);
    })
    .filter(notEmpty);

  function handleChange(value: string | string[]) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        searchParams.delete('jobAreas');
      } else {
        searchParams.set('jobAreas', value.join(','));
      }
    } else {
      if (value === '') {
        searchParams.delete('jobAreas');
      } else {
        searchParams.set('jobAreas', value);
      }
    }
    setSearchParams(searchParams);
  }

  return (
    <div>
      <label>Area{isComparing ? 's' : ''}</label>
      {isComparing ? (
        <SelectMany options={options} onChange={handleChange} selectedOptions={selectedOptions} />
      ) : (
        <SelectOne
          onChange={handleChange}
          options={options}
          value={selectedOptions[0]?.value || ''}
        />
      )}
    </div>
  );
}
