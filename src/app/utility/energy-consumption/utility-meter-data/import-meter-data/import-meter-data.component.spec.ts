import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportMeterDataComponent } from './import-meter-data.component';

describe('ImportMeterDataComponent', () => {
  let component: ImportMeterDataComponent;
  let fixture: ComponentFixture<ImportMeterDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportMeterDataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportMeterDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
