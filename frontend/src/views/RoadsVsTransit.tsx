import '@arcgis/map-components/dist/components/arcgis-map';
import styled from '@emotion/styled';
import { useRef, useState } from 'react';
import { CoreFrame, OptionTrack, SelectOne } from '../components';
import { AppNavigation } from '../components/navigation';
import { useRect } from '../hooks';

export function RoadsVsTransit() {
  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      header={<AppNavigation />}
      map={
        <div style={{ height: '100%' }}>
          <arcgis-map basemap="topo-vector" zoom={12} center="-82.4, 34.85"></arcgis-map>
        </div>
      }
      sections={[Comparison()]}
      disableSectionsGrid
    />
  );
}

function Comparison() {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [delayedSelectedIndex, setDelayedSelectedIndex] = useState(selectedIndex);
  const transitioning = selectedIndex !== delayedSelectedIndex;

  function switchSelectedIndex(index: number) {
    if (transitioning) {
      return; // prevent switching while another transition is in progress
    }

    setSelectedIndex(index);
    setTimeout(() => {
      setDelayedSelectedIndex(index);
    }, 300); // delay to allow for transition effect
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const containterRect = useRect(containerRef);

  const mode: 'row' | 'column' = containterRect.height < 980 ? 'column' : 'row';
  const hideSmallButtons = containterRect.height < 640;

  return (
    <ComparisionContainer ref={containerRef}>
      <div className="left-bar"></div>
      <ComparisonComponent>
        <div className="background"></div>

        <div className="bus-container"></div>
        <OptionTrack.Track
          mode={mode}
          style={`${
            mode === 'column' && !hideSmallButtons ? 'height: calc(100% - 100px); top: 100px;' : ''
          }
            
          ${
            hideSmallButtons
              ? `*[data-size="small"] {
              opacity: 0;
              pointer-events: none;
            }`
              : ''
          }
            
          `}
        >
          <OptionTrack.Button
            size={selectedIndex === 0 ? 400 : undefined}
            onClick={() => switchSelectedIndex(0)}
            transitioning={transitioning}
            as={delayedSelectedIndex === 0 ? 'div' : undefined}
            style={{
              right:
                selectedIndex === 0 && mode === 'row'
                  ? 'calc(-100% + var(--size) + 20px)'
                  : 'unset',
              top:
                selectedIndex === 0 && mode === 'row'
                  ? '100px'
                  : selectedIndex === 0 && mode === 'column'
                  ? '120px'
                  : 'unset',
              position: selectedIndex === 0 && mode === 'column' ? 'absolute' : 'relative',
              left: selectedIndex === 0 && mode === 'column' ? '50%' : 'unset',
            }}
          >
            <div
              className="label"
              style={{
                position: 'absolute',
                opacity: selectedIndex !== 0 ? 1 : 0,
                transition: '120ms opacity',
              }}
            >
              Option 1
            </div>
            <article
              className="expanded"
              style={{
                position: 'absolute',
                opacity: selectedIndex === 0 ? 1 : 0,
                transition: selectedIndex !== 0 ? '120ms opacity' : '1000ms opacity',
              }}
            >
              <h2>Option 1</h2>
              <p>A message goes here</p>
            </article>
          </OptionTrack.Button>
          {mode === 'column' ? (
            <OptionTrack.Button
              placeholderMode
              visible={selectedIndex === 0 || selectedIndex === 1}
            />
          ) : null}
          <OptionTrack.Button
            size={selectedIndex === 1 ? 400 : undefined}
            onClick={() => switchSelectedIndex(1)}
            transitioning={transitioning}
            as={delayedSelectedIndex === 1 ? 'div' : undefined}
            style={{
              right:
                selectedIndex === 1 && mode === 'row'
                  ? 'calc(-100% + var(--size) + 20px)'
                  : 'unset',
              top: selectedIndex === 1 && mode === 'column' ? '120px' : 'unset',
              position: selectedIndex === 1 && mode === 'column' ? 'absolute' : 'relative',
              left: selectedIndex === 1 && mode === 'column' ? '50%' : 'unset',
            }}
          >
            <div
              className="label"
              style={{
                position: 'absolute',
                opacity: selectedIndex !== 1 ? 1 : 0,
                transition: '120ms opacity',
              }}
            >
              Option 2
            </div>
            <article
              className="expanded"
              style={{
                position: 'absolute',
                opacity: selectedIndex === 1 ? 1 : 0,
                transition: selectedIndex !== 1 ? '120ms opacity' : '1000ms opacity',
              }}
            >
              <h2>Option 2</h2>
              <p>A message goes here</p>
            </article>
          </OptionTrack.Button>
          {mode === 'column' ? (
            <OptionTrack.Button
              placeholderMode
              visible={selectedIndex === 1 || selectedIndex === 2}
            />
          ) : null}
          <OptionTrack.Button
            size={selectedIndex === 2 ? 400 : undefined}
            onClick={() => switchSelectedIndex(2)}
            transitioning={transitioning}
            as={delayedSelectedIndex === 2 ? 'div' : undefined}
            style={{
              right:
                selectedIndex === 2 && mode === 'row'
                  ? 'calc(-100% + var(--size) + 20px)'
                  : 'unset',
              top: selectedIndex === 2 && mode === 'column' ? '120px' : 'unset',
              position: selectedIndex === 2 && mode === 'column' ? 'absolute' : 'relative',
              left: selectedIndex === 2 && mode === 'column' ? '50%' : 'unset',
            }}
          >
            <div
              className="label"
              style={{
                position: 'absolute',
                opacity: selectedIndex !== 2 ? 1 : 0,
                transition: '120ms opacity',
              }}
            >
              Option 3
            </div>
            <article
              className="expanded"
              style={{
                position: 'absolute',
                opacity: selectedIndex === 2 ? 1 : 0,
                transition: selectedIndex !== 2 ? '120ms opacity' : '1000ms opacity',
              }}
            >
              <h2>Option 3</h2>
              <p>A message goes here</p>
            </article>
          </OptionTrack.Button>
          {mode === 'column' ? (
            <OptionTrack.Button
              placeholderMode
              visible={selectedIndex === 2 || selectedIndex === 3}
            />
          ) : null}
          <OptionTrack.Button
            size={selectedIndex === 3 ? 400 : undefined}
            onClick={() => switchSelectedIndex(3)}
            transitioning={transitioning}
            as={delayedSelectedIndex === 3 ? 'div' : undefined}
            style={{
              right:
                selectedIndex === 3 && mode === 'row'
                  ? 'calc(-100% + var(--size) + 20px)'
                  : 'unset',
              top: selectedIndex === 3 && mode === 'column' ? '120px' : 'unset',
              position: selectedIndex === 3 && mode === 'column' ? 'absolute' : 'relative',
              left: selectedIndex === 3 && mode === 'column' ? '50%' : 'unset',
            }}
          >
            <div
              className="label"
              style={{
                position: 'absolute',
                opacity: selectedIndex !== 3 ? 1 : 0,
                transition: '120ms opacity',
              }}
            >
              Option 4
            </div>
            <article
              className="expanded"
              style={{
                position: 'absolute',
                opacity: selectedIndex === 3 ? 1 : 0,
                transition: selectedIndex !== 3 ? '120ms opacity' : '1000ms opacity',
              }}
            >
              <h2>Option 4</h2>
              <p>A message goes here</p>
            </article>
          </OptionTrack.Button>
          {mode === 'column' ? (
            <OptionTrack.Button placeholderMode visible={selectedIndex === 3} />
          ) : null}
        </OptionTrack.Track>

        <SelectOne
          className="selected-scenario"
          options={['Scenario 1', 'Scenario 2', 'Scenario 3', 'Scenario 4']}
          onChange={(value) => {
            const index = parseInt(value.split(' ')[1], 10) - 1;
            switchSelectedIndex(index);
          }}
          value={`Scenario ${selectedIndex + 1}`}
        ></SelectOne>
      </ComparisonComponent>
    </ComparisionContainer>
  );
}

const ComparisionContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  gap: 0.5rem;

  border-radius: var(--surface-radius);
  overflow: hidden;

  .left-bar {
    width: 3rem;
    background-color: hsl(96, 58%, 72%);

    flex-grow: 0;
    flex-shrink: 1;
  }

  @container core (max-width: 899px) {
    gap: 0;
    .left-bar {
      display: none;
    }
  }
`;

const ComparisonComponent = styled.div`
  height: 100%;
  position: relative;
  overflow-y: auto;

  flex-grow: 1;
  flex-shrink: 0;

  .background {
    background-color: hsl(231, 90%, 79%);
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 360px;

    @container core (max-width: 899px) {
      inset: 0;
      width: unset;
    }
  }

  .selected-scenario {
    width: 320px;
    background-color: rgb(255, 255, 255);
    box-sizing: border-box;
    position: absolute;
    top: 20px;
    right: 20px;
    height: 60px;
    font-size: 1.4rem;
    font-weight: 600;
    text-align: center;
    border-radius: 0;
    box-shadow: none;
    background-position-y: 21px;

    &:hover:not(:disabled) {
      background-color: rgba(255, 255, 255, 0.8);
    }

    @container core (max-width: 899px) {
      left: 20px;
      width: unset;
    }
  }

  .bus-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    border: 1px solid black;
    height: 200px;
    width: 400px;
  }
`;
