import { useSelectedSeasonsState } from './useSelectedSeasonsState';

interface SelectedComparisonSeasonsProps {
  seasonsList: string[];
}

export function SelectedComparisonSeasons({ seasonsList }: SelectedComparisonSeasonsProps) {
  const { comparisonSeasons, handleSeasonSelectionChange, selectedSeason } =
    useSelectedSeasonsState();

  return (
    <label>
      Seasons
      <select
        multiple
        onChange={handleSeasonSelectionChange}
        value={comparisonSeasons}
        style={{ width: '100%' }}
      >
        {seasonsList.map((season) => {
          return (
            <option key={season} value={season} disabled={season === selectedSeason}>
              {season}
            </option>
          );
        })}
      </select>
    </label>
  );
}
