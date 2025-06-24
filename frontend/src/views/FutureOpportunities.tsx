import '@arcgis/map-components/dist/components/arcgis-map';
import { CoreFrame } from '../components';
import { AppNavigation } from '../components/navigation';

export function FutureOpportunities() {
  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      header={<AppNavigation />}
      map={
        <div style={{ height: '100%' }}>
          <arcgis-map basemap="topo-vector" zoom={12} center="-82.4, 34.85"></arcgis-map>
        </div>
      }
    />
  );
}
