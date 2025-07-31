import React, { useEffect, useState } from 'react';
import { View, Dimensions, ScrollView, findNodeHandle } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../../utils/instructionManager';
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
  const MAX_RETRIES = 2;

  // Helper function to measure a specific ref
  const measureElement = (ref: React.RefObject<View>, key: string) => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        // Only update if we got valid measurements
        if (width > 0 && height > 0) {
          console.log(`Measurement SUCCESS for ${key}:`, { x, y, width, height });
          
          // For card elements, slightly reduce the width to prevent adjacent card highlighting
          let adjustedWidth = width;
          let adjustedX = x;
          
          if (key === 'calorieCard' || key === 'readinessCard' || 
              key === 'nutritionCard' || key === 'recoveryCard') {
            // Reduce width by a small amount from both sides to prevent overlap
            const reduction = 10; // Pixels to reduce from each side
            adjustedWidth = width - (reduction * 2);
            adjustedX = x + reduction;
          }
          
          // CRITICAL: Create a new object with ONLY this element's position
          // This ensures we're not highlighting multiple elements
          setElementPositions({ [key]: { 
            x: adjustedX, 
            y, 
            width: adjustedWidth, 
            height 
          }});
        } else {
          console.log(`Measurement FAILED for ${key}`);
        }
      });
    }
  };

  // Measure all elements
  const measureElements = () => {
    // Measure all elements
    measureElement(calorieCardRef, 'calorieCard');
    measureElement(readinessCardRef, 'readinessCard');
    measureElement(weeklyProgressRef, 'weeklyProgress');
    measureElement(nutritionCardRef, 'nutritionCard');
    measureElement(recoveryCardRef, 'recoveryCard');
    measureElement(askBallzyRef, 'askBallzy');
  };

  // Scroll to make sure an element is visible and focus on it exclusively
  const scrollToElement = (ref: React.RefObject<View>, key: string) => {
    if (scrollViewRef.current && ref.current) {
      const node = findNodeHandle(ref.current);
      if (node) {
        // First phase: Clear all positions to ensure nothing is highlighted during scroll
        setElementPositions({});
        
        ref.current.measureInWindow((x, y, width, height) => {
          if (y + height > SCREEN_HEIGHT - 100) {
            // Calculate a good scroll position to show the element
            console.log('scrollToElement: y: ', y);

            scrollViewRef.current?.scrollTo({
              y: y - 200, // Position element with some space at the top
              animated: true
            });
            
            // Second phase: Re-measure after scrolling with a longer delay
            setTimeout(() => {
              console.log(`Re-measuring ${key} after scrolling`);
              
              // Clear positions again to make sure no other elements are highlighted
              setElementPositions({});
              
              // Final measure with a delay for scroll animation to complete
              setTimeout(() => {
                // Only measure the specific element we want to highlight
                if (ref.current) {
                  ref.current.measureInWindow((newX, newY, newWidth, newHeight) => {
                    if (newWidth > 0 && newHeight > 0) {
                      // Apply same width adjustment for cards to prevent overlap
                      let adjustedWidth = newWidth;
                      let adjustedX = newX;
                      
                      if (key === 'calorieCard' || key === 'readinessCard' || 
                          key === 'nutritionCard' || key === 'recoveryCard') {
                        // Reduce width from each side to prevent overlap
                        const reduction = 10;
                        adjustedWidth = newWidth - (reduction * 2);
                        adjustedX = newX + reduction;
                      }
                      
                      // Set ONLY this position, nothing else
                      setElementPositions({ [key]: { 
                        x: adjustedX, 
                        y: newY, 
                        width: adjustedWidth, 
                        height: newHeight 
                      }});
                    }
                  });
                }
              }, 100);
            }, 350);
          } else {
            // Element already visible - just re-measure it precisely
            setElementPositions({});
            setTimeout(() => {
              // Only measure the specific element we want to highlight
              if (ref.current) {
                ref.current.measureInWindow((newX, newY, newWidth, newHeight) => {
                  if (newWidth > 0 && newHeight > 0) {
                    // Apply same width adjustment for cards to prevent overlap
                    let adjustedWidth = newWidth;
                    let adjustedX = newX;
                    
                    if (key === 'calorieCard' || key === 'readinessCard' || 
                        key === 'nutritionCard' || key === 'recoveryCard') {
                      // Reduce width from each side to prevent overlap
                      const reduction = 10;
                      adjustedWidth = newWidth - (reduction * 2);
                      adjustedX = newX + reduction;
                    }
                    
                    // Set ONLY this position, nothing else
                    setElementPositions({ [key]: { 
                      x: adjustedX, 
                      y: newY, 
                      width: adjustedWidth, 
                      height: newHeight 
                    }});
                  }
                });
              }
            }, 100);
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
      // For elements that don't require scrolling, still focus on them exclusively
      if (currentStepIndex === 0) {
        // Welcome screen - no specific element
        setElementPositions({});
      } else if (currentStepIndex === 1) {
        // Calories card - first clear, then measure exclusively
        setElementPositions({});
        setTimeout(() => {
          measureElement(calorieCardRef, 'calorieCard');
        }, 100);
      } else if (currentStepIndex === 2) {
        // Readiness card - first clear, then measure exclusively
        setElementPositions({});
        setTimeout(() => {
          measureElement(readinessCardRef, 'readinessCard');
        }, 100);
      } else if (currentStepIndex === 3) { // Weekly Progress section
        scrollToElement(weeklyProgressRef, 'weeklyProgress');
      } else if (currentStepIndex === 4) { // Nutrition Card
        scrollToElement(nutritionCardRef, 'nutritionCard');
      } else if (currentStepIndex === 5) { // Recovery Card
        scrollToElement(recoveryCardRef, 'recoveryCard');
      } else if (currentStepIndex === 6) { // Ask Ballzy
        scrollToElement(askBallzyRef, 'askBallzy');
      }
    }
  }, [currentStepIndex, showInstructions]);

  // Use fallback position for Ask Ballzy if it's not measurable
  const getAskBallzyPosition = () => {
    const position = elementPositions['askBallzy'];
    if (position && position.y < SCREEN_HEIGHT - 150 && position.y > 100) {
      console.log('getAskBallzyPosition: normal: ', position);
      return position;
    }
    
    // Fallback position in case askBallzy is too low or unmeasurable
    console.log('getAskBallzyPosition: fallback: ', position);
    return {
      x: SCREEN_WIDTH / 2 - 150,
      y: SCREEN_HEIGHT - 100,
      width: 300,
      height: 200
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
      description: 'Track your daily calorie intake and progress. Tap the card for more details.',
      position: elementPositions['calorieCard'] || null,
    },
    {
      id: 'readiness',
      title: 'Readiness Score',
      description: 'This card shows how ready your body is for training based on your recovery data.',
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
      description: "This card shows how closely you've followed your macro goals in the last week.",
      position: elementPositions['nutritionCard'] || null,
    },
    {
      id: 'recovery',
      title: 'Recovery Score',
      description: "See how well you've maintained your recovery habits over the past week.",
      position: elementPositions['recoveryCard'] || null,
    },
    {
              id: 'askBallzy',
        title: 'Ask AI Coach',
        description: 'Have questions about football, nutrition, or training? Ask your AI coach for personalized advice!',
      position: getAskBallzyPosition(),
    }
  ];

  // Handle completion
  const handleInstructionsComplete = () => {
    // Scroll back to the top of the screen when completed
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
      console.log('Scrolling to top after Home instructions tour completed');
    }
    
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