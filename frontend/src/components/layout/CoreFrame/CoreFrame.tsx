import styled from '@emotion/styled';
import { useRef, useState } from 'react';
import { useRect } from '../../../hooks';
import { SidebarWrapper } from './SidebarWrapper';

interface CoreFrameProps {
  /** style to apply to the outer frame of this element */
  outerStyle?: React.CSSProperties;
  /** The tabs for switching between routes. The tabs move to the bottom of the frame on widths less than 900. */
  header?: React.ReactElement;
  /** A react element that renders a map. If no map is needed, do not provide this prop. It should be a map element with a string prop `label`. */
  map?: React.ReactElement;
  /** An array react elements, each representing a section. Rech section element should have a string prop `label`. */
  sections?: React.ReactElement[];
  /** The sidebar element. On widths >= 1280px, it is rendered directly. On smaller widths, it should support an overlay mode with a button that floats in the bottom-right corner to open it. */
  sidebar?: React.ReactElement;
}

export function CoreFrame(props: CoreFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useRect(containerRef);

  const isMobile = width < 900;
  const isFullDesktop = width >= 1280;

  const [activeMobileSection, setActiveMobileSection] = useState(0);

  const [fixedSidebarOpen, setFixedSidebarOpen] = useState(true);

  return (
    <Container ref={containerRef}>
      <OuterFrame style={props.outerStyle}>
        <div style={{ gridArea: 'header' }}>{props.header}</div>
        <InnerFrame
          fixedSidebarOpen={fixedSidebarOpen && isFullDesktop}
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
                      <button
                        key={index}
                        onClick={() => {
                          setActiveMobileSection(index);
                        }}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
              </div>
              <MainArea>{[props.map, ...(props.sections || [])][activeMobileSection]}</MainArea>
            </>
          ) : (
            <>
              {props.map ? <MapArea>{props.map}</MapArea> : null}
              <MainArea>{props.sections?.map((section) => section)}</MainArea>
            </>
          )}
          <SidebarWrapper
            frameWidth={width}
            onToggleFixedSidebar={(forcedClosed) => setFixedSidebarOpen(!forcedClosed)}
          >
            {props.sidebar}
          </SidebarWrapper>
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
  grid-template-columns: 1fr 1fr ${({ fixedSidebarOpen }) => (fixedSidebarOpen ? '300px' : '0')};
  grid-template-areas: ${({ hasMapElement }) =>
    hasMapElement ? `'map main sidebar'` : `'main main sidebar'`};

  padding: 1rem;
  gap: 0 1rem;

  transition: 120ms;

  @container core (min-width: 1280px) {
    padding-right: ${({ fixedSidebarOpen }) => (fixedSidebarOpen ? '1rem' : '0')};
  }

  @container core (max-width: 899px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr 0 0;
    grid-template-areas:
      'section-tabs'
      'main'
      'sidebar';

    padding: 0;
  }
`;

const MainArea = styled.div`
  grid-area: main;

  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
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
`;
