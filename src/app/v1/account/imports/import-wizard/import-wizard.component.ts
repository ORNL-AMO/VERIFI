import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ImportSessionService } from '../import-session.service';
import { stepsForDraft } from '../import-workflow.config';
import { ImportWizardStateService } from './import-wizard-state.service';

@Component({
  selector: 'app-import-wizard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, IconComponent],
  providers: [ImportWizardStateService],
  templateUrl: './import-wizard.component.html',
  styleUrls: ['./import-wizard.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ImportWizardComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly unsaved = inject(UnsavedChangesService);
  readonly state = inject(ImportWizardStateService);
  readonly session = inject(ImportSessionService);
  private readonly subscription = new Subscription();
  private unregisterUnsaved?: () => void;

  ngOnInit(): void {
    this.unregisterUnsaved = this.unsaved.register(
      () => this.hasUnsavedChanges(),
      () => this.session.clear(),
      () => this.isNavigationBlocked()
    );
    this.subscription.add(this.route.paramMap.subscribe(params => {
      const draft = this.session.draft(params.get('fileId'));
      if (!draft) {
        this.redirectForMissingSession();
        return;
      }
      this.state.initialize(draft);
      this.syncChildStep();
    }));
    this.subscription.add(this.router.events.pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.syncChildStep()));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.unregisterUnsaved?.();
  }

  hasUnsavedChanges(): boolean { return this.state.hasUnsavedChanges(); }
  isNavigationBlocked(): boolean { return this.state.isNavigationBlocked(); }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges() || this.isNavigationBlocked()) event.preventDefault();
  }

  back(): void {
    const previous = this.state.previousStep();
    if (previous) this.goToStep(previous);
    else this.openUpload();
  }

  continue(): void {
    const next = this.state.completeCurrentStep();
    if (next) this.goToStep(next);
  }

  async commit(): Promise<void> {
    const next = await this.state.commit();
    if (next) this.goToStep(stepsForDraft(next)[0].id, next.id);
  }

  openUpload(): void {
    const accountGuid = this.state.workspace.account()?.guid;
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'upload']);
  }

  private syncChildStep(): void {
    const draft = this.state.draft();
    if (!draft) return;
    const requestedStep = this.route.firstChild?.snapshot.data['importStep'] as string | undefined;
    const allowedStep = this.state.allowedStep(requestedStep);
    if (requestedStep !== allowedStep) {
      this.goToStep(allowedStep);
      return;
    }
    this.state.activateStep(allowedStep);
  }

  private goToStep(stepId: string, fileId = this.state.draft()?.id): void {
    const accountGuid = this.state.workspace.account()?.guid;
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'file', fileId, stepId]);
  }

  private redirectForMissingSession(): void {
    const accountGuid = this.route.snapshot.parent?.parent?.paramMap.get('accountGuid')
      ?? this.state.workspace.account()?.guid;
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'upload'], {
      queryParams: { sessionLost: 1 }
    });
  }
}
