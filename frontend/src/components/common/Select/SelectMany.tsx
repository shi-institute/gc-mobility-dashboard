import styled from '@emotion/styled';
import { Button } from '../Button/Button';
import { SelectedOption } from './SelectedOption';
import { SelectOne } from './SelectOne';

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
  function addOption(value: string) {
    const updatedSelection = [...selectedOptions, value];
    onChange(updatedSelection);
  }

  function removeOption(value: string) {
    const updatedSelection = selectedOptions.filter((option) => option !== value);
    onChange(updatedSelection);
  }

  return (
    <>
      <SelectOne
        options={options.filter((option) => !selectedOptions.includes(option))}
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

const SelectionActions = styled.div`
  display: flex;
  flex-direction: row;
  padding: 0.75rem 0 0;
  gap: 0.625rem;
`;
