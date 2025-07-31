import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { InstructionStep } from './TabInstructions';
import TabInstructions from './TabInstructions';
import { hasShownInstructions, INSTRUCTION_KEYS } from '../../utils/instructionManager';
import { BackHandler } from 'react-native';

type ProfileInstructionsProps = {
  profilePictureRef: React.RefObject<View>;
  profileDetailsRef: React.RefObject<View>;
  accountSettingsRef: React.RefObject<View>;
  onComplete: () => void;
};

const ProfileInstructions: React.FC<ProfileInstructionsProps> = ({
  profilePictureRef,
  profileDetailsRef,
  accountSettingsRef,
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
    measureElement(profilePictureRef, 'profilePicture');
    measureElement(profileDetailsRef, 'profileDetails');
    measureElement(accountSettingsRef, 'accountSettings');
  };

  useEffect(() => {
    // Check if we've shown these instructions before
    const checkInstructionState = async () => {
      const instructionsShown = await hasShownInstructions(INSTRUCTION_KEYS.PROFILE);
      
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
      title: 'Your Profile',
      description: "This is your profile page where you can manage your personal information and account settings.",
      position: null, // Full screen intro, no specific element highlighted
    },
    {
      id: 'profilePicture',
      title: 'Profile Picture',
      description: "Tap here to change your profile picture. You can select a photo from your gallery.",
      position: elementPositions['profilePicture'] || null,
    },
    {
      id: 'profileDetails',
      title: 'Personal Details',
      description: "Tap on any detail like height, weight, or position to update your profile information.",
      position: elementPositions['profileDetails'] || null,
    },
    {
      id: 'accountSettings',
      title: 'Account Settings',
      description: "Manage your account settings, subscription, and sign out from here.",
      position: elementPositions['accountSettings'] || null,
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
      storageKey={INSTRUCTION_KEYS.PROFILE}
      visible={showInstructions}
      onComplete={handleInstructionsComplete}
    />
  );
};

export default ProfileInstructions; 