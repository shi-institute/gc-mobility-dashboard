//import { useSelectedSeasonsState } from './useSelectedSeasonsState';

interface SelectOneProps {
  options: string[];
}

export function SelectOne({ options }: SelectOneProps) {
  //export function SelectOne() {
  //const { handleSeasonSelectionChange, selectedSeason } = useSelectedSeasonsState();
  //const options = ['test1', 'test2', 'test3'];
  // pass in seasons as a property of SelectOne or SelectMany

  return (
    <select
      //onChange={handleSeasonSelectionChange}
      //value={selectedSeason ?? ''}
      style={{ width: '100%' }}
    >
      <option key="blank" value=""></option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
