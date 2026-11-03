import { Component, DestroyRef, ViewContainerRef, effect, inject } from '@angular/core';
import { ReportWorkbenchController, ReportSession } from '../report-workbench.controller';
import { ReportStageId } from '../report-workbench.models';

@Component({ selector: 'app-report-stage-outlet', standalone: false, template: '' })
export class ReportStageOutletComponent {
  private readonly container = inject(ViewContainerRef);
  private readonly workbench = inject(ReportWorkbenchController);
  private session?: ReportSession;
  private stage?: ReportStageId;
  constructor() {
    effect(() => {
      const session = this.workbench.session(), stage = this.workbench.host.stage();
      if (session === this.session && stage === this.stage) return;
      this.clear(); this.session = session; this.stage = stage;
      const component = session?.definition.stages[stage];
      if (component && session) session.mountedStage = this.container.createComponent(component, {
        injector: session.injector, environmentInjector: session.injector
      });
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }
  private clear(): void {
    if (this.session?.mountedStage && !this.session.mountedStage.hostView.destroyed) this.session.mountedStage.destroy();
    if (this.session) this.session.mountedStage = undefined;
    this.container.clear();
  }
}
