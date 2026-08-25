import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { vi } from 'vitest';
import { CreateAccountComponent } from './create-account.component';

describe('CreateAccountComponent', () => {
  let fixture: ComponentFixture<CreateAccountComponent>;
  let createAccount: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createAccount = vi.fn(async (account: IdbAccount) => ({ ...account, id: 1, guid: 'new-account' }));
    TestBed.configureTestingModule({
      imports: [CreateAccountComponent],
      providers: [
        { provide: ApplicationLifecycleService, useValue: { createAccount } }
      ]
    });
    fixture = TestBed.createComponent(CreateAccountComponent);
    fixture.detectChanges();
  });

  it('requires a nonblank account name', async () => {
    const component = fixture.componentInstance;
    component.createForm.controls.name.setValue('   ');

    await component.createAccount();

    expect(createAccount).not.toHaveBeenCalled();
    expect(component.accountNameInvalid).toBe(true);
  });

  it('creates an account with only the name changed and emits it', async () => {
    const component = fixture.componentInstance;
    const completed = vi.fn();
    component.completed.subscribe(completed);
    component.createForm.controls.name.setValue('  New Portfolio  ');

    await component.createAccount();

    const createdDraft = createAccount.mock.calls[0][0] as IdbAccount;
    expect(createdDraft.name).toBe('New Portfolio');
    expect(createdDraft.isSingleFacilityCompany).toBe(false);
    expect(completed).toHaveBeenCalledWith(expect.objectContaining({ guid: 'new-account', name: 'New Portfolio' }));
  });
});
