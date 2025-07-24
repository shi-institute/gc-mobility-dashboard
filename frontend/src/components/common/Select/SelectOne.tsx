import styled from '@emotion/styled';

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
    <SelectOneComponent
      onChange={handleSelectionChange}
      value={value ?? ''}
      style={{ width: '100%' }}
    >
      <option key="blank" value=""></option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </SelectOneComponent>
  );
}

const SelectOneComponent = styled.select`
  appearance: none;
  font-family: inherit;
  font-weight: 400;
  font-size: 0.875rem;
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0 1rem;
  height: 2.25rem;
  box-sizing: border-box;
  border: 1px solid lightgray;
  border-radius: var(--button-radius);
  text-decoration: none;
  color: inherit;
  user-select: none;
  background-color: #fff;
  flex-wrap: nowrap;

  /* add a down chevron icon */
  background-image: url('data:image/svg+xml,%3Csvg%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20d%3D%22M4.22%208.47a.75.75%200%200%201%201.06%200L12%2015.19l6.72-6.72a.75.75%200%201%201%201.06%201.06l-7.25%207.25a.75.75%200%200%201-1.06%200L4.22%209.53a.75.75%200%200%201%200-1.06Z%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20fill%3D%22currentColor%22%20%20%20%20%20%20%20%20%20%20%20%20%20%20%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position-x: calc(100% - 9px);
  background-position-y: 9px;

  &::after {
    content: '▼';
  }
`;
