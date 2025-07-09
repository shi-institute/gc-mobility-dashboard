export function SelectMany() {
  //const { handleSeasonSelectionChange, selectedSeason } = useSelectedSeasonsState();
  const optionsList = ['multiple1', 'multiple2', 'multiple3', 'multiple4'];

  return (
    <select
      multiple
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
