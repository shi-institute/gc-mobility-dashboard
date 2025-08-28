import React from 'react';
import { SectionEntry } from '../Section/SectionEntry';
import { StatisticContainer } from './StatisticContainer';

interface MoneyProps {
  /** The label of the dollar amount statistic(s) */
  label: string;
  /** The optional SVG icon to show with the statistic(s) */
  icon?: React.ReactElement<SVGSVGElement>;
  /** The data to show. If multiple data objects are provided, a table will be displayed instead of a single value. */
  data?: NumericalDataInput[] | NumericalDataInput['value'];
  /** If true, the statisitic container will be wrapped in a `<SectionEntry>` */
  wrap?: boolean;
  /** When true, renders 'per person' after the value */
  perCapita?: boolean;
}

export interface NumericalDataInput {
  /** The label for the statistic. This is used when multiple statistics are provided (e.g., 2 areas are selected) */
  label: string;
  /** The value of the dollar amount statistic. If provided as a string, it will be converted to a number. If not provided, a hyphen will be rendered. */
  value: number | string;
}

/**
 * Renders a dollar amount statistic with a label and value.
 */
export function Money(props: MoneyProps) {
  const data = (() => {
    if (Array.isArray(props.data)) {
      const parsedInputs = props.data.map((row) => ({
        label: row.label,
        value: (() => {
          const parsed = typeof row.value === 'number' ? row.value : parseFloat(row.value);
          if (isNaN(parsed)) {
            return '-';
          }
          return parsed;
        })(),
      }));
      if (props.data.length < 2) {
        return parsedInputs[0]?.value ?? '-';
      }
      return parsedInputs;
    }
    const parsed = typeof props.data === 'number' ? props.data : parseFloat(props.data || 'NaN');
    if (isNaN(parsed)) {
      return '-';
    }
    return parsed;
  })();

  const content = (
    <StatisticContainer>
      {props.icon}
      <div className="content">
        <div className="label">
          {props.label}
          {props.perCapita && Array.isArray(data) ? <span> per person</span> : null}
        </div>
        {Array.isArray(data) ? (
          <div className="table" role="table">
            {data.map(({ label, value }, index) => {
              const parenthesisContent = label.includes('(')
                ? label.split('(')[1]?.replace(')', '')
                : undefined;
              const cleanLabel = label.includes('(') ? label.split('(')[0]?.trim() || label : label;

              return (
                <tr role="row" key={label + index}>
                  <td role="cell">
                    {cleanLabel}
                    {parenthesisContent ? (
                      <>
                        <br />
                        <span className="caption">{parenthesisContent}</span>
                      </>
                    ) : null}
                  </td>

                  <td role="cell">
                    {'$'}
                    {parseFloat((typeof value === 'string' ? parseFloat(value) : value).toFixed(2))}
                  </td>
                </tr>
              );
            })}
          </div>
        ) : (
          <div className="single-value">
            <span className="unit large">{'$'}</span>
            {parseFloat((typeof data === 'string' ? parseFloat(data) : data).toFixed(2))}
            {props.perCapita ? <span className="unit"> per person</span> : null}
          </div>
        )}
      </div>
    </StatisticContainer>
  );

  if (props.wrap) {
    return <SectionEntry>{content}</SectionEntry>;
  }

  return content;
}
