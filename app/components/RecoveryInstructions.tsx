import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../utils/instructionManager';
import { BackHandler } from 'react-native';

type RecoveryInstructionsProps = {
  sliderSectionRef: React.RefObject<View>;
  toolSectionRef: React.RefObject<View>;
  timeSectionRef: React.RefObject<View>;
  generateButtonRef: React.RefObject<View>;
  onComplete: () => void;
};

const RecoveryInstructions: React.FC<RecoveryInstructionsProps> = ({
  sliderSectionRef,
  toolSectionRef,
  timeSectionRef,
  generateButtonRef,
  onComplete
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [elementPositions, setElementPositions] = useState<Record<string, any>>({});

  // Measure element positions
  const measureElements = () => {
    // Helper function to measure a specific ref
    const measureElement = (ref: React.RefObject<View>, key: string) => {
      if (ref.current) {
        ref.current.measureInWindow((x, y, width, height) => {
          setElementPositions(prev => ({
            ...prev,
            [key]: { x, y, width, height }
          }));
        });
      }
    };

    // Measure all elements
    measureElement(sliderSectionRef, 'sliderSection');
    measureElement(toolSectionRef, 'toolSection');
    measureElement(timeSectionRef, 'timeSection');
    measureElement(generateButtonRef, 'generateButton');
  };

  useEffect(() => {
    // Check if we've shown these instructions before
    const checkInstructionState = async () => {
      const instructionsShown = await hasShownInstructions(INSTRUCTION_KEYS.RECOVERY);
      
      if (!instructionsShown) {
        // Wait a moment for the UI to render fully before measuring
        setTimeout(() => {
          measureElements();
          setShowInstructions(true);
        }, 500);
      }
    };
    
    checkInstructionState();

    // Prevent back button from closing the instructions
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showInstructions) {
        return true; // Prevent default behavior
      }
      return false; // Default behavior
    });

    return () => backHandler.remove();
  }, []);

  // Instruction steps
  const steps: InstructionStep[] = [
    {
      id: 'welcome',
      title: 'Recovery Tracker',
      description: "This screen helps you track and improve your recovery. Let's see how it works!",
      position: null, // Full screen intro, no specific element highlighted
    },
    {
      id: 'sliders',
      title: 'Recovery Metrics',
      description: 'Use these sliders to record how you feel today. This helps generate a personalized recovery plan.',
      position: elementPositions['sliderSection'] || null,
    },
    {
      id: 'tools',
      title: 'Recovery Tools',
      description: 'Select the recovery tools you have available. The plan will be customized based on these.',
      position: elementPositions['toolSection'] || null,
    },
    {
      id: 'time',
      title: 'Available Time',
      description: 'Specify how much time you have for recovery today so your plan fits your schedule.',
      position: elementPositions['timeSection'] || null,
    },
    {
      id: 'generate',
      title: 'Generate Plan',
      description: 'After submitting your data, tap here to get your personalized recovery plan for the day!',
      position: elementPositions['generateButton'] || null,
    }
  ];

  // Handle completion
  const handleInstructionsComplete = () => {
    setShowInstructions(false);
    onComplete();
  };

  return (
    <TabInstructions
      steps={steps}
      storageKey={INSTRUCTION_KEYS.RECOVERY}
      visible={showInstructions}
      onComplete={handleInstructionsComplete}
    />
  );
};

export default RecoveryInstructions; 