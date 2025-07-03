# New Onboarding System - Developer Guide

## 🎯 Overview

The new onboarding system makes it incredibly easy to add, remove, or reorder onboarding screens without manually updating step numbers throughout the codebase.

## ✨ Benefits

- **Add a screen**: Just add one line to the config file
- **Remove a screen**: Delete one line from the config file  
- **Reorder screens**: Rearrange lines in the config file
- **No manual step updates**: All step numbers calculated automatically
- **Centralized navigation**: All routing logic in one place
- **Type safety**: Full TypeScript support

## 🔧 How to Use

### 1. Add a New Screen

Simply add an entry to `app/(onboarding)/onboarding-flow.ts`:

```typescript
export const ONBOARDING_FLOW: OnboardingStep[] = [
  // ... existing screens ...
  { id: 'my-new-screen', route: '/my-new-screen', title: 'My New Screen' },
  // ... rest of screens ...
];
```

### 2. Create Your Screen Component

```typescript
// app/(onboarding)/my-new-screen.tsx
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import OnboardingHeader from '../components/OnboardingHeader';

export default function MyNewScreen() {
  // Automatic step management and navigation
  const { currentStep, totalSteps, goToNext, goToPrevious } = useOnboardingStep('my-new-screen');

  const handleContinue = () => {
    // Do any logic here...
    goToNext(); // Automatically navigates to the next screen
  };

  return (
    <SafeAreaView>
      {/* Automatic step detection - no manual numbers! */}
      <OnboardingHeader screenId="my-new-screen" />
      
      {/* Your content here */}
      
      <Button onPress={handleContinue} title="Continue" />
    </SafeAreaView>
  );
}
```

### 3. Done! 

That's it! The system automatically:
- Calculates step numbers
- Handles navigation
- Updates progress bars
- Manages the flow

## 📝 Migration from Old System

### Before (Old Way):
```typescript
export default function MyScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/next-screen'); // Hard-coded route
  };

  return (
    <SafeAreaView>
      <OnboardingHeader 
        currentStep={15}  // Manual step number
        totalSteps={31}   // Manual total (gets out of sync!)
      />
      <Button onPress={handleContinue} />
    </SafeAreaView>
  );
}
```

### After (New Way):
```typescript
export default function MyScreen() {
  const { goToNext } = useOnboardingStep('my-screen');

  const handleContinue = () => {
    goToNext(); // Automatic navigation
  };

  return (
    <SafeAreaView>
      <OnboardingHeader screenId="my-screen" /> {/* Automatic steps */}
      <Button onPress={handleContinue} />
    </SafeAreaView>
  );
}
```

## 🔄 Navigation Methods

```typescript
const { 
  currentStep,     // Current step number (1-indexed)
  totalSteps,      // Total number of steps
  goToNext,        // Navigate to next screen
  goToPrevious,    // Navigate to previous screen
  goToStep,        // Navigate to specific screen by ID
  isFirstStep,     // Boolean: is this the first step?
  isLastStep,      // Boolean: is this the last step?
  progressPercentage // Progress as percentage (0-100)
} = useOnboardingStep('screen-id');
```

## 📁 File Structure

```
app/(onboarding)/
├── onboarding-flow.ts          # Central flow configuration
├── ONBOARDING_SYSTEM_GUIDE.md  # This guide
├── my-screen.tsx               # Individual screen components
└── ...

app/hooks/
└── useOnboardingStep.ts        # Custom hook for screens

app/components/
└── OnboardingHeader.tsx        # Updated header component
```

## 🎯 Examples

### Adding a Screen Between Existing Ones:
```typescript
// Just insert it in the array where you want it:
export const ONBOARDING_FLOW: OnboardingStep[] = [
  { id: 'gender', route: '/gender' },
  { id: 'my-new-screen', route: '/my-new-screen' }, // ← Insert here
  { id: 'training-frequency', route: '/training-frequency' },
  // All step numbers automatically adjust!
];
```

### Removing a Screen:
```typescript
// Just delete the line:
export const ONBOARDING_FLOW: OnboardingStep[] = [
  { id: 'gender', route: '/gender' },
  // { id: 'unwanted-screen', route: '/unwanted-screen' }, // ← Delete this
  { id: 'training-frequency', route: '/training-frequency' },
  // All step numbers automatically adjust!
];
```

### Conditional Navigation:
```typescript
const { goToNext, goToStep } = useOnboardingStep('current-screen');

const handleContinue = () => {
  if (someCondition) {
    goToStep('special-screen'); // Jump to specific screen
  } else {
    goToNext(); // Continue normally
  }
};
```

## 🔄 Backward Compatibility

The system is fully backward compatible. Existing screens using the old method will continue to work:

```typescript
// This still works:
<OnboardingHeader currentStep={15} totalSteps={31} />

// But this is preferred:
<OnboardingHeader screenId="my-screen" />
```

## 🚀 Migration Strategy

1. **Add new screens** using the new system
2. **Gradually migrate existing screens** when you touch them
3. **No rush** - both systems work together seamlessly

The new system makes onboarding management effortless! 🎉 