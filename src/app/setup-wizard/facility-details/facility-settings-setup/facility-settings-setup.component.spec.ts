import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySettingsSetupComponent } from './facility-settings-setup.component';

describe('FacilitySettingsSetupComponent', () => {
  let component: FacilitySettingsSetupComponent;
  let fixture: ComponentFixture<FacilitySettingsSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilitySettingsSetupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilitySettingsSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
