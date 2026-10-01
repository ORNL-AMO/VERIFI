import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountAnalysisPlaceholderComponent } from './account-analysis-placeholder.component';

describe('AccountAnalysisPlaceholderComponent', () => {
  it('identifies the deferred account dashboard without linking back to v0', async () => {
    await TestBed.configureTestingModule({
      imports: [AccountAnalysisPlaceholderComponent],
      providers: [{ provide: AccountWorkspaceStore, useValue: { account: signal({ name: 'Portfolio A' }) } }]
    }).compileComponents();
    const fixture = TestBed.createComponent(AccountAnalysisPlaceholderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Portfolio A');
    expect(fixture.nativeElement.textContent).toContain('account analysis phase');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
});
