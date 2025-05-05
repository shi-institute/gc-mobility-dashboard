import styled from '@emotion/styled';

/**
 * A component that wraps the Tab components. It provides a horizontal layout for the tabs.
 * It should be used as a parent component to the Tab components.
 */
export const Tabs = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 0.25rem;
  border-bottom: 1px solid lightgray;
  padding: 0 1rem;
  max-width: 100%;
  overflow-x: auto;
`;
