import '@arcgis/map-components/dist/components/arcgis-map';
import styled from '@emotion/styled';
import React, { ComponentProps, useRef, useState } from 'react';
import { CoreFrame, IconButton, OptionTrack, SelectOne } from '../components';
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
          <ButtonInterior
            className="expanded"
            style={{
              opacity: selectedIndex === index ? 1 : 0,
              transition: selectedIndex !== index ? '120ms opacity' : '1000ms opacity',
            }}
          >
            <TrackButtonExpandedContent
              optionLabel={optionLabel}
              scenarios={buttonScenarios}
              transitioning={transitioning}
            />
          </ButtonInterior>
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

interface TrackButtonExpandedContentProps {
  optionLabel: string;
  scenarios: Scenario[];
  transitioning: boolean;
}

function TrackButtonExpandedContent(props: TrackButtonExpandedContentProps) {
  const [selectedScenarioIndex, _setSelectedScenarioIndex] = useState<number | null>(null);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);
  function setSelectedScenarioIndex(index: number | null) {
    _setSelectedScenarioIndex(index);
    setSelectedFeatureIndex(0);
  }

  const scenario =
    selectedScenarioIndex != null ? props.scenarios[selectedScenarioIndex] : undefined;
  const feature = scenario?.features?.[selectedFeatureIndex];

  if (scenario && !props.transitioning) {
    if (!feature) {
      return (
        <div className="scenario-content">
          <h2>{scenario.scenarioName}</h2>
          <p>No data available for this scenario.</p>
        </div>
      );
    }

    const Shell = ({ children }: { children: React.ReactNode }) => {
      return (
        <>
          <div className="backButton">
            <IconButton
              style={{ fontSize: 'inherit' }}
              onClick={() => setSelectedScenarioIndex(null)}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10.733 19.79a.75.75 0 0 0 1.034-1.086L5.516 12.75H20.25a.75.75 0 0 0 0-1.5H5.516l6.251-5.955a.75.75 0 0 0-1.034-1.086l-7.42 7.067a.995.995 0 0 0-.3.58.754.754 0 0 0 .001.289.995.995 0 0 0 .3.579l7.419 7.067Z"
                  fill="currentColor"
                />
              </svg>
            </IconButton>
          </div>
          <div className="scenario-content">
            {selectedFeatureIndex > 0 ? (
              <div className="leftButton">
                <IconButton
                  style={{ fontSize: 'inherit' }}
                  onClick={() => setSelectedFeatureIndex(selectedFeatureIndex - 1)}
                >
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M15.53 4.22a.75.75 0 0 1 0 1.06L8.81 12l6.72 6.72a.75.75 0 1 1-1.06 1.06l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 0 1 1.06 0Z"
                      fill="currentColor"
                    />
                  </svg>
                </IconButton>
              </div>
            ) : null}
            {children}
            {selectedFeatureIndex < scenario.features.length - 1 ? (
              <div className="rightButton">
                <IconButton
                  style={{ fontSize: 'inherit' }}
                  onClick={() => setSelectedFeatureIndex(selectedFeatureIndex + 1)}
                >
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M8.47 4.22a.75.75 0 0 0 0 1.06L15.19 12l-6.72 6.72a.75.75 0 1 0 1.06 1.06l7.25-7.25a.75.75 0 0 0 0-1.06L9.53 4.22a.75.75 0 0 0-1.06 0Z"
                      fill="currentColor"
                    />
                  </svg>
                </IconButton>
              </div>
            ) : null}
          </div>
        </>
      );
    };

    if (feature.affects === 'stops') {
      if (feature.type === 'infrastructure') {
        return (
          <Shell>
            <span className="number">{feature.count}</span>
            <h2>{feature.name}</h2>
            <p className="description">{feature.description}</p>
          </Shell>
        );
      }

      if (feature.type === 'accessibility') {
        return (
          <Shell>
            <span className="number">{feature.count} Stops</span>
            <h2>{feature.name}</h2>
            <p className="description">{feature.description}</p>
          </Shell>
        );
      }
    }

    if (feature.affects === 'routes') {
      if (feature.type === 'frequency') {
        const oldRateMinutes = feature.before;
        const newRateMinutes = feature.after;
        const percentageChange = ((newRateMinutes - oldRateMinutes) / oldRateMinutes) * 100;
        const isFaster = percentageChange < 0;

        return (
          <Shell>
            <span className="number">
              {parseFloat(Math.abs(percentageChange).toFixed(1))}
              {isFaster ? '% faster' : '% slower'}
            </span>
            <h2>{feature.name}</h2>
            <p className="description">{feature.description}</p>
          </Shell>
        );
      }

      if (feature.type === 'addition') {
        return (
          <Shell>
            <span className="number">{feature.routeIds.length}</span>
            <h2>New Route{feature.routeIds.length === 1 ? '' : 's'}</h2>
            <p className="description">{feature.description}</p>
          </Shell>
        );
      }
    }

    if (feature.affects === 'buses') {
      if (feature.type === 'purchase') {
        return (
          <Shell>
            <span className="number">{feature.count}</span>
            <h2>{feature.name}</h2>
            <p className="description">{feature.description}</p>
          </Shell>
        );
      }
    }

    if (feature.affects === 'on-demand') {
      if (feature.type === 'purchase') {
        return (
          <Shell>
            <span className="number">{feature.count}</span>
            <h2>New On-Demand Vans</h2>
            <p className="description">{feature.description}</p>
          </Shell>
        );
      }
    }
  }

  return (
    <div className="overview-content">
      <h2>{props.optionLabel}</h2>
      <p
        style={{
          margin: 0,
          fontStyle: 'italic',
          transform: 'translateY(-0.3em)',
          height: '0.5em',
          opacity: 0.8,
        }}
      >
        Select an option:
      </p>
      <div className="buttons">
        {props.scenarios.map((scenario, index) => (
          <button key={index} onClick={() => setSelectedScenarioIndex(index)}>
            <span className="label">{scenario.scenarioName}</span>
          </button>
        ))}
      </div>
    </div>
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

const ButtonInterior = styled.article`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  & > .overview-content {
    position: absolute;
    inset: 0em;
    padding: 2em 0 2em 0;

    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5em;

    h2 {
      margin: 0;
    }

    .buttons {
      display: flex;
      flex-direction: column;
      gap: 0em;

      button {
        width: 100%;
        border: none;
        padding: 0.825em;
        appearance: none;
        font-size: inherit;
        font-family: inherit;
        background-color: transparent;

        .label {
          position: relative;
          padding: 0.54em 0.8em;
          border-radius: 10em;
          overflow: hidden;
          box-shadow: inset 0 0 0 0.063em var(--control-stroke-default),
            inset 0 -0.063em 0 0 var(--control-stroke-secondary-overlay);

          &::before {
            content: '';
            display: block;
            position: absolute;
            background-color: rgb(54, 190, 101, 0.3);
            inset: 0;
            border-radius: 10em;
            z-index: -1;
          }
        }
      }

      button:hover:not(:disabled) {
        .label {
          background-color: var(--subtle-fill-secondary);
        }
      }

      button:active:not(:disabled) {
        .label {
          background-color: var(--subtle-fill-tertiary);
          color: var(--text-secondary);
          box-shadow: inset 0 0 0 0.063em var(--control-stroke-default);
        }
      }
    }
  }

  .backButton {
    position: absolute;
    left: 50%;
    top: 1em;
    transform: translateX(-50%);
  }

  & > .scenario-content {
    width: 80%;
    max-height: 80%;

    transform: translate(-50%, -50%);
    top: 50%;
    left: 50%;
    position: absolute;

    .leftButton {
      position: absolute;
      left: -1.5em;
      top: 50%;
      transform: translateY(-50%);
    }

    .rightButton {
      position: absolute;
      right: -1.5em;
      top: 50%;
      transform: translateY(-50%);
    }

    .number {
      background-color: white;
      display: inline-block;
      padding: 0.2em 1em;
      font-size: 1.25em;
      font-weight: 600;
      border-radius: 10em;
    }

    h2 {
      margin: 1em 0 0.7em 0;
      line-height: 1;
    }

    p {
      margin: 0;
    }
  }

  .backButton:not(:hover):not(:active):not(:focus) button,
  .rightButton:not(:hover):not(:active):not(:focus) button,
  .leftButton:not(:hover):not(:active):not(:focus) button {
    box-shadow: none;
  }
`;
