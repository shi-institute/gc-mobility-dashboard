import styled from '@emotion/styled';
import React, { useRef } from 'react';
import { SlickBottomSheet, SlickBottomSheetControl } from 'slick-bottom-sheet';

interface BottomSheetProps {
  children?: React.ReactNode;
}

export function BottomSheet(props: BottomSheetProps) {
  const ref = useRef<SlickBottomSheetControl>(null);

  return (
    <ComponentWrapper>
      <SlickBottomSheet
        isOpen
        onCloseStart={() => {
          ref.current?.snapTo(0);
        }}
        ref={ref}
        defaultSnap={0}
        onSnap={console.log}
        backdropBlock={false}
        closeOnBackdropTap={false}
        className="sheet"
        autoSnapAsMax={false}
        header={
          <div>
            <div className="line"></div>
          </div>
        }
        snaps={[0.1, 0.4, 1]}
      >
        {props.children}
      </SlickBottomSheet>
    </ComponentWrapper>
  );
}

const ComponentWrapper = styled.div`
  .sheet {
    background-color: white;
    border-radius: var(--surface-radius) var(--surface-radius) 0 0;
    border-top: 1px solid lightgray;
    border-bottom: 1px solid lightgray;
    position: relative;
  }

  .line {
    width: 36px;
    height: 4px;
    background-color: red;
    border-radius: 2px;
    margin: 8px auto;
  }

  .forceheight {
    height: 100vh;
  }

  .content {
  }
`;
