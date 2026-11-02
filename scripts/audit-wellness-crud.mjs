import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const API_BASE = 'http://localhost:3001/api/v1';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret-key-32-chars-minimum-length';
const prisma = new PrismaClient();

function getBearer(userId, email) {
  return 'Bearer ' + jwt.sign(
    { sub: userId, email, aud: 'authenticated', iss: 'supabase' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

async function runWellnessAudit() {
  console.log('================================================================');
  console.log('AUDIT SECTION 7: WELLNESS CRUD AND DATA PRIVACY AUDIT');
  console.log('================================================================');

  const testUserA = 'wellness-audit-user-alice-' + Date.now();
  const testUserB = 'wellness-audit-user-bob-' + Date.now();
  const tokenA = getBearer(testUserA, 'alice-wellness@test.local');
  const tokenB = getBearer(testUserB, 'bob-wellness@test.local');

  const todayStr = new Date().toISOString().split('T')[0];
  const auditResults = [];

  try {
    // 1. Create Hydration Record
    console.log('\n--- 1. Create Hydration Record ---');
    const hydroRes = await fetch(`${API_BASE}/wellness/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: tokenA },
      body: JSON.stringify({
        type: 'HYDRATION',
        value: 500,
        unit: 'ml',
        notes: 'Morning large glass of water'
      })
    });
    const hydroData = await hydroRes.json();
    const hydroMetric = hydroData.data || hydroData;
    console.log(`Created Hydration Metric: ID=${hydroMetric.id}, Value=${hydroMetric.value} ${hydroMetric.unit}`);
    auditResults.push({
      test: 'Hydration Record Creation',
      status: hydroRes.status === 201 && hydroMetric.id ? 'PASS' : 'FAIL',
      details: `Metric ID ${hydroMetric.id}, value 500 ml`
    });

    // 2. Create Exercise Record
    console.log('\n--- 2. Create Exercise Record ---');
    const exerciseRes = await fetch(`${API_BASE}/wellness/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: tokenA },
      body: JSON.stringify({
        type: 'EXERCISE',
        value: 45,
        unit: 'minutes',
        notes: 'High Intensity Interval Training'
      })
    });
    const exerciseData = await exerciseRes.json();
    const exerciseMetric = exerciseData.data || exerciseData;
    console.log(`Created Exercise Metric: ID=${exerciseMetric.id}, Duration=${exerciseMetric.value} ${exerciseMetric.unit}`);
    auditResults.push({
      test: 'Exercise Record Creation',
      status: exerciseRes.status === 201 && exerciseMetric.id ? 'PASS' : 'FAIL',
      details: `Metric ID ${exerciseMetric.id}, duration 45 minutes`
    });

    // 3. Create Sleep Record
    console.log('\n--- 3. Create Sleep Record ---');
    const sleepRes = await fetch(`${API_BASE}/wellness/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: tokenA },
      body: JSON.stringify({
        type: 'SLEEP',
        value: 7.5,
        unit: 'hours',
        notes: 'Restful 7.5 hours sleep'
      })
    });
    const sleepData = await sleepRes.json();
    const sleepMetric = sleepData.data || sleepData;
    console.log(`Created Sleep Metric: ID=${sleepMetric.id}, Duration=${sleepMetric.value} ${sleepMetric.unit}`);
    auditResults.push({
      test: 'Sleep Record Creation',
      status: sleepRes.status === 201 && sleepMetric.id ? 'PASS' : 'FAIL',
      details: `Metric ID ${sleepMetric.id}, duration 7.5 hours`
    });

    // 4. Create Focus Break Record
    console.log('\n--- 4. Create Focus Break Record ---');
    const breakRes = await fetch(`${API_BASE}/wellness/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: tokenA },
      body: JSON.stringify({
        type: 'BREAK',
        value: 15,
        unit: 'minutes',
        notes: 'Post-deep work stretch break'
      })
    });
    const breakData = await breakRes.json();
    const breakMetric = breakData.data || breakData;
    console.log(`Created Break Metric: ID=${breakMetric.id}, Value=${breakMetric.value} ${breakMetric.unit}`);
    auditResults.push({
      test: 'Focus Break Record Creation',
      status: breakRes.status === 201 && breakMetric.id ? 'PASS' : 'FAIL',
      details: `Metric ID ${breakMetric.id}, duration 15 minutes`
    });

    // 5. Create Mood & Energy Check-In
    console.log('\n--- 5. Mood and Energy Check-In ---');
    const checkInRes = await fetch(`${API_BASE}/wellness/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: tokenA },
      body: JSON.stringify({
        energyLevel: 8,
        mood: 'Enthusiastic and Focused',
        notes: 'Productive morning'
      })
    });
    const checkInData = await checkInRes.json();
    console.log(`Check-in result: Status=${checkInRes.status}`);
    auditResults.push({
      test: 'Daily Check-In (Mood & Energy)',
      status: (checkInRes.status === 200 || checkInRes.status === 201) ? 'PASS' : 'FAIL',
      details: 'Energy: 8/10, Mood: Enthusiastic'
    });

    // 6. Verify Daily Summary Totals
    console.log('\n--- 6. Verify Wellness Summary Totals ---');
    const summaryRes = await fetch(`${API_BASE}/wellness/summary?date=${todayStr}`, {
      headers: { Authorization: tokenA }
    });
    const summaryData = await summaryRes.json();
    const sumObj = summaryData.data || summaryData;
    console.log('Summary returned:', {
      hydrationTotalMl: sumObj.hydrationTotalMl,
      exerciseDurationMinutes: sumObj.exerciseDurationMinutes,
      sleepHours: sumObj.sleepHours
    });
    const summaryAccurate = sumObj.hydrationTotalMl >= 500 && sumObj.exerciseDurationMinutes >= 45 && sumObj.sleepHours >= 7.5;
    auditResults.push({
      test: 'Daily Aggregations & Target Calculations',
      status: summaryAccurate ? 'PASS' : 'FAIL',
      details: `Hydration: ${sumObj.hydrationTotalMl}ml, Exercise: ${sumObj.exerciseDurationMinutes}m, Sleep: ${sumObj.sleepHours}h`
    });

    // 7. Edit / Update Record
    console.log('\n--- 7. Record Editing & Updating ---');
    const editRes = await fetch(`${API_BASE}/wellness/metrics/${hydroMetric.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: tokenA },
      body: JSON.stringify({
        value: 750,
        unit: 'ml',
        notes: 'Updated: added extra glass of water'
      })
    });
    const editData = await editRes.json();
    const editedMetric = editData.data || editData;
    console.log(`Updated Metric ID ${hydroMetric.id} to ${editedMetric.value} ${editedMetric.unit}`);
    auditResults.push({
      test: 'Record Editing (PUT /wellness/metrics/:id)',
      status: (editRes.status === 200 && editedMetric.value === 750) ? 'PASS' : 'FAIL',
      details: `Updated value from 500 to ${editedMetric.value} ml`
    });

    // 8. Multi-User Isolation & Ownership Enforcement
    console.log('\n--- 8. Multi-User Cross-Tenant Isolation Enforcement ---');
    // Bob attempts to edit Alice's metric
    const bobEditRes = await fetch(`${API_BASE}/wellness/metrics/${hydroMetric.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: tokenB },
      body: JSON.stringify({ value: 9999, unit: 'ml' })
    });
    console.log(`Bob edit Alice's metric status: ${bobEditRes.status}`);
    const editBlocked = bobEditRes.status === 404 || bobEditRes.status === 403;
    auditResults.push({
      test: 'Cross-User Edit Rejection',
      status: editBlocked ? 'PASS (404/403 Rejected)' : 'FAIL (Security Violation)',
      details: `Bob edit attempt yielded HTTP ${bobEditRes.status}`
    });

    // Bob attempts to delete Alice's metric
    const bobDeleteRes = await fetch(`${API_BASE}/wellness/metrics/${hydroMetric.id}`, {
      method: 'DELETE',
      headers: { Authorization: tokenB }
    });
    console.log(`Bob delete Alice's metric status: ${bobDeleteRes.status}`);
    const deleteBlocked = bobDeleteRes.status === 404 || bobDeleteRes.status === 403;
    auditResults.push({
      test: 'Cross-User Delete Rejection',
      status: deleteBlocked ? 'PASS (404/403 Rejected)' : 'FAIL (Security Violation)',
      details: `Bob delete attempt yielded HTTP ${bobDeleteRes.status}`
    });

    // Bob requests his wellness metrics list - must not see Alice's records
    const bobListRes = await fetch(`${API_BASE}/wellness/metrics?date=${todayStr}`, {
      headers: { Authorization: tokenB }
    });
    const bobListData = await bobListRes.json();
    const bobItems = bobListData.data || bobListData || [];
    const leaked = Array.isArray(bobItems) && bobItems.some(m => m.userId === testUserA || m.id === hydroMetric.id);
    console.log(`Bob metrics list leaked Alice record: ${leaked}`);
    auditResults.push({
      test: 'Wellness List Tenant Scoping',
      status: !leaked ? 'PASS (Zero Leaks)' : 'FAIL (Data Leak)',
      details: `Bob retrieved ${bobItems.length} records; Alice records present: ${leaked}`
    });

    // 9. Legitimate Deletion by Owner
    console.log('\n--- 9. Record Deletion by Owner ---');
    const deleteRes = await fetch(`${API_BASE}/wellness/metrics/${breakMetric.id}`, {
      method: 'DELETE',
      headers: { Authorization: tokenA }
    });
    console.log(`Alice deleted break metric status: ${deleteRes.status}`);
    auditResults.push({
      test: 'Record Deletion (DELETE /wellness/metrics/:id)',
      status: deleteRes.status === 200 ? 'PASS' : 'FAIL',
      details: `Successfully deleted metric ID ${breakMetric.id}`
    });

    // 10. Direct PostgreSQL Database Persistence Verification
    console.log('\n--- 10. Direct PostgreSQL Database Persistence Verification ---');
    const dbRecords = await prisma.wellnessMetric.findMany({
      where: { userId: testUserA }
    });
    console.log(`Direct DB Query: Found ${dbRecords.length} records persisted for user ${testUserA}`);
    const dbPersisted = dbRecords.some(r => r.id === hydroMetric.id && r.value === 750);
    const dbDeletedGone = !dbRecords.some(r => r.id === breakMetric.id);
    auditResults.push({
      test: 'PostgreSQL Direct Verification',
      status: (dbPersisted && dbDeletedGone) ? 'PASS' : 'FAIL',
      details: `Found ${dbRecords.length} records in PostgreSQL; updated record confirmed, deleted record verified absent`
    });

  } catch (err) {
    console.error('Wellness audit encountered error:', err);
  } finally {
    // Cleanup audit records
    try {
      await prisma.wellnessMetric.deleteMany({ where: { userId: { in: [testUserA, testUserB] } } });
      await prisma.wellnessCheckIn.deleteMany({ where: { userId: { in: [testUserA, testUserB] } } });
      await prisma.user.deleteMany({ where: { id: { in: [testUserA, testUserB] } } });
    } catch (e) {}
    await prisma.$disconnect();
  }

  console.log('\n--- SECTION 7 AUDIT SUMMARY ---');
  console.table(auditResults);
  return auditResults;
}

runWellnessAudit().catch(console.error);
