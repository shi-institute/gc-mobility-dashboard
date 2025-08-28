import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

interface ProgressRingProps {
  size?: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ size = 32 }) => {
  return (
    <StyledSvg
      className="progress-ring indeterminate"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="status"
    >
      <circle cx="50%" cy="50%" r="7" strokeDasharray="3" strokeDashoffset="NaN" />
    </StyledSvg>
  );
};

const progressRingAnimation = keyframes`
  0% {
    stroke-dasharray: 0.01px 43.97px;
    transform: rotate(0);
  }

  50% {
    stroke-dasharray: 21.99px 21.99px;
    transform: rotate(450deg);
  }

  100% {
    stroke-dasharray: 0.01px 43.97px;
    transform: rotate(3turn);
  }
`;

const StyledSvg = styled.svg`
  circle {
    fill: none;
    stroke: var(--color-primary);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-dasharray: 43.97;
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
    transition: all var(--wui-control-normal-duration) linear;
    animation: ${progressRingAnimation} 2s linear infinite;
  }
`;
