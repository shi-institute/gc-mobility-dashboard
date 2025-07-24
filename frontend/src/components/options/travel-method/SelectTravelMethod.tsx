import { useSearchParams } from 'react-router';
import { SelectOne } from '../../common';

interface SelectedAreaProps {
  travelMethodList: string[];
}

export function SelectTravelMethod({ travelMethodList }: SelectedAreaProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedTravelMethod =
    searchParams.get('travelMethod') === '' ? 'any' : searchParams.get('travelMethod') || 'any';

  function handleChange(value: string) {
    searchParams.set('travelMethod', value === 'any' ? '' : value);
    setSearchParams(searchParams);
  }

  const options = ['any', ...travelMethodList];
  const displayOptions = options.map((method) => ({
    label: displayMap.get(method) || method,
    value: method,
  }));

  return (
    <label>
      Travel Method
      <SelectOne options={displayOptions} value={selectedTravelMethod} onChange={handleChange} />
    </label>
  );
}

const displayMap = new Map<string, string>();
displayMap.set('any', 'Any');
displayMap.set('biking', 'Biking');
displayMap.set('carpool', 'Carpool');
displayMap.set('commerical', 'Commerical');
displayMap.set('on_demand_auto', 'Rideshare (Uber, Lyft, etc.)');
displayMap.set('other_travel_mode', 'Other');
displayMap.set('private_auto', 'Personal Vehicle');
displayMap.set('public_transit', 'Public Transit');
displayMap.set('walking', 'Walking');
