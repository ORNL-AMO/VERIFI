import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ColumnsWizardComponent } from './columns-wizard.component';

describe('ColumnsWizardComponent', () => {
  let component: ColumnsWizardComponent;
  let fixture: ComponentFixture<ColumnsWizardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ColumnsWizardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ColumnsWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
