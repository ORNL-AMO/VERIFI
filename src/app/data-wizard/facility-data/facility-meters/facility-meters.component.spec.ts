import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMetersComponent } from './facility-meters.component';

describe('FacilityMetersComponent', () => {
  let component: FacilityMetersComponent;
  let fixture: ComponentFixture<FacilityMetersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMetersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityMetersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
