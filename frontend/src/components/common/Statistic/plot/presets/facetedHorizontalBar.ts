import * as Plot from '@observablehq/plot';
import * as d3 from 'd3';

interface FacetedHorizontalBarParams {
  domainY: string[];
  data: Record<string, unknown>[];

  axis: {
    label: string;
    tickFormat: (n: number) => string;
    domainX?: [number, number];
  };

  /** The property to use for the x-axis */
  x: string;
  /** The property to use for the y-axis */
  y: string;
  /** The property to use for faceting */
  fy: string;
  /** The property to use for fill color. It can be a color code or another string. If a string, it should match domainY. If not specified, `y` will be used. */
  fill?: string;

  /** The gap for each facet. It is relative to the facet height. */
  padding?: number;
}

export function facetedHorizontalBar(params: FacetedHorizontalBarParams) {
  const facetNames = Array.from(new Set(params.data.map((d) => d[params.fy])));

  return {
    color: {
      domain: params.domainY,
    },
    fy: {
      // hide area/season axis label
      label: null,
      // gap between each facet
      padding: params.padding ?? 0.3,
      align: 1,
    },
    y: {
      // hide the axis - the legend will suffice
      axis: null,
      domain: params.domainY,
    },
    x: {
      grid: true,
      tickSpacing: 50,
      label: params.axis.label,
      tickFormat: params.axis.tickFormat,
      domain: params.axis.domainX,
    },
    marginLeft: 0,
    marginTop: 28,
    marginBottom: 40,
    marks: [
      Plot.barX(params.data, {
        x: params.x,
        y: params.y,
        fy: params.fy,
        fill: params.fill || params.y,
        title: (d) => d[params.fy],
        sort: { x: 'y' },
        strokeWidth: 20,
      }),

      // line at the start of the bars
      Plot.ruleX([0]),

      // bar labels
      Plot.text(params.data, {
        x: params.x,
        y: params.y,
        fy: params.fy,
        text: (d) => {
          const showPercent = d[params.x] > 0.05;
          return showPercent ? `${d3.format('.0%')(d[params.x])}` : '';
        },
        dx: -6,
        textAnchor: 'end',
        fill: 'white',
        stroke: 'black',
        strokeOpacity: 0.14,
      }),

      // place area/season labels at the top of each group of bars
      Plot.text(facetNames, {
        x: 0,
        fy: (d) => d,
        frameAnchor: 'top',
        textAnchor: 'start',
        text: (d) => d,
        dy: -20,
        dx: 0,
        fontWeight: 400,
        fontSize: 14,
      }),
    ],
  };
}
