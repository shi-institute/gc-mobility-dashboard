import { useSearchParams } from 'react-router';

export function useSelectedAreasState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedArea = searchParams.get('areas')?.split(',')?.[0];
  const comparisonAreas = searchParams.get('areas')?.split(',').slice(1) || [];

  function handleSelectionChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(evt.target.selectedOptions, (option) => option.value);

    if (evt.target.multiple) {
      const newComparisonAreas = selected.filter((area) => area !== selectedArea);
      searchParams.set('areas', [selectedArea, ...newComparisonAreas].join(','));
    } else {
      const newSelectedArea = selected[0];
      const filteredComparisonAreas = comparisonAreas.filter((area) => area !== newSelectedArea);
      searchParams.set('areas', [newSelectedArea, ...filteredComparisonAreas].join(','));
    }

    setSearchParams(searchParams);
  }

  return {
    selectedArea,
    comparisonAreas,
    handleAreaSelectionChange: handleSelectionChange,
  };
}
