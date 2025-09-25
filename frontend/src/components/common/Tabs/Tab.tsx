import styled from '@emotion/styled';

interface TabProps {
  children?: React.ReactNode;
  /** The label for the tab */
  label: string;
  /** If provided, the tab will be an anchor tag that goes to this destination href. May be relative to the root OR a full href URL. */
  href?: string;
  /** Whether to style the tab as the current tab. */
  isActive?: boolean;
  /** Provide a click event handler to respond to client. */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  /** svg icon to appear to the left of the button label */
  iconLeft?: React.ReactNode;
  /** svg icon to appear to the right of the button label */
  iconRight?: React.ReactNode;

  variant?: 'standard' | 'line';

  style?: React.CSSProperties;
}

/**
 * A tab component that should be used within the `<Tabs />` component.
 * It can be either a button or an anchor tag.
 */
export function Tab(props: TabProps) {
  const Component = props.variant === 'line' ? OtherStyledTab : StyledTab;

  if (props.href) {
    return (
      <Component
        href={props.href}
        className={props.isActive ? 'active' : ''}
        onClick={props.onClick}
        style={props.style}
      >
        {props.iconLeft}
        <span className="label">{props.label}</span>
        {props.iconRight}
      </Component>
    );
  }

  return (
    <Component
      as="button"
      className={props.isActive ? 'active' : ''}
      onClick={props.onClick}
      style={props.style}
    >
      {props.iconLeft}
      <span className="label">{props.label}</span>
      {props.iconRight}
    </Component>
  );
}

const StyledTab = styled.a`
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
  border-bottom: none;
  border-radius: var(--button-radius) var(--button-radius) 0 0;
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

  & > svg {
    fill: currentColor;
    block-size: 1rem;
    inline-size: 1rem;
    margin-bottom: 2px;
  }

  &:has(> svg:first-of-type) {
    padding-left: 0.75rem;
  }
  svg + .label {
    margin-left: 0.375rem;
  }

  &:has(> svg:last-of-type) {
    padding-right: 0.75rem;
  }
  .label + svg {
    margin-left: 0.25rem;
  }
`;

const OtherStyledTab = styled.a`
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
  border: none;
  text-decoration: none;
  color: inherit;
  user-select: none;
  background-color: #fff;
  flex-wrap: nowrap;
  border-radius: var(--button-radius);

  .label {
    white-space: nowrap;
  }
  &.active {
    font-weight: bold;
    text-decoration: underline;
    text-decoration-color: var(--color-primary);
    text-decoration-thickness: 0.15rem;
    text-underline-offset: 0.25rem;
    padding-top: 0.1rem;
  }

  &:hover {
    background-color: #f4f4f4;
  }

  &:active {
    background-color: #ededed;
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
`;
