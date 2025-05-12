import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../utils/instructionManager';
import { BackHandler } from 'react-native';

type NutritionInstructionsProps = {
  calorieCardRef: React.RefObject<View>;
  logMealButtonRef: React.RefObject<View>;
  macroBarsSectionRef: React.RefObject<View>;
  calendarSectionRef: React.RefObject<View>;
  onComplete: () => void;
};

const NutritionInstructions: React.FC<NutritionInstructionsProps> = ({
  calorieCardRef,
  logMealButtonRef,
  macroBarsSectionRef,
  calendarSectionRef,
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
    measureElement(calorieCardRef, 'calorieCard');
    measureElement(logMealButtonRef, 'logMealButton');
    measureElement(macroBarsSectionRef, 'macroBarsSection');
    measureElement(calendarSectionRef, 'calendarSection');
  };

  useEffect(() => {
    // Check if we've shown these instructions before
    const checkInstructionState = async () => {
      const instructionsShown = await hasShownInstructions(INSTRUCTION_KEYS.NUTRITION);
      
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
      title: 'Nutrition Tracker',
      description: "This screen helps you track your daily nutrition. Let's see what you can do here!",
      position: null, // Full screen intro, no specific element highlighted
    },
    {
      id: 'calorieCard',
      title: 'Daily Calories',
      description: "This shows your daily calorie goal and how much you've consumed so far.",
      position: elementPositions['calorieCard'] || null,
    },
    {
      id: 'logMeal',
      title: 'Log Meal',
      description: 'Tap here to log your meals. You can enter manually or use the camera for automatic analysis!',
      position: elementPositions['logMealButton'] || null,
    },
    {
      id: 'macroBars',
      title: 'Macro Tracking',
      description: 'These bars show your daily progress for proteins, carbs, and fats.',
      position: elementPositions['macroBarsSection'] || null,
    },
    {
      id: 'calendar',
      title: 'Nutrition History',
      description: 'View past days to see your nutrition history and track your progress over time.',
      position: elementPositions['calendarSection'] || null,
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
      storageKey={INSTRUCTION_KEYS.NUTRITION}
      visible={showInstructions}
      onComplete={handleInstructionsComplete}
    />
  );
};

export default NutritionInstructions; 