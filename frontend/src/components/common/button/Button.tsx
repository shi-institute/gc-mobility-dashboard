import styled from '@emotion/styled';
import React from 'react';

export default MyButton;

/**
 * MyButtonProps: The properties for the MyButton component.
 */
type MyButtonProps = {
  /** the name of the button or the text held within it */
  buttonName: string;
  /** optional link property given to MyButton */
  URL?: string;
  /** svg icon to appear to the left of the button label */
  iconLeft?: React.ReactNode;
  /** svg icon to appear to the right of the button label */
  iconRight?: React.ReactNode;
};

/**
 * MyButton: A reusable button component that can either be a regular button or a link.
 */
function MyButton({ buttonName, URL, iconLeft, iconRight }: MyButtonProps) {
  function handleClick() {
    if (URL) {
      window.open(URL, '_blank', 'noopener,noreferrer');
    } else {
      alert('Button Clicked!');
    }
  }

  return (
    <StyledButton type="button" onClick={handleClick} title={URL}>
      {iconLeft}
      <span className="label">{buttonName}</span>
      {iconRight}
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

/**
 * <span> tag: A span element that wraps the actual text of the button in a style tag (<StyledButton></StyledButton>)
 * StyledButton is a React component that renders a button with a specific style when used like this: <StyledButton></StyledButton>
 * The button can be styled using CSS properties defined in the StyledButton component. When used as a tag, it renders an instance
 * of the StyledButton component with the specified properties.
 */
