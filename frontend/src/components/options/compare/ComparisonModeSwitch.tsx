import { ToggleSwitch } from '../../common';
import { useComparisonModeState } from './useComparisonModeState';

export function ComparisonModeSwitch() {
  const [isCompareEnabled, setIsComparisonEnabled] = useComparisonModeState();

  function handleChangeComparisonMode(checked: boolean) {
    setIsComparisonEnabled(checked);
  }

  return (
    <ToggleSwitch checked={isCompareEnabled} onChange={handleChangeComparisonMode}>
      Enable comparison mode
    </ToggleSwitch>
  );
}
