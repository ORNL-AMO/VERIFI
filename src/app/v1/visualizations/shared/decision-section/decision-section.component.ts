import { Component, ElementRef, ViewChild, input, output } from '@angular/core';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

@Component({ selector: 'app-visualization-decision-section', standalone: false,
  templateUrl: './decision-section.component.html', styleUrl: './decision-section.component.css' })
export class DecisionSectionComponent {
  readonly nodeId = input.required<string>();
  readonly label = input.required<string>();
  readonly summary = input('');
  readonly icon = input<IconName>('settingsSliders');
  readonly expanded = input(false);
  readonly attention = input(false);
  readonly expandedChange = output<boolean>();
  @ViewChild('body') private body?: ElementRef<HTMLElement>;

  toggle(button: HTMLButtonElement): void {
    const body = this.body?.nativeElement;
    if (this.expanded() && body?.contains(body.ownerDocument.activeElement)) button.focus();
    this.expandedChange.emit(!this.expanded());
  }
}
