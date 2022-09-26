import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySetupHelpComponent } from './facility-setup-help.component';

describe('FacilitySetupHelpComponent', () => {
  let component: FacilitySetupHelpComponent;
  let fixture: ComponentFixture<FacilitySetupHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilitySetupHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySetupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
