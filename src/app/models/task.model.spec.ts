import { Task, addDays, dueMoment, formatTime, statusOf } from './task.model';

const base: Task = {
  id: '1', title: 'Test', description: '', dueDate: '2025-03-20', dueTime: '09:00',
  priority: 'High', category: 'School', completed: false, completedAt: null,
  reminder: false, createdAt: '2025-03-01T00:00:00.000Z'
};

describe('task model', () => {
  it('marks a past, unfinished task as Overdue', () => {
    expect(statusOf(base, new Date(2025, 2, 20, 10, 0))).toBe('Overdue');
  });

  it('keeps a future task Pending', () => {
    expect(statusOf(base, new Date(2025, 2, 20, 8, 0))).toBe('Pending');
  });

  it('reports Completed even when the due date has passed', () => {
    expect(statusOf({ ...base, completed: true }, new Date(2025, 3, 1))).toBe('Completed');
  });

  it('treats a task without a time as due at the end of the day', () => {
    const t = { ...base, dueTime: '' };
    expect(dueMoment(t).getHours()).toBe(23);
    expect(statusOf(t, new Date(2025, 2, 20, 22, 0))).toBe('Pending');
  });

  it('formats times and adds days across month ends', () => {
    expect(formatTime('00:05')).toBe('12:05 AM');
    expect(formatTime('13:30')).toBe('1:30 PM');
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
  });
});
