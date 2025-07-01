import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMetersTableComponent } from './facility-meters-table.component';

describe('FacilityMetersTableComponent', () => {
  let component: FacilityMetersTableComponent;
  let fixture: ComponentFixture<FacilityMetersTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMetersTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilityMetersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
