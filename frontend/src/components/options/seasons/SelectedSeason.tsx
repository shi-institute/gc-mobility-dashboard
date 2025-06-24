import { useSelectedSeasonsState } from './useSelectedSeasonsState';

interface SelectedSeasonProps {
  seasonsList: string[];
}

export function SelectedSeason({ seasonsList }: SelectedSeasonProps) {
  const { handleSeasonSelectionChange, selectedSeason } = useSelectedSeasonsState();

  return (
    <label>
      Reporting window
      <select
        onChange={handleSeasonSelectionChange}
        value={selectedSeason}
        style={{ width: '100%' }}
      >
        {seasonsList.map((season) => {
          const [quarter, year] = season.split(':');
          return (
            <option value={season}>
              {year} {quarter}
            </option>
          );
        })}
      </select>
    </label>
  );
}
