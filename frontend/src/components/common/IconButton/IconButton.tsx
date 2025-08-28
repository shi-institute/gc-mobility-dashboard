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
  /** For features that have an active-inactive state logic, you can specify when the feature described by the button is active */
  active?: boolean;

  style?: React.CSSProperties;
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
        style={props.style}
        active={props.active}
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
      style={props.style}
      active={props.active}
    >
      {props.children}
    </StyledButton>
  );
}

const StyledButton = styled.button<{ active?: boolean }>`
  font-size: 1rem;
  appearance: none;
  padding: 0;
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  min-inline-size: 2.25em;
  min-block-size: 2.25em;
  box-sizing: border-box;
  border: none;
  box-shadow: inset 0 0 0 0.063em var(--control-stroke-default),
    inset 0 -0.063em 0 0 var(--control-stroke-secondary-overlay);
  border-radius: var(--button-radius);
  color: inherit;
  user-select: none;
  background-color: transparent;
  flex-wrap: nowrap;
  transition: 120ms;
  ${(props) => props.title && `cursor: help;`}

  ${({ active }) => {
    if (!active) {
      return '';
    }

    return `
      background-color: hsla(0, 0%, 0%, 0.06);
      color: var(--color-primary);
    `;
  }}


  &:hover:not(.disabled) {
    background-color: var(--subtle-fill-secondary);
  }

  &:active:not(.disabled) {
    background-color: var(--subtle-fill-tertiary);
    color: var(--text-secondary);
    box-shadow: inset 0 0 0 0.063em var(--control-stroke-default);
  }

  &.disabled {
    background-color: var(--subtle-fill-disabled);
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  & > svg {
    fill: currentColor;
    block-size: 1.5em;
    inline-size: 1.5em;
  }
`;

const StyledAnchorButton = StyledButton.withComponent('a');

export { StyledButton as _StyledIconButton };
