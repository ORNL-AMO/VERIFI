import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterTableComponent } from './meter-table.component';

describe('MeterTableComponent', () => {
  let component: MeterTableComponent;
  let fixture: ComponentFixture<MeterTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MeterTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
