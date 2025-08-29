import { useAppData } from '../../../hooks';

export function renderSections(sections: React.ReactElement[], checkScenarios = false) {
  const { data, loading, errors, scenarios } = useAppData();
  const { data: scenariosData, loading: scenariosLoading, errors: scenariosErrors } = scenarios;

  const shouldShowLoading = (() => {
    if (checkScenarios) {
      return (scenariosLoading || loading) && !scenariosData;
    }
    return loading && !data;
  })();

  if (shouldShowLoading) {
    return [
      <div key="placeholder-loading">
        <p>Loading...</p>
      </div>,
    ];
  }

  if (errors) {
    return [
      <div key="placeholder-error">
        <p>Error: {errors.join(', ')}</p>
      </div>,
    ];
  }

  if (checkScenarios && scenariosErrors) {
    return [
      <div key="placeholder-error-2">
        <p>Error: {scenariosErrors.join(', ')}</p>
      </div>,
    ];
  }

  if (!sections) {
    return [];
  }

  return sections;
}
