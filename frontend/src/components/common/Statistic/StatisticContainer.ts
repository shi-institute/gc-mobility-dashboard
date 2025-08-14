import styled from '@emotion/styled';

export const StatisticContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: start;
  justify-content: start;
  padding: 1rem;
  background-color: var(--color-background-secondary);
  box-sizing: border-box;
  border: 1px solid lightgray;
  border-radius: var(--surface-radius);

  & > svg {
    fill: currentColor;
    block-size: 1.5rem;
    inline-size: 1.5rem;
  }

  & > .content {
    display: block;

    .percent {
      font-size: 90%;
      margin-left: 2px;
    }

    .label {
      font-weight: 500;
    }

    .label .unit {
      font-size: 0.8rem;
    }

    .single-value {
      font-size: 1.5rem;

      .unit {
        font-size: 0.9rem;
      }
      .unit.large {
        font-size: 90%;
      }
    }

    .table {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0 0.5rem;
      width: 100%;

      span[role='cell'] {
        max-width: 120px;
      }
    }
  }
`;
