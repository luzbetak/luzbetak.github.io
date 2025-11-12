/**
 * Google Auto Reply Email Script (Unified) — adds greeting with sender's name
 * Version: 1.1.0 — 2025-11-11
 *
 * Changes in 1.1.0:
 * - PER-RECRUITER one-time reply: never auto-reply again to the same sender (email) across any thread.
 * - Thread safety: skip any thread that already contains a message from me (prevents second replies after conversation starts).
 *
 * MAIN: autoReplyJobs()
 */

//////////////////////////////
// 1) CONFIG
//////////////////////////////
const PROCESSED_LABEL   = 'AutoReplied';
const DRY_RUN           = false;     // set to true to test without sending
const MAX_SEND          = 3;         // safety cap per run (Max: 50) emails
const SCAN_BODY_CHARS   = 5000;      // analyze first N chars of body
const SLEEP_MS          = 150;       // small pause between sends
const DAYS_LOOKBACK     = 30;        // Gmail query window (Max: 365) days
const SENDER_DB_KEY     = 'AutoReply_SendOnceBySender_v1'; // user property key
const SENDER_DB_MAX     = 5000;      // soft cap to avoid unbounded growth

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
  'Airflow','Analytics','AWS','Azure','Candidate',
  'Career','Catalog','Cloud','Collaboration',
  'Contract','DAG','Databricks','Delta',
  'Engineer','ETL','GCP','Governance','Integration',
  'Job','Kafka','Machine','Modeling','Opportunity',
  'Pipeline','Position','PySpark','Python',
  'Redshift','Requirement','Role','Scientist','Skill',
  'Snowflake','SQL','Urgent'
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
  LOCAL:  ['Agoura','Calabasas','Thousand Oaks','Santa Monica','Burbank','Glendale','Moorpark'],
  HYBRID: ['Torrance','Irvine','Santa Barbara','San Diego','Pasadena','Culver City'],
  REMOTE: ['Remote','Boston','Chicago','Dallas','Florida','Francisco','Irving',
           'Kentucky','Louisville','New York','Oregon','Philadelphia','Portland','Redwood',
           'Richland','Seattle','Sunnyvale','Texas']
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
  const rawFrom = (lastMsg.getFrom() || '').trim();
  let display = '';
  let email = '';

  const mAngle = rawFrom.match(/^(?:"?([^"]+)"?\s*)?<([^>]+)>$/);
  if (mAngle) {
    display = (mAngle[1] || '').trim();
    email = (mAngle[2] || '').trim();
  } else {
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

  display = display.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
  if (!display && email) {
    const local = email.split('@')[0] || '';
    const parts = local.split(/[._\-+]/).filter(Boolean);
    if (parts.length) {
      display = parts
        .map(p => p.length ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : '')
        .join(' ');
    }
  }

  if (display && display.length > 40) display = display.slice(0, 40).trim();
  if (!display || /@/.test(display)) return null;
  if (/^(team|recruiting|recruitment|talent|hr|careers?)$/i.test(display)) return null;

  return display;
}

// Extract sender email (normalized lowercased)
function getSenderEmail(lastMsg) {
  const rawFrom = (lastMsg.getFrom() || '').trim();
  let email = '';

  const mAngle = rawFrom.match(/<([^>]+)>/);
  if (mAngle) {
    email = mAngle[1];
  } else if (/\S+@\S+/.test(rawFrom)) {
    email = rawFrom;
  }

  if (!email) {
    try {
      const rt = (lastMsg.getReplyTo && lastMsg.getReplyTo()) || '';
      const mRT = rt.match(/<([^>]+)>/);
      if (mRT) email = mRT[1];
    } catch (e) {}
  }

  return (email || '').toLowerCase().trim();
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
// 5.5) PER-SENDER “REPLY ONCE” DB
//////////////////////////////
function loadSenderDB() {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty(SENDER_DB_KEY);
  try {
    const obj = raw ? JSON.parse(raw) : {};
    // ensure object of {email: isoDate}
    return (obj && typeof obj === 'object') ? obj : {};
  } catch (_e) {
    return {};
  }
}

function saveSenderDB(db) {
  const props = PropertiesService.getUserProperties();
  // trim if too large: keep most recent ~SENDER_DB_MAX
  const entries = Object.entries(db)
    .sort((a,b) => (b[1]||'').localeCompare(a[1]||''));
  const trimmed = entries.slice(0, SENDER_DB_MAX);
  const obj = Object.fromEntries(trimmed);
  props.setProperty(SENDER_DB_KEY, JSON.stringify(obj));
}

function markSenderReplied(db, email) {
  if (!email) return;
  db[email] = new Date().toISOString();
}

function alreadyRepliedToSender(db, email) {
  if (!email) return false;
  return !!db[email];
}


//////////////////////////////
// 6) MAIN
//////////////////////////////
function autoReplyJobs() {
  const me = Session.getActiveUser().getEmail().toLowerCase();
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) label = GmailApp.createLabel(PROCESSED_LABEL);

  // load sender DB once
  const senderDB = loadSenderDB();

  const threads = GmailApp.search(`${BASE_QUERY} -label:"${PROCESSED_LABEL}"`, 0, 500);

  console.log(`Found ${threads.length} threads. DRY_RUN=${DRY_RUN}, MAX_SEND=${MAX_SEND}`);
  let sent = 0, considered = 0, skipped = 0, errors = 0;

  for (const thread of threads) {
    if (!DRY_RUN && sent >= MAX_SEND) { console.log(`Reached MAX_SEND ${MAX_SEND}`); break; }

    const msgs = thread.getMessages();
    const last = msgs[msgs.length - 1];
    considered++;

    // Skip if last from me
    const lastFromStr = (last.getFrom() || '').toLowerCase();
    if (lastFromStr.includes(me)) { skipped++; continue; }

    // **New**: Skip if this thread already contains any message from me (manual or auto)
    // prevents second replies after I’ve already engaged
    const anyFromMe = msgs.some(m => ((m.getFrom() || '').toLowerCase().includes(me)));
    if (anyFromMe) { skipped++; continue; }

    // Engines and bulk/list mail
    if (isFromBlockedEngine(last) || isNoreplyOrList(last)) { skipped++; continue; }

    const haystack = getHaystack(last);

    // Must look like a job/opportunity
    if (!looksLikeJob(haystack)) { skipped++; continue; }

    // **New**: PER-SENDER guard — only reply once ever to a recruiter email address
    const senderEmail = getSenderEmail(last);
    if (!senderEmail) { skipped++; continue; }
    if (alreadyRepliedToSender(senderDB, senderEmail)) {
      // Optional: add label so we don't re-scan this thread again
      try { thread.addLabel(label); } catch (_e) {}
      skipped++; continue;
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
        // mark thread as processed so repeated tests don't re-hit it
        thread.addLabel(label);
        // also mark sender to emulate behavior
        markSenderReplied(senderDB, senderEmail);
        console.log(`WOULD reply (${group || 'ELSE'}${city ? `/${city}` : ''}) -> ${senderEmail} | "${last.getSubject()}" | Greet="${senderName || ''}"`);
      } else {
        last.reply(replyText);
        thread.addLabel(label);
        // **New**: remember this sender so we never auto-reply to them again
        markSenderReplied(senderDB, senderEmail);
        sent++;
        console.log(`Replied (${group || 'ELSE'}${city ? `/${city}` : ''}) -> ${senderEmail} | "${last.getSubject()}" | Greet="${senderName || ''}"`);
        Utilities.sleep(SLEEP_MS);
      }
    } catch (err) {
      errors++;
      console.log(`ERROR on "${thread.getFirstMessageSubject()}": ${err}`);
    }
  }

  // persist DB changes
  saveSenderDB(senderDB);

  console.log(`Summary => Considered: ${considered}, Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`);
}

