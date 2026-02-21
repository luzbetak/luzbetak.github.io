/**
 * Gmail Domain Auto-Labeler & Inbox Organizer
 * 
 * from:(*@gmail.com) has:nouserlabels
 * from:(*@gmail.com) has:nouserlabels -in:sent -in:drafts -in:trash
 
 */

// ======================== CONFIGURATION ========================
const CONFIG = {
  // Number of threads to process per batch before reading the next batch
  BATCH_SIZE: 25,

  // Maximum total threads to process in a single script run (safety cap)
  // Set to 0 for unlimited (will run until inbox is empty or Apps Script timeout)
  MAX_THREADS_PER_RUN: 0,

  // Archive emails after labeling (move out of inbox)
  ARCHIVE_AFTER_LABEL: true,

  // If true, sends a summary email report after each run
  SEND_REPORT: true,

  // Log verbosity: 'verbose' logs every thread, 'summary' logs batch totals only
  LOG_LEVEL: 'verbose'
};

// ======================== LABEL CACHE ========================
// In-memory cache so we don't re-query Gmail for the same label repeatedly
const _labelCache = {};

/**
 * Get or create a Gmail label for the given domain name.
 * Returns the GmailLabel object.
 */
function getOrCreateLabel(domain) {
  if (_labelCache[domain]) {
    return _labelCache[domain];
  }

  let label = GmailApp.getUserLabelByName(domain);

  if (!label) {
    label = GmailApp.createLabel(domain);
    if (CONFIG.LOG_LEVEL === 'verbose') {
      Logger.log(`  ✅ Created new label: "${domain}"`);
    }
  }

  _labelCache[domain] = label;
  return label;
}

// ======================== DOMAIN HELPERS ========================

/**
 * Extract the root domain from a full domain string.
 *   "billpay.bankofamerica.com" → "bankofamerica.com"
 *   "mail.notifications.chase.com" → "chase.com"
 *   "example.com" → "example.com"
 */
function getRootDomain(domain) {
  if (!domain) return null;
  const parts = domain.toLowerCase().trim().split('.');
  if (parts.length <= 2) return domain.toLowerCase().trim();
  return parts.slice(-2).join('.');
}

/**
 * Extract the full domain from a "From" header string.
 *   "Kevin Smith <kevin@mail.example.com>" → "mail.example.com"
 */
function extractDomain(fromString) {
  try {
    const emailMatch = fromString.match(/<(.+?)>/) || fromString.match(/([^\s]+@[^\s]+)/);
    if (emailMatch && emailMatch[1]) {
      const parts = emailMatch[1].trim().split('@');
      if (parts.length === 2) {
        return parts[1].toLowerCase().trim();
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ======================== MAIN FUNCTION ========================

/**
 * Main entry point: processes inbox in batches until empty.
 * Run this from the Apps Script editor or set up a trigger.
 */
function organizeInbox() {
  const startTime = Date.now();
  let totalProcessed = 0;
  let totalLabeled = 0;
  let totalArchived = 0;
  let totalSkipped = 0;
  let batchNumber = 0;
  const domainCounts = {};

  Logger.log('═══════════════════════════════════════════════════');
  Logger.log('  Gmail Domain Organizer — Starting');
  Logger.log(`  Batch size: ${CONFIG.BATCH_SIZE}`);
  Logger.log('═══════════════════════════════════════════════════');

  try {
    while (true) {
      // Safety cap check
      if (CONFIG.MAX_THREADS_PER_RUN > 0 && totalProcessed >= CONFIG.MAX_THREADS_PER_RUN) {
        Logger.log(`\n⚠️  Reached MAX_THREADS_PER_RUN limit (${CONFIG.MAX_THREADS_PER_RUN}). Stopping.`);
        break;
      }

      // Apps Script timeout safety: stop if we've been running > 5 minutes
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > 300) {
        Logger.log(`\n⚠️  Approaching Apps Script time limit (${Math.round(elapsed)}s elapsed). Stopping safely.`);
        break;
      }

      // Fetch the next batch — always index 0 because we archive as we go
      const threads = GmailApp.getInboxThreads(0, CONFIG.BATCH_SIZE);

      if (threads.length === 0) {
        Logger.log('\n🎉 Inbox is empty! All emails have been organized.');
        break;
      }

      batchNumber++;
      Logger.log(`\n── Batch ${batchNumber}: Processing ${threads.length} threads ──`);

      let batchLabeled = 0;
      let batchArchived = 0;
      let batchSkipped = 0;

      for (const thread of threads) {
        try {
          const messages = thread.getMessages();
          if (!messages || messages.length === 0) {
            batchSkipped++;
            totalSkipped++;
            continue;
          }

          const from = messages[0].getFrom();
          const rawDomain = extractDomain(from);
          const rootDomain = getRootDomain(rawDomain);

          if (!rootDomain) {
            if (CONFIG.LOG_LEVEL === 'verbose') {
              Logger.log(`  ⏭️  Skipped (no domain): ${from}`);
            }
            // Archive anyway so we don't loop on the same thread forever
            if (CONFIG.ARCHIVE_AFTER_LABEL) {
              thread.moveToArchive();
              totalArchived++;
              batchArchived++;
            }
            batchSkipped++;
            totalSkipped++;
            continue;
          }

          // Get or create label for this root domain
          const label = getOrCreateLabel(rootDomain);

          // Apply label
          thread.addLabel(label);
          batchLabeled++;
          totalLabeled++;

          // Track counts
          domainCounts[rootDomain] = (domainCounts[rootDomain] || 0) + 1;

          // Archive (move out of inbox)
          if (CONFIG.ARCHIVE_AFTER_LABEL) {
            thread.moveToArchive();
            batchArchived++;
            totalArchived++;
          }

          if (CONFIG.LOG_LEVEL === 'verbose') {
            const subject = thread.getFirstMessageSubject();
            const truncated = subject && subject.length > 50 ? subject.substring(0, 50) + '...' : subject;
            Logger.log(`  📧 ${rootDomain} → "${truncated}"`);
          }

          totalProcessed++;

        } catch (threadError) {
          Logger.log(`  ❌ Error processing thread: ${threadError.toString()}`);
        }
      }

      Logger.log(`  Batch ${batchNumber} summary: ${batchLabeled} labeled, ${batchArchived} archived, ${batchSkipped} skipped`);

      // If nothing was archived, we're stuck — break to avoid infinite loop
      if (batchArchived === 0 && batchLabeled === 0) {
        Logger.log('\n⚠️  No threads were processed in this batch. Stopping.');
        break;
      }
    }

  } catch (error) {
    Logger.log('❌ Fatal error: ' + error.toString());
    throw error;
  }

  // Final report
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  Logger.log('\n═══════════════════════════════════════════════════');
  Logger.log('  COMPLETED');
  Logger.log(`  Duration: ${duration}s`);
  Logger.log(`  Batches: ${batchNumber}`);
  Logger.log(`  Total labeled: ${totalLabeled}`);
  Logger.log(`  Total archived: ${totalArchived}`);
  Logger.log(`  Total skipped: ${totalSkipped}`);
  Logger.log('═══════════════════════════════════════════════════');

  // Domain breakdown
  const sortedDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1]);

  if (sortedDomains.length > 0) {
    Logger.log('\n── Domain Breakdown ──');
    sortedDomains.forEach(([domain, count], i) => {
      Logger.log(`  ${i + 1}. ${domain}: ${count} threads`);
    });
  }

  // Send email report
  if (CONFIG.SEND_REPORT && totalLabeled > 0) {
    sendReport(sortedDomains, totalLabeled, totalArchived, totalSkipped, duration, batchNumber);
  }

  return {
    totalLabeled,
    totalArchived,
    totalSkipped,
    batchCount: batchNumber,
    domainCounts
  };
}

// ======================== AUTO-PROCESSING ========================

/**
 * Set up an hourly trigger to process new inbox emails automatically.
 */
function setupAutoProcessing() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processNewEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('processNewEmails')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✅ Hourly auto-processing trigger created for processNewEmails()');
}

/**
 * Remove the auto-processing trigger.
 */
function removeAutoProcessing() {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processNewEmails') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  Logger.log(`Removed ${removed} trigger(s)`);
}

/**
 * Process new inbox emails — designed to be called by the hourly trigger.
 */
function processNewEmails() {
  const originalBatch = CONFIG.BATCH_SIZE;
  const originalReport = CONFIG.SEND_REPORT;
  const originalLogLevel = CONFIG.LOG_LEVEL;

  CONFIG.BATCH_SIZE = 25;
  CONFIG.SEND_REPORT = false;
  CONFIG.LOG_LEVEL = 'summary';

  try {
    organizeInbox();
  } finally {
    CONFIG.BATCH_SIZE = originalBatch;
    CONFIG.SEND_REPORT = originalReport;
    CONFIG.LOG_LEVEL = originalLogLevel;
  }
}

// ======================== UTILITIES ========================

/**
 * Preview mode: show domain stats without modifying anything.
 */
function previewDomains() {
  const threads = GmailApp.getInboxThreads(0, CONFIG.BATCH_SIZE);
  const domainCount = {};

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      const rawDomain = extractDomain(message.getFrom());
      const rootDomain = getRootDomain(rawDomain);
      if (rootDomain) {
        domainCount[rootDomain] = (domainCount[rootDomain] || 0) + 1;
      }
    });
  });

  const sorted = Object.entries(domainCount).sort((a, b) => b[1] - a[1]);
  Logger.log(`\n── Preview: ${threads.length} threads, ${sorted.length} unique domains ──`);
  sorted.forEach(([domain, count], i) => {
    Logger.log(`  ${i + 1}. ${domain}: ${count} messages`);
  });

  return domainCount;
}

/**
 * Remove all domain-style labels (cleanup).
 * Only removes labels that look like domain names (contain a dot, no slashes).
 */
function removeAllDomainLabels() {
  const labels = GmailApp.getUserLabels();
  let removed = 0;

  labels.forEach(label => {
    const name = label.getName();
    if (name.includes('.') && !name.includes('/')) {
      try {
        label.deleteLabel();
        removed++;
        Logger.log(`  Removed: ${name}`);
      } catch (e) {
        Logger.log(`  Error removing ${name}: ${e.toString()}`);
      }
    }
  });

  Logger.log(`Total labels removed: ${removed}`);
}

/**
 * Send an HTML email report summarizing what was organized.
 */
function sendReport(sortedDomains, totalLabeled, totalArchived, totalSkipped, duration, batchCount) {
  try {
    const email = Session.getActiveUser().getEmail();
    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'America/Los_Angeles', 'yyyy-MM-dd hh:mm:ss a z');

    let rows = '';
    sortedDomains.forEach(([domain, count], i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
      rows += `
        <tr style="background:${bg}">
          <td style="padding:6px 10px;text-align:center">${i + 1}</td>
          <td style="padding:6px 10px"><strong>${domain}</strong></td>
          <td style="padding:6px 10px;text-align:center">${count}</td>
        </tr>`;
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px">
        <h2 style="color:#333">📬 Inbox Organizer Report</h2>
        <div style="background:#e8f5e9;padding:15px;border-radius:5px;margin-bottom:20px">
          <p style="margin:0;font-size:15px">
            ✅ <strong>${totalArchived} emails archived</strong> into domain labels<br>
            📁 ${sortedDomains.length} unique domains processed<br>
            ⏱️ ${duration}s across ${batchCount} batches<br>
            ⏭️ ${totalSkipped} threads skipped
          </p>
        </div>
        <table border="1" cellpadding="0" cellspacing="0" 
               style="border-collapse:collapse;width:100%">
          <tr style="background:#4285f4;color:white">
            <th style="padding:8px 10px">#</th>
            <th style="padding:8px 10px">Domain</th>
            <th style="padding:8px 10px">Threads</th>
          </tr>
          ${rows}
        </table>
        <p style="color:#999;font-size:12px;margin-top:20px">
          Generated ${dateStr}
        </p>
      </div>`;

    GmailApp.sendEmail(email,
      `📬 Inbox Organized — ${totalArchived} emails archived — ${Utilities.formatDate(now, 'America/Los_Angeles', 'MM/dd/yyyy')}`,
      'View in HTML.',
      { htmlBody: html, name: 'Inbox Organizer' }
    );

    Logger.log('📧 Report sent to ' + email);
  } catch (e) {
    Logger.log('Error sending report: ' + e.toString());
  }
}
