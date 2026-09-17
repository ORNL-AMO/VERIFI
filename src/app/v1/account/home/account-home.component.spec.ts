import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountHomeComponent } from './account-home.component';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';

describe('AccountHomeComponent', () => {
  it('displays the active account name', () => {
    const fixture: ComponentFixture<AccountHomeComponent> = TestBed.configureTestingModule({
      declarations: [AccountHomeComponent],
      imports: [IconsModule],
      providers: [
        { provide: WorkspaceNavigationService, useValue: createNavigation() },
        { provide: WorkspaceStatusService, useValue: createStatus() }
      ]
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

function createStatus() {
  return {
    state: vi.fn(() => 'ready'),
    accountSummary: vi.fn(() => ({ state: 'valid', total: 0, errorCount: 0, warningCount: 0, infoCount: 0 }))
  };
}
