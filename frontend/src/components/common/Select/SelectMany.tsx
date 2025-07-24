import { SelectedOption } from './SelectedOption';

interface SelectManyProps {
  options: string[];
  onChange: (selectedValues: string[]) => void;
  selectedOptions: string[];
  /**
   * If true, the ID will be shown for selected options
   * Defaults to true;
   */
  showId?: boolean;
}

export function SelectMany({
  options,
  onChange,
  selectedOptions = [],
  showId = true,
}: SelectManyProps) {
  function handleAddSelectedOptions(evt: React.ChangeEvent<HTMLSelectElement>) {
    const newSelected = Array.from(evt.target.selectedOptions, (option) => option.value)[0];
    const combinedSelection = [...selectedOptions, newSelected];
    onChange(combinedSelection);
  }

  function removeOption(value: string) {
    const updatedSelection = selectedOptions.filter((option) => option !== value);
    onChange(updatedSelection);
  }

  return (
    <>
      <select onChange={handleAddSelectedOptions} style={{ width: '100%' }}>
        <option key="blank" value=""></option>

        {options
          .filter((option) => !selectedOptions.includes(option))
          .map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
      </select>

      {selectedOptions.map((selectedOption) => {
        return (
          <SelectedOption
            key={selectedOption}
            selectedOption={{ label: selectedOption, value: selectedOption }}
            onRemove={removeOption}
            showId={showId}
          />
        );
      })}
    </>
  );
}
