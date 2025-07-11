interface SelectManyProps {
  options: string[];
  onChange: (selectedValues: string[]) => void;
  selectedOptions: string[];
}

export function SelectMany({ options, onChange, selectedOptions = [] }: SelectManyProps) {
  function handleAddSelectedOptions(evt: React.ChangeEvent<HTMLSelectElement>) {
    const newSelected = Array.from(evt.target.selectedOptions, (option) => option.value)[0];
    const combinedSelection = [...selectedOptions, newSelected];
    onChange(combinedSelection);
  }

  return (
    <select onChange={handleAddSelectedOptions} style={{ width: '100%' }}>
      <option key="blank" value=""></option>
      {options.map(
        (option) =>
          !selectedOptions.includes(option) && (
            <option key={option} value={option}>
              {option}
            </option>
          )
      )}
    </select>
  );
}
