//import { useSelectedSeasonsState } from './useSelectedSeasonsState';
/*
interface SelectOneProps {
  optionsList: string[];
}
*/
//export function SelectOne({ optionsList }: SelectOneProps) {
export function SelectOne() {
  //const { handleSeasonSelectionChange, selectedSeason } = useSelectedSeasonsState();
  const optionsList = ['test1', 'test2', 'test3'];

  return (
    <select
      //onChange={handleSeasonSelectionChange}
      //value={selectedSeason ?? ''}
      style={{ width: '100%' }}
    >
      <option key="blank" value=""></option>
      {optionsList.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
