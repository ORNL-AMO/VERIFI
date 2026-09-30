import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, RouterStateSnapshot } from '@angular/router';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ImportSessionService } from '../import-session.service';
import { ImportWizardStateService } from './import-wizard-state.service';
import { ImportWizardComponent } from './import-wizard.component';

describe('ImportWizardComponent', () => {
  it('keeps navigation in the shell while delegating step completion to routed content state', () => {
    const router = { navigate: vi.fn(), events: { pipe: vi.fn() } };
    const state = {
      completeCurrentStep: vi.fn(() => 'meters'),
      draft: () => ({ id: 'draft-1' }),
      workspace: { account: () => ({ guid: 'account-1' }) },
      hasUnsavedChanges: vi.fn(() => true),
      isNavigationBlocked: vi.fn(() => false)
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: router },
        { provide: UnsavedChangesService, useValue: {} },
        { provide: ImportSessionService, useValue: {} },
        { provide: ImportWizardStateService, useValue: state }
      ]
    });
    const component = TestBed.runInInjectionContext(() => new ImportWizardComponent());

    component.continue();

    expect(state.completeCurrentStep).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1/workspace/account', 'account-1', 'imports', 'file', 'draft-1', 'meters'
    ]);
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('returns to the same account upload queue without prompting to discard the session', () => {
    const router = { navigate: vi.fn(), events: { pipe: vi.fn() } };
    const state = {
      draft: () => ({ id: 'draft-1' }),
      workspace: { account: () => ({ guid: 'account-1' }) },
      hasUnsavedChanges: vi.fn(() => true),
      isNavigationBlocked: vi.fn(() => false)
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: router },
        { provide: UnsavedChangesService, useValue: {} },
        { provide: ImportSessionService, useValue: {} },
        { provide: ImportWizardStateService, useValue: state }
      ]
    });
    const component = TestBed.runInInjectionContext(() => new ImportWizardComponent());
    const snapshot = (url: string) => ({ url } as RouterStateSnapshot);

    expect(component.canNavigateWithoutDiscard(snapshot('/v1/workspace/account/account-1/imports/upload'))).toBe(true);
    expect(component.canNavigateWithoutDiscard(snapshot('/v1/workspace/account/account-2/imports/upload'))).toBe(false);
    expect(component.canNavigateWithoutDiscard(snapshot('/v1/workspace/account/account-1/data/portfolio/facilities'))).toBe(false);
  });
});
