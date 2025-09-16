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

  const options = areasList
    .map((area) => ({
      label: area === 'full_area' ? 'Greenville County' : area,
      value: area,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const currentSelectedAreas = searchParams.get('areas')?.split(',').filter(notEmpty) || [];
  const selectedOptions = currentSelectedAreas
    .map((area) => options.find((opt) => opt.value === area))
    .filter(notEmpty);

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
    setSearchParams(searchParams, { replace: true });
  }

  return (
    <div>
      <label>Area{isComparing ? 's' : ''}</label>
      {isComparing ? (
        <SelectMany
          options={options}
          onChange={handleChange}
          selectedOptions={selectedOptions}
          showId={false}
        />
      ) : (
        <SelectOne
          options={options}
          onChange={handleChange}
          value={selectedOptions[0]?.value || ''}
        />
      )}
    </div>
  );
}
