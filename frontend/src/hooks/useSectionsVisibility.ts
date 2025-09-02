import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  TAB_1_FRAGMENT,
  TAB_2_FRAGMENT,
  TAB_3_FRAGMENT,
  TAB_4_FRAGMENT,
  TAB_5_FRAGMENT,
} from '../components/navigation';
import { manualSectionIds, sectionBundleId } from '../components/sections';
import { notEmpty } from '../utils';

type VisibleSectionItems = string[];
export type VisibleSections = Record<string, VisibleSectionItems>;

/**
 * Provides a way to get and set the visibility of sections and their items using URL search parameters.
 * The visibility state is encoded in the URL as a `sections` parameter, allowing for easy sharing and bookmarking of specific views.
 *
 * Example URL encoding: `?sections=section1:item1,item2;section2:item1,item2`
 * @returns
 */
export function useSectionsVisibility() {
  const [searchParams, setSearchParams] = useSearchParams();

  // get the value from the URL
  const sectionsParam = searchParams.get('sections');
  /** The sections that should be shown by the app. If null, show all sections. */
  let visibleSections: VisibleSections | null = null;
  if (sectionsParam) {
    // visible sections are encoded as section1:item1,item2;section2:item1,item2
    const sections = sectionsParam
      .split(';')
      .map((section) => section.split(':'))
      .filter(notEmpty);

    const processedSections = sections
      .filter((arr): arr is [string, string] => notEmpty(arr[0]) && notEmpty(arr[1]))
      .map(([sectionName, items]) => {
        const itemIds = items
          .split(',')
          .map((item) => item.trim())
          .filter(notEmpty);
        return [sectionName.trim(), itemIds] as [string, VisibleSectionItems];
      });

    visibleSections = Object.fromEntries(processedSections);
  }

  // create a function to update the sections parameter in the URL
  const setVisibleSections = useCallback(
    (
      value: VisibleSections | null | ((value: VisibleSections | null) => VisibleSections | null)
    ) => {
      // we accept a direct value or a callbacl function that returns the new value (like useState)
      const newVisibleSections = typeof value === 'function' ? value(visibleSections) : value;

      // we need to encode the visible sections as section1:item1,item2;section2:item1,item2
      const sectionsParam = Object.entries(newVisibleSections || {})
        .map(([section, items]) => {
          if (items.length > 0) {
            return `${section}:${items.join(',')}`;
          } else {
            return section;
          }
        })
        .join(';');

      if (sectionsParam) {
        searchParams.set('sections', sectionsParam);
      } else {
        searchParams.delete('sections');
      }

      setSearchParams(searchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  /** The tabs that should be shown by the app. If null, show all tabs. */
  const visibleTabs =
    visibleSections === null
      ? null
      : Object.keys(visibleSections).reduce((tabs, section) => {
          const tab = sectionsToTabs.get(section);
          if (tab && !tabs.includes(tab)) {
            tabs.push(tab);
          }
          return tabs;
        }, [] as string[]);

  return [visibleSections, setVisibleSections, visibleTabs] as const;
}

/**
 * A mapping of section IDs to the tab fragment they belong to.
 *
 * This is used to return which tabs should be visible based on which sections are visible.
 */
const sectionsToTabs = new Map<string, string>([
  [sectionBundleId.ServiceStatistics, TAB_1_FRAGMENT],
  [sectionBundleId.Future.Coverage, TAB_2_FRAGMENT],
  [sectionBundleId.EssentialServices.AccessViaPublicTransit, TAB_4_FRAGMENT],
  [sectionBundleId.EssentialServices.TravelTimeViaPublicTransit, TAB_4_FRAGMENT],
  [sectionBundleId.RiderDemographics, TAB_1_FRAGMENT],
  [sectionBundleId.AreaDemographics, TAB_1_FRAGMENT],
  [sectionBundleId.Future.WorkAndSchoolCommute, TAB_2_FRAGMENT],
  [sectionBundleId.WorkAndSchoolCommute, TAB_1_FRAGMENT],
  [manualSectionIds.jobsTreeMap, TAB_3_FRAGMENT],
  [manualSectionIds.roadsVsTransitScenarios, TAB_5_FRAGMENT],
]);
