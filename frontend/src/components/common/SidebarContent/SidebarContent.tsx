import styled from '@emotion/styled';

export const SidebarContent = styled.aside`
  padding: 1rem;
  font-size: 0.875rem;

  // enable scrolling within the sidebar if content overflows
  overflow: auto;
  box-sizing: border-box;
  height: 100%;

  // sidebar title
  h1 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    text-align: left;
    line-height: 1.2;

    position: sticky;
    margin: -1rem;
    top: -1rem;
    background-color: var(--sidebar-background-color, white);
    padding: 1.25rem 1rem 0.5rem;
    border-radius: var(--surface-radius) var(--surface-radius) 0 0;
    z-index: 500;
  }

  // sidebar section titles
  h2 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.25rem;
    color: var(--color-text-secondary);
    text-align: left;
    line-height: 1.2;
  }

  // field labels
  label {
    font-size: 0.875rem;
  }
`;
