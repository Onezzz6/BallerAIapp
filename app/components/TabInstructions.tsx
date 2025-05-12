import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { markInstructionsAsShown } from '../utils/instructionManager';

export type InstructionStep = {
  id: string;
  title: string;
  description: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  tooltipVerticalOffset?: number;
};

type TabInstructionsProps = {
  steps: InstructionStep[];
  storageKey: string;
  visible: boolean;
  onComplete: () => void;
  onStepChange?: (index: number) => void;
  currentStepIndex?: number;
};

const WINDOW_WIDTH = Dimensions.get('window').width;
const WINDOW_HEIGHT = Dimensions.get('window').height;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT = 200; // Approximate height of tooltip
const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;
const SAFE_BOTTOM_MARGIN = 100; // Safe margin from bottom of screen

const TabInstructions: React.FC<TabInstructionsProps> = ({
  steps,
  storageKey,
  visible,
  onComplete,
  onStepChange,
  currentStepIndex: externalStepIndex,
}) => {
  const [internalStepIndex, setInternalStepIndex] = useState(0);
  
  // Use either external step index (if provided) or internal state
  const currentStepIndex = externalStepIndex !== undefined ? externalStepIndex : internalStepIndex;
  const currentStep = steps[currentStepIndex];
  
  // Add a check to ensure currentStep is defined before proceeding
  if (!currentStep) {
    console.error("Current instruction step is undefined for index:", currentStepIndex);
    // Optionally, handle this case gracefully, e.g., by not rendering the modal or showing an error
    // For now, returning null might prevent a crash during render, but might hide the component.
    // A better approach might be to prevent the index from going out of bounds upstream.
    return null; // Or render a fallback/loading state
  }
  
  // Update step index - if external control is used, call the callback
  const updateStepIndex = (newIndex: number) => {
    if (externalStepIndex !== undefined && onStepChange) {
      // External control - call the provided callback
      onStepChange(newIndex);
    } else {
      // Internal control - update our own state
      setInternalStepIndex(newIndex);
    }
  };
  
  // Calculate tooltip position based on the highlighted element
  const calculateTooltipPosition = () => {
    if (!currentStep.position) {
      // Center in screen if no position
      return {
        left: WINDOW_WIDTH / 2 - TOOLTIP_WIDTH / 2,
        top: WINDOW_HEIGHT / 2 - TOOLTIP_HEIGHT / 2,
      };
    }

    const { x, y, width, height } = currentStep.position;
    const verticalOffset = currentStep.tooltipVerticalOffset;
    
    // Calculate left position to center tooltip horizontally with element
    let left = x + (width / 2) - (TOOLTIP_WIDTH / 2);
    left = Math.max(20, Math.min(left, WINDOW_WIDTH - TOOLTIP_WIDTH - 20));
    
    let top;
    if (verticalOffset !== undefined && verticalOffset !== null) {
      // If a specific vertical offset is provided, use it
      top = y + verticalOffset;
    } else {
      // Otherwise, use the default above/below logic
      const isTooLow = y > WINDOW_HEIGHT - TOOLTIP_HEIGHT - height - SAFE_BOTTOM_MARGIN;
      if (isTooLow) {
        // Position above if element is too low
        top = Math.max(STATUSBAR_HEIGHT + 60, y - TOOLTIP_HEIGHT - 20);
      } else {
        // Position below if there's enough space
        top = y + height + 20;
      }
    }
    
    // Final safety check to ensure tooltip is on screen vertically
    top = Math.max(STATUSBAR_HEIGHT + 20, Math.min(top, WINDOW_HEIGHT - TOOLTIP_HEIGHT - SAFE_BOTTOM_MARGIN));
    
    return { left, top };
  };

  const tooltipPosition = calculateTooltipPosition();
  
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      updateStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Mark these instructions as shown
    await markInstructionsAsShown(storageKey);
    onComplete();
    
    // Reset step index for next time
    updateStepIndex(0);
  };

  // Render custom mask with a cutout for the highlighted element
  const renderOverlay = () => {
    if (!currentStep.position) {
      return (
        <BlurView
          intensity={Platform.OS === 'ios' ? 35 : 80}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    
    const { x, y, width, height } = currentStep.position;
    
    // Create a semi-transparent overlay with a cutout for the highlighted element
    return (
      <>
        {/* Top Section */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 35 : 80}
          tint="dark"
          style={[styles.overlay, { top: 0, height: Math.max(0, y - 10) }]}
        />
        
        {/* Left Section */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 35 : 80}
          tint="dark"
          style={[styles.overlay, { 
            top: Math.max(0, y - 10), 
            left: 0, 
            width: Math.max(0, x - 10),
            height: Math.min(height + 20, WINDOW_HEIGHT - y + 10)
          }]}
        />
        
        {/* Right Section */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 35 : 80}
          tint="dark"
          style={[styles.overlay, { 
            top: Math.max(0, y - 10), 
            left: x + width + 10, 
            width: Math.max(0, WINDOW_WIDTH - x - width - 10),
            height: Math.min(height + 20, WINDOW_HEIGHT - y + 10)
          }]}
        />
        
        {/* Bottom Section */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 35 : 80}
          tint="dark"
          style={[styles.overlay, { 
            top: y + height + 10, 
            height: Math.max(0, WINDOW_HEIGHT - y - height - 10)
          }]}
        />
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <SafeAreaView style={styles.container}>
        {/* Blurred background */}
        {renderOverlay()}
        
        {/* Highlight current element if position is provided */}
        {currentStep.position && (
          <View
            style={[
              styles.highlight,
              {
                left: currentStep.position.x - 10,
                top: currentStep.position.y - 10,
                width: currentStep.position.width + 20,
                height: currentStep.position.height + 20,
              },
            ]}
          >
            {/* Clear inner area for better visibility */}
            <View style={styles.clearArea} />
          </View>
        )}
        
        {/* Tooltip */}
        <View 
          style={[
            styles.tooltip, 
            { 
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            }
          ]}
        >
          {/* Step counter */}
          <View style={styles.stepCounter}>
            <Text style={styles.stepCounterText}>
              {currentStepIndex + 1}/{steps.length}
            </Text>
          </View>
          
          {/* Title and description */}
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.description}>{currentStep.description}</Text>
          
          {/* Navigation buttons */}
          <View style={styles.buttons}>
            <Pressable 
              style={styles.button} 
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>
                {currentStepIndex < steps.length - 1 ? 'Next' : 'Got it'}
              </Text>
              {currentStepIndex < steps.length - 1 && (
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: 'rgba(64, 100, 246, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1001, // Higher than highlight
  },
  stepCounter: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stepCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  highlight: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 1000,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  clearArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: WINDOW_WIDTH,
    zIndex: 999,
  },
});

export default TabInstructions; 