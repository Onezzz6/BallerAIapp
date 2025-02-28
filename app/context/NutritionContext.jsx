const initializeData = () => {
  console.log('NutritionContext: Initializing nutrition data on app startup');
  
  // If you already have a function that loads the user's nutrition data,
  // call it here. Otherwise, implement the loading logic.
  
  // Example:
  setIsLoading(true);
  loadMacroGoals();
  loadTodaysMacros();
  
  // If you have other initialization methods, call them here
  if (userId) {
    setupRealTimeListener();
  }
};

const contextValue = {
  // ... existing context values ...
  initializeData,
}; 