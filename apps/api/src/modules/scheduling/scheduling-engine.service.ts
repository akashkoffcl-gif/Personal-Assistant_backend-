import { Injectable, Logger } from '@nestjs/common';
import {
  Priority,
  SchedulingMode,
  TaskCategory,
  TaskStatus,
  SchedulableTask,
  SchedulingResult,
  ScheduleAssignment,
  ScheduleConflict,
} from '@assistant/shared';

@Injectable()
export class SchedulingEngineService {
  private readonly logger = new Logger(SchedulingEngineService.name);

  /**
   * Plans or replans a day's schedule deterministically.
   * Preserves FIXED appointments and COMPLETED tasks.
   * Places emergency tasks with highest priority.
   * Reorganizes FLEXIBLE tasks by priority and deadline into available slot intervals.
   */
  public planDay(
    tasks: SchedulableTask[],
    dayStart: Date,
    dayEnd: Date,
    emergencyTask?: SchedulableTask,
  ): SchedulingResult {
    const assignments: ScheduleAssignment[] = [];
    const conflicts: ScheduleConflict[] = [];
    const unresolvedTasks: SchedulableTask[] = [];

    // 1. Separate immovable tasks: COMPLETED or FIXED appointments
    const immovableTasks = tasks.filter(
      (t) =>
        t.status === TaskStatus.COMPLETED ||
        t.schedulingMode === SchedulingMode.FIXED,
    );

    // Map immovable assignments
    for (const task of immovableTasks) {
      if (task.scheduledStartTime && task.scheduledEndTime) {
        assignments.push({
          taskId: task.id,
          taskTitle: task.title,
          startTime: new Date(task.scheduledStartTime),
          endTime: new Date(task.scheduledEndTime),
          isModified: false,
          originalStartTime: task.scheduledStartTime ? new Date(task.scheduledStartTime) : null,
          originalEndTime: task.scheduledEndTime ? new Date(task.scheduledEndTime) : null,
        });
      }
    }

    // Sort existing fixed assignments chronologically
    assignments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Check for existing fixed overlaps
    for (let i = 0; i < assignments.length - 1; i++) {
      if (assignments[i].endTime.getTime() > assignments[i + 1].startTime.getTime()) {
        conflicts.push({
          taskId: assignments[i + 1].taskId,
          taskTitle: assignments[i + 1].taskTitle,
          conflictingTaskId: assignments[i].taskId,
          conflictingTaskTitle: assignments[i].taskTitle,
          reason: `Fixed appointment collision between '${assignments[i].taskTitle}' and '${assignments[i + 1].taskTitle}'`,
        });
      }
    }

    // 2. Handle Emergency Task if provided
    let emergencyPlaced: ScheduleAssignment | undefined;
    if (emergencyTask) {
      const emergencyDurationMs = emergencyTask.estimatedDurationMinutes * 60 * 1000;
      const emergencyBufferMs = (emergencyTask.bufferMinutes || 5) * 60 * 1000;
      const earliestStart = emergencyTask.earliestStartTime
        ? new Date(emergencyTask.earliestStartTime)
        : new Date();

      // Find the earliest gap that can accommodate the emergency without moving fixed appointments
      const slot = this.findFirstAvailableSlot(
        assignments,
        earliestStart > dayStart ? earliestStart : dayStart,
        dayEnd,
        emergencyDurationMs,
        emergencyBufferMs,
      );

      if (slot) {
        emergencyPlaced = {
          taskId: emergencyTask.id,
          taskTitle: emergencyTask.title,
          startTime: slot.start,
          endTime: slot.end,
          isModified: true,
          originalStartTime: null,
          originalEndTime: null,
        };
        assignments.push(emergencyPlaced);
        assignments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      } else {
        conflicts.push({
          taskId: emergencyTask.id,
          taskTitle: emergencyTask.title,
          reason: 'Insufficient space to schedule emergency task without violating immovable appointments.',
        });
        unresolvedTasks.push(emergencyTask);
      }
    }

    // 3. Collect flexible, non-completed tasks needing schedule slots
    const flexibleTasks = tasks
      .filter(
        (t) =>
          t.status !== TaskStatus.COMPLETED &&
          t.schedulingMode === SchedulingMode.FLEXIBLE &&
          t.id !== emergencyTask?.id,
      )
      .sort((a, b) => {
        // Priority weight: URGENT (4) > HIGH (3) > MEDIUM (2) > LOW (1)
        const priorityWeight = {
          [Priority.URGENT]: 4,
          [Priority.HIGH]: 3,
          [Priority.MEDIUM]: 2,
          [Priority.LOW]: 1,
        };
        const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (pDiff !== 0) return pDiff;

        // If priorities equal, earlier deadline first
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (a.deadline) return -1;
        if (b.deadline) return 1;

        return 0;
      });

    // 4. Place each flexible task into available time intervals
    for (const task of flexibleTasks) {
      const durationMs = task.estimatedDurationMinutes * 60 * 1000;
      const bufferMs = (task.bufferMinutes || 5) * 60 * 1000;
      const earliest = task.earliestStartTime
        ? new Date(Math.max(new Date(task.earliestStartTime).getTime(), dayStart.getTime()))
        : dayStart;

      const slot = this.findFirstAvailableSlot(
        assignments,
        earliest,
        dayEnd,
        durationMs,
        bufferMs,
      );

      if (slot) {
        // Check if placed slot violates deadline
        if (task.deadline && slot.end.getTime() > new Date(task.deadline).getTime()) {
          conflicts.push({
            taskId: task.id,
            taskTitle: task.title,
            reason: `Rescheduled task '${task.title}' ends at ${slot.end.toISOString()}, which exceeds deadline ${new Date(task.deadline).toISOString()}`,
          });
        }

        const wasModified =
          !task.scheduledStartTime ||
          new Date(task.scheduledStartTime).getTime() !== slot.start.getTime();

        assignments.push({
          taskId: task.id,
          taskTitle: task.title,
          startTime: slot.start,
          endTime: slot.end,
          isModified: wasModified,
          originalStartTime: task.scheduledStartTime ? new Date(task.scheduledStartTime) : null,
          originalEndTime: task.scheduledEndTime ? new Date(task.scheduledEndTime) : null,
        });

        assignments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      } else {
        conflicts.push({
          taskId: task.id,
          taskTitle: task.title,
          reason: `Could not find an available slot for flexible task '${task.title}' within day boundaries.`,
        });
        unresolvedTasks.push(task);
      }
    }

    return {
      success: conflicts.length === 0,
      assignments,
      conflicts,
      emergencyPlaced,
      unresolvedTasks,
    };
  }

  /**
   * Helper: finds the first chronological gap in existing assignments
   * between searchStart and dayEnd that can hold durationMs + bufferMs.
   */
  private findFirstAvailableSlot(
    assignments: ScheduleAssignment[],
    searchStart: Date,
    dayEnd: Date,
    durationMs: number,
    bufferMs: number,
  ): { start: Date; end: Date } | null {
    let cursor = new Date(searchStart.getTime());

    for (const assignment of assignments) {
      // If assignment ends before cursor, continue
      if (assignment.endTime.getTime() <= cursor.getTime()) {
        continue;
      }

      // Check gap between cursor and start of next assignment
      const gapMs = assignment.startTime.getTime() - cursor.getTime();
      if (gapMs >= durationMs + bufferMs) {
        const slotEnd = new Date(cursor.getTime() + durationMs);
        return { start: new Date(cursor.getTime()), end: slotEnd };
      }

      // Move cursor to end of current assignment + buffer
      cursor = new Date(assignment.endTime.getTime() + bufferMs);
    }

    // Check gap after last assignment until dayEnd
    const remainingMs = dayEnd.getTime() - cursor.getTime();
    if (remainingMs >= durationMs) {
      return {
        start: new Date(cursor.getTime()),
        end: new Date(cursor.getTime() + durationMs),
      };
    }

    return null;
  }
}

