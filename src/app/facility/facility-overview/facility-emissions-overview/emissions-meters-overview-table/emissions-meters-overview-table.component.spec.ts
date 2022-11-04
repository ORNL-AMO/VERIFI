import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsMetersOverviewTableComponent } from './emissions-meters-overview-table.component';

describe('EmissionsMetersOverviewTableComponent', () => {
  let component: EmissionsMetersOverviewTableComponent;
  let fixture: ComponentFixture<EmissionsMetersOverviewTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsMetersOverviewTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsMetersOverviewTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
