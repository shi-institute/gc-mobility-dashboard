import { Button, CoreFrame, IconButton, Section, SectionEntry, Tab, Tabs } from '../components';

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
