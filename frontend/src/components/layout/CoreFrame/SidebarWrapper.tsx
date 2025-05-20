import styled from '@emotion/styled';
import { useCallback, useState } from 'react';
import { IconButton } from '../../common';

interface SidebarWrapperProps {
  children: React.ReactNode;
  frameWidth: number;
  onToggleFixedSidebar?: (open: boolean) => void;
}

export function SidebarWrapper(props: SidebarWrapperProps) {
  const [optionsOpen, _setOptionsOpen] = useState(false);
  const setOptionsOpen = useCallback((bool: boolean) => {
    _setOptionsOpen(bool);
    setForceClosed(false);

    if (bool) {
      setScrimVisible(true);
    } else {
      setTimeout(() => {
        setScrimVisible(false);
      }, 300);
    }
  }, []);

  const [scrimVisible, setScrimVisible] = useState(false);

  const [forceClosed, _setForceClosed] = useState(false);
  const setForceClosed = useCallback(
    (bool: boolean) => {
      _setForceClosed(bool);
      props.onToggleFixedSidebar?.(bool);
    },
    [props.onToggleFixedSidebar]
  );

  // close the overlay sidebar if the window expands to >= 1280px
  if (props.frameWidth >= 1280 && optionsOpen) {
    setOptionsOpen(false);
  }

  if (props.frameWidth >= 1280 && !forceClosed) {
    return (
      <StyledSidebarWrapper isOpen={!forceClosed}>
        <CloseButton onClick={() => setForceClosed(true)}>
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.193 9.249a.75.75 0 0 1 1.059-.056l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 0 1-1.004-1.115l1.048-.942H6.75a.75.75 0 1 1 0-1.5h3.546l-1.048-.942a.75.75 0 0 1-.055-1.06ZM22 17.25A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5Zm-2.75 1.25c.69 0 1.25-.56 1.25-1.25V6.749c0-.69-.56-1.25-1.25-1.25h-3.254V18.5h3.254Zm-4.754 0V5.5H4.75c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h9.746Z"
              fill="currentColor"
            />
          </svg>
        </CloseButton>
        {props.children}
      </StyledSidebarWrapper>
    );
  }

  const openButton = (
    <OpenButtonWrapper>
      <button
        onClick={() => (props.frameWidth >= 1280 ? setForceClosed(false) : setOptionsOpen(true))}
      >
        Show options
      </button>
    </OpenButtonWrapper>
  );

  if (props.frameWidth >= 1280) {
    return openButton;
  }

  return (
    <>
      <FloatingSidebarWrapper isOpen={optionsOpen}>
        <CloseButton onClick={() => setOptionsOpen(false)} size="1rem">
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m4.397 4.554.073-.084a.75.75 0 0 1 .976-.073l.084.073L12 10.939l6.47-6.47a.75.75 0 1 1 1.06 1.061L13.061 12l6.47 6.47a.75.75 0 0 1 .072.976l-.073.084a.75.75 0 0 1-.976.073l-.084-.073L12 13.061l-6.47 6.47a.75.75 0 0 1-1.06-1.061L10.939 12l-6.47-6.47a.75.75 0 0 1-.072-.976l.073-.084-.073.084Z"
              fill="currentColor"
            />
          </svg>
        </CloseButton>
        {props.children}
      </FloatingSidebarWrapper>
      {openButton}
      <Scrim
        optionsOpen={optionsOpen}
        visible={scrimVisible}
        onClick={() => setOptionsOpen(false)}
      />
    </>
  );
}

const StyledSidebarWrapper = styled.div<{ isOpen?: boolean }>`
  position: relative;
  min-width: 300px;
  border: 1px solid hsla(0, 0%, 46%, 40%);
  border-radius: var(--surface-radius);
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
`;

const FloatingSidebarWrapper = styled.div<{ isOpen?: boolean }>`
  --width: 300px;
  position: absolute;
  top: 0;
  right: ${({ isOpen }) => (isOpen ? '0' : 'calc(-1 * var(--width) - 2rem)')};
  width: var(--width);
  height: calc(100% - 2rem);
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  margin: 1rem;
  box-sizing: border-box;
  transition: 200ms cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid hsla(0, 0%, 46%, 40%);
  border-radius: var(--surface-radius);
  box-shadow: 0px 32px 64px hsla(0, 0%, 0%, 18.76%), 0px 2px 21px hsl(0, 0%, 0%, 14.74%);
  background-color: hsl(0, 0%, 98%);

  @container core (max-width: 499px) {
    --width: 100%;
    margin: 0;
    height: 100%;
    border-radius: 0;
  }
`;

const Scrim = styled.div<{ optionsOpen: boolean; visible: boolean }>`
  position: absolute;
  inset: 0;
  background-color: black;
  z-index: 9998;
  opacity: ${({ optionsOpen }) => (optionsOpen ? 0.12 : 0)};
  visibility: ${({ visible }) => (visible ? 'visible' : 'hidden')};
  transition: opacity 360ms;
`;

const OpenButtonWrapper = styled.div`
  position: absolute;
  right: 0;
  bottom: 1rem;
  block-size: 2.25rem;
  background-color: white;
  border: 1px solid lightgray;
  border-radius: var(--button-radius);

  @container core (max-width: 899px) {
    transform: rotate(90deg);
    transform-origin: top right;
    bottom: 3rem;
  }
`;

const CloseButton = styled(IconButton)<{ size?: string }>`
  position: absolute;
  top: 2px;
  right: 2px;

  &:not(:hover):not(:active) {
    border-color: transparent;
    background: none;
  }

  ${({ size }) => (size ? `svg { inline-size: ${size}; }` : '')}
`;
