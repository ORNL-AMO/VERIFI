import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportMeterComponent } from './import-meter.component';

describe('ImportMeterComponent', () => {
  let component: ImportMeterComponent;
  let fixture: ComponentFixture<ImportMeterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportMeterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportMeterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
