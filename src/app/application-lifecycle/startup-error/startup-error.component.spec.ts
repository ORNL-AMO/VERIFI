import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AppStartupError } from '../application-lifecycle.models';
import { DatabaseResetService } from '../database-reset.service';
import { MigrationRecoveryService } from '../recovery/migration-recovery.service';
import { StartupErrorComponent } from './startup-error.component';

describe('StartupErrorComponent', () => {
  let fixture: ComponentFixture<StartupErrorComponent>;
  let component: StartupErrorComponent;
  let migrationRecovery: { exportSnapshot: ReturnType<typeof vi.fn> };
  let databaseReset: { resetAndRestart: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    migrationRecovery = { exportSnapshot: vi.fn() };
    databaseReset = { resetAndRestart: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([])],
      declarations: [StartupErrorComponent],
      providers: [
        { provide: MigrationRecoveryService, useValue: migrationRecovery },
        { provide: DatabaseResetService, useValue: databaseReset }
      ]
    });
    fixture = TestBed.createComponent(StartupErrorComponent);
    component = fixture.componentInstance;
  });

  it('hides recovery actions for non-migration failures', () => {
    renderError('database');

    expect(fixture.nativeElement.querySelector('.recovery-panel')).toBeNull();
  });

  it('shows recovery actions and help desk instructions for migration failures', () => {
    renderError('migrations');

    expect(buttonNamed('Save recovery snapshot')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('sensitive business information');
    const helpDeskLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.recovery-panel a[href="mailto:verifi-help@ornl.gov"]'
    );
    expect(helpDeskLink).not.toBeNull();
    expect(helpDeskLink.textContent?.trim()).toBe('verifi-help@ornl.gov');
    expect(fixture.nativeElement.textContent).toContain(
      'Do not reset the database until the help desk confirms that your snapshot can be used.'
    );
  });

  it('emits retry requests while recovery is idle', () => {
    renderError('migrations');
    const retryRequested = vi.spyOn(component.retryRequested, 'emit');

    buttonNamed('Retry').click();

    expect(retryRequested).toHaveBeenCalledOnce();
  });

  it('offers reset after downloading the browser recovery snapshot', async () => {
    renderError('migrations');
    migrationRecovery.exportSnapshot.mockResolvedValue({
      status: 'saved', snapshot: { snapshotId: 'snapshot', recordCounts: { accounts: 1 } }, fileName: 'recovery.json'
    });

    buttonNamed('Save recovery snapshot').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(buttonNamed('Reset local database')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Recovery snapshot downloaded');
  });

  it('offers reset after saving the Electron recovery snapshot', async () => {
    renderError('migrations');
    migrationRecovery.exportSnapshot.mockResolvedValue({
      status: 'saved', snapshot: { snapshotId: 'snapshot' },
      fileName: 'recovery.json', filePath: '/tmp/recovery.json'
    });

    buttonNamed('Save recovery snapshot').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(buttonNamed('Reset local database')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('/tmp/recovery.json');
  });

  it('requires a second destructive confirmation and reports reset failure', async () => {
    renderError('migrations');
    migrationRecovery.exportSnapshot.mockResolvedValue({
      status: 'saved', snapshot: { snapshotId: 'snapshot' }, fileName: 'recovery.json'
    });
    databaseReset.resetAndRestart.mockResolvedValue(false);
    buttonNamed('Save recovery snapshot').click();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonNamed('Reset local database').click();
    fixture.detectChanges();
    expect(buttonNamed('Reset database and restart')).not.toBeNull();

    buttonNamed('Reset database and restart').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(databaseReset.resetAndRestart).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('existing data remains in place');
  });

  function renderError(step: 'database' | 'migrations'): void {
    fixture.componentRef.setInput('error', startupError(step));
    fixture.detectChanges();
  }

  function buttonNamed(name: string): HTMLButtonElement | null {
    return [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === name) ?? null;
  }
});

function startupError(step: 'database' | 'migrations'): AppStartupError {
  return { step, message: 'Startup failed.', retryable: true, cause: new Error('cause') };
}
