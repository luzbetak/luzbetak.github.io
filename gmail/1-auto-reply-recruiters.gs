/**
 * Google Auto Reply Email Script (Simplified)
 * Version: 4.0.3 — 2025-01-05
 *
 * Features:
 * - Replies to ALL new emails (recruiting account)
 * - Tracks replied emails via Gmail label only
 * - Blocked domains and exclusion keywords filtering
 * - Skips Google Calendar invitations and .ics attachments
 * - Clean and maintainable code
 *
 * Changelog:
 * - 4.0.3: Fixed conditional blocks to support multiple allowed subdomains
 */

// ==============================
// CONFIGURATION
// ==============================
const CONFIG = {
  labels: {
    processed: 'AutoReplied',
    error: 'AutoReply-Error'
  },
  limits: {
    maxSend: 50,
    sleepMs: 150,
    daysLookback: 91,
    maxThreadsToProcess: 500
  },
  
  // Testing mode - set to true to test without sending emails
  dryRun: false,
  
};

// ==============================
// EXCLUSION PATTERNS
// ==============================
const PATTERNS = {
  // Domains to never reply to (job boards, automated systems)
  blockedDomains: [
    'indeed.com', 'match.indeed.com', 'linkedin.com','jobleads.com',
    'jobdivamail.com', 'bybit.com','bosch-home.com','calendly.com',
    'monster.com', 'glassdoor.com', 'ziprecruiter.com',
    'calendar.google.com', 'google.com'  // Block calendar invites
  ],
  
  // Domains to block EXCEPT specific subdomains
  // Use allowSubdomains array for multiple allowed subdomains
  conditionalBlocks: [
    { domain: 'dice.com', allowSubdomains: ['user.dice.com', 'mail.dice.com'] }
  ]
};

// ==============================
// MESSAGE BUILDER
// ==============================
class MessageBuilder {
  constructor(config) {
    this.config = config;
  }
  
  buildReply(senderName) {
    const greeting = senderName ? `Dear ${senderName},` : 'Dear Recruiter,';
    
    return `${greeting}


Yes, I am interested in the opportunity. Please schedule a 15-minute phone call using the link below:

https://calendly.com/kevin-luzbetak/

AI Engineer and Data Engineer (MSc) with 25 years of experience building high-quality, cost-efficient AI and RAG applications, AI/LLM chatbots, distributed cloud databases, Databricks and Snowflake platforms, and iPhone mobile applications. I am based in Agoura Hills, California (Los Angeles County). For positions outside my local area, I am available to work remotely. 

Best Regards,
Kevin Thomas Luzbetak, MSc
Resume: https://kevinluzbetak.com/resume.pdf
LinkedIn: https://www.linkedin.com/in/kevin-luzbetak/
Portfolio: https://kevinluzbetak.com

`;
  }
}

// ==============================
// EMAIL PROCESSOR
// ==============================
class EmailProcessor {
  constructor(patterns) {
    this.patterns = patterns;
    this._compilePatterns();
  }
  
  _compilePatterns() {
    this.blockedDomainsRegex = new RegExp(
      `\\b(${this.patterns.blockedDomains
        .map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')})\\b`,
      'i'
    );
  }
  
  isBlockedDomain(message) {
    const fromStr = (message.getFrom() || '').toLowerCase();
    let replyToStr = '';
    try {
      replyToStr = (message.getReplyTo() || '').toLowerCase();
    } catch (e) {}
    const combined = `${fromStr} ${replyToStr}`;
    
    // Check unconditionally blocked domains
    if (this.blockedDomainsRegex.test(combined)) {
      return true;
    }
    
    // Check conditional blocks (e.g., block dice.com but allow specific subdomains)
    for (const rule of this.patterns.conditionalBlocks || []) {
      const domainRegex = new RegExp(`@[^\\s]*${rule.domain.replace(/\./g, '\\.')}`, 'i');
      
      if (domainRegex.test(combined)) {
        // Get allowed subdomains (support both allowSubdomains array and legacy allowSubdomain string)
        const allowedSubdomains = rule.allowSubdomains || (rule.allowSubdomain ? [rule.allowSubdomain] : []);
        
        // Check if email matches ANY allowed subdomain
        const isAllowed = allowedSubdomains.some(subdomain => {
          const allowRegex = new RegExp(`@[^\\s]*${subdomain.replace(/\./g, '\\.')}`, 'i');
          return allowRegex.test(combined);
        });
        
        if (!isAllowed) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  isAutomatedMail(message) {
    const fromStr = (message.getFrom() || '').toLowerCase();
    const subject = (message.getSubject() || '').toLowerCase();
    
    // Allow user.dice.com and mail.dice.com emails (recruiter forwarded emails)
    if (/@(user|mail)\.dice\.com/i.test(fromStr)) {
      return false;
    }
    
    // ========================================
    // GOOGLE CALENDAR INVITATION DETECTION
    // ========================================
    
    // Skip emails from Google Calendar system
    if (/@calendar\.google\.com/i.test(fromStr)) {
      return true;
    }
    
    // Skip calendar-related subjects (invitation, accepted, declined, updated, canceled)
    const calendarSubjectPatterns = [
      /^invitation:/i,
      /^accepted:/i,
      /^declined:/i,
      /^tentative:/i,
      /^updated invitation:/i,
      /^canceled:/i,
      /^cancelled:/i,
      /has accepted your invitation/i,
      /has declined your invitation/i
    ];
    
    if (calendarSubjectPatterns.some(pattern => pattern.test(subject))) {
      return true;
    }
    
    // Check for .ics calendar attachments
    try {
      const attachments = message.getAttachments();
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          const filename = (attachment.getName() || '').toLowerCase();
          const mimeType = (attachment.getContentType() || '').toLowerCase();
          
          // Skip if .ics file or calendar MIME type
          if (filename.endsWith('.ics') || 
              mimeType.includes('text/calendar') ||
              mimeType.includes('application/ics')) {
            return true;
          }
        }
      }
    } catch (e) {
      // Attachment check failed, continue with other checks
    }
    
    // ========================================
    // OTHER AUTOMATED MAIL DETECTION
    // ========================================
    
    if (/(noreply|no-reply|donotreply|mailer-daemon|postmaster)/i.test(fromStr)) {
      return true;
    }
    
    try {
      const autoSubmitted = message.getHeader?.('Auto-Submitted') || '';
      const precedence = message.getHeader?.('Precedence') || '';
      const listId = message.getHeader?.('List-Id') || '';
      const contentType = message.getHeader?.('Content-Type') || '';
      
      // Check for calendar content type in headers
      if (/text\/calendar/i.test(contentType)) {
        return true;
      }
      
      if ((autoSubmitted && autoSubmitted.toLowerCase() !== 'no') ||
          /bulk|list|junk/i.test(precedence) ||
          listId.length > 0) {
        return true;
      }
    } catch (e) {}
    
    return false;
  }
  
  extractSenderInfo(message) {
    const rawFrom = (message.getFrom() || '').trim();
    let displayName = '';
    let email = '';
    
    const angleMatch = rawFrom.match(/^(?:"?([^"]+)"?\s*)?<([^>]+)>$/);
    if (angleMatch) {
      displayName = (angleMatch[1] || '').trim();
      email = (angleMatch[2] || '').trim();
    } else if (rawFrom.includes('<')) {
      const angleIdx = rawFrom.indexOf('<');
      displayName = rawFrom.slice(0, angleIdx).trim().replace(/["]/g, '');
      const innerMatch = rawFrom.slice(angleIdx).match(/<([^>]+)>/);
      email = innerMatch ? innerMatch[1].trim() : '';
    } else if (/\S+@\S+/.test(rawFrom)) {
      email = rawFrom;
    } else {
      displayName = rawFrom.replace(/["]/g, '').trim();
    }
    
    displayName = displayName
      .replace(/\s*\([^)]*\)\s*$/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, '')
      .trim();
    
    let firstName = '';
    if (displayName) {
      const parts = displayName.split(/\s+/);
      if (parts.length > 0 && !/@/.test(parts[0]) && parts[0].length > 1) {
        firstName = parts[0];
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      }
    }
    
    const genericNames = ['team', 'recruiting', 'recruitment', 'talent', 'hr', 'careers', 'jobs', 'hiring'];
    if (genericNames.includes(firstName.toLowerCase())) {
      firstName = '';
    }
    
    return {
      name: firstName || null,
      fullName: displayName || null,
      email: (email || '').toLowerCase().trim()
    };
  }
}

// ==============================
// MAIN PROCESSOR
// ==============================
class AutoReplyProcessor {
  constructor() {
    this.config = CONFIG;
    this.messageBuilder = new MessageBuilder(this.config);
    this.emailProcessor = new EmailProcessor(PATTERNS);
    this.myEmail = Session.getActiveUser().getEmail().toLowerCase();
    this.stats = {
      considered: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      skipReasons: {}
    };
  }
  
  _getOrCreateLabel(name) {
    let label = GmailApp.getUserLabelByName(name);
    if (!label) {
      label = GmailApp.createLabel(name);
    }
    return label;
  }
  
  _incrementSkipReason(reason) {
    this.stats.skipReasons[reason] = (this.stats.skipReasons[reason] || 0) + 1;
    this.stats.skipped++;
  }
  
  _shouldSkipThread(thread) {
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];
    
    // Skip if last message is from me
    const lastFrom = (lastMessage.getFrom() || '').toLowerCase();
    if (lastFrom.includes(this.myEmail)) {
      this._incrementSkipReason('Last message from me');
      return true;
    }
    
    // Skip if ANY message in thread is from me (already replied)
    if (messages.some(m => (m.getFrom() || '').toLowerCase().includes(this.myEmail))) {
      this._incrementSkipReason('Already replied in thread');
      return true;
    }
    
    // Skip blocked domains
    if (this.emailProcessor.isBlockedDomain(lastMessage)) {
      this._incrementSkipReason('Blocked domain');
      return true;
    }
    
    // Skip automated mail (includes calendar invitations)
    if (this.emailProcessor.isAutomatedMail(lastMessage)) {
      this._incrementSkipReason('Automated/calendar/list mail');
      return true;
    }
    
    return false;
  }
  
  run() {
    console.log(`=== Auto Reply: DRY_RUN=${this.config.dryRun} ===`);
    
    const processedLabel = this._getOrCreateLabel(this.config.labels.processed);
    const errorLabel = this._getOrCreateLabel(this.config.labels.error);
    
    const query = `in:inbox newer_than:${this.config.limits.daysLookback}d -label:"${this.config.labels.processed}"`;
    const threads = GmailApp.search(query, 0, this.config.limits.maxThreadsToProcess);
    
    for (const thread of threads) {
      if (!this.config.dryRun && this.stats.sent >= this.config.limits.maxSend) {
        console.log(`Reached limit: ${this.config.limits.maxSend}`);
        break;
      }
      
      this.stats.considered++;
      
      if (this._shouldSkipThread(thread)) {
        continue;
      }
      
      const messages = thread.getMessages();
      const lastMessage = messages[messages.length - 1];
      
      try {
        const senderInfo = this.emailProcessor.extractSenderInfo(lastMessage);
        const replyText = this.messageBuilder.buildReply(senderInfo.name);
        
        if (this.config.dryRun) {
          thread.addLabel(processedLabel);
          console.log(`[DRY] ${senderInfo.email}`);
        } else {
          lastMessage.reply(replyText);
          thread.addLabel(processedLabel);
          this.stats.sent++;
          console.log(`[SENT] ${senderInfo.email}`);
          Utilities.sleep(this.config.limits.sleepMs);
        }
      } catch (error) {
        this.stats.errors++;
        console.error(`[ERROR] ${thread.getFirstMessageSubject()}: ${error}`);
        try {
          thread.addLabel(errorLabel);
        } catch (e) {}
      }
    }
    
    console.log(`\nThreads: ${this.stats.considered} | Sent: ${this.stats.sent} | Skipped: ${this.stats.skipped} | Errors: ${this.stats.errors}`);
    console.log('Skip reasons:', JSON.stringify(this.stats.skipReasons, null, 2));
  }
}

// ==============================
// ENTRY POINT
// ==============================
function autoReplyJobs() {
  const processor = new AutoReplyProcessor();
  processor.run();
}

// ==============================
// UTILITY FUNCTIONS
// ==============================

function testSetup() {
  console.log('Testing Auto Reply Script Setup...\n');
  
  console.log('✓ Configuration loaded');
  console.log(`  - Dry run mode: ${CONFIG.dryRun ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  - Max emails per run: ${CONFIG.limits.maxSend}`);
  
  console.log('\n✓ Patterns loaded');
  console.log(`  - Blocked domains: ${PATTERNS.blockedDomains.length} domains`);
  console.log(`  - Conditional blocks: ${PATTERNS.conditionalBlocks.length} rules`);
  
  // Show conditional block details
  for (const rule of PATTERNS.conditionalBlocks) {
    const allowed = rule.allowSubdomains || [rule.allowSubdomain];
    console.log(`    - ${rule.domain} (allowed: ${allowed.join(', ')})`);
  }
  
  try {
    const myEmail = Session.getActiveUser().getEmail();
    console.log(`\n✓ User email: ${myEmail}`);
  } catch (e) {
    console.error('✗ Cannot access email:', e);
  }
  
  const builder = new MessageBuilder(CONFIG);
  const testMessage = builder.buildReply('John');
  console.log(`\n✓ Message Builder: ${testMessage.length} characters`);
  
  console.log('\n=== Setup test complete! ===');
}

function previewReply() {
  const builder = new MessageBuilder(CONFIG);
  console.log('=== Reply Preview ===\n');
  console.log('With name:\n');
  console.log(builder.buildReply('Sarah'));
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('Without name:\n');
  console.log(builder.buildReply(null));
}

function testProcessThreads(limit = 5) {
  const originalDryRun = CONFIG.dryRun;
  const originalMaxSend = CONFIG.limits.maxSend;
  const originalMaxThreads = CONFIG.limits.maxThreadsToProcess;
  
  CONFIG.dryRun = true;
  CONFIG.limits.maxSend = limit;
  CONFIG.limits.maxThreadsToProcess = limit;
  
  console.log(`=== Test Processing ${limit} Threads (Dry Run) ===\n`);
  
  const processor = new AutoReplyProcessor();
  processor.run();
  
  CONFIG.dryRun = originalDryRun;
  CONFIG.limits.maxSend = originalMaxSend;
  CONFIG.limits.maxThreadsToProcess = originalMaxThreads;
}

/**
 * Test the domain blocking logic with sample addresses
 */
function testDomainBlocking() {
  console.log('=== Testing Domain Blocking Logic ===\n');
  
  const processor = new EmailProcessor(PATTERNS);
  
  const testCases = [
    { from: 'recruiter@user.dice.com', expected: false, desc: 'user.dice.com (allowed)' },
    { from: 'recruiter@mail.dice.com', expected: false, desc: 'mail.dice.com (allowed)' },
    { from: 'noreply@dice.com', expected: true, desc: 'dice.com root (blocked)' },
    { from: 'jobs@alerts.dice.com', expected: true, desc: 'alerts.dice.com (blocked)' },
    { from: 'recruiter@indeed.com', expected: true, desc: 'indeed.com (blocked)' },
    { from: 'recruiter@linkedin.com', expected: true, desc: 'linkedin.com (blocked)' },
    { from: 'recruiter@company.com', expected: false, desc: 'company.com (allowed)' },
  ];
  
  // Create mock message objects
  for (const test of testCases) {
    const mockMessage = {
      getFrom: () => test.from,
      getReplyTo: () => ''
    };
    
    const result = processor.isBlockedDomain(mockMessage);
    const status = result === test.expected ? '✓' : '✗';
    const resultText = result ? 'BLOCKED' : 'ALLOWED';
    
    console.log(`${status} ${test.desc}: ${resultText}`);
    
    if (result !== test.expected) {
      console.log(`  ERROR: Expected ${test.expected ? 'BLOCKED' : 'ALLOWED'}`);
    }
  }
  
  console.log('\n=== Domain blocking test complete! ===');
}
