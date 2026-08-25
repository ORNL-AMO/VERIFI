import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';
import { AccountHomeComponent } from './account-home.component';

describe('AccountHomeComponent', () => {
  it('displays the active account name', () => {
    const fixture: ComponentFixture<AccountHomeComponent> = TestBed.configureTestingModule({
      declarations: [AccountHomeComponent],
      providers: [{ provide: WorkspaceNavigationService, useValue: createNavigation() }]
    }).createComponent(AccountHomeComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Account A');
  });
});

function createNavigation() {
  return {
    account: vi.fn(() => ({ guid: 'account-a', name: 'Account A' })),
    facilities: vi.fn(() => [{ guid: 'facility-a', name: 'Facility A' }]),
    panelContent: vi.fn(() => ({
      results: [
        { value: '1' },
        { value: '4' },
        { value: '2' },
        { value: '3' },
        { value: '1' }
      ]
    }))
  };
}
