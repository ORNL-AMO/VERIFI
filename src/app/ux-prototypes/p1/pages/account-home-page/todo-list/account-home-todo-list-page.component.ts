import { Component, computed, inject } from '@angular/core';
import { P1SetupTask, P1StatusTone } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';

interface P1SetupTaskGroup {
  id: string;
  title: string;
  tasks: Array<P1SetupTask>;
  taskCountLabel: string;
  statusSummary: string;
  openCount: number;
  tone: P1StatusTone;
}

@Component({
  selector: 'app-p1-account-home-todo-list-page',
  templateUrl: './account-home-todo-list-page.component.html',
  styleUrls: [
    '../../../components/workspace-main/workspace-main.component.css',
    '../account-home-page.component.css'
  ],
  standalone: false
})
export class P1AccountHomeTodoListPageComponent {
  readonly facade = inject(P1RouteFacade);
  readonly accountTaskGroups = computed<Array<P1SetupTaskGroup>>(() =>
    this.groupTasks(this.facade.setup().accountTasks)
  );
  readonly facilityTaskGroups = computed<Array<P1SetupTaskGroup>>(() =>
    this.groupTasks(this.facade.setup().allTasks.filter(task => task.contextMode === 'facility'))
  );
  readonly facilityOpenTaskCount = computed(() =>
    this.facilityTaskGroups().reduce((total, group) => total + group.openCount, 0)
  );
  readonly completionPercent = computed(() => {
    const setup = this.facade.setup();
    return setup.totalCount > 0 ? `${Math.round((setup.completeCount / setup.totalCount) * 100)}%` : '0%';
  });

  private groupTasks(tasks: Array<P1SetupTask>): Array<P1SetupTaskGroup> {
    const groups = new Map<string, Array<P1SetupTask>>();
    tasks.forEach(task => {
      groups.set(task.group, [...(groups.get(task.group) || []), task]);
    });
    return Array.from(groups.entries()).map(([title, groupTasks]) => this.buildTaskGroup(title, groupTasks));
  }

  private buildTaskGroup(title: string, tasks: Array<P1SetupTask>): P1SetupTaskGroup {
    const completeCount = tasks.filter(task => task.status === 'complete').length;
    const reviewCount = tasks.filter(task => task.status === 'ready').length;
    const blockedCount = tasks.filter(task => task.status === 'blocked').length;
    const openCount = reviewCount + blockedCount;
    const statusParts = [
      blockedCount > 0 ? `${blockedCount} needs setup` : '',
      reviewCount > 0 ? `${reviewCount} review` : '',
      completeCount > 0 ? `${completeCount} complete` : ''
    ].filter(Boolean);

    return {
      id: `${tasks[0]?.contextMode || 'task'}-${tasks[0]?.facilityId || title}`,
      title,
      tasks,
      taskCountLabel: `${tasks.length} ${tasks.length === 1 ? 'item' : 'items'}`,
      statusSummary: statusParts.length > 0 ? statusParts.join(', ') : 'No setup items',
      openCount,
      tone: blockedCount > 0 ? 'danger' : reviewCount > 0 ? 'warning' : 'success'
    };
  }
}
