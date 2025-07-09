interface SelectManyProps {
  options: string[];
}

export function SelectMany({ options }: SelectManyProps) {
  //const { handleSeasonSelectionChange, selectedSeason } = useSelectedSeasonsState();
  return (
    <select
      multiple
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
