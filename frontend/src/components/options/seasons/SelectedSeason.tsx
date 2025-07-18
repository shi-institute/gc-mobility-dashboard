import { useSelectedSeasonsState } from './useSelectedSeasonsState';

interface SelectedSeasonProps {
  seasonsList: string[];
}

export function SelectedSeason({ seasonsList }: SelectedSeasonProps) {
  const { handleSeasonSelectionChange, selectedSeason } = useSelectedSeasonsState();

  return (
    <label>
      Reporting Period
      <select
        onChange={handleSeasonSelectionChange}
        value={selectedSeason ?? ''}
        style={{ width: '100%' }}
      >
        {!selectedSeason ? <option key="blank" value=""></option> : null}
        {seasonsList.map((season) => {
          const [quarter, year] = season.split(':');
          return (
            <option key={season} value={season}>
              {year} {quarter}
            </option>
          );
        })}
      </select>
    </label>
  );
}
