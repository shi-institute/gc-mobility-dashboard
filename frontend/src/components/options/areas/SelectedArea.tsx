import { useSearchParams } from 'react-router';
import { notEmpty } from '../../../utils';
import { SelectMany, SelectOne } from '../../common';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedAreaProps {
  areasList: string[];
}

export function SelectedArea({ areasList }: SelectedAreaProps) {
  const [isCompareEnabled] = useComparisonModeState();
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

  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Areas:</label>
      <SelectMany
        options={areasList}
        onChange={handleChange}
        selectedOptions={currentSelectedAreas}
        showId={false}
      />
    </div>
  ) : (
    <div>
      <label> Select a Single Area:</label>
      <SelectOne onChange={handleChange} options={areasList} value={currentSelectedAreas[0]} />
    </div>
  );
}
