import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSectionsVisibility } from '../../hooks';
import { Button, NavBar, NavBarItem, Tab, Tabs } from '../common';
import {
  TAB_1_FRAGMENT,
  TAB_2_FRAGMENT,
  TAB_3_FRAGMENT,
  TAB_4_FRAGMENT,
  TAB_5_FRAGMENT,
} from './constants';

export function AppNavigation() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [, , visibleTabs] = useSectionsVisibility();

  const handleClick =
    (to: string) => (evt: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>) => {
      evt.preventDefault();
      setShowMoreViews(false);
      navigate(to);
    };

  // track the width of the app navigation to determine if we should use mobile or desktop navigation
  const [isMobile, setIsMobile] = useState(false);
  const appNavRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleResize() {
      if (appNavRef.current) {
        setIsMobile(appNavRef.current.offsetWidth < 900);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [appNavRef.current]);

  const [showMoreViews, setShowMoreViews] = useState(false);

  return (
    <div ref={appNavRef} className="app-navigation">
      {isMobile ? (
        <NavBar>
          {!visibleTabs || visibleTabs.includes(TAB_1_FRAGMENT) ? (
            <NavBarItem
              label="General Access"
              href={'#' + TAB_1_FRAGMENT + search}
              isActive={pathname === TAB_1_FRAGMENT}
              onClick={handleClick(TAB_1_FRAGMENT + search)}
              icon={
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14.754 10c.966 0 1.75.784 1.75 1.75V15H16.5v.25a.75.75 0 0 1-1.5 0V13h.004v-1.25a.25.25 0 0 0-.25-.25H9.252a.25.25 0 0 0-.25.25V15H9v.25a.75.75 0 0 1-1.5 0V13h.002v-1.25c0-.966.783-1.75 1.75-1.75h5.502ZM20.5 11.75v3.5a.75.75 0 0 0 1.5 0v-3.5A1.75 1.75 0 0 0 20.25 10h-3.375c.343.415.567.932.618 1.5h2.757a.25.25 0 0 1 .25.25ZM2 15.25a.75.75 0 0 0 1.5 0v-3.5a.25.25 0 0 1 .25-.25h2.763a2.738 2.738 0 0 1 .618-1.5H3.75A1.75 1.75 0 0 0 2 11.75v3.5ZM12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM5.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM2.75 17a.75.75 0 0 0-.75.75v.5A3.75 3.75 0 0 0 5.75 22h12.5A3.75 3.75 0 0 0 22 18.25v-.5a.75.75 0 0 0-.75-.75H2.75Zm3 3.5a2.25 2.25 0 0 1-2.236-2h16.972a2.25 2.25 0 0 1-2.236 2H5.75Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_2_FRAGMENT) ? (
            <NavBarItem
              label="Future Opportunities"
              href={'#' + TAB_2_FRAGMENT + search}
              isActive={pathname === TAB_2_FRAGMENT}
              onClick={handleClick(TAB_2_FRAGMENT + search)}
              icon={
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 1.996a7.49 7.49 0 0 1 7.496 7.25l.004.25v4.097l1.38 3.156a1.249 1.249 0 0 1-1.145 1.75L15 18.502a3 3 0 0 1-5.995.177L9 18.499H4.275a1.251 1.251 0 0 1-1.147-1.747L4.5 13.594V9.496c0-4.155 3.352-7.5 7.5-7.5ZM13.5 18.5l-3 .002a1.5 1.5 0 0 0 2.993.145l.006-.147ZM12 3.496c-3.32 0-6 2.674-6 6v4.41L4.656 17h14.697L18 13.907V9.509l-.004-.225A5.988 5.988 0 0 0 12 3.496Zm9 4.754h2a.75.75 0 0 1 .102 1.493L23 9.75h-2a.75.75 0 0 1-.102-1.493L21 8.25Zm-20 0h2a.75.75 0 0 1 .102 1.493L3 9.75H1a.75.75 0 0 1-.102-1.493L1 8.25Zm21.6-5.7a.75.75 0 0 1-.066.977l-.084.073-2 1.5a.75.75 0 0 1-.984-1.127l.084-.073 2-1.5a.75.75 0 0 1 1.05.15ZM2.45 2.4l2 1.5a.75.75 0 1 1-.9 1.2l-2-1.5a.75.75 0 1 1 .9-1.2Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_4_FRAGMENT) ? (
            <NavBarItem
              label="Essential Services Access"
              href={'#' + TAB_4_FRAGMENT + search}
              isActive={pathname === TAB_4_FRAGMENT}
              onClick={handleClick(TAB_4_FRAGMENT + search)}
              icon={
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M4 5.5a3.5 3.5 0 1 1 4.489 3.358 5.502 5.502 0 0 0 5.261 3.892h.33a3.501 3.501 0 0 1 6.92.75 3.5 3.5 0 0 1-6.92.75h-.33a6.987 6.987 0 0 1-5.5-2.67v3.5A3.501 3.501 0 0 1 7.5 22a3.5 3.5 0 0 1-.75-6.92V8.92A3.501 3.501 0 0 1 4 5.5Zm3.5-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8-3a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
          ) : null}
          {!visibleTabs ||
          visibleTabs.includes(TAB_3_FRAGMENT) ||
          visibleTabs.includes(TAB_5_FRAGMENT) ? (
            <NavBarItem
              label="More Views"
              onClick={() => setShowMoreViews(!showMoreViews)}
              isActive={showMoreViews}
              icon={
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M2.75 18h12.5a.75.75 0 0 1 .102 1.493l-.102.007H2.75a.75.75 0 0 1-.102-1.494L2.75 18h12.5-12.5Zm0-6.5h18.5a.75.75 0 0 1 .102 1.493L21.25 13H2.75a.75.75 0 0 1-.102-1.493l.102-.007h18.5-18.5Zm0-6.497h15.5a.75.75 0 0 1 .102 1.493l-.102.007H2.75a.75.75 0 0 1-.102-1.493l.102-.007h15.5-15.5Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
          ) : null}
          <MoreViewsSheet visible={showMoreViews}>
            {!visibleTabs || visibleTabs.includes(TAB_3_FRAGMENT) ? (
              <Button
                href={'#' + TAB_3_FRAGMENT + search}
                onClick={handleClick(TAB_3_FRAGMENT + search)}
              >
                Job Access
              </Button>
            ) : null}
            {!visibleTabs || visibleTabs.includes(TAB_5_FRAGMENT) ? (
              <Button
                href={'#' + TAB_5_FRAGMENT + search}
                onClick={handleClick(TAB_5_FRAGMENT + search)}
              >
                Roads or Transit?
              </Button>
            ) : null}
          </MoreViewsSheet>
        </NavBar>
      ) : (
        <Tabs>
          {!visibleTabs || visibleTabs.includes(TAB_1_FRAGMENT) ? (
            <Tab
              label="General Access"
              href={'#' + TAB_1_FRAGMENT + search}
              isActive={pathname === TAB_1_FRAGMENT}
              onClick={handleClick(TAB_1_FRAGMENT + search)}
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_2_FRAGMENT) ? (
            <Tab
              label="Future Opportunities"
              href={'#' + TAB_2_FRAGMENT + search}
              isActive={pathname === TAB_2_FRAGMENT}
              onClick={handleClick(TAB_2_FRAGMENT + search)}
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_3_FRAGMENT) ? (
            <Tab
              label="Job Access"
              href={'#' + TAB_3_FRAGMENT + search}
              isActive={pathname === TAB_3_FRAGMENT}
              onClick={handleClick(TAB_3_FRAGMENT + search)}
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_4_FRAGMENT) ? (
            <Tab
              label="Access to Essential Services"
              href={'#' + TAB_4_FRAGMENT + search}
              isActive={pathname === TAB_4_FRAGMENT}
              onClick={handleClick(TAB_4_FRAGMENT + search)}
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_5_FRAGMENT) ? (
            <Tab
              label="Roads or Transit?"
              href={'#' + TAB_5_FRAGMENT + search}
              isActive={pathname === TAB_5_FRAGMENT}
              onClick={handleClick(TAB_5_FRAGMENT + search)}
            />
          ) : null}
        </Tabs>
      )}
    </div>
  );
}

const MoreViewsSheet = styled.aside<{ visible?: boolean }>`
  display: ${({ visible }) => (visible ? 'flex' : 'none')};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f8f8f8;
  padding: 1rem;
  gap: 0.5rem;

  position: absolute;
  right: 0;
  bottom: 68px;
  left: 0;
  z-index: 10;

  box-shadow: 0px -32px 64px hsla(0, 0%, 0%, 18.76%);

  > a {
    width: 100%;
  }
`;
