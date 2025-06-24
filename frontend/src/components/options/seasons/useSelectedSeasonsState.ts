import { useSearchParams } from 'react-router';

export function useSelectedSeasonsState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedSeason = searchParams.get('seasons')?.split(',')?.[0];
  const comparisonSeasons = searchParams.get('seasons')?.split(',').slice(1) || [];

  function handleSelectionChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(evt.target.selectedOptions, (option) => option.value);

    if (evt.target.multiple) {
      const newComparisonSeasons = selected.filter((season) => season !== selectedSeason);
      searchParams.set('seasons', [selectedSeason, ...newComparisonSeasons].join(','));
    } else {
      const newSelectedSeason = selected[0];
      const filteredComparisonSeasons = comparisonSeasons.filter(
        (season) => season !== newSelectedSeason
      );
      searchParams.set('seasons', [newSelectedSeason, ...filteredComparisonSeasons].join(','));
    }

    setSearchParams(searchParams);
  }

  return {
    selectedSeason,
    comparisonSeasons,
    handleSeasonSelectionChange: handleSelectionChange,
  };
}
