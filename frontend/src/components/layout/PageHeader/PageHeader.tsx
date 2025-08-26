import styled from '@emotion/styled';

export const PageHeader = styled.div`
  text-align: center;
  padding: 0.5rem 0.5rem 1rem 0.5rem;
  border-bottom: 1px solid lightgray;
  @container core (max-width: 899px) {
    padding: 0rem 0.5rem;
    margin-top: -0.5rem;
    margin-bottom: -0.5rem;
    border-bottom: none;
  }

  /* span the entire grid width */
  grid-column: 1 / -1;

  h2 {
    margin: 0;
    color: var(--color-primary);

    font-size: 1.5em;
    @container core (max-width: 899px) {
      font-size: 1.2em;
    }
  }

  p {
    margin: 0.5rem 0;
    font-size: 14px;
    color: var(--text-primary);
    @container core (max-width: 899px) {
      font-size: 13px;
      margin: 0.25rem 0;
    }
  }
`;
