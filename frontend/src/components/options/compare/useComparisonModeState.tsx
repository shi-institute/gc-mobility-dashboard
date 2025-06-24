import { useSearchParams } from 'react-router';

export function useComparisonModeState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const isEnabled = searchParams.get('compare') === '1';

  const setIsEnabled = (enabled: boolean) => {
    if (enabled) {
      searchParams.set('compare', '1');
    } else {
      searchParams.delete('compare');
    }
    setSearchParams(searchParams);
  };

  return [isEnabled, setIsEnabled] as const;
}
