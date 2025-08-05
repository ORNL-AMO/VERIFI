import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagementFacilityHelpComponent } from './data-management-facility-help.component';

describe('DataManagementFacilityHelpComponent', () => {
  let component: DataManagementFacilityHelpComponent;
  let fixture: ComponentFixture<DataManagementFacilityHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataManagementFacilityHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataManagementFacilityHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
