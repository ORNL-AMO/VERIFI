import { Injectable, Signal, computed, signal } from '@angular/core';

export interface ReportPresentationCapability {
  readonly available: Signal<boolean>;
  present(): void;
}

@Injectable()
export class ReportPresentationController implements ReportPresentationCapability {
  private readonly target = signal<ReportPresentationCapability | undefined>(undefined);
  readonly available = computed(() => this.target()?.available() ?? false);

  register(target: ReportPresentationCapability): () => void {
    this.target.set(target);
    return () => { if (this.target() === target) this.target.set(undefined); };
  }

  present(): void { if (this.available()) this.target()?.present(); }
}
