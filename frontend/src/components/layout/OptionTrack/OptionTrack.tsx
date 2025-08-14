import styled from '@emotion/styled';
import React, { Children, isValidElement, useCallback, useEffect, useRef } from 'react';
import { useRect } from '../../../hooks';
import { debounce, quadraticBezierToPolygon } from '../../../utils';
import { OptionButton } from './OptionButton';

interface OptionTrackProps {
  /**
   * The children of the OptionTrack component. These should be OptionButton components.
   */
  children: React.ReactNode;
  mode?: 'column' | 'row';
  style?: string;
}

interface ClonedChildProps {
  child: React.ReactElement<any, typeof OptionButton>;
  onResize: (width: number, height: number) => void;
}

function ClonedChild({ child, onResize }: ClonedChildProps) {
  // get the rect for the child
  const ref = useRef<HTMLButtonElement>(null);
  const rect = useRect(ref);

  useEffect(() => {
    onResize(rect.width, rect.height);
  }, [rect.width, rect.height, onResize]);

  return React.cloneElement(child, { ref, 'data-size': rect.width > 200 ? 'large' : 'small' });
}

export function OptionTrack(props: OptionTrackProps) {
  // increment the count state whenver a child node is resized
  // so that the component is rerendered (and therefore the svg lines are redrawn)
  const [, setCount] = React.useState(0);
  const rerenderOnResize = useCallback(
    debounce(() => {
      setCount((prev) => prev + 1);
    }, 6),
    [setCount]
  );

  // add resize listeners to each child node
  const eachChildNode = Children.toArray(props.children)
    .filter((child): child is React.ReactElement<any, typeof OptionButton> => {
      if (!isValidElement(child)) return false;

      // diirect match
      if (child.type === OptionButton) return true;

      // functional component that returns OptionButton
      if (typeof child.type === 'function') {
        const rendered = (child.type as any)(child.props);
        return isValidElement(rendered) && rendered.type === OptionButton;
      }

      return false;
    })
    .map((child, index) => {
      return <ClonedChild key={index} child={child} onResize={rerenderOnResize} />;
    });

  // get the dimensions for the track area
  const trackRef = useRef<HTMLDivElement>(null);
  const trackAreaRect = useRect(trackRef);

  // get a ref for the svg element so we can draw lines between the buttons
  const svgRef = useRef<SVGSVGElement>(null);

  // draw the lines (the road/track) between each child node (options buttons)
  useEffect(() => {
    if (!trackRef.current) {
      return;
    }

    if (!svgRef.current) {
      return;
    }

    // omit svg elements from child nodes - the svg elements are used for the lines, so we don't need to connect them to each other
    const childNodes = Array.from(trackRef.current.childNodes).filter((node) => {
      return node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName !== 'svg';
    });

    for (let i = 0; i < childNodes.length - 1; i++) {
      const startNode = childNodes[i] as HTMLElement;
      const endNode = childNodes[i + 1] as HTMLElement;

      // endNode is undefined on the last iteration because there is no next node
      if (!endNode) {
        continue;
      }

      const startRect = startNode.getBoundingClientRect();
      const endRect = endNode.getBoundingClientRect();

      // calculate the centers of the start and end nodes
      // relative to the track area
      const startX = startRect.left - trackAreaRect.left + startRect.width / 2;
      const startY = startRect.top - trackAreaRect.top + startRect.height / 2;
      const endX = endRect.left - trackAreaRect.left + endRect.width / 2;
      const endY = endRect.top - trackAreaRect.top + endRect.height / 2;
      const controlX = (startX + endX) / 2;
      const controlY = startRect.width > endRect.width ? startY : endY;

      // create a curve path that connects the two nodes
      const path = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

      // create a collection of svg path elements to connect the two nodes
      // that is styled like a road
      // or overwrite the existing one if it already exists
      const lineGroupId = `line-group-${i}-${i + 1}`;
      let lineGroup: SVGGElement | null = svgRef.current.querySelector(`#${lineGroupId}`);
      if (!lineGroup) {
        lineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        lineGroup.setAttribute('id', lineGroupId);
        svgRef.current.appendChild(lineGroup);
      }

      const centerLineId = `centerline-${i}-${i + 1}`;
      let centerLine = lineGroup.querySelector(`#${centerLineId}`);
      if (!centerLine) {
        centerLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      }
      centerLine.setAttribute('id', centerLineId);
      centerLine.setAttribute('d', path);
      centerLine.setAttribute('fill', 'none');
      centerLine.setAttribute('stroke', 'white');
      centerLine.setAttribute('stroke-width', '1.2');
      centerLine.setAttribute('stroke-dasharray', '10, 10');

      const polygonId = `polygon-${i}-${i + 1}`;
      let polygon = lineGroup.querySelector(`#${polygonId}`);
      if (!polygon) {
        polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      }
      const polygonPoints = quadraticBezierToPolygon(
        startX,
        startY,
        controlX,
        controlY,
        endX,
        endY,
        30
      );
      polygon.setAttribute('id', polygonId);
      polygon.setAttribute('points', polygonPoints);
      polygon.setAttribute('fill', 'hsl(210, 3%, 38%)');
      polygon.setAttribute('stroke', 'none');

      const surfacePolygonId = `surface-${i}-${i + 1}`;
      let surfacePolygon = lineGroup.querySelector(`#${surfacePolygonId}`);
      if (!surfacePolygon) {
        surfacePolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      }
      const smallerPolygonPoints = quadraticBezierToPolygon(
        startX,
        startY,
        controlX,
        controlY,
        endX,
        endY,
        26
      );
      surfacePolygon.setAttribute('id', surfacePolygonId);
      surfacePolygon.setAttribute('points', smallerPolygonPoints);
      surfacePolygon.setAttribute('fill', 'none');
      surfacePolygon.setAttribute('stroke', 'white');
      surfacePolygon.setAttribute('stroke-width', '1.2');

      lineGroup.appendChild(polygon);
      lineGroup.appendChild(surfacePolygon);
      lineGroup.appendChild(centerLine);
    }

    // if there are more line groups than child nodes, remove the extra ones
    const existingLineGroups = svgRef.current.querySelectorAll('g');
    if (existingLineGroups.length > childNodes.length - 1) {
      for (let i = childNodes.length - 1; i < existingLineGroups.length; i++) {
        const lineGroup = existingLineGroups[i];
        if (lineGroup) {
          svgRef.current.removeChild(lineGroup);
        }
      }
    }
  });

  return (
    <OptionTrackComponent
      ref={trackRef}
      mode={props.mode || 'row'}
      styleString={props.style}
      childrenCount={eachChildNode.length + 2}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${trackAreaRect.width} ${trackAreaRect.height}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <div className="connector-edge"></div>
      {eachChildNode.map((child) => child)}
      <div className="connector-edge"></div>
    </OptionTrackComponent>
  );
}

const OptionTrackComponent = styled.div<{
  mode: 'column' | 'row';
  styleString?: string;
  childrenCount: number;
}>`
  position: relative;
  display: grid;
  ${(props) => {
    if (props.mode === 'row') {
      return `
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        align-items: center;
      `;
    }
    return `
      grid-template-columns: repeat(${props.childrenCount - 2}, 0);
      grid-template-rows: 1fr;
      grid-auto-flow: column;
      align-items: flex-start;

      > * {
        overflow: hidden;
        transform: translateX(calc(var(--size) / 2 * -1));

      }
    `;
  }}
  justify-content: space-between;

  height: 100%;
  gap: 0.5rem;

  .connector-edge {
    ${(props) => (props.mode === 'row' ? 'width' : 'height')}: 100px;

    &:first-of-type {
      position: relative;
      ${(props) => (props.mode === 'row' ? 'top' : 'left')}: -20px;
      align-self: flex-start;
    }

    &:last-of-type {
      position: relative;
      ${(props) => (props.mode === 'row' ? 'bottom' : 'right')}: -20px;
      align-self: ${(props) => (props.mode === 'row' ? 'flex-end' : 'flex-start')};
    }
  }

  ${(props) => props.styleString || ''}
`;
