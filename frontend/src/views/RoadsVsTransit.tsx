import '@arcgis/map-components/dist/components/arcgis-map';
import styled from '@emotion/styled';
import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import {
  CoreFrame,
  IconButton,
  OptionTrack,
  PageHeader,
  SelectOne,
  Map as WebMap,
} from '../components';
import { DismissIcon } from '../components/common/IconButton/DismssIcon';
import { AppNavigation } from '../components/navigation';
import { useAppData, useLocalStorage, useRect } from '../hooks';
import { useFutureMapData, useMapData } from '../hooks/useMapData';
import { notEmpty, requireKey } from '../utils';

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

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      loading={loading || scenariosData.loading}
      header={<AppNavigation />}
      sectionsHeader={<SectionsHeader />}
      map={
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
      }
      sections={[<Comparison key={0} title="Scenarios" mapView={mapView} />]}
      disableSectionColumns
    />
  );
}

function SectionsHeader() {
  const [showAside, setShowAside] = useLocalStorage('aside--tab-5', true);

  if (showAside) {
    return (
      <PageHeader>
        <aside>
          <h1>About this tab</h1>
          <IconButton
            onClick={() => setShowAside(false)}
            title="Permanently dismiss this message on this device"
          >
            <DismissIcon size={16} />
          </IconButton>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
            nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
            officia deserunt mollit anim id est laborum.
          </p>
        </aside>
      </PageHeader>
    );
  }

  return null;
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
              mapView={props.mapView}
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
  mapView: __esri.MapView | null;
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

  // get the routes and stops layers from the map view
  // so that we can hihglight relevant route and stop features as needed
  const [routeLayers, setRouteLayers] = useState<__esri.GeoJSONLayer[] | null>(null);
  const [stopsLayer, setStopsLayer] = useState<__esri.GeoJSONLayer | null>(null);
  //const [activeHighlightHandles, setActiveHighlightHandles] = useState<__esri.Handle[]>([]);

  //begin debugging block
  useEffect(() => {
    props.mapView?.when(() => {
      const geoJsonLayers = Array.from(props.mapView?.map?.allLayers || []).filter(
        (layer): layer is __esri.GeoJSONLayer => layer.type === 'geojson'
      );

      const routeLayersFound = geoJsonLayers.filter((layer) => {
        return layer.id.startsWith('future_route__');
      });

      const stopsLayerFound = geoJsonLayers.find(
        (layer) => layer.id.startsWith('stops__') && !layer.id.startsWith('stops__future__')
      );

      setRouteLayers(routeLayersFound || null);
      setStopsLayer(stopsLayerFound || null);

      // You can also add logs here to see what was actually set:
      //console.log('setRouteLayers called with:', routeLayersFound);
      //console.log('setStopsLayer called with:', stopsLayerFound);
    });
  }, [props.mapView]);
  //end debugging block

  // get the layer views, which allow us to highlight and apply effects
  const [routeLayerViews, setRouteLayerViews] = useState<__esri.GeoJSONLayerView[] | null>(null);
  const [stopsLayerView, setStopsLayerView] = useState<__esri.GeoJSONLayerView | null>(null);

  // State for the stops layer view

  // Effect hook to get the LayerView for the 'stopsLayer'.
  // This LayerView is essential for applying visual effects like highlighting.
  useEffect(() => {
    if (!props.mapView || !stopsLayer) {
      setStopsLayerView(null); // Ensure state is cleared if conditions aren't met
      return;
    }

    const handler = stopsLayer.on('layerview-create', (evt) => {
      const layerView = evt.layerView as __esri.GeoJSONLayerView;
      setStopsLayerView(layerView);
    });

    // Also check if layer view already exists (e.g., on re-renders where layer didn't change)
    props.mapView
      .whenLayerView(stopsLayer)
      .then((existingLayerView) => {
        if (existingLayerView) {
          setStopsLayerView(existingLayerView as __esri.GeoJSONLayerView);
        }
      })
      .catch((error) => {
        console.error('Error getting existing stops layer view:', error);
        setStopsLayerView(null); // Clear on error
      });

    return () => {
      handler.remove();
    };
  }, [props.mapView, stopsLayer]);

  useEffect(() => {
    if (!props.mapView || !routeLayers) {
      // If dependencies aren't ready, ensure we clear any stale layer views
      setRouteLayerViews(null);
      return;
    }

    const newLayerViews: __esri.GeoJSONLayerView[] = []; // Temporary array to collect new layer views
    const handlers: __esri.Handle[] = []; // Array to store all event handler references for cleanup

    // Use Promise.all to wait for all layer views to be created
    // This is more robust than collecting one-by-one with setRouteLayerViews in the loop.
    const getLayerViewsPromises = routeLayers.map((routeLayer) => {
      return new Promise<__esri.GeoJSONLayerView>((resolve) => {
        // First, check if the layer view already exists (e.g., if the map hasn't changed)
        props.mapView?.whenLayerView(routeLayer).then((existingLayerView) => {
          if (existingLayerView) {
            resolve(existingLayerView as __esri.GeoJSONLayerView);
            return; // Exit if already found
          }

          // If not existing, attach a listener to wait for its creation
          const handler = routeLayer.on('layerview-create', (evt) => {
            resolve(evt.layerView as __esri.GeoJSONLayerView);
          });
          handlers.push(handler); // Store the handler for cleanup
        });
      });
    });

    // Execute all promises concurrently and update state once all are resolved
    Promise.all(getLayerViewsPromises)
      .then((layerViews) => {
        // Filter out any potential null/undefined if a promise didn't resolve correctly,
        // though with `resolve` directly, it should be fine.
        setRouteLayerViews(layerViews.filter(Boolean));
      })
      .catch((error) => {
        console.error('Error getting route layer views:', error);
        setRouteLayerViews(null); // Set to null on error
      });

    // Cleanup function
    return () => {
      // Remove all event handlers that were attached during this effect's run
      handlers.forEach((h) => h.remove());
      // No need to clear setRouteLayerViews here because Promise.all will overwrite
      // it when it completes, or the initial null check will handle it.
    };
  }, [props.mapView, routeLayers]); // Dependencies: Re-run if props.mapView or routeLayers changes.

  // build a mapping of line_id to layer id for the route layers
  // so that we can easily find the right layer to highlight for a given line_id
  const [lineIdToLayerIdMap, setLineIdToLayerIdMap] = useState(new Map<string, string>());
  useEffect(() => {
    const abortController = new AbortController();

    const promises = Array.from(routeLayers || []).map(async (layer) => {
      return await layer
        .queryFeatures(undefined, { signal: abortController.signal })
        .then((featureSet) => {
          const lineIds = featureSet.features.map(
            (feature) => feature.attributes.line_id as string
          );
          const uniqueLineIds = Array.from(new Set(lineIds));

          if (uniqueLineIds.length > 1) {
            console.warn(`Layer ${layer.id} has multiple line_ids:`, uniqueLineIds);
          }

          return {
            layerId: layer.id,
            lineId: uniqueLineIds[0],
          };
        });
    });

    Promise.all(promises).then((results) => {
      const validResults = results.filter(requireKey('lineId'));

      const lineIdToLayerIdMap = new Map<string, string>();
      validResults.forEach((result) => {
        lineIdToLayerIdMap.set(result.lineId, result.layerId);
      });

      setLineIdToLayerIdMap(lineIdToLayerIdMap);
    });

    return () => {
      abortController.abort();
    };
  }, [routeLayers, setLineIdToLayerIdMap]);

  //add highlighing logic here with useEffect
  // Keep this state for managing highlight handles, needed for cleanup via closure.
  const [activeHighlightHandles, setActiveHighlightHandles] = useState<__esri.Handle[]>([]);

  // Main effect for applying highlights based on the selected feature
  useEffect(() => {
    // Collect promises for new highlight handles
    const highlightPromises: Promise<__esri.Handle | null>[] = [];

    // Early exit if absolute core dependencies are missing
    if (!props.mapView || !feature) {
      // Return a cleanup function that clears the currently active highlights
      // (those stored in `activeHighlightHandles` *from the last successful run*).
      return () => {
        activeHighlightHandles.forEach((handle) => handle.remove());
        setActiveHighlightHandles([]); // Explicitly clear state on early exit
      };
    }

    // --- Case 1: Highlighting Routes ---
    if (feature.type === 'addition' && feature.routeIds && feature.routeIds.length > 0) {
      if (!lineIdToLayerIdMap || !routeLayerViews || routeLayerViews.length === 0) {
        console.warn('Skipping route highlighting: Missing lineIdToLayerIdMap or routeLayerViews.');
        return () => {
          // Return cleanup if this branch can't run
          activeHighlightHandles.forEach((handle) => handle.remove());
          setActiveHighlightHandles([]);
        };
      }

      const targetLayerIds = feature.routeIds
        .map((lineId) => lineIdToLayerIdMap.get(lineId))
        .filter((id): id is string => id !== undefined);

      targetLayerIds.forEach((layerId) => {
        const routeLayerView = routeLayerViews.find((lv) => lv.layer.id === layerId);
        if (routeLayerView) {
          highlightPromises.push(
            routeLayerView
              .queryFeatures()
              .then((featureSet) => {
                if (featureSet.features.length > 0) {
                  return routeLayerView.highlight(featureSet.features);
                }
                return null;
              })
              .catch((error) => {
                console.error(`Error getting highlight handle for route layer ${layerId}:`, error);
                return null;
              })
          );
        }
      });
    }
    // --- Case 2: Highlighting Stops ---

    //debug code starts here.

    // Inside the main highlighting useEffect, in the 'stops' branch:
    else if (feature.affects === 'stops' && feature.stopIds && feature.stopIds.length > 0) {
      console.log('--- Highlighting stops branch entered ---');
      if (!stopsLayerView) {
        console.warn('Skipping stop highlighting: Missing stopsLayerView.');
        return () => {
          activeHighlightHandles.forEach((handle) => handle.remove());
          setActiveHighlightHandles([]);
        };
      }

      console.log('--- Attempting to highlight stops ---');
      console.log('Feature affects:', feature.affects, 'Stop IDs from feature:', feature.stopIds);

      //const stopIdList = feature.stopIds.map((id) => `'${id}'`).join(', ');
      const stopIdList = feature.stopIds.join(', ');
      console.log('Constructed stopIdList for SQL IN clause:', stopIdList);
      const whereClause = `ID IN (${stopIdList})`;
      console.log('Generated WHERE clause:', whereClause);

      highlightPromises.push(
        stopsLayerView
          .queryFeatures({ where: whereClause })
          .then((featureSet) => {
            console.log('stopsLayerView.queryFeatures result:');
            console.log('  Number of features found:', featureSet.features.length);
            if (featureSet.features.length > 0) {
              console.log(
                '  Found features attributes (first 2):',
                featureSet.features.slice(0, 2).map((f) => f.attributes)
              );
              console.log(
                '  Calling stopsLayerView.highlight() for',
                featureSet.features.length,
                'features.'
              );
              return stopsLayerView.highlight(featureSet.features);
            } else {
              console.warn('  NO FEATURES FOUND for stops with WHERE clause:', whereClause);
            }
            return null;
          })
          .catch((error) => {
            console.error('Error during stopsLayerView.queryFeatures:', error);
            return null;
          })
      );
      console.log('--- End of stops highlighting attempt ---'); // To see if it completes
    }

    //debug code ends here.
    // --- Case 3: No specific highlight type matched or no data to highlight ---
    else {
      // If feature exists but doesn't match a highlight type, or has no relevant IDs,
      // we should ensure any previous highlights are cleared.
      return () => {
        // Return cleanup function for this scenario
        activeHighlightHandles.forEach((handle) => handle.remove());
        setActiveHighlightHandles([]);
      };
    }

    // Resolve all highlight promises and then update the state with the new handles.
    Promise.all(highlightPromises)
      .then((handles) => {
        const newHandles = handles.filter((h): h is __esri.Handle => h !== null);
        setActiveHighlightHandles(newHandles); // Update state once all async ops are done
      })
      .catch((error) => {
        console.error('Promise.all for highlights failed:', error);
        setActiveHighlightHandles([]); // Clear highlights on error
      });

    // THIS IS THE CRITICAL CLEANUP FUNCTION RETURNED BY THIS EFFECT
    // It will remove highlights that were created by the *previous* run of this effect,
    // using the `activeHighlightHandles` value that was current *when this cleanup function was created*.
    // It also runs when the component unmounts.
    return () => {
      activeHighlightHandles.forEach((handle) => handle.remove());
      // Do NOT call setActiveHighlightHandles([]) here inside the cleanup function,
      // as this could cause an infinite loop by re-triggering the effect.
      // The `setActiveHighlightHandles` in the Promise.all() will set the new state.
      // If the component unmounts, the state will be garbage collected anyway.
    };
  }, [
    props.mapView,
    feature,
    routeLayerViews,
    stopsLayerView,
    lineIdToLayerIdMap,
    // activeHighlightHandles is NOT included here. Its value is used in the cleanup function
    // via closure, but changes to it don't trigger the *effect itself* to re-run.
    // setActiveHighlightHandles (the setter) is stable and can be omitted.
  ]);

  //end add highlighting logic here with useEffect

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
        const routeLayersIds = feature.routeIds.map((lineId) => {
          return lineIdToLayerIdMap.get(lineId);
        });

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
