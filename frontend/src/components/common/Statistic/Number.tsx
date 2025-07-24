import React from 'react';
import { SectionEntry } from '../Section/SectionEntry';
import { StatisticContainer } from './StatisticContainer';

interface NumberProps {
  /** The label of the numerical statisitc(s) */
  label: string;
  /** The optional SVG icon to show with the statisitc(s) */
  icon?: React.ReactElement<SVGSVGElement>;
  /** The data to show. If multiple data objects are provided, a table will be displayed instead of a single value. */
  data: NumericalDataInput[] | NumericalDataInput['value'];
  /** The unit text to show after the number (e.g. 'people')*/
  unit?: string;
  /** If true, the statisitic container will be wrapped in a `<SectionEntry>` */
  wrap?: boolean;
}

export interface NumericalDataInput {
  /** The label for the statisitc. This is used when multiple statisitcs are provided (e.g., 2 areas are selected) */
  label: string;
  /** The value of the numerical statisitic. If provided as a string, it will be converted to a number. If not provided, a hyphen will be rendered. */
  value: number | string;
}

/**
 * Renders a numerical statistic with a label and value.
 */
export function Number(props: NumberProps) {
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
    const parsed = typeof props.data === 'number' ? props.data : parseFloat(props.data);
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
          {props.unit && Array.isArray(data) ? <span className="unit"> ({props.unit})</span> : null}
        </div>
        {Array.isArray(data) ? (
          <div className="table" role="table">
            {data.map(({ label, value }, index) => {
              return (
                <React.Fragment key={label + index}>
                  <span role="cell">{label}</span>
                  <span role="cell">{value}</span>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="single-value">
            {data}
            {props.unit ? <span className="unit"> {props.unit}</span> : null}
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
