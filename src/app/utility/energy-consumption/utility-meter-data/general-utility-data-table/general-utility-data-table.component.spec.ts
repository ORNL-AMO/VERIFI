import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralUtilityDataTableComponent } from './general-utility-data-table.component';

describe('GeneralUtilityDataTableComponent', () => {
  let component: GeneralUtilityDataTableComponent;
  let fixture: ComponentFixture<GeneralUtilityDataTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GeneralUtilityDataTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GeneralUtilityDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
