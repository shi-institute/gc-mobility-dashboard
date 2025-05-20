import { useCallback, useLayoutEffect, useState } from 'react';

/**
 * Gets the bounding rect of an element and updates it on resize.
 * @param ref A ref to the element to get the rect of.
 * @returns A DOMRect object for the element.
 */
export function useRect(ref: React.RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState(getRect(ref?.current || undefined));

  const handleResize = useCallback(() => {
    if (!ref.current) {
      return;
    }

    setRect(getRect(ref.current));
  }, [ref]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    handleResize();

    // try to use resize observor if available
    if (typeof ResizeObserver === 'function') {
      const observor = new ResizeObserver(() => {
        handleResize();
      });
      observor.observe(element);

      return () => {
        if (!observor) {
          return;
        }

        observor.disconnect();
      };
    }

    // otherwise, fall back to listening to window resize
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ref.current]);

  return rect;
}

function getRect(element?: HTMLElement) {
  if (!element) {
    return {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } satisfies DOMRect;
  }

  return element.getBoundingClientRect();
}
