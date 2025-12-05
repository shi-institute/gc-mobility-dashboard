import styled from '@emotion/styled';

export interface SectionEntryProps {
  /** The component or element to be rendered inside this entry */
  children: React.ReactElement;
  /** Whether this section entry will be hidden from the section. Hiding an entry may cause other entries to be repositioned. */
  hidden?: boolean;
  /** Placement instructions, to be used when the section has a large width. */
  l?: SectionEntryPlacement;
  /** Placement instructions, to be used when the section has a medium width. */
  m?: SectionEntryPlacement;
  /** Placement instructions, to be used when the section has a small width. */
  s?: SectionEntryPlacement;
  /** Placement instructions, to be used when the large, medium, or small instructions do not apply. */
  f?: SectionEntryPlacement;
  onClick?: (event: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

interface SectionEntryPlacement {
  /**
   * The column placement of this entry in the section grid.
   * This can be an valid CSS grid-column value.
   *
   * To span multiple columns with auto-placement, use a value like "span 2" or "span 3".
   * To span specific columns, use a value like "2 / 4" or "1 / 4.
   *
   * @default "auto"
   */
  gridColumn?: string;

  /**
   * The row placement of this entry in the section grid.
   * This can be an valid CSS grid-row value.
   *
   * To span multiple rows with auto-placement, use a value like "span 2" or "span 3".
   * To span specific rows, use a value like "2 / 4" or "1 / 4".
   *
   * @default "auto"
   */
  gridRow?: string;
}

/**
 * Represents a single entry in a section.
 * This component is designed to be used as a direct child of a `Section` component.
 * It allows for responsive placement of content within a section grid.
 */
export function SectionEntry(props: SectionEntryProps) {
  if (props.hidden) {
    return null;
  }

  const placementStrings = `
    --grid-column--small: ${props.s?.gridColumn || props.f?.gridColumn || 'auto'};
    --grid-row--small: ${props.s?.gridRow || props.f?.gridRow || 'auto'};
    --grid-column--medium: ${props.m?.gridColumn || props.f?.gridColumn || 'auto'};
    --grid-row--medium: ${props.m?.gridRow || props.f?.gridRow || 'auto'};
    --grid-column--large: ${props.l?.gridColumn || props.f?.gridColumn || 'auto'};
    --grid-row--large: ${props.l?.gridRow || props.f?.gridRow || 'auto'};
  `;

  return (
    <SectionEntryComponent
      placementStrings={placementStrings}
      style={props.style}
      onClick={props.onClick}
    >
      {props.children}
    </SectionEntryComponent>
  );
}

const SectionEntryComponent = styled.div<{ placementStrings: string }>`
  overflow: auto;
  position: relative;

  ${(props) => props.placementStrings}

  > * {
    inline-size: 100%;
    block-size: 100%;
  }

  grid-column: var(--grid-column--small);
  grid-row: var(--grid-row--small);

  @container section (min-width: 600px) {
    grid-column: var(--grid-column--medium);
    grid-row: var(--grid-row--medium);
  }

  @container section (min-width: 900px) {
    grid-column: var(--grid-column--large);
    grid-row: var(--grid-row--large);
  }
`;
