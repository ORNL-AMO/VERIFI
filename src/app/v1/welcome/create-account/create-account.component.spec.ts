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
