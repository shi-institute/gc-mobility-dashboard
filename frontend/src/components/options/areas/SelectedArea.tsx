import { useSearchParams } from 'react-router';
import { notEmpty } from '../../../utils';
import { SelectMany, SelectOne } from '../../common';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedAreaProps {
  areasList: string[];
}

export function SelectedArea({ areasList }: SelectedAreaProps) {
  const [isComparing] = useComparisonModeState();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSelectedAreas = searchParams.get('areas')?.split(',').filter(notEmpty) || [];

  function handleChange(value: string | string[]) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        searchParams.delete('areas');
      } else {
        searchParams.set('areas', value.join(','));
      }
    } else {
      if (value === '') {
        searchParams.delete('areas');
      } else {
        searchParams.set('areas', value);
      }
    }
    setSearchParams(searchParams);
  }

  return (
    <div>
      <label>Area{isComparing ? 's' : ''}</label>
      {isComparing ? (
        <SelectMany
          options={areasList}
          onChange={handleChange}
          selectedOptions={currentSelectedAreas}
          showId={false}
        />
      ) : (
        <SelectOne onChange={handleChange} options={areasList} value={currentSelectedAreas[0]} />
      )}
    </div>
  );
}
