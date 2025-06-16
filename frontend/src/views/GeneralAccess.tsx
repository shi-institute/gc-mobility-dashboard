import { useSearchParams } from 'react-router';
import { CoreFrame } from '../components';
import { AppNavigation } from '../components/navigation';
import { useAppData } from '../hooks';

export function GeneralAccess() {
  const { data, loading, errors } = useAppData();

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      header={<AppNavigation />}
      sidebar={<Sidebar />}
      sections={[
        <div>
          {loading ? (
            <p>Loading...</p>
          ) : errors ? (
            <p>Error: {errors.join(', ')}</p>
          ) : (
            <div>
              <h2>General Access Data</h2>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </div>,
      ]}
    />
  );
}

function Sidebar() {
  const { areasList, seasonsList } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();

  function handleAreaChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const selectedAreas = Array.from(evt.target.selectedOptions, (option) => option.value);
    console.log(selectedAreas);
    searchParams.set('areas', selectedAreas.join(','));
    setSearchParams(searchParams);
  }

  function handleSeasonChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const selectedSeasons = Array.from(evt.target.selectedOptions, (option) => option.value);
    console.log(selectedSeasons);
    searchParams.set('seasons', selectedSeasons.join(','));
    setSearchParams(searchParams);
  }
  return (
    <aside>
      <h1>Options</h1>

      <label>
        Areas
        <select multiple onChange={handleAreaChange} style={{ width: '100%' }}>
          {areasList.map((area) => {
            return <option value={area}>{area}</option>;
          })}
        </select>
      </label>

      <label>
        Seasons
        <select multiple onChange={handleSeasonChange} style={{ width: '100%' }}>
          {seasonsList.map((season) => {
            return <option value={season}>{season}</option>;
          })}
        </select>
      </label>
    </aside>
  );
}
