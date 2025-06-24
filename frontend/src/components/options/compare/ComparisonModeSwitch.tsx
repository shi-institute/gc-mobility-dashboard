import { useComparisonModeState } from './useComparisonModeState';

export function ComparisonModeSwitch() {
  const [isCompareEnabled, setIsComparisonEnabled] = useComparisonModeState();

  function handleChangeComparisonMode(evt: React.ChangeEvent<HTMLInputElement>) {
    setIsComparisonEnabled(evt.target.checked);
  }

  return (
    <label style={{ display: 'block' }}>
      <input type="checkbox" checked={isCompareEnabled} onChange={handleChangeComparisonMode} />
      Enable comparison mode
    </label>
  );
}
