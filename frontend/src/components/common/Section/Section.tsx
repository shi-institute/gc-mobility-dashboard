import styled from '@emotion/styled';
import type { JSX } from 'react';

interface SectionProps {
  /** The label for the section, which appears above the children's grid area */
  title: string;
  /** The heading level to use for the title. Defaults to 2 (h2). */
  level?: number;
  /**
   * The children to render inside the section.
   *
   * Children are placed into a grid layout that adapts based on the width of the section.
   * Smaller widths will show fewer columns, while larger widths will show more.
   *
   * **Use `SectionEntry` components for individual entries within the section.**
   */
  children: React.ReactNode;
  /** If true, do not use grid layout for children */
  noGrid?: boolean;
  /** If true, use flex instead of block for the wrapper that contains the title and the children. */
  flexParent?: boolean;
}

export function Section(props: SectionProps) {
  const TitleTag = `h${props.level || 2}` as keyof JSX.IntrinsicElements;

  return (
    <SectionComponent noGrid={props.noGrid} flexParent={props.flexParent}>
      <TitleTag className="section-title">{props.title}</TitleTag>
      <div className="section-content">{props.children}</div>
    </SectionComponent>
  );
}

const SectionComponent = styled.section<{ noGrid?: boolean; flexParent?: boolean }>`
  container-type: inline-size;
  container-name: section;
  inline-size: 100%; /* required because container-type: inline-size collapses inline-size to 0 with auto values */

  display: ${(props) => (props.flexParent ? 'flex' : 'block')};
  flex-direction: column;

  .section-content {
    display: ${(props) => (props.noGrid ? (props.flexParent ? 'flex' : 'block') : 'grid')};
    grid-template-columns: [left] repeat(4, 1fr) [right];
    grid-auto-rows: minmax(3rem, min-content);
    grid-auto-flow: dense;
    gap: 0.5rem;

    flex-grow: 1;

    @container section (max-width: 899px) {
      grid-template-columns: [left] repeat(3, 1fr) [right];
    }

    @container section (max-width: 599px) {
      grid-template-columns: [left] repeat(2, 1fr) [right];
    }
  }

  .section-title {
    grid-column: 1 / -1;
    grid-row: 1;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
    text-align: left;
    line-height: 1.2;
    flex-grow: 0;
    flex-shrink: 0;
  }
`;
