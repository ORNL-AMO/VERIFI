import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySetupHomeComponent } from './facility-setup-home.component';

describe('FacilitySetupHomeComponent', () => {
  let component: FacilitySetupHomeComponent;
  let fixture: ComponentFixture<FacilitySetupHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilitySetupHomeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilitySetupHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
