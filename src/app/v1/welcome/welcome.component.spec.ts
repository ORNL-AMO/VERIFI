import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { WorkspaceNavigationService } from '../shell/workspace-navigation.service';
import { WelcomeComponent } from './welcome.component';

describe('WelcomeComponent', () => {
  let fixture: ComponentFixture<WelcomeComponent>;
  let usableAccounts: ReturnType<typeof signal>;
  let navigation: { openAccount: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    usableAccounts = signal([
      { id: 1, guid: 'account-a', name: 'Account A', modifiedDate: new Date('2026-01-02') },
      { id: 2, guid: 'account-b', name: 'Account B', modifiedDate: new Date('2026-03-04') }
    ]);
    navigation = { openAccount: vi.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([])],
      declarations: [WelcomeComponent],
      providers: [
        { provide: ApplicationLifecycleService, useValue: { usableAccounts } },
        { provide: WorkspaceNavigationService, useValue: navigation }
      ]
    });
    fixture = TestBed.createComponent(WelcomeComponent);
    fixture.detectChanges();
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

  it('shows the current VERIFI setup path when no accounts exist', () => {
    usableAccounts.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-empty-state')?.textContent).toContain('No accounts are available');
    expect(fixture.nativeElement.querySelector('a[routerLink="/welcome"]')).not.toBeNull();
  });
});
