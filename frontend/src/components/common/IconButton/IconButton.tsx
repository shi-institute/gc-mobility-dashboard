import styled from '@emotion/styled';

interface IconButtonProps {
  /** If provided, the button will be an anchor tag that goes to this destination href. May be relative to the root OR a full href URL. */
  href?: string;
  /** Provide a click event handler to respond to client. */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  /** svg icon for the icon button */
  children?: React.ReactElement;
  /** whether the button is disabled */
  disabled?: boolean;
  className?: string;
}

/**
 * An icon button componnt. It's child should be an svg icon.
 */
export function IconButton(props: IconButtonProps) {
  if (props.href && !props.disabled) {
    return (
      <StyledAnchorButton href={props.href} onClick={props.onClick} className={props.className}>
        {props.children}
      </StyledAnchorButton>
    );
  }

  return (
    <StyledButton onClick={props.onClick} disabled={props.disabled} className={props.className}>
      {props.children}
    </StyledButton>
  );
}

const StyledButton = styled.button`
  appearance: none;
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  box-sizing: border-box;
  border: 1px solid lightgray;
  border-radius: var(--button-radius);
  color: inherit;
  user-select: none;
  background-color: #fff;
  flex-wrap: nowrap;
  transition: 120ms;

  &.active {
    box-shadow: inset 0 2px 0 var(--color-primary);
  }

  &:hover {
    background-color: #f4f4f4;
  }

  &:active {
    background-color: #ededed;
  }

  &:disabled {
    background-color: #f4f4f4;
    color: #a0a0a0;
    cursor: not-allowed;
  }

  & > svg {
    fill: currentColor;
    block-size: 1.5rem;
    inline-size: 1.5rem;
  }
`;

const StyledAnchorButton = StyledButton.withComponent('a');
