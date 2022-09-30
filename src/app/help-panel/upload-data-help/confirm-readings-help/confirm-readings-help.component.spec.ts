import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmReadingsHelpComponent } from './confirm-readings-help.component';

describe('ConfirmReadingsHelpComponent', () => {
  let component: ConfirmReadingsHelpComponent;
  let fixture: ComponentFixture<ConfirmReadingsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmReadingsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmReadingsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
