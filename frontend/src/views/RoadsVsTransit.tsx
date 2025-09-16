import '@arcgis/map-components/dist/components/arcgis-map';
import styled from '@emotion/styled';
import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Button,
  CoreFrame,
  IconButton,
  manualSectionIds,
  OptionTrack,
  renderManualSection,
  renderSections,
  SelectOne,
  Map as WebMap,
} from '../components';
import { AppNavigation } from '../components/navigation';
import { useAppData, useHighlightHandles, useRect, useSectionsVisibility } from '../hooks';
import { useFutureMapData, useMapData } from '../hooks/useMapData';
import { mapUtils, notEmpty } from '../utils';

export function RoadsVsTransit() {
  const { data, loading, scenarios: scenariosData } = useAppData();

  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const {
    areaPolygons,
    routes,
    stops,
    walkServiceAreas,
    cyclingServiceAreas,
    paratransitServiceAreas,
  } = useMapData(data);
  const {
    futureRoutes,
    futureStops,
    futureWalkServiceAreas,
    futureCyclingServiceAreas,
    futureParatransitServiceAreas,
  } = useFutureMapData(scenariosData.data?.futureRoutes || [], undefined, mapView, {
    zoomTo: 'routes',
  });

  const [visibleSections, setVisibleSections] = useSectionsVisibility();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === 'true';

  const render = renderManualSection.bind(null, visibleSections, 'roadsVsTransitScenarios');

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      loading={loading || scenariosData.loading}
      header={<AppNavigation />}
      map={
        render(
          <div style={{ height: '100%' }} title="Map">
            <WebMap
              layers={[
                walkServiceAreas,
                ...futureWalkServiceAreas,
                cyclingServiceAreas,
                ...futureCyclingServiceAreas,
                paratransitServiceAreas,
                ...futureParatransitServiceAreas,
                ...futureRoutes,
                routes,
                ...futureStops,
                stops,
                ...areaPolygons,
              ].filter(notEmpty)}
              onMapReady={(_, view) => {
                setMapView(view);
              }}
            />
          </div>
        ) ?? undefined
      }
      sections={renderSections([
        (() => {
          if (!editMode) {
            return null;
          }

          if (visibleSections?.[manualSectionIds.roadsVsTransitScenarios]) {
            return (
              <Button
                onClick={() => {
                  setVisibleSections((prev) => {
                    const newVisibleSections = { ...prev };
                    delete newVisibleSections[manualSectionIds.roadsVsTransitScenarios];
                    return newVisibleSections;
                  });
                }}
              >
                Hide this tab
              </Button>
            );
          }

          return (
            <Button
              onClick={() => {
                setVisibleSections((prev) => ({
                  ...prev,
                  [manualSectionIds.roadsVsTransitScenarios]: [''],
                }));
              }}
            >
              Show this tab
            </Button>
          );
        })(),
        render(<Comparison key={0} title="Scenarios" mapView={mapView} />),
      ])}
      disableSectionColumns
    />
  );
}

function Comparison(props: { title: string; mapView: __esri.MapView | null }) {
  const { scenarios: scenariosData } = useAppData();
  const scenarios = scenariosData.data?.scenarios?.scenarios || [];
  const mileOptions = Array.from(new Set(scenarios.map((s) => s.pavementMiles))).map(
    (m) => `${m} mile${m !== 1 ? 's' : ''}`
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [delayedSelectedIndex, setDelayedSelectedIndex] = useState(selectedIndex);
  const transitioning = selectedIndex !== delayedSelectedIndex;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function switchSelectedIndex(index: number | null) {
    if (transitioning) {
      return; // prevent switching while another transition is in progress
    }

    setSelectedIndex(index);
    setTimeout(
      () => {
        setDelayedSelectedIndex(index);
      },
      prefersReducedMotion ? 0 : 300
    ); // delay to allow for transition effect
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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
              transition: 'var(--wui-control-faster-duration) opacity',
            }}
          >
            {optionLabel}
          </div>
          <ButtonInterior
            className="expanded"
            style={{
              opacity: selectedIndex === index ? 1 : 0,
              transition:
                selectedIndex !== index
                  ? 'var(--wui-control-faster-duration) opacity'
                  : prefersReducedMotion
                  ? '0 opacity'
                  : '1000ms opacity',
            }}
          >
            <TrackButtonExpandedContent
              optionLabel={optionLabel}
              scenarios={buttonScenarios}
              transitioning={transitioning}
              mapView={props.mapView}
            />
          </ButtonInterior>
        </>
      ),
    } satisfies ComponentProps<typeof OptionTrack.Button>;
  };

  function resetSelectedIndex() {
    if (selectedIndex !== null) {
      switchSelectedIndex(null);
    }
  }

  return (
    <ComparisionContainer ref={containerRef}>
      <div className="left-bar"></div>
      <ComparisonComponent>
        <ClickableBackground className="background" onClick={resetSelectedIndex} />

        <div
          className="imagine-prose"
          style={{
            opacity: selectedIndex === null ? 1 : 0,
            transition: 'var(--wui-control-faster-duration) opacity',
          }}
        >
          <p>One mile of road costs around $1 million!</p>
          <p>
            What if we invested that money in transit infrastructure instead? Click compare, select
            a distance of paved road, and see how we can fund new transit projects.
          </p>
        </div>

        <img src="./img/bus.webp" alt="" className="bus-container" />
        <OptionTrack.Track
          mode={mode}
          style={`${(() => {
            const baseStyle = 'z-index: 1;';

            if (mode === 'column') {
              if (hideSmallButtons) {
                return baseStyle + 'height: calc(100% - 10px); top: 10px;';
              }
              return baseStyle + 'height: calc(100% - 120px); top: 120px;';
            }
            return baseStyle;
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
          placeholder="Compare"
        ></SelectOne>
      </ComparisonComponent>
    </ComparisionContainer>
  );
}

interface ClickableBackgroundProps {
  className?: string;
  onClick?: (event: MouseEvent) => void;
}

function ClickableBackground(props: ClickableBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = useRect(ref);

  // Add an event listener to the document and detects any click that occurs in the rectangle
  // defined by the rect above. If a click occurs in that rectangle, log to the console.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        rect &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        // do not proceed if the click originated from a button, select, anchor, or foreignObject
        let element = event.target as Element;
        while (element && element !== event.currentTarget) {
          if (['BUTTON', 'SELECT', 'A', 'foreignObject'].includes(element.tagName)) {
            return; // Ignore the event
          }
          element = element.parentElement as HTMLElement;
        }

        // forward the event to the onClick prop
        props.onClick?.(event);
      }
    }

    ref?.current?.parentElement?.addEventListener('click', onClick);
    return () => {
      ref?.current?.parentElement?.removeEventListener('click', onClick);
    };
  }, [rect, ref.current, props.onClick]);

  return <div ref={ref} className={props.className}></div>;
}

interface TrackButtonExpandedContentProps {
  optionLabel: string;
  scenarios: NonNullable<
    NonNullable<ReturnType<typeof useAppData>['scenarios']['data']>['scenarios']
  >['scenarios'];
  transitioning: boolean;
  mapView: __esri.MapView | null;
}

function TrackButtonExpandedContent(props: TrackButtonExpandedContentProps) {
  // =========================================================================
  // SECTION 1: useState Hooks
  // =========================================================================
  const [selectedScenarioIndex, _setSelectedScenarioIndex] = useState<number | null>(null);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);
  const [lineIdToLayerIdMap, setLineIdToLayerIdMap] = useState(new Map<string, string>());

  // =========================================================================
  // SECTION 2: REGULAR FUNCTIONS & useCallback HOOKS
  // =========================================================================
  function setSelectedScenarioIndex(index: number | null) {
    _setSelectedScenarioIndex(index);
    setSelectedFeatureIndex(0);
  }

  // =========================================================================
  // SECTION 3:useEffect HOOKS
  // =========================================================================

  // build a mapping of line_id to layer id for the future route layers
  // so that we can easily find the right layer to highlight for a given line_id
  useEffect(() => {
    props.mapView?.when(async () => {
      const geoJsonLayers = Array.from(props.mapView?.map?.allLayers || []).filter(
        (layer): layer is __esri.GeoJSONLayer => layer.type === 'geojson'
      );
      const futureRouteLayers = geoJsonLayers.filter((layer) =>
        layer.id.startsWith('future_route__')
      );

      if (!futureRouteLayers || futureRouteLayers.length === 0) {
        setLineIdToLayerIdMap(new Map());
        return;
      }

      // prepare a mapping of line_id to layer id
      const newLineIdToLayerIdMap = new Map<string, string>();

      for await (const layer of futureRouteLayers) {
        await layer
          .queryFeatures()
          .then((featureSet) => {
            const lineIds = featureSet.features.map(
              (feature) => feature.attributes.line_id as string
            );

            const uniqueLineIds = Array.from(new Set(lineIds));
            if (uniqueLineIds.length > 1) {
              console.warn(`Layer ${layer.id} has multiple line_ids:`, uniqueLineIds);
            }

            const firstLineId = uniqueLineIds[0];
            if (!firstLineId) {
              console.warn(`Layer ${layer.id} has no line_id.`);
              return;
            }

            newLineIdToLayerIdMap.set(firstLineId, layer.id);
          })
          .catch((error) => {
            console.error(`Error querying features for layer ${layer.id}:`, error);
          });
      }

      // save the mapping to state
      setLineIdToLayerIdMap(newLineIdToLayerIdMap);
    });
  }, [props.mapView]);

  // =========================================================================
  // SECTION 4: NON-HOOK DERIVATIONS
  // =========================================================================

  const scenario =
    selectedScenarioIndex != null ? props.scenarios[selectedScenarioIndex] : undefined;

  const feature = props.transitioning ? undefined : scenario?.features?.[selectedFeatureIndex];

  const handles = useHighlightHandles();

  // --- Main highlighting useEffect  ---
  useEffect(() => {
    // since we need the map view to highlight features, do nothing if it's not available
    if (!props.mapView) {
      return;
    }

    // do not attempt to highlight if a scenario (and a feature from that scenario) is not selected
    if (!feature) {
      return;
    }

    // keep track of whether we need to reset the map presentation after removing highlights
    let shouldResetZoom = false;
    let busStopLayersToReHideIds: string[] = [];

    // use this controller to abort any in-progress highlighting when the effect is cleaned up
    const controller = new AbortController();

    // --- Case 1: Highlighting Routes ---
    if (feature.affects === 'routes' && feature.routeIds && feature.routeIds.length > 0) {
      if (feature.type === 'addition') {
        const targetLayerIds = feature.routeIds
          .map((lineId) => lineIdToLayerIdMap.get(lineId))
          .filter((id): id is string => id !== undefined);

        mapUtils
          .highlightFeatures(
            props.mapView,
            targetLayerIds.map((layerId) => ({ layerId, options: { signal: controller.signal } }))
          )
          .then(async (foundLayers) => {
            // save the highlight handles so we can remove the highlights later
            handles.add(foundLayers.map(({ handle }) => handle));

            // zoom to the highlighted features
            await mapUtils.zoomToLayers(props.mapView, targetLayerIds);
            shouldResetZoom = true;
          });
      } else if (feature.type === 'frequency') {
        mapUtils
          .highlightFeatures(props.mapView, [
            {
              layerId: (layers) => layers.find((layer) => layer.id.startsWith('routes__')),
              target: feature.routeIds,
              options: { signal: controller.signal },
            },
          ])
          .then(async (foundLayers) => {
            // save the highlight handles so we can remove the highlights later
            handles.add(foundLayers.map(({ handle }) => handle));

            // zoom to the highlighted features
            await mapUtils.zoomToLayers(
              props.mapView,
              // only zoom to the layers that were actually found and highlighted
              foundLayers.map(({ layerView, targetQuery }) => ({
                id: layerView.layer.id,
                query: targetQuery,
              }))
            );
            shouldResetZoom = true;
          });
      }
    }
    // --- Case 2: Highlighting Stops ---
    else if (feature.affects === 'stops' && feature.stopIds && feature.stopIds.length > 0) {
      mapUtils
        .highlightFeatures(props.mapView, [
          {
            layerId: (layers) =>
              layers.find(
                (layer) => layer.id.startsWith('stops__') && !layer.id.startsWith('stops__future__')
              ),
            target: feature.stopIds.map((id) => parseInt(id)),
            options: { signal: controller.signal },
          },
        ])
        .then(async (foundLayers) => {
          // save the highlight handles so we can remove the highlights later
          handles.add(foundLayers.map(({ handle }) => handle));

          // zoom to the highlighted features
          await mapUtils.zoomToLayers(
            props.mapView,
            // only zoom to the layers that were actually found and highlighted
            foundLayers.map(({ layerView, targetQuery }) => ({
              id: layerView.layer.id,
              query: targetQuery,
            }))
          );
          shouldResetZoom = true;

          // if the bus stops layer is not visible, temporarily make it visible so the highlights are visible
          const busStopsLayers = Array.from(props.mapView?.map?.allLayers || []).filter(
            (layer) => layer.id.startsWith('stops__') // current and future
          );
          const hiddenBusStopsLayerIds = busStopsLayers
            .filter((layer) => !layer.visible)
            .map((layer) => layer.id);
          if (hiddenBusStopsLayerIds.length > 0) {
            busStopLayersToReHideIds = hiddenBusStopsLayerIds;
            busStopsLayers.forEach((layer) => (layer.visible = true));
          }
        });
    }

    return () => {
      controller.abort(); // abort any in-progress highlighting
      handles.removeAll(); // remove all active highlights

      // set zoom back to the default extent (the future route layers)
      if (shouldResetZoom) {
        const futureLayerIDs = lineIdToLayerIdMap.values();
        mapUtils.zoomToLayers(props.mapView, Array.from(futureLayerIDs));
      }

      // re-hide the bus stops layers that were previously hidden
      if (busStopLayersToReHideIds.length > 0) {
        const busStopsLayersToHide = Array.from(props.mapView?.map?.allLayers || []).filter(
          (layer) => busStopLayersToReHideIds.includes(layer.id)
        );
        busStopsLayersToHide.forEach((layer) => (layer.visible = false));
      }
    };
  }, [props.mapView, feature, lineIdToLayerIdMap]);

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
            <span className="number">{feature.stopIds.length}</span>
            <h2>{feature.name}</h2>
            <p className="description">{feature.description}</p>
          </Shell>
        );
      }

      if (feature.type === 'accessibility') {
        return (
          <Shell>
            <span className="number">{feature.stopIds.length} Stops</span>
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
              {feature.routeIds.length} route{feature.routeIds.length === 1 ? '' : 's'}
              {' – '}
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
  overflow-x: hidden;

  flex-grow: 1;
  flex-shrink: 0;

  --blue-background: hsla(229, 100%, 66%, 0.6);
  --blue-background--solid: #9fa9fd;

  .background {
    background-color: var(--blue-background--solid);
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
    z-index: 1;
    color: inherit !important;

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
    z-index: 1;

    p:first-of-type {
      font-size: 1.4rem;
      font-weight: 600;
      color: white;
    }

    p {
      text-shadow: 0 0 40px var(--color-secondary), 0 0 2px var(--color-secondary);
      background-color: var(--blue-background--solid);
    }

    p:last-of-type {
      font-size: 1.1rem;
      font-weight: 500;
      color: hsl(83, 97%, 75%);
      color: white;
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
