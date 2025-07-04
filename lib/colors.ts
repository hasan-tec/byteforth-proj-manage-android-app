// Color palette matching the web app design
export const colors = {
  // Background colors
  background: {
    primary: '#0A0C10',     // Main background - darker to match screenshot
    secondary: '#111827',   // Card background
    tertiary: '#1A1F2B',    // Input fields, dropdowns, etc.
  },
  
  // Border colors
  border: {
    primary: '#2D3748',     // Card borders, dividers - more subtle
    secondary: '#1E293B',   // Subtle borders
  },
  
  // Text colors
  text: {
    primary: '#F9FAFB',     // Main text
    secondary: '#D1D5DB',   // Secondary text
    tertiary: '#9CA3AF',    // Muted text
    quaternary: '#6B7280',  // Very muted text/labels
  },
  
  // Brand colors
  brand: {
    primary: '#3B82F6',     // Blue - primary actions, links
    success: '#10B981',     // Green - success states, active status
    warning: '#F59E0B',     // Amber - warnings, pending status
    danger: '#EF4444',      // Red - errors, delete actions
    info: '#0EA5E9',        // Light blue - info
  },

  // Status colors
  status: {
    active: '#10B981',      // Green - active, approved
    completed: '#3B82F6',   // Blue - completed
    pending: '#F59E0B',     // Amber - pending, needs attention
    cancelled: '#EF4444',   // Red - cancelled, rejected
    onHold: '#6B7280',      // Gray - on hold
    overdue: '#DC2626',     // Darker red - overdue
  },
  
  // Button colors
  button: {
    primary: '#3B82F6',
    primaryBorder: '#3B82F6',
    secondary: '#1F2937',
    secondaryBorder: '#374151',
    danger: '#EF4444',
    dangerBorder: '#EF4444',
    disabled: 'rgba(59, 130, 246, 0.5)',
  },
  
  // Utils
  utils: {
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: '#000000',
  }
};
