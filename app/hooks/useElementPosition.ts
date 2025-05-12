import { useCallback, useRef, useState } from 'react';
import { findNodeHandle, UIManager, ViewProps } from 'react-native';

type ElementPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

/**
 * Hook to get and measure UI elements' position on screen
 */
export const useElementPosition = () => {
  const [positions, setPositions] = useState<Record<string, ElementPosition>>({});
  
  // Create refs for each element we want to measure
  const elementsRef = useRef<Record<string, any>>({});
  
  // Get or create ref for element
  const getRef = useCallback((elementId: string) => {
    if (!elementsRef.current[elementId]) {
      elementsRef.current[elementId] = { current: null };
    }
    return elementsRef.current[elementId];
  }, []);
  
  // Measure all registered elements
  const measureAllElements = useCallback(() => {
    Object.keys(elementsRef.current).forEach((elementId) => {
      const elementRef = elementsRef.current[elementId];
      if (elementRef && elementRef.current) {
        const nodeHandle = findNodeHandle(elementRef.current);
        if (nodeHandle) {
          UIManager.measure(nodeHandle, (x, y, width, height, pageX, pageY) => {
            setPositions(prev => ({
              ...prev,
              [elementId]: { x: pageX, y: pageY, width, height }
            }));
          });
        }
      }
    });
  }, []);
  
  return {
    positions,
    getRef,
    measureAllElements,
  };
};

export default useElementPosition; 