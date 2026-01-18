/**
 * Google Auto Reply Email Script (Unified)
 * Version: 1.0.2 — 2025-11-13
 *
 * Behavior:
 * 1) Reply-per-sender with TTL: reply again to the same sender after 7 days.
 * 2) Never reply in a thread that already has any message from me.
 *
 * MAIN: autoReplyJobs()
 */

//////////////////////////////
// 1) CONFIG
//////////////////////////////
const PROCESSED_LABEL = 'AutoReplied';
const DRY_RUN         = false;     // true = simulate without sending
const MAX_SEND        = 50;        // safety cap per run
const SCAN_BODY_CHARS = 5000;      // analyze first N chars of body
const SLEEP_MS        = 150;       // pause between sends (ms)
const DAYS_LOOKBACK   = 30;        // Gmail query window (days)
const SENDER_DB_KEY   = 'AutoReply_SendOnceBySender_v1'; // UserProperties key (kept same)
const SENDER_DB_MAX   = 5000;      // soft cap to prevent unbounded growth
const TTL_DAYS        = 7;         // << Reply again to same sender after 7 days

// Broad query; content filtering happens in-script.
const BASE_QUERY = `in:inbox newer_than:${DAYS_LOOKBACK}d`;

// Contact/signature & preferences
const SIGNATURE = [
  'Thanks,',
  'Kevin Luzbetak',
  'Phone  : (818) 288-7357',
  'Resume : https://kevinluzbetak.com/resume.pdf'
].join('\n');

const COMP_REQUIRE_CONTRACT = '$70+/hour (W-2 contract or hire)';
const COMP_REQUIRE_FULLTIME = '$145,000+ base (full-time)';

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
  JOB_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
);

//////////////////////////////
// 3) CITY GROUPS (LOCAL / HYBRID / REMOTE)
//////////////////////////////
const CITY_GROUPS = {
  LOCAL:  ['Agoura','Calabasas','Thousand Oaks','Santa Monica','Burbank','Glendale','Moorpark'],
  HYBRID: ['Torrance','Irvine','Santa Barbara','San Diego','Pasadena','Culver City'],
  REMOTE: ['Remote','Boston','Chicago','Dallas','Florida','Francisco','Irving','Pittsburgh','McLean','Indianapolis',
           'Kentucky','Louisville','New York','Oregon','Philadelphia','Portland','Redwood','Houston',
           'Richland','Seattle','Sunnyvale','Texas', 'Raleigh', 'Phoenix', 'Indianapolis', 'Mountain View']
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
// 4) REPLY BUILDERS (accept senderName)
//////////////////////////////
function greetLine(senderName) {
  return senderName ? `Hi ${senderName},` : 'Hi,';
}

function buildLocalReply(city, senderName) {
  return [
    greetLine(senderName),
    '',
    'I am a U.S. citizen with a Master’s degree in Computer Science, with a focus on Machine Learning from a U.S.-accredited university. I bring 25+ years of experience as a Software Engineer and Data Engineer, with deep expertise in large-scale systems, data processing, and advanced programming. I’m based in Los Angeles, California. For roles in or near ' + (city || 'the listed city') + ', I can support on-site or remote as the client prefers.',
    '',
    'My compensation requirements are ' + COMP_REQUIRE_CONTRACT + ' or ' + COMP_REQUIRE_FULLTIME + '.',
    'Please share the job ID, client, location, and confirm salary in your reply.',
    '',
    SIGNATURE
  ].join('\n');
}

function buildHybridReply(city, senderName) {
  var c = city || 'the listed city';
  return [
    greetLine(senderName),
    '',
    'I am a U.S. citizen with a Master’s degree in Computer Science, with a focus on Machine Learning from a U.S.-accredited university. I bring 25+ years of experience as a Software Engineer and Data Engineer, with deep expertise in large-scale systems, data processing, and advanced programming. I’m based in Los Angeles, California. Due to commute time, I can be on-site in ' + c + ' one day per week and work remotely the remaining four days.',
    '',
    'My compensation requirements are ' + COMP_REQUIRE_CONTRACT + ' or ' + COMP_REQUIRE_FULLTIME + '.',
    'Please share the job ID, client, location, confirm salary and the one-day-onsite hybrid setup in your reply.',
    '',
    SIGNATURE
  ].join('\n');
}

function buildRemoteReply(senderName) {
  return [
    greetLine(senderName),
    '',
    'I am a U.S. citizen with a Master’s degree in Computer Science, with a focus on Machine Learning from a U.S.-accredited university. I bring 25+ years of experience as a Software Engineer and Data Engineer, with deep expertise in large-scale systems, data processing, and advanced programming. I’m based in Los Angeles, California. I’m open to fully remote work.',
    '',
    'My compensation requirements are ' + COMP_REQUIRE_CONTRACT + ' or ' + COMP_REQUIRE_FULLTIME + '.',
    'If this position is fully remote, please share the job ID, client, and confirm salary in your reply.',
    '',
    SIGNATURE
  ].join('\n');
}

function buildElseReply(senderName) {
  return [
    greetLine(senderName),
    '',
    'I am a U.S. citizen with a Master’s degree in Computer Science, with a focus on Artificial Intelligence and Machine Learning from a U.S.-accredited university. I bring 25+ years of programming experience and am open to contract or contract-to-hire opportunities. I’m based in Los Angeles, California.  I’m open to fully remote work.', 
    '',
    'My compensation requirements are ' + COMP_REQUIRE_CONTRACT + ' or ' + COMP_REQUIRE_FULLTIME + '.',
    'Please include the job ID, client, location, and confirm salary in your reply.',
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

// Friendly sender name
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

// Sender email (normalized)
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

// City classifier
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
// 5.5) PER-SENDER DB with TTL
//////////////////////////////
function loadSenderDB() {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty(SENDER_DB_KEY);
  try {
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === 'object') ? obj : {};
  } catch (_e) {
    return {};
  }
}

function saveSenderDB(db) {
  const props = PropertiesService.getUserProperties();
  const entries = Object.entries(db).sort((a,b) => (b[1]||'').localeCompare(a[1]||''));
  const trimmed = entries.slice(0, SENDER_DB_MAX);
  props.setProperty(SENDER_DB_KEY, JSON.stringify(Object.fromEntries(trimmed)));
}

function markSenderReplied(db, email) {
  if (!email) return;
  db[email] = new Date().toISOString();
}

// TTL-aware check: returns true if we replied within the last TTL_DAYS
function alreadyRepliedToSender(db, email, ttlDays) {
  if (!email) return false;
  const iso = db[email];
  if (!iso) return false;
  if (!ttlDays || ttlDays <= 0) return true; // no TTL => block forever
  const then = new Date(iso).getTime();
  const now  = Date.now();
  return (now - then) < (ttlDays * 24 * 60 * 60 * 1000);
}

//////////////////////////////
// 6) MAIN
//////////////////////////////
function autoReplyJobs() {
  const me = Session.getActiveUser().getEmail().toLowerCase();
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) label = GmailApp.createLabel(PROCESSED_LABEL);

  // Per-sender DB (reply-once per email with TTL)
  const senderDB = loadSenderDB();

  const threads = GmailApp.search(`${BASE_QUERY} -label:"${PROCESSED_LABEL}"`, 0, 500);

  console.log(`Found ${threads.length} threads. DRY_RUN=${DRY_RUN}, MAX_SEND=${MAX_SEND}`);
  let sent = 0, considered = 0, skipped = 0, errors = 0;

  for (const thread of threads) {
    if (!DRY_RUN && sent >= MAX_SEND) { console.log(`Reached MAX_SEND ${MAX_SEND}`); break; }

    const msgs = thread.getMessages();
    const last = msgs[msgs.length - 1];
    considered++;

    // Skip if the last message is from me
    const lastFromStr = (last.getFrom() || '').toLowerCase();
    if (lastFromStr.includes(me)) { skipped++; continue; }

    // Rule 2: Skip if *any* message in this thread is from me
    if (msgs.some(m => (m.getFrom() || '').toLowerCase().includes(me))) { skipped++; continue; }

    // Engines and bulk/list mail
    if (isFromBlockedEngine(last) || isNoreplyOrList(last)) { skipped++; continue; }

    const haystack = getHaystack(last);

    // Must look like a job/opportunity
    if (!looksLikeJob(haystack)) { skipped++; continue; }

    // TTL guard — reply only if we haven't replied to this sender in the last TTL_DAYS
    const senderEmail = getSenderEmail(last);
    if (!senderEmail) { skipped++; continue; }
    if (alreadyRepliedToSender(senderDB, senderEmail, TTL_DAYS)) {
      try { thread.addLabel(label); } catch (_e) {}
      skipped++; continue;
    }

    // Classify by city groups
    const { group, city } = classifyByCity(haystack);

    // Extract polite sender name for greeting
    const senderName = getSenderName(last);

    // Choose reply text
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
        markSenderReplied(senderDB, senderEmail);
        console.log(`WOULD reply (${group || 'ELSE'}${city ? `/${city}` : ''}) -> ${senderEmail} | "${last.getSubject()}" | Greet="${senderName || ''}"`);
      } else {
        last.reply(replyText);
        thread.addLabel(label);
        markSenderReplied(senderDB, senderEmail); // remember timestamp for TTL
        sent++;
        console.log(`Replied (${group || 'ELSE'}${city ? `/${city}` : ''}) -> ${senderEmail} | "${last.getSubject()}" | Greet="${senderName || ''}"`);
        Utilities.sleep(SLEEP_MS);
      }
    } catch (err) {
      errors++;
      console.log(`ERROR on "${thread.getFirstMessageSubject()}": ${err}`);
    }
  }

  saveSenderDB(senderDB);

  console.log(`Summary => Considered: ${considered}, Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`);
}


