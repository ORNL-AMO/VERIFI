import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitHelpComponent } from './submit-help.component';

describe('SubmitHelpComponent', () => {
  let component: SubmitHelpComponent;
  let fixture: ComponentFixture<SubmitHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubmitHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
