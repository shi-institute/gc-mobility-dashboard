import { SectionEntry } from '../Section/SectionEntry';
import { StatisticContainer } from './StatisticContainer';

interface NumberProps {
  /** The label of the numerical statisitc */
  label: string;
  /** The value of the numerical statisitic. If provided, it will be converted to a number. If not provided, a hyphen will be rendered. */
  children?: string;
  /** If true, the statisitic container will be wrapped in a `<SectionEntry>` */
  wrap?: boolean;
}

/**
 * Renders a numerical statistic with a label and value.
 */
export function Number(props: NumberProps) {
  const content = (
    <StatisticContainer>
      <div className="label">{props.label}</div>
      <div className="value">{props.children ? parseFloat(props.children) : '-'}</div>
    </StatisticContainer>
  );

  if (props.wrap) {
    return <SectionEntry>{content}</SectionEntry>;
  }

  return content;
}
