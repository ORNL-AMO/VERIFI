import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityInformationSetupComponent } from './facility-information-setup.component';

describe('FacilityInformationSetupComponent', () => {
  let component: FacilityInformationSetupComponent;
  let fixture: ComponentFixture<FacilityInformationSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityInformationSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityInformationSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
