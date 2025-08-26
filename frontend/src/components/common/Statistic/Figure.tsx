import styled from '@emotion/styled';
import { SectionEntry, SectionEntryProps } from '../Section/SectionEntry';
import { PlotContainer, PlotFigureProps } from './plot/PlotContainer';
import { StatisticContainer as _StatisticContainer } from './StatisticContainer';

export interface FigureProps {
  /** The label of the figure */
  label: string;
  /** The optional SVG icon to show in front of the label */
  icon?: React.ReactElement<SVGSVGElement>;
  /** The figure to show. */
  plot: PlotFigureProps['options'] | PlotFigureProps['options'][];
  /** If true or an object, the statisitic container will be wrapped in a `<SectionEntry>` Objects should be of tye `SectionEntryProps`. */
  wrap?: boolean | Omit<SectionEntryProps, 'children'>;
  /** Show the legend swatches before the plot title */
  legendBeforeTitle?: boolean;
}

export function Figure(props: FigureProps) {
  const content = (
    <StatisticContainer legendBeforeTitle={props.legendBeforeTitle}>
      {props.icon}
      <div className="content">
        <div className="label">{props.label}</div>
        {Array.isArray(props.plot) ? (
          props.plot.map((plot, index) => {
            return (
              <PlotContainer options={plot} key={index} className="plot-container" titleTag="h4" />
            );
          })
        ) : (
          <PlotContainer options={props.plot} titleTag="h4" />
        )}
      </div>
    </StatisticContainer>
  );

  if (props.wrap) {
    let sectionEntryProps: SectionEntryProps = {
      children: content,
    };

    if (typeof props.wrap === 'object') {
      sectionEntryProps = {
        ...sectionEntryProps,
        ...props.wrap,
      };
    }

    return <SectionEntry {...sectionEntryProps} />;
  }

  return content;
}

const StatisticContainer = styled(_StatisticContainer)<{ legendBeforeTitle?: boolean }>`
  & > .content {
    width: 100%;

    h4.plot-title {
      font-size: 0.875rem;
      font-weight: 400;
      margin: 0;
    }

    .plot-container + .plot-container {
      margin-top: 0.75rem;
    }

    ${({ legendBeforeTitle }) => {
      if (legendBeforeTitle) {
        return `
          div[class^='plot-'][class*='-swatches'] {
            grid-row: 1;
          }
        `;
      }
    }}
  }
`;
