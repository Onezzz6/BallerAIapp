import React, { useEffect, useState } from 'react';
import { View, Dimensions, ScrollView, findNodeHandle } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../utils/instructionManager';
import { BackHandler } from 'react-native';

// Export the storage key for this tab
export const TRAINING_INSTRUCTIONS_KEY = INSTRUCTION_KEYS.TRAINING;

// Export the instruction steps
export const TRAINING_INSTRUCTION_STEPS: Array<Omit<InstructionStep, 'position'> & { position: null }> = [
  {
    id: 'welcome',
    title: 'Welcome to the Training Tab',
    description: "Let's explore how to get personalized training plans. We'll guide you through the key features of this tab.",
    position: null
  },
  {
    id: 'focusArea',
    title: 'Training Focus',
    description: "Select what you want to focus on this week for personalized training recommendations.",
    position: null,
    positionStyles: { borderRadius: 16 }
  },
  {
    id: 'gymAccess',
    title: 'Gym Access',
    description: "Tell us if you have access to a gym so we can tailor your training plan accordingly.",
    position: null,
    tooltipPosition: 'top'
  },
  {
    id: 'schedule',
    title: 'Team Schedule',
    description: "Enter your team training and game schedule so Ballzy can take it in to account when creating your training plan.",
    position: null,
    tooltipPosition: 'bottom',
    positionStyles: { borderRadius: 16 }
  },
  {
    id: 'generateButton',
    title: 'Generate Plan',
    description: "Once you've filled in your preferences, tap here to create your personalized weekly training plan.",
    position: null,
    tooltipPosition: 'top',
    positionStyles: { borderRadius: 24 }
  }
];

type TrainingInstructionsProps = {
  focusAreaRef: React.RefObject<View>;
  gymAccessRef: React.RefObject<View>;
  scheduleRef: React.RefObject<View>;
  generateButtonRef: React.RefObject<View>;
  scrollViewRef: React.RefObject<ScrollView>;
  onComplete: () => void;
};

// Get screen dimensions
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const TrainingInstructions: React.FC<TrainingInstructionsProps> = ({
  focusAreaRef,
  gymAccessRef,
  scheduleRef,
  generateButtonRef,
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
          
          // For full-width elements, expand to screen width with padding
          let adjustedWidth = width;
          let adjustedX = x;
          
          if (key === 'focusArea' || key === 'schedule') {
            // Expand to full width with padding
            adjustedX = 20;
            adjustedWidth = SCREEN_WIDTH - 40;
          } else if (key === 'generateButton') {
            // Force rounded border for pill button
            // We don't change dimensions, just note it for special styling
          }
          
          // Update positions with only this element
          setElementPositions(prev => ({
            ...prev,
            [key]: { 
              x: adjustedX, 
              y, 
              width: adjustedWidth, 
              height 
            }
          }));
        } else {
          console.log(`Measurement FAILED for ${key}`);
        }
      });
    }
  };

  // Measure all elements
  const measureElements = () => {
    measureElement(focusAreaRef, 'focusArea');
    measureElement(gymAccessRef, 'gymAccess');
    measureElement(scheduleRef, 'schedule');
    measureElement(generateButtonRef, 'generateButton');
  };

  // Scroll to make sure an element is visible and focus on it exclusively
  const scrollToElement = (ref: React.RefObject<View>, key: string) => {
    if (scrollViewRef.current && ref.current) {
      const node = findNodeHandle(ref.current);
      if (node) {
        // Don't clear positions when dealing with the first element (focusArea)
        if (key !== 'focusArea') {
          setElementPositions({});
        }
        
        ref.current.measureInWindow((x, y, width, height) => {
          // If element is below the screen or only partially visible
          if (y > SCREEN_HEIGHT - 200 || y + height > SCREEN_HEIGHT - 100) {
            // Calculate a good scroll position to show the element
            scrollViewRef.current?.scrollTo({
              y: y - 100, // Position element with some space at the top (added more safety padding)
              animated: true
            });
            
            // Second phase: Re-measure after scrolling with a longer delay
            setTimeout(() => {
              console.log(`Re-measuring ${key} after scrolling`);
              
              // Clear positions again to make sure no other elements are highlighted
              // But skip for focusArea to avoid the highlight disappearing
              if (key !== 'focusArea') {
                setElementPositions({});
              }
              
              // Final measure with a delay for scroll animation to complete
              setTimeout(() => {
                // Only measure the specific element we want to highlight
                if (ref.current) {
                  ref.current.measureInWindow((newX, newY, newWidth, newHeight) => {
                    if (newWidth > 0 && newHeight > 0) {
                      // Apply specific adjustments based on element type
                      let adjustedWidth = newWidth;
                      let adjustedX = newX;
                      
                      if (key === 'focusArea' || key === 'schedule') {
                        // Expand to full width with padding
                        adjustedX = 20;
                        adjustedWidth = SCREEN_WIDTH - 40;
                      }
                      
                      // Set position but keep existing positions for other elements
                      setElementPositions(prev => ({
                        ...prev,
                        [key]: { 
                          x: adjustedX, 
                          y: newY, 
                          width: adjustedWidth, 
                          height: newHeight 
                        }
                      }));
                    }
                  });
                }
              }, 100);
            }, 350);
          } else {
            // Element already visible - just re-measure it precisely
            // But skip clearing positions for focusArea
            if (key !== 'focusArea') {
              setElementPositions({});
            }
            
            setTimeout(() => {
              // Only measure the specific element we want to highlight
              if (ref.current) {
                ref.current.measureInWindow((newX, newY, newWidth, newHeight) => {
                  if (newWidth > 0 && newHeight > 0) {
                    // Apply specific adjustments based on element type
                    let adjustedWidth = newWidth;
                    let adjustedX = newX;
                    
                    if (key === 'focusArea' || key === 'schedule') {
                      // Expand to full width with padding
                      adjustedX = 20;
                      adjustedWidth = SCREEN_WIDTH - 40;
                    }
                    
                    // Set position but keep existing positions for other elements
                    setElementPositions(prev => ({
                      ...prev,
                      [key]: { 
                        x: adjustedX, 
                        y: newY, 
                        width: adjustedWidth, 
                        height: newHeight 
                      }
                    }));
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
      'focusArea', 
      'gymAccess', 
      'schedule', 
      'generateButton'
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
      const instructionsShown = await hasShownInstructions(INSTRUCTION_KEYS.TRAINING);
      
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
      if (currentStepIndex === 0) {
        // Welcome - no specific element to highlight
        setElementPositions({});
      } else if (currentStepIndex === 1) {
        // Focus area section
        scrollToElement(focusAreaRef, 'focusArea');
      } else if (currentStepIndex === 2) {
        // Gym access section
        scrollToElement(gymAccessRef, 'gymAccess');
      } else if (currentStepIndex === 3) {
        // Team schedule section
        scrollToElement(scheduleRef, 'schedule');
      } else if (currentStepIndex === 4) {
        // Generate button
        scrollToElement(generateButtonRef, 'generateButton');
      }
    }
  }, [currentStepIndex, showInstructions]);

  // Instruction steps - Use the exported steps but add the positions
  const steps: InstructionStep[] = TRAINING_INSTRUCTION_STEPS.map(step => ({
    ...step,
    position: elementPositions[step.id] || null
  }));

  // Handle completion
  const handleInstructionsComplete = () => {
    // Scroll back to the top of the screen when completed
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
      console.log('Scrolling to top after Training instructions tour completed');
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
      storageKey={INSTRUCTION_KEYS.TRAINING}
      visible={showInstructions}
      onComplete={handleInstructionsComplete}
      onStepChange={handleStepChange}
      currentStepIndex={currentStepIndex}
    />
  );
};

export default TrainingInstructions; 