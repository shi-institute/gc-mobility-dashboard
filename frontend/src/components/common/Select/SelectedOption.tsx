interface SelectedOptionProps {
  selectedOptions: string[];
}

export function SelectedOption({ selectedOptions }: SelectedOptionProps) {
  return (
    <label>
      {selectedOptions
        .filter((option) => selectedOptions.includes(option))
        .map((option) => (
          <span key={option} style={{ marginRight: '8px' }}>
            {option}
          </span>
        ))}
    </label>
  );
}
