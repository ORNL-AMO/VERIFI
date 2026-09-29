import {
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
  afterNextRender,
  inject,
  signal
} from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export interface DataWorkbenchResource {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
}

@Component({
  selector: 'app-data-workbench-resource-switcher',
  templateUrl: './data-workbench-resource-switcher.component.html',
  styleUrls: ['./data-workbench-resource-switcher.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class DataWorkbenchResourceSwitcherComponent {
  private readonly injector = inject(Injector);

  @Input({ required: true }) resources: readonly DataWorkbenchResource[] = [];
  @Input({ required: true }) selectedId = '';
  @Input({ required: true }) currentLabel = '';
  @Input({ required: true }) ariaLabel = 'Switch resource';
  @Output() readonly resourceSelected = new EventEmitter<string>();

  @ViewChild('toggleButton') private readonly toggleButton?: ElementRef<HTMLButtonElement>;
  @ViewChildren('resourceItem') private readonly resourceButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  readonly open = signal(false);

  toggle(): void {
    if (this.open()) this.close(true);
    else this.openMenu();
  }

  openMenu(focus: 'selected' | 'first' | 'last' = 'selected'): void {
    if (this.resources.length < 2) return;
    this.open.set(true);
    afterNextRender(() => this.focusItem(focus), { injector: this.injector });
  }

  select(resourceId: string): void {
    this.resourceSelected.emit(resourceId);
    this.close(true);
  }

  close(restoreFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) {
      this.toggleButton?.nativeElement.focus();
      queueMicrotask(() => this.toggleButton?.nativeElement.focus());
    }
  }

  onToggleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    this.openMenu(event.key === 'ArrowUp' ? 'last' : 'first');
  }

  onMenuKeydown(event: KeyboardEvent): void {
    const buttons = this.resourceButtons?.toArray().map(item => item.nativeElement) ?? [];
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || buttons.length === 0) return;
    event.preventDefault();
    const activeIndex = buttons.findIndex(button => button === document.activeElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : event.key === 'ArrowDown'
          ? (activeIndex + 1 + buttons.length) % buttons.length
          : (activeIndex - 1 + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
  }

  private focusItem(target: 'selected' | 'first' | 'last'): void {
    const buttons = this.resourceButtons?.toArray().map(item => item.nativeElement) ?? [];
    if (buttons.length === 0) return;
    if (target === 'first') buttons[0].focus();
    else if (target === 'last') buttons[buttons.length - 1].focus();
    else (buttons.find(button => button.dataset['resourceId'] === this.selectedId) ?? buttons[0]).focus();
  }
}
