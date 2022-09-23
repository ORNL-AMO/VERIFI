import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdentifyColumnsHelpComponent } from './identify-columns-help.component';

describe('IdentifyColumnsHelpComponent', () => {
  let component: IdentifyColumnsHelpComponent;
  let fixture: ComponentFixture<IdentifyColumnsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IdentifyColumnsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdentifyColumnsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
