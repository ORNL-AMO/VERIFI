import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';
import { FacilityHomeComponent } from './facility-home.component';

describe('FacilityHomeComponent', () => {
  it('displays the selected facility name', () => {
    const fixture: ComponentFixture<FacilityHomeComponent> = TestBed.configureTestingModule({
      declarations: [FacilityHomeComponent],
      providers: [{ provide: WorkspaceNavigationService, useValue: createNavigation() }]
    }).createComponent(FacilityHomeComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Facility A');
  });
});

function createNavigation() {
  return {
    facility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
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
