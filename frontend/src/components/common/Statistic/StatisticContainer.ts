import styled from '@emotion/styled';

export const StatisticContainer = styled.div<{ partial?: boolean }>`
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

  opacity: ${(props) => (props.partial ? 0.5 : 1)};

  & > .content {
    display: block;
    width: 100%;

    .percent {
      font-size: 90%;
      margin-left: 2px;
    }

    .label {
      font-weight: 500;
      line-height: 1.1;
      margin: 0.2rem 0 0.18rem 0;

      display: flex;
      align-items: center;
      gap: 0.5rem;

      svg {
        fill: currentColor;
        block-size: 1.5rem;
        inline-size: 1.5rem;
        flex-shrink: 0;
      }
    }

    .label .unit {
      font-size: 0.8rem;
    }

    .label .caption {
      font-size: 0.825rem;
      color: var(--text-secondary);
      letter-spacing: -0.34px;
      font-weight: 400;
      line-height: 1.1;
      margin-top: 0.1rem;
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
      display: table;
      border-collapse: collapse;
      grid-template-columns: auto 1fr;
      width: calc(100% + 2rem);
      margin-top: 0.98rem;
      margin-left: -1rem;
      margin-bottom: -1rem;
      overflow-y: hidden;

      tr {
        border-top: 1px solid lightgray;
        border-bottom: 1px solid lightgray;
      }

      [role='cell'] {
        max-width: 120px;
        line-height: 1.1;
        padding: 0.5rem 0 0.5rem 1em;
        letter-spacing: -0.34px;
        text-indent: -1rem;
      }

      [role='cell']:first-of-type {
        padding-right: 0.5rem;
        padding-left: 2rem;
      }

      [role='cell']:last-of-type {
        padding-right: 1rem;
      }

      .caption {
        font-size: 0.825rem;
        color: var(--text-secondary);
        opacity: 0.8;
        margin-left: -1rem;
      }
    }
  }
`;
