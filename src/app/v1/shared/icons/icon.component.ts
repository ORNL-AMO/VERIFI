import { Component, Input, booleanAttribute } from '@angular/core';
import { HugeiconsIconComponent } from './hugeicons-icon.component';
import { ICON_REGISTRY, IconName } from './icon-registry';
import type { IconSvgObject } from './icon.types';
import { CUSTOM_ICONS } from './custom-icons';

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  imports: [HugeiconsIconComponent],
  template: `
    <hugeicons-icon
      [icon]="icon"
      [size]="size"
      color="currentColor"
      [strokeWidth]="resolvedStrokeWidth">
    </hugeicons-icon>
  `,
  host: {
    'class': 'v1-icon',
    '[class.v1-icon--spin]': 'spin',
    '[attr.aria-hidden]': 'decorative ? "true" : null',
    '[attr.aria-label]': 'decorative ? null : label',
    '[attr.role]': 'decorative ? null : "img"'
  }
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 16;
  @Input() strokeWidth?: number;
  @Input({ transform: booleanAttribute }) decorative = true;
  @Input() label?: string;
  @Input({ transform: booleanAttribute }) spin = false;

  get icon(): IconSvgObject {
    return ICON_REGISTRY[this.name];
  }

  get resolvedStrokeWidth(): number | undefined {
    // Custom designs may use finer detail strokes; Hugeicons keep the UI default.
    return this.strokeWidth ?? (Object.hasOwn(CUSTOM_ICONS, this.name) ? undefined : 1.75);
  }
}
