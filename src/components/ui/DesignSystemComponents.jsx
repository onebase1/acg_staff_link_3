/**
 * 🎨 DESIGN SYSTEM COMPONENTS
 * 
 * Reusable components following Staff Portal design system
 * Mobile-first, touch-friendly, consistent styling
 */

import React from 'react';
import { colors, components, tokens, utilities } from '@/styles/staffPortalDesignSystem';

// ============================================
// 🔘 BUTTON COMPONENT
// ============================================

export const DSButton = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  fullWidth = false,
  icon = null,
  className = '',
  ...props 
}) => {
  const variantClass = tokens.buttonVariant[variant]?.className || tokens.buttonVariant.primary.className;
  const sizeStyles = components.button[size];
  
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    ${utilities.transition}
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95
    ${variantClass}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <button 
      className={baseClasses}
      style={{
        height: sizeStyles.height,
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
      }}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

// ============================================
// 🏷️ BADGE COMPONENT
// ============================================

export const DSBadge = ({ 
  children, 
  variant = 'info', 
  size = 'medium',
  className = '',
  ...props 
}) => {
  const variantClass = tokens.statusBadge[variant]?.className || tokens.statusBadge.info.className;
  const sizeStyles = components.badge[size];
  
  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold rounded-full
    ${variantClass}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <span 
      className={baseClasses}
      style={{
        height: sizeStyles.height,
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

// ============================================
// 📦 CARD COMPONENT
// ============================================

export const DSCard = ({ 
  children, 
  variant = 'default',
  padding = 'medium',
  className = '',
  onClick = null,
  ...props 
}) => {
  const variantClass = tokens.cardVariant[variant]?.className || tokens.cardVariant.default.className;
  const paddingValue = components.card.padding[padding];
  const borderRadius = components.card.borderRadius.medium;
  
  const baseClasses = `
    ${variantClass}
    ${onClick ? 'cursor-pointer hover:shadow-md ' + utilities.transition : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <div 
      className={baseClasses}
      style={{
        padding: paddingValue,
        borderRadius: borderRadius,
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================
// 📝 INPUT COMPONENT
// ============================================

export const DSInput = ({ 
  size = 'medium',
  fullWidth = true,
  error = false,
  className = '',
  ...props 
}) => {
  const sizeStyles = components.input[size];
  
  const baseClasses = `
    border rounded-lg
    ${utilities.transition}
    focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <input 
      className={baseClasses}
      style={{
        height: sizeStyles.height,
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
      }}
      {...props}
    />
  );
};

// ============================================
// 📋 COMPLIANCE ITEM COMPONENT
// ============================================

export const DSComplianceItem = ({
  icon,
  label,
  status,
  count = null,
  onClick = null
}) => {
  const statusConfig = {
    critical: { variant: 'critical', text: 'Critical' },
    important: { variant: 'important', text: 'Important' },
    success: { variant: 'success', text: 'Complete' },
  };

  const config = statusConfig[status] || statusConfig.info;

  return (
    <DSCard
      variant="default"
      padding="medium"
      onClick={onClick}
      className="hover:border-cyan-500"
    >
      <div className={utilities.flexBetween}>
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{icon}</span>
          <div>
            <div className="font-medium text-gray-900">{label}</div>
            {count !== null && (
              <div className="text-xs text-gray-500 mt-0.5">{count}</div>
            )}
          </div>
        </div>
        <DSBadge variant={config.variant} size="medium">
          {config.text}
        </DSBadge>
      </div>
    </DSCard>
  );
};

// ============================================
// 💰 EARNINGS CARD COMPONENT
// ============================================

export const DSEarningsCard = ({
  title,
  amount,
  subtitle,
  variant = 'success' // 'success' (green) or 'info' (blue)
}) => {
  const bgColor = variant === 'success' ? 'bg-green-50' : 'bg-blue-50';
  const textColor = variant === 'success' ? 'text-green-600' : 'text-blue-600';
  const amountColor = variant === 'success' ? 'text-green-700' : 'text-blue-700';

  return (
    <DSCard variant="flat" padding="medium" className={bgColor}>
      <div className="text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
        {title}
      </div>
      <div className={`text-3xl font-bold ${amountColor}`}>
        {amount}
      </div>
      <div className={`text-xs mt-1 ${textColor}`}>
        {subtitle}
      </div>
    </DSCard>
  );
};

// ============================================
// 📅 SHIFT CARD COMPONENT
// ============================================

export const DSShiftCard = ({
  client,
  date,
  time,
  role,
  status = 'confirmed',
  earnings = null,
  onClick = null
}) => {
  const statusColors = {
    confirmed: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <DSCard
      variant="default"
      padding="medium"
      onClick={onClick}
      className="hover:border-cyan-500"
    >
      <div className="space-y-2">
        {/* Header */}
        <div className={utilities.flexBetween}>
          <div className="font-semibold text-gray-900">{client}</div>
          {earnings && (
            <div className="font-bold text-green-600">{earnings}</div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🕐</span>
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span>{role}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>
    </DSCard>
  );
};

// ============================================
// 🎯 SECTION HEADER COMPONENT
// ============================================

export const DSSectionHeader = ({
  title,
  subtitle = null,
  action = null,
  icon = null
}) => {
  return (
    <div className={utilities.flexBetween + ' mb-4'}>
      <div>
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// ============================================
// 🔔 NOTIFICATION BADGE COMPONENT
// ============================================

export const DSNotificationBadge = ({ count }) => {
  if (!count || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
      {count > 99 ? '99+' : count}
    </span>
  );
};

// ============================================
// 📱 MOBILE HEADER COMPONENT
// ============================================

export const DSMobileHeader = ({
  title,
  subtitle = null,
  avatar = null,
  notifications = 0,
  onNotificationClick = null
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className={utilities.flexBetween}>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={onNotificationClick}
          >
            <span className="text-2xl">🔔</span>
            <DSNotificationBadge count={notifications} />
          </button>

          {/* Avatar */}
          {avatar && (
            <div
              className="rounded-full overflow-hidden border-2 border-cyan-500"
              style={{ width: components.avatar.medium, height: components.avatar.medium }}
            >
              {avatar}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
