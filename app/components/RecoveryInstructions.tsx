import React, { useEffect, useState } from 'react';
import { View, Dimensions, ScrollView, findNodeHandle } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../utils/instructionManager';
import { BackHandler } from 'react-native';

type RecoveryInstructionsProps = {
  recoveryQueryRef: React.RefObject<View>;
  recoveryToolsRef: React.RefObject<View>;
  recoveryTimeRef: React.RefObject<View>;
  planHolderRef: React.RefObject<View>;
  scrollViewRef: React.RefObject<ScrollView>;
  onComplete: () => void;
};

// Get screen dimensions
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const RecoveryInstructions: React.FC<RecoveryInstructionsProps> = ({
  recoveryQueryRef,
  recoveryToolsRef,
  recoveryTimeRef,
  planHolderRef,
  scrollViewRef,
  onComplete
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [elementPositions, setElementPositions] = useState<Record<string, any>>({});
  const [measureRetries, setMeasureRetries] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const MAX_RETRIES = 3;
  const [dummyTrigger, setDummyTrigger] = useState(false);

  // Updated measureElement to ensure state update AND trigger dummy state
  const measureElement = (ref: React.RefObject<View>, key: string) => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setElementPositions(prev => ({
            ...prev,
            [key]: { x, y, width, height }
          }));
          console.log(`Measurement SUCCESS for ${key}:`, { x, y, width, height });
        } else {
          console.log(`Measurement FAILED for ${key}:`, { x, y, width, height });
        }
      });
    } else {
      console.log(`Ref not current for ${key}`);
    }
  };

  // Updated measureElements (added recoveryTimeRef)
  const measureElements = () => {
    measureElement(recoveryQueryRef, 'recoveryQuery');
    measureElement(recoveryToolsRef, 'recoveryTools');
    measureElement(recoveryTimeRef, 'recoveryTime');
  };

  // Updated getRecoveryQueryPosition (ensure it returns valid or null)
  const getRecoveryQueryPosition = () => elementPositions['recoveryQuery'] || null;
  
  // Updated getRecoveryToolsPosition (ensure it returns valid or null)
  const getRecoveryToolsPosition = () => elementPositions['recoveryTools'] || null;
  
  // Updated getRecoveryTimePosition (ensure it returns valid or null)
  const getRecoveryTimePosition = () => elementPositions['recoveryTime'] || null;
  
  // Updated scrollToElement (no changes needed, kept for reference)
  const scrollToElement = (ref: React.RefObject<View>) => {
    if (scrollViewRef.current && ref.current) {
      const node = findNodeHandle(ref.current);
      if (node) {
        ref.current.measureInWindow((x, y, width, height) => {
          if (y > SCREEN_HEIGHT - 200 || y + height > SCREEN_HEIGHT - 100) {
            scrollViewRef.current?.scrollTo({
              y: y - 200, 
              animated: true
            });
            setTimeout(() => {
              measureElements();
            }, 300);
          }
        });
      }
    }
  };
  
  // Updated areElementsValidlyMeasured (added recoveryTime)
  const areElementsValidlyMeasured = () => {
    const requiredElements = ['recoveryQuery', 'recoveryTools', 'recoveryTime'];
    return requiredElements.every(key => {
      const pos = elementPositions[key];
      return pos && pos.width > 0 && pos.height > 0 && 
             pos.x >= 0 && pos.x < SCREEN_WIDTH;
    });
  };
  
  // Updated useEffect for initial measurement
  useEffect(() => {
    const checkInstructionState = async () => {
      const instructionsShown = await hasShownInstructions(INSTRUCTION_KEYS.RECOVERY);
      if (!instructionsShown) {
        setTimeout(() => {
          measureElements();
          setShowInstructions(true);
        }, 700);
      }
    };
    checkInstructionState();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showInstructions) return true;
      return false;
    });
    return () => backHandler.remove();
  }, []);
  
  // Updated useEffect for measurement retries (added recoveryTime)
  useEffect(() => {
    if (showInstructions && measureRetries < MAX_RETRIES) {
      const requiredKeys = ['recoveryQuery', 'recoveryTools', 'recoveryTime'];
      const allMeasured = requiredKeys.every(key => {
        const pos = elementPositions[key];
        return pos && pos.width > 0 && pos.height > 0;
      });

      if (!allMeasured) {
        const retryTimer = setTimeout(() => {
          console.log(`Retrying element measurement (${measureRetries + 1}/${MAX_RETRIES})`);
          measureElements();
          setMeasureRetries(measureRetries + 1);
        }, 500 * (measureRetries + 1));
        return () => clearTimeout(retryTimer);
      }
    }
  }, [showInstructions, elementPositions, measureRetries]);

  // Updated useEffect for step changes (Targeted dummyTrigger)
  useEffect(() => {
    if (showInstructions) {
      let targetRef: React.RefObject<View> | null = null;
      let targetKey: string | null = null;
      let isRecoveryTimeStep = false;

      if (currentStepIndex === 1) { 
        targetRef = recoveryQueryRef;
        targetKey = 'recoveryQuery';
      } else if (currentStepIndex === 2) { 
        targetRef = recoveryToolsRef;
        targetKey = 'recoveryTools';
      } else if (currentStepIndex === 3) { 
        targetRef = recoveryTimeRef;
        targetKey = 'recoveryTime';
        isRecoveryTimeStep = true; 
      } 

      if (targetRef && targetKey) {
        scrollToElement(targetRef);
        
        const remeasureDelay = isRecoveryTimeStep ? 800 : 400; 
        console.log(`Scheduling measure check for ${targetKey} in ${remeasureDelay}ms`);
        setTimeout(() => {
          console.log(`Executing measure check for ${targetKey}`);
          measureElement(targetRef!, targetKey!);
          // Only trigger dummy state for the recoveryTime step after its measurement
          if (isRecoveryTimeStep) {
            console.log("Forcing re-render via dummyTrigger for recoveryTime step");
            setDummyTrigger(prev => !prev);
          }
        }, remeasureDelay); 
      }
    }
  }, [currentStepIndex, showInstructions]);

  // Updated instruction steps (revert position assignment)
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
      position: getRecoveryTimePosition(), // Reverted to simple null check
    }
  ];

  // Kept handleInstructionsComplete
  const handleInstructionsComplete = () => {
    setShowInstructions(false);
    onComplete();
  };

  // Kept handleStepChange
  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index);
  };

  return (
    <TabInstructions
      steps={steps}
      storageKey={INSTRUCTION_KEYS.RECOVERY}
      visible={showInstructions}
      onComplete={handleInstructionsComplete}
      onStepChange={handleStepChange}
      currentStepIndex={currentStepIndex}
    />
  );
};

export default RecoveryInstructions; 