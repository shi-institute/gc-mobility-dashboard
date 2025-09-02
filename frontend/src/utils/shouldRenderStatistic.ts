import { VisibleSections } from '../hooks/useSectionsVisibility';

export function shouldRenderStatistic(
  visibleSections: VisibleSections | null,
  sectionId: string,
  statId: string
) {
  return (
    !visibleSections ||
    !(sectionId in visibleSections) ||
    !!visibleSections[sectionId]?.includes(statId)
  );
}
