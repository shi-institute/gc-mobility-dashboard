import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSectionsVisibility } from '../../hooks';
import { Button, NavBar, NavBarItem, Tab, Tabs } from '../common';
import {
  FAQ_TAB_FRAGMENT,
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

  const rootElement = document.getElementById('gcmd-root');
  const homePath = rootElement?.getAttribute('data-home-path') || undefined;
  function goHome() {
    window.location.href = homePath + search;
  }

  const externalFAQsPath = rootElement?.getAttribute('data-help-path') || undefined;
  function navigateToFAQs() {
    if (externalFAQsPath) {
      window.location.href = externalFAQsPath + search;
    } else {
      handleClick(FAQ_TAB_FRAGMENT + search);
    }
  }

  const handleClick =
    (to: string) => (evt: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>) => {
      evt.preventDefault();
      setShowMoreViews(false);
      navigate(to);
    };

  // track the width of the app navigation to determine if we should use mobile or desktop navigation
  const [isMobile, setIsMobile] = useState(false);
  const [isNarrowDesktop, setIsNarrowDesktop] = useState(false);
  const [isNarrowerDesktop, setIsNarrowerDesktop] = useState(false);
  const appNavRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleResize() {
      if (appNavRef.current) {
        setIsMobile(appNavRef.current.offsetWidth < 900);
        setIsNarrowDesktop(appNavRef.current.offsetWidth < 1120);
        setIsNarrowerDesktop(appNavRef.current.offsetWidth < 1060);
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="currentColor"
                >
                  <path d="M480-320.08 320.08-480 480-639.92 639.92-480 480-320.08Zm48.46 178.66q-10.11 10.11-22.61 15.13-12.5 5.02-25.85 5.02-13.35 0-25.85-5.02-12.5-5.02-22.61-15.13L140.27-432.7q-9.73-9.72-14.75-22.13-5.02-12.4-5.02-25.55 0-13.16 5.02-25.56 5.02-12.41 14.76-22.14l291-291.01q10.37-10.37 22.76-15.48 12.39-5.12 26-5.12t25.96 5.12q12.35 5.11 22.88 15.46l291.06 291.05q9.52 9.71 14.63 22.12 5.12 12.4 5.12 25.56 0 13.15-5.12 25.55-5.11 12.41-14.62 22.11l-291.49 291.3Zm-41.92-60.73 271.69-271.7q2.69-2.69 2.69-6.53 0-3.85-2.69-6.54L486.54-758.61q-2.69-2.7-6.54-2.51-3.85.2-6.54 2.89L201.39-486.15q-2.7 2.69-2.51 6.15.2 3.46 2.89 6.15l271.69 271.7q2.69 2.69 6.54 2.69t6.54-2.69Z" />
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
            <hr />
            <div className="split">
              {homePath && (
                <Button href={homePath + search} onClick={goHome}>
                  Home/Welcome
                </Button>
              )}
              <Button
                href={(externalFAQsPath || '#' + FAQ_TAB_FRAGMENT) + search}
                onClick={navigateToFAQs}
              >
                FAQs
              </Button>
            </div>
          </MoreViewsSheet>
        </NavBar>
      ) : (
        <Tabs>
          {homePath && (
            <Tab
              label={''}
              href={homePath + search}
              onClick={goHome}
              iconLeft={
                <svg viewBox="0 0 24 24">
                  <path
                    d="M10.55 2.532a2.25 2.25 0 0 1 2.9 0l6.75 5.692c.507.428.8 1.057.8 1.72v9.803a1.75 1.75 0 0 1-1.75 1.75h-3.5a1.75 1.75 0 0 1-1.75-1.75v-5.5a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25v5.5a1.75 1.75 0 0 1-1.75 1.75h-3.5A1.75 1.75 0 0 1 3 19.747V9.944c0-.663.293-1.292.8-1.72l6.75-5.692Zm1.933 1.147a.75.75 0 0 0-.966 0L4.767 9.37a.75.75 0 0 0-.267.573v9.803c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-5.5c0-.967.784-1.75 1.75-1.75h3.5c.966 0 1.75.783 1.75 1.75v5.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25V9.944a.75.75 0 0 0-.267-.573l-6.75-5.692Z"
                    fill="currentColor"
                  />
                </svg>
              }
            />
          )}
          {!visibleTabs || visibleTabs.includes(TAB_1_FRAGMENT) ? (
            <Tab
              label="General Access"
              href={'#' + TAB_1_FRAGMENT + search}
              isActive={pathname === TAB_1_FRAGMENT}
              onClick={handleClick(TAB_1_FRAGMENT + search)}
              iconLeft={
                !isNarrowerDesktop && (
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M14.754 10c.966 0 1.75.784 1.75 1.75V15H16.5v.25a.75.75 0 0 1-1.5 0V13h.004v-1.25a.25.25 0 0 0-.25-.25H9.252a.25.25 0 0 0-.25.25V15H9v.25a.75.75 0 0 1-1.5 0V13h.002v-1.25c0-.966.783-1.75 1.75-1.75h5.502ZM20.5 11.75v3.5a.75.75 0 0 0 1.5 0v-3.5A1.75 1.75 0 0 0 20.25 10h-3.375c.343.415.567.932.618 1.5h2.757a.25.25 0 0 1 .25.25ZM2 15.25a.75.75 0 0 0 1.5 0v-3.5a.25.25 0 0 1 .25-.25h2.763a2.738 2.738 0 0 1 .618-1.5H3.75A1.75 1.75 0 0 0 2 11.75v3.5ZM12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM5.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM2.75 17a.75.75 0 0 0-.75.75v.5A3.75 3.75 0 0 0 5.75 22h12.5A3.75 3.75 0 0 0 22 18.25v-.5a.75.75 0 0 0-.75-.75H2.75Zm3 3.5a2.25 2.25 0 0 1-2.236-2h16.972a2.25 2.25 0 0 1-2.236 2H5.75Z"
                      fill="currentColor"
                    />
                  </svg>
                )
              }
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_2_FRAGMENT) ? (
            <Tab
              label="Future Opportunities"
              href={'#' + TAB_2_FRAGMENT + search}
              isActive={pathname === TAB_2_FRAGMENT}
              onClick={handleClick(TAB_2_FRAGMENT + search)}
              iconLeft={
                !isNarrowerDesktop && (
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 1.996a7.49 7.49 0 0 1 7.496 7.25l.004.25v4.097l1.38 3.156a1.249 1.249 0 0 1-1.145 1.75L15 18.502a3 3 0 0 1-5.995.177L9 18.499H4.275a1.251 1.251 0 0 1-1.147-1.747L4.5 13.594V9.496c0-4.155 3.352-7.5 7.5-7.5ZM13.5 18.5l-3 .002a1.5 1.5 0 0 0 2.993.145l.006-.147ZM12 3.496c-3.32 0-6 2.674-6 6v4.41L4.656 17h14.697L18 13.907V9.509l-.004-.225A5.988 5.988 0 0 0 12 3.496Zm9 4.754h2a.75.75 0 0 1 .102 1.493L23 9.75h-2a.75.75 0 0 1-.102-1.493L21 8.25Zm-20 0h2a.75.75 0 0 1 .102 1.493L3 9.75H1a.75.75 0 0 1-.102-1.493L1 8.25Zm21.6-5.7a.75.75 0 0 1-.066.977l-.084.073-2 1.5a.75.75 0 0 1-.984-1.127l.084-.073 2-1.5a.75.75 0 0 1 1.05.15ZM2.45 2.4l2 1.5a.75.75 0 1 1-.9 1.2l-2-1.5a.75.75 0 1 1 .9-1.2Z"
                      fill="currentColor"
                    />
                  </svg>
                )
              }
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_3_FRAGMENT) ? (
            <Tab
              label="Job Access"
              href={'#' + TAB_3_FRAGMENT + search}
              isActive={pathname === TAB_3_FRAGMENT}
              onClick={handleClick(TAB_3_FRAGMENT + search)}
              iconLeft={
                !isNarrowerDesktop && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 -960 960 960"
                    fill="currentColor"
                  >
                    <path d="M176.26-148.08q-28.35 0-48.27-19.91-19.91-19.92-19.91-48.36v-415.38q0-28.44 19.91-48.35Q147.91-700 176.35-700h168.5v-63.7q0-28.45 19.91-48.34 19.92-19.88 48.28-19.88h133.92q28.36 0 48.28 19.92 19.91 19.91 19.91 48.35V-700h168.5q28.44 0 48.36 19.92 19.91 19.91 19.91 48.35v415.38q0 28.44-19.91 48.36-19.92 19.91-48.27 19.91H176.26Zm.09-55.96h607.3q4.62 0 8.47-3.84 3.84-3.85 3.84-8.47v-415.38q0-4.62-3.84-8.46-3.85-3.85-8.47-3.85h-607.3q-4.62 0-8.47 3.85-3.84 3.84-3.84 8.46v415.38q0 4.62 3.84 8.47 3.85 3.84 8.47 3.84ZM400.81-700h158.38v-63.65q0-4.62-3.84-8.46-3.85-3.85-8.47-3.85H413.12q-4.62 0-8.47 3.85-3.84 3.84-3.84 8.46V-700ZM164.04-204.04v-440 440Z" />
                  </svg>
                )
              }
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_4_FRAGMENT) ? (
            <Tab
              label={isNarrowDesktop ? 'Services Access' : 'Access to Essential Services'}
              href={'#' + TAB_4_FRAGMENT + search}
              isActive={pathname === TAB_4_FRAGMENT}
              onClick={handleClick(TAB_4_FRAGMENT + search)}
              iconLeft={
                !isNarrowerDesktop && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 -960 960 960"
                    fill="currentColor"
                  >
                    <path d="M480-320.08 320.08-480 480-639.92 639.92-480 480-320.08Zm48.46 178.66q-10.11 10.11-22.61 15.13-12.5 5.02-25.85 5.02-13.35 0-25.85-5.02-12.5-5.02-22.61-15.13L140.27-432.7q-9.73-9.72-14.75-22.13-5.02-12.4-5.02-25.55 0-13.16 5.02-25.56 5.02-12.41 14.76-22.14l291-291.01q10.37-10.37 22.76-15.48 12.39-5.12 26-5.12t25.96 5.12q12.35 5.11 22.88 15.46l291.06 291.05q9.52 9.71 14.63 22.12 5.12 12.4 5.12 25.56 0 13.15-5.12 25.55-5.11 12.41-14.62 22.11l-291.49 291.3Zm-41.92-60.73 271.69-271.7q2.69-2.69 2.69-6.53 0-3.85-2.69-6.54L486.54-758.61q-2.69-2.7-6.54-2.51-3.85.2-6.54 2.89L201.39-486.15q-2.7 2.69-2.51 6.15.2 3.46 2.89 6.15l271.69 271.7q2.69 2.69 6.54 2.69t6.54-2.69Z" />
                  </svg>
                )
              }
            />
          ) : null}
          {!visibleTabs || visibleTabs.includes(TAB_5_FRAGMENT) ? (
            <Tab
              label="Roads or Transit?"
              href={'#' + TAB_5_FRAGMENT + search}
              isActive={pathname === TAB_5_FRAGMENT}
              onClick={handleClick(TAB_5_FRAGMENT + search)}
              iconLeft={
                !isNarrowerDesktop && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 -960 960 960"
                    fill="currentColor"
                  >
                    <path d="M486.17-354.39q61.91 0 105.93-39.49 44.01-39.5 44.01-97 0-49.35-31.36-84.22-31.37-34.86-77.48-34.86-39.96 0-68.19 25.78-28.23 25.78-28.23 63.18 0 16.3 6.57 31.8 6.58 15.51 18.85 28.47l41.19-39.46q-5.23-3.68-7.94-8.72-2.71-5.04-2.71-11.05 0-13.04 10.68-23.04 10.69-10 29.78-10 22.04 0 37.77 17.77 15.73 17.77 15.73 45.35 0 32.95-26.63 56.55-26.63 23.6-66.74 23.6-48.4 0-82.42-38.53t-34.02-95.45q0-29.41 11.19-56.6 11.2-27.19 32.27-48.27l-40.23-39.53q-29.01 28.5-44.6 65.54Q314-585.53 314-544.83q0 79.05 49.99 134.75 49.99 55.69 122.18 55.69ZM262.12-102.12v-159.87q-57.2-51.86-88.6-118.86-31.4-67.01-31.4-139.57 0-140.65 98.58-239.15 98.59-98.51 239.2-98.51 116.02 0 207.35 69.3 91.33 69.29 118.59 179.47l46.62 184.62q4.42 16.32-5.81 29.45-10.24 13.12-27.42 13.12h-81.15v131.73q0 28.44-20.01 48.36-20.01 19.91-48.26 19.91h-91.73v80h-55.96v-135.96h147.69q5.19 0 8.75-3.46 3.56-3.46 3.56-8.85v-187.69h108.3l-38.3-157.42q-23.2-91.69-99.29-149.15-76.1-57.47-172.93-57.47-116.71 0-199.27 81.81-82.55 81.81-82.55 198.69 0 60.2 24.65 114.72 24.65 54.52 70.15 96.52l25.2 23.19v185.07h-55.96Zm232.38-350Z" />
                  </svg>
                )
              }
            />
          ) : null}
          <div className="spacer" style={{ flexGrow: 1 }}></div>
          <Tab
            label={isNarrowerDesktop ? '' : 'FAQs'}
            href={(externalFAQsPath || '#' + FAQ_TAB_FRAGMENT) + search}
            isActive={pathname === FAQ_TAB_FRAGMENT}
            onClick={navigateToFAQs}
            iconLeft={
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 4C9.236 4 7 6.236 7 9a.75.75 0 0 0 1.5 0c0-1.936 1.564-3.5 3.5-3.5s3.5 1.564 3.5 3.5c0 .852-.222 1.42-.529 1.86-.324.463-.767.823-1.302 1.232l-.138.105c-1.01.768-2.281 1.734-2.281 3.803v.25a.75.75 0 0 0 1.5 0V16c0-1.317.714-1.863 1.785-2.682l.046-.035c.527-.403 1.147-.887 1.62-1.564.49-.701.799-1.57.799-2.719 0-2.764-2.236-5-5-5ZM12 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  fill="currentColor"
                />
              </svg>
            }
          />
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

  hr {
    width: 100%;
    border: none;
    border-top: 1px solid #ccc;
  }

  .split {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    width: 100%;

    > a {
      flex: 1;
    }
  }
`;
