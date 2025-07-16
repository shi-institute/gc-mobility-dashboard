import { useTravelMethodState } from './useTravelMethodState';

interface SelectedAreaProps {
  travelMethodList: string[];
}

export function SelectTravelMethod({ travelMethodList }: SelectedAreaProps) {
  const { handleTravelMethodSelectionChange, selectedTravelMethod } = useTravelMethodState();

  const options = ['any', ...travelMethodList];

  return (
    <label>
      Travel Method
      <select
        onChange={handleTravelMethodSelectionChange}
        value={selectedTravelMethod ?? ''}
        style={{ width: '100%' }}
      >
        {!selectedTravelMethod ? <option key="blank" value=""></option> : null}
        {options.map((method) => {
          return (
            <option key={method} value={method}>
              {method}
            </option>
          );
        })}
      </select>
    </label>
  );
}
