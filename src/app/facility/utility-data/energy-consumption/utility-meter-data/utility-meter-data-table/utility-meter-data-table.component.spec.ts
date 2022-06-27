import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityMeterDataTableComponent } from './utility-meter-data-table.component';

describe('UtilityMeterDataTableComponent', () => {
  let component: UtilityMeterDataTableComponent;
  let fixture: ComponentFixture<UtilityMeterDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityMeterDataTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UtilityMeterDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
