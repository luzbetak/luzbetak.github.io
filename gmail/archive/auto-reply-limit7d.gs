/**
 * Google Auto Reply Email Script (Simplified)
 * Version: 3.0.2 — 2024-12-22
 *
 * Features:
 * - Single, professional response template
 * - No location classification needed
 * - Clean and maintainable code
 * - Enhanced error handling and logging
 * - Sender database to prevent duplicate replies
 */

// ==============================
// CONFIGURATION
// ==============================
const CONFIG = {
  // Processing settings
  labels: {
    processed: 'AutoReplied',
    error: 'AutoReply-Error'
  },
  limits: {
    maxSend: 50,
    scanBodyChars: 5000,
    sleepMs: 150,
    daysLookback: 30,
    maxThreadsToProcess: 500
  },
  
  // Sender database settings
  senderDB: {
    key: 'AutoReply_SendOnceBySender_v3',
    maxEntries: 5000,
    ttlDays: 7  // Days before sender can receive another auto-reply
  },
  
  // Testing mode - set to true to test without sending emails
  dryRun: false,
  
  // Personal information
  personal: {
    name: 'Kevin Luzbetak',
    location: 'Agoura Hills, California',
    calendly: 'https://calendly.com/kevin-luzbetak/20-minute',
    resume: 'https://kevinluzbetak.com/resume.pdf',
    portfolio: 'https://kevinluzbetak.com',
    qualifications: {
      degree: 'Master\'s degree in Computer Science with a focus on Artificial Intelligence and Machine Learning',
      experience: '25+ years as a Software Engineer and Data Engineer',
      expertise: 'large-scale systems, cloud architecture, data pipelines, AI/ML, RAG, and advanced analytics'
    }
  }
};

// ==============================
// KEYWORDS AND PATTERNS
// ==============================
const PATTERNS = {
  // Job-related keywords to identify relevant emails
  jobKeywords: [
    // Technical skills
    'Airflow', 'Analytics', 'AWS', 'Azure', 'BigQuery', 'Cloud',
    'Databricks', 'Data', 'Delta', 'Docker', 'ETL', 'GCP',
    'Kafka', 'Kubernetes', 'Machine Learning', 'Pipeline',
    'PySpark', 'Python', 'Redshift', 'Scala', 'Snowflake', 'Spark', 'SQL',
    
    // Job-related terms
    'Candidate', 'Career', 'Contract', 'Developer', 'Development',
    'Engineer', 'Engineering', 'Hiring', 'Interview', 'Job', 
    'Opportunity', 'Position', 'Programmer', 'Programming',
    'Recruiter', 'Recruiting', 'Requirement', 'Role', 'Scientist',
    'Skill', 'Software', 'Team', 'Technical', 'Technology',
    'Urgent', 'W2', 'W-2', 'Work'
  ],
  
  // Domains to never reply to (job boards, automated systems)
  blockedDomains: [
    'indeed.com', 'match.indeed.com', 'linkedin.com',
    'jobdivamail.com', 'bybit.com', 'dice.com', 
    'monster.com', 'glassdoor.com', 'ziprecruiter.com'
  ],
  
  // Keywords that indicate NOT to reply
  exclusionKeywords: [
    'unsubscribe', 'opt out', 'remove me', 'stop receiving',
    'no longer interested', 'position filled', 'role closed'
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
    
    const message = `${greeting}

Thank you for reaching out regarding this opportunity. I am interested in learning more.

I bring a ${this.config.personal.qualifications.degree}, along with ${this.config.personal.qualifications.experience} specializing in ${this.config.personal.qualifications.expertise}. 

I am based in ${this.config.personal.location}. For positions outside my local area, I am available to work remotely full-time. I have extensive experience collaborating with distributed teams and maintaining high productivity in remote environments.

Best regards,
${this.config.personal.name}
Calendly: ${this.config.personal.calendly}
Portfolio: ${this.config.personal.portfolio}
Resume: ${this.config.personal.resume}`;
    return message;
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
    // Compile job keywords regex
    this.jobKeywordsRegex = new RegExp(
      this.patterns.jobKeywords
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
      'i'
    );
    
    // Compile blocked domains regex
    this.blockedDomainsRegex = new RegExp(
      `\\b(${this.patterns.blockedDomains
        .map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')})\\b`,
      'i'
    );
    
    // Compile exclusion keywords regex
    this.exclusionRegex = new RegExp(
      this.patterns.exclusionKeywords
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
      'i'
    );
  }
  
  isBlockedDomain(message) {
    const fromStr = (message.getFrom() || '').toLowerCase();
    let replyToStr = '';
    try {
      replyToStr = (message.getReplyTo() || '').toLowerCase();
    } catch (e) {
      // Ignore error
    }
    const combined = `${fromStr} ${replyToStr}`;
    return this.blockedDomainsRegex.test(combined);
  }
  
  isAutomatedMail(message) {
    const fromStr = (message.getFrom() || '').toLowerCase();
    
    // Check for noreply addresses
    if (/(noreply|no-reply|donotreply|mailer-daemon|postmaster)/i.test(fromStr)) {
      return true;
    }
    
    // Check headers for automated/list mail
    try {
      const autoSubmitted = message.getHeader?.('Auto-Submitted') || '';
      const precedence = message.getHeader?.('Precedence') || '';
      const listId = message.getHeader?.('List-Id') || '';
      const listUnsubscribe = message.getHeader?.('List-Unsubscribe') || '';
      
      if ((autoSubmitted && autoSubmitted.toLowerCase() !== 'no') ||
          /bulk|list|junk/i.test(precedence) ||
          listId.length > 0 ||
          listUnsubscribe.length > 0) {
        return true;
      }
    } catch (e) {
      // Ignore header errors
    }
    
    return false;
  }
  
  extractContent(message, maxChars = 5000) {
    const subject = message.getSubject() || '';
    let body = '';
    try {
      body = (message.getPlainBody() || '').slice(0, maxChars);
    } catch (e) {
      body = '';
    }
    return `${subject}\n${body}`;
  }
  
  containsExclusionKeywords(content) {
    return this.exclusionRegex.test(content);
  }
  
  extractSenderInfo(message) {
    const rawFrom = (message.getFrom() || '').trim();
    let displayName = '';
    let email = '';
    
    // Parse "Name <email>" format
    const angleMatch = rawFrom.match(/^(?:"?([^"]+)"?\s*)?<([^>]+)>$/);
    if (angleMatch) {
      displayName = (angleMatch[1] || '').trim();
      email = (angleMatch[2] || '').trim();
    } else if (rawFrom.includes('<')) {
      // Alternative parsing
      const angleIdx = rawFrom.indexOf('<');
      displayName = rawFrom.slice(0, angleIdx).trim().replace(/["]/g, '');
      const innerMatch = rawFrom.slice(angleIdx).match(/<([^>]+)>/);
      email = innerMatch ? innerMatch[1].trim() : '';
    } else if (/\S+@\S+/.test(rawFrom)) {
      // Plain email address
      email = rawFrom;
    } else {
      // Plain display name (rare)
      displayName = rawFrom.replace(/["]/g, '').trim();
    }
    
    // Clean up display name
    displayName = displayName
      .replace(/\s*\([^)]*\)\s*$/g, '') // Remove parenthetical suffixes
      .replace(/\s+/g, ' ')
      .replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, '') // Remove titles
      .trim();
    
    // Extract first name only for greeting (optional)
    let firstName = '';
    if (displayName) {
      // Take first word as first name, unless it looks like an email or company
      const parts = displayName.split(/\s+/);
      if (parts.length > 0 && !/@/.test(parts[0]) && parts[0].length > 1) {
        firstName = parts[0];
        // Capitalize properly
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      }
    }
    
    // Validate that it's not a generic name
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
  
  isJobRelated(content) {
    // Count how many different job keywords appear in the content
    let keywordCount = 0;
    for (const keyword of this.patterns.jobKeywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(content)) {
        keywordCount++;
        // For efficiency, stop counting after finding 2 keywords
        if (keywordCount >= 2) {
          return true;
        }
      }
    }
    // For very short emails with strong indicators, accept 1 keyword
    const wordCount = content.split(/\s+/).length;
    if (wordCount <= 10 && keywordCount >= 1) {
      return true;
    }
    
    return false;
  }
}

// ==============================
// SENDER DATABASE
// ==============================
class SenderDatabase {
  constructor(config) {
    this.config = config;
    this.data = this._load();
  }
  
  _load() {
    const props = PropertiesService.getUserProperties();
    const raw = props.getProperty(this.config.senderDB.key);
    try {
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (e) {
      console.log('Error loading sender database:', e);
      return {};
    }
  }
  
  save() {
    const props = PropertiesService.getUserProperties();
    
    // Clean expired entries before saving
    this._cleanExpired();
    
    // Sort by timestamp (newest first) and trim to max size
    const entries = Object.entries(this.data)
      .sort((a, b) => (b[1] || '').localeCompare(a[1] || ''));
    
    if (entries.length > this.config.senderDB.maxEntries) {
      const trimmed = entries.slice(0, this.config.senderDB.maxEntries);
      this.data = Object.fromEntries(trimmed);
    }
    
    props.setProperty(this.config.senderDB.key, JSON.stringify(this.data));
  }
  
  _cleanExpired() {
    const now = Date.now();
    const ttlMs = this.config.senderDB.ttlDays * 24 * 60 * 60 * 1000;
    
    for (const [email, timestamp] of Object.entries(this.data)) {
      const time = new Date(timestamp).getTime();
      if ((now - time) > ttlMs) {
        delete this.data[email];
      }
    }
  }
  
  markReplied(email) {
    if (!email) return;
    this.data[email] = new Date().toISOString();
  }
  
  hasRecentlyReplied(email) {
    if (!email) return false;
    
    const timestamp = this.data[email];
    if (!timestamp) return false;
    
    const ttlDays = this.config.senderDB.ttlDays;
    if (!ttlDays || ttlDays <= 0) return true; // No TTL = block forever
    
    const repliedTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    
    return (now - repliedTime) < ttlMs;
  }
  
  getStats() {
    const now = Date.now();
    const ttlMs = this.config.senderDB.ttlDays * 24 * 60 * 60 * 1000;
    
    let active = 0;
    let expired = 0;
    
    for (const timestamp of Object.values(this.data)) {
      const time = new Date(timestamp).getTime();
      if ((now - time) < ttlMs) {
        active++;
      } else {
        expired++;
      }
    }
    
    return {
      total: Object.keys(this.data).length,
      active,
      expired
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
    this.senderDB = new SenderDatabase(this.config);
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
    
    // Skip automated mail
    if (this.emailProcessor.isAutomatedMail(lastMessage)) {
      this._incrementSkipReason('Automated/list mail');
      return true;
    }
    
    // Extract content for analysis
    const content = this.emailProcessor.extractContent(
      lastMessage, 
      this.config.limits.scanBodyChars
    );
    
    // Skip if contains exclusion keywords
    if (this.emailProcessor.containsExclusionKeywords(content)) {
      this._incrementSkipReason('Contains exclusion keywords');
      return true;
    }
    
    // Skip if not job-related
    if (!this.emailProcessor.isJobRelated(content)) {
      this._incrementSkipReason('Not job-related');
      return true;
    }
    
    // Check sender database
    const senderInfo = this.emailProcessor.extractSenderInfo(lastMessage);
    if (!senderInfo.email) {
      this._incrementSkipReason('No sender email');
      return true;
    }
    
    if (this.senderDB.hasRecentlyReplied(senderInfo.email)) {
      this._incrementSkipReason('Recently replied to sender');
      return true;
    }
    
    return false;
  }
  
  run() {
    console.log('=== Starting Auto Reply Processor (Simplified) ===');
    console.log(`Configuration: DRY_RUN=${this.config.dryRun}, MAX_SEND=${this.config.limits.maxSend}`);
    console.log(`Location: ${this.config.personal.location}`);
    
    // Get labels
    const processedLabel = this._getOrCreateLabel(this.config.labels.processed);
    const errorLabel = this._getOrCreateLabel(this.config.labels.error);
    
    // Build query - get unprocessed emails from inbox
    const query = `in:inbox newer_than:${this.config.limits.daysLookback}d -label:"${this.config.labels.processed}"`;
    
    // Get threads
    const threads = GmailApp.search(query, 0, this.config.limits.maxThreadsToProcess);
    console.log(`Found ${threads.length} threads to process`);
    
    // Process threads
    for (const thread of threads) {
      // Check send limit
      if (!this.config.dryRun && this.stats.sent >= this.config.limits.maxSend) {
        console.log(`Reached MAX_SEND limit of ${this.config.limits.maxSend}`);
        break;
      }
      
      this.stats.considered++;
      
      // Check if should skip
      if (this._shouldSkipThread(thread)) {
        // Still mark with label if recently replied
        const messages = thread.getMessages();
        const lastMessage = messages[messages.length - 1];
        const senderInfo = this.emailProcessor.extractSenderInfo(lastMessage);
        
        if (this.senderDB.hasRecentlyReplied(senderInfo.email)) {
          try {
            thread.addLabel(processedLabel);
          } catch (e) {
            // Ignore label error
          }
        }
        continue;
      }
      
      // Generate and send reply
      const messages = thread.getMessages();
      const lastMessage = messages[messages.length - 1];
      
      try {
        const senderInfo = this.emailProcessor.extractSenderInfo(lastMessage);
        const replyText = this.messageBuilder.buildReply(senderInfo.name);
        
        if (this.config.dryRun) {
          // Dry run - just log what would be sent
          thread.addLabel(processedLabel);
          this.senderDB.markReplied(senderInfo.email);
          
          console.log([
            `[DRY RUN] Would reply to:`,
            `  Email: ${senderInfo.email}`,
            `  Name: ${senderInfo.name || '(no name)'}`,
            `  Subject: "${lastMessage.getSubject()}"`,
            `  Reply preview: "${replyText.substring(0, 100)}..."`
          ].join('\n'));
        } else {
          // Actually send reply
          lastMessage.reply(replyText);
          thread.addLabel(processedLabel);
          this.senderDB.markReplied(senderInfo.email);
          this.stats.sent++;
          
          console.log([
            `[SENT] Reply sent to:`,
            `  Email: ${senderInfo.email}`,
            `  Name: ${senderInfo.name || '(no name)'}`,
            `  Subject: "${lastMessage.getSubject()}"`
          ].join('\n'));
          
          // Rate limiting to avoid hitting Gmail API limits
          Utilities.sleep(this.config.limits.sleepMs);
        }
      } catch (error) {
        this.stats.errors++;
        console.error(`ERROR processing thread "${thread.getFirstMessageSubject()}":`, error);
        
        // Mark with error label
        try {
          thread.addLabel(errorLabel);
        } catch (e) {
          // Ignore label error
        }
      }
    }
    
    // Save database
    this.senderDB.save();
    
    // Print summary
    this._printSummary();
  }
  
  _printSummary() {
    console.log('\n=== Processing Summary ===');
    console.log(`Threads considered: ${this.stats.considered}`);
    console.log(`Replies sent: ${this.stats.sent}`);
    console.log(`Threads skipped: ${this.stats.skipped}`);
    console.log(`Errors encountered: ${this.stats.errors}`);
    
    if (Object.keys(this.stats.skipReasons).length > 0) {
      console.log('\nSkip Reasons Breakdown:');
      // Sort by count
      const sorted = Object.entries(this.stats.skipReasons)
        .sort((a, b) => b[1] - a[1]);
      for (const [reason, count] of sorted) {
        console.log(`  ${reason}: ${count}`);
      }
    }
    
    const dbStats = this.senderDB.getStats();
    console.log('\nSender Database Status:');
    console.log(`  Total entries: ${dbStats.total}`);
    console.log(`  Active (within ${this.config.senderDB.ttlDays} days): ${dbStats.active}`);
    console.log(`  Expired: ${dbStats.expired}`);
    
    console.log('\n=== Processing Complete ===');
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

/**
 * Test function to verify the script setup
 */
function testSetup() {
  console.log('Testing Auto Reply Script Setup (Simplified Version)...\n');
  
  // Test configuration
  console.log('✓ Configuration loaded');
  console.log(`  - Dry run mode: ${CONFIG.dryRun ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  - Location: ${CONFIG.personal.location}`);
  console.log(`  - Max emails per run: ${CONFIG.limits.maxSend}`);
  
  // Test patterns
  console.log('\n✓ Patterns loaded');
  console.log(`  - Job keywords: ${PATTERNS.jobKeywords.length} keywords`);
  console.log(`  - Blocked domains: ${PATTERNS.blockedDomains.length} domains`);
  console.log(`  - Exclusion keywords: ${PATTERNS.exclusionKeywords.length} phrases`);
  
  // Test email access
  console.log('\n✓ Email access');
  try {
    const myEmail = Session.getActiveUser().getEmail();
    console.log(`  - User email: ${myEmail}`);
  } catch (e) {
    console.error('  ✗ Cannot access email:', e);
  }
  
  // Test label creation
  console.log('\n✓ Label operations');
  try {
    const testLabel = 'AutoReply-Test-Temp';
    let label = GmailApp.getUserLabelByName(testLabel);
    if (!label) {
      label = GmailApp.createLabel(testLabel);
      console.log('  - Test label created successfully');
      GmailApp.deleteLabel(label);
      console.log('  - Test label deleted successfully');
    } else {
      console.log('  - Labels working correctly');
    }
  } catch (e) {
    console.error('  ✗ Label operations failed:', e);
  }
  
  // Test message builder
  console.log('\n✓ Message Builder Test');
  const builder = new MessageBuilder(CONFIG);
  const testMessage = builder.buildReply('John');
  console.log(`  - Test message created (${testMessage.length} characters)`);
  console.log(`  - Greeting: "${testMessage.split('\n')[0]}"`);
  
  // Database check
  const db = new SenderDatabase(CONFIG);
  const stats = db.getStats();
  console.log('\n✓ Sender Database');
  console.log(`  - Current entries: ${stats.total}`);
  console.log(`  - Active entries: ${stats.active}`);
  
  console.log('\n=== Setup test complete! ===');
  console.log('Script is ready to use. Set dryRun to false to start sending emails.');
}

/**
 * Preview what the reply message looks like
 */
function previewReply() {
  const builder = new MessageBuilder(CONFIG);
  
  console.log('=== Reply Message Preview ===\n');
  console.log('With recipient name:\n');
  console.log(builder.buildReply('Sarah'));
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('Without recipient name:\n');
  console.log(builder.buildReply(null));
  
}

/**
 * Clear the sender database (use with caution)
 */
function clearSenderDatabase() {
  if (CONFIG.dryRun) {
    console.log('Cannot clear database while in dry run mode. Set dryRun to false first.');
    return;
  }
  
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(CONFIG.senderDB.key);
  console.log('Sender database cleared successfully');
}

/**
 * View sender database statistics and recent entries
 */
function viewDatabaseStats() {
  const db = new SenderDatabase(CONFIG);
  const stats = db.getStats();
  
  console.log('=== Sender Database Statistics ===');
  console.log(`Total entries: ${stats.total}`);
  console.log(`Active entries (within ${CONFIG.senderDB.ttlDays} days): ${stats.active}`);
  console.log(`Expired entries: ${stats.expired}`);
  
  // Show sample of recent entries
  const entries = Object.entries(db.data)
    .sort((a, b) => (b[1] || '').localeCompare(a[1] || ''))
    .slice(0, 10);
  
  if (entries.length > 0) {
    console.log('\n=== Most Recent Replies (up to 10) ===');
    for (const [email, timestamp] of entries) {
      const date = new Date(timestamp);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  ${email}`);
      console.log(`    Replied: ${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${daysAgo} days ago)`);
    }
  } else {
    console.log('\nNo entries in database');
  }
}

/**
 * Manual test - process a specific number of threads without sending
 */
function testProcessThreads(limit = 5) {
  const originalDryRun = CONFIG.dryRun;
  const originalMaxSend = CONFIG.limits.maxSend;
  
  // Force dry run mode and limit threads
  CONFIG.dryRun = true;
  CONFIG.limits.maxSend = limit;
  CONFIG.limits.maxThreadsToProcess = limit;
  
  console.log(`=== Test Processing ${limit} Threads (Dry Run) ===\n`);
  
  const processor = new AutoReplyProcessor();
  processor.run();
  
  // Restore original settings
  CONFIG.dryRun = originalDryRun;
  CONFIG.limits.maxSend = originalMaxSend;
  CONFIG.limits.maxThreadsToProcess = 500;
}

