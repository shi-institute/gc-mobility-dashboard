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
  const scale = rect.width / 100;

  const size = props.size ?? 100;
  const visible = props.visible ?? true;

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
        {size > 180 ? (
          <>
            <circle cx="52" cy="46" r="46" fill="rgb(0, 191, 99)" id="lower" />
            <circle cx="52" cy="46" r="46" fill="rgba(0, 0, 0, 0)" id="lower-tint" />
            <circle cx="48" cy="54" r="46" fill="rgba(193, 255, 114, 0.57)" id="upper" />
            <circle cx="48" cy="54" r="46" fill="rgba(0, 0, 0, 0)" id="upper-tint" />
            <foreignObject id="overlap-area" x="6" y="8" width="88" height="84">
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
          </>
        ) : (
          <>
            <circle cx="56" cy="44" r="44" fill="rgb(0, 191, 99)" id="lower" />
            <circle cx="56" cy="44" r="44" fill="rgba(0, 0, 0, 0)" id="lower-tint" />
            <circle cx="44" cy="56" r="44" fill="rgba(193, 255, 114, 0.57)" id="upper" />
            <circle cx="44" cy="56" r="44" fill="rgba(0, 0, 0, 0)" id="upper-tint" />
            <foreignObject id="overlap-area" x="12" y="12" width="76" height="76">
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
          </>
        )}
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
