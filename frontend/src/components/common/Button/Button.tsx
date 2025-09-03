import styled from '@emotion/styled';

/**
 * MyButtonProps: The properties for the MyButton component.
 */
interface MyButtonProps {
  children: React.ReactNode;
  /** optional link property given to MyButton */
  href?: string;
  /** svg icon to appear to the left of the button label */
  iconLeft?: React.ReactNode;
  /** svg icon to appear to the right of the button label */
  iconRight?: React.ReactNode;

  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;

  disabled?: boolean;

  style?: React.CSSProperties;
  /** draws a solid surface of the specified color under the button */
  solidSurfaceColor?: string;
}

/**
 * MyButton: A reusable button component that can either be a regular button or a link.
 */
export function Button(props: MyButtonProps) {
  if (props.href) {
    return (
      <AnchorButton
        as="a"
        href={props.href}
        className={props.disabled ? 'disabled' : ''}
        onClick={props.onClick}
        title={props.href}
        style={props.style}
        solidSurfaceColor={props.solidSurfaceColor}
      >
        {props.iconLeft}
        <span className="label">{props.children}</span>
        {props.iconRight}
      </AnchorButton>
    );
  }

  return (
    <StyledButton
      type="button"
      onClick={props.onClick}
      title={props.href}
      disabled={props.disabled}
      className={props.disabled ? 'disabled' : ''}
      style={props.style}
      solidSurfaceColor={props.solidSurfaceColor}
    >
      {props.iconLeft}
      <span className="label">{props.children}</span>
      {props.iconRight}
    </StyledButton>
  );
}

const StyledButton = styled.button<{ solidSurfaceColor?: string }>`
  appearance: none;
  font-family: inherit;
  font-weight: 500;
  font-size: 0.875rem;
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0 1rem;
  height: 2.25rem;
  box-sizing: border-box;
  border: none;
  box-shadow: inset 0 0 0 1px var(--control-stroke-default),
    inset 0 -1px 0 0 var(--control-stroke-secondary-overlay);
  border-radius: var(--button-radius);
  text-decoration: none;
  color: inherit;
  user-select: none;
  background-color: transparent;
  flex-wrap: nowrap;
  transition: var(--wui-control-faster-duration);
  position: relative;

  .label {
    white-space: nowrap;
  }

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
    block-size: 1rem;
    inline-size: 1rem;
  }

  &:has(> svg:first-of-type) {
    padding-left: 0.75rem;
  }
  svg + .label {
    margin-left: 0.25rem;
  }

  &:has(> svg:last-of-type) {
    padding-right: 0.75rem;
  }
  .label + svg {
    margin-left: 0.25rem;
  }

  ${({ solidSurfaceColor }) => {
    if (solidSurfaceColor) {
      return `
        &::before {
            content: '';
            position: absolute;
            inset: 0;
            background-color: ${solidSurfaceColor};
            border-radius: inherit;
            z-index: -1;
          }
      `;
    }
  }}
`;

const AnchorButton = StyledButton.withComponent('a');
