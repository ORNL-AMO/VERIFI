import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectWorksheetHelpComponent } from './select-worksheet-help.component';

describe('SelectWorksheetHelpComponent', () => {
  let component: SelectWorksheetHelpComponent;
  let fixture: ComponentFixture<SelectWorksheetHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectWorksheetHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectWorksheetHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
