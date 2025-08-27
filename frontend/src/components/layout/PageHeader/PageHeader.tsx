import styled from '@emotion/styled';

export const PageHeader = styled.div<{ isComparing?: boolean }>`
  text-align: center;
  padding: 0.5rem 0 1rem 0;
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

  // button row
  .button-row {
    display: flex;
    flex-direction: row;
    text-align: left;
    gap: 0.5rem;

    // justfy so that the more options button is always in the bottom right
    // (bottom for alighnment with select elements, right for consistency)
    align-items: end;
    justify-content: end;

    // add spacing and a border to separate from the content above
    border-top: 1px solid lightgray;
    margin-top: 1rem;
    padding-top: ${({ isComparing }) => (isComparing ? 1 : 0.5)}rem;

    > div {
      // allow form elements to grow to fill available space
      flex-grow: 1;

      // use smaller labels for the select element labels
      label {
        font-size: 0.875rem;
      }
    }

    p.message {
      flex.grow: 1;
      text-align: left;
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.2;
      color: var(--text-secondary);
      align-self: center;
      width: 100%;
    }
  }
`;
