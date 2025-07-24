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
  /**
   * A tooltip for the icon button, which is shown on mouse hover by the browser.
   */
  title?: string;
}

/**
 * An icon button componnt. It's child should be an svg icon.
 */
export function IconButton(props: IconButtonProps) {
  if (props.href && !props.disabled) {
    return (
      <StyledAnchorButton
        href={props.href}
        onClick={props.onClick}
        className={props.disabled ? 'disabled ' + props.className : props.className}
        title={props.title}
      >
        {props.children}
      </StyledAnchorButton>
    );
  }

  return (
    <StyledButton
      onClick={props.onClick}
      disabled={props.disabled}
      className={props.disabled ? 'disabled ' + props.className : props.className}
      title={props.title}
    >
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
  min-inline-size: 2.25rem;
  min-block-size: 2.25rem;
  box-sizing: border-box;
  border: none;
  box-shadow: inset 0 0 0 1px var(--control-stroke-default),
    inset 0 -1px 0 0 var(--control-stroke-secondary-overlay);
  border-radius: var(--button-radius);
  color: inherit;
  user-select: none;
  background-color: #fff;
  flex-wrap: nowrap;
  transition: 120ms;
  ${(props) => props.title && `cursor: help;`}

  &.active {
    box-shadow: inset 0 2px 0 var(--color-primary);
  }

  &:hover:not(.disabled) {
    background-color: var(--subtle-fill-secondary);
  }

  &:active:not(.disabled) {
    background-color: var(--subtle-fill-tertiary);
    color: var(--text-secondary);
    box-shadow: inset 0 0 0 1px var(--control-stroke-default);
  }

  &.disabled {
    background-color: var(--subtle-fill-disabled);
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  & > svg {
    fill: currentColor;
    block-size: 1.5rem;
    inline-size: 1.5rem;
  }
`;

const StyledAnchorButton = StyledButton.withComponent('a');
