export const colors = {
  // Brand colors
  brandBlue: '#4064F6',
  brandGreen: '#99E86C',
  
  // Neutral colors (reference style)
  black: '#000000',
  darkGray: '#262626',
  mediumGray: '#666666',
  lightGray: '#999999',
  veryLightGray: '#E5E5E5',
  backgroundColor: '#FCFCFC',
  white: '#FFFFFF',
  
  // Semantic colors
  success: '#99E86C',
  error: '#FF3B30',
  warning: '#FF9500',
  
  // Component colors
  cardBackground: '#FFFFFF',
  inputBackground: '#F8F8F8',
  selectedBackground: '#99E86C',
  disabledBackground: '#F5F5F5',
  borderColor: '#E5E5E5',
  selectedBorder: '#99E86C',
};

export const typography = {
  // Reference style typography
  largeTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.black,
  },
  title: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: colors.black,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.mediumGray,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.black,
  },
  button: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.white,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 25,
  round: 50,
}; 