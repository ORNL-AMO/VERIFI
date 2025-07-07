import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySettingsHelpComponent } from './facility-settings-help.component';

describe('FacilitySettingsHelpComponent', () => {
  let component: FacilitySettingsHelpComponent;
  let fixture: ComponentFixture<FacilitySettingsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilitySettingsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySettingsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
