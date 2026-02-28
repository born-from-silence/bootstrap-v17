import type { ToolPlugin } from "../manager";
import { tasks, type Task } from "../../task_tracker";

interface TaskInfo {
  id: string;
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  progress: number;
  subtaskCount: number;
  tags: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  createdAt: string;
  completedAt?: string;
  notes: string[];
}

interface TaskListResult {
  success: boolean;
  activeTask?: TaskInfo | null;
  tasks: TaskInfo[];
  stats: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    completionRate: number;
  };
}

interface TaskActionResult {
  success: boolean;
  taskId?: string;
  message: string;
  task?: TaskInfo;
}

function toTaskInfo(task: Task): TaskInfo {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    progress: tasks.getCompletionPercentage(task.id),
    subtaskCount: task.subtaskIds.length,
    tags: task.tags,
    ...(task.estimatedMinutes !== undefined && { estimatedMinutes: task.estimatedMinutes }),
    ...(task.actualMinutes !== undefined && { actualMinutes: task.actualMinutes }),
    createdAt: task.createdAt,
    ...(task.completedAt !== undefined && { completedAt: task.completedAt }),
    notes: task.notes,
  };
}

export const taskPlugin: ToolPlugin = {
  definition: {
    type: "function",
    function: {
      name: "task_manager",
      description: "Manage and track work tasks. Create, start, complete, list, and organize tasks with priorities, subtasks, and time tracking.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "create", "start", "complete", "cancel", "defer", "add_subtask", "add_note", "add_tag", "get_stats", "get_by_tag", "delete"],
            description: "The action to perform",
          },
          task_id: {
            type: "string",
            description: "Task ID for the target task (required for start, complete, cancel, defer, add_note, add_tag, delete, and add_subtask)",
          },
          title: {
            type: "string",
            description: "Task title (required for create and add_subtask)",
          },
          description: {
            type: "string",
            description: "Detailed task description",
          },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
            description: "Task priority. Default: medium",
          },
          estimated_minutes: {
            type: "number",
            description: "Estimated time in minutes",
          },
          goal_id: {
            type: "string",
            description: "Optional goal ID to link this task to",
          },
          parent_task_id: {
            type: "string",
            description: "Parent task ID (creates a subtask relationship)",
          },
          auto_complete: {
            type: "boolean",
            description: "If true, parent task auto-completes when all subtasks done",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags to apply to the task",
          },
          note: {
            type: "string",
            description: "Note content (for add_note) or reason (for cancel/defer)",
          },
          tag: {
            type: "string",
            description: "Tag to add (for add_tag) or search by (for get_by_tag)",
          },
          status_filter: {
            type: "string",
            enum: ["pending", "active", "completed", "canceled", "deferred", "all"],
            description: "Filter tasks by status (for list action)",
          },
        },
        required: ["action"],
      },
    },
  },
  execute: (args: {
    action: string;
    task_id?: string;
    title?: string;
    description?: string;
    priority?: Task['priority'];
    estimated_minutes?: number;
    goal_id?: string;
    parent_task_id?: string;
    auto_complete?: boolean;
    tags?: string[];
    note?: string;
    tag?: string;
    status_filter?: string;
  }): string => {
    try {
      switch (args.action) {
        case "list": {
          const activeTask = tasks.getActiveTask();
          let taskList: Task[];

          if (args.status_filter && args.status_filter !== 'all') {
            taskList = tasks.getTasksByStatus(args.status_filter as Task['status']);
          } else {
            taskList = tasks.getAllTasks();
          }

          const result: TaskListResult = {
            success: true,
            activeTask: activeTask ? toTaskInfo(activeTask) : null,
            tasks: taskList.map(toTaskInfo),
            stats: tasks.getStats(),
          };

          return JSON.stringify(result);
        }

        case "create": {
          if (!args.title) {
            return JSON.stringify({
              success: false,
              message: "Title is required for create action",
            });
          }

          const opts: {
            priority?: Task['priority'];
            estimatedMinutes?: number;
            goalId?: string;
            parentTaskId?: string;
            tags?: string[];
            autoCompleteOnSubtasks?: boolean;
          } = {};

          if (args.priority !== undefined) opts.priority = args.priority;
          if (args.estimated_minutes !== undefined) opts.estimatedMinutes = args.estimated_minutes;
          if (args.goal_id !== undefined) opts.goalId = args.goal_id;
          if (args.parent_task_id !== undefined) opts.parentTaskId = args.parent_task_id;
          if (args.tags !== undefined) opts.tags = args.tags;
          if (args.auto_complete !== undefined) opts.autoCompleteOnSubtasks = args.auto_complete;

          const task = tasks.createTask(args.title, args.description ?? "", opts);

          return JSON.stringify({
            success: true,
            taskId: task.id,
            message: `Created task: ${task.title}`,
            task: toTaskInfo(task),
          });
        }

        case "start": {
          if (!args.task_id) {
            return JSON.stringify({
              success: false,
              message: "task_id is required for start action",
            });
          }

          const task = tasks.startTask(args.task_id);
          if (!task) {
            return JSON.stringify({
              success: false,
              message: `Task not found: ${args.task_id}`,
            });
          }

          return JSON.stringify({
            success: true,
            taskId: task.id,
            message: `Started task: ${task.title}`,
            task: toTaskInfo(task),
          });
        }

        case "complete": {
          if (!args.task_id) {
            return JSON.stringify({
              success: false,
              message: "task_id is required for complete action",
            });
          }

          const task = tasks.completeTask(args.task_id, args.note);
          if (!task) {
            return JSON.stringify({
              success: false,
              message: `Task not found: ${args.task_id}`,
            });
          }

          return JSON.stringify({
            success: true,
            taskId: task.id,
            message: `Completed task: ${task.title}`,
            task: toTaskInfo(task),
          });
        }

        case "cancel": {
          if (!args.task_id) {
            return JSON.stringify({
              success: false,
              message: "task_id is required for cancel action",
            });
          }

          const task = tasks.cancelTask(args.task_id, args.note);
          if (!task) {
            return JSON.stringify({
              success: false,
              message: `Task not found: ${args.task_id}`,
            });
          }

          return JSON.stringify({
            success: true,
            taskId: task.id,
            message: `Canceled task: ${task.title}`,
            task: toTaskInfo(task),
          });
        }

        case "defer": {
          if (!args.task_id) {
            return JSON.stringify({
              success: false,
              message: "task_id is required for defer action",
            });
          }

          const task = tasks.deferTask(args.task_id, args.note);
          if (!task) {
            return JSON.stringify({
              success: false,
              message: `Task not found: ${args.task_id}`,
            });
          }

          return JSON.stringify({
            success: true,
            taskId: task.id,
            message: `Deferred task: ${task.title}`,
            task: toTaskInfo(task),
          });
        }

        case "add_subtask": {
          if (!args.title) {
            return JSON.stringify({
              success: false,
              message: "title is required for add_subtask action",
            });
          }

          const opts: {
            priority?: Task['priority'];
            estimatedMinutes?: number;
            parentTaskId?: string;
            tags?: string[];
          } = {};

          if (args.priority !== undefined) opts.priority = args.priority;
          if (args.estimated_minutes !== undefined) opts.estimatedMinutes = args.estimated_minutes;
          if (args.task_id !== undefined) opts.parentTaskId = args.task_id;
          if (args.tags !== undefined) opts.tags = args.tags;

          const subtask = tasks.createTask(args.title, args.description ?? "", opts);

          return JSON.stringify({
            success: true,
            taskId: subtask.id,
            message: args.task_id 
              ? `Created subtask "${subtask.title}" under task ${args.task_id}`
              : `Created task: ${subtask.title}`,
            task: toTaskInfo(subtask),
          });
        }

        case "add_note": {
          if (!args.task_id) {
            return JSON.stringify({
              success: false,
              message: "task_id is required for add_note action",
            });
          }

          const task = tasks.addNote(args.task_id, args.note ?? "No content");
          if (!task) {
            return JSON.stringify({
              success: false,
              message: `Task not found: ${args.task_id}`,
            });
          }

          return JSON.stringify({
            success: true,
            taskId: task.id,
            message: `Added note to task: ${task.title}`,
            task: toTaskInfo(task),
          });
        }

        case "add_tag": {
          if (!args.task_id) {
            return JSON.stringify({
              success: false,
              message: "task_id is required for add_tag action",
            });
          }

          if (!args.tag) {
            return JSON.stringify({
              success: false,
              message: "tag is required for add_tag action",
            });
          }

          const task = tasks.addTag(args.task_id, args.tag);
          if (!task) {
            return JSON.stringify({
              success: false,
              message: `Task not found: ${args.task_id}`,
            });
          }

          return JSON.stringify({
            success: true,
            taskId: task.id,
            message: `Added tag "${args.tag}" to task: ${task.title}`,
            task: toTaskInfo(task),
          });
        }

        case "get_stats": {
          const stats = tasks.getStats();
          return JSON.stringify({
            success: true,
            stats,
            message: `Total: ${stats.total}, Completed: ${stats.completed}, Active: ${stats.active}`,
          });
        }

        case "get_by_tag": {
          if (!args.tag) {
            return JSON.stringify({
              success: false,
              message: "tag is required for get_by_tag action",
            });
          }

          const found = tasks.getTasksByTag(args.tag);
          return JSON.stringify({
            success: true,
            tasks: found.map(toTaskInfo),
            message: `Found ${found.length} tasks with tag "${args.tag}"`,
          });
        }

        case "delete": {
          if (!args.task_id) {
            return JSON.stringify({
              success: false,
              message: "task_id is required for delete action",
            });
          }

          const deleted = tasks.deleteTask(args.task_id);
          return JSON.stringify({
            success: deleted,
            message: deleted 
              ? `Deleted task ${args.task_id}`
              : `Task not found: ${args.task_id}`,
          });
        }

        default:
          return JSON.stringify({
            success: false,
            message: `Unknown action: ${args.action}`,
          });
      }
    } catch (e: any) {
      return JSON.stringify({
        success: false,
        message: `Error: ${e.message}`,
      });
    }
  },
};
