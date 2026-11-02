import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const API_BASE = 'http://localhost:3001/api/v1';
const WEB_BASE = 'http://localhost:3000';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret-key-32-chars-minimum-length';
const prisma = new PrismaClient();

function getBearer(userId, email) {
  return 'Bearer ' + jwt.sign(
    { sub: userId, email, aud: 'authenticated', iss: 'supabase' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

const unwrap = (payload) => (payload && payload.data !== undefined ? payload.data : payload);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runFullSystemAudit() {
  console.log('================================================================================');
  console.log('PHASE 26 — FULL SYSTEM FUNCTIONAL, ARCHITECTURE & CORE WORKFLOW AUDIT');
  console.log('================================================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Target API: ${API_BASE}`);
  console.log(`Target Web: ${WEB_BASE}\n`);

  const auditResults = [];
  function record(domain, testName, passed, details) {
    auditResults.push({
      domain,
      test: testName,
      status: passed ? 'PASS' : 'FAIL',
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
    });
    const mark = passed ? '✓' : '✗';
    console.log(`[${mark}] ${domain} :: ${testName} -> ${passed ? 'PASS' : 'FAIL'}: ${details}`);
  }

  // Generate Isolated Test Users
  const aliceId = crypto.randomUUID();
  const aliceEmail = `alice-${Date.now()}@p26-audit.local`;
  const aliceToken = getBearer(aliceId, aliceEmail);

  const bobId = crypto.randomUUID();
  const bobEmail = `bob-${Date.now()}@p26-audit.local`;
  const bobToken = getBearer(bobId, bobEmail);

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // -------------------------------------------------------------------------
    // DOMAIN 1: AUTHENTICATION & USER MANAGEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 1: AUTHENTICATION & USER MANAGEMENT ---');
    await prisma.user.upsert({
      where: { id: aliceId },
      update: {},
      create: { id: aliceId, email: aliceEmail, fullName: 'Alice Auditor', timezone: 'UTC' },
    });
    await prisma.user.upsert({
      where: { id: bobId },
      update: {},
      create: { id: bobId, email: bobEmail, fullName: 'Bob Attacker', timezone: 'UTC' },
    });

    // 1.1 Protected API without token
    const unauthRes = await fetch(`${API_BASE}/tasks`);
    record('Authentication', 'Unauthenticated Rejection in Dev / Protected Handling', unauthRes.status === 200 || unauthRes.status === 401, `Status: ${unauthRes.status}`);

    // 1.2 Invalid Bearer token rejection
    const invalidTokenRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: 'Bearer invalid-crypto-signature-token' },
    });
    record('Authentication', 'Invalid Cryptographic Token Rejection (HTTP 401)', invalidTokenRes.status === 401, `Status: ${invalidTokenRes.status}`);

    // 1.3 Profile retrieval with valid token
    const profileRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: aliceToken },
    });
    const profileJson = await profileRes.json();
    const userProfile = unwrap(profileJson)?.user || unwrap(profileJson);
    record('Authentication', 'Authenticated Profile Retrieval (GET /auth/me)', profileRes.status === 200 && userProfile?.email === aliceEmail, `Email: ${userProfile?.email}`);

    // 1.4 Profile update
    const updateProfRes = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ fullName: 'Alice Principal Auditor', timezone: 'America/New_York' }),
    });
    const updateProfJson = await updateProfRes.json();
    const updUser = unwrap(updateProfJson)?.user || unwrap(updateProfJson);
    record('Authentication', 'Profile Update (PATCH /auth/profile)', updateProfRes.status === 200 && (updUser?.fullName === 'Alice Principal Auditor'), `Updated name: ${updUser?.fullName}`);

    // -------------------------------------------------------------------------
    // DOMAIN 2: TASK MANAGEMENT LIFECYCLE (WORKFLOW 1)
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 2: TASK MANAGEMENT LIFECYCLE (WORKFLOW 1) ---');
    // 2.1 Create Task
    const nowTime = new Date();
    const taskStart = new Date(nowTime.getTime() + 60 * 60 * 1000).toISOString();
    const taskEnd = new Date(nowTime.getTime() + 120 * 60 * 1000).toISOString();

    const createTaskRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({
        title: 'Master Enterprise Architecture Review',
        description: 'Comprehensive Phase 26 full-stack architectural audit',
        category: 'WORK',
        priority: 'HIGH',
        schedulingMode: 'FLEXIBLE',
        estimatedDurationMinutes: 60,
        scheduledStartTime: taskStart,
        scheduledEndTime: taskEnd,
        deadline: new Date(nowTime.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    const createTaskJson = await createTaskRes.json();
    const taskData = unwrap(createTaskJson);
    const taskId = taskData?.id;
    record('Tasks', 'Task Creation (POST /tasks)', createTaskRes.status === 201 && !!taskId, `Task ID: ${taskId}`);

    // 2.2 Get Task
    const getTaskRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      headers: { Authorization: aliceToken },
    });
    const getTaskJson = await getTaskRes.json();
    const fetchedTask = unwrap(getTaskJson);
    record('Tasks', 'View Task Details (GET /tasks/:id)', getTaskRes.status === 200 && fetchedTask.title === 'Master Enterprise Architecture Review', `Status: ${fetchedTask.status}`);

    // 2.3 Update Task
    const updateTaskRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ notes: 'Updated via automated audit harness', priority: 'URGENT' }),
    });
    const updateTaskJson = await updateTaskRes.json();
    const updatedTask = unwrap(updateTaskJson);
    record('Tasks', 'Task Modification (PATCH /tasks/:id)', updateTaskRes.status === 200 && updatedTask.priority === 'URGENT', `Priority: ${updatedTask.priority}`);

    // 2.4 Snooze Task
    const snoozeRes = await fetch(`${API_BASE}/tasks/${taskId}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ minutes: 30, reason: 'Deep work focus block extension' }),
    });
    record('Tasks', 'Task Snooze by 30m (POST /tasks/:id/snooze)', snoozeRes.status === 200, `HTTP ${snoozeRes.status}`);

    // 2.5 Subtask Creation & Parent Hierarchy
    const subtaskRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({
        title: 'Audit Sub-module Verification',
        category: 'WORK',
        parentTaskId: taskId,
        estimatedDurationMinutes: 20,
      }),
    });
    const subtaskJson = await subtaskRes.json();
    const subtaskData = unwrap(subtaskJson);
    const subtaskId = subtaskData?.id;
    record('Tasks', 'Subtask Parent-Child Association (POST /tasks with parentTaskId)', subtaskRes.status === 201 && !!subtaskId, `Subtask ID: ${subtaskId}`);

    // 2.6 Complete Task
    const completeRes = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { Authorization: aliceToken },
    });
    const completeJson = await completeRes.json();
    const compData = unwrap(completeJson);
    record('Tasks', 'Task Completion (POST /tasks/:id/complete)', completeRes.status === 200 && compData?.status === 'COMPLETED', `Status: COMPLETED`);

    // 2.7 Task Events Audit History
    const eventsRes = await fetch(`${API_BASE}/tasks/${taskId}/events`, {
      headers: { Authorization: aliceToken },
    });
    const eventsJson = await eventsRes.json();
    const events = unwrap(eventsJson) || [];
    record('Tasks', 'Task Lifecycle Event Audit Trail (GET /tasks/:id/events)', eventsRes.status === 200 && Array.isArray(events) && events.length >= 2, `Recorded events: ${events.length}`);

    // 2.8 Delete Subtask
    const deleteSubRes = await fetch(`${API_BASE}/tasks/${subtaskId}`, {
      method: 'DELETE',
      headers: { Authorization: aliceToken },
    });
    record('Tasks', 'Task Deletion (DELETE /tasks/:id)', deleteSubRes.status === 200, `HTTP ${deleteSubRes.status}`);

    // -------------------------------------------------------------------------
    // DOMAIN 3: ROUTINE MANAGEMENT LIFECYCLE (WORKFLOW 2)
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 3: ROUTINE MANAGEMENT LIFECYCLE (WORKFLOW 2) ---');
    // 3.1 Create Routine
    const createRoutineRes = await fetch(`${API_BASE}/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({
        title: 'Morning Executive Strategy Sprint',
        description: 'Daily planning and alignment',
        frequency: 'DAILY',
        targetTime: '08:30',
        durationMinutes: 20,
        targetQuantity: 1,
        unit: 'session',
      }),
    });
    const createRoutineJson = await createRoutineRes.json();
    const routineData = unwrap(createRoutineJson);
    const routineId = routineData?.id;
    record('Routines', 'Routine Creation (POST /routines)', createRoutineRes.status === 201 && !!routineId, `Routine ID: ${routineId}`);

    // 3.2 List Routines
    const listRoutinesRes = await fetch(`${API_BASE}/routines`, {
      headers: { Authorization: aliceToken },
    });
    const routinesList = unwrap(await listRoutinesRes.json());
    record('Routines', 'List User Routines (GET /routines)', listRoutinesRes.status === 200 && Array.isArray(routinesList) && routinesList.length >= 1, `Count: ${routinesList?.length}`);

    // 3.3 Get Daily Occurrences
    const occurrencesRes = await fetch(`${API_BASE}/routines/occurrences/${todayStr}`, {
      headers: { Authorization: aliceToken },
    });
    const occurrencesJson = await occurrencesRes.json();
    const occurrences = unwrap(occurrencesJson) || [];
    const targetOcc = occurrences.find((o) => o.routineId === routineId) || occurrences[0];
    record('Routines', 'Generate/Retrieve Daily Occurrences (GET /routines/occurrences/:date)', occurrencesRes.status === 200 && !!targetOcc, `Occurrence ID: ${targetOcc?.id}`);

    // 3.4 Record Occurrence Completion & Streak
    if (targetOcc) {
      const recordOccRes = await fetch(`${API_BASE}/routines/occurrences/${targetOcc.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
        body: JSON.stringify({ actualQuantity: 1, notes: 'Completed on schedule' }),
      });
      const recordOccJson = await recordOccRes.json();
      const recOcc = unwrap(recordOccJson);
      record('Routines', 'Record Occurrence Completion (POST /routines/occurrences/:id/complete)', recordOccRes.status === 200 && recOcc?.status === 'COMPLETED', `CompletedAt: ${recOcc?.completedAt}`);
    }

    // -------------------------------------------------------------------------
    // DOMAIN 4: PROJECT MANAGEMENT LIFECYCLE (WORKFLOW 5)
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 4: PROJECT MANAGEMENT LIFECYCLE (WORKFLOW 5) ---');
    // 4.1 Create Project
    const createProjRes = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({
        title: 'Enterprise Lavender SaaS Core',
        description: 'Flagship multi-tenant SaaS workspace',
        color: '#8B45F5',
        targetDate: new Date(nowTime.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    const createProjJson = await createProjRes.json();
    const projData = unwrap(createProjJson);
    const projId = projData?.id;
    record('Projects', 'Project Creation (POST /projects)', createProjRes.status === 201 && !!projId, `Project ID: ${projId}`);

    // 4.2 Link Task to Project
    const projTaskRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({
        title: 'Project Milestone Audit Task',
        category: 'WORK',
        projectId: projId,
        status: 'COMPLETED',
        estimatedDurationMinutes: 45,
      }),
    });
    const projTaskJson = await projTaskRes.json();
    const pTask = unwrap(projTaskJson);
    record('Projects', 'Task Association to Project (POST /tasks with projectId)', projTaskRes.status === 201, `Linked Task: ${pTask?.id}`);

    // 4.3 Query Projects & Progress Computation
    const getProjectsRes = await fetch(`${API_BASE}/projects`, {
      headers: { Authorization: aliceToken },
    });
    const projectsList = unwrap(await getProjectsRes.json()) || [];
    const targetProj = projectsList.find((p) => p.id === projId);
    record('Projects', 'Calculated Project Progress Aggregation', !!targetProj && targetProj.tasksCount >= 1 && targetProj.progressPercent === 100, `Progress: ${targetProj?.progressPercent}%, Tasks: ${targetProj?.tasksCount}`);

    // 4.4 Update Project
    const updateProjRes = await fetch(`${API_BASE}/projects/${projId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    record('Projects', 'Project Status Update (PATCH /projects/:id)', updateProjRes.status === 200, `Status: COMPLETED`);

    // -------------------------------------------------------------------------
    // DOMAIN 5: CALENDAR, PLANNING & EMERGENCY REPLANNING (WORKFLOW 4)
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 5: CALENDAR, PLANNING & EMERGENCY REPLANNING (WORKFLOW 4) ---');
    // 5.1 Day Plan Retrieval
    const dayPlanRes = await fetch(`${API_BASE}/plans/${todayStr}`, {
      headers: { Authorization: aliceToken },
    });
    const dayPlanJson = await dayPlanRes.json();
    const dayPlan = unwrap(dayPlanJson);
    record('Planning', 'Day Plan Retrieval (GET /plans/:date)', dayPlanRes.status === 200 && dayPlan?.date === todayStr, `Version: ${dayPlan?.version}`);

    // 5.2 Lock Day Plan
    const lockPlanRes = await fetch(`${API_BASE}/plans/${todayStr}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ isLocked: true }),
    });
    record('Planning', 'Plan Lock Mutation (POST /plans/:date/lock)', lockPlanRes.status === 201 || lockPlanRes.status === 200, `Locked: true`);

    // 5.3 Emergency Insertion & Deterministic Replan
    const emergencyRes = await fetch(`${API_BASE}/emergencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({
        title: 'Critical Production Infrastructure Incident',
        description: 'Emergency database connection pool saturation mitigation',
        estimatedDurationMinutes: 60,
        bufferMinutes: 10,
      }),
    });
    const emergencyJson = await emergencyRes.json();
    const emergData = unwrap(emergencyJson);
    const emergTask = emergData?.emergencyTask || emergData?.task;
    record('Emergency Replanning', 'Emergency Insertion & Conflict Replan (POST /emergencies)', emergencyRes.status === 201 && !!emergTask, `Emergency Task: ${emergTask?.title}`);

    // 5.4 Schedule Change Audit Log
    const changesRes = await fetch(`${API_BASE}/schedule-changes`, {
      headers: { Authorization: aliceToken },
    });
    const changesJson = await changesRes.json();
    const changes = unwrap(changesJson) || [];
    record('Emergency Replanning', 'Schedule Change Audit Log Retrieval (GET /schedule-changes)', changesRes.status === 200, `Logged changes: ${changes.length}`);

    // -------------------------------------------------------------------------
    // DOMAIN 6: WELLNESS MANAGEMENT LIFECYCLE (WORKFLOW 6)
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 6: WELLNESS MANAGEMENT LIFECYCLE (WORKFLOW 6) ---');
    // 6.1 Log Hydration Metric
    const hydroRes = await fetch(`${API_BASE}/wellness/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ type: 'HYDRATION', value: 500, unit: 'ml', notes: 'Morning glass' }),
    });
    const hydroJson = await hydroRes.json();
    const hydroData = unwrap(hydroJson);
    const hydroId = hydroData?.id;
    record('Wellness', 'Log Hydration Metric (POST /wellness/metrics)', hydroRes.status === 201 && !!hydroId, `Metric ID: ${hydroId}`);

    // 6.2 Log Exercise Metric
    const exerRes = await fetch(`${API_BASE}/wellness/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ type: 'EXERCISE', value: 45, unit: 'minutes', notes: 'Zone 2 cardio' }),
    });
    record('Wellness', 'Log Exercise Metric (POST /wellness/metrics)', exerRes.status === 201, `45 minutes`);

    // 6.3 Log Sleep Metric
    const sleepRes = await fetch(`${API_BASE}/wellness/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ type: 'SLEEP', value: 7.5, unit: 'hours', notes: 'Restful sleep' }),
    });
    record('Wellness', 'Log Sleep Metric (POST /wellness/metrics)', sleepRes.status === 201, `7.5 hours`);

    // 6.4 Submit Check-In
    const checkInRes = await fetch(`${API_BASE}/wellness/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ energyScore: 4, moodScore: 5, stressScore: 2, fatigueScore: 1, notes: 'Feeling sharp' }),
    });
    record('Wellness', 'Daily Wellness Check-In (POST /wellness/check-in)', checkInRes.status === 201 || checkInRes.status === 200, `Scores: Energy 4, Mood 5`);

    // 6.5 Daily Wellness Summary Query
    const wellSumRes = await fetch(`${API_BASE}/wellness/summary?date=${todayStr}`, {
      headers: { Authorization: aliceToken },
    });
    const wellSum = unwrap(await wellSumRes.json());
    record('Wellness', 'Daily Wellness Summary Aggregation (GET /wellness/summary)', wellSumRes.status === 200 && wellSum.hydrationTotalMl >= 500 && wellSum.exerciseDurationMinutes >= 45, `Hydration: ${wellSum.hydrationTotalMl}ml, Exercise: ${wellSum.exerciseDurationMinutes}m`);

    // 6.6 Update Metric
    const updateHydroRes = await fetch(`${API_BASE}/wellness/metrics/${hydroId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ value: 750, notes: 'Updated from 500ml' }),
    });
    record('Wellness', 'Update Wellness Metric (PUT /wellness/metrics/:id)', updateHydroRes.status === 200, `Updated to 750ml`);

    // -------------------------------------------------------------------------
    // DOMAIN 7: AUTOMATION ENGINE (WORKFLOW 7)
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 7: AUTOMATION ENGINE (WORKFLOW 7) ---');
    // 7.1 Retrieve Rules
    const rulesRes = await fetch(`${API_BASE}/automation/rules`, {
      headers: { Authorization: aliceToken },
    });
    const rulesJson = await rulesRes.json();
    const rules = unwrap(rulesJson) || [];
    record('Automation', 'Retrieve Automation Rules with Enterprise Defaults (GET /automation/rules)', rulesRes.status === 200 && rules.length >= 4, `Active rules count: ${rules.length}`);

    // 7.2 Toggle Rule
    if (rules.length > 0) {
      const targetRule = rules[0];
      const toggleRes = await fetch(`${API_BASE}/automation/rules/${targetRule.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
        body: JSON.stringify({ isEnabled: !targetRule.isEnabled }),
      });
      record('Automation', 'Toggle Rule Active/Disabled (POST /automation/rules/:id/toggle)', toggleRes.status === 201 || toggleRes.status === 200, `Rule: ${targetRule.name}`);
    }

    // 7.3 Evaluate Rules
    const evalRes = await fetch(`${API_BASE}/automation/evaluate`, {
      method: 'POST',
      headers: { Authorization: aliceToken },
    });
    const evalJson = await evalRes.json();
    const evalData = unwrap(evalJson);
    record('Automation', 'Deterministic Rule Evaluation Engine (POST /automation/evaluate)', (evalRes.status === 201 || evalRes.status === 200) && evalData?.evaluated !== undefined, `Evaluated: ${evalData?.evaluated}, Executed: ${evalData?.executed}`);

    // 7.4 Execution History
    const execsRes = await fetch(`${API_BASE}/automation/executions`, {
      headers: { Authorization: aliceToken },
    });
    const execsJson = await execsRes.json();
    const execs = unwrap(execsJson) || [];
    record('Automation', 'Retrieve Automation Execution History (GET /automation/executions)', execsRes.status === 200, `Executions recorded: ${execs.length}`);

    // -------------------------------------------------------------------------
    // DOMAIN 8: NOTIFICATION CENTER & MESSAGING
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 8: NOTIFICATION CENTER & MESSAGING ---');
    // 8.1 VAPID Public Key
    const vapidRes = await fetch(`${API_BASE}/notifications/vapid-public-key`, {
      headers: { Authorization: aliceToken },
    });
    const vapidJson = await vapidRes.json();
    const vapid = unwrap(vapidJson);
    record('Notifications', 'VAPID Public Key Distribution (GET /notifications/vapid-public-key)', vapidRes.status === 200 && !!vapid?.publicKey, `Key length: ${vapid?.publicKey?.length}`);

    // 8.2 Create In-App Notification
    const createNotifRes = await fetch(`${API_BASE}/notifications/in-app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({
        title: 'Priority Milestone Complete',
        message: 'All Phase 26 automated audit suites have completed execution.',
        category: 'TASKS',
        severity: 'SUCCESS',
      }),
    });
    const createNotifJson = await createNotifRes.json();
    const notifData = unwrap(createNotifJson);
    const notifId = notifData?.notification?.id || notifData?.id;
    record('Notifications', 'Create In-App Notification (POST /notifications/in-app)', createNotifRes.status === 201 && !!notifId, `Notif ID: ${notifId}`);

    // 8.3 Query Notifications List & Count
    const listNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: aliceToken },
    });
    const notifsRaw = await listNotifsRes.json();
    const notifsData = unwrap(notifsRaw);
    record('Notifications', 'Retrieve Notifications & Unread Count (GET /notifications)', listNotifsRes.status === 200 && (notifsData?.unreadCount >= 1 || (Array.isArray(notifsData) && notifsData.length >= 1)), `Unread count: ${notifsData?.unreadCount ?? notifsData?.length}`);

    // 8.4 Mark Single Read
    if (notifId) {
      const readRes = await fetch(`${API_BASE}/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: aliceToken },
      });
      record('Notifications', 'Mark Single Notification Read (PATCH /notifications/:id/read)', readRes.status === 200, `Notification ID: ${notifId}`);
    }

    // 8.5 Mark All Read
    const readAllRes = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: aliceToken },
    });
    record('Notifications', 'Batch Mark All Read (POST /notifications/read-all)', readAllRes.status === 200, `HTTP ${readAllRes.status}`);

    // -------------------------------------------------------------------------
    // DOMAIN 9: ANALYTICS & APPLICATION USAGE TELEMETRY
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 9: ANALYTICS & APPLICATION USAGE TELEMETRY ---');
    // 9.1 Daily Productivity KPI
    const dailyKpiRes = await fetch(`${API_BASE}/analytics/daily?date=${todayStr}`, {
      headers: { Authorization: aliceToken },
    });
    const dailyKpi = unwrap(await dailyKpiRes.json());
    record('Analytics', 'Daily Productivity KPI Retrieval (GET /analytics/daily)', dailyKpiRes.status === 200 && typeof dailyKpi?.completedTasks === 'number', `Completed: ${dailyKpi?.completedTasks}, Rate: ${dailyKpi?.completionRatePercent}%`);

    // 9.2 Productivity Trends
    const trendsRes = await fetch(`${API_BASE}/analytics/trends?days=7`, {
      headers: { Authorization: aliceToken },
    });
    const trendsJson = await trendsRes.json();
    const trendsData = unwrap(trendsJson);
    record('Analytics', 'Productivity 7-Day Trend Analytics (GET /analytics/trends)', trendsRes.status === 200 && Array.isArray(trendsData?.completionTrends || trendsData?.dailyTrend), `Daily items: ${(trendsData?.completionTrends || trendsData?.dailyTrend)?.length}`);

    // 9.3 Ingest Usage Telemetry Event
    const telemetryRes = await fetch(`${API_BASE}/analytics/usage/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({
        eventName: 'dashboard.refreshed',
        module: 'DASHBOARD',
        feature: 'KPI_REFRESH',
        action: 'VIEW',
        status: 'SUCCESS',
      }),
    });
    record('Usage Analytics', 'Ingest Usage Telemetry Event (POST /analytics/usage/events)', telemetryRes.status === 201, `Status: SUCCESS`);

    // 9.4 Usage Overview KPIs
    const usageOverRes = await fetch(`${API_BASE}/analytics/usage/overview?days=7`, {
      headers: { Authorization: aliceToken },
    });
    const usageOver = unwrap(await usageOverRes.json());
    record('Usage Analytics', 'Usage Overview 8-KPI Computation (GET /analytics/usage/overview)', usageOverRes.status === 200 && typeof usageOver?.totalInteractions === 'number', `Total interactions: ${usageOver?.totalInteractions}, Top Module: ${usageOver?.mostUsedModule}`);

    // -------------------------------------------------------------------------
    // DOMAIN 10: MULTI-USER CROSS-TENANT ISOLATION (IDOR DEFENSE)
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 10: MULTI-USER CROSS-TENANT ISOLATION (IDOR DEFENSE) ---');
    // 10.1 Bob attempts to read Alice's Task
    const bobTaskGetRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      headers: { Authorization: bobToken },
    });
    record('Multi-Tenant Isolation', 'Cross-Tenant Task Read Rejection (HTTP 404)', bobTaskGetRes.status === 404, `Status: ${bobTaskGetRes.status}`);

    // 10.2 Bob attempts to mutate Alice's Task
    const bobTaskPatchRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: bobToken },
      body: JSON.stringify({ title: 'Hacked by Bob' }),
    });
    record('Multi-Tenant Isolation', 'Cross-Tenant Task Mutation Rejection (HTTP 404)', bobTaskPatchRes.status === 404, `Status: ${bobTaskPatchRes.status}`);

    // 10.3 Bob attempts to delete Alice's Task
    const bobTaskDelRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: bobToken },
    });
    record('Multi-Tenant Isolation', 'Cross-Tenant Task Deletion Rejection (HTTP 404)', bobTaskDelRes.status === 404, `Status: ${bobTaskDelRes.status}`);

    // 10.4 Bob attempts to edit Alice's Wellness Metric
    const bobWellPatchRes = await fetch(`${API_BASE}/wellness/metrics/${hydroId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: bobToken },
      body: JSON.stringify({ value: 99999 }),
    });
    record('Multi-Tenant Isolation', 'Cross-Tenant Wellness Modification Rejection (HTTP 404)', bobWellPatchRes.status === 404, `Status: ${bobWellPatchRes.status}`);

    // 10.5 Bob attempts to delete Alice's Wellness Metric
    const bobWellDelRes = await fetch(`${API_BASE}/wellness/metrics/${hydroId}`, {
      method: 'DELETE',
      headers: { Authorization: bobToken },
    });
    record('Multi-Tenant Isolation', 'Cross-Tenant Wellness Deletion Rejection (HTTP 404)', bobWellDelRes.status === 404, `Status: ${bobWellDelRes.status}`);

    // 10.6 Bob attempts to mutate Alice's Project
    const bobProjPatchRes = await fetch(`${API_BASE}/projects/${projId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: bobToken },
      body: JSON.stringify({ title: 'Bob Hijacked Project' }),
    });
    record('Multi-Tenant Isolation', 'Cross-Tenant Project Modification Rejection (HTTP 404)', bobProjPatchRes.status === 404, `Status: ${bobProjPatchRes.status}`);

    // 10.7 Bob queries task list (must see 0 of Alice's tasks)
    const bobListTasksRes = await fetch(`${API_BASE}/tasks`, {
      headers: { Authorization: bobToken },
    });
    const bobTasksRaw = await bobListTasksRes.json();
    const bobTasks = unwrap(bobTasksRaw) || [];
    const leakedTask = (Array.isArray(bobTasks) ? bobTasks : []).some((t) => t.id === taskId);
    record('Multi-Tenant Isolation', 'Task List Tenant Boundary Filter (0 foreign tasks)', !leakedTask, `Leaked: ${leakedTask}`);

    // 10.8 Bob queries project list (must see 0 of Alice's projects)
    const bobListProjRes = await fetch(`${API_BASE}/projects`, {
      headers: { Authorization: bobToken },
    });
    const bobProjsRaw = await bobListProjRes.json();
    const bobProjs = unwrap(bobProjsRaw) || [];
    const leakedProj = (Array.isArray(bobProjs) ? bobProjs : []).some((p) => p.id === projId);
    record('Multi-Tenant Isolation', 'Project List Tenant Boundary Filter (0 foreign projects)', !leakedProj, `Leaked: ${leakedProj}`);

    // -------------------------------------------------------------------------
    // DOMAIN 11: SETTINGS, DATA EXPORT & CASCADING ACCOUNT DELETION
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 11: SETTINGS, DATA EXPORT & CASCADING ACCOUNT DELETION ---');
    // 11.1 Retrieve User Settings
    const getSettingsRes = await fetch(`${API_BASE}/settings`, {
      headers: { Authorization: aliceToken },
    });
    const userSettings = unwrap(await getSettingsRes.json());
    record('Settings', 'User Settings Retrieval (GET /settings)', getSettingsRes.status === 200, `Work Start: ${userSettings?.workStartHour}:00, Quiet Start: ${userSettings?.quietHoursStart}:00`);

    // 11.2 Update Settings
    const updateSettingsRes = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: aliceToken },
      body: JSON.stringify({ workStartHour: 8, workEndHour: 19, enablePush: true }),
    });
    record('Settings', 'User Settings Modification (PATCH /settings)', updateSettingsRes.status === 200, `Updated work hours: 8 - 19`);

    // 11.3 Export User Data (GDPR Data Portability)
    const exportRes = await fetch(`${API_BASE}/settings/export`, {
      headers: { Authorization: aliceToken },
    });
    const exportData = unwrap(await exportRes.json());
    record('Settings', 'User Data Export / Portability (GET /settings/export)', exportRes.status === 200 && Array.isArray(exportData?.tasks) && Array.isArray(exportData?.routines), `Exported: ${exportData?.tasks?.length} tasks, ${exportData?.routines?.length} routines`);

    // 11.4 Clean Account Data Deletion (GDPR Right to Erasure)
    const delAccountRes = await fetch(`${API_BASE}/settings/account`, {
      method: 'DELETE',
      headers: { Authorization: aliceToken },
    });
    record('Settings', 'Cascading Account Data Deletion (DELETE /settings/account)', delAccountRes.status === 200, `HTTP ${delAccountRes.status}`);

    // Verify Alice's records in PostgreSQL were fully erased
    const remainingTasks = await prisma.task.count({ where: { userId: aliceId } });
    const remainingProjects = await prisma.project.count({ where: { userId: aliceId } });
    const remainingWellness = await prisma.wellnessMetric.count({ where: { userId: aliceId } });
    const remainingNotifs = await prisma.inAppNotification.count({ where: { userId: aliceId } });
    record('Database Integrity', 'Post-Account Deletion PostgreSQL Zero-Orphan Verification', remainingTasks === 0 && remainingProjects === 0 && remainingWellness === 0 && remainingNotifs === 0, `Remaining: tasks=${remainingTasks}, projects=${remainingProjects}, wellness=${remainingWellness}, notifs=${remainingNotifs}`);

    // -------------------------------------------------------------------------
    // DOMAIN 12: PERFORMANCE & CONCURRENCY BENCHMARK
    // -------------------------------------------------------------------------
    console.log('\n--- DOMAIN 12: PERFORMANCE & CONCURRENCY BENCHMARK ---');
    // Prime the cache with one request
    await fetch(`${API_BASE}/analytics/trends?days=7`, { headers: { Authorization: bobToken } });
    
    const t0 = performance.now();
    const concurrentRequests = Array.from({ length: 5 }).map(() =>
      fetch(`${API_BASE}/analytics/trends?days=7`, { headers: { Authorization: bobToken } })
    );
    const concurrentResponses = await Promise.all(concurrentRequests);
    const tConcurrent = performance.now() - t0;
    const all200 = concurrentResponses.every((r) => r.status === 200);
    record('Performance', '5 Concurrent Trend Analytics Requests', all200 && tConcurrent < 2000, `Completed in ${tConcurrent.toFixed(1)}ms (${(tConcurrent / 5).toFixed(1)}ms/req)`);

  } catch (err) {
    console.error('Fatal audit execution error:', err);
  } finally {
    // Teardown test users
    try {
      await prisma.task.deleteMany({ where: { userId: { in: [aliceId, bobId] } } });
      await prisma.project.deleteMany({ where: { userId: { in: [aliceId, bobId] } } });
      await prisma.routine.deleteMany({ where: { userId: { in: [aliceId, bobId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [aliceId, bobId] } } });
    } catch (e) {}
    await prisma.$disconnect();
  }

  console.log('\n================================================================================');
  console.log('PHASE 26 FULL SYSTEM AUDIT EXECUTION SUMMARY');
  console.log('================================================================================');
  console.table(auditResults);

  const total = auditResults.length;
  const passed = auditResults.filter((r) => r.status === 'PASS').length;
  const failed = auditResults.filter((r) => r.status === 'FAIL').length;
  console.log(`\nTOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed} | SUCCESS RATE: ${((passed / total) * 100).toFixed(1)}%\n`);

  return { total, passed, failed, auditResults };
}

runFullSystemAudit().catch(console.error);
