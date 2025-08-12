import styled from '@emotion/styled';
import * as Plot from '@observablehq/plot';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { useRect } from '../../../../hooks';
import { facetedHorizontalBar } from './presets/facetedHorizontalBar';
import { horizontalBar } from './presets/hoizontalBar';

export interface PlotFigureProps {
  options:
    | Plot.PlotOptions
    | ((plotLib: typeof Plot, d3Lib: typeof d3, helpers: Helpers) => Plot.PlotOptions);
  className?: string;
  titleTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function PlotContainer(props: PlotFigureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useRect(containerRef);

  useEffect(() => {
    if (containerRef.current == null) {
      return;
    }

    const options =
      typeof props.options === 'function' ? props.options(Plot, d3, helpers) : props.options;
    if (options == null) {
      return;
    }

    if (!options.width) {
      options.width = width || 640;
    }

    if (options.title && typeof options.title === 'string') {
      const node = document.createElement(props.titleTag || 'h2');
      node.classList.add('plot-title');
      node.textContent = options.title;
      options.title = node;
    }

    const plot = Plot.plot(options);
    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [props.options, width]);

  return <Container ref={containerRef} className={props.className} />;
}

const helpers = {
  presets: {
    facetedHorizontalBar,
    horizontalBar,
  },
  utils: {
    sumAcross: (data: Record<string, unknown>[], key: string) => {
      return data.reduce((acc, d) => {
        const value = d[key];
        if (typeof value === 'number') {
          return acc + value;
        }
        return acc;
      }, 0);
    },
    maxAcross: (data: Record<string, unknown>[], key: string) => {
      return data.reduce((acc, d) => {
        const value = d[key];
        if (typeof value === 'number') {
          return Math.max(acc, value);
        }
        return acc;
      }, -Infinity);
    },
  },
};
type Helpers = typeof helpers;

const Container = styled.div`
  width: 100%;

  svg {
    font-family: inherit;

    g[aria-label*='-axis label'] {
      font-size: 0.813rem;
    }

    g[aria-label*='-axis tick label'] {
      font-size: 0.75rem;
    }
  }

  figure {
    margin: 0;
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-rows: auto;

    div[class^='plot-'][class*='-swatches'] {
      min-height: unset;
      font-family: inherit;
      font-size: 0.875rem;
      gap: 0rem 0.5rem;
      margin-bottom: 0.5rem;

      span[class^='plot-'][class$='-swatch'] {
        margin-right: 0;

        svg rect {
          rx: var(--button-radius);
        }
      }
    }

    figcaption {
      font-size: 0.813rem;
    }
  }
`;
