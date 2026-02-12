/**
 * Google Auto Reply Email Script (Unified) — with quoted original email
 *
 * Organization:
 * 1) CONFIG (edit here)
 * 2) KEYWORDS section  — global "job/opportunity" detectors
 * 3) CITY GROUPS       — LOCAL / HYBRID / REMOTE city keywords
 * 4) REPLY BUILDERS    — section-specific messages (editable)
 * 5) ENGINE / LIST GUARDS, HELPERS
 * 6) MAIN: autoReplyJobs()
 *
 * Notes:
 * - We can include the original email below our reply (HTML-quoted).
 * - We match emails that (a) look like job opportunities via KEYWORDS and
 *   (b) classify by city/group or fall into ELSE.
 * - We skip job engines (indeed/linkedin/dice), noreply/list/bulk mails.
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
  'Phone  : (747) 388-0422',
  'Resume : https://kevinluzbetak.com/resume.pdf'
].join('\n');

const COMP_REQUIRE_CONTRACT = '$90+/hour (W-2 contract or hire)';
const COMP_REQUIRE_FULLTIME = '$185,000+ base (full-time)';

// Engines / job boards to never reply to
const BLOCKED_DOMAIN_RE = /\b(indeed\.com|match\.indeed\.com|linkedin\.com|dice\.com|jobdivamail\.com|bybit\.com)\b/i;

// === Quoting controls ===
const INCLUDE_ORIGINAL  = true;     // set false to disable quoting original message
const MAX_QUOTED_CHARS  = 20000;    // trim oversized original HTML
const QUOTE_HEADER_HTML = '<br><br>—– Original message —–<br>';


//////////////////////////////
// 2) KEYWORDS (Global job/opportunity identifiers)
//////////////////////////////
const JOB_KEYWORDS = [
  'Position', 'engineer', 'opportunity', 'urgent', 'requirement',
  'job', 'Machine Learning', 'Contract', 'Snowflake', 'Databricks',
  'Scientist', 'Cloud', 'Role'
];

// Precompile regex for faster checks
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
    'Agoura Hills', 'Calabasas', 'Santa Monica', 'Burbank', 'Glendale'
  ],
  HYBRID: [
    'Torrance', 'Irvine', 'Santa Barbara', 'San Diego', 'Pasadena', 'Culver City'
  ],
  REMOTE: [
    // Keep 'Remote' to classify correctly, but do NOT treat it as a city in replies.
    'Remote',
    'Dallas', 'New York', 'Louisville', 'Kentucky', 'Texas', 'San Francisco', 'Florida',
    'Redwood City', 'Philadelphia', 'Boston', 'Chicago', 'Sunnyvale', 'Irving'
  ]
};

// Build quick regex maps for each group
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
// 4) REPLY BUILDERS
//////////////////////////////
function buildLocalReply(city) {
  return [
    `Hi,`,
    ``,
    `I’m based in Agoura Hills, California. For roles in or near ${city || 'the listed city'}, I can support on-site or remote as the client prefers.`,
    `My compensation requirements are ${COMP_REQUIRE_CONTRACT} or ${COMP_REQUIRE_FULLTIME} .`,
    ``,
    `Please share the job ID, client, location, rate, interview process, and whether on-site/remote is acceptable.`,
    ``,
    SIGNATURE
  ].join('\n');
}

function buildHybridReply(city) {
  const c = city || 'the listed city';
  return [
    `Hi,`,
    ``,
    `I’m based in Agoura Hills, California. Due to commute/time, I can be on-site in ${c} up to one day per week, with the remainder remote.`,
    `My compensation requirements are ${COMP_REQUIRE_CONTRACT} or ${COMP_REQUIRE_FULLTIME} .`,
    ``,
    `Please share the job ID, client, location, rate, interview process, and confirm the one-day-onsite hybrid setup.`,
    ``,
    SIGNATURE
  ].join('\n');
}

// Do not treat "Remote" as a city.
function buildRemoteReply() {
  return [
    `Hi,`,
    ``,
    `I’m based in Agoura Hills, California. I’m open to fully remote work.`,
    `My compensation requirements are ${COMP_REQUIRE_CONTRACT} or ${COMP_REQUIRE_FULLTIME} .`,
    ``,
    `If this position is fully remote, please share the job ID, client, location, rate, and interview process.`,
    ``,
    SIGNATURE
  ].join('\n');
}

function buildElseReply() {
  return [
    `Hi,`,
    ``,
    `I’m based in Agoura Hills, California. Please let me know if the role can be remote, hybrid, or on-site and where.`,
    `My compensation requirements are ${COMP_REQUIRE_CONTRACT} or ${COMP_REQUIRE_FULLTIME} .`,
    ``,
    `Please include the job ID, client, location, rate, and interview process in your reply.`,
    ``,
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

// Return {group: 'LOCAL'|'HYBRID'|'REMOTE'|null, city: '...'|null}
// Ensures a literal "Remote" match is NOT treated as a city value.
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

// === Quoting helpers ===
function escapeHtml_(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml_(s) {
  return escapeHtml_(s).replace(/\n/g, '<br>');
}

/**
 * Build the final HTML we’ll send:
 * - Top: your reply (converted to HTML)
 * - Bottom: quoted original email (as HTML inside a blockquote)
 */
function buildReplyHtml_(replyText, lastMsg) {
  const replyTop = textToHtml_(replyText);
  if (!INCLUDE_ORIGINAL) return replyTop;

  // Prefer original HTML body; fall back to plain text if needed.
  let originalHtml = '';
  try {
    originalHtml = (lastMsg.getBody && lastMsg.getBody()) || '';
  } catch (e) { originalHtml = ''; }

  if (!originalHtml) {
    try {
      const plain = (lastMsg.getPlainBody && lastMsg.getPlainBody()) || '';
      originalHtml = textToHtml_(plain);
    } catch (e) { originalHtml = ''; }
  }

  // Trim to keep replies lightweight (avoid Gmail clipping).
  if (originalHtml && originalHtml.length > MAX_QUOTED_CHARS) {
    originalHtml = originalHtml.slice(0, MAX_QUOTED_CHARS) + '<br><em>(truncated)</em>';
  }

  const quoted = originalHtml
    ? `${QUOTE_HEADER_HTML}<blockquote style="margin:0 0 0 .8em;border-left:3px solid #ccc;padding-left:.8em">${originalHtml}</blockquote>`
    : '';

  return replyTop + quoted;
}


//////////////////////////////
// 6) MAIN
//////////////////////////////
function autoReplyJobs() {
  const me = Session.getActiveUser().getEmail().toLowerCase();
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) label = GmailApp.createLabel(PROCESSED_LABEL);

  // Broad query; content filtering happens below.
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

    // Choose reply text by group
    let replyText = '';
    if (group === 'LOCAL') {
      replyText = buildLocalReply(city);
    } else if (group === 'HYBRID') {
      replyText = buildHybridReply(city);
    } else if (group === 'REMOTE') {
      // Do *not* use city in remote reply; avoids "For roles in Remote,"
      replyText = buildRemoteReply();
    } else {
      replyText = buildElseReply();
    }

    try {
      if (DRY_RUN) {
        thread.addLabel(label);
        console.log(`WOULD reply (${group || 'ELSE'}${city ? `/${city}` : ''}) -> ${fromStr} | "${last.getSubject()}"`);
      } else {
        // Build HTML that includes your reply + quoted original
        const htmlBody = buildReplyHtml_(replyText, last);
        last.reply(replyText, { htmlBody });
        thread.addLabel(label);
        sent++;
        console.log(`Replied (${group || 'ELSE'}${city ? `/${city}` : ''}) -> ${fromStr} | "${last.getSubject()}"`);
        Utilities.sleep(SLEEP_MS);
      }
    } catch (err) {
      errors++;
      console.log(`ERROR on "${thread.getFirstMessageSubject()}": ${err}`);
    }
  }

  console.log(`Summary => Considered: ${considered}, Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`);
}

