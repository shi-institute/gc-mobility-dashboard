import { SectionEntry } from '../Section/SectionEntry';
import { StatisticContainer } from './StatisticContainer';

interface PercentProps {
  /** The label of the percentage statisitc */
  label: string;
  /** The value of the percentage statisitic. If provided, it will be converted to a number and multiplied by 100. If not provided, a hyphen will be rendered. */
  children?: string;
  /** If true, the statisitic container will be wrapped in a `<SectionEntry>` */
  wrap?: boolean;
}

/**
 * Renders a percentage statistic with a label and value.
 */
export function Percent(props: PercentProps) {
  const content = (
    <StatisticContainer>
      <div className="label">{props.label}</div>
      <div className="value">{props.children ? parseFloat(props.children) * 100 + '%' : '-'}</div>
    </StatisticContainer>
  );

  if (props.wrap) {
    return <SectionEntry>{content}</SectionEntry>;
  }

  return content;
}
