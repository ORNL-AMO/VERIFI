export type IconSvgAttributeValue = string | number | undefined;

export type IconSvgElementName = 'path' | 'circle' | 'ellipse' | 'rect' | 'line' | 'polyline' | 'polygon';

export type IconSvgAttributes = {
  readonly d?: IconSvgAttributeValue;
  readonly cx?: IconSvgAttributeValue;
  readonly cy?: IconSvgAttributeValue;
  readonly r?: IconSvgAttributeValue;
  readonly rx?: IconSvgAttributeValue;
  readonly ry?: IconSvgAttributeValue;
  readonly x?: IconSvgAttributeValue;
  readonly y?: IconSvgAttributeValue;
  readonly x1?: IconSvgAttributeValue;
  readonly y1?: IconSvgAttributeValue;
  readonly x2?: IconSvgAttributeValue;
  readonly y2?: IconSvgAttributeValue;
  readonly width?: IconSvgAttributeValue;
  readonly height?: IconSvgAttributeValue;
  readonly points?: IconSvgAttributeValue;
  readonly fill?: IconSvgAttributeValue;
  readonly fillRule?: IconSvgAttributeValue;
  readonly clipRule?: IconSvgAttributeValue;
  readonly opacity?: IconSvgAttributeValue;
  readonly stroke?: IconSvgAttributeValue;
  readonly strokeLinecap?: IconSvgAttributeValue;
  readonly strokeLinejoin?: IconSvgAttributeValue;
  readonly strokeMiterlimit?: IconSvgAttributeValue;
  readonly strokeWidth?: IconSvgAttributeValue;
};

export type IconSvgObject = readonly (readonly [IconSvgElementName, IconSvgAttributes])[];
