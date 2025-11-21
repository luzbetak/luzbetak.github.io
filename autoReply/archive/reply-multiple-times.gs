/**
 * Google Auto Reply Email Script (Unified) — adds greeting with sender's name
 * Version: 1.0.3 — 2025-11-09
 *
 * MAIN: autoReplyJobs()
 *
 * Notes:
 * - Add/delete keywords or cities in one place (sections 2 & 3).
 * - We match emails that (a) look like job opportunities via KEYWORDS and
 *   (b) classify by city/group or fall into ELSE.
 * - We skip job engines (indeed/linkedin/dice), noreply/list/bulk mails.
 * - NEW: Greets the sender by extracted name: "Hi Priya Tiwari,".
 */

//////////////////////////////
// 1) CONFIG
//////////////////////////////
const PROCESSED_LABEL = 'AutoReplied';
const DRY_RUN         = false;     // set to true to test without sending
const MAX_SEND        = 3;         // safety cap per run (Max: 50) emails
const SCAN_BODY_CHARS = 5000;      // analyze first N chars of body
const SLEEP_MS        = 150;       // small pause between sends
const DAYS_LOOKBACK   = 30;        // Gmail query window (Max: 365) days

// Build a broad Gmail query; content filtering happens in-script too.
const BASE_QUERY =
  `-in:chats -in:drafts -in:spam -in:trash newer_than:${DAYS_LOOKBACK}d`;

// Contact/signature & preferences
const SIGNATURE = [
  'Thanks,',
  'Kevin Luzbetak',
  'Phone  : (747) 221-3264',
  'Resume : https://kevinluzbetak.com/resume.pdf'
].join('\n');

const COMP_REQUIRE_CONTRACT = '$87+/hour (W-2 contract or hire)';
const COMP_REQUIRE_FULLTIME = '$180,000+ base (full-time)';

// Engines / job boards to never reply to
const BLOCKED_DOMAIN_RE = /\b(indeed\.com|match\.indeed\.com|linkedin\.com|jobdivamail\.com|bybit\.com)\b/i;


//////////////////////////////
// 2) KEYWORDS (Global job/opportunity identifiers)
//////////////////////////////
const JOB_KEYWORDS = [
  'Airflow',     'Analytics', 'AWS',       'Azure',      'Candidate',
  'Career',      'Catalog',   'Cloud',     'Cloud',      'Collaboration',
  'Contract',    'Contract',  'DAG',       'Databricks', 'Delta',
  'Engineer',    'ETL',       'GCP',       'Governance', 'Integration',
  'Job',         'Kafka',     'Machine',   'Modeling',   'Opportunity',
  'Pipeline',    'Position',  'PySpark',   'Python',     'Redshift',
  'Requirement', 'Role',      'Scientist', 'Skill',      'Snowflake',
  'Snowflake',   'SQL',       'Urgent'
];

const JOB_KEYWORDS_RE = new RegExp(
  JOB_KEYWORDS
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'i'
);


//////////////////////////////
// 3) CITY GROUPS (LOCAL / HYBRID / REMOTE)
//////////////////////////////
const CITY_GROUPS = {
  LOCAL: [
    'Agoura', 'Calabasas', 'Thousand Oaks', 'Santa Monica', 'Burbank', 'Glendale', 'Moorpark'
  ],
  HYBRID: [
    'Torrance', 'Irvine', 'Santa Barbara', 'San Diego', 'Pasadena', 'Culver City'
  ],
  REMOTE: [
    'Remote',   'Boston',     'Chicago',   'Dallas', 'Florida',      'Francisco', 'Irving',
    'Kentucky', 'Louisville', 'New York',  'Oregon', 'Philadelphia', 'Portland',  'Redwood',
    'Richland', 'Seattle',    'Sunnyvale', 'Texas'
  ]
};

const GROUP_REGEX = Object.fromEntries(
  Object.entries(CITY_GROUPS).map(([group, cities]) => {
    const re = new RegExp(
      cities
        .map(c => c.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .map(c => `\\b${c}\\b`)
        .join('|'),
      'i'
    );
    return [group, re];
  })
);


//////////////////////////////
// 4) REPLY BUILDERS (now accept senderName)
//////////////////////////////
function greetLine(senderName) {
  return senderName ? `Hi ${senderName},` : 'Hi,';
}

function buildLocalReply(city, senderName) {
  return [
    greetLine(senderName),
    '',
    `I am a U.S. citizen with a Master’s degree in Computer Science, with a focus on Artificial Intelligence and Machine Learning from a U.S.-accredited university. I bring 25+ years of programming experience and am open to contract or contract-to-hire opportunities.`,
    `I’m based in Agoura Hills, California. For roles in or near ${city || 'the listed city'}, I can support on-site or remote as the client prefers.`,
    `My compensation requirements are ${COMP_REQUIRE_CONTRACT} or ${COMP_REQUIRE_FULLTIME} .`,
    '',
    `Please share the job ID, client, location, rate, interview process, and whether on-site/remote is acceptable.`,
    '',
    SIGNATURE
  ].join('\n');
}

function buildHybridReply(city, senderName) {
  const c = city || 'the listed city';
  return [
    greetLine(senderName),
    '',
    `I am a U.S. citizen with a Master’s degree in Computer Science, with a focus on Artificial Intelligence and Machine Learning from a U.S.-accredited university. I bring 25+ years of programming experience and am open to contract or contract-to-hire opportunities.`,
    `I’m based in Agoura Hills, California. Due to commute time, I can be on-site in ${c} one day per week and work remotely the remaining four days.`,
    `My compensation requirements are ${COMP_REQUIRE_CONTRACT} or ${COMP_REQUIRE_FULLTIME} .`,
    '',
    `Please share the job ID, client, location, rate, interview process, and confirm the one-day-onsite hybrid setup.`,
    '',
    SIGNATURE
  ].join('\n');
}

// Intentionally does not say "For roles in Remote," nor inject a 'city'.
function buildRemoteReply(senderName) {
  return [
    greetLine(senderName),
    '',
    `I am a U.S. citizen with a Master’s degree in Computer Science, with a focus on Artificial Intelligence and Machine Learning from a U.S.-accredited university. I bring 25+ years of programming experience and am open to contract or contract-to-hire opportunities.`,
    `I’m based in Agoura Hills, California. I’m open to fully remote work.`,
    `My compensation requirements are ${COMP_REQUIRE_CONTRACT} or ${COMP_REQUIRE_FULLTIME} .`,
    '',
    `If this position is fully remote, please share the job ID, client, location, rate, and interview process.`,
    '',
    SIGNATURE
  ].join('\n');
}

function buildElseReply(senderName) {
  return [
    greetLine(senderName),
    '',
    `I am a U.S. citizen with a Master’s degree in Computer Science, with a focus on Artificial Intelligence and Machine Learning from a U.S.-accredited university. I bring 25+ years of programming experience and am open to contract or contract-to-hire opportunities.`,
    `I’m based in Agoura Hills, California. Please let me know if the role can be remote, hybrid, or on-site and where.`,
    `My compensation requirements are ${COMP_REQUIRE_CONTRACT} or ${COMP_REQUIRE_FULLTIME} .`,
    '',
    `Please include the job ID, client, location, rate, and interview process in your reply.`,
    '',
    SIGNATURE
  ].join('\n');
}


//////////////////////////////
// 5) ENGINE / LIST GUARDS & HELPERS
//////////////////////////////
function isFromBlockedEngine(lastMsg) {
  const fromStr = (lastMsg.getFrom() || '').toLowerCase();
  let replyToStr = '';
  try { replyToStr = (lastMsg.getReplyTo() || '').toLowerCase(); } catch (e) {}
  const blob = `${fromStr} ${replyToStr}`;
  return BLOCKED_DOMAIN_RE.test(blob);
}

function isNoreplyOrList(lastMsg) {
  const fromStr = (lastMsg.getFrom() || '').toLowerCase();
  if (/(noreply|no-reply|donotreply)/i.test(fromStr)) return true;

  try {
    const autoSubmitted = (lastMsg.getHeader && lastMsg.getHeader('Auto-Submitted')) || '';
    const precedence   = (lastMsg.getHeader && lastMsg.getHeader('Precedence')) || '';
    const listId       = (lastMsg.getHeader && lastMsg.getHeader('List-Id')) || '';
    if ((autoSubmitted && autoSubmitted.toLowerCase() !== 'no') ||
        /bulk|list|junk/i.test(precedence) ||
        (listId && listId.length > 0)) {
      return true;
    }
  } catch (e) {}
  return false;
}

function getHaystack(lastMsg) {
  const subject = lastMsg.getSubject() || '';
  let body = '';
  try { body = (lastMsg.getPlainBody() || '').slice(0, SCAN_BODY_CHARS); } catch (e) { body = ''; }
  return `${subject}\n${body}`;
}

// Extract a friendly sender name from "From" (or Reply-To as fallback)
function getSenderName(lastMsg) {
  // Prefer display name from From header if present
  const rawFrom = (lastMsg.getFrom() || '').trim();
  let display = '';
  let email = '';

  // Patterns like: Name <email@domain>
  const mAngle = rawFrom.match(/^(?:"?([^"]+)"?\s*)?<([^>]+)>$/);
  if (mAngle) {
    display = (mAngle[1] || '').trim();
    email = (mAngle[2] || '').trim();
  } else {
    // Might be just an email or "Name (Company) <email>" already flattened
    // Try to separate if there's a space + angle anyway
    const angleIdx = rawFrom.indexOf('<');
    if (angleIdx > -1) {
      display = rawFrom.slice(0, angleIdx).trim().replace(/["]/g, '');
      const inner = rawFrom.slice(angleIdx).match(/<([^>]+)>/);
      email = inner ? inner[1].trim() : '';
    } else if (/\S+@\S+/.test(rawFrom)) {
      email = rawFrom;
    } else {
      display = rawFrom.replace(/["]/g, '').trim();
    }
  }

  // If no display name, try Reply-To
  if (!display) {
    try {
      const rt = (lastMsg.getReplyTo && lastMsg.getReplyTo()) || '';
      const mRT = rt.match(/^(?:"?([^"]+)"?\s*)?<([^>]+)>$/);
      if (mRT) {
        display = (mRT[1] || '').trim();
        email = email || (mRT[2] || '').trim();
      }
    } catch (e) {}
  }

  // Clean up display like: remove trailing orgs in parens, excessive spaces
  display = display.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();

  // If still empty, infer from local part of the email
  if (!display && email) {
    const local = email.split('@')[0] || '';
    // Split on common separators and title-case
    const parts = local.split(/[._\-+]/).filter(Boolean);
    if (parts.length) {
      display = parts
        .map(p => p.length ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : '')
        .join(' ');
    }
  }

  // Guard against oddities like "Recruiter", "Team", or long strings; trim to 40 chars
  if (display && display.length > 40) display = display.slice(0, 40).trim();

  // Return null if we ended up with nothing useful or just the domain
  if (!display || /@/.test(display)) return null;

  // Avoid generic list-y names
  if (/^(team|recruiting|recruitment|talent|hr|careers?)$/i.test(display)) return null;

  return display;
}

// Return {group: 'LOCAL'|'HYBRID'|'REMOTE'|null, city: '...'|null}
function classifyByCity(haystack) {
  for (const group of ['LOCAL','HYBRID','REMOTE']) {
    const re = GROUP_REGEX[group];
    const m = re.exec(haystack);
    if (m) {
      const hit = m[0];
      const city = (group === 'REMOTE' && /^remote$/i.test(hit)) ? null : hit;
      return { group, city };
    }
  }
  return { group: null, city: null };
}

function looksLikeJob(haystack) {
  return JOB_KEYWORDS_RE.test(haystack);
}


//////////////////////////////
// 6) MAIN
//////////////////////////////
function autoReplyJobs() {
  const me = Session.getActiveUser().getEmail().toLowerCase();
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) label = GmailApp.createLabel(PROCESSED_LABEL);

  // We keep the Gmail query broad and filter by content ourselves.
  const threads = GmailApp.search(`${BASE_QUERY} -label:"${PROCESSED_LABEL}"`, 0, 500);

  console.log(`Found ${threads.length} threads. DRY_RUN=${DRY_RUN}, MAX_SEND=${MAX_SEND}`);
  let sent = 0, considered = 0, skipped = 0, errors = 0;

  for (const thread of threads) {
    if (!DRY_RUN && sent >= MAX_SEND) { console.log(`Reached MAX_SEND ${MAX_SEND}`); break; }

    const msgs = thread.getMessages();
    const last = msgs[msgs.length - 1];
    considered++;

    // Skip if last from me
    const fromStr = (last.getFrom() || '').toLowerCase();
    if (fromStr.includes(me)) { skipped++; continue; }

    // Skip engines and bulk/list mail
    if (isFromBlockedEngine(last) || isNoreplyOrList(last)) { skipped++; continue; }

    const haystack = getHaystack(last);

    // Must look like a job/opportunity
    if (!looksLikeJob(haystack)) {
      skipped++;
      continue;
    }

    // Classify by city groups
    const { group, city } = classifyByCity(haystack);

    // Extract a polite sender name for greeting
    const senderName = getSenderName(last);

    // Choose reply text by group
    let replyText = '';
    if (group === 'LOCAL') {
      replyText = buildLocalReply(city, senderName);
    } else if (group === 'HYBRID') {
      replyText = buildHybridReply(city, senderName);
    } else if (group === 'REMOTE') {
      replyText = buildRemoteReply(senderName);
    } else {
      replyText = buildElseReply(senderName);
    }

    try {
      if (DRY_RUN) {
        thread.addLabel(label);
        console.log(`WOULD reply (${group || 'ELSE'}${city ? `/${city}` : ''}) -> ${fromStr} | "${last.getSubject()}" | Greet="${senderName || ''}"`);
      } else {
        last.reply(replyText);
        thread.addLabel(label);
        sent++;
        console.log(`Replied (${group || 'ELSE'}${city ? `/${city}` : ''}) -> ${fromStr} | "${last.getSubject()}" | Greet="${senderName || ''}"`);
        Utilities.sleep(SLEEP_MS);
      }
    } catch (err) {
      errors++;
      console.log(`ERROR on "${thread.getFirstMessageSubject()}": ${err}`);
    }
  }

  console.log(`Summary => Considered: ${considered}, Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`);
}


