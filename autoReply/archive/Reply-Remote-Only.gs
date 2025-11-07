function replyRemoteOnly() {
  // ===== CONFIG =====
  const DRY_RUN = false;          // set to true to test without sending
  const MAX_SEND = 50;            // safety cap per run
  const QUERY =
    '(subject:{role OR position OR opening OR opportunity OR urgent} OR "Day 1 Onsite" OR "onsite") ' +
    '-in:chats -in:drafts -in:spam -in:trash newer_than:365d';

  const PROCESSED_LABEL = 'AutoReplied/Outside-CA';
  const REPLY_TEXT =
    "Hi,\n\nI’m based in Agoura Hills, California. I can only do on-site or hybrid roles within Los Angeles, California (commuting distance). " +
    "For positions outside Los Angeles, California, I’m only open to fully remote. My compensation requirement is $90/hour (equivalent to $187K annually).\n\n" +
    "If this role is fully remote, please share the job ID, client, location, rate, and interview process.\n\nThanks,\nKevin Luzbetak\n(747)388-0422";

  const SLEEP_MS = 150;           // gentle pause between sends
  const SCAN_BODY_CHARS = 2000;   // analyze first N chars of body to reduce false positives

  // ===== STATE/LOCATION MATCHING =====
  const US_STATE_ABBR = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS',
    'MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
  ];
  const US_STATE_FULL = [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois',
    'Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana',
    'Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
    'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
    'District of Columbia'
  ];
  // Common CA cities/keywords to help disambiguate “CA”
  const CA_CITY_HINTS = [
    'los angeles','la, ca','santa monica','glendale','agoura hills','calabasas','torrance','san francisco','san jose',
    'irvine','orange county','san diego','pasadena','burbank','culver city','westlake village','thousand oaks','ventura'
  ];

  const REMOTE_HINTS = /(remote|100% remote|fully remote|remote only)/i;

  function textSuggestsOutsideCA(subject, body) {
    const t = `${subject}\n${body}`.toLowerCase();

    // If clearly "remote only", still treat as outside-CA job—reply is fine (we'll not skip).
    // If you want to SKIP remote roles, uncomment the following line:
    // if (REMOTE_HINTS.test(t)) return false;

    // If explicitly California (abbr or full or CA city), then NOT outside-CA
    const mentionsCA =
      /\bca\b|california/i.test(t) ||
      CA_CITY_HINTS.some(h => t.includes(h));
    if (mentionsCA) return false;

    // Detect any other state abbr (with word boundaries) e.g., ", MA", " (MA)", " MA "
    const abbrHit = US_STATE_ABBR
      .filter(s => s !== 'CA')
      .some(s => new RegExp(`\\b${s}\\b`).test(t));
    if (abbrHit) return true;

    // Detect any other full state name
    const fullHit = US_STATE_FULL
      .filter(s => s.toLowerCase() !== 'california')
      .some(s => t.includes(s.toLowerCase()));
    if (fullHit) return true;

    // City + comma + state pattern like "Boston, MA" or "Austin, Texas"
    if (/\b[A-Za-z .'-]+,\s*(?:[A-Z]{2}|[A-Za-z .'-]+)\b/.test(t)) {
      // If it includes ", CA" we already returned false above via mentionsCA.
      return true;
    }

    return false;
  }

  // ===== SETUP =====
  const me = Session.getActiveUser().getEmail().toLowerCase();
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) label = GmailApp.createLabel(PROCESSED_LABEL);

  const threads = GmailApp.search(`${QUERY} -label:"${PROCESSED_LABEL}"`, 0, 500);
  console.log(`Found ${threads.length} threads. DRY_RUN=${DRY_RUN}, MAX_SEND=${MAX_SEND}`);
  console.log(`Query: ${QUERY}`);

  let sent = 0, considered = 0, skipped = 0, errors = 0;

  for (const thread of threads) {
    if (!DRY_RUN && sent >= MAX_SEND) { console.log(`Reached MAX_SEND ${MAX_SEND}`); break; }

    const msgs = thread.getMessages();
    const last = msgs[msgs.length - 1];
    considered++;

    // Skip if from me
    const fromAddr = (last.getFrom() || '').toLowerCase();
    if (fromAddr.includes(me)) { skipped++; continue; }

    // Guard: no-reply / bulk / lists
    if (/(noreply|no-reply|donotreply)/i.test(fromAddr)) { skipped++; continue; }
    try {
      const autoSubmitted = (last.getHeader && last.getHeader('Auto-Submitted')) || '';
      const precedence   = (last.getHeader && last.getHeader('Precedence')) || '';
      const listId       = (last.getHeader && last.getHeader('List-Id')) || '';
      if ((autoSubmitted && autoSubmitted.toLowerCase() !== 'no') ||
          /bulk|list|junk/i.test(precedence) ||
          (listId && listId.length > 0)) { skipped++; continue; }
    } catch (e) {}

    const subject = last.getSubject() || '';
    // Use only the first part of the body to avoid signatures/footers/threads noise
    let body = '';
    try {
      body = last.getPlainBody().slice(0, SCAN_BODY_CHARS);
    } catch (e) {
      // Fallback to snippet if plain body unavailable
      body = (thread.getPermalink && thread.getFirstMessageSubject()) || '';
    }

    const looksOutsideCA = textSuggestsOutsideCA(subject, body);

    if (!looksOutsideCA) {
      skipped++;
      console.log(`Skip (not outside CA): From=${fromAddr} | Subj="${subject}"`);
      thread.addLabel(label); // mark as seen; remove if you prefer to re-check later
      continue;
    }

    try {
      if (DRY_RUN) {
        thread.addLabel(label);
        console.log(`WOULD reply -> ${fromAddr} | "${subject}"`);
      } else {
        last.reply(REPLY_TEXT);
        thread.addLabel(label);
        sent++;
        console.log(`Replied -> ${fromAddr} | "${subject}"`);
        Utilities.sleep(SLEEP_MS);
      }
    } catch (err) {
      errors++;
      console.log(`ERROR on "${subject}": ${err}`);
    }
  }

  console.log(`Summary => Considered: ${considered}, Sent: ${sent}, Skipped: ${skipped}, Errors: ${errors}`);
}

