import '@arcgis/map-components/dist/components/arcgis-map';
import { useState } from 'react';
import { CoreFrame, OptionTrack } from '../components';
import { AppNavigation } from '../components/navigation';

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

  return (
    <OptionTrack.Track>
      <OptionTrack.Button
        size={selectedIndex === 0 ? 400 : undefined}
        onClick={() => switchSelectedIndex(0)}
        transitioning={transitioning}
        as={delayedSelectedIndex === 0 ? 'div' : undefined}
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
      <OptionTrack.Button
        size={selectedIndex === 1 ? 400 : undefined}
        onClick={() => switchSelectedIndex(1)}
        transitioning={transitioning}
        as={delayedSelectedIndex === 1 ? 'div' : undefined}
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
      <OptionTrack.Button
        size={selectedIndex === 2 ? 400 : undefined}
        onClick={() => switchSelectedIndex(2)}
        transitioning={transitioning}
        as={delayedSelectedIndex === 2 ? 'div' : undefined}
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
      <OptionTrack.Button
        size={selectedIndex === 3 ? 400 : undefined}
        onClick={() => switchSelectedIndex(3)}
        transitioning={transitioning}
        as={delayedSelectedIndex === 3 ? 'div' : undefined}
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
    </OptionTrack.Track>
  );
}
