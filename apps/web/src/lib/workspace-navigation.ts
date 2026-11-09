import { NavTab } from '@/components/HorizontalNavbar';

export interface WorkspaceAliasDefinition {
  tab: NavTab;
  title: string;
  aliases: string[];
  description: string;
}

export const WORKSPACE_REGISTRY: Record<NavTab, WorkspaceAliasDefinition> = {
  dashboard: {
    tab: 'dashboard',
    title: 'Command Center',
    aliases: ['dashboard', 'home', 'overview', 'main screen', 'command center'],
    description: 'High-level dashboard with productivity widgets, tasks, focus, and KPIs',
  },
  'my-day': {
    tab: 'my-day',
    title: 'My Day Timeline',
    aliases: ['my day', "today's schedule", 'day view', 'today', 'daily agenda'],
    description: 'Timeline and calendar blocks scheduled specifically for today',
  },
  work: {
    tab: 'work',
    title: 'Tasks Workspace',
    aliases: ['tasks', 'work', 'to-do list', 'my tasks', 'todo', 'all tasks'],
    description: 'Complete task management, priorities, deadlines, and categories',
  },
  projects: {
    tab: 'projects',
    title: 'Projects Workspace',
    aliases: ['projects', 'project board', 'sprints', 'my projects'],
    description: 'Project portfolios, progress tracking, and milestone management',
  },
  routines: {
    tab: 'routines',
    title: 'Habits & Routines',
    aliases: ['routines', 'habits', 'daily routines', 'recurring commitments'],
    description: 'Daily habits, morning/evening rituals, and streak tracking',
  },
  focus: {
    tab: 'focus',
    title: 'Focus Studio',
    aliases: ['focus', 'focus studio', 'pomodoro', 'deep work', 'timer', 'focus timer'],
    description: 'Deep work studio, timer controls, ambient audio, and focus metrics',
  },
  goals: {
    tab: 'goals',
    title: 'Strategic Goals',
    aliases: ['goals', 'milestones', 'targets', 'objectives', 'my goals'],
    description: 'Strategic long-term goals, measurable milestones, and progress logs',
  },
  knowledge: {
    tab: 'knowledge',
    title: 'Knowledge Hub',
    aliases: ['knowledge', 'notes', 'docs', 'second brain', 'wiki', 'hub', 'notebook'],
    description: 'Knowledge management, rich notes, tags, relations, and document search',
  },
  finance: {
    tab: 'finance',
    title: 'Personal Finance',
    aliases: ['finance', 'money', 'budget', 'spending', 'expenses', 'financial overview'],
    description: 'Budgeting, transactions, accounts, and financial analytics',
  },
  wellness: {
    tab: 'wellness',
    title: 'Wellness & Energy',
    aliases: ['wellness', 'health', 'energy', 'sleep', 'mood', 'vitality'],
    description: 'Daily wellness check-ins, sleep, energy, stress, and mood tracking',
  },
  analytics: {
    tab: 'analytics',
    title: 'Performance Analytics',
    aliases: ['analytics', 'metrics', 'productivity reports', 'kpis', 'insights'],
    description: 'Aggregated productivity charts, completion rates, and focus trends',
  },
  'usage-analytics': {
    tab: 'usage-analytics',
    title: 'Application Usage',
    aliases: ['app usage', 'usage analytics', 'system stats', 'activity logs'],
    description: 'Granular interaction tracking, active sessions, and app telemetry',
  },
  calendar: {
    tab: 'calendar',
    title: 'Calendar & Schedule',
    aliases: ['calendar', 'schedule', 'weekly calendar', 'monthly view'],
    description: 'Calendar view of scheduled tasks, routines, and external events',
  },
  planning: {
    tab: 'planning',
    title: 'Smart Day Planner',
    aliases: ['planning', 'planner', 'schedule optimizer', 'day plan'],
    description: 'AI-assisted schedule planning and conflict resolution',
  },
  'smart-planner': {
    tab: 'smart-planner',
    title: 'Smart Planner Modal',
    aliases: ['smart planner', 'ai planner', 'auto schedule'],
    description: 'Dynamic automated timeline optimization',
  },
  emergency: {
    tab: 'emergency',
    title: 'Emergency Shift Mode',
    aliases: ['emergency', 'crisis', 'urgent shift', 'emergency mode'],
    description: 'Rapid schedule triage, postponing non-critical commitments',
  },
  'life-balance': {
    tab: 'life-balance',
    title: 'Life Balance Wheel',
    aliases: ['life balance', 'balance', 'wheel of life', 'work life balance'],
    description: 'Distribution across work, health, personal, and growth domains',
  },
  timeline: {
    tab: 'timeline',
    title: 'Activity Timeline',
    aliases: ['timeline', 'audit trail', 'recent events', 'history'],
    description: 'Chronological feed of task completions, focus blocks, and notifications',
  },
  predictive: {
    tab: 'predictive',
    title: 'Predictive Intelligence',
    aliases: ['predictive', 'predictions', 'burnout risk', 'forecast'],
    description: 'Predictive burnout forecasts, completion likelihood, and buffer recommendations',
  },
  automation: {
    tab: 'automation',
    title: 'Automation Rules',
    aliases: ['automation', 'rules', 'triggers', 'workflows'],
    description: 'Custom IF-THIS-THEN-THAT triggers and automated event routines',
  },
  settings: {
    tab: 'settings',
    title: 'System Settings',
    aliases: ['settings', 'preferences', 'configuration', 'profile settings'],
    description: 'User profile, timezone, notification channels, and assistant configuration',
  },
  'ai-chat': {
    tab: 'ai-chat',
    title: 'AI Executive Chat',
    aliases: ['ai chat', 'chat', 'assistant chat', 'nova chat'],
    description: 'Full-screen conversational interface with memory and workflow tools',
  },
};

export class UniversalWorkspaceNavigator {
  private static history: NavTab[] = ['dashboard'];

  /**
   * Resolves a natural language phrase to a canonical NavTab
   */
  static resolveWorkspace(phrase: string): NavTab | null {
    const normalized = phrase.toLowerCase().trim();

    // Direct check
    if (WORKSPACE_REGISTRY[normalized as NavTab]) {
      return normalized as NavTab;
    }

    // Clean common prefixes ("open", "go to", "navigate to", "show", "view", "my")
    const cleaned = normalized
      .replace(/^(please\s+)?(can you\s+)?(open|show|navigate to|go to|take me to|view|bring up|switch to)\s+/, '')
      .replace(/^my\s+/, '')
      .replace(/\s+workspace$/, '')
      .replace(/\s+screen$/, '')
      .replace(/\s+page$/, '')
      .trim();

    for (const [tabKey, def] of Object.entries(WORKSPACE_REGISTRY)) {
      if (cleaned === tabKey || def.aliases.some((alias) => cleaned === alias || cleaned.includes(alias))) {
        return tabKey as NavTab;
      }
    }

    return null;
  }

  /**
   * Dispatches typed navigation event to frontend application
   */
  static navigateTo(tab: NavTab, recordId?: string): boolean {
    if (typeof window === 'undefined') return false;

    // Track history
    const current = this.history[this.history.length - 1];
    if (current !== tab) {
      this.history.push(tab);
      if (this.history.length > 20) this.history.shift();
    }

    window.dispatchEvent(
      new CustomEvent('ai-assistant:navigate', {
        detail: { tab, recordId },
      }),
    );
    return true;
  }

  /**
   * Navigates back to the previously active workspace
   */
  static navigateBack(): NavTab | null {
    if (this.history.length > 1) {
      this.history.pop(); // Pop current
      const prev = this.history[this.history.length - 1];
      if (prev && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ai-assistant:navigate', {
            detail: { tab: prev },
          }),
        );
        return prev;
      }
    }
    return null;
  }

  /**
   * Dispatches typed modal open event
   */
  static openModal(modalName: string, modalProps?: Record<string, any>): boolean {
    if (typeof window === 'undefined') return false;
    window.dispatchEvent(
      new CustomEvent('ai-assistant:open-modal', {
        detail: { modal: modalName, props: modalProps },
      }),
    );
    return true;
  }
}

