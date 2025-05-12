import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../utils/instructionManager';
import { BackHandler } from 'react-native';

type TrainingInstructionsProps = {
  focusAreaRef: React.RefObject<View>;
  gymAccessRef: React.RefObject<View>;
  scheduleRef: React.RefObject<View>;
  generateButtonRef: React.RefObject<View>;
  onComplete: () => void;
};

const TrainingInstructions: React.FC<TrainingInstructionsProps> = ({
  focusAreaRef,
  gymAccessRef,
  scheduleRef,
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
    measureElement(focusAreaRef, 'focusArea');
    measureElement(gymAccessRef, 'gymAccess');
    measureElement(scheduleRef, 'schedule');
    measureElement(generateButtonRef, 'generateButton');
  };

  useEffect(() => {
    // Check if we've shown these instructions before
    const checkInstructionState = async () => {
      const instructionsShown = await hasShownInstructions(INSTRUCTION_KEYS.TRAINING);
      
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
      title: 'Training Plans',
      description: "Here you can create personalized weekly training plans. Let's see how it works!",
      position: null, // Full screen intro, no specific element highlighted
    },
    {
      id: 'focusArea',
      title: 'Focus Area',
      description: "First, choose what you want to focus on this week - technique, strength, endurance, speed, or overall improvement.",
      position: elementPositions['focusArea'] || null,
    },
    {
      id: 'gymAccess',
      title: 'Gym Access',
      description: "Tell us if you have access to a gym so we can create the right plan for your environment.",
      position: elementPositions['gymAccess'] || null,
    },
    {
      id: 'schedule',
      title: 'Weekly Schedule',
      description: "Set your training and game schedule for each day of the week so we can plan around your commitments.",
      position: elementPositions['schedule'] || null,
    },
    {
      id: 'generate',
      title: 'Generate Plan',
      description: "After filling in all details, tap here to generate your personalized weekly training plan! (Available once per week)",
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
      storageKey={INSTRUCTION_KEYS.TRAINING}
      visible={showInstructions}
      onComplete={handleInstructionsComplete}
    />
  );
};

export default TrainingInstructions; 