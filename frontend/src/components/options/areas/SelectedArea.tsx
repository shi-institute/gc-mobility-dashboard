import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { SelectMany, SelectOne } from '../../common';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedAreaProps {
  areasList: string[];
}

export function SelectedArea({ areasList }: SelectedAreaProps) {
  const [isCompareEnabled] = useComparisonModeState();
  const [searchParams, setSearchParams] = useSearchParams();

  const getCleanAreasFromParams = () => {
    const areasParam = searchParams.get('areas');
    return areasParam ? areasParam.split(',').filter((s) => s !== '') : [];
  };

  useEffect(() => {
    if (!isCompareEnabled) {
      const currentAreas = getCleanAreasFromParams();
      if (currentAreas.length > 1) {
        searchParams.set('areas', currentAreas[0]);
        setSearchParams(searchParams);
      }
    }
  }, [isCompareEnabled, searchParams, setSearchParams]);

  const selectAreas = getCleanAreasFromParams();

  function handleSelectionChange(selected: string[]) {
    if (selected.length === 0) {
      searchParams.delete('areas');
    } else {
      searchParams.set('areas', selected.join(','));
    }
    setSearchParams(searchParams);
  }
  function handleSingleAreaChange(value: string) {
    if (value === '') {
      searchParams.delete('areas');
    } else {
      searchParams.set('areas', value);
    }
    setSearchParams(searchParams);
  }

  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Areas:</label>
      <SelectMany
        options={areasList}
        onChange={handleSelectionChange}
        selectedOptions={selectAreas}
      />
    </div>
  ) : (
    <div>
      <label> Select a Single Area:</label>
      <SelectOne onChange={handleSingleAreaChange} options={areasList} value={selectAreas[0]} />
    </div>
  );
}
