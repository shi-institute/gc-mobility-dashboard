import { useSelectedAreasState } from './useSelectedAreasState';

interface SelectedAreaProps {
  areasList: string[];
}

export function SelectedArea({ areasList }: SelectedAreaProps) {
  const { handleAreaSelectionChange, selectedArea } = useSelectedAreasState();

  return (
    <label>
      Area
      <select
        onChange={handleAreaSelectionChange}
        value={selectedArea ?? ''}
        style={{ width: '100%' }}
      >
        {!selectedArea ? <option key="blank" value=""></option> : null}
        {areasList.map((area) => {
          return (
            <option key={area} value={area}>
              {area}
            </option>
          );
        })}
      </select>
    </label>
  );
}
