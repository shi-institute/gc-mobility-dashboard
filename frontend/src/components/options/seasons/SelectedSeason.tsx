import { SelectOne } from '../select/SelectOne';

import { useComparisonModeState } from '../compare/useComparisonModeState';
import { SelectMany } from '../select/SelectMany';

export function SelectedSeason() {
  const [isCompareEnabled] = useComparisonModeState();
  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Seasons:</label>
      <SelectMany />
    </div>
  ) : (
    <div>
      <label> Select a Single Season:</label>
      <SelectOne />
    </div>
  );
}
