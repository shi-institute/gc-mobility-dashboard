import styled from '@emotion/styled';
import { useRef } from 'react';
import { useRect } from '../../../hooks';

interface OptionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: number;
  as?: React.ElementType<any, keyof React.JSX.IntrinsicElements>;
  transitioning?: boolean;
  ref?: React.Ref<HTMLElement>;
  placeholderMode?: boolean;
  visible?: boolean;
}

export function OptionButton(props: OptionButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const rect = useRect(ref);
  const scale = Math.max(0.0000001, rect.width / 100);

  const size = props.size ?? 100;
  const visible = props.visible ?? true;

  const notRandomId = Math.random().toString(36).substring(2, 15);

  if (props.placeholderMode) {
    return (
      <OptionButtonComponent size={size} visible={visible}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* lower */}
          <rect x="35" y="35" width="30" height="30" fill="hsl(210, 3%, 38%)" rx="15" />
          {/* middle with edge line */}
          <rect
            x="34"
            y="36"
            width="30"
            height="30"
            fill="hsl(210, 3%, 38%)"
            rx="15"
            stroke="#fff"
          />
        </svg>
      </OptionButtonComponent>
    );
  }

  const lowerCircleSpecs = size > 180 ? { cx: 52, cy: 46, r: 46 } : { cx: 56, cy: 44, r: 44 };
  const upperCircleSpecs = size > 180 ? { cx: 48, cy: 54, r: 46 } : { cx: 44, cy: 56, r: 44 };
  const intersectionBbox =
    size > 180 ? { x: 6, y: 8, width: 88, height: 84 } : { x: 12, y: 12, width: 76, height: 76 };
  const intersectionPath = circleIntersectionPath(
    lowerCircleSpecs.cx,
    lowerCircleSpecs.cy,
    lowerCircleSpecs.r,
    upperCircleSpecs.cx,
    upperCircleSpecs.cy,
    upperCircleSpecs.r
  );

  return (
    <OptionButtonComponent
      {...props}
      className={`option-button ${props.className}`}
      size={size}
      ref={(element) => {
        // apply the parents's ref
        if (typeof props.ref === 'function') {
          props.ref(element);
        } else if (props.ref) {
          props.ref.current = element;
        }

        // also use the ref we just created
        ref.current = element;
      }}
      style={{ ...props.style, '--size': size + 'px' } as React.CSSProperties}
      visible={visible}
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Precomputed clip path for the intersection of the circles
                  to be used for the HTML content area boundary */}
          <clipPath id={`overlap-clip-${notRandomId}`} clipPathUnits="userSpaceOnUse">
            <path d={intersectionPath} />
          </clipPath>
        </defs>

        {/* Circles */}
        <circle
          cx={lowerCircleSpecs.cx}
          cy={lowerCircleSpecs.cy}
          r={lowerCircleSpecs.r}
          fill="rgb(0, 191, 99)"
          id="lower"
        />
        <circle
          cx={lowerCircleSpecs.cx}
          cy={lowerCircleSpecs.cy}
          r={lowerCircleSpecs.r}
          fill="rgba(0, 0, 0, 0)"
          id="lower-tint"
        />
        <circle
          cx={upperCircleSpecs.cx}
          cy={upperCircleSpecs.cy}
          r={upperCircleSpecs.r}
          fill="rgba(193, 255, 114, 0.57)"
          id="upper"
        />
        <circle
          cx={upperCircleSpecs.cx}
          cy={upperCircleSpecs.cy}
          r={upperCircleSpecs.r}
          fill="rgba(0, 0, 0, 0)"
          id="upper-tint"
        />

        <foreignObject
          id="overlap-area"
          x={intersectionBbox.x}
          y={intersectionBbox.y}
          width={intersectionBbox.width}
          height={intersectionBbox.height}
          // clip-path={`url(#overlap-clip-${notRandomId})`}
        >
          <div
            style={{
              fontSize: 16 / scale,
              position: 'absolute',
              inset: 0,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {props.children}
          </div>
        </foreignObject>
      </svg>
    </OptionButtonComponent>
  );
}

const OptionButtonComponent = styled.button<{
  size: number;
  transitioning?: boolean;
  visible: boolean;
}>`
  appearance: none;
  background: none;
  border: none;
  font-size: 1rem;
  font-family: inherit;

  position: relative;
  transition: 300ms cubic-bezier(0.16, 1, 0.3, 1);
  block-size: ${(props) => props.size}px;
  inline-size: ${(props) => props.size}px;

  flex-grow: 0;
  flex-shrink: 0;

  > * {
    position: absolute;
    inset: 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  svg circle {
    transition: 120ms;
  }

  // tint the svg on hover and press, but only when the button is not transitioning/resizing
  ${(props) =>
    (props.as !== 'button' && props.as) || props.transitioning
      ? ''
      : `
    &:hover {
      svg circle#lower-tint,
      svg circle#upper-tint {
        fill: rgba(0, 0, 0, 0.03);
      }
    }

    &:active {
      svg circle#lower-tint,
      svg circle#upper-tint {
        fill: rgba(0, 0, 0, 0.06);
      }
    }
  `}

  // set the opacity to 0 when the button is not visible
  ${(props) =>
    props.visible
      ? ''
      : `
    opacity: 0;
    pointer-events: none;
  `}
`;

/**
 * Generate SVG path for the intersection of two circles
 * @param x1 - center x of first circle
 * @param y1 - center y of first circle
 * @param r1 - radius of first circle
 * @param x2 - center x of second circle
 * @param y2 - center y of second circle
 * @param r2 - radius of second circle
 * @returns SVG path data string
 */
function circleIntersectionPath(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy);

  // No intersection
  if (d >= r1 + r2 || d <= Math.abs(r1 - r2)) {
    return '';
  }

  // Distance from c1 to chord midpoint
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  // Half chord length
  const h = Math.sqrt(r1 * r1 - a * a);

  // Midpoint between intersection points
  const xm = x1 + (a * dx) / d;
  const ym = y1 + (a * dy) / d;

  // Offset vector perpendicular to line between centers
  const rx = -dy * (h / d);
  const ry = dx * (h / d);

  // Intersection points
  const xi1 = xm + rx;
  const yi1 = ym + ry;
  const xi2 = xm - rx;
  const yi2 = ym - ry;

  // Path: arc from p1 to p2 along circle1, then arc back along circle2
  return [
    `M ${xi1} ${yi1}`,
    `A ${r1} ${r1} 0 0 1 ${xi2} ${yi2}`,
    `A ${r2} ${r2} 0 0 1 ${xi1} ${yi1}`,
    'Z',
  ].join(' ');
}
