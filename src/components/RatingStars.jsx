import React, { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * RatingStars Component
 * Interactive 5-star rating input
 * 
 * @param {number} value - Current rating (1-5)
 * @param {function} onChange - Callback when rating changes
 * @param {boolean} readOnly - Display only mode
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 */
export default function RatingStars({
    value = 0,
    onChange,
    readOnly = false,
    size = 'md'
}) {
    const [hoverValue, setHoverValue] = useState(0);

    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    const iconSize = sizes[size] || sizes.md;

    const handleClick = (rating) => {
        if (!readOnly && onChange) {
            onChange(rating);
        }
    };

    const handleMouseEnter = (rating) => {
        if (!readOnly) {
            setHoverValue(rating);
        }
    };

    const handleMouseLeave = () => {
        setHoverValue(0);
    };

    const displayValue = hoverValue || value;

    return (
        <div className="flex items-center gap-1" onMouseLeave={handleMouseLeave}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => handleClick(star)}
                    onMouseEnter={() => handleMouseEnter(star)}
                    disabled={readOnly}
                    className={`
            transition-all duration-150
            ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
            ${!readOnly && 'focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded'}
          `}
                    aria-label={`Rate ${star} stars`}
                >
                    <Star
                        className={`
              ${iconSize}
              transition-colors duration-150
              ${star <= displayValue
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-none text-gray-300'
                            }
            `}
                    />
                </button>
            ))}
        </div>
    );
}
