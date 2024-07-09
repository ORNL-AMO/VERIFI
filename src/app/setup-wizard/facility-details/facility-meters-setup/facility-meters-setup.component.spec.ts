import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMetersSetupComponent } from './facility-meters-setup.component';

describe('FacilityMetersSetupComponent', () => {
  let component: FacilityMetersSetupComponent;
  let fixture: ComponentFixture<FacilityMetersSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMetersSetupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityMetersSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
