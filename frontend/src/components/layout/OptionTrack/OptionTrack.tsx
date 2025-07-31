import styled from '@emotion/styled';
import React, { Children, isValidElement, useEffect, useRef } from 'react';
import { useRect } from '../../../hooks';
import { OptionButton } from './OptionButton';

interface OptionTrackProps {
  /**
   * The children of the OptionTrack component. These should be OptionButton components.
   */
  children: React.ReactNode;
}

export function OptionTrack(props: OptionTrackProps) {
  const eachChildNode = Children.toArray(props.children)
    .filter((child): child is React.ReactElement<any, typeof OptionButton> => {
      return isValidElement(child) && child.type === OptionButton;
    })
    .map((child) => {
      // get the rect for each child
      const ref = useRef<HTMLButtonElement>(null);
      const rect = useRect(ref);

      // Return the child, but include the react width and height as data attributes
      // so that the node will be rerendered whenever the size changes (including during css transitions).
      // This allows us to have an effect hook that draws lines between the buttons
      // and keeps the lines updated DURING the size transition.
      return (
        <child.type
          {...child.props}
          ref={ref}
          key={child.key}
          data-width={rect.width}
          data-height={rect.height}
        >
          {child.props.children}
        </child.type>
      );
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

      const roadLineId = `road-${i}-${i + 1}`;
      let roadLine = lineGroup.querySelector(`#${roadLineId}`);
      if (!roadLine) {
        roadLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      }
      roadLine.setAttribute('id', roadLineId);
      roadLine.setAttribute('d', path);
      roadLine.setAttribute('fill', 'none');
      roadLine.setAttribute('stroke', 'hsl(210, 3%, 38%)');
      roadLine.setAttribute('stroke-width', '30');

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

      const leftEdgeLineId = `left-edge-${i}-${i + 1}`;
      let leftEdgeLine = lineGroup.querySelector(`#${leftEdgeLineId}`);
      if (!leftEdgeLine) {
        leftEdgeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      }
      leftEdgeLine.setAttribute('id', leftEdgeLineId);
      leftEdgeLine.setAttribute('d', path);
      leftEdgeLine.setAttribute('fill', 'none');
      leftEdgeLine.setAttribute('stroke', 'white');
      leftEdgeLine.setAttribute('stroke-width', '1.2');
      leftEdgeLine.setAttribute('transform', `translate(-13.6, 0)`);

      const rightEdgeLineId = `right-edge-${i}-${i + 1}`;
      let rightEdgeLine = lineGroup.querySelector(`#${rightEdgeLineId}`);
      if (!rightEdgeLine) {
        rightEdgeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      }
      rightEdgeLine.setAttribute('id', rightEdgeLineId);
      rightEdgeLine.setAttribute('d', path);
      rightEdgeLine.setAttribute('fill', 'none');
      rightEdgeLine.setAttribute('stroke', 'white');
      rightEdgeLine.setAttribute('stroke-width', '1.2');
      rightEdgeLine.setAttribute('transform', `translate(13.6, 0)`);

      lineGroup.appendChild(roadLine);
      lineGroup.appendChild(centerLine);
      lineGroup.appendChild(leftEdgeLine);
      lineGroup.appendChild(rightEdgeLine);
    }
  });

  return (
    <OptionTrackComponent ref={trackRef}>
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

const OptionTrackComponent = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  gap: 0.5rem;

  .connector-edge {
    width: 100px;

    &:first-of-type {
      position: relative;
      top: -20px;
      align-self: flex-start;
    }

    &:last-of-type {
      position: relative;
      bottom: -20px;
      align-self: flex-end;
    }
  }
`;
