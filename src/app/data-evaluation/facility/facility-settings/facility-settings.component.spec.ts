import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySettingsComponent } from './facility-settings.component';

describe('FacilitySettingsComponent', () => {
  let component: FacilitySettingsComponent;
  let fixture: ComponentFixture<FacilitySettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilitySettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilitySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
