import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { EmailListSubscribeService } from '@shared/email-list-subscribe/email-list-subscribe.service';
import { BehaviorSubject, of } from 'rxjs';
import { WorkspaceNavigationService } from '../shell/workspace-navigation.service';
import { WelcomeComponent } from './welcome.component';

describe('WelcomeComponent', () => {
  let fixture: ComponentFixture<WelcomeComponent>;
  let usableAccounts: ReturnType<typeof signal>;
  let navigation: { openAccount: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    usableAccounts = signal([
      { id: 1, guid: 'account-a', name: 'Account A', modifiedDate: new Date('2026-01-02'), isSingleFacilityCompany: false },
      { id: 2, guid: 'account-b', name: 'Account B', modifiedDate: new Date('2026-03-04'), isSingleFacilityCompany: true }
    ]);
    navigation = { openAccount: vi.fn().mockResolvedValue(undefined) };

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

  it('renders the P1-derived welcome content and support sections', () => {
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelector('#v1-welcome-title')?.textContent).toContain('VERIFI');
    expect(text).toContain('Track corporate and facility utility data');
    expect(text).toContain('Create New Account');
    expect(text).toContain('Upload Account Backup');
    expect(text).toContain('Load Example Account');
    expect(text).toContain('ORNL Industrial Resources');
    expect(text).toContain('Contact and Feedback');
    expect(text).toContain('Experience switcher');
  });

  it('uses semantic button colors for welcome entry actions', () => {
    const actionButtons: Array<HTMLButtonElement> = Array.from(fixture.nativeElement.querySelectorAll('.v1-welcome__action button'));
    const buttonByText = (label: string): HTMLButtonElement | undefined =>
      actionButtons.find(button => button.textContent?.includes(label));

    expect(buttonByText('Create account')?.classList.contains('v1-btn--primary')).toBe(true);
    expect(buttonByText('Upload backup')?.classList.contains('v1-btn--secondary')).toBe(true);
    expect(buttonByText('Load example')?.classList.contains('v1-btn--secondary')).toBe(true);
    expect(buttonByText('Load example')?.classList.contains('v1-btn--success')).toBe(false);
  });

  it('shows a single create account button when accounts exist', () => {
    const createButtons: Array<HTMLButtonElement> = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .filter(button => button.textContent?.trim() === 'Create account');

    expect(createButtons).toHaveLength(1);
    expect(createButtons[0].classList.contains('v1-btn--primary')).toBe(true);
  });

  it('renders existing accounts and opens the selected account', async () => {
    const buttons: Array<HTMLButtonElement> = Array.from(fixture.nativeElement.querySelectorAll('.v1-account-card'));
    expect(buttons.map(button => button.textContent)).toEqual([
      expect.stringContaining('Account B'),
      expect.stringContaining('Account A')
    ]);

    buttons[0].click();
    await fixture.whenStable();

    expect(navigation.openAccount).toHaveBeenCalledWith('account-b');
  });

  it('shows a v1 setup path when no accounts exist', () => {
    usableAccounts.set([]);
    fixture.detectChanges();
    const createButtons: Array<HTMLButtonElement> = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .filter(button => button.textContent?.trim() === 'Create account');

    expect(fixture.nativeElement.querySelector('.v1-empty-state')).toBeTruthy();
    expect(createButtons).toHaveLength(1);
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

  it('shows an error if an account cannot be opened', async () => {
    navigation.openAccount.mockRejectedValueOnce(new Error('nope'));

    const buttons: Array<HTMLButtonElement> = Array.from(fixture.nativeElement.querySelectorAll('.v1-account-card'));
    buttons[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-alert--danger')?.textContent).toContain('Account B could not be opened');
  });
});
