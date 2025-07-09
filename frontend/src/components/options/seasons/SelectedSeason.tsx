import { SelectMany, SelectOne } from '../../common';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedSeasonProps {
  seasonsList: string[];
}

export function SelectedSeason({ seasonsList }: SelectedSeasonProps) {
  const [isCompareEnabled] = useComparisonModeState();
  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Seasons:</label>
      <SelectMany />
    </div>
  ) : (
    <div>
      <label> Select a Single Season:</label>
      <SelectOne options={seasonsList} />
    </div>
  );
}
