import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { RouterGuardService } from './router-guard-service';
import { SharedRouterGuardModalComponent } from './shared-router-guard-modal.component';

@NgModule({
  declarations: [SharedRouterGuardModalComponent],
  imports: [CommonModule],
  exports: [SharedRouterGuardModalComponent]
})
class SharedRouterGuardModalTestModule { }

describe('SharedRouterGuardModalComponent', () => {
  let fixture: ComponentFixture<SharedRouterGuardModalComponent>;
  let routerGuardService: RouterGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedRouterGuardModalTestModule],
      providers: [RouterGuardService]
    });

    fixture = TestBed.createComponent(SharedRouterGuardModalComponent);
    routerGuardService = TestBed.inject(RouterGuardService);
  });

  it('offers to save changes and reports the save action', async () => {
    openModal(true);
    const action = firstValueFrom(routerGuardService.getModalAction());

    expect(text()).toContain('Would you like to save the changes?');
    findButton('Save').click();
    fixture.detectChanges();

    await expect(action).resolves.toBe('save');
    expect(isOpen()).toBe(false);
  });

  it('reports the discard action from the save prompt', async () => {
    openModal(true);
    const action = firstValueFrom(routerGuardService.getModalAction());

    findButton('Discard').click();
    fixture.detectChanges();

    await expect(action).resolves.toBe('discard');
    expect(isOpen()).toBe(false);
  });

  it('offers a cancel choice when saving is unavailable and reports it', async () => {
    openModal(false);
    const action = firstValueFrom(routerGuardService.getModalAction());

    expect(text()).toContain('Would you like to discard these changes?');
    expect(findButtonIfPresent('Save')).toBeUndefined();
    findButton('Cancel').click();
    fixture.detectChanges();

    await expect(action).resolves.toBe('cancel');
    expect(isOpen()).toBe(false);
  });

  function openModal(showSave: boolean) {
    routerGuardService.setShowSave(showSave);
    routerGuardService.setShowModal(true);
    fixture.detectChanges();
    expect(isOpen()).toBe(true);
  }

  function popup(): HTMLElement {
    return fixture.nativeElement.querySelector('.popup') as HTMLElement;
  }

  function text(): string {
    return popup().textContent ?? '';
  }

  function isOpen(): boolean {
    return popup().classList.contains('open');
  }

  function findButton(label: string): HTMLButtonElement {
    const button = findButtonIfPresent(label);
    if (!button) {
      throw new Error(`Expected a ${label} button`);
    }
    return button;
  }

  function findButtonIfPresent(label: string): HTMLButtonElement | undefined {
    return Array.from(
      popup().querySelectorAll<HTMLButtonElement>('button')
    ).find(button => button.textContent?.trim() === label);
  }
});
