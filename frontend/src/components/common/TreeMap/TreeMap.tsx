/**
 * Interactive TreeMap component using D3.js - displays hierarchical data as sized rectangles
 * Input: TreeMapEntry with { name, value } leaves or { name, children[] } nodes
 * Output: Responsive SVG treemap with hover tooltips and auto-scaling text
 */

import * as d3 from 'd3';
import React, { useMemo, useRef, useState } from 'react';
import { useRect } from '../../../hooks';
export { Section };

interface TreeMapProps {
  data: TreeMapEntry;
  style?: React.CSSProperties;
}

type TreeMapEntry = { name: string; value: number } | { name: string; children: TreeMapEntry[] };
type TreeMapHierarchyNode = d3.HierarchyNode<TreeMapEntry>;

const Section = ({ children }: { children: React.ReactNode }) => (
  <div className="flex-1 bg-white" style={{ minHeight: '600px', height: '80vh', width: '100%' }}>
    {children}
  </div>
);

export function TreeMap(props: TreeMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<TreeMapHierarchyNode | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const rect = useRect(containerRef);

  const format = d3.format(',d');

  // TreeMap data processing and layout calculation
  const { root, color } = useMemo(() => {
    // Basic data validation - only check if data exists
    if (!props.data) return { root: null, color: null };

    try {
      const colorScale = d3
        .scaleOrdinal<string, string>()
        .domain(
          'children' in props.data && props.data.children
            ? props.data.children.map((d) => d.name)
            : []
        )
        .range(d3.schemeObservable10);

      const hierarchy = d3
        .hierarchy<TreeMapEntry>(props.data)
        .sum((d) => ('value' in d ? d.value : 0))
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      const treemapLayout = d3
        .treemap<TreeMapEntry>()
        .tile(d3.treemapSquarify)
        .size([rect.width, rect.height])
        .paddingOuter(2)
        .paddingInner(1)
        .round(true);

      return { root: treemapLayout(hierarchy), color: colorScale };
    } catch (error) {
      // Only catch actual errors, don't break the flow
      console.warn('TreeMap layout error:', error);
      return { root: null, color: null };
    }
  }, [props.data, rect.width, rect.height]);

  // Text line breaking algorithm for TreeMap labels
  const breakTextIntoLines = (text: string, maxWidth: number, fontSize: number) => {
    // Minimal safety check
    if (!text || maxWidth <= 0 || fontSize <= 0) return [''];

    const avgCharWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor((maxWidth - 16) / avgCharWidth); // More padding

    if (maxCharsPerLine < 3) return ['…'];

    // Add spaces before capital letters and split on spaces
    const spacedText = text.replace(/([a-z])([A-Z])/g, '$1 $2');
    const words = spacedText.split(/\s+/g).filter((w) => w.length > 0);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        else if (word.length > maxCharsPerLine) {
          lines.push(word.substring(0, Math.max(1, maxCharsPerLine - 1)) + '…');
          continue;
        } else {
          lines.push(word);
          continue;
        }
        currentLine =
          word.length > maxCharsPerLine
            ? word.substring(0, Math.max(1, maxCharsPerLine - 1)) + '…'
            : word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.length > 0 ? lines : [text.substring(0, Math.max(1, maxCharsPerLine - 1)) + '…'];
  };

  // Calculate font sizes based on node dimensions
  const calculateFontSizes = (minDimension: number) => {
    if (minDimension < 60)
      return {
        base: Math.max(8, Math.min(10, minDimension / 10)),
        value: Math.max(7, Math.min(9, minDimension / 10)),
      };
    if (minDimension < 100)
      return {
        base: Math.max(9, Math.min(12, minDimension / 9)),
        value: Math.max(8, Math.min(11, minDimension / 9)),
      };
    return {
      base: Math.max(10, Math.min(16, minDimension / 8)),
      value: Math.max(8, Math.min(14, minDimension / 8)),
    };
  };

  const handleMouseMove = (event: React.MouseEvent) =>
    setMousePosition({ x: event.clientX, y: event.clientY });

  const handleMouseLeave = () => {
    setHoveredNode(null);
    setMousePosition(null);
  };

  if (!props.data || !root) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-gray-50">
        <p style={{ color: '#666' }}>No data available</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...props.style }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'absolute', overflow: 'auto' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          ref={svgRef}
          width={rect.width}
          height={rect.height}
          className="border border-gray-300"
          style={{ font: '10px sans-serif', display: 'block', backgroundColor: '#f8f9fa' }}
        >
          {root.leaves().map((leaf, index) => {
            const nodeWidth = leaf.x1 - leaf.x0;
            const nodeHeight = leaf.y1 - leaf.y0;
            const minDimension = Math.min(nodeWidth, nodeHeight);

            // Get color from parent node for consistent coloring
            let colorNode: TreeMapHierarchyNode = leaf;
            while (colorNode.depth > 1 && colorNode.parent) colorNode = colorNode.parent;
            const fillColor = color ? color(colorNode.data.name) : '#8884d8';

            const { base: baseFontSize, value: valueFontSize } = calculateFontSizes(minDimension);
            const nameLines = breakTextIntoLines(
              leaf.data.name || '',
              nodeWidth - 16,
              baseFontSize
            );
            const valueText = format(leaf.value || 0);
            const allTextLines = [...nameLines, valueText];
            const showText = nodeWidth > 30 && nodeHeight > 20;

            return (
              <g key={`leaf-${index}`} transform={`translate(${leaf.x0},${leaf.y0})`}>
                <rect
                  width={nodeWidth}
                  height={nodeHeight}
                  fill={fillColor}
                  fillOpacity={0.7}
                  stroke="white"
                  strokeWidth={1}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s' }}
                  onMouseEnter={() => setHoveredNode(leaf)}
                  onMouseLeave={() => setHoveredNode(null)}
                />
                {showText && (
                  <>
                    <text style={{ pointerEvents: 'none' }}>
                      {allTextLines.map((line, lineIndex) => {
                        const isLastLine = lineIndex === allTextLines.length - 1;
                        const currentFontSize = isLastLine ? valueFontSize : baseFontSize;
                        const lineHeight = currentFontSize * 1.2;
                        const yPositionPx = lineHeight + lineIndex * lineHeight * 0.9;

                        // Better vertical bounds checking
                        if (yPositionPx > nodeHeight - currentFontSize) return null;

                        // Ensure text fits horizontally by double-checking width
                        const estimatedWidth = line.length * currentFontSize * 0.6;
                        const displayText =
                          estimatedWidth > nodeWidth - 16
                            ? line.substring(
                                0,
                                Math.floor((nodeWidth - 16) / (currentFontSize * 0.6)) - 1
                              ) + '…'
                            : line;

                        return (
                          <tspan
                            key={lineIndex}
                            x={8}
                            y={`${1.2 + lineIndex * 1.1}em`}
                            fillOpacity={isLastLine ? 0.8 : 1}
                            fontSize={`${currentFontSize}px`}
                            fontWeight={isLastLine ? 'normal' : 'bold'}
                            fill="#333"
                          >
                            {displayText}
                          </tspan>
                        );
                      })}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredNode && mousePosition && (
          <div
            style={{
              position: 'fixed',
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
              backgroundColor: '#222E5D',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              pointerEvents: 'none',
              zIndex: 1000,
              maxWidth: '250px',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {hoveredNode
                .ancestors()
                .reverse()
                .map((d: TreeMapHierarchyNode) => d.data.name || 'Unknown')
                .join(' → ')}
            </div>
            <div>Value: {format(hoveredNode.value || 0)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
