import { Component, DestroyRef, ElementRef, OnChanges, SimpleChanges, ViewChild, inject, input, output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export const FACILITY_POINTER_CLICK_DELAY = 500;

/** A native checkbox proposes an edit without taking ownership of confirmed selection. */
@Component({ selector: 'app-visualization-facility-card', standalone: false,
  templateUrl: './facility-card.component.html', styleUrls: ['./facility-card.component.css'] })
export class FacilityCardComponent implements OnChanges {
  readonly label = input.required<string>();
  readonly description = input('');
  readonly icon = input<IconName>('facility');
  readonly selected = input(false);
  readonly disabled = input(false);
  readonly busy = input(false);
  readonly uncheckLocked = input(false);
  readonly interactionKey = input<unknown>();
  readonly selectionRequested = output<boolean>();
  readonly onlyRequested = output<void>();
  readonly checked = new FormControl(false, { nonNullable: true });
  private readonly destroy = inject(DestroyRef);
  private pendingPointer?: ReturnType<typeof setTimeout>;
  private pendingSelection?: boolean;
  @ViewChild('checkbox') private checkbox?: ElementRef<HTMLInputElement>;
  @ViewChild('cardLabel') private cardLabel?: ElementRef<HTMLLabelElement>;

  constructor() {
    this.checked.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(selected => {
      this.checked.setValue(this.selected(), { emitEvent: false });
      if (this.busy()) return;
      this.cancelPointer();
      if (!this.disabled() && !this.uncheckLocked() && selected !== this.selected()) this.selectionRequested.emit(selected);
    });
    this.destroy.onDestroy(() => this.cancelPointer());
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (Object.keys(changes).some(name => name !== 'busy')) this.cancelPointer();
    this.checked.setValue(this.selected(), { emitEvent: false });
    this.disabled() || this.busy() || this.uncheckLocked() ? this.checked.disable({ emitEvent: false }) : this.checked.enable({ emitEvent: false });
    if (!this.busy() && this.pendingSelection !== undefined && this.pendingPointer === undefined) this.schedulePointer(0);
  }
  pointerClick(event: MouseEvent): void {
    if (this.busy()) { event.preventDefault(); return; }
    this.cancelPointer();
    if (event.detail === 0) return;
    event.preventDefault();
    if (!this.disabled()) this.focusCard();
    if (this.disabled() || this.uncheckLocked() || event.detail !== 1) return;
    this.pendingSelection = !this.selected();
    this.schedulePointer(FACILITY_POINTER_CLICK_DELAY);
  }
  doubleClick(event: MouseEvent): void {
    event.preventDefault();
    if (this.busy()) return;
    this.cancelPointer();
    if (!this.disabled()) { this.focusCard(); this.onlyRequested.emit(); }
  }
  private focusCard(): void {
    const checkbox = this.checkbox?.nativeElement;
    (checkbox && !checkbox.disabled ? checkbox : this.cardLabel?.nativeElement)?.focus({ preventScroll: true });
  }
  private cancelPointer(): void {
    if (this.pendingPointer !== undefined) clearTimeout(this.pendingPointer);
    this.pendingPointer = undefined;
    this.pendingSelection = undefined;
  }
  private schedulePointer(delay: number): void {
    this.pendingPointer = setTimeout(() => {
      this.pendingPointer = undefined;
      if (this.busy()) return;
      const selected = this.pendingSelection;
      this.pendingSelection = undefined;
      if (!this.disabled() && !this.uncheckLocked() && selected !== undefined) this.selectionRequested.emit(selected);
    }, delay);
  }
}
