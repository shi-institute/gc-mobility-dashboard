import { useSelectedAreasState } from './useSelectedAreasState';

interface SelectedComparisonAreasProps {
  areasList: string[];
}

export function SelectedComparisonAreas({ areasList }: SelectedComparisonAreasProps) {
  const { comparisonAreas, handleAreaSelectionChange, selectedArea } = useSelectedAreasState();

  return (
    <label>
      Areas
      <select
        multiple
        onChange={handleAreaSelectionChange}
        value={comparisonAreas}
        style={{ width: '100%' }}
      >
        {areasList.map((area) => {
          return (
            <option value={area} disabled={area === selectedArea}>
              {area}
            </option>
          );
        })}
      </select>
    </label>
  );
}
