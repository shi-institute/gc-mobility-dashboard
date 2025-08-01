import styled from '@emotion/styled';
import * as Plot from '@observablehq/plot';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { useRect } from '../../../hooks';

interface PlotFigureProps {
  options: Plot.PlotOptions | ((plotLib: typeof Plot, d3Lib: typeof d3) => Plot.PlotOptions);
}

export function PlotContainer(props: PlotFigureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useRect(containerRef);

  useEffect(() => {
    if (containerRef.current == null) {
      return;
    }

    const options = typeof props.options === 'function' ? props.options(Plot, d3) : props.options;
    if (options == null) {
      return;
    }

    console.log(width);

    if (!options.width) {
      options.width = width || 640;
    }

    const plot = Plot.plot(options);
    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [props.options, width]);

  return <Container ref={containerRef} />;
}

const Container = styled.div`
  width: 100%;

  figure {
    margin: 0;
  }
`;
