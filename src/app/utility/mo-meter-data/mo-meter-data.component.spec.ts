import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MoMeterDataComponent } from './mo-meter-data.component';

describe('MoMeterDataComponent', () => {
  let component: MoMeterDataComponent;
  let fixture: ComponentFixture<MoMeterDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MoMeterDataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MoMeterDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
