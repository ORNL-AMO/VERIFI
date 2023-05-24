import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitiesUsageTableComponent } from './facilities-usage-table.component';

describe('FacilitiesUsageTableComponent', () => {
  let component: FacilitiesUsageTableComponent;
  let fixture: ComponentFixture<FacilitiesUsageTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilitiesUsageTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitiesUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
