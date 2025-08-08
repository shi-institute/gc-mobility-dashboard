import styled from '@emotion/styled';
import { useContext, useRef, useState } from 'react';
import { useRect } from '../../../hooks';
import { Tab } from '../../common';
import { CoreFrameContext } from './CoreFrameContext';
import { SidebarWrapper } from './SidebarWrapper';

interface CoreFrameProps {
  /** style to apply to the outer frame of this element */
  outerStyle?: React.CSSProperties;
  /** style to applt to the sections grid of this element */
  sectionsStyle?: React.CSSProperties;
  /** The tabs for switching between routes. The tabs move to the bottom of the frame on widths less than 900. */
  header?: React.ReactElement;
  /** A react element that renders a map. If no map is needed, do not provide this prop. It should be a map element with a string prop `label`. */
  map?: React.ReactElement;
  /** An array react elements, each representing a section. Rech section element should have a string prop `label`. */
  sections?: React.ReactElement[];
  /** An optional header for the sections area. If provided, it will be rendered above the sections grid. */
  sectionsHeader?: React.ReactElement;
  /** The sidebar element. On widths >= 1280px, it is rendered directly. On smaller widths, it should support an overlay mode with a button that floats in the bottom-right corner to open it. */
  sidebar?: React.ReactElement;

  /** disables grid mode for the sections  area */
  disableSectionsGrid?: boolean;
}

export function CoreFrame(props: CoreFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useRect(containerRef);

  const isMobile = width < 900;
  const isFullDesktop = width >= 1280;

  const [activeMobileSection, setActiveMobileSection] = useState(0);

  const { fixedSidebarOpen } = useContext(CoreFrameContext);

  return (
    <Container ref={containerRef}>
      <OuterFrame style={props.outerStyle}>
        <div style={{ gridArea: 'header' }}>{props.header}</div>
        <InnerFrame
          fixedSidebarOpen={!props.sidebar ? false : fixedSidebarOpen && isFullDesktop}
          hasMapElement={!!props.map}
        >
          {isMobile ? (
            <>
              <div style={{ gridArea: 'section-tabs' }}>
                {[props.map, ...(props.sections || [])]
                  .filter((x) => !!x)
                  .map((section, index) => {
                    const tabLabel =
                      (section.props as Record<string, unknown>).label?.toString() ||
                      `Tab ${index + 1}`;
                    return (
                      <Tab
                        key={index}
                        onClick={() => {
                          setActiveMobileSection(index);
                        }}
                        label={tabLabel}
                        variant="line"
                        isActive={activeMobileSection === index}
                      />
                    );
                  })}
              </div>
              <MainAreaWrapper>
                {props.sectionsHeader}
                <MainArea
                  disableSectionsGrid={props.disableSectionsGrid}
                  style={props.sectionsStyle}
                >
                  {[props.map, ...(props.sections || [])][activeMobileSection]}
                </MainArea>
              </MainAreaWrapper>
            </>
          ) : (
            <>
              {props.map ? <MapArea>{props.map}</MapArea> : null}
              <MainAreaWrapper>
                {props.sectionsHeader}
                <MainArea
                  disableSectionsGrid={props.disableSectionsGrid}
                  style={props.sectionsStyle}
                >
                  {props.sections?.map((section) => section)}
                </MainArea>
              </MainAreaWrapper>
            </>
          )}
          {props.sidebar ? (
            <SidebarWrapper frameWidth={width}>{props.sidebar}</SidebarWrapper>
          ) : null}
        </InnerFrame>
      </OuterFrame>
    </Container>
  );
}

const Container = styled.div`
  container-type: inline-size;
  container-name: core;
  inline-size: 100%;
`;

const OuterFrame = styled.div`
  position: relative;
  overflow: hidden;
  box-sizing: border-box;

  display: grid;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'header'
    'content';

  gap: 0 1rem;

  @container core (max-width: 899px) {
    grid-template-rows: 1fr auto;
    grid-template-areas:
      'content'
      'header';
  }
`;

const InnerFrame = styled.div<{ fixedSidebarOpen: boolean; hasMapElement?: boolean }>`
  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) ${({ fixedSidebarOpen }) =>
      fixedSidebarOpen ? '300px' : '0'};
  grid-template-areas: ${({ hasMapElement }) =>
    hasMapElement ? `'map main sidebar'` : `'main main sidebar'`};

  --padding: 1rem;
  padding: 0 0 0 var(--padding);
  // gap: 1rem;

  transition: 120ms;

  @container core (min-width: 1280px) {
    padding-right: ${({ fixedSidebarOpen }) => (fixedSidebarOpen ? '1rem' : '0')};
  }

  @container core (max-width: 1279px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas: ${({ hasMapElement }) => (hasMapElement ? `'map main'` : `'main main'`)};
  }

  @container core (max-width: 899px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr 0 0;
    grid-template-areas:
      'section-tabs'
      'main'
      'sidebar';

    --padding: 0;
  }
`;

const MainAreaWrapper = styled.div`
  grid-area: main;

  display: flex;
  flex-direction: column;
  gap: 1rem;

  box-sizing: border-box;
  padding: var(--padding) var(--padding) var(--padding) 0;

  // enable scrolling (MainArea is a child of another grid container)
  overflow-y: auto;
  height: 0;
  min-height: 100%;
  box-sizing: border-box;
`;

const MainArea = styled.div<{ disableSectionsGrid?: boolean }>`
  flex-grow: 1;
  flex-shrink: 0;

  display: ${(props) => (props.disableSectionsGrid ? 'block' : 'grid')};
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  grid-auto-rows: min-content;
  gap: 1rem;

  @container core (max-width: 899px) {
    grid-auto-rows: 1fr;
    & > * {
      height: 100% !important;
    }
  }
`;

const MapArea = styled.div`
  grid-area: map;
  border-radius: var(--surface-radius);
  overflow: hidden;
  margin: var(--padding) var(--padding) var(--padding) 0;
`;
