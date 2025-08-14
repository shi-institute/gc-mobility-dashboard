import * as Plot from '@observablehq/plot';
import * as d3 from 'd3';

interface HorizontalBarParams {
  data: Record<string, unknown>[];

  domainX?: [number, number];
  domainY: string[];

  axis: {
    label: string;
    tickFormat: (n: number) => string;
  };

  /** The property to use for the x-axis */
  x: string;
  /** The property to use for the y-axis */
  y: string;
  /** The property to use for fill color. It can be a color code or another string. If a string, it should match domainY. If not specified, `y` will be used. */
  fill?: string;

  /** The height of the horizontal bars. Defaults to 18px. */
  barHeight?: number;
  /** The gap between the horizontal bars. Defaults to 2px. */
  barGap?: number;

  /** The border radius to use on the end of the horizontal bars. */
  borderRadius?: number;
}

/**
 * Creates a horizontal bar plot based on rectangles. This allows the bar height and gap to be customized.
 * @param params
 * @returns
 */
export function horizontalBar(params: HorizontalBarParams) {
  const barHeight = params.barHeight ?? 18;
  const barGap = params.barGap ?? 2;
  const borderRadius = params.borderRadius ?? 3;

  // find the largest x value in the data
  const dataMaxX = params.data
    .map((d) => parseFloat(d[params.x] as string))
    .reduce((a, b) => Math.max(a, b), 0);

  const domainX = params.domainX || [0, dataMaxX];

  const rectData = params.data
    // filter to only allow values in domainY
    .filter((d) => params.domainY.includes(d[params.y] as string))
    // sort based on the order of domainY
    .sort(
      (a, b) =>
        params.domainY.indexOf(b[params.y] as string) -
        params.domainY.indexOf(a[params.y] as string)
    )
    // assign rectangle coordinates based on the data
    .map((d, i) => {
      return {
        ...d,
        x1: 0,
        // clamp the x-value to not exceed the domain
        x2: Math.min(parseFloat(d[params.x] as string), domainX[1]),
        y1: i * (barHeight + barGap),
        y2: i * (barHeight + barGap) + barHeight,
        fill: (() => {
          let fillString = d[params.fill || params.y] as string;
          const domainIndex = params.domainY.indexOf(fillString);

          if (domainIndex >= 0) {
            return d3.schemeObservable10[domainIndex];
          }

          return fillString;
        })(),
      };
    });

  const marginTop = 0;
  const marginBottom = params.axis.label ? 40 : 0;
  const tickSize = 6;
  const maxY = rectData.map((d) => d.y2).reduce((a, b) => Math.max(a, b), 0);

  const addTickToStartY = domainX[0] === 0 ? tickSize : 0;
  const addTickToEndY = true;
  const numericalDomainY = [addTickToStartY ? -tickSize : 0, maxY + (addTickToEndY ? tickSize : 0)];

  return {
    color: {
      domain: params.domainY,
    },
    y: {
      // hide the axis - the legend will suffice
      axis: null,
      domain: numericalDomainY,
    },
    x: {
      grid: true,
      tickSpacing: 50,
      label: params.axis.label || '',
      tickFormat: params.axis.tickFormat,
      labelArrow: !!params.axis.label,
      tickSize,
    },
    marginLeft: 0,
    marginTop,
    marginBottom,
    height:
      rectData.length * barHeight +
      (rectData.length - 1) * barGap +
      marginTop +
      marginBottom +
      (addTickToStartY ? tickSize : 0) +
      (addTickToEndY ? tickSize : 0),
    marks: [
      Plot.rect(rectData, {
        fill: 'fill',
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        rx2: borderRadius,
      }),

      // line at the start of the bars
      Plot.ruleX([0]),

      // force x-axis to to go up to the max of domainX
      Plot.ruleX([0, domainX[1]], { stroke: 'transparent' }),

      // bar labels - inside
      Plot.text(rectData, {
        x: 'x2',
        y: (d) => (d.y1 + d.y2) / 2,
        text: (d) => {
          const showPercent = d[params.x] > 0.05;
          return showPercent ? `${d3.format('.0%')(d[params.x])}` : '';
        },
        dx: -6,
        textAnchor: 'end',
        fill: 'white',
        stroke: 'black',
        strokeOpacity: 0.14,
        fontSize: 11,
      }),

      // bar labels - outside
      Plot.text(rectData, {
        x: 'x2',
        y: (d) => (d.y1 + d.y2) / 2,
        text: (d) => {
          const showPercent = d[params.x] <= 0.05;
          if (!showPercent) {
            return '';
          }

          const legendName = d[params.y] as string;
          const showLessThan = d[params.x] < 0.01;
          if (showLessThan) {
            return '< 1%' + ` (${legendName})`;
          }

          return `${d3.format('.0%')(d[params.x])}`;
        },
        dx: 6,
        textAnchor: 'start',
        fill: 'black',
        stroke: 'white',
        strokeOpacity: 0.14,
        fontSize: 11,
      }),
    ],
  } satisfies Plot.PlotOptions;
}
