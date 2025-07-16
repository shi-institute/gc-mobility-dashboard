/**
 * Converts an input rgb or rgba color string to an rgba string with the specified opacity.
 */
export function withOpacity(color: string, opacity: number) {
  const rgba = color.match(/rgba?\((\d+), (\d+), (\d+)(?:, (\d?\.?\d+)?)?\)/);
  if (!rgba) {
    throw new Error(`Invalid color format: ${color}`);
  }
  const [r, g, b] = rgba.slice(1, 4).map(Number);
  const a = rgba[4] ? Number(rgba[4]) : opacity;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
