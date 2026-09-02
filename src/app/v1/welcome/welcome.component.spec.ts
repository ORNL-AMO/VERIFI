import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { EmailListSubscribeService } from '@shared/email-list-subscribe/email-list-subscribe.service';
import { BehaviorSubject, of } from 'rxjs';
import { WorkspaceNavigationService } from '../shell/workspace-navigation.service';
import { NotificationService } from '../shared/notifications/notification.service';
import { WelcomeComponent } from './welcome.component';

describe('WelcomeComponent', () => {
  let fixture: ComponentFixture<WelcomeComponent>;
  let usableAccounts: ReturnType<typeof signal>;
  let navigation: {
    openWorkspace: ReturnType<typeof vi.fn>;
    openFacility: ReturnType<typeof vi.fn>;
    openAccountData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    usableAccounts = signal([
      { id: 1, guid: 'account-a', name: 'Account A', modifiedDate: new Date('2026-01-02'), isSingleFacilityCompany: false },
      { id: 2, guid: 'account-b', name: 'Account B', modifiedDate: new Date('2026-03-04'), isSingleFacilityCompany: true }
    ]);
    navigation = {
      openWorkspace: vi.fn().mockResolvedValue(undefined),
      openFacility: vi.fn().mockResolvedValue(undefined),
      openAccountData: vi.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), WelcomeComponent],
      providers: [
        { provide: ApplicationLifecycleService, useValue: { usableAccounts } },
        { provide: WorkspaceNavigationService, useValue: navigation },
        {
          provide: EmailListSubscribeService,
          useValue: {
            submittedStatus: new BehaviorSubject(undefined),
            checkEmailValid: vi.fn(() => undefined),
            submitSubscriberEmail: vi.fn(() => of(undefined))
          }
        }
      ]
    });
    fixture = TestBed.createComponent(WelcomeComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(NotificationService).dismissAll();
  });

  it('opens the selected welcome panel from its graphic tile', () => {
    const importTile: HTMLButtonElement | undefined = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button.v1-welcome__action'))
      .find(button => button.textContent?.includes('Import'));

    importTile?.click();

    expect(fixture.componentInstance.activePanel()).toBe('import');
  });

  it('opens facility Home after single-facility workspace creation', async () => {
    await fixture.componentInstance.openCreatedOrImportedAccount({
      path: 'singleFacility',
      account: { guid: 'account-new', name: 'New Site' } as any,
      facility: { guid: 'facility-new', name: 'New Site' } as any
    });

    expect(navigation.openFacility).toHaveBeenCalledWith('facility-new');
    expect(navigation.openWorkspace).not.toHaveBeenCalled();
  });

  it('mounts the notification host and shows account creation feedback', async () => {
    await fixture.componentInstance.openCreatedOrImportedAccount({
      path: 'portfolio',
      account: { guid: 'account-new', name: 'New Portfolio' } as any
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-notification-toast-host')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-toast--success')?.textContent).toContain('Account created');
    expect(fixture.nativeElement.querySelector('.v1-toast--success')?.textContent).toContain('New Portfolio');
  });

  it('opens the workspace default after portfolio creation or existing import paths', async () => {
    await fixture.componentInstance.openCreatedOrImportedAccount({
      path: 'portfolio',
      account: { guid: 'account-new', name: 'New Portfolio' } as any
    });
    await fixture.componentInstance.openCreatedOrImportedAccount({ guid: 'account-import', name: 'Imported' } as any);

    expect(navigation.openAccountData).toHaveBeenCalledWith('account-new');
    expect(navigation.openWorkspace).toHaveBeenCalledWith('account-import');
  });

  it('renders existing accounts and opens the selected account', async () => {
    const buttons: Array<HTMLButtonElement> = Array.from(fixture.nativeElement.querySelectorAll('.v1-account-row'));
    expect(buttons.map(button => button.textContent)).toEqual([
      expect.stringContaining('Account B'),
      expect.stringContaining('Account A')
    ]);

    buttons[0].click();
    await fixture.whenStable();

    expect(navigation.openWorkspace).toHaveBeenCalledWith('account-b');
  });

  it('keeps long account names accessible while truncating visually', () => {
    const longName = 'A very long manufacturing account name that should remain fully available to assistive technology';
    usableAccounts.set([
      { id: 3, guid: 'account-long', name: longName, modifiedDate: new Date('2026-04-05'), isSingleFacilityCompany: false }
    ]);
    fixture.detectChanges();

    const row: HTMLButtonElement = fixture.nativeElement.querySelector('.v1-account-row');
    expect(row.getAttribute('aria-label')).toBe(`Open ${longName} in v1 workspace`);
    expect(row.querySelector('.v1-account-row__summary strong')?.textContent).toContain(longName);
  });

  it('shows a v1 setup path when no accounts exist', () => {
    usableAccounts.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-empty-state')).toBeTruthy();
  });

  it('disables the recent account action when busy', () => {
    const component = fixture.componentInstance;
    const recentButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.v1-welcome__hero-actions button');

    expect(recentButton().disabled).toBe(false);

    component.loadingAccountGuid.set('account-a');
    fixture.detectChanges();
    expect(recentButton().disabled).toBe(true);
  });

  it('hides the recent account action when no accounts exist', () => {
    usableAccounts.set([]);
    fixture.detectChanges();
    const recentButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.v1-welcome__hero-actions button');
    expect(recentButton).toBeNull();
  });

  it('disables account rows while opening a workspace', () => {
    const component = fixture.componentInstance;
    const accountRows = (): Array<HTMLButtonElement> => Array.from(fixture.nativeElement.querySelectorAll('.v1-account-row'));

    expect(accountRows().every(row => row.disabled)).toBe(false);

    component.loadingAccountGuid.set('account-b');
    fixture.detectChanges();

    expect(accountRows().every(row => row.disabled)).toBe(true);
    expect(accountRows()[0].textContent).toContain('Opening');
  });

  it('shows an error if an account cannot be opened', async () => {
    navigation.openWorkspace.mockRejectedValueOnce(new Error('nope'));

    const buttons: Array<HTMLButtonElement> = Array.from(fixture.nativeElement.querySelectorAll('.v1-account-row'));
    buttons[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-alert--danger')?.textContent).toContain('Account B could not be opened');
  });
});
