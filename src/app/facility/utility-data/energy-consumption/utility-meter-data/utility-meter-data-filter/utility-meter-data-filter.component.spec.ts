import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityMeterDataFilterComponent } from './utility-meter-data-filter.component';

describe('UtilityMeterDataFilterComponent', () => {
  let component: UtilityMeterDataFilterComponent;
  let fixture: ComponentFixture<UtilityMeterDataFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UtilityMeterDataFilterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UtilityMeterDataFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
