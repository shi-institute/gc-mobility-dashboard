import styled from '@emotion/styled';
import { IconButton } from '../IconButton/IconButton';

interface SelectedOptionProps {
  /**
   * The selected option to display. This should be an object with `label` and `value` properties.
   */
  selectedOption: SelectOption;
  /**
   * Fires when the remove button is clicked.
   */
  onRemove?: (value: string) => void;
  /**
   * If true, the ID will be shown in the selected option.
   * Defaults to true;
   */
  showId?: boolean;
  disabled?: boolean;
}

export function SelectedOption({
  selectedOption,
  onRemove,
  showId = true,
  disabled,
}: SelectedOptionProps) {
  return (
    <SelectedItemWrapper key={selectedOption.value}>
      <div className="select-item-detail">
        <div className="selected-item-label">{selectedOption.label}</div>
        {showId ? (
          <div className="selected-item-id">{selectedOption.id || selectedOption.value}</div>
        ) : null}
      </div>
      {onRemove ? (
        <StyledCloseButton onClick={() => onRemove(selectedOption.value)} disabled={disabled}>
          {CloseIcon}
        </StyledCloseButton>
      ) : null}
    </SelectedItemWrapper>
  );
}

const CloseIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="m4.21 4.387.083-.094a1 1 0 0 1 1.32-.083l.094.083L12 10.585l6.293-6.292a1 1 0 1 1 1.414 1.414L13.415 12l6.292 6.293a1 1 0 0 1 .083 1.32l-.083.094a1 1 0 0 1-1.32.083l-.094-.083L12 13.415l-6.293 6.292a1 1 0 0 1-1.414-1.414L10.585 12 4.293 5.707a1 1 0 0 1-.083-1.32l.083-.094-.083.094Z"
      fill="currentColor"
    />
  </svg>
);

const SelectedItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  margin-top: 6px;
  background-color: var(--card-background-default);
  box-shadow: inset 0 0 0 1px var(--control-stroke-default);
  border-radius: var(--button-radius);

  .select-item-detail {
    --drag-handle-width: 0;
    --close-button-width: 30px;
    display: flex;
    flex-direction: column;
    padding: 10px;
    flex-grow: 1;
    width: calc(100% - var(--drag-handle-width) - var(--close-button-width));
    box-sizing: border-box;

    .selected-item-label {
      font-size: 14px;
      color: var(--text-primary);
      font-variant-numeric: lining-nums;
      line-height: 16px;
      flex-wrap: nowrap;
      word-break: break-word;
      position: relative;
    }

    .selected-item-id {
      font-size: 11px;
      font-variant-numeric: lining-nums;
      line-height: 16px;
      flex-wrap: nowrap;
      color: var(--text-secondary);
      opacity: 0.8;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

const StyledCloseButton = styled(IconButton)`
  box-shadow: none;
  &:not(:hover):not(:active) {
    background: none;
  }

  svg {
    inline-size: 1rem;
  }
`;
