import { useSearchParams } from 'react-router';

export function useSelectedSeasonsState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectSeasons = searchParams.get('seasons')?.split(',') || [];

  function handleSelectionChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(evt.target.selectedOptions, (option) => option.value);

    if (evt.target.multiple) {
      searchParams.set('seasons', selected.join(','));
    } else {
      searchParams.set('seasons', selected[0]);
    }

    setSearchParams(searchParams);
  }

  return {
    selectSeasons,
    handleSeasonSelectionChange: handleSelectionChange,
  };
}
