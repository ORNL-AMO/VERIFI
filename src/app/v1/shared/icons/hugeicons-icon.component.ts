import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconSvgAttributes, IconSvgElementName, IconSvgObject } from './icon.types';

type IconSvgElement = IconSvgAttributes & {
  readonly element: IconSvgElementName;
};

@Component({
  selector: 'hugeicons-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      [attr.color]="color"
      xmlns="http://www.w3.org/2000/svg">
      @for (element of elements; track $index) {
        @switch (element.element) {
          @case ('circle') {
            <circle
              [attr.cx]="element.cx"
              [attr.cy]="element.cy"
              [attr.r]="element.r"
              [attr.fill]="element.fill"
              [attr.opacity]="element.opacity"
              [attr.stroke]="element.stroke"
              [attr.stroke-linecap]="element.strokeLinecap"
              [attr.stroke-linejoin]="element.strokeLinejoin"
              [attr.stroke-width]="element.strokeWidth">
            </circle>
          }
          @case ('ellipse') {
            <ellipse
              [attr.cx]="element.cx"
              [attr.cy]="element.cy"
              [attr.rx]="element.rx"
              [attr.ry]="element.ry"
              [attr.fill]="element.fill"
              [attr.opacity]="element.opacity"
              [attr.stroke]="element.stroke"
              [attr.stroke-linecap]="element.strokeLinecap"
              [attr.stroke-linejoin]="element.strokeLinejoin"
              [attr.stroke-width]="element.strokeWidth">
            </ellipse>
          }
          @case ('rect') {
            <rect
              [attr.x]="element.x"
              [attr.y]="element.y"
              [attr.rx]="element.rx"
              [attr.ry]="element.ry"
              [attr.width]="element.width"
              [attr.height]="element.height"
              [attr.fill]="element.fill"
              [attr.opacity]="element.opacity"
              [attr.stroke]="element.stroke"
              [attr.stroke-linecap]="element.strokeLinecap"
              [attr.stroke-linejoin]="element.strokeLinejoin"
              [attr.stroke-width]="element.strokeWidth">
            </rect>
          }
          @case ('line') {
            <line
              [attr.x1]="element.x1"
              [attr.y1]="element.y1"
              [attr.x2]="element.x2"
              [attr.y2]="element.y2"
              [attr.opacity]="element.opacity"
              [attr.stroke]="element.stroke"
              [attr.stroke-linecap]="element.strokeLinecap"
              [attr.stroke-linejoin]="element.strokeLinejoin"
              [attr.stroke-width]="element.strokeWidth">
            </line>
          }
          @case ('polyline') {
            <polyline
              [attr.points]="element.points"
              [attr.fill]="element.fill"
              [attr.opacity]="element.opacity"
              [attr.stroke]="element.stroke"
              [attr.stroke-linecap]="element.strokeLinecap"
              [attr.stroke-linejoin]="element.strokeLinejoin"
              [attr.stroke-width]="element.strokeWidth">
            </polyline>
          }
          @case ('polygon') {
            <polygon
              [attr.points]="element.points"
              [attr.fill]="element.fill"
              [attr.opacity]="element.opacity"
              [attr.stroke]="element.stroke"
              [attr.stroke-linecap]="element.strokeLinecap"
              [attr.stroke-linejoin]="element.strokeLinejoin"
              [attr.stroke-width]="element.strokeWidth">
            </polygon>
          }
          @default {
            <path
              [attr.d]="element.d"
              [attr.fill]="element.fill"
              [attr.fill-rule]="element.fillRule"
              [attr.clip-rule]="element.clipRule"
              [attr.opacity]="element.opacity"
              [attr.stroke]="element.stroke"
              [attr.stroke-linecap]="element.strokeLinecap"
              [attr.stroke-linejoin]="element.strokeLinejoin"
              [attr.stroke-miterlimit]="element.strokeMiterlimit"
              [attr.stroke-width]="element.strokeWidth">
            </path>
          }
        }
      }
    </svg>
  `,
  host: {
    'style': 'display: inline-flex; align-items: center; justify-content: center;'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HugeiconsIconComponent {
  @Input() icon: IconSvgObject = [];
  @Input() size: number | string = 24;
  @Input() strokeWidth?: number | string;
  @Input() absoluteStrokeWidth = false;
  @Input() color = 'currentColor';

  get elements(): IconSvgElement[] {
    return this.icon.map(([element, attrs]) => ({
      ...attrs,
      element,
      fill: attrs.fill ?? 'none',
      stroke: attrs.stroke ?? 'currentColor',
      strokeWidth: this.resolvedStrokeWidth(attrs.strokeWidth)
    }));
  }

  private resolvedStrokeWidth(defaultStrokeWidth: IconSvgAttributes['strokeWidth']): IconSvgAttributes['strokeWidth'] {
    if (this.strokeWidth === undefined) {
      return defaultStrokeWidth;
    }
    if (!this.absoluteStrokeWidth) {
      return this.strokeWidth;
    }
    return (Number(this.strokeWidth) * 24) / Number(this.size);
  }
}
