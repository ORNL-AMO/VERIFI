import { Directive, OnDestroy, inject } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';

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
  private editor?: { form: FormGroup; scopeGuid: string; savedValue: unknown; save: () => Promise<void> };
  private readonly pendingSaves = new Set<Promise<void>>();
  private readonly unregisterDraft = inject(UnsavedChangesService).register(
    () => this.hasUnsavedChanges(),
    () => this.discardSettingsDraft(),
    () => this.pendingSaves.size > 0,
    () => this.flushSettingsDraft()
  );

  ngOnDestroy(): void {
    this.unregisterDraft();
    this.clearDebounce();
    this.clearIdleTimer();
  }

  protected trackSettingsForm(form: FormGroup, scopeGuid: string, save: () => Promise<void>): void {
    this.editor = { form, scopeGuid, savedValue: structuredClone(form.getRawValue()), save };
  }

  protected shouldRefreshSettingsForm(scopeGuid: string): boolean {
    if (this.editor?.scopeGuid !== scopeGuid) {
      this.clearDebounce();
      this.skipNextWorkspaceRefresh = false;
      return true;
    }
    if (this.skipNextWorkspaceRefresh) {
      this.skipNextWorkspaceRefresh = false;
      return false;
    }
    return !this.hasUnsavedChanges() && this.pendingSaves.size === 0;
  }

  hasUnsavedChanges(): boolean {
    return !!this.editor && JSON.stringify(this.editor.form.getRawValue()) !== JSON.stringify(this.editor.savedValue);
  }

  private discardSettingsDraft(): void {
    this.clearDebounce();
    if (this.pendingSaves.size || !this.editor) return;
    this.editor.form.reset(structuredClone(this.editor.savedValue), { emitEvent: false });
  }

  private async flushSettingsDraft(): Promise<boolean> {
    this.clearDebounce();
    await Promise.all([...this.pendingSaves]);
    if (!this.hasUnsavedChanges()) return true;
    const editor = this.editor;
    if (!editor || editor.form.disabled || editor.form.invalid || editor.form.pending) {
      editor?.form.markAllAsTouched();
      return false;
    }
    await editor.save();
    return !this.hasUnsavedChanges() && this.pendingSaves.size === 0;
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

  protected async runSave(label: string, save: () => Promise<void>, savesForm = false, warningLabel = 'Settings'): Promise<void> {
    const pending = this.persistSettings(label, save, warningLabel, savesForm);
    this.pendingSaves.add(pending);
    try {
      await pending;
    } finally {
      this.pendingSaves.delete(pending);
    }
  }

  private async persistSettings(label: string, save: () => Promise<void>, warningLabel: string, savesForm: boolean): Promise<void> {
    const editor = savesForm ? this.editor : undefined;
    const savedValue = editor ? structuredClone(editor.form.getRawValue()) : undefined;
    this.clearIdleTimer();
    this.saveState = 'saving';
    this.saveError = '';
    this.saveMessage = label;
    try {
      this.skipNextWorkspaceRefresh = true;
      await save();
      if (editor && this.editor === editor) {
        editor.savedValue = savedValue;
        if (!this.hasUnsavedChanges()) editor.form.markAsPristine();
      }
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
