/**
 * Google Auto Reply Email Script (Improved)
 * Version: 2.1.0 — 2024-11-26
 *
 * Improvements:
 * - Added global control for compensation requirements inclusion
 * - Eliminated duplicate message content
 * - Better code organization with classes
 * - Enhanced error handling and logging
 * - More maintainable configuration
 * - Performance optimizations
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
    key: 'AutoReply_SendOnceBySender_v2',
    maxEntries: 5000,
    ttlDays: 7
  },
  
  // Testing mode
  dryRun: false,
  
  // COMPENSATION CONTROL - Set this to false to exclude compensation from replies
  includeCompensation: false,  // true = include compensation, false = exclude compensation
  
  // Personal information
  personal: {
    signature: [
      'Thanks,',
      'Kevin Luzbetak',
      'Phone  : (818) 288-7357',
      'Resume : https://kevinluzbetak.com/resume.pdf'
    ].join('\n'),
    compensation: {
      contract: '$70+/hour (W-2 contract or hire)',
      fulltime: '$145,000+ base (full-time)'
    },
    location: 'Los Angeles, California'
  }
};

// ==============================
// KEYWORDS AND PATTERNS
// ==============================
const PATTERNS = {
  // Job-related keywords
  jobKeywords: [
    'Airflow', 'Analytics', 'AWS', 'Azure', 'Candidate',
    'Career', 'Catalog', 'Cloud', 'Collaboration',
    'Contract', 'DAG', 'Databricks', 'Delta',
    'Engineer', 'ETL', 'GCP', 'Governance', 'Integration',
    'Job', 'Kafka', 'Machine', 'Modeling', 'Opportunity',
    'Pipeline', 'Position', 'PySpark', 'Python',
    'Redshift', 'Requirement', 'Role', 'Scientist', 'Skill',
    'Snowflake', 'SQL', 'Urgent'
  ],
  
  // Blocked domains (job boards/engines to never reply to)
  blockedDomains: [
    'indeed.com', 'match.indeed.com', 'linkedin.com',
    'jobdivamail.com', 'bybit.com'
  ],
  
  // City groups for location-based responses
  cityGroups: {
    LOCAL: [
      'Agoura', 'Calabasas', 'Thousand Oaks', 
      'Santa Monica', 'Burbank', 'Glendale', 'Moorpark'
    ],
    HYBRID: [
      'Torrance', 'Irvine', 'Santa Barbara', 'San Diego',
      'Pasadena', 'Culver City'
    ],
    REMOTE: [
      'Remote', 'Boston', 'Chicago', 'Dallas', 'Florida',
      'Francisco', 'Irving', 'Pittsburgh', 'McLean',
      'Indianapolis', 'Kentucky', 'Louisville', 'New York',
      'Oregon', 'Philadelphia', 'Portland', 'Redwood',
      'Houston', 'Richland', 'Seattle', 'Sunnyvale',
      'Texas', 'Raleigh', 'Phoenix', 'Mountain View'
    ]
  }
};

// ==============================
// MESSAGE TEMPLATES
// ==============================
class MessageBuilder {
  constructor(config) {
    this.config = config;
    
    // Core qualifications - shared across all messages
    this.coreQualifications = [
      'Yes, I am interested. I hold Master\'s degree in Computer Science, with a focus on Artificial Intelligence and Machine Learning.',
      'I bring 25+ years of experience as a Software Engineer and Data Engineer, with deep expertise in large-scale systems, data processing, and advanced programming.',
      `I'm based in ${config.personal.location}.`
    ].join(' ');
    
    // Compensation requirements - only used if includeCompensation is true
    this.compensationRequirements = config.includeCompensation 
      ? `My compensation requirements are ${config.personal.compensation.contract} or ${config.personal.compensation.fulltime}.`
      : null;
  }
  
  _buildGreeting(senderName) {
    return senderName ? `Hi ${senderName},` : 'Hi,';
  }
  
  _buildMessage(senderName, locationDetails, requestDetails) {
    const messageParts = [
      this._buildGreeting(senderName),
      '',
      `${this.coreQualifications} ${locationDetails}`,
      ''
    ];
    
    // Only add compensation if enabled
    if (this.compensationRequirements) {
      messageParts.push(this.compensationRequirements);
    }
    
    messageParts.push(requestDetails);
    messageParts.push('');
    messageParts.push(this.config.personal.signature);
    
    return messageParts.join('\n');
  }
  
  buildLocalReply(city, senderName) {
    const locationDetails = `For roles in or near ${city || 'the listed city'}, I can support on-site or remote as the client prefers.`;
    const requestDetails = this.config.includeCompensation
      ? 'Please share the job ID, client, location, and confirm salary in your reply.'
      : 'Please share the job ID, client, and location in your reply.';
    return this._buildMessage(senderName, locationDetails, requestDetails);
  }
  
  buildHybridReply(city, senderName) {
    const c = city || 'the listed city';
    const locationDetails = `Due to commute time, I can be on-site in ${c} one day per week and work remotely the remaining four days.`;
    const requestDetails = this.config.includeCompensation
      ? 'Please share the job ID, client, location, confirm salary and the one-day-onsite hybrid setup in your reply.'
      : 'Please share the job ID, client, location, and confirm the one-day-onsite hybrid setup in your reply.';
    return this._buildMessage(senderName, locationDetails, requestDetails);
  }
  
  buildRemoteReply(senderName) {
    const locationDetails = `I'm open to fully remote work.`;
    const requestDetails = this.config.includeCompensation
      ? 'If this position is fully remote, please share the job ID, client, and confirm salary in your reply.'
      : 'If this position is fully remote, please share the job ID and client in your reply.';
    return this._buildMessage(senderName, locationDetails, requestDetails);
  }
  
  buildDefaultReply(senderName) {
    const locationDetails = `I'm open to fully remote work.`;
    const requestDetails = this.config.includeCompensation
      ? 'Please include the job ID, client, location, and confirm salary in your reply.'
      : 'Please include the job ID, client, and location in your reply.';
    return this._buildMessage(senderName, locationDetails, requestDetails);
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
    
    // Compile city group regexes
    this.cityGroupRegexes = {};
    for (const [group, cities] of Object.entries(this.patterns.cityGroups)) {
      this.cityGroupRegexes[group] = new RegExp(
        cities
          .map(c => `\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
          .join('|'),
        'i'
      );
    }
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
    if (/(noreply|no-reply|donotreply)/i.test(fromStr)) {
      return true;
    }
    
    // Check headers for automated/list mail
    try {
      const autoSubmitted = message.getHeader?.('Auto-Submitted') || '';
      const precedence = message.getHeader?.('Precedence') || '';
      const listId = message.getHeader?.('List-Id') || '';
      
      if ((autoSubmitted && autoSubmitted.toLowerCase() !== 'no') ||
          /bulk|list|junk/i.test(precedence) ||
          (listId && listId.length > 0)) {
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
    
    // Try to get from ReplyTo if needed
    if (!displayName) {
      try {
        const replyTo = message.getReplyTo?.() || '';
        const rtMatch = replyTo.match(/^(?:"?([^"]+)"?\s*)?<([^>]+)>$/);
        if (rtMatch) {
          displayName = displayName || (rtMatch[1] || '').trim();
          email = email || (rtMatch[2] || '').trim();
        }
      } catch (e) {
        // Ignore error
      }
    }
    
    // Clean up display name
    displayName = displayName
      .replace(/\s*\([^)]*\)\s*$/g, '') // Remove parenthetical suffixes
      .replace(/\s+/g, ' ')
      .trim();
    
    // Generate display name from email if needed
    if (!displayName && email) {
      const localPart = email.split('@')[0] || '';
      const parts = localPart.split(/[._\-+]/).filter(Boolean);
      if (parts.length) {
        displayName = parts
          .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
          .join(' ');
      }
    }
    
    // Validate display name
    if (displayName) {
      // Truncate if too long
      if (displayName.length > 40) {
        displayName = displayName.slice(0, 40).trim();
      }
      // Filter out generic names and emails
      if (/@/.test(displayName) || 
          /^(team|recruiting|recruitment|talent|hr|careers?)$/i.test(displayName)) {
        displayName = null;
      }
    }
    
    return {
      name: displayName || null,
      email: (email || '').toLowerCase().trim()
    };
  }
  
  isJobRelated(content) {
    return this.jobKeywordsRegex.test(content);
  }
  
  classifyLocation(content) {
    for (const [group, regex] of Object.entries(this.cityGroupRegexes)) {
      const match = regex.exec(content);
      if (match) {
        const city = (group === 'REMOTE' && /^remote$/i.test(match[0])) 
          ? null 
          : match[0];
        return { group, city };
      }
    }
    return { group: null, city: null };
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
    
    // Sort by timestamp (newest first) and trim to max size
    const entries = Object.entries(this.data)
      .sort((a, b) => (b[1] || '').localeCompare(a[1] || ''));
    
    if (entries.length > this.config.senderDB.maxEntries) {
      const trimmed = entries.slice(0, this.config.senderDB.maxEntries);
      this.data = Object.fromEntries(trimmed);
    }
    
    props.setProperty(this.config.senderDB.key, JSON.stringify(this.data));
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
    
    // Skip if ANY message in thread is from me
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
    
    // Check content
    const content = this.emailProcessor.extractContent(
      lastMessage, 
      this.config.limits.scanBodyChars
    );
    
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
  
  _generateReply(message) {
    const content = this.emailProcessor.extractContent(
      message, 
      this.config.limits.scanBodyChars
    );
    const senderInfo = this.emailProcessor.extractSenderInfo(message);
    const location = this.emailProcessor.classifyLocation(content);
    
    let replyText;
    
    switch (location.group) {
      case 'LOCAL':
        replyText = this.messageBuilder.buildLocalReply(location.city, senderInfo.name);
        break;
      case 'HYBRID':
        replyText = this.messageBuilder.buildHybridReply(location.city, senderInfo.name);
        break;
      case 'REMOTE':
        replyText = this.messageBuilder.buildRemoteReply(senderInfo.name);
        break;
      default:
        replyText = this.messageBuilder.buildDefaultReply(senderInfo.name);
    }
    
    return {
      text: replyText,
      senderInfo,
      location
    };
  }
  
  run() {
    console.log('=== Starting Auto Reply Processor ===');
    console.log(`Configuration: DRY_RUN=${this.config.dryRun}, MAX_SEND=${this.config.limits.maxSend}`);
    console.log(`Compensation included: ${this.config.includeCompensation ? 'YES' : 'NO'}`);
    
    // Get labels
    const processedLabel = this._getOrCreateLabel(this.config.labels.processed);
    const errorLabel = this._getOrCreateLabel(this.config.labels.error);
    
    // Build query
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
      
      // Generate reply
      const messages = thread.getMessages();
      const lastMessage = messages[messages.length - 1];
      
      try {
        const reply = this._generateReply(lastMessage);
        
        if (this.config.dryRun) {
          // Dry run - just log and mark
          thread.addLabel(processedLabel);
          this.senderDB.markReplied(reply.senderInfo.email);
          
          console.log([
            `[DRY RUN] Would reply`,
            `  Location: ${reply.location.group || 'DEFAULT'}${reply.location.city ? `/${reply.location.city}` : ''}`,
            `  To: ${reply.senderInfo.email}`,
            `  Name: ${reply.senderInfo.name || '(none)'}`,
            `  Subject: "${lastMessage.getSubject()}"`
          ].join('\n'));
        } else {
          // Actually send reply
          lastMessage.reply(reply.text);
          thread.addLabel(processedLabel);
          this.senderDB.markReplied(reply.senderInfo.email);
          this.stats.sent++;
          
          console.log([
            `[SENT] Reply sent`,
            `  Location: ${reply.location.group || 'DEFAULT'}${reply.location.city ? `/${reply.location.city}` : ''}`,
            `  To: ${reply.senderInfo.email}`,
            `  Name: ${reply.senderInfo.name || '(none)'}`,
            `  Subject: "${lastMessage.getSubject()}"`
          ].join('\n'));
          
          // Rate limiting
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
    console.log(`Considered: ${this.stats.considered}`);
    console.log(`Sent: ${this.stats.sent}`);
    console.log(`Skipped: ${this.stats.skipped}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Compensation included: ${this.config.includeCompensation ? 'YES' : 'NO'}`);
    
    if (Object.keys(this.stats.skipReasons).length > 0) {
      console.log('\nSkip Reasons:');
      for (const [reason, count] of Object.entries(this.stats.skipReasons)) {
        console.log(`  ${reason}: ${count}`);
      }
    }
    
    const dbStats = this.senderDB.getStats();
    console.log('\nSender Database:');
    console.log(`  Total entries: ${dbStats.total}`);
    console.log(`  Active (within TTL): ${dbStats.active}`);
    console.log(`  Expired: ${dbStats.expired}`);
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
  console.log('Testing Auto Reply Script Setup...');
  
  // Test configuration
  console.log('Configuration loaded:', CONFIG ? 'YES' : 'NO');
  console.log('Dry run mode:', CONFIG.dryRun ? 'ENABLED' : 'DISABLED');
  console.log('Include compensation:', CONFIG.includeCompensation ? 'YES' : 'NO');
  
  // Test patterns
  console.log('Job keywords count:', PATTERNS.jobKeywords.length);
  console.log('Blocked domains:', PATTERNS.blockedDomains.join(', '));
  
  // Test email access
  try {
    const myEmail = Session.getActiveUser().getEmail();
    console.log('User email:', myEmail);
  } catch (e) {
    console.error('Cannot access email:', e);
  }
  
  // Test label creation
  try {
    const testLabel = 'AutoReply-Test';
    let label = GmailApp.getUserLabelByName(testLabel);
    if (!label) {
      label = GmailApp.createLabel(testLabel);
      console.log('Test label created successfully');
      GmailApp.deleteLabel(label);
      console.log('Test label deleted successfully');
    } else {
      console.log('Labels working correctly');
    }
  } catch (e) {
    console.error('Label operations failed:', e);
  }
  
  // Test message builder with compensation on/off
  console.log('\n=== Testing Message Builder ===');
  const testConfig = { ...CONFIG };
  
  // Test with compensation ON
  testConfig.includeCompensation = true;
  let builder = new MessageBuilder(testConfig);
  console.log('With compensation ON - includes salary:', builder.compensationRequirements !== null);
  
  // Test with compensation OFF
  testConfig.includeCompensation = false;
  builder = new MessageBuilder(testConfig);
  console.log('With compensation OFF - includes salary:', builder.compensationRequirements !== null);
  
  console.log('Setup test complete!');
}

/**
 * Clear the sender database (use with caution)
 */
function clearSenderDatabase() {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(CONFIG.senderDB.key);
  console.log('Sender database cleared');
}

/**
 * View sender database statistics
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
    console.log('\nMost recent replies:');
    for (const [email, timestamp] of entries) {
      const date = new Date(timestamp);
      console.log(`  ${email}: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    }
  }
}