import { Dimensions, Platform } from 'react-native';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Device type detection
export const isTablet = () => {
  const aspectRatio = screenHeight / screenWidth;
  return (
    (Platform.OS === 'ios' && aspectRatio < 1.6) ||
    (Platform.OS === 'android' && screenWidth >= 768)
  );
};

export const isWeb = () => Platform.OS === 'web';

// Responsive breakpoints
export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// Get current breakpoint
export const getCurrentBreakpoint = () => {
  if (screenWidth >= breakpoints.xl) return 'xl';
  if (screenWidth >= breakpoints.lg) return 'lg';
  if (screenWidth >= breakpoints.md) return 'md';
  if (screenWidth >= breakpoints.sm) return 'sm';
  return 'xs';
};

// Responsive values
export const responsiveValue = (values: {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}) => {
  const breakpoint = getCurrentBreakpoint();
  return values[breakpoint] || values.xs || 0;
};

// Responsive padding/margins
export const responsivePadding = {
  horizontal: responsiveValue({ xs: 16, sm: 20, md: 24, lg: 32, xl: 40 }),
  vertical: responsiveValue({ xs: 16, sm: 20, md: 24, lg: 32, xl: 40 }),
};

// Responsive grid
export const getGridColumns = (itemWidth: number, gap: number = 16) => {
  const availableWidth = screenWidth - (responsivePadding.horizontal * 2);
  const columns = Math.floor((availableWidth + gap) / (itemWidth + gap));
  return Math.max(1, columns);
};

// Responsive card width
export const getCardWidth = (columns: number = 2, gap: number = 16) => {
  const availableWidth = screenWidth - (responsivePadding.horizontal * 2);
  return (availableWidth - (gap * (columns - 1))) / columns;
};

// Font scaling
export const responsiveFontSize = (size: number) => {
  const scale = responsiveValue({ xs: 0.9, sm: 1, md: 1.1, lg: 1.2, xl: 1.3 });
  return Math.round(size * scale);
};

// Component specific responsive helpers
export const getStatCardWidth = () => {
  const columns = responsiveValue({ xs: 2, sm: 2, md: 3, lg: 4, xl: 4 });
  return getCardWidth(columns, 16);
};

export const getActivityCardPadding = () => {
  return responsiveValue({ xs: 12, sm: 16, md: 20, lg: 24 });
};

export const getHeaderHeight = () => {
  return responsiveValue({ xs: 60, sm: 70, md: 80, lg: 90 });
};

export const getTabBarHeight = () => {
  return responsiveValue({ xs: 70, sm: 80, md: 90, lg: 100 });
};

// Layout utilities
export const getFlexDirection = (
  mobile: 'row' | 'column' = 'column',
  tablet: 'row' | 'column' = 'row'
) => {
  return isTablet() ? tablet : mobile;
};

export const getJustifyContent = (
  mobile: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' = 'flex-start',
  tablet: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' = 'flex-start'
) => {
  return isTablet() ? tablet : mobile;
};

// Screen dimensions
export const screenDimensions = {
  width: screenWidth,
  height: screenHeight,
  isTablet: isTablet(),
  isWeb: isWeb(),
  breakpoint: getCurrentBreakpoint(),
};
