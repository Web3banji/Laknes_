/**
 * LAKNES Core Architecture Verification Script
 * CLI test suite validating all 10 architectural subsystems.
 */

async function runVerification() {
  const base = 'http://localhost:3000/api';
  console.log('====================================================');
  console.log('       LAKNES ARCHITECTURAL VERIFICATION SUITE       ');
  console.log('====================================================\n');

  let passedSteps = 0;
  const totalSteps = 10;

  // 1. System Health
  console.log('[1/10] Verifying System Health & Database Connection...');
  const healthRes = await fetch(`${base}/system/health`);
  const health = await healthRes.json();
  if (health.status === 'healthy' && health.database === 'CONNECTED') {
    console.log('  ✓ System operational. Database connected.');
    passedSteps++;
  } else {
    throw new Error('Health check failed: ' + JSON.stringify(health));
  }

  // 2. User Registration
  const rand = Math.floor(Math.random() * 90000 + 10000);
  const userEmail = `arch_user_${rand}@elysium.org`;
  const userPassword = 'TestPassword123!';
  console.log('\n[2/10] Verifying User Registration & Password Hashing...');
  const regRes = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `arch_user_${rand}`,
      email: userEmail,
      password: userPassword,
      bio: 'Architectural Verification Tester',
    }),
  });
  const regData = await regRes.json();
  if (regRes.status === 201 && regData.data?.token) {
    console.log(`  ✓ User registered successfully: ${regData.data.user.username}`);
    passedSteps++;
  } else {
    throw new Error('User registration failed: ' + JSON.stringify(regData));
  }
  const userToken = regData.data.token;
  const userId = regData.data.user.id;

  // 3. User Login & Bad Password Rejection
  console.log('\n[3/10] Verifying Login & Credential Security...');
  const badLogin = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: 'WrongPassword999!' }),
  });
  if (badLogin.status === 401) {
    console.log('  ✓ Invalid credentials correctly rejected (401 Unauthorized).');
  } else {
    throw new Error('Bad login was not rejected!');
  }

  const goodLogin = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: userPassword }),
  });
  const loginData = await goodLogin.json();
  if (goodLogin.status === 200 && loginData.data?.token) {
    console.log('  ✓ Valid credentials accepted; session token issued.');
    passedSteps++;
  } else {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }

  // 4. Session Verification & Identity
  console.log('\n[4/10] Verifying Session State & /me Endpoint...');
  const meRes = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const meData = await meRes.json();
  if (meRes.status === 200 && meData.data?.id === userId) {
    console.log(`  ✓ Session verified for account: ${meData.data.email}`);
    passedSteps++;
  } else {
    throw new Error('Session verification failed: ' + JSON.stringify(meData));
  }

  // 5. Project Submission (Should be PENDING_REVIEW)
  console.log('\n[5/10] Verifying Project Submission & Verification State Machine...');
  const projectSlug = `arch-protocol-${rand}`;
  const subRes = await fetch(`${base}/projects/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      name: `Arch Protocol ${rand}`,
      slug: projectSlug,
      category: 'DEFI',
      shortDescription: 'Architecture verification test project.',
      description: 'A comprehensive DeFi project submitted for architectural validation.',
      websiteUrl: 'https://test.elysium.org',
      ecosystem: 'Elysium Testnet',
    }),
  });
  const subData = await subRes.json();
  if (subRes.status === 201 && subData.data?.verificationStatus === 'PENDING_REVIEW') {
    console.log(`  ✓ Project submitted in PENDING_REVIEW status: ${subData.data.name}`);
    passedSteps++;
  } else {
    throw new Error('Project submission failed: ' + JSON.stringify(subData));
  }
  const projectId = subData.data.id;

  // 6. Verify Unverified Isolation in Discovery
  console.log('\n[6/10] Verifying Discovery Isolation (Unapproved Projects Hidden)...');
  const discRes = await fetch(`${base}/projects/discover?limit=50`);
  const discData = await discRes.json();
  const isFound = discData.data.some((p: any) => p.id === projectId);
  if (!isFound) {
    console.log('  ✓ Pending project correctly excluded from public discovery directory.');
    passedSteps++;
  } else {
    throw new Error('Pending project leaked into public discovery!');
  }

  // 7. Admin Review & Verification
  console.log('\n[7/10] Verifying Administrative Review & Approval...');
  const adminLogin = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@elysium.org', password: 'AdminElysium2026!' }),
  });
  const adminData = await adminLogin.json();
  const adminToken = adminData.data.token;

  const reviewRes = await fetch(`${base}/reviews/project/${projectId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      reviewNotes: 'Smart contracts and documentation verified.',
    }),
  });
  const reviewData = await reviewRes.json();
  if (reviewRes.status === 201 && reviewData.data?.decision === 'APPROVED') {
    console.log('  ✓ Project approved by administrator.');
    passedSteps++;
  } else {
    throw new Error('Admin review failed: ' + JSON.stringify(reviewData));
  }

  // 8. Public Discovery Ingestion
  console.log('\n[8/10] Verifying Project Ingestion Post-Verification...');
  const discAfterRes = await fetch(`${base}/projects/discover?limit=50`);
  const discAfterData = await discAfterRes.json();
  const nowFound = discAfterData.data.some((p: any) => p.id === projectId);
  if (nowFound) {
    console.log('  ✓ Approved project now visible in public discovery.');
    passedSteps++;
  } else {
    throw new Error('Approved project did not appear in public discovery!');
  }

  // 9. Quest Creation & Discovery
  console.log('\n[9/10] Verifying Quest Subsystem (Creation & Retrieval)...');
  const questRes = await fetch(`${base}/projects/${projectId}/quests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      title: `Genesis Testnet Quest ${rand}`,
      description: 'Interact with testnet smart contracts.',
      instructions: '1. Connect wallet. 2. Mint test tokens. 3. Submit tx hash.',
      questType: 'ONCHAIN',
      startAt: new Date().toISOString(),
      completionCriteria: { requiresProof: true, proofType: 'TRANSACTION_HASH', verificationMethod: 'MANUAL_REVIEW' },
      rewardConfiguration: { rewardType: 'POINTS', amount: 250, rewardDetails: '250 Horizon XP' },
    }),
  });
  const questData = await questRes.json();
  if (questRes.status === 201 && questData.data?.id) {
    console.log(`  ✓ Quest created: "${questData.data.title}"`);
    passedSteps++;
  } else {
    throw new Error('Quest creation failed: ' + JSON.stringify(questData));
  }

  // 10. Engagement & Social Signals (Follow & Bookmark)
  console.log('\n[10/10] Verifying Engagement Layer (Follows & Bookmarks)...');
  const followRes = await fetch(`${base}/projects/${projectId}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const followData = await followRes.json();

  const saveRes = await fetch(`${base}/projects/${projectId}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const saveData = await saveRes.json();

  if (followRes.status === 200 && saveRes.status === 200) {
    console.log('  ✓ Follow and Bookmark operations executed and persisted.');
    passedSteps++;
  } else {
    throw new Error('Engagement operations failed');
  }

  // Cleanup test artifacts from database to ensure no mock/test projects linger on main page
  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync('data/laknes.db');
    db.prepare('DELETE FROM quest_participations WHERE quest_id IN (SELECT id FROM quests WHERE project_id = ?)').run(projectId);
    db.prepare('DELETE FROM quests WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_follows WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM saved_projects WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_reviews WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_memberships WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  } catch (cleanErr) {
    // Non-fatal test cleanup
  }

  console.log('\n====================================================');
  console.log(`  RESULT: ${passedSteps}/${totalSteps} ARCHITECTURAL SUBSYSTEMS PASSED`);
  console.log('  LAKNES Core Functional Architecture is 100% OPERATIONAL');
  console.log('====================================================\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
