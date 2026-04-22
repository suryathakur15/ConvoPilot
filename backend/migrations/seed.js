/**
 * Seed script — clean slate.
 *
 * What it does:
 *   1. Wipes ALL data tables in dependency order (preserves schema).
 *   2. Inserts realistic customers (users) with auth accounts.
 *   3. Inserts conversations in a spread of statuses and priorities.
 *   4. Does NOT insert agents — agents self-register via /agent-login.
 *   5. Leaves some conversations unassigned so auto-assign can be observed.
 *
 * Run:
 *   node migrations/seed.js
 */
import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.POSTGRES_HOST || 'localhost',
  port:     process.env.POSTGRES_PORT || 5432,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// ── Password helpers (matches auth.service.js) ────────────────────────────────
const ITERATIONS = 100_000;
const KEY_LEN    = 64;
const DIGEST     = 'sha512';

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
};

// ─────────────────────────────────────────────────────────────────────────────
const seed = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Wipe all data (FK-safe order) ─────────────────────────────────────
    await client.query(`
      TRUNCATE TABLE
        audit_logs,
        conversation_tags,
        conversation_agents,
        messages,
        agent_sessions,
        user_sessions,
        conversations,
        users,
        agents
      RESTART IDENTITY CASCADE
    `);
    console.log('✓  All tables cleared');

    // ── 2. Customers ──────────────────────────────────────────────────────────
    // Give each a real password so they can log into the customer portal.
    const CUSTOMER_PASSWORD = 'password123';
    const customers = [
      { name: 'James Carter',   email: 'james@example.com'   },
      { name: 'Sofia Nguyen',   email: 'sofia@example.com'   },
      { name: 'Marcus Reid',    email: 'marcus@example.com'  },
      { name: 'Priya Patel',    email: 'priya@example.com'   },
      { name: 'Lucas Oliveira', email: 'lucas@example.com'   },
      { name: 'Aisha Kamara',   email: 'aisha@example.com'   },
    ];

    const hash = hashPassword(CUSTOMER_PASSWORD);
    const { rows: userRows } = await client.query(`
      INSERT INTO users (name, email, password_hash) VALUES
        ${customers.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ')}
      RETURNING id, name, email
    `, customers.flatMap(c => [c.name, c.email, hash]));

    console.log(`✓  ${userRows.length} customers created (password: ${CUSTOMER_PASSWORD})`);
    userRows.forEach(u => console.log(`     ${u.name} <${u.email}>`));

    // ── 3. Conversations ──────────────────────────────────────────────────────
    const [james, sofia, marcus, priya, lucas, aisha] = userRows;

    const convData = [
      // ── Open / High priority ─────────────────────────────────────────────
      { user_id: james.id,  status: 'open',    priority: 'high',   subject: 'Payment declined — urgent, need to renew today' },
      { user_id: sofia.id,  status: 'open',    priority: 'high',   subject: 'Account locked after failed 2FA — cannot log in' },
      // ── Open / Medium ────────────────────────────────────────────────────
      { user_id: marcus.id, status: 'open',    priority: 'medium', subject: 'Subscription invoice shows wrong amount' },
      { user_id: priya.id,  status: 'open',    priority: 'medium', subject: 'How do I export data to CSV?' },
      { user_id: lucas.id,  status: 'open',    priority: 'medium', subject: 'API rate limit hit even on paid plan' },
      // ── Open / Low ───────────────────────────────────────────────────────
      { user_id: aisha.id,  status: 'open',    priority: 'low',    subject: 'Feature request: dark mode in the dashboard' },
      { user_id: james.id,  status: 'open',    priority: 'low',    subject: 'Minor typo on the pricing page' },
      // ── Snoozed ──────────────────────────────────────────────────────────
      { user_id: sofia.id,  status: 'snoozed', priority: 'medium', subject: 'Waiting on legal approval for enterprise plan' },
      { user_id: marcus.id, status: 'snoozed', priority: 'low',    subject: 'Follow-up on onboarding call scheduled for next week' },
      // ── Closed ───────────────────────────────────────────────────────────
      { user_id: priya.id,  status: 'closed',  priority: 'high',   subject: 'Dashboard graphs not loading — fixed in v2.4.1' },
      { user_id: lucas.id,  status: 'closed',  priority: 'medium', subject: 'Password reset email not arriving — resolved' },
    ];

    const convPlaceholders = convData
      .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
      .join(', ');

    const { rows: convRows } = await client.query(`
      INSERT INTO conversations (user_id, status, priority, subject)
      VALUES ${convPlaceholders}
      RETURNING id, subject, status, priority
    `, convData.flatMap(c => [c.user_id, c.status, c.priority, c.subject]));

    console.log(`\n✓  ${convRows.length} conversations created`);

    // ── 4. Seed messages for each conversation ────────────────────────────────
    // Conversations get realistic opening messages from the customer.
    // (No agent replies yet — agents will handle them after login.)
    const openingMessages = [
      `Hi support team, my card ending in 4242 is being declined on the upgrade page. I've tried three times now and I need to renew before end of day or my team loses access. Error: "Payment method declined". Please help ASAP.`,
      `I can't log in to my account. After entering my password, the 2FA code SMS never arrives. I tried the backup code but it says it's invalid. I have a demo with a client in 2 hours.`,
      `My invoice #INV-2847 shows $299 but my plan is $199/month. I haven't upgraded or added any users. Can you look into this?`,
      `Is there a way to export my project data as a CSV file? I checked the docs but couldn't find an export option in the dashboard.`,
      `We're hitting 429 errors on the API even though we upgraded to the Business plan which should allow 1000 req/min. Our rate limiter shows we're only at 200 req/min.`,
      `Would love to see a dark mode option in the dashboard — especially for the analytics pages which are very bright. A lot of us work late and it would help reduce eye strain.`,
      `Hi, the pricing page says "Unimited projects" but I think it should be "Unlimited". Small typo but wanted to flag it.`,
      `We're waiting on our legal team to review the enterprise contract. Can we pick this up again next Tuesday? No rush from your side.`,
      `I have an onboarding call booked with your team for next Wednesday. I'll reach out again after that if I still have questions.`,
      `The dashboard charts were completely blank for me. Checked across browsers. Seems like it might be related to the v2.4 deploy?`,
      `Password reset emails aren't landing in my inbox or spam. I need to get back into my account.`,
    ];

    for (let i = 0; i < convRows.length; i++) {
      const conv    = convRows[i];
      const convDef = convData[i];
      const msg     = openingMessages[i] || `Hello, I need help with: ${conv.subject}`;

      await client.query(`
        INSERT INTO messages (conversation_id, sender_type, sender_id, content)
        VALUES ($1, 'user', $2, $3)
      `, [conv.id, convDef.user_id, msg]);
    }

    console.log(`✓  Opening messages inserted for all conversations`);

    // ── 5. Tags ───────────────────────────────────────────────────────────────
    const tagMap = [
      ['billing', 'urgent'],
      ['account', 'urgent'],
      ['billing'],
      ['how-to'],
      ['api', 'bug'],
      ['feature'],
      ['bug'],
      ['enterprise'],
      ['onboarding'],
      ['bug'],
      ['account'],
    ];

    for (let i = 0; i < convRows.length; i++) {
      for (const tag of tagMap[i] ?? []) {
        await client.query(`
          INSERT INTO conversation_tags (conversation_id, tag) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [convRows[i].id, tag]);
      }
    }

    console.log(`✓  Tags applied`);

    // ── 6. Audit log — created events ────────────────────────────────────────
    for (const conv of convRows) {
      await client.query(`
        INSERT INTO audit_logs (conversation_id, action, actor_type, metadata)
        VALUES ($1, 'conversation.created', 'system', '{}')
      `, [conv.id]);
    }

    console.log(`✓  Audit log seeded`);

    await client.query('COMMIT');

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Seed complete — clean state ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Conversations : ${convRows.length} (7 open, 2 snoozed, 2 closed)
  Customers     : ${userRows.length} — all have password "${CUSTOMER_PASSWORD}"
  Agents        : 0 — register at http://localhost:5173/agent-login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch(() => process.exit(1));
