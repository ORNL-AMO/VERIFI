import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityMeterDataComponent } from './utility-meter-data.component';

describe('UtilityMeterDataComponent', () => {
  let component: UtilityMeterDataComponent;
  let fixture: ComponentFixture<UtilityMeterDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UtilityMeterDataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UtilityMeterDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
