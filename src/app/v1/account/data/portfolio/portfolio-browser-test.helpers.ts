export function textContrast(element: HTMLElement): number {
  const context = document.createElement('canvas').getContext('2d')!;
  const luminance = (color: string) => {
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const style = getComputedStyle(element);
  const foreground = luminance(style.color);
  const background = luminance(style.backgroundColor);
  return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
}

export const PORTFOLIO_PALETTES = ['default', 'steel', 'blueprint', 'neon', 'aurora', 'forest'] as const;
