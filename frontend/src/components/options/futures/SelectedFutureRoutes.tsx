import { useSearchParams } from 'react-router';
import { notEmpty } from '../../../utils';
import { SelectMany, SelectOne } from '../../common';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedFutureRoutesProps {
  routeIds: string[];
}

export function SelectedFutureRoutes({ routeIds }: SelectedFutureRoutesProps) {
  const [isComparing] = useComparisonModeState();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSelectedFutures = searchParams.get('futures')?.split(',').filter(notEmpty) || [];

  function handleChange(value: string | string[]) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        searchParams.delete('futures');
      } else {
        searchParams.set('futures', value.join(','));
      }
    } else {
      if (value === '') {
        searchParams.delete('futures');
      } else {
        searchParams.set('futures', value);
      }
    }
    setSearchParams(searchParams);
  }

  return (
    <div>
      <label>Future Route{isComparing ? 's' : ''}</label>
      {isComparing ? (
        <SelectMany
          options={routeIds}
          onChange={handleChange}
          selectedOptions={currentSelectedFutures}
          showId={false}
        />
      ) : (
        <SelectOne
          onChange={handleChange}
          options={routeIds}
          value={currentSelectedFutures[0] || ''}
        />
      )}
    </div>
  );
}
