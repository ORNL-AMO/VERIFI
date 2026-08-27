import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { vi } from 'vitest';
import { CreateAccountComponent } from './create-account.component';

describe('CreateAccountComponent', () => {
  let fixture: ComponentFixture<CreateAccountComponent>;
  let createAccount: ReturnType<typeof vi.fn>;
  let execute: ReturnType<typeof vi.fn>;
  let addFacility: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createAccount = vi.fn(async (account: IdbAccount) => ({ ...account, id: 1, guid: 'new-account' }));
    addFacility = vi.fn(async (facility: IdbFacility) => ({
      facility: { ...facility, id: 2, guid: 'new-facility' }
    }));
    execute = vi.fn(async (_options, persist) => ({ value: await persist() }));
    TestBed.configureTestingModule({
      imports: [CreateAccountComponent],
      providers: [
        { provide: ApplicationLifecycleService, useValue: { createAccount } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            accountAnalyses: vi.fn(() => []),
            accountReports: vi.fn(() => [])
          }
        },
        { provide: WorkspaceCommandBoundary, useValue: { execute } },
        { provide: FacilityCommandHandler, useValue: { add: addFacility } }
      ]
    });
    fixture = TestBed.createComponent(CreateAccountComponent);
    fixture.detectChanges();
  });

  it('uses the guided singleFacility path as the default creation path', () => {
    expect(fixture.componentInstance.selectedPath).toBe('singleFacility');
  });

  it('requires a nonblank account name', async () => {
    const component = fixture.componentInstance;
    component.createForm.controls.name.setValue('   ');

    await component.createAccount();

    expect(createAccount).not.toHaveBeenCalled();
    expect(addFacility).not.toHaveBeenCalled();
    expect(component.accountNameInvalid).toBe(true);
  });

  it('creates a guided bills workspace with a starter facility and emits it', async () => {
    const component = fixture.componentInstance;
    const completed = vi.fn();
    component.completed.subscribe(completed);
    component.createForm.controls.name.setValue('  Bill Site  ');

    await component.createAccount();

    const createdDraft = createAccount.mock.calls[0][0] as IdbAccount;
    const facilityDraft = addFacility.mock.calls[0][0] as IdbFacility;
    expect(createdDraft.name).toBe('Bill Site');
    expect(createdDraft.isSingleFacilityCompany).toBe(true);
    expect(facilityDraft.name).toBe('Bill Site');
    expect(facilityDraft.accountId).toBe('new-account');
  });

  it('creates a single-facility workspace with a starter facility and emits it', async () => {
    const component = fixture.componentInstance;
    const completed = vi.fn();
    component.completed.subscribe(completed);
    component.setPath('singleFacility');
    component.createForm.controls.name.setValue('  One Site  ');

    await component.createAccount();

    expect((createAccount.mock.calls[0][0] as IdbAccount).isSingleFacilityCompany).toBe(true);
    expect(addFacility).toHaveBeenCalledTimes(1);
    expect(completed).toHaveBeenCalledWith({
      path: 'singleFacility',
      account: expect.objectContaining({ guid: 'new-account', name: 'One Site' }),
      facility: expect.objectContaining({ guid: 'new-facility', name: 'One Site' })
    });
  });

  it('creates a portfolio account without a starter facility and emits it', async () => {
    const component = fixture.componentInstance;
    const completed = vi.fn();
    component.completed.subscribe(completed);
    component.setPath('portfolio');
    component.createForm.controls.name.setValue('  New Portfolio  ');

    await component.createAccount();

    const createdDraft = createAccount.mock.calls[0][0] as IdbAccount;
    expect(createdDraft.name).toBe('New Portfolio');
    expect(createdDraft.isSingleFacilityCompany).toBe(false);
    expect(addFacility).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledWith({
      path: 'portfolio',
      account: expect.objectContaining({ guid: 'new-account', name: 'New Portfolio' })
    });
  });

  it('lets users recover when the account is created but the starter facility fails', async () => {
    const component = fixture.componentInstance;
    const completed = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    component.completed.subscribe(completed);
    component.createForm.controls.name.setValue('  Recovery Site  ');
    addFacility.mockRejectedValueOnce(new Error('facility failed'));

    try {
      await component.createAccount();

      expect(createAccount).toHaveBeenCalledTimes(1);
      expect(component.createError).toContain('Workspace was created');
      expect(component.pendingStarterAccount?.name).toBe('Recovery Site');
      expect(completed).not.toHaveBeenCalled();

      await component.createAccount();

      expect(createAccount).toHaveBeenCalledTimes(1);
      expect(addFacility).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  describe('drawer focus lifecycle', () => {
    function dispatchKey(el: HTMLElement, key: string, shiftKey = false): void {
      el.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
    }

    it('emits closed when Escape is pressed on the drawer', () => {
      const closed = vi.fn();
      fixture.componentInstance.closed.subscribe(closed);
      const aside = fixture.nativeElement.querySelector('aside') as HTMLElement;

      dispatchKey(aside, 'Escape');

      expect(closed).toHaveBeenCalled();
    });

    it('does not emit closed on Escape while creating', () => {
      const component = fixture.componentInstance;
      // Set isCreating without re-running CD — the close() guard is pure logic.
      component.isCreating = true;
      const closed = vi.fn();
      component.closed.subscribe(closed);
      const aside = fixture.nativeElement.querySelector('aside') as HTMLElement;

      dispatchKey(aside, 'Escape');

      expect(closed).not.toHaveBeenCalled();
    });
  });
});
