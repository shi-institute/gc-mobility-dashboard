import styled from '@emotion/styled';
import React, { useRef, useState } from 'react';

interface ToggleSwitchProps {
  disabled?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  disabled,
  checked: controlledChecked,
  onChange,
  children,
  ...restProps
}) => {
  const [internalChecked, setInternalChecked] = useState(false);
  const isControlled = controlledChecked !== undefined;
  const currentChecked = isControlled ? controlledChecked : internalChecked;

  const inputRef = useRef<HTMLInputElement>(null);

  const update = () => {
    if (!disabled) {
      if (isControlled) {
        onChange?.(!currentChecked);
      } else {
        setInternalChecked(!currentChecked);
        onChange?.(!currentChecked);
      }
    }
  };

  const handleKeydown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.target !== inputRef.current) {
      return;
    }

    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      if (evt.currentTarget instanceof HTMLElement) {
        evt.currentTarget.click();
      }
    }
  };

  return (
    <ToggleContainer>
      <input
        type="checkbox"
        className="toggle-switch"
        disabled={disabled}
        checked={currentChecked}
        onClick={update}
        onKeyDown={handleKeydown}
        ref={inputRef}
        {...restProps}
      />
      {children && <span>{children}</span>}
    </ToggleContainer>
  );
};

const ToggleContainer = styled.label`
  display: inline-flex;
  align-items: center;
  user-select: none;
  font-size: 0.875rem;
  font-weight: normal;
  line-height: 20px;
  color: var(--text-primary);
  min-block-size: 32px;

  > span {
    padding-inline-start: 8px;
  }

  .toggle-switch {
    display: inline-flex;
    align-items: center;
    user-select: none;
    font-size: 0.875rem;
    font-weight: normal;
    line-height: 20px;

    position: relative;
    margin: 0;
    border: 1px solid var(--control-strong-stroke-default);
    border-radius: 20px;
    background-color: var(--control-alt-secondary);
    appearance: none;
    inline-size: 40px;
    block-size: 20px;
  }

  .toggle-switch::before {
    content: '';
    position: absolute;
    border-radius: 7px;
    background-color: var(--text-secondary);
    transition: var(--wui-control-fast-duration) ease-in-out transform,
      var(--wui-control-fast-duration) var(--wui-control-fast-out-slow-in-easing) height,
      var(--wui-control-fast-duration) var(--wui-control-fast-out-slow-in-easing) width,
      var(--wui-control-fast-duration) var(--wui-control-fast-out-slow-in-easing) margin,
      var(--wui-control-faster-duration) linear background;
    inset-inline-start: 3px;
    inline-size: 12px;
    block-size: 12px;
  }

  .toggle-switch:hover {
    background-color: var(--control-alt-tertiary);
  }
  .toggle-switch:hover::before {
    inline-size: 14px;
    block-size: 14px;
  }

  .toggle-switch:active {
    background-color: var(--control-alt-quarternary);
  }
  .toggle-switch:active::before {
    inline-size: 17px;
    block-size: 14px;
  }

  .toggle-switch:disabled {
    border-color: var(--control-strong-stroke-disabled);
    background-color: var(--control-alt-disabled);
  }
  .toggle-switch:disabled::before {
    margin: 0 !important;
    background-color: var(--text-disabled);
    box-shadow: none;
    inline-size: 12px;
    block-size: 12px;
  }
  .toggle-switch:disabled + span {
    color: var(--text-disabled);
  }

  .toggle-switch:checked {
    border: none;
    background-color: var(--color-primary);
  }
  .toggle-switch:checked::before {
    background-color: #ffffff;
    box-shadow: 0 0 0 1px solid var(--control-stroke-default);
    transform: translateX(20px);
  }
  .toggle-switch:checked:hover {
    background-color: var(--color-primary--hover);
  }
  .toggle-switch:checked:hover::before {
    margin-inline-start: -1px;
  }
  .toggle-switch:checked:active {
    background-color: var(--color-primary--active);
  }
  .toggle-switch:checked:active::before {
    margin-inline-start: -4px;
  }
  .toggle-switch:checked:disabled {
    background-color: var(--color-gray);
  }
  .toggle-switch:checked:disabled::before {
    box-shadow: none;
    background-color: #ddd;
  }
`;
