import styled from '@emotion/styled';
import { useContext, useEffect, useRef, useState } from 'react';
import { notEmpty } from '../../../utils';
import { ProgressRing, Tab } from '../../common';
import { CoreFrameContext } from './CoreFrameContext';
import { SidebarWrapper } from './SidebarWrapper';

interface CoreFrameProps {
  /** style to apply to the outer frame of this element */
  outerStyle?: React.CSSProperties;
  /** style to applt to the sections grid of this element */
  sectionsStyle?: React.CSSProperties;
  /** The tabs for switching between routes. The tabs move to the bottom of the frame on widths less than 900. */
  header?: React.ReactElement;
  /** A react element that renders a map. If no map is needed, do not provide this prop. It should be a map element with a string prop `title`. */
  map?: React.ReactElement;
  /** An array react elements, each representing a section. Rech section element should have a string prop `title`. */
  sections?: React.ReactElement[];
  /** An optional header for the sections area. If provided, it will be rendered above the sections grid. */
  sectionsHeader?: React.ReactElement;
  /** The sidebar element. On widths >= 1280px, it is rendered directly. On smaller widths, it should support an overlay mode with a button that floats in the bottom-right corner to open it. */
  sidebar?: React.ReactElement;

  /** disables columns for the sections area */
  disableSectionColumns?: boolean;

  /** Shows a loading indicator and a scrim that covers the content underneath. */
  loading?: boolean;
}

export function CoreFrame(props: CoreFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeMobileSection, setActiveMobileSection] = useState(0);

  const { fixedSidebarOpen, setContainerRef, isMobile, isFullDesktop, width } =
    useContext(CoreFrameContext);
  useEffect(() => {
    setContainerRef(containerRef);
  }, [containerRef]);

  const [loadingDelayed, setLoadingDelayed] = useState(false);
  useEffect(() => {
    if (props.loading) {
      const timeout = setTimeout(() => {
        setLoadingDelayed(true);
      }, 500);
      return () => clearTimeout(timeout);
    }

    setLoadingDelayed(false);
  }, [props.loading]);

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
                {[props.map, ...(props.sections || [])].filter(notEmpty).map((section, index) => {
                  const tabLabel =
                    (section.props as Record<string, unknown>).title?.toString() ||
                    (section.props as Record<string, unknown>).shortTitle?.toString() ||
                    section.key?.toString() ||
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
                  disableSectionColumns={props.disableSectionColumns}
                  style={props.sectionsStyle}
                >
                  {[props.map, ...(props.sections || [])].filter(notEmpty)[activeMobileSection]}
                </MainArea>
              </MainAreaWrapper>
            </>
          ) : (
            <>
              {props.map ? <MapArea>{props.map}</MapArea> : null}
              <MainAreaWrapper>
                {props.sectionsHeader}
                <MainArea
                  disableSectionColumns={props.disableSectionColumns}
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
          <div
            key="loading"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              zIndex: loadingDelayed ? 10 : -1,
              opacity: loadingDelayed ? 1 : 0,
              backgroundColor: '#ffffff77',
              backdropFilter: 'blur(14px)',
              transition:
                'opacity var(--wui-control-normal-duration) cubic-bezier(0.16, 1, 0.3, 1)',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            <ProgressRing size={32} />
            Downloading data
          </div>
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

  transition: var(--wui-control-normal-duration);

  position: relative;

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

const MainArea = styled.div<{ disableSectionColumns?: boolean }>`
  flex-grow: 1;
  flex-shrink: 0;

  display: block;
  columns: ${(props) => (props.disableSectionColumns ? 'unset' : '3 420px')};
  display: block;

  & > * {
    break-inside: avoid-column;
  }

  @container core (max-width: 899px) {
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
