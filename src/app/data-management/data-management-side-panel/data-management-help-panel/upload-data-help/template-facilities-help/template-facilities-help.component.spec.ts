import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateFacilitiesHelpComponent } from './template-facilities-help.component';

describe('TemplateFacilitiesHelpComponent', () => {
  let component: TemplateFacilitiesHelpComponent;
  let fixture: ComponentFixture<TemplateFacilitiesHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TemplateFacilitiesHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemplateFacilitiesHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
