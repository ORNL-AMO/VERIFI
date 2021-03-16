import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InvalidMeterDataTableComponent } from './invalid-meter-data-table.component';

describe('InvalidMeterDataTableComponent', () => {
  let component: InvalidMeterDataTableComponent;
  let fixture: ComponentFixture<InvalidMeterDataTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InvalidMeterDataTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InvalidMeterDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
