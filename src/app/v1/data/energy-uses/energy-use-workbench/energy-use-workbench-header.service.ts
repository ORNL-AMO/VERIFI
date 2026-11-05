import { Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { SettingsEditState } from '@app/v1/data/editing/settings-edit-session';
import type { EnergyUseSetupValidation } from '../models/energy-use-setup.models';

export interface EnergyUseHeaderEditor {
  readonly key: Signal<string>;
  readonly state: Signal<SettingsEditState>;
  readonly message: Signal<string>;
  readonly validation: Signal<EnergyUseSetupValidation>;
  readonly canRetry: Signal<boolean>;
  retry(): void;
}

/** One workbench lifetime; the routed editor supplies reactive header capabilities. */
@Injectable()
export class EnergyUseWorkbenchHeaderService {
  private readonly editorValue = signal<EnergyUseHeaderEditor | undefined>(undefined);
  readonly editor = this.editorValue.asReadonly();

  register(editor: EnergyUseHeaderEditor): () => void {
    this.editorValue.set(editor);
    return () => { if (this.editorValue() === editor) this.editorValue.set(undefined); };
  }
}
