export interface GradientColor {
  from: string
  to: string
}

/** Standard 4-color gradient palette for quiz items and cards */
export const GRADIENT_COLORS: readonly GradientColor[] = [
  { from: 'from-primary-500', to: 'to-primary-600' },
  { from: 'from-accent-500', to: 'to-accent-600' },
  { from: 'from-green-500', to: 'to-green-600' },
  { from: 'from-purple-500', to: 'to-purple-600' },
] as const

/** 3-color gradient palette for language selection */
export const LANG_GRADIENT_COLORS: readonly GradientColor[] = [
  { from: 'from-primary-500', to: 'to-primary-600' },
  { from: 'from-accent-500', to: 'to-accent-600' },
  { from: 'from-green-500', to: 'to-green-600' },
] as const

/**
 * Get gradient color by index (cycles through available colors)
 */
export function getGradientColor(
  index: number,
  colors: readonly GradientColor[] = GRADIENT_COLORS
): GradientColor {
  return colors[index % colors.length]
}