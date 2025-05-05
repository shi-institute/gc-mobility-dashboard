import styled from '@emotion/styled';
import { Route, Routes } from 'react-router';
import { DevModeComponentsAll } from './views';

export default function App() {
  return (
    <>
      {import.meta.env.DEV ? <PlaceholderGreenvilleConnectsWebsiteHeader /> : null}
      <Routes>
        <Route path="/" element={<h1>Greenville Connects Mobility Dashboard</h1>} />
        {import.meta.env.DEV ? (
          <Route path="/components" element={<DevModeComponentsAll />} />
        ) : null}
      </Routes>
    </>
  );
}

const PlaceholderGreenvilleConnectsWebsiteHeader = styled.div`
  block-size: 4rem;
  inline-size: 100%;
  background-color: var(--color-green2);
`;
