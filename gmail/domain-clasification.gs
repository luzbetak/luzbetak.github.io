/**
 * Email Domain Analyzer and Auto-Labeler
 * This script analyzes your Gmail inbox to find the top 10 sender domains
 * and automatically creates labels and applies them to emails
 */

// Configuration - Renamed to avoid conflicts with other scripts
const DOMAIN_CONFIG = {
  MAX_THREADS_TO_SCAN: 500,  // Adjust based on your needs (max 500 per batch)
  TOP_DOMAINS_COUNT: 10,      // Number of top domains to track
  LABEL_PREFIX: 'Domain/',    // Prefix for domain labels
  EXCLUDE_DOMAINS: [          // Domains to exclude from labeling
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com'
  ]
};

/**
 * Main function to analyze domains and create labels
 */
function analyzeDomainAndCreateLabels() {
  try {
    Logger.log('Starting email domain analysis...');
    
    // Step 1: Get domain statistics
    const domainStats = getTopSenderDomains();
    
    if (domainStats.length === 0) {
      Logger.log('No domains found to process');
      return;
    }
    
    // Step 2: Create labels for top domains
    const labels = createLabelsForDomains(domainStats);
    
    // Step 3: Apply labels to existing emails
    applyLabelsToEmails(labels);
    
    // Step 4: Generate report
    generateDomainReport(domainStats);
    
    Logger.log('Process completed successfully!');
    
  } catch (error) {
    Logger.log('Error in main process: ' + error.toString());
    throw error;
  }
}

/**
 * Get statistics of sender domains from recent emails
 */
function getTopSenderDomains() {
  const domainCount = {};
  const domainEmails = {}; // Track email addresses for each domain
  
  try {
    // Get threads from inbox
    const threads = GmailApp.getInboxThreads(0, DOMAIN_CONFIG.MAX_THREADS_TO_SCAN);
    Logger.log(`Analyzing ${threads.length} threads...`);
    
    threads.forEach(thread => {
      const messages = thread.getMessages();
      
      messages.forEach(message => {
        // Only process received emails (not sent)
        const from = message.getFrom();
        if (from && from.length > 0) {
          const domain = extractDomain(from);
          
          if (domain && !DOMAIN_CONFIG.EXCLUDE_DOMAINS.includes(domain.toLowerCase())) {
            // Count domain occurrences
            domainCount[domain] = (domainCount[domain] || 0) + 1;
            
            // Track unique email addresses for this domain
            if (!domainEmails[domain]) {
              domainEmails[domain] = new Set();
            }
            const emailAddress = extractEmailAddress(from);
            if (emailAddress) {
              domainEmails[domain].add(emailAddress);
            }
          }
        }
      });
    });
    
    // Convert to array and sort by count
    const sortedDomains = Object.keys(domainCount)
      .map(domain => ({
        domain: domain,
        count: domainCount[domain],
        uniqueSenders: domainEmails[domain] ? domainEmails[domain].size : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, DOMAIN_CONFIG.TOP_DOMAINS_COUNT);
    
    Logger.log(`Found ${sortedDomains.length} top domains`);
    return sortedDomains;
    
  } catch (error) {
    Logger.log('Error getting domain statistics: ' + error.toString());
    throw error;
  }
}

/**
 * Extract domain from email address string
 */
function extractDomain(fromString) {
  try {
    // Extract email from string like "Name <email@domain.com>"
    const emailMatch = fromString.match(/<(.+?)>/) || fromString.match(/([^\s]+@[^\s]+)/);
    
    if (emailMatch && emailMatch[1]) {
      const email = emailMatch[1].trim();
      const parts = email.split('@');
      if (parts.length === 2) {
        return parts[1].toLowerCase().trim();
      }
    }
    return null;
  } catch (error) {
    Logger.log('Error extracting domain from: ' + fromString);
    return null;
  }
}

/**
 * Extract clean email address from sender string
 */
function extractEmailAddress(fromString) {
  try {
    const emailMatch = fromString.match(/<(.+?)>/) || fromString.match(/([^\s]+@[^\s]+)/);
    return emailMatch ? emailMatch[1].trim().toLowerCase() : null;
  } catch (error) {
    return null;
  }
}

/**
 * Create Gmail labels for domains
 */
function createLabelsForDomains(domainStats) {
  const labels = {};
  
  domainStats.forEach(stat => {
    const labelName = DOMAIN_CONFIG.LABEL_PREFIX + stat.domain;
    
    try {
      // Check if label already exists
      let label = GmailApp.getUserLabelByName(labelName);
      
      if (!label) {
        // Create new label
        label = GmailApp.createLabel(labelName);
        Logger.log(`Created label: ${labelName}`);
      } else {
        Logger.log(`Label already exists: ${labelName}`);
      }
      
      labels[stat.domain] = label;
      
    } catch (error) {
      Logger.log(`Error creating label for ${stat.domain}: ${error.toString()}`);
    }
  });
  
  return labels;
}

/**
 * Apply labels to existing emails based on sender domain
 */
function applyLabelsToEmails(domainLabels) {
  const domains = Object.keys(domainLabels);
  
  if (domains.length === 0) {
    Logger.log('No labels to apply');
    return;
  }
  
  let totalLabeled = 0;
  const batchSize = 100; // Process in smaller batches
  
  domains.forEach(domain => {
    try {
      // Search for emails from this domain
      const searchQuery = `from:@${domain}`;
      const threads = GmailApp.search(searchQuery, 0, batchSize);
      
      if (threads.length > 0) {
        const label = domainLabels[domain];
        
        // Apply label to threads in batches
        threads.forEach(thread => {
          try {
            thread.addLabel(label);
            totalLabeled++;
          } catch (error) {
            Logger.log(`Error labeling thread: ${error.toString()}`);
          }
        });
        
        Logger.log(`Applied label for ${domain} to ${threads.length} threads`);
      }
      
    } catch (error) {
      Logger.log(`Error processing domain ${domain}: ${error.toString()}`);
    }
  });
  
  Logger.log(`Total threads labeled: ${totalLabeled}`);
}

/**
 * Generate a report of domain statistics
 */
function generateDomainReport(domainStats) {
  Logger.log('\n========== DOMAIN ANALYSIS REPORT ==========');
  Logger.log(`Top ${DOMAIN_CONFIG.TOP_DOMAINS_COUNT} Email Sender Domains:\n`);
  
  domainStats.forEach((stat, index) => {
    Logger.log(`${index + 1}. ${stat.domain}`);
    Logger.log(`   - Total emails: ${stat.count}`);
    Logger.log(`   - Unique senders: ${stat.uniqueSenders}`);
    Logger.log(`   - Label: ${DOMAIN_CONFIG.LABEL_PREFIX}${stat.domain}\n`);
  });
  
  Logger.log('============================================\n');
  
  // Optional: Send email report
  if (domainStats.length > 0) {
    sendEmailReport(domainStats);
  }
}

/**
 * Send an email report of the analysis
 */
function sendEmailReport(domainStats) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    
    let htmlBody = `
      <h2>Gmail Domain Analysis Report</h2>
      <p>Analysis of your recent ${DOMAIN_CONFIG.MAX_THREADS_TO_SCAN} email threads completed.</p>
      <h3>Top ${DOMAIN_CONFIG.TOP_DOMAINS_COUNT} Sender Domains:</h3>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
        <tr style="background-color: #f0f0f0;">
          <th style="padding: 10px;">Rank</th>
          <th style="padding: 10px;">Domain</th>
          <th style="padding: 10px;">Email Count</th>
          <th style="padding: 10px;">Unique Senders</th>
          <th style="padding: 10px;">Label Created</th>
        </tr>
    `;
    
    domainStats.forEach((stat, index) => {
      const rowColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
      htmlBody += `
        <tr style="background-color: ${rowColor};">
          <td style="padding: 8px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px;"><strong>${stat.domain}</strong></td>
          <td style="padding: 8px; text-align: center;">${stat.count}</td>
          <td style="padding: 8px; text-align: center;">${stat.uniqueSenders}</td>
          <td style="padding: 8px; color: #4285f4;">${DOMAIN_CONFIG.LABEL_PREFIX}${stat.domain}</td>
        </tr>
      `;
    });
    
    htmlBody += `
      </table>
      <p style="margin-top: 20px;">
        <strong>Note:</strong> Labels have been created and applied to your emails automatically.
        You can find them in your Gmail label list.
      </p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This report was generated by the Gmail Domain Analyzer script.
      </p>
    `;
    
    GmailApp.sendEmail(
      userEmail,
      'Gmail Domain Analysis Report - ' + new Date().toLocaleDateString(),
      'Please view this email in HTML format.',
      {
        htmlBody: htmlBody,
        name: 'Gmail Domain Analyzer'
      }
    );
    
    Logger.log('Email report sent to: ' + userEmail);
    
  } catch (error) {
    Logger.log('Error sending email report: ' + error.toString());
  }
}

/**
 * Function to set up automatic processing trigger
 */
function setupDomainAutomaticProcessing() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processDomainNewEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger to run daily
  ScriptApp.newTrigger('processDomainNewEmails')
    .timeBased()
    .everyDays(1)
    .atHour(2) // Run at 2 AM
    .create();
  
  Logger.log('Automatic domain processing trigger set up successfully');
}

/**
 * Process only new emails since last run
 */
function processDomainNewEmails() {
  const userProperties = PropertiesService.getUserProperties();
  const lastProcessed = userProperties.getProperty('DOMAIN_LAST_PROCESSED_DATE');
  
  let searchQuery = 'is:unread';
  if (lastProcessed) {
    searchQuery = `after:${lastProcessed}`;
  }
  
  try {
    const threads = GmailApp.search(searchQuery, 0, 100);
    Logger.log(`Processing ${threads.length} new threads`);
    
    // Get existing labels
    const existingLabels = {};
    const allLabels = GmailApp.getUserLabels();
    
    allLabels.forEach(label => {
      const name = label.getName();
      if (name.startsWith(DOMAIN_CONFIG.LABEL_PREFIX)) {
        const domain = name.substring(DOMAIN_CONFIG.LABEL_PREFIX.length);
        existingLabels[domain] = label;
      }
    });
    
    // Process new threads
    threads.forEach(thread => {
      const messages = thread.getMessages();
      
      messages.forEach(message => {
        const from = message.getFrom();
        if (from) {
          const domain = extractDomain(from);
          
          if (domain && existingLabels[domain]) {
            thread.addLabel(existingLabels[domain]);
            Logger.log(`Applied label for ${domain} to new email`);
          }
        }
      });
    });
    
    // Update last processed date
    const now = new Date();
    const dateString = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd');
    userProperties.setProperty('DOMAIN_LAST_PROCESSED_DATE', dateString);
    
  } catch (error) {
    Logger.log('Error processing new emails: ' + error.toString());
  }
}

/**
 * Remove all domain labels (cleanup function)
 */
function removeAllDomainLabels() {
  const labels = GmailApp.getUserLabels();
  let removedCount = 0;
  
  labels.forEach(label => {
    if (label.getName().startsWith(DOMAIN_CONFIG.LABEL_PREFIX)) {
      try {
        label.deleteLabel();
        removedCount++;
        Logger.log(`Removed label: ${label.getName()}`);
      } catch (error) {
        Logger.log(`Error removing label ${label.getName()}: ${error.toString()}`);
      }
    }
  });
  
  Logger.log(`Total labels removed: ${removedCount}`);
}

/**
 * Get current domain statistics without creating labels
 */
function getDomainStatisticsOnly() {
  const stats = getTopSenderDomains();
  generateDomainReport(stats);
  return stats;
}
