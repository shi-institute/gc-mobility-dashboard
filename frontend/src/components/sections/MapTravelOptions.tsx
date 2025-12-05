import { flatSectionBundleIds } from '.';
import { useAppData, useSectionsVisibility, useToggleSectionItemVisibility } from '../../hooks';
import { shouldRenderStatistic } from '../../utils';
import { Section, SectionEntry } from '../common';
import { SelectTravelMethod } from '../options';

export function MapTravelOptions() {
  const { data, travelMethodList } = useAppData();

  const [visibleSections] = useSectionsVisibility();
  const { editMode, handleClick } = useToggleSectionItemVisibility('MapTravelOptions');
  const shouldRender = shouldRenderStatistic.bind(
    null,
    visibleSections,
    flatSectionBundleIds.MapTravelOptions,
    editMode
  );

  return (
    <Section title="Map Options">
      {shouldRender('bluelines') ? (
        <SectionEntry
          f={{ gridColumn: '1 / -1' }}
          onClick={handleClick('bluelines')}
          style={{
            opacity: shouldRender('bluelines') === 'partial' ? 0.5 : 1,
            fontSize: '0.875rem',
          }}
        >
          <div>
            <div>
              {'Show trip density on the map for commutes in ' +
                (data?.length === 1 ? 'this area.' : 'the selected seasons and areas.')}
            </div>
            <div style={{ color: 'var(--text-secondary)', letterSpacing: '-0.34px' }}>
              The width of the blue lines indicates the trip density.
            </div>
            <SelectTravelMethod travelMethodList={travelMethodList} label={''} />
          </div>
        </SectionEntry>
      ) : null}
    </Section>
  );
}
