interface SelectOneProps {
  options: string[];
  onChange: (value: string) => void;
  value: string;
}

export function SelectOne({ options, onChange, value }: SelectOneProps) {
  function handleSelectionChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const newSelected = Array.from(evt.target.selectedOptions, (option) => option.value)[0];
    onChange(newSelected);
  }

  return (
    <select onChange={handleSelectionChange} value={value ?? ''} style={{ width: '100%' }}>
      <option key="blank" value=""></option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
