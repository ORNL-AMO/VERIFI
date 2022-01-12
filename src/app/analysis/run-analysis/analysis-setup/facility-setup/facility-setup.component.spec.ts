import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySetupComponent } from './facility-setup.component';

describe('FacilitySetupComponent', () => {
  let component: FacilitySetupComponent;
  let fixture: ComponentFixture<FacilitySetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilitySetupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilitySetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
