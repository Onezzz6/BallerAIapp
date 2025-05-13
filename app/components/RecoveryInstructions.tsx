import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Dimensions, ScrollView, findNodeHandle, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../utils/instructionManager';
import { BackHandler } from 'react-native';

export type RecoveryInstructionsRef = {
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

type RecoveryInstructionsProps = {
  recoveryQueryRef: React.RefObject<View>;
  recoveryToolsRef: React.RefObject<View>;
  recoveryTimeRef: React.RefObject<View>;
  scrollViewRef: React.RefObject<ScrollView>; // This is the ScrollView from the parent
  onComplete: () => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const RecoveryInstructions = forwardRef<RecoveryInstructionsRef, RecoveryInstructionsProps>((
  {
    recoveryQueryRef,
    recoveryToolsRef,
    recoveryTimeRef,
    scrollViewRef,
    onComplete
  },
  ref
) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [elementPositions, setElementPositions] = useState<Record<string, any>>({});
  const [measureRetries, setMeasureRetries] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dummyTrigger, setDummyTrigger] = useState(false);
  const scrollPositionRef = useRef(0); // Use a ref to store scroll position to avoid re-renders from onScroll

  // Expose handleScroll to be called by parent
  useImperativeHandle(ref, () => ({
    handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollPositionRef.current = event.nativeEvent.contentOffset.y;
    }
  }));

  const measureElement = (refValue: React.RefObject<View>, key: string) => {
    if (refValue.current) {
      refValue.current.measureInWindow((x, y, width, height) => {
        let finalY = y;
        if (y < 0 && key === 'recoveryTime') { // Only clamp for recoveryTime if it goes negative after scroll
          console.log(`Clamping negative y for ${key}. Original y: ${y}`);
          finalY = 0; 
        }
        console.log(`Measurement for ${key} (measureInWindow): x:${x}, finalY:${finalY}, w:${width}, h:${height}`);
        if (width > 0 && height > 0) {
          // Store the position and trigger update immediately
          setElementPositions(prev => ({ ...prev, [key]: { x, y: finalY, width, height } }));
          console.log(`Measurement SUCCESS for ${key}:`, { x, y: finalY, width, height });
          
          // Force immediate update to avoid flicker
          setDummyTrigger(prev => !prev);
        } else {
          console.log(`Measurement FAILED for ${key}:`, { x, y: finalY, width, height });
          
          // If measurement failed, retry once immediately (might be offscreen)
          setTimeout(() => {
            console.log(`Retrying measurement for ${key} after failure`);
            if (refValue.current) {
              refValue.current.measureInWindow((retryX, retryY, retryWidth, retryHeight) => {
                if (retryWidth > 0 && retryHeight > 0) {
                  setElementPositions(prev => ({ 
                    ...prev, 
                    [key]: { x: retryX, y: retryY, width: retryWidth, height: retryHeight } 
                  }));
                  setDummyTrigger(prev => !prev);
                }
              });
            }
          }, 50);
        }
      });
    } else {
      console.log(`Ref not current for ${key}`);
    }
  };

  const measureElements = () => {
    measureElement(recoveryQueryRef, 'recoveryQuery');
    measureElement(recoveryToolsRef, 'recoveryTools');
    measureElement(recoveryTimeRef, 'recoveryTime');
  };

  const getRecoveryQueryPosition = () => elementPositions['recoveryQuery'] || null;
  const getRecoveryToolsPosition = () => elementPositions['recoveryTools'] || null;
  const getRecoveryTimePosition = () => elementPositions['recoveryTime'] || null;

  const scrollToElement = (targetRefElement: React.RefObject<View>, isLastItem: boolean = false) => {
    if (scrollViewRef.current && targetRefElement.current) {
      targetRefElement.current.measureInWindow((x, currentElementWindowY, width, height) => { 
        const currentOffset = scrollPositionRef.current;
        console.log(`scrollToElement for ${isLastItem ? 'last item' : 'item'}. Element windowY: ${currentElementWindowY}, ScrollView offset: ${currentOffset}`);
        console.log(`CurrentScrollOffset: ${scrollPositionRef.current}`);
        
        // For better positioning: 
        // - Regular items at 150px from top
        // - Last item at 30% down screen for better visibility
        const desiredScreenOffset = isLastItem ? SCREEN_HEIGHT * 0.3 : 150;
        
        const scrollTarget = currentOffset + (currentElementWindowY - desiredScreenOffset);

        console.log(`Attempting to scroll. Target scroll content offset Y: ${Math.max(0, scrollTarget)}`);
        scrollViewRef.current?.scrollTo({ 
          y: Math.max(0, scrollTarget), 
          animated: true
        });
        
        // Update scrollPositionRef.current to reflect the new scroll position
        scrollPositionRef.current = Math.max(0, scrollTarget);
        console.log(`Updated CurrentScrollOffset: ${scrollPositionRef.current}`);
      });
    }
  };
  
  useEffect(() => {
    const checkInstructionState = async () => {
      const instructionsShown = await hasShownInstructions(INSTRUCTION_KEYS.RECOVERY);
      if (!instructionsShown) {
        setTimeout(() => {
          measureElements();
          setShowInstructions(true);
        }, 600); // Slightly faster initial display
      }
    };
    checkInstructionState();
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showInstructions) return true;
      return false;
    });
    return () => backHandler.remove();
  }, []);
  
  const MAX_RETRIES = 2;
  useEffect(() => {
    if (showInstructions && measureRetries < MAX_RETRIES) {
      const requiredKeys = ['recoveryQuery', 'recoveryTools', 'recoveryTime'];
      const anyMissing = requiredKeys.some(key => {
        const pos = elementPositions[key];
        return !pos || pos.width <= 0 || pos.height <= 0;
      });

      if (anyMissing) {
        const retryTimer = setTimeout(() => {
          console.log(`Retrying element measurement (${measureRetries + 1}/${MAX_RETRIES}) for missing elements.`);
          measureElements();
          setMeasureRetries(measureRetries + 1);
        }, 300 * (measureRetries + 1)); // Progressively slower retries
        return () => clearTimeout(retryTimer);
      }
    }
  }, [showInstructions, elementPositions, measureRetries]);

  useEffect(() => {
    if (showInstructions) {
      let targetRefToScroll: React.RefObject<View> | null = null;
      let targetKeyForMeasure: string | null = null;
      let isItTheLastItem = false;

      if (currentStepIndex === 1) { 
        targetRefToScroll = recoveryQueryRef;
        targetKeyForMeasure = 'recoveryQuery';
      } else if (currentStepIndex === 2) { 
        targetRefToScroll = recoveryToolsRef;
        targetKeyForMeasure = 'recoveryTools';
      } else if (currentStepIndex === 3) { 
        targetRefToScroll = recoveryTimeRef;
        targetKeyForMeasure = 'recoveryTime';
        isItTheLastItem = true; 
      } 

      if (targetRefToScroll && targetKeyForMeasure) {
        console.log(`Step change to ${targetKeyForMeasure}. Is last item: ${isItTheLastItem}. CurrentScrollOffset from ref: ${scrollPositionRef.current}`);
        scrollToElement(targetRefToScroll, isItTheLastItem);
        
        // Optimize measurement delays for a snappier feel
        const remeasureDelay = isItTheLastItem ? 700 : 350; 
        console.log(`Scheduling measureElement for ${targetKeyForMeasure} in ${remeasureDelay}ms after scroll attempt`);
        setTimeout(() => {
          console.log(`Executing measureElement for ${targetKeyForMeasure} (Step index: ${currentStepIndex}), CurrentScrollOffset: ${scrollPositionRef.current}`);
          measureElement(targetRefToScroll!, targetKeyForMeasure!);
        }, remeasureDelay); 
      }
    }
  }, [currentStepIndex, showInstructions]);

  const steps: InstructionStep[] = [
    {
      id: 'welcome',
      title: 'Recovery Center',
      description: "Let's explore the Recovery section where you can track and manage your physical recovery.",
      position: null,
    },
    {
      id: 'recoveryQuery',
      title: 'Recovery Query',
      description: 'Log your soreness, fatigue, sleep quality, and overall mood here. Ballzy uses this information to personalize everything in the app based on your current load.',
      position: getRecoveryQueryPosition(), 
      tooltipVerticalOffset: 150 
    },
    {
      id: 'recoveryTools',
      title: 'Recovery Tools',
      description: 'Select the recovery tools you have available. This helps create a recovery plan that uses equipment you actually have access to.',
      position: getRecoveryToolsPosition(),
    },
    { 
      id: 'recoveryTime',
      title: 'Available Time',
      description: 'Finally, tell us how much time you have available today so the recovery plan fits your schedule.',
      position: getRecoveryTimePosition(), 
    }
  ];

  const handleInstructionsComplete = () => {
    setShowInstructions(false);
    onComplete();
  };

  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index);
  };

  return (
    <>
      {showInstructions && (
        <TabInstructions
          steps={steps}
          storageKey={INSTRUCTION_KEYS.RECOVERY}
          visible={true} 
          onComplete={handleInstructionsComplete}
          onStepChange={handleStepChange}
          currentStepIndex={currentStepIndex}
        />
      )}
    </>
  );
});

export default RecoveryInstructions; 