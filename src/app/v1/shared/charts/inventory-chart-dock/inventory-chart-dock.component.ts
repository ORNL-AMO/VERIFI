import { Component, input, output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({ selector: 'app-inventory-chart-dock', standalone: true, imports: [IconComponent],
  templateUrl: './inventory-chart-dock.component.html', styleUrls: ['./inventory-chart-dock.component.css'] })
export class InventoryChartDockComponent {
  readonly open = input(false);
  readonly disabled = input(false);
  readonly opened = output<void>();
  private pullStart?: number;
  startPull(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.pullStart = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }
  finishPull(event: PointerEvent): void {
    if (!this.disabled() && this.pullStart !== undefined && this.pullStart - event.clientY >= 35) this.opened.emit();
    this.pullStart = undefined;
  }
  cancelPull(): void { this.pullStart = undefined; }
}
