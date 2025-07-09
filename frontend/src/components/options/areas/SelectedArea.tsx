//import { useSelectedAreasState } from './useSelectedAreasState';
import { SelectMany, SelectOne } from '../../common';
import { useComparisonModeState } from '../compare/useComparisonModeState';

interface SelectedAreaProps {
  areasList: string[];
}

export function SelectedArea({ areasList }: SelectedAreaProps) {
  const [isCompareEnabled] = useComparisonModeState();
  return isCompareEnabled ? (
    <div>
      <label>Select Multiple Areas:</label>
      <SelectMany options={areasList} />
    </div>
  ) : (
    <div>
      <label> Select a Single Area:</label>
      <SelectOne options={areasList} />
    </div>
  );
}

/*
  const { handleAreaSelectionChange, selectedArea } = useSelectedAreasState();

  return (
    <label>
      Area
      <select
        //onChange={handleAreaSelectionChange}
        //value={selectedArea ?? ''}
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
  */
