import { addMonths, addDays, format } from 'date-fns';

export type PlannerColumn = {
  key: string;
  name: string;
  type: 'text' | 'select' | 'status' | 'date' | 'number' | 'checkbox';
  options?: string[];
};

export type PlannerRecord = {
  title: string;
  properties: Record<string, string | number | boolean>;
};

export type PlannerDatabase = {
  title: string;
  schema: PlannerColumn[];
  records: PlannerRecord[];
};

export type WorkspaceBlueprint = {
  title: string;
  dashboardBlocks: { id: string; type: string; text: string }[];
  databases: PlannerDatabase[];
  proactiveSuggestions: string[];
};

const toKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 28) || 'field';

const parseDurationMonths = (prompt: string) => {
  const match = prompt.match(/(\d+)\s*(month|months|mo)\b/i);
  return match ? Math.max(1, Number(match[1])) : 6;
};

const parseGoals = (prompt: string) => {
  const cleaned = prompt.replace(/create|build|setup|set up|system|for|next|plan|planner/gi, ' ');
  const chunks = cleaned
    .split(/\+|,|\/| and /i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s{2,}/g, ' '));

  const uniq = Array.from(new Set(chunks.map((c) => c.toUpperCase()))).slice(0, 5);
  return uniq.length ? uniq : ['PRIMARY GOAL'];
};

export function buildWorkspaceBlueprint(prompt: string): WorkspaceBlueprint {
  const months = parseDurationMonths(prompt);
  const goals = parseGoals(prompt);
  const today = new Date();
  const endDate = addMonths(today, months);

  const dailySchema: PlannerColumn[] = [
    { key: 'category', name: 'Category', type: 'select', options: ['Study', 'Practice', 'Review', 'Application', 'Health'] },
    { key: 'goal', name: 'Linked Goal', type: 'select', options: goals },
    { key: 'priority', name: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
    { key: 'status', name: 'Status', type: 'status', options: ['To Do', 'In Progress', 'Done', 'Overdue'] },
    { key: 'deadline', name: 'Deadline', type: 'date' },
    { key: 'reminder_date', name: 'Reminder Date', type: 'date' },
    { key: 'effort_hours', name: 'Effort (hrs)', type: 'number' },
  ];

  const dailyRecords: PlannerRecord[] = goals.flatMap((goal, idx) => {
    const base = addDays(today, idx);
    return [
      {
        title: `${goal}: Concept Revision Sprint`,
        properties: {
          category: 'Study',
          goal,
          priority: 'High',
          status: 'To Do',
          deadline: format(addDays(base, 1), 'yyyy-MM-dd'),
          reminder_date: format(base, 'yyyy-MM-dd'),
          effort_hours: 2,
        },
      },
      {
        title: `${goal}: Timed Mock + Error Log`,
        properties: {
          category: 'Practice',
          goal,
          priority: 'High',
          status: 'To Do',
          deadline: format(addDays(base, 3), 'yyyy-MM-dd'),
          reminder_date: format(addDays(base, 2), 'yyyy-MM-dd'),
          effort_hours: 3,
        },
      },
    ];
  });

  const milestoneSchema: PlannerColumn[] = [
    { key: 'goal', name: 'Goal', type: 'select', options: goals },
    { key: 'milestone', name: 'Milestone', type: 'text' },
    { key: 'deadline', name: 'Deadline', type: 'date' },
    { key: 'status', name: 'Status', type: 'status', options: ['Not Started', 'In Progress', 'Done', 'Overdue'] },
    { key: 'progress', name: 'Progress %', type: 'number' },
    { key: 'owner', name: 'Owner', type: 'text' },
  ];

  const milestoneRecords: PlannerRecord[] = goals.map((goal, i) => ({
    title: `${goal} milestone ${i + 1}`,
    properties: {
      goal,
      milestone: `Reach 70% target score / completion baseline in ${goal}`,
      deadline: format(addDays(today, 21 + i * 7), 'yyyy-MM-dd'),
      status: 'Not Started',
      progress: 0,
      owner: 'Me',
    },
  }));

  const improveSchema: PlannerColumn[] = [
    { key: 'focus_area', name: 'Focus Area', type: 'text' },
    { key: 'trigger', name: 'Trigger', type: 'select', options: ['Low Mock Score', 'Missed Deadline', 'Energy Drop', 'Manual Review'] },
    { key: 'suggestion', name: 'Suggestion', type: 'text' },
    { key: 'priority', name: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
    { key: 'status', name: 'Status', type: 'status', options: ['Suggested', 'Accepted', 'Done'] },
    { key: 'review_date', name: 'Review Date', type: 'date' },
  ];

  const improveRecords: PlannerRecord[] = goals.map((goal, i) => ({
    title: `${goal}: weekly optimization`,
    properties: {
      focus_area: `${goal} weak-topic recovery`,
      trigger: 'Manual Review',
      suggestion: `Move one low-value task to recovery block and add a 45-minute review cycle for ${goal}.`,
      priority: i === 0 ? 'High' : 'Medium',
      status: 'Suggested',
      review_date: format(addDays(today, 7 + i * 3), 'yyyy-MM-dd'),
    },
  }));

  return {
    title: `${goals.join(' + ')} Planning HQ`,
    dashboardBlocks: [
      { id: 'b1', type: 'h1', text: `${goals.join(' + ')} Preparation System` },
      { id: 'b2', type: 'p', text: `Duration: ${format(today, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')} (${months} months)` },
      { id: 'b3', type: 'h2', text: 'Workspace Components' },
      { id: 'b4', type: 'list', text: 'Daily Task Engine (execution + reminders)' },
      { id: 'b5', type: 'list', text: 'Milestones & Deadlines Tracker (goal alignment)' },
      { id: 'b6', type: 'list', text: 'Improvement Suggestions (proactive upgrades)' },
      { id: 'b7', type: 'todo', text: 'Review overdue tasks every evening and auto-reschedule for next day if needed.' },
    ],
    databases: [
      { title: 'Daily Tasks', schema: dailySchema.map(c => ({ ...c, key: toKey(c.key) })), records: dailyRecords },
      { title: 'Milestones & Deadlines', schema: milestoneSchema.map(c => ({ ...c, key: toKey(c.key) })), records: milestoneRecords },
      { title: 'Improvement Suggestions', schema: improveSchema.map(c => ({ ...c, key: toKey(c.key) })), records: improveRecords },
    ],
    proactiveSuggestions: [
      'If >3 tasks become overdue in a week, reduce daily load by 20% and move to priority-first sequencing.',
      'After each mock, add at least one error-log task to Daily Tasks with a next-day reminder.',
      'Every Sunday: review progress % in Milestones and regenerate next week task focus.',
    ],
  };
}
