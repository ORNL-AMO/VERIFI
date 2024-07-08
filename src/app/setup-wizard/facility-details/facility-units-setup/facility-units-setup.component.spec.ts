import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityUnitsSetupComponent } from './facility-units-setup.component';

describe('FacilityUnitsSetupComponent', () => {
  let component: FacilityUnitsSetupComponent;
  let fixture: ComponentFixture<FacilityUnitsSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityUnitsSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityUnitsSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
