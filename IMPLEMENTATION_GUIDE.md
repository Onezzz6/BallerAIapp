# One-Time Instructions Implementation Guide

This guide explains how to implement the one-time instructions feature in your BallerAI app.

## Overview

We've created a system to show first-time users a guided tour of each tab in the app. These instructions:
- Only appear the first time a user visits each tab
- Show tooltips highlighting key UI elements with explanations
- Are stored in AsyncStorage so they only appear once, even after app restarts

## Components Created

1. **Utility Files**:
   - `instructionManager.ts` - Manages storing/retrieving instruction state in AsyncStorage
   
2. **UI Components**:
   - `TabInstructions.tsx` - The core overlay component that displays tooltips
   - `HomeInstructions.tsx` - Home tab-specific instructions
   - `RecoveryInstructions.tsx` - Recovery tab-specific instructions
   - `NutritionInstructions.tsx` - Nutrition tab-specific instructions
   - `TrainingInstructions.tsx` - Training tab-specific instructions
   - `ProfileInstructions.tsx` - Profile tab-specific instructions

## Implementation Steps

### 1. Home Tab (`app/(tabs)/home.tsx`)

We've already implemented this as an example. Key changes:

```tsx
// Add import
import HomeInstructions from '../components/HomeInstructions';

export default function HomeScreen() {
  // Add refs for elements to highlight
  const calorieCardRef = useRef<View>(null);
  const readinessCardRef = useRef<View>(null);
  const weeklyProgressRef = useRef<View>(null);
  const askBallzyRef = useRef<View>(null);
  
  // Add state to track completion
  const [instructionsComplete, setInstructionsComplete] = useState(false);
  
  // Attach refs to elements you want to highlight
  // For example: <View ref={calorieCardRef}>...</View>
  
  return (
    <View>
      {/* Existing UI */}
      
      {/* Add the instructions component */}
      <HomeInstructions
        calorieCardRef={calorieCardRef}
        readinessCardRef={readinessCardRef}
        weeklyProgressRef={weeklyProgressRef}
        askBallzyRef={askBallzyRef}
        onComplete={() => setInstructionsComplete(true)}
      />
    </View>
  );
}
```

### 2. Recovery Tab (`app/(tabs)/recovery.tsx`)

Follow a similar pattern. At the top of the file:

```tsx
import RecoveryInstructions from '../components/RecoveryInstructions';

export default function RecoveryScreen() {
  // Add refs for elements to highlight
  const sliderSectionRef = useRef<View>(null);
  const toolSectionRef = useRef<View>(null);
  const timeSectionRef = useRef<View>(null);
  const generateButtonRef = useRef<View>(null);
  
  // Add state to track completion
  const [instructionsComplete, setInstructionsComplete] = useState(false);
  
  // Attach refs to UI elements
  
  return (
    <View>
      {/* Existing UI */}
      
      {/* Add the instructions component */}
      <RecoveryInstructions
        sliderSectionRef={sliderSectionRef}
        toolSectionRef={toolSectionRef}
        timeSectionRef={timeSectionRef}
        generateButtonRef={generateButtonRef}
        onComplete={() => setInstructionsComplete(true)}
      />
    </View>
  );
}
```

### 3. Nutrition Tab (`app/(tabs)/nutrition.tsx`)

```tsx
import NutritionInstructions from '../components/NutritionInstructions';

export default function NutritionScreen() {
  // Add refs for elements to highlight
  const calorieCardRef = useRef<View>(null);
  const logMealButtonRef = useRef<View>(null);
  const macroBarsSectionRef = useRef<View>(null);
  const calendarSectionRef = useRef<View>(null);
  
  // Add state to track completion
  const [instructionsComplete, setInstructionsComplete] = useState(false);
  
  // Attach refs to UI elements
  
  return (
    <View>
      {/* Existing UI */}
      
      {/* Add the instructions component */}
      <NutritionInstructions
        calorieCardRef={calorieCardRef}
        logMealButtonRef={logMealButtonRef}
        macroBarsSectionRef={macroBarsSectionRef}
        calendarSectionRef={calendarSectionRef}
        onComplete={() => setInstructionsComplete(true)}
      />
    </View>
  );
}
```

### 4. Training Tab (`app/(tabs)/training.tsx`)

```tsx
import TrainingInstructions from '../components/TrainingInstructions';

export default function TrainingScreen() {
  // Add refs for elements to highlight
  const focusAreaRef = useRef<View>(null);
  const gymAccessRef = useRef<View>(null);
  const scheduleRef = useRef<View>(null);
  const generateButtonRef = useRef<View>(null);
  
  // Add state to track completion
  const [instructionsComplete, setInstructionsComplete] = useState(false);
  
  // Attach refs to UI elements
  
  return (
    <View>
      {/* Existing UI */}
      
      {/* Add the instructions component */}
      <TrainingInstructions
        focusAreaRef={focusAreaRef}
        gymAccessRef={gymAccessRef}
        scheduleRef={scheduleRef}
        generateButtonRef={generateButtonRef}
        onComplete={() => setInstructionsComplete(true)}
      />
    </View>
  );
}
```

### 5. Profile Tab (`app/(tabs)/profile.tsx`)

```tsx
import ProfileInstructions from '../components/ProfileInstructions';

export default function ProfileScreen() {
  // Add refs for elements to highlight
  const profilePictureRef = useRef<View>(null);
  const profileDetailsRef = useRef<View>(null);
  const accountSettingsRef = useRef<View>(null);
  
  // Add state to track completion
  const [instructionsComplete, setInstructionsComplete] = useState(false);
  
  // Attach refs to UI elements
  
  return (
    <View>
      {/* Existing UI */}
      
      {/* Add the instructions component */}
      <ProfileInstructions
        profilePictureRef={profilePictureRef}
        profileDetailsRef={profileDetailsRef}
        accountSettingsRef={accountSettingsRef}
        onComplete={() => setInstructionsComplete(true)}
      />
    </View>
  );
}
```

## How It Works

1. When a user first opens a tab, the instructions component checks AsyncStorage to see if it has shown instructions before
2. If not, it measures the positions of the referenced UI elements and shows the instruction overlay
3. The user can navigate through the instructions or dismiss them
4. Upon completion, the state is saved to AsyncStorage so the instructions won't appear again

## Customization

You can customize the instructions for each tab by editing the `steps` array in each instruction component. Each step has:

- `id`: A unique identifier
- `title`: The instruction title
- `description`: The explanatory text
- `position`: The position of the UI element to highlight (or null for full-screen instructions)

## Troubleshooting

- If refs aren't capturing elements correctly, make sure the elements are rendered before measurements are taken
- Sometimes you might need to adjust the timeout (default: 500ms) to ensure UI elements are fully rendered
- If AsyncStorage fails, the instructions will be shown again, but this should be rare 