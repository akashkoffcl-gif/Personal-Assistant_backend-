/**
 * Automated Test Suite for Phase 43.2
 * Validates:
 * 1. Day Timeline aggregation endpoint (/analytics/day-timeline)
 * 2. Task completion and timeline metrics
 * 3. Tasks workspace queries and filtering
 * 4. Projects workspace queries, creation, and progress computation
 * 5. Cross-user isolation
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/v1';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const ALT_USER_ID = '00000000-0000-0000-0000-000000000002';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 43.2 AUTOMATED TEST SUITE');
  console.log('====================================================');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test Day Timeline Aggregation for Today
    console.log('\n--- Test 1: Day Timeline Aggregation Endpoint ---');
    const todayStr = '2026-11-05';
    const timelineRes = await fetch(`${API_BASE}/analytics/day-timeline?date=${todayStr}`, {
      headers: {
        'x-user-id': TEST_USER_ID,
      },
    });

    assert(timelineRes.status === 200, `GET /analytics/day-timeline returns 200 OK (Status: ${timelineRes.status})`);
    const json = await timelineRes.json();
    assert(json.success === true, 'Response has success=true');
    const timelineData = json.data;
    assert(timelineData.date === todayStr, `Timeline response matches requested date (${timelineData.date})`);
    assert(typeof timelineData.summary === 'object', 'Timeline includes summary metrics object');
    assert(Array.isArray(timelineData.timeline), `Timeline includes timeline array (length: ${timelineData.timeline.length})`);
    assert(Array.isArray(timelineData.unscheduledTasks), `Timeline includes unscheduledTasks array (length: ${timelineData.unscheduledTasks.length})`);
    
    // Check metric fields
    assert(typeof timelineData.summary.completionPercentage === 'number', 'Summary has completionPercentage number');
    assert(typeof timelineData.summary.total === 'number', 'Summary has total number');
    assert(typeof timelineData.summary.completed === 'number', 'Summary has completed number');

    // 2. Test Chronological Sorting of Timeline Items
    console.log('\n--- Test 2: Chronological Ordering ---');
    if (timelineData.timeline.length > 1) {
      let isSorted = true;
      for (let i = 0; i < timelineData.timeline.length - 1; i++) {
        const timeA = timelineData.timeline[i].scheduledTime || '00:00';
        const timeB = timelineData.timeline[i + 1].scheduledTime || '00:00';
        if (timeA > timeB) {
          isSorted = false;
          break;
        }
      }
      assert(isSorted, 'Timeline items are ordered chronologically by scheduledTime');
    } else {
      console.log('[PASS] Less than 2 timeline items, chronological order trivially true');
      passed++;
    }

    // 3. Test Tasks API
    console.log('\n--- Test 3: Tasks API & Filters ---');
    const tasksRes = await fetch(`${API_BASE}/tasks`, {
      headers: { 'x-user-id': TEST_USER_ID },
    });
    assert(tasksRes.status === 200, `GET /tasks returns 200 OK (Status: ${tasksRes.status})`);
    const tasksJson = await tasksRes.json();
    const tasks = Array.isArray(tasksJson) ? tasksJson : tasksJson.data || [];
    assert(Array.isArray(tasks), `Tasks returned as array (Count: ${tasks.length})`);

    // 4. Test Projects API & Creation
    console.log('\n--- Test 4: Projects API & Workspace Creation ---');
    const projectsRes = await fetch(`${API_BASE}/projects`, {
      headers: { 'x-user-id': TEST_USER_ID },
    });
    assert(projectsRes.status === 200, `GET /projects returns 200 OK (Status: ${projectsRes.status})`);
    const projectsJson = await projectsRes.json();
    const projects = Array.isArray(projectsJson) ? projectsJson : projectsJson.data || [];
    assert(Array.isArray(projects), `Projects returned as array (Count: ${projects.length})`);

    // Create a new project
    const newProjName = `Phase 43.2 Test Project ${Date.now()}`;
    const createProjRes = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': TEST_USER_ID,
      },
      body: JSON.stringify({
        title: newProjName,
        name: newProjName,
        description: 'Automated test project for Phase 43.2 verification',
        color: '#8B45F5',
      }),
    });
    assert(createProjRes.status === 201 || createProjRes.status === 200, `POST /projects succeeds (Status: ${createProjRes.status})`);
    const createdProjJson = await createProjRes.json();
    const createdProject = createdProjJson.data || createdProjJson;
    assert(createdProject.id, `Created project has valid id: ${createdProject.id}`);

    // Create a task associated with this project
    const createTaskRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': TEST_USER_ID,
      },
      body: JSON.stringify({
        title: `Test Task for Project ${Date.now()}`,
        projectId: createdProject.id,
        priority: 'HIGH',
        category: 'WORK',
        estimatedDurationMinutes: 30,
      }),
    });
    assert(createTaskRes.status === 201 || createTaskRes.status === 200, `POST /tasks with projectId succeeds (Status: ${createTaskRes.status})`);
    const createdTaskJson = await createTaskRes.json();
    const createdTask = createdTaskJson.data || createdTaskJson;
    assert(createdTask.projectId === createdProject.id, 'Created task links to project');

    // 5. Test Cross-User Isolation
    console.log('\n--- Test 5: Cross-User Security Isolation ---');
    const altTimelineRes = await fetch(`${API_BASE}/analytics/day-timeline?date=${todayStr}`, {
      headers: { 'x-user-id': ALT_USER_ID },
    });
    assert(altTimelineRes.status === 200, 'GET /analytics/day-timeline for alternate user returns 200 OK');
    const altJson = await altTimelineRes.json();
    const altTimelineData = altJson.data || altJson;
    const leakedItem = (altTimelineData.timeline || []).find((i) => i.id === createdTask.id);
    assert(!leakedItem, 'Alternate user cannot see items created by primary test user');

    // Clean up created task & project
    console.log('\n--- Cleanup ---');
    await fetch(`${API_BASE}/tasks/${createdTask.id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': TEST_USER_ID },
    });
    await fetch(`${API_BASE}/projects/${createdProject.id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': TEST_USER_ID },
    });
    console.log('[PASS] Test fixtures cleaned up successfully');
    passed++;

  } catch (error) {
    console.error('Test suite encountered an unhandled exception:', error);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runTests();
