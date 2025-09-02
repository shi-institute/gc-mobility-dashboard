import { get as getProperty } from 'object-path';
import { flatSectionBundleIds, manualSectionIds, SectionBundle } from '../..';
import { useAppData } from '../../../hooks';
import { VisibleSections } from '../../../hooks/useSectionsVisibility';
import { notEmpty } from '../../../utils';

export function renderSections(sections: (React.ReactElement | null)[], checkScenarios = false) {
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

  return sections.filter(notEmpty);
}

/**
 * Whether a section should be rendered based on the visibleSections object.
 */
export function shouldRenderSection(
  visibleSections: VisibleSections,
  sectionId: string,
  editMode = false
) {
  return (
    editMode ||
    !visibleSections ||
    (sectionId in visibleSections && visibleSections[sectionId] !== null)
  );
}

/**
 * Finds a section component by name and conditionally renders it based on whether it should be visible.
 * @param visibleSections From useSectionsVisibility - represents which sections should be visible (null means all visible)
 * @param sectionName The name of the section component to render, from flatSectionBundleIds
 * @param key The React key to use for the rendered component. This should be unique among the list of sections.
 */
export function renderSection(
  visibleSections: VisibleSections | null,
  editMode: boolean,
  sectionName: keyof typeof flatSectionBundleIds,
  key: string
) {
  // if the section should not be visible, return null
  const sectionId = flatSectionBundleIds[sectionName];
  if (!shouldRenderSection(visibleSections as VisibleSections, sectionId, editMode)) {
    return null;
  }

  // attempt to find a matching section component
  const Section = getProperty(SectionBundle, sectionName);
  if (Section) {
    return <Section key={key} />;
  }

  // otherwise, fall back to returning null
  return null;
}

/**
 * Renders a manual section based on visibility conditions.
 *
 * @param visibleSections - Configuration object that determines which sections should be visible, or null if all sections should be hidden
 * @param sectionId - Unique identifier for the section to be rendered
 * @param element - React element to render if the section should be visible
 */
export function renderManualSection(
  visibleSections: VisibleSections | null,
  sectionName: keyof typeof manualSectionIds,
  element: React.ReactElement
) {
  // if the section should not be visible, return null
  const sectionId = manualSectionIds[sectionName];
  if (!shouldRenderSection(visibleSections as VisibleSections, sectionId)) {
    return null;
  }

  return element;
}
