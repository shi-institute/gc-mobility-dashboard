import { useSearchParams } from 'react-router';
import { allSectionIds } from '../components';
import { useSectionsVisibility } from './useSectionsVisibility';

export function useToggleSectionItemVisibility(section: keyof typeof allSectionIds) {
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === 'true' ? true : false;

  const [visibleSections, setVisibleSections] = useSectionsVisibility();
  const itemIds = visibleSections?.[allSectionIds[section]] || [];

  /**
   * Toggles the visibility of a specific item within the section.
   */
  const toggleVisibility = (itemId: string, event?: React.MouseEvent) => {
    if (!editMode) {
      return;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // toggle the visibility of the item
    setVisibleSections((prev) => {
      const isAlreadyIncluded = itemIds.includes(itemId);

      const newItemIds = itemIds.filter((id) => id !== itemId);

      // if the id was previously present, that means we are hiding, so we
      // don't need to add it back in
      if (!isAlreadyIncluded) {
        newItemIds.push(itemId);
      }

      return {
        ...prev,
        [allSectionIds[section]]: newItemIds,
      };
    });
  };

  /**
   * Pass this function to a statistic/item's onClick handler to toggle its visibility in edit mode.
   */
  const handleClick = (itemId: string) => (event: React.MouseEvent) => {
    return toggleVisibility(itemId, event);
  };

  return {
    editMode,
    toggleVisibility,
    handleClick,
  };
}
