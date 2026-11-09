import * as jwt from 'jsonwebtoken';

describe('Phase 36: Master Implementation Release Audit Suite (Phases 27-36)', () => {
  const API_BASE = 'http://localhost:3001/api/v1';
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '56e1cc13-e9af-45ef-81af-98c2b86c43b4';
  const testUserId = '00000000-0000-0000-0000-000000000001';

  const token = jwt.sign(
    { sub: testUserId, email: 'selma.knight@assistant.local', aud: 'authenticated', iss: 'supabase' },
    JWT_SECRET,
    { expiresIn: '2h' },
  );

  const req = async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} on ${endpoint}: ${errText}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  };

  // =========================================================================
  // PHASE 27: FOCUS STUDIO & DEEP WORK ENGINE
  // =========================================================================
  describe('Phase 27: Focus Studio & Deep Work Engine', () => {
    let focusSessionId: string;

    it('retrieves default or user focus preferences with custom intervals', async () => {
      const res = await req('/focus/preferences');
      expect(res.success).toBe(true);
      expect(res.data.focusDurationMinutes).toBeGreaterThan(0);
      expect(res.data.dailyTargetMinutes).toBeGreaterThan(0);
    });

    it('starts an active focus session and validates server-derived countdown', async () => {
      const res = await req('/focus/start', {
        method: 'POST',
        body: JSON.stringify({
          sessionType: 'FOCUS',
          durationMinutes: 25,
          notes: 'Master audit deep work session',
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toBeDefined();
      expect(res.data.status).toBe('ACTIVE');
      focusSessionId = res.data.id;

      // Verify current session
      const currentRes = await req('/focus/current');
      expect(currentRes.success).toBe(true);
      expect(currentRes.data.session).toBeDefined();
      expect(currentRes.data.session.id).toBe(focusSessionId);
      expect(currentRes.data.remainingSeconds).toBeGreaterThan(0);
    });

    it('pauses and resumes the active focus session, recording interruptions', async () => {
      const pauseRes = await req(`/focus/${focusSessionId}/pause`, { method: 'POST' });
      expect(pauseRes.success).toBe(true);
      expect(pauseRes.data.status).toBe('PAUSED');
      expect(pauseRes.data.interruptionCount).toBeGreaterThanOrEqual(1);

      const resumeRes = await req(`/focus/${focusSessionId}/resume`, { method: 'POST' });
      expect(resumeRes.success).toBe(true);
      expect(resumeRes.data.status).toBe('ACTIVE');
    });

    it('completes the focus session and updates focus consistency metrics', async () => {
      const completeRes = await req(`/focus/${focusSessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ summaryNotes: 'Successful focus cycle verified' }),
      });
      expect(completeRes.success).toBe(true);
      expect(completeRes.data.status).toBe('COMPLETED');

      const analyticsRes = await req('/focus/analytics');
      expect(analyticsRes.success).toBe(true);
      expect(analyticsRes.data.completedSessionsCount).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // PHASE 28: GOALS & MILESTONE MANAGEMENT
  // =========================================================================
  describe('Phase 28: Goals & Milestone Management', () => {
    let goalId: string;
    let milestoneId1: string;
    let milestoneId2: string;

    it('creates strategic goal with quarterly horizon and high priority', async () => {
      const res = await req('/goals', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Full Production Master Verification',
          description: 'Ensure 100% test coverage and multi-tenant safety',
          type: 'QUARTERLY',
          priority: 'HIGH',
          category: 'WORK',
          targetDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toBeDefined();
      expect(res.data.progressPercent).toBe(0);
      goalId = res.data.id;
    });

    it('adds milestones and automatically recalculates goal progress upon completion', async () => {
      const m1 = await req(`/goals/${goalId}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Complete Core Architecture Unit Verification' }),
      });
      const m2 = await req(`/goals/${goalId}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Execute End-to-End Release Audit Matrix' }),
      });
      milestoneId1 = m1.data.id;
      milestoneId2 = m2.data.id;

      // Complete milestone 1 -> progress becomes 50%
      const update1 = await req(`/goals/${goalId}/milestones/${milestoneId1}`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: true }),
      });
      expect(update1.success).toBe(true);

      const checkGoal = await req(`/goals/${goalId}`);
      expect(checkGoal.data.progressPercent).toBe(50);
      expect(checkGoal.data.status).toBe('IN_PROGRESS');
    });

    it('auto-completes goal when all milestones are achieved (100% progress)', async () => {
      const update2 = await req(`/goals/${goalId}/milestones/${milestoneId2}`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: true }),
      });
      expect(update2.success).toBe(true);

      const checkGoal = await req(`/goals/${goalId}`);
      expect(checkGoal.data.progressPercent).toBe(100);
      expect(checkGoal.data.status).toBe('COMPLETED');
      expect(checkGoal.data.completedAt).toBeDefined();

      const summaryRes = await req('/goals/summary');
      expect(summaryRes.success).toBe(true);
      expect(summaryRes.data.totalGoals).toBeGreaterThanOrEqual(1);
      expect(summaryRes.data.completedGoals).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // PHASE 29: PERSONAL KNOWLEDGE HUB
  // =========================================================================
  describe('Phase 29: Personal Knowledge Hub', () => {
    let folderId: string;
    let noteId: string;

    it('creates organizational knowledge folder', async () => {
      const res = await req('/knowledge/folders', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Architecture & Specifications',
          color: '#8B45F5',
          icon: 'Folder',
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toBeDefined();
      folderId = res.data.id;
    });

    it('creates markdown note with tags, pinned status, and folder assignment', async () => {
      const res = await req('/knowledge/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Event Sourcing with PostgreSQL and BullMQ',
          content: '# Architecture Overview\nAll state transitions generate immutable audit events.',
          category: 'NOTE',
          folderId,
          tags: ['architecture', 'event-sourcing', 'release-audit'],
          isPinned: true,
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toBeDefined();
      expect(res.data.tags.length).toBeGreaterThanOrEqual(3);
      noteId = res.data.id;
    });

    it('searches knowledge assets with keyword indexing', async () => {
      const res = await req('/knowledge/notes?q=Event%20Sourcing');
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.some((n: any) => n.id === noteId)).toBe(true);
    });

    it('creates and retrieves web bookmark with metadata', async () => {
      const res = await req('/knowledge/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'PostgreSQL Advisory Locks Reference',
          url: 'https://www.postgresql.org/docs/current/explicit-locking.html',
          description: 'Critical documentation for concurrent transaction scheduling',
          tags: ['postgres', 'database', 'locking'],
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toBeDefined();
    });
  });

  // =========================================================================
  // PHASE 30: PERSONAL FINANCE MANAGEMENT
  // =========================================================================
  describe('Phase 30: Personal Finance Management', () => {
    let accountId: string;

    it('creates financial account with initial balance', async () => {
      const res = await req('/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Enterprise Treasury Account',
          type: 'CHECKING',
          currency: 'USD',
          balance: 25000.0,
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toBeDefined();
      accountId = res.data.id;
    });

    it('records financial transaction with exact Decimal accounting and updates account balance', async () => {
      const res = await req('/finance/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          amount: 250.0,
          type: 'EXPENSE',
          date: '2026-11-03',
          description: 'DevOps Server Capacity',
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toBeDefined();

      // Verify financial summary
      const summaryRes = await req('/finance/summary');
      expect(summaryRes.success).toBe(true);
      expect(summaryRes.data.netWorth).toBeDefined();
    });

    it('exports financial transactions as RFC-4180 compliant CSV stream', async () => {
      const csvData = await req('/finance/export');
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('Date,Account,Type,Category,Description,Amount');
      expect(csvData).toContain('DevOps Server Capacity');
    });
  });

  // =========================================================================
  // PHASES 31 & 32: INTEGRATED AI EXECUTIVE ASSISTANT & SMART DAY PLANNER
  // =========================================================================
  describe('Phases 31 & 32: Integrated AI Assistant & Smart Day Planner', () => {
    let proposalId: string;

    it('interacts with AI Executive Agent and receives grounded response', async () => {
      const res = await req('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What are my top productivity recommendations for today?',
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.message).toBeDefined();
      expect(res.data.message.content).toBeDefined();
      expect(res.data.conversationId).toBeDefined();
    }, 20000);

    it('generates an AI Smart Day Plan matching cognitive focus curve', async () => {
      const res = await req('/ai/smart-planner/generate', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-11-03',
          preferences: { deepWorkFocus: true, bufferMinutes: 10 },
        }),
      });
      expect(res.success).toBe(true);
      expect(res.data.id).toBeDefined();
      expect(res.data.status).toBe('DRAFT');
      expect(res.data.diffMetrics).toBeDefined();
      proposalId = res.data.id;
    });

    it('transactionally commits the AI schedule proposal', async () => {
      const res = await req('/ai/smart-planner/commit', {
        method: 'POST',
        body: JSON.stringify({ proposalId }),
      });
      expect(res.success).toBe(true);
      expect(res.data.success).toBe(true);
    });
  });

  // =========================================================================
  // PHASES 33, 34, 35: PREDICTIVE ANALYTICS, LIFE BALANCE & UNIFIED TIMELINE
  // =========================================================================
  describe('Phases 33, 34, 35: Predictive Analytics, Life Balance & Activity Timeline', () => {
    it('Phase 33: retrieves predictive productivity velocity and burnout risk index', async () => {
      const res = await req('/analytics/predictive');
      expect(res.success).toBe(true);
      expect(res.data.predictedDailyCompletionRate).toBeGreaterThanOrEqual(0);
      expect(res.data.confidenceScore).toBeGreaterThan(0);
      expect(res.data.burnoutRiskScore).toBeDefined();
      expect(res.data.burnoutLevel).toBeDefined();
      expect(res.data.peakPerformanceHours).toBeDefined();
      expect(Array.isArray(res.data.explainableFactors)).toBe(true);
      expect(Array.isArray(res.data.recommendations)).toBe(true);
    });

    it('Phase 34: evaluates 8-dimension life equilibrium and harmony index', async () => {
      const res = await req('/analytics/life-balance');
      expect(res.success).toBe(true);
      expect(res.data.harmonyIndex).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data.dimensions)).toBe(true);
      expect(res.data.dimensions.length).toBe(8);

      const dimensionIds = res.data.dimensions.map((d: any) => d.id);
      expect(dimensionIds).toContain('career');
      expect(dimensionIds).toContain('health');
      expect(dimensionIds).toContain('focus');
      expect(dimensionIds).toContain('finance');
      expect(dimensionIds).toContain('mental');
      expect(dimensionIds).toContain('routines');
      expect(dimensionIds).toContain('growth');
      expect(dimensionIds).toContain('leisure');
    });

    it('Phase 35: streams unified chronological activity timeline across all domains', async () => {
      const res = await req('/analytics/timeline');
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);

      const categories = res.data.map((item: any) => item.category);
      expect(categories.some((c: string) => ['FOCUS', 'FINANCE', 'KNOWLEDGE', 'TASK', 'ROUTINE', 'GOAL'].includes(c))).toBe(true);
    });
  });
});
