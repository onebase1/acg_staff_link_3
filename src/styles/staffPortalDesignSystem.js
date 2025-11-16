/**
 * 🎨 STAFF PORTAL MOBILE DESIGN SYSTEM
 * 
 * Consistent design tokens for mobile-first Staff Portal
 * Based on Figma/Material Design principles
 */

// ============================================
// 🎨 COLOR PALETTE
// ============================================

export const colors = {
  // Primary Brand Colors
  primary: {
    main: '#0EA5E9',      // Cyan-500 - Main brand color
    light: '#38BDF8',     // Cyan-400 - Hover states
    dark: '#0284C7',      // Cyan-600 - Active states
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%)', // Hero gradients
  },
  
  // Secondary Colors
  secondary: {
    main: '#8B5CF6',      // Purple-500 - Accent color
    light: '#A78BFA',     // Purple-400
    dark: '#7C3AED',      // Purple-600
  },
  
  // Status Colors
  status: {
    success: '#10B981',   // Green-500 - Confirmed, completed
    warning: '#F59E0B',   // Amber-500 - Important, pending
    error: '#EF4444',     // Red-500 - Critical, urgent
    info: '#3B82F6',      // Blue-500 - Information
  },
  
  // Semantic Colors
  semantic: {
    earnings: '#10B981',  // Green - Money, earnings
    shifts: '#3B82F6',    // Blue - Shifts, schedule
    urgent: '#EF4444',    // Red - Urgent actions
    pending: '#F59E0B',   // Amber - Awaiting action
  },
  
  // Neutral Colors (Text & Backgrounds)
  neutral: {
    50: '#F9FAFB',        // Lightest background
    100: '#F3F4F6',       // Light background
    200: '#E5E7EB',       // Borders
    300: '#D1D5DB',       // Disabled
    400: '#9CA3AF',       // Placeholder text
    500: '#6B7280',       // Secondary text
    600: '#4B5563',       // Body text
    700: '#374151',       // Headings
    800: '#1F2937',       // Dark headings
    900: '#111827',       // Darkest text
  },
  
  // Text Colors (Semantic)
  text: {
    primary: '#111827',   // Main text
    secondary: '#6B7280', // Secondary text
    disabled: '#9CA3AF',  // Disabled text
    inverse: '#FFFFFF',   // White text on dark backgrounds
  },
  
  // Background Colors
  background: {
    primary: '#FFFFFF',   // Main background
    secondary: '#F9FAFB', // Card backgrounds
    tertiary: '#F3F4F6',  // Subtle backgrounds
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
  },
};

// ============================================
// 📝 TYPOGRAPHY
// ============================================

export const typography = {
  // Font Families
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  
  // Font Sizes (Mobile-First)
  fontSize: {
    // Display (Hero text)
    display: {
      mobile: '2rem',      // 32px
      desktop: '3rem',     // 48px
    },
    
    // Headings
    h1: {
      mobile: '1.5rem',    // 24px
      desktop: '2rem',     // 32px
    },
    h2: {
      mobile: '1.25rem',   // 20px
      desktop: '1.5rem',   // 24px
    },
    h3: {
      mobile: '1.125rem',  // 18px
      desktop: '1.25rem',  // 20px
    },
    h4: {
      mobile: '1rem',      // 16px
      desktop: '1.125rem', // 18px
    },
    
    // Body Text
    body: {
      large: '1rem',       // 16px
      base: '0.875rem',    // 14px
      small: '0.75rem',    // 12px
      tiny: '0.625rem',    // 10px
    },
    
    // UI Elements
    button: {
      large: '1rem',       // 16px
      base: '0.875rem',    // 14px
      small: '0.75rem',    // 12px
    },
    label: '0.75rem',      // 12px
    caption: '0.625rem',   // 10px
  },
  
  // Font Weights
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ============================================
// 📏 SPACING SYSTEM (8px base)
// ============================================

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
};

// ============================================
// 🔘 COMPONENT SIZES
// ============================================

export const components = {
  // Button Sizes
  button: {
    small: {
      height: '2rem',      // 32px
      padding: '0.5rem 1rem',
      fontSize: typography.fontSize.button.small,
    },
    medium: {
      height: '2.75rem',   // 44px - Touch-friendly
      padding: '0.75rem 1.5rem',
      fontSize: typography.fontSize.button.base,
    },
    large: {
      height: '3.5rem',    // 56px - Primary CTAs
      padding: '1rem 2rem',
      fontSize: typography.fontSize.button.large,
    },
  },

  // Input Sizes
  input: {
    small: {
      height: '2rem',      // 32px
      padding: '0.5rem 0.75rem',
      fontSize: typography.fontSize.body.small,
    },
    medium: {
      height: '2.75rem',   // 44px - Touch-friendly
      padding: '0.75rem 1rem',
      fontSize: typography.fontSize.body.base,
    },
    large: {
      height: '3.5rem',    // 56px
      padding: '1rem 1.25rem',
      fontSize: typography.fontSize.body.large,
    },
  },

  // Card Sizes
  card: {
    padding: {
      small: '0.75rem',    // 12px
      medium: '1rem',      // 16px
      large: '1.5rem',     // 24px
    },
    borderRadius: {
      small: '0.375rem',   // 6px
      medium: '0.5rem',    // 8px
      large: '0.75rem',    // 12px
      xl: '1rem',          // 16px
    },
  },

  // Badge Sizes
  badge: {
    small: {
      height: '1.25rem',   // 20px
      padding: '0.125rem 0.5rem',
      fontSize: typography.fontSize.caption,
    },
    medium: {
      height: '1.5rem',    // 24px
      padding: '0.25rem 0.75rem',
      fontSize: typography.fontSize.body.small,
    },
    large: {
      height: '2rem',      // 32px
      padding: '0.5rem 1rem',
      fontSize: typography.fontSize.body.base,
    },
  },

  // Icon Sizes
  icon: {
    tiny: '0.75rem',       // 12px
    small: '1rem',         // 16px
    medium: '1.25rem',     // 20px
    large: '1.5rem',       // 24px
    xl: '2rem',            // 32px
    xxl: '3rem',           // 48px
  },

  // Avatar Sizes
  avatar: {
    small: '2rem',         // 32px
    medium: '2.5rem',      // 40px
    large: '3rem',         // 48px
    xl: '4rem',            // 64px
  },
};

// ============================================
// 🎯 SHADOWS
// ============================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
};

// ============================================
// 📱 BREAKPOINTS
// ============================================

export const breakpoints = {
  mobile: '0px',         // 0px and up
  tablet: '768px',       // 768px and up
  desktop: '1024px',     // 1024px and up
  wide: '1280px',        // 1280px and up
};

// ============================================
// 🎨 DESIGN TOKENS (Tailwind-compatible)
// ============================================

export const tokens = {
  // Status Badge Classes
  statusBadge: {
    critical: {
      bg: colors.status.error,
      text: colors.text.inverse,
      className: 'bg-red-500 text-white',
    },
    important: {
      bg: colors.status.warning,
      text: colors.text.inverse,
      className: 'bg-amber-500 text-white',
    },
    success: {
      bg: colors.status.success,
      text: colors.text.inverse,
      className: 'bg-green-500 text-white',
    },
    info: {
      bg: colors.status.info,
      text: colors.text.inverse,
      className: 'bg-blue-500 text-white',
    },
  },

  // Button Variants
  buttonVariant: {
    primary: {
      bg: colors.primary.main,
      text: colors.text.inverse,
      hover: colors.primary.dark,
      className: 'bg-cyan-500 text-white hover:bg-cyan-600',
    },
    secondary: {
      bg: colors.secondary.main,
      text: colors.text.inverse,
      hover: colors.secondary.dark,
      className: 'bg-purple-500 text-white hover:bg-purple-600',
    },
    success: {
      bg: colors.status.success,
      text: colors.text.inverse,
      hover: '#059669', // green-600
      className: 'bg-green-500 text-white hover:bg-green-600',
    },
    warning: {
      bg: colors.status.warning,
      text: colors.text.inverse,
      hover: '#D97706', // amber-600
      className: 'bg-amber-500 text-white hover:bg-amber-600',
    },
    outline: {
      bg: 'transparent',
      text: colors.text.primary,
      border: colors.neutral[300],
      className: 'bg-transparent border border-gray-300 text-gray-900 hover:bg-gray-50',
    },
  },

  // Card Variants
  cardVariant: {
    default: {
      bg: colors.background.primary,
      border: colors.neutral[200],
      shadow: shadows.base,
      className: 'bg-white border border-gray-200 shadow',
    },
    elevated: {
      bg: colors.background.primary,
      border: 'transparent',
      shadow: shadows.lg,
      className: 'bg-white shadow-lg',
    },
    flat: {
      bg: colors.background.secondary,
      border: 'transparent',
      shadow: shadows.none,
      className: 'bg-gray-50',
    },
  },
};

// ============================================
// 🎯 UTILITY CLASSES (Tailwind-compatible)
// ============================================

export const utilities = {
  // Touch-friendly minimum sizes
  touchTarget: 'min-h-[44px] min-w-[44px]',

  // Common layouts
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexStart: 'flex items-center justify-start',

  // Text truncation
  truncate: 'truncate overflow-hidden text-ellipsis whitespace-nowrap',
  lineClamp2: 'line-clamp-2',
  lineClamp3: 'line-clamp-3',

  // Transitions
  transition: 'transition-all duration-200 ease-in-out',
  transitionFast: 'transition-all duration-150 ease-in-out',
  transitionSlow: 'transition-all duration-300 ease-in-out',
};

export default {
  colors,
  typography,
  spacing,
  components,
  shadows,
  breakpoints,
  tokens,
  utilities,
};

