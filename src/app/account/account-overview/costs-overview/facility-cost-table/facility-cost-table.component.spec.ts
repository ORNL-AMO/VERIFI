import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCostTableComponent } from './facility-cost-table.component';

describe('FacilityCostTableComponent', () => {
  let component: FacilityCostTableComponent;
  let fixture: ComponentFixture<FacilityCostTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityCostTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityCostTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
