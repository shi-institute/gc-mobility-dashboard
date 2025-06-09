import {
  Button,
  CoreFrame,
  IconButton,
  NavBar,
  NavBarItem,
  Section,
  SectionEntry,
  Tab,
  Tabs,
} from '../components';

export function DevModeComponentsAll() {
  return (
    <div>
      <h1>All components</h1>
      <h2>Tabs</h2>
      <Tabs>
        <Tab
          label="Anchor Tab with Icon"
          href="#"
          iconLeft={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <Tab label="Button Tab" />
        <Tab
          label="Active Button Tab with Icon and click handler"
          isActive
          onClick={() => {
            alert('Button Tab clicked');
          }}
          iconLeft={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <Tab
          label="Button Tab with Icons"
          iconLeft={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
                fill="currentColor"
              />
            </svg>
          }
          iconRight={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4.22 8.47a.75.75 0 0 1 1.06 0L12 15.19l6.72-6.72a.75.75 0 1 1 1.06 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L4.22 9.53a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <Tab label="Other Tab" variant="line" isActive>
          Other Tab without Icons
        </Tab>
        <Tab
          label="Other Tab with Icons"
          variant="line"
          iconLeft={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
                fill="currentColor"
              />
            </svg>
          }
          iconRight={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4.22 8.47a.75.75 0 0 1 1.06 0L12 15.19l6.72-6.72a.75.75 0 1 1 1.06 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L4.22 9.53a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          }
        >
          Other Tab with Icons
        </Tab>
      </Tabs>

      <h2>Button</h2>
      <div style={{ padding: 20, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button
          href="https://www.google.com/"
          onClick={() => {
            alert('Button clicked');
          }}
          iconLeft={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
                fill="currentColor"
              />
            </svg>
          }
          iconRight={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4.22 8.47a.75.75 0 0 1 1.06 0L12 15.19l6.72-6.72a.75.75 0 1 1 1.06 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L4.22 9.53a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          }
        >
          Link button with icons and click handler
        </Button>
        <Button
          href="https://www.google.com/"
          onClick={(evt) => {
            evt.preventDefault();
          }}
        >
          Link button with click handler (prevent default)
        </Button>
        <Button
          iconLeft={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
                fill="currentColor"
              />
            </svg>
          }
          iconRight={
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4.22 8.47a.75.75 0 0 1 1.06 0L12 15.19l6.72-6.72a.75.75 0 1 1 1.06 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L4.22 9.53a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          }
        >
          Button With Icons
        </Button>
        <Button>Button</Button>
      </div>

      <h2>IconButton</h2>
      <div style={{ padding: 20, display: 'flex', gap: '0.5rem' }}>
        <IconButton>
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
              fill="currentColor"
            />
          </svg>
        </IconButton>
        <IconButton disabled>
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
              fill="currentColor"
            />
          </svg>
        </IconButton>
      </div>
      <h2>Navigation Bar</h2>

      <NavBar>
        <NavBarItem
          label="General Access"
          href="https://www.google.com/"
          icon={
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M14.754 10c.966 0 1.75.784 1.75 1.75V15H16.5v.25a.75.75 0 0 1-1.5 0V13h.004v-1.25a.25.25 0 0 0-.25-.25H9.252a.25.25 0 0 0-.25.25V15H9v.25a.75.75 0 0 1-1.5 0V13h.002v-1.25c0-.966.783-1.75 1.75-1.75h5.502ZM20.5 11.75v3.5a.75.75 0 0 0 1.5 0v-3.5A1.75 1.75 0 0 0 20.25 10h-3.375c.343.415.567.932.618 1.5h2.757a.25.25 0 0 1 .25.25ZM2 15.25a.75.75 0 0 0 1.5 0v-3.5a.25.25 0 0 1 .25-.25h2.763a2.738 2.738 0 0 1 .618-1.5H3.75A1.75 1.75 0 0 0 2 11.75v3.5ZM12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM5.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM2.75 17a.75.75 0 0 0-.75.75v.5A3.75 3.75 0 0 0 5.75 22h12.5A3.75 3.75 0 0 0 22 18.25v-.5a.75.75 0 0 0-.75-.75H2.75Zm3 3.5a2.25 2.25 0 0 1-2.236-2h16.972a2.25 2.25 0 0 1-2.236 2H5.75Z"
                fill="currentColor"
              />
            </svg>
          }
          isActive
        />
        <NavBarItem
          label="Future Opportunities"
          icon={
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 1.996a7.49 7.49 0 0 1 7.496 7.25l.004.25v4.097l1.38 3.156a1.249 1.249 0 0 1-1.145 1.75L15 18.502a3 3 0 0 1-5.995.177L9 18.499H4.275a1.251 1.251 0 0 1-1.147-1.747L4.5 13.594V9.496c0-4.155 3.352-7.5 7.5-7.5ZM13.5 18.5l-3 .002a1.5 1.5 0 0 0 2.993.145l.006-.147ZM12 3.496c-3.32 0-6 2.674-6 6v4.41L4.656 17h14.697L18 13.907V9.509l-.004-.225A5.988 5.988 0 0 0 12 3.496Zm9 4.754h2a.75.75 0 0 1 .102 1.493L23 9.75h-2a.75.75 0 0 1-.102-1.493L21 8.25Zm-20 0h2a.75.75 0 0 1 .102 1.493L3 9.75H1a.75.75 0 0 1-.102-1.493L1 8.25Zm21.6-5.7a.75.75 0 0 1-.066.977l-.084.073-2 1.5a.75.75 0 0 1-.984-1.127l.084-.073 2-1.5a.75.75 0 0 1 1.05.15ZM2.45 2.4l2 1.5a.75.75 0 1 1-.9 1.2l-2-1.5a.75.75 0 1 1 .9-1.2Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <NavBarItem
          label="Essential Services Access"
          icon={
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 5.5a3.5 3.5 0 1 1 4.489 3.358 5.502 5.502 0 0 0 5.261 3.892h.33a3.501 3.501 0 0 1 6.92.75 3.5 3.5 0 0 1-6.92.75h-.33a6.987 6.987 0 0 1-5.5-2.67v3.5A3.501 3.501 0 0 1 7.5 22a3.5 3.5 0 0 1-.75-6.92V8.92A3.501 3.501 0 0 1 4 5.5Zm3.5-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8-3a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <NavBarItem
          label="More Views"
          icon={
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M2.75 18h12.5a.75.75 0 0 1 .102 1.493l-.102.007H2.75a.75.75 0 0 1-.102-1.494L2.75 18h12.5-12.5Zm0-6.5h18.5a.75.75 0 0 1 .102 1.493L21.25 13H2.75a.75.75 0 0 1-.102-1.493l.102-.007h18.5-18.5Zm0-6.497h15.5a.75.75 0 0 1 .102 1.493l-.102.007H2.75a.75.75 0 0 1-.102-1.493l.102-.007h15.5-15.5Z"
                fill="currentColor"
              />
            </svg>
          }
        />
      </NavBar>

      <h2>CoreFrame</h2>
      <div style={{ padding: 20 }}>
        <CoreFrame
          outerStyle={{ border: '1px solid black', height: 800 }}
          header={
            <Tabs>
              <Tab
                label="Anchor Tab with Icon"
                href="#"
                iconLeft={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.04 5.493a3 3 0 1 1 5.919.002l2.432-.908a2.359 2.359 0 0 1 1.766 4.372L16 10.335v3.11l1.883 5.467a2.316 2.316 0 0 1-4.365 1.549l-1.515-4.148-1.512 4.15a2.32 2.32 0 0 1-4.373-1.55L8 13.457v-3.12L4.694 8.884A2.35 2.35 0 0 1 6.46 4.53l2.58.962Zm1.46-.495a1.5 1.5 0 0 0 .896 1.373 1.75 1.75 0 0 0 1.187.01A1.5 1.5 0 1 0 10.5 4.997Zm.33 2.763L5.937 5.936a.85.85 0 0 0-.64 1.574l3.755 1.653a.75.75 0 0 1 .448.686v3.735a.75.75 0 0 1-.04.245L7.535 19.4a.82.82 0 0 0 1.545.549l1.65-4.527c.433-1.186 2.11-1.187 2.544 0l1.652 4.523a.816.816 0 0 0 1.538-.546l-1.924-5.584a.752.752 0 0 1-.04-.245V9.843a.75.75 0 0 1 .45-.688l3.607-1.57a.859.859 0 0 0-.643-1.592l-4.78 1.783c-.35.143-.733.222-1.135.222a2.99 2.99 0 0 1-1.17-.237Z"
                      fill="currentColor"
                    />
                  </svg>
                }
              />
              <Tab label="Button Tab" />
            </Tabs>
          }
          map={<div style={{ background: 'green', height: '100%' }}>Map</div>}
          sections={[
            <div style={{ background: 'red', height: 'fit-content' }}>Section 1</div>,
            <div style={{ background: 'lightblue', height: 'fit-content' }}>Section 2</div>,
            <div style={{ background: 'orange', height: 'fit-content' }}>Section 3</div>,
            <div style={{ background: 'pink', height: 'fit-content' }}>Section 4</div>,
          ]}
          sidebar={<div style={{ height: '100%' }}>Sidebar</div>}
        />
      </div>

      <h2>Section</h2>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
        <Section title="Section Title">
          <SectionEntry>
            <div>Card 1</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 2</div>
          </SectionEntry>
          <SectionEntry f={{ gridColumn: 'span 2' }}>
            <div>Card 3</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 4</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 5</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 6</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 7</div>
          </SectionEntry>
          <SectionEntry m={{ gridColumn: '2 / 4', gridRow: '1 / 3' }}>
            <div>Card 8</div>
          </SectionEntry>
        </Section>
        <Section title="Section Title 2">
          <SectionEntry hidden>
            <div>Card 1</div>
          </SectionEntry>
          <SectionEntry hidden>
            <div>Card 2</div>
          </SectionEntry>
          <SectionEntry f={{ gridColumn: 'span 2' }}>
            <div>Card 3</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 4</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 5</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 6</div>
          </SectionEntry>
          <SectionEntry>
            <div>Card 7</div>
          </SectionEntry>
        </Section>
      </div>
    </div>
  );
}
