import React from 'react';
import { SectionEntry } from '../Section/SectionEntry';
import type { NumericalDataInput } from './Number';
import { StatisticContainer } from './StatisticContainer';

interface PercentProps {
  /** The label of the percentage statisitc(s) */
  label: string;
  /** A short description for the statistic to provide additional clairity. */
  description?: string;
  /** The optional SVG icon to show with the statisitc(s) */
  icon?: React.ReactElement<SVGSVGElement>;
  /** The data to show. If multiple data objects are provided, a table will be displayed instead of a single value. */
  data?: NumericalDataInput[] | NumericalDataInput['value'];
  /** If true, the statisitic container will be wrapped in a `<SectionEntry>` */
  wrap?: boolean;
  /** Whether to render the statistic. Defaults to `true`. */
  if?: boolean;
}

/**
 * Renders a percentage statistic with a label and value.
 */
export function Percent(props: PercentProps) {
  if (props.if === false) {
    return null;
  }

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
          {props.description ? <div className="caption">{props.description}</div> : null}
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
                    {value}
                    <span className="percent">%</span>
                  </td>
                </tr>
              );
            })}
          </div>
        ) : (
          <div className="single-value">
            {data}
            <span className="percent">%</span>
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
