import { useSearchParams } from 'react-router';

export function useTravelMethodState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedTravelMethod =
    searchParams.get('travelMethod') === '' ? 'any' : searchParams.get('travelMethod') || 'any';

  function handleSelectionChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(evt.target.selectedOptions, (option) => option.value);
    searchParams.set('travelMethod', selected[0] === 'any' ? '' : selected[0]);
    setSearchParams(searchParams);
  }

  return {
    selectedTravelMethod,
    handleTravelMethodSelectionChange: handleSelectionChange,
  };
}
