import { VisibleSections } from '../hooks/useSectionsVisibility';

export function shouldRenderStatistic(
  visibleSections: VisibleSections | null,
  sectionId: string,
  editMode: boolean,
  statId: string
) {
  const isVisible = !visibleSections || !!visibleSections[sectionId]?.includes(statId);

  if (!isVisible && editMode) {
    return 'partial';
  }

  return isVisible;
}
