import '@arcgis/map-components/dist/components/arcgis-map';
import styled from '@emotion/styled';
import { ComponentProps, useRef, useState } from 'react';
import { CoreFrame, OptionTrack, SelectOne } from '../components';
import { AppNavigation } from '../components/navigation';
import { useAppData, useRect } from '../hooks';

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
      sections={[<Comparison />]}
      disableSectionColumns
    />
  );
}

function Comparison() {
  const { scenarios: scenariosData } = useAppData();
  const scenarios = scenariosData.data?.scenarios?.scenarios || [];
  const mileOptions = Array.from(new Set(scenarios.map((s) => s.pavementMiles))).map(
    (m) => `${m} mile${m !== 1 ? 's' : ''}`
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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

  const mode: 'row' | 'column' =
    containterRect.height && containterRect.height < 880 ? 'column' : 'row';
  const hideSmallButtons =
    (selectedIndex === null && mode === 'column') ||
    (containterRect.height && containterRect.height < 640);
  hideSmallButtons;

  const trackButtonProps = (index: number) => {
    const optionLabel = mileOptions[index] || `Option ${index + 1}`;

    const buttonScenarios = scenarios.filter(
      (s) => s.pavementMiles === parseFloat(mileOptions[index]?.split(' ')[0] ?? '-1')
    );

    return {
      size: selectedIndex === index ? 400 : undefined,
      onClick: () => switchSelectedIndex(index),
      transitioning,
      as: delayedSelectedIndex === index ? 'div' : undefined,
      style: {
        right:
          selectedIndex === index && mode === 'row' ? 'calc(-100% + var(--size) + 20px)' : 'unset',
        top: (() => {
          if (index === 0) {
            return selectedIndex === index && mode === 'row'
              ? '100px'
              : selectedIndex === index && mode === 'column'
              ? '120px'
              : 'unset';
          }

          return selectedIndex === index && mode === 'column' ? '120px' : 'unset';
        })(),
        position: selectedIndex === index && mode === 'column' ? 'absolute' : 'relative',
        left: selectedIndex === index && mode === 'column' ? '50%' : 'unset',
      },
      children: (
        <>
          <div
            className="label"
            style={{
              position: 'absolute',
              opacity: selectedIndex !== index ? 1 : 0,
              transition: '120ms opacity',
            }}
          >
            {optionLabel}
          </div>
          <article
            className="expanded"
            style={{
              position: 'absolute',
              opacity: selectedIndex === index ? 1 : 0,
              transition: selectedIndex !== index ? '120ms opacity' : '1000ms opacity',
            }}
          >
            <h2>{optionLabel}</h2>
            {buttonScenarios.map((scenario, index) => (
              <button
                key={index}
                style={{ fontSize: 'inherit', borderRadius: '0.1875em', borderWidth: '0.0625em' }}
              >
                {scenario.scenarioName}
              </button>
            ))}
          </article>
        </>
      ),
    } satisfies ComponentProps<typeof OptionTrack.Button>;
  };

  return (
    <ComparisionContainer ref={containerRef}>
      <div className="left-bar"></div>
      <ComparisonComponent>
        <div className="background"></div>

        <div
          className="imagine-prose"
          style={{ opacity: selectedIndex === null ? 1 : 0, transition: '120ms opacity' }}
        >
          <p>1 mile of road pavement costs around $1 Million -</p>
          <p>What happens when this amount is spent on public transit instead?</p>
        </div>

        <img src="./img/bus.webp" alt="" className="bus-container" />
        <OptionTrack.Track
          mode={mode}
          style={`${(() => {
            if (mode === 'column') {
              if (hideSmallButtons) {
                return 'height: calc(100% - 10px); top: 10px;';
              }
              return 'height: calc(100% - 120px); top: 120px;';
            }
            return '';
          })()}
            
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
          <OptionTrack.Button {...trackButtonProps(0)} />
          {mode === 'column' ? (
            <OptionTrack.Button
              placeholderMode
              visible={selectedIndex === 0 || selectedIndex === 1}
            />
          ) : null}
          <OptionTrack.Button {...trackButtonProps(1)} />
          {mode === 'column' ? (
            <OptionTrack.Button
              placeholderMode
              visible={selectedIndex === 1 || selectedIndex === 2}
            />
          ) : null}
          <OptionTrack.Button {...trackButtonProps(2)} />
          {mode === 'column' ? (
            <OptionTrack.Button
              placeholderMode
              visible={selectedIndex === 2 || selectedIndex === 3}
            />
          ) : null}
          <OptionTrack.Button {...trackButtonProps(3)} />
          {mode === 'column' ? (
            <OptionTrack.Button placeholderMode visible={selectedIndex === 3} />
          ) : null}
        </OptionTrack.Track>

        <SelectOne
          className="selected-scenario"
          options={mileOptions}
          onChange={(value) => {
            const index = mileOptions.indexOf(value);
            switchSelectedIndex(index);
          }}
          value={selectedIndex !== null ? mileOptions[selectedIndex] || '' : ''}
          placeholder="Imagine"
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
    background-color: hsla(102, 63%, 60%, 0.75);

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
    background-color: hsla(229, 100%, 66%, 0.6);
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
    height: 80px;
    font-size: 1.8rem;
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

  .imagine-prose {
    width: 320px;
    position: absolute;
    top: 100px;
    right: 20px;

    p:first-of-type {
      font-size: 1.4rem;
      font-weight: 600;
      color: white;
      text-shadow: 0 0 40px var(--color-secondary), 0 0 2px var(--color-secondary);
    }

    p:last-of-type {
      font-size: 1.1rem;
      font-weight: 500;
      color: hsl(83, 97%, 75%);
      text-shadow: 0 0 40px var(--color-secondary), 0 0 2px var(--color-secondary);
    }
  }

  .bus-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 400px;
  }
`;
