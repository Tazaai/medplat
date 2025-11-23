// Utility function for merging classNames (cn = className)
// Commonly used with Tailwind CSS and shadcn/ui components

/**
 * Merges class names together, handling conditional classes
 * @param {...(string | undefined | null | false)} inputs - Class names to merge
 * @returns {string} Merged class names
 */
export function cn(...inputs) {
  return inputs
    .filter(Boolean)
    .join(' ')
    .split(' ')
    .filter((cls, index, arr) => arr.indexOf(cls) === index) // Remove duplicates
    .join(' ')
    .trim();
}

