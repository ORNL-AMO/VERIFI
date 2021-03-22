import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MissingMeterNumberTableComponent } from './missing-meter-number-table.component';

describe('MissingMeterNumberTableComponent', () => {
  let component: MissingMeterNumberTableComponent;
  let fixture: ComponentFixture<MissingMeterNumberTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MissingMeterNumberTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MissingMeterNumberTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
