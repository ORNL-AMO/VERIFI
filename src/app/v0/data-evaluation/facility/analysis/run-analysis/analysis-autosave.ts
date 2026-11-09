import { signal } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import * as _ from 'lodash';

/** Local draft lifetime for the legacy analysis forms. Durable writes remain in the command boundary. */
export class AnalysisAutosave<T> {
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly error = signal<string | undefined>(undefined);
  private baseline: T;
  private latest: { value: T; valid: boolean };
  private timer: ReturnType<typeof setTimeout>;
  private flight: Promise<boolean>;
  private flightContext: number;
  private context = 0;
  private discarding = false;
  private leaving: Promise<boolean>;

  constructor(private readonly persist: (value: T, baseline: T) => Promise<void>) { }

  get value(): T { return _.cloneDeep(this.latest?.value); }
  get hasPending(): boolean { return this.dirty() || this.saving(); }
  get valid(): boolean { return this.latest?.valid ?? true; }

  hydrate(value: T, valid: boolean): void {
    this.cancelTimer();
    this.context++;
    this.baseline = _.cloneDeep(value);
    this.latest = { value: _.cloneDeep(value), valid };
    this.dirty.set(false);
    this.error.set(undefined);
  }

  capture(value: T, valid: boolean, immediate = false): Promise<boolean> {
    this.cancelTimer();
    if (!this.latest || !_.isEqual(this.latest.value, value)) { this.error.set(undefined); }
    this.latest = { value: _.cloneDeep(value), valid };
    this.dirty.set(!_.isEqual(this.baseline, value));
    if (immediate) { return this.flush(false); }
    if (valid && this.dirty()) { this.timer = setTimeout(() => { this.timer = undefined; void this.flush(false); }, 300); }
    return Promise.resolve(!this.dirty());
  }

  async flush(immediate = true): Promise<boolean> {
    if (immediate) { this.cancelTimer(); }
    if (!immediate && this.timer) { return !this.dirty(); }
    if (this.discarding) { return false; }
    if (this.flight) {
      const context = this.context;
      const flightContext = this.flightContext;
      const saved = await this.flight;
      return context === this.context && (saved || flightContext !== context) && !this.discarding ? this.flush(immediate) : false;
    }
    if (!this.dirty()) { return true; }
    if (!this.latest.valid) { return false; }
    const value = _.cloneDeep(this.latest.value);
    const baseline = _.cloneDeep(this.baseline);
    const context = this.context;
    this.saving.set(true);
    this.error.set(undefined);
    const flight = (async () => {
      try {
        await this.persist(value, baseline);
        if (context === this.context) {
          this.baseline = value;
          this.dirty.set(!_.isEqual(this.latest.value, value));
        }
        return true;
      } catch {
        if (context === this.context) { this.error.set('Changes could not be saved. Try again.'); }
        return false;
      }
    })();
    this.flightContext = context;
    this.flight = flight;
    const saved = await flight;
    if (this.flight === flight) {
      this.flight = undefined;
      this.saving.set(false);
    }
    return saved && context === this.context && !this.discarding ? this.flush(immediate) : false;
  }

  async discard(): Promise<void> {
    this.cancelTimer();
    this.discarding = true;
    const context = this.context;
    await this.flight;
    if (context !== this.context) { this.discarding = false; return; }
    this.latest = { value: _.cloneDeep(this.baseline), valid: true };
    this.dirty.set(false);
    this.error.set(undefined);
    this.discarding = false;
  }

  canDeactivate(guard: RouterGuardService, restore: (value: T) => void): Promise<boolean> {
    if (!this.leaving) {
      this.leaving = this.decideLeave(guard, restore).finally(() => { this.leaving = undefined; });
    }
    return this.leaving;
  }

  private async decideLeave(guard: RouterGuardService, restore: (value: T) => void, context = this.context): Promise<boolean> {
    if (context !== this.context) return false;
    if (!this.error() && await this.flush()) { return context === this.context; }
    if (context !== this.context) return false;
    const action = firstValueFrom(guard.getModalAction().pipe(take(1)));
    guard.setShowSave(this.valid);
    guard.setShowModal(true);
    const choice = await action;
    if (context !== this.context) return false;
    switch (choice) {
      case 'save':
        if (await this.flush()) return context === this.context;
        return this.decideLeave(guard, restore, context);
      case 'discard':
        await this.discard();
        if (context !== this.context) return false;
        restore(this.value);
        return true;
      default: return false;
    }
  }

  destroy(): void { this.cancelTimer(); this.context++; }

  private cancelTimer(): void { clearTimeout(this.timer); this.timer = undefined; }
}
