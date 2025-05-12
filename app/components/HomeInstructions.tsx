import React, { useEffect, useState } from 'react';
import { View, Dimensions, ScrollView, findNodeHandle } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../utils/instructionManager';
import { BackHandler } from 'react-native';

type HomeInstructionsProps = {
  calorieCardRef: React.RefObject<View>;
  readinessCardRef: React.RefObject<View>;
  weeklyProgressRef: React.RefObject<View>;
  nutritionCardRef: React.RefObject<View>;
  recoveryCardRef: React.RefObject<View>;
  askBallzyRef: React.RefObject<View>;
  scrollViewRef: React.RefObject<ScrollView>;
  onComplete: () => void;
};

// Get screen dimensions
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const HomeInstructions: React.FC<HomeInstructionsProps> = ({
  calorieCardRef,
  readinessCardRef,
  weeklyProgressRef,
  nutritionCardRef,
  recoveryCardRef,
  askBallzyRef,
  scrollViewRef,
  onComplete
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [elementPositions, setElementPositions] = useState<Record<string, any>>({});
  const [measureRetries, setMeasureRetries] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const MAX_RETRIES = 3;

  // Measure element positions with improved accuracy
  const measureElements = () => {
    // Helper function to measure a specific ref
    const measureElement = (ref: React.RefObject<View>, key: string) => {
      if (ref.current) {
        ref.current.measureInWindow((x, y, width, height) => {
          // Only update if we got valid measurements
          if (width > 0 && height > 0) {
            setElementPositions(prev => ({
              ...prev,
              [key]: { x, y, width, height }
            }));
          }
        });
      }
    };

    // Measure all elements
    measureElement(calorieCardRef, 'calorieCard');
    measureElement(readinessCardRef, 'readinessCard');
    measureElement(weeklyProgressRef, 'weeklyProgress');
    measureElement(nutritionCardRef, 'nutritionCard');
    measureElement(recoveryCardRef, 'recoveryCard');
    measureElement(askBallzyRef, 'askBallzy');
  };

  // Scroll to make sure an element is visible
  const scrollToElement = (ref: React.RefObject<View>) => {
    if (scrollViewRef.current && ref.current) {
      const node = findNodeHandle(ref.current);
      if (node) {
        ref.current.measureInWindow((x, y, width, height) => {
          // If element is below the screen or only partially visible
          if (y > SCREEN_HEIGHT - 200 || y + height > SCREEN_HEIGHT - 100) {
            // Calculate a good scroll position to show the element
            scrollViewRef.current?.scrollTo({
              y: y - 200, // Position element with some space at the top
              animated: true
            });
            
            // Re-measure after scrolling
            setTimeout(() => {
              measureElements();
            }, 300);
          }
        });
      }
    }
  };

  // Check if any positions are missing or invalid
  const areElementsValidlyMeasured = () => {
    // Make sure all elements have valid measurements
    const requiredElements = [
      'calorieCard', 
      'readinessCard', 
      'weeklyProgress', 
      'nutritionCard', 
      'recoveryCard', 
      'askBallzy'
    ];
    
    return requiredElements.every(key => {
      const pos = elementPositions[key];
      return pos && pos.width > 0 && pos.height > 0 && 
             pos.x >= 0 && pos.x < SCREEN_WIDTH;
    });
  };

  useEffect(() => {
    // Check if we've shown these instructions before
    const checkInstructionState = async () => {
      const instructionsShown = await hasShownInstructions(INSTRUCTION_KEYS.HOME);
      
      if (!instructionsShown) {
        // Wait a moment for the UI to render fully before measuring
        setTimeout(() => {
          measureElements();
          setShowInstructions(true);
        }, 700); // Increased timeout for more reliable rendering
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
  
  // Retry measuring elements if needed
  useEffect(() => {
    if (showInstructions && !areElementsValidlyMeasured() && measureRetries < MAX_RETRIES) {
      const retryTimer = setTimeout(() => {
        console.log(`Retrying element measurement (${measureRetries + 1}/${MAX_RETRIES})`);
        measureElements();
        setMeasureRetries(measureRetries + 1);
      }, 300);
      
      return () => clearTimeout(retryTimer);
    }
  }, [showInstructions, elementPositions, measureRetries]);

  // Handle step changes - scroll to element when needed
  useEffect(() => {
    if (showInstructions) {
      // Scroll to the appropriate element based on the step
      if (currentStepIndex === 2) { // Weekly Progress section
        scrollToElement(weeklyProgressRef);
      } else if (currentStepIndex === 3) { // Nutrition Card
        scrollToElement(nutritionCardRef);
      } else if (currentStepIndex === 4) { // Recovery Card
        scrollToElement(recoveryCardRef);
      } else if (currentStepIndex === 5) { // Ask Ballzy
        scrollToElement(askBallzyRef);
      }
    }
  }, [currentStepIndex, showInstructions]);

  // Use fallback position for Ask Ballzy if it's not measurable
  const getAskBallzyPosition = () => {
    const position = elementPositions['askBallzy'];
    if (position && position.y < SCREEN_HEIGHT - 150 && position.y > 100) {
      return position;
    }
    
    // Fallback position in case askBallzy is too low or unmeasurable
    return {
      x: SCREEN_WIDTH / 2 - 150,
      y: SCREEN_HEIGHT - 350,
      width: 300,
      height: 100
    };
  };

  // Instruction steps
  const steps: InstructionStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to BallerAI!',
      description: "Let's take a quick tour of the Home screen. This is where you'll see all your key metrics and progress.",
      position: null, // Full screen intro, no specific element highlighted
    },
    {
      id: 'calories',
      title: 'Daily Calories',
      description: 'Track your daily calorie intake and progress. Tap on it to see more details.',
      position: elementPositions['calorieCard'] || null,
    },
    {
      id: 'readiness',
      title: 'Readiness Score',
      description: 'This shows how ready your body is for training today based on your recovery data.',
      position: elementPositions['readinessCard'] || null,
    },
    {
      id: 'weeklyProgress',
      title: 'Weekly Progress',
      description: 'This section shows your weekly adherence scores for nutrition and recovery.',
      position: elementPositions['weeklyProgress'] || null,
    },
    {
      id: 'nutrition',
      title: 'Nutrition Score',
      description: "This shows how closely you've followed your macro goals in the last week.",
      position: elementPositions['nutritionCard'] || null,
    },
    {
      id: 'recovery',
      title: 'Recovery Score',
      description: "See how well you've been maintaining your recovery habits over the past week.",
      position: elementPositions['recoveryCard'] || null,
    },
    {
      id: 'askBallzy',
      title: 'Ask Ballzy',
      description: 'Have questions about football, nutrition, or training? Ask Ballzy, your AI assistant!',
      position: getAskBallzyPosition(),
    }
  ];

  // Handle completion
  const handleInstructionsComplete = () => {
    setShowInstructions(false);
    onComplete();
  };

  // Handle step change
  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index);
  };

  return (
    <TabInstructions
      steps={steps}
      storageKey={INSTRUCTION_KEYS.HOME}
      visible={showInstructions}
      onComplete={handleInstructionsComplete}
      onStepChange={handleStepChange}
      currentStepIndex={currentStepIndex}
    />
  );
};

export default HomeInstructions; 