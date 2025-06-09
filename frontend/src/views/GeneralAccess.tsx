import { CoreFrame } from '../components';
import { AppNavigation } from '../components/navigation';

export function GeneralAccess() {
  return <CoreFrame outerStyle={{ height: '100%' }} header={<AppNavigation />} />;
}
