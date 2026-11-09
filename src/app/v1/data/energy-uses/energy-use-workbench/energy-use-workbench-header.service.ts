import { Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { SettingsEditState } from '@app/v1/data/editing/settings-edit-session';

export interface EnergyUseHeaderEditor {
  readonly key: Signal<string>;
  readonly state: Signal<SettingsEditState>;
  readonly dirty: Signal<boolean>;
  readonly blocked: Signal<boolean>;
  readonly message: Signal<string>;
  readonly canRetry: Signal<boolean>;
  retry(): void;
}

export interface EnergyUseCreationAction {
  readonly canCreate: Signal<boolean>;
  create(): void;
}

/** One workbench lifetime; the routed editor supplies reactive header capabilities. */
@Injectable()
export class EnergyUseWorkbenchHeaderService {
  private readonly creationValue = signal<EnergyUseCreationAction | undefined>(undefined);
  readonly creation = this.creationValue.asReadonly();
  registerCreation(action: EnergyUseCreationAction): () => void {
    this.creationValue.set(action);
    return () => { if (this.creationValue() === action) this.creationValue.set(undefined); };
  }
  private readonly editorValue = signal<EnergyUseHeaderEditor | undefined>(undefined);
  readonly editor = this.editorValue.asReadonly();

  register(editor: EnergyUseHeaderEditor): () => void {
    this.editorValue.set(editor);
    return () => { if (this.editorValue() === editor) this.editorValue.set(undefined); };
  }
}
