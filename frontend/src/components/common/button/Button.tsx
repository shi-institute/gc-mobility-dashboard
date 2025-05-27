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
    >
      {props.iconLeft}
      <span className="label">{props.children}</span>
      {props.iconRight}
    </StyledButton>
  );
}

const StyledButton = styled.button`
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
  border: 1px solid lightgray;
  border-radius: var(--button-radius);
  text-decoration: none;
  color: inherit;
  user-select: none;
  background-color: #fff;
  flex-wrap: nowrap;

  .label {
    white-space: nowrap;
  }

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
    block-size: 1rem;
    inline-size: 1rem;
  }

  &:has(> svg:first-child) {
    padding-left: 0.75rem;
  }
  svg + .label {
    margin-left: 0.25rem;
  }

  &:has(> svg:last-child) {
    padding-right: 0.75rem;
  }
  .label + svg {
    margin-left: 0.25rem;
  }
`;

const AnchorButton = StyledButton.withComponent('a');
