import styled from '@emotion/styled';
import { IconButton } from '../../common/IconButton/IconButton';

export interface SelectedItem {
  value: string;
  label: string;
}

interface SelectedOptionProps {
  selectedItems: SelectedItem[];
  onRemove: (value: string) => void;
}

export function SelectedOption({ selectedItems, onRemove }: SelectedOptionProps) {
  const draggable = false; // Disable drag feature for now. Implement if time.

  // Define the SVG content for the DRAG icon
  const DragIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15.75 15.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0-7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm7 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0-7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm7 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0-7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
        fill="currentColor"
      />
    </svg>
  );

  // Define the SVG content for the CLOSE icon
  const CloseIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m4.21 4.387.083-.094a1 1 0 0 1 1.32-.083l.094.083L12 10.585l6.293-6.292a1 1 0 1 1 1.414 1.414L13.415 12l6.292 6.293a1 1 0 0 1 .083 1.32l-.083.094a1 1 0 0 1-1.32.083l-.094-.083L12 13.415l-6.293 6.292a1 1 0 0 1-1.414-1.414L10.585 12 4.293 5.707a1 1 0 0 1-.083-1.32l.083-.094-.083.094Z"
        fill="currentColor"
      />
    </svg>
  );
  return (
    <StyledContainer>
      {selectedItems.map((item) => (
        <SelectedItemWrapper key={item.value}>
          {draggable && <StyledDragButton>{DragIcon}</StyledDragButton>}
          <ItemContent>
            <ItemValue>{item.label}</ItemValue>
          </ItemContent>
          <StyledCloseButton onClick={() => onRemove(item.value)}>{CloseIcon}</StyledCloseButton>
        </SelectedItemWrapper>
      ))}
    </StyledContainer>
  );
}

const StyledContainer = styled.div`
  display: flex;
  flex-wrap: wrap; /* Allows items to wrap to the next line */
  gap: 0.5rem; /* Space between selected items */
  padding: 0.5rem; /* Little padding around the whole group */
  border: 1px solid #d0d0d0;
  border-radius: var(--button-radius);
  background-color: #f9f9f9;
`;

const SelectedItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background-color: #e0e0e0;
  border: 1px solid #c0c0c0;
  border-radius: var(--button-radius);
`;

const ItemContent = styled.div`
  display: flex;
  flex-grow: 1;
  align-items: center;
  gap: 0.5rem; /* Space between icon and text */
`;

const StyledDragButton = styled(IconButton)`
  inline-size: 1.5rem; /* Match the size of the close button */
  block-size: 1.5rem;
  border: none; /* No border for the placeholder */
  background-color: transparent; /* Transparent background */
  color: #a0a0a0; /* Slightly lighter color to indicate less interactive */
  cursor: grab; /* Still provide the grab cursor */

  &:hover {
    background-color: transparent; /* No hover effect for placeholder */
  }

  &:active {
    background-color: transparent; /* No active effect for placeholder */
  }

  & > svg {
    block-size: 0.75rem; /* Smaller SVG icon */
    inline-size: 0.75rem;
    fill: currentColor;
  }
`;

const ItemValue = styled.span`
  // This definition
  font-size: 0.875rem;
  color: #333;
  white-space: nowrap;
`;

const StyledCloseButton = styled(IconButton)`
  inline-size: 1.5rem; /* Make the button smaller */
  block-size: 1.5rem; /* Make the button smaller */
  border: none; /* Remove border */
  background-color: transparent; /* Make background transparent */
  color: #888; /* Adjust icon color for close button */

  &:hover {
    background-color: #ccc; /* Lighter hover background */
  }

  &:active {
    background-color: #bbb;
  }

  & > svg {
    block-size: 0.75rem; /* Smaller SVG icon */
    inline-size: 0.75rem;
    fill: currentColor;
  }
`;
