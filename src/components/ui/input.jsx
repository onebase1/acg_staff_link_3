import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, inputMode, enterKeyHint, ...props }, ref) => {
  // 📱 MOBILE OPTIMIZATION: Determine inputMode based on type if not explicitly provided
  const getInputMode = () => {
    if (inputMode) return inputMode;
    
    // Auto-detect best inputMode for mobile keyboards
    switch (type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'number':
        return 'numeric';
      case 'url':
        return 'url';
      case 'search':
        return 'search';
      default:
        return 'text';
    }
  };

  return (
    (<input
      type={type}
      inputMode={getInputMode()}
      enterKeyHint={enterKeyHint}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Mobile-specific fixes
        type === 'date' && "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:py-1",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
