import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsUtilitiesChartComponent } from './emissions-utilities-chart.component';

describe('EmissionsUtilitiesChartComponent', () => {
  let component: EmissionsUtilitiesChartComponent;
  let fixture: ComponentFixture<EmissionsUtilitiesChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsUtilitiesChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsUtilitiesChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
