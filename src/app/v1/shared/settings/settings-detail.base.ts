import { Directive, OnDestroy } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

export type SettingsSaveState = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DEBOUNCE_MS = 600;

@Directive()
export abstract class SettingsDetailBase implements OnDestroy {
  saveState: SettingsSaveState = 'idle';
  saveMessage = '';
  saveError = '';

  protected skipNextWorkspaceRefresh = false;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    this.clearDebounce();
    this.clearIdleTimer();
  }

  protected scheduleSave(save: () => Promise<void>): void {
    this.clearDebounce();
    this.debounceTimer = setTimeout(() => {
      void save();
    }, SAVE_DEBOUNCE_MS);
  }

  protected flushSave(save: () => Promise<void>): void {
    if (!this.debounceTimer) {
      return;
    }
    this.clearDebounce();
    void save();
  }

  protected async runSave(label: string, save: () => Promise<void>, warningLabel: string): Promise<void> {
    this.clearIdleTimer();
    this.saveState = 'saving';
    this.saveError = '';
    this.saveMessage = label;
    try {
      this.skipNextWorkspaceRefresh = true;
      await save();
      this.saveMessage = 'Saved';
      this.saveState = 'saved';
      this.idleTimer = setTimeout(() => {
        this.saveState = 'idle';
      }, 2500);
    } catch (error) {
      this.skipNextWorkspaceRefresh = false;
      this.saveMessage = '';
      this.saveError = 'Changes could not be saved. Please try again.';
      this.saveState = 'error';
      console.warn(`${warningLabel} save failed.`, error);
    }
  }

  protected setFormEnabled(form: FormGroup | undefined, enabled: boolean): void {
    if (!form) {
      return;
    }
    if (enabled && form.disabled) {
      form.enable({ emitEvent: false });
    } else if (!enabled && form.enabled) {
      form.disable({ emitEvent: false });
    }
  }

  protected setControlEnabled(control: AbstractControl | undefined, enabled: boolean): void {
    if (!control) {
      return;
    }
    if (enabled && control.disabled) {
      control.enable({ emitEvent: false });
    } else if (!enabled && control.enabled) {
      control.disable({ emitEvent: false });
    }
  }

  protected setControlsEnabled(form: FormGroup | undefined, controlNames: string[], enabled: boolean): void {
    controlNames.forEach(controlName => this.setControlEnabled(form?.controls[controlName], enabled));
  }

  private clearDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }
}
