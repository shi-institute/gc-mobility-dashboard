import styled from '@emotion/styled';
import { Button } from '../Button/Button';
import { SelectOne } from './SelectOne';
import { SelectedOption } from './SelectedOption';

interface SelectManyProps {
  options: string[] | SelectOption[];
  onChange: (selectedValues: string[]) => void;
  selectedOptions: string[] | SelectOption[];
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
  const toOptValue = (option: string | SelectOption) =>
    typeof option === 'string' ? option : option.value;

  const toOptObject = (option: string | SelectOption) =>
    typeof option === 'string' ? { label: option, value: option } : option;

  const derivedSelectedOptions = selectedOptions.map(toOptObject);

  function addOption(value: string) {
    const updatedSelection = [...derivedSelectedOptions.map(toOptValue), value];
    onChange(updatedSelection);
  }

  function removeOption(value: string) {
    const updatedSelection = derivedSelectedOptions
      .map(toOptValue)
      .filter((option) => option !== value);
    onChange(updatedSelection);
  }

  return (
    <>
      <SelectOne
        options={options
          .map(toOptObject)
          .filter((option) => !derivedSelectedOptions.map(toOptValue).includes(option.value))}
        onChange={(value) => {
          if (value) {
            addOption(value);
          }
        }}
        value={''}
      />

      <SelectionActions>
        <Button style={{ height: '30px', fontWeight: 400 }} onClick={() => onChange([])}>
          Clear all
        </Button>
      </SelectionActions>

      {derivedSelectedOptions.map((selectedOption) => {
        return (
          <SelectedOption
            key={selectedOption.value}
            selectedOption={selectedOption}
            onRemove={removeOption}
            showId={showId}
          />
        );
      })}
    </>
  );
}

const SelectionActions = styled.div`
  display: flex;
  flex-direction: row;
  padding: 0.75rem 0 0;
  gap: 0.625rem;
`;
