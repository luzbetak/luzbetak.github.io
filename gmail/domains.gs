/**
 * Email Domain Analyzer, Auto-Labeler, and Inbox Organizer
 * This script analyzes your Gmail inbox to find the top 10 sender domains,
 * creates labels, and moves emails out of inbox into their domain folders
 */

// Configuration - Renamed to avoid conflicts with other scripts
const DOMAIN_CONFIG = {
  MAX_THREADS_TO_SCAN: 500,   // Adjust based on your needs (max 500 per batch)
  TOP_DOMAINS_COUNT: 100,     // Number of top domains to track
  LABEL_PREFIX: 'J/',         // Prefix for domain labels
  MOVE_FROM_INBOX: true,      // Set to true to remove emails from inbox after labeling
  EXCLUDE_DOMAINS: [          // Domains to exclude from labeling
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com'
  ]
};

/**
 * Main function to analyze domains, create labels, and organize inbox
 */
function analyzeDomainAndCreateLabels() {
  try {
    Logger.log('Starting email domain analysis and inbox organization...');
    
    // Step 1: Get domain statistics
    const domainStats = getTopSenderDomains();
    
    if (domainStats.length === 0) {
      Logger.log('No domains found to process');
      return;
    }
    
    // Step 2: Create labels for top domains
    const labels = createLabelsForDomains(domainStats);
    
    // Step 3: Apply labels and move emails out of inbox
    const result = applyLabelsAndOrganize(labels);
    
    // Step 4: Generate report with move statistics
    generateDomainReport(domainStats, result);
    
    Logger.log('Process completed successfully!');
    Logger.log(`Moved ${result.totalMoved} emails out of inbox`);
    
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
    // Get threads from inbox only (not archived)
    const threads = GmailApp.getInboxThreads(0, DOMAIN_CONFIG.MAX_THREADS_TO_SCAN);
    Logger.log(`Analyzing ${threads.length} inbox threads...`);
    
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
 * Apply labels to emails and optionally move them out of inbox
 */
function applyLabelsAndOrganize(domainLabels) {
  const domains = Object.keys(domainLabels);
  const result = {
    totalLabeled: 0,
    totalMoved: 0,
    domainCounts: {}
  };
  
  if (domains.length === 0) {
    Logger.log('No labels to apply');
    return result;
  }
  
  const batchSize = 50; // Smaller batch for better performance when moving
  
  domains.forEach(domain => {
    try {
      // Search for emails from this domain that are in inbox
      const searchQuery = `from:@${domain} in:inbox`;
      let start = 0;
      let threads;
      let domainMoveCount = 0;
      
      // Process all matching threads in batches
      do {
        threads = GmailApp.search(searchQuery, start, batchSize);
        
        if (threads.length > 0) {
          const label = domainLabels[domain];
          
          // Apply label to threads and optionally archive
          threads.forEach(thread => {
            try {
              // Add the domain label
              thread.addLabel(label);
              result.totalLabeled++;
              
              // Move out of inbox if configured
              if (DOMAIN_CONFIG.MOVE_FROM_INBOX) {
                thread.moveToArchive(); // This removes from inbox but keeps in All Mail
                result.totalMoved++;
                domainMoveCount++;
              }
            } catch (error) {
              Logger.log(`Error processing thread: ${error.toString()}`);
            }
          });
          
          Logger.log(`Processed batch of ${threads.length} threads for ${domain}`);
        }
        
        start += batchSize;
      } while (threads.length === batchSize); // Continue if we got a full batch
      
      result.domainCounts[domain] = domainMoveCount;
      Logger.log(`${domain}: Labeled and moved ${domainMoveCount} threads out of inbox`);
      
    } catch (error) {
      Logger.log(`Error processing domain ${domain}: ${error.toString()}`);
    }
  });
  
  return result;
}

/**
 * Generate a report of domain statistics
 */
function generateDomainReport(domainStats, moveResult) {
  Logger.log('\n========== DOMAIN ANALYSIS AND ORGANIZATION REPORT ==========');
  Logger.log(`Top ${DOMAIN_CONFIG.TOP_DOMAINS_COUNT} Email Sender Domains:\n`);
  
  domainStats.forEach((stat, index) => {
    const movedCount = moveResult.domainCounts[stat.domain] || 0;
    Logger.log(`${index + 1}. ${stat.domain}`);
    Logger.log(`   - Total emails found: ${stat.count}`);
    Logger.log(`   - Unique senders: ${stat.uniqueSenders}`);
    Logger.log(`   - Label: ${DOMAIN_CONFIG.LABEL_PREFIX}${stat.domain}`);
    Logger.log(`   - Moved from inbox: ${movedCount}\n`);
  });
  
  Logger.log(`TOTAL EMAILS ORGANIZED: ${moveResult.totalMoved}`);
  Logger.log('=============================================================\n');
  
  // Send email report
  if (domainStats.length > 0) {
    sendEmailReport(domainStats, moveResult);
  }
}

/**
 * Send an email report of the analysis and organization
 */
function sendEmailReport(domainStats, moveResult) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const totalMoved = moveResult.totalMoved || 0;
    
    let htmlBody = `
      <h2>Gmail Domain Analysis & Inbox Organization Report</h2>
      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 16px;">
          ✅ <strong>Successfully organized your inbox!</strong><br>
          📧 Moved <strong>${totalMoved} emails</strong> from inbox to their domain folders<br>
          🏷️ Analyzed <strong>${DOMAIN_CONFIG.MAX_THREADS_TO_SCAN}</strong> email threads
        </p>
      </div>
      
      <h3>Top ${DOMAIN_CONFIG.TOP_DOMAINS_COUNT} Sender Domains:</h3>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 800px;">
        <tr style="background-color: #4285f4; color: white;">
          <th style="padding: 10px;">Rank</th>
          <th style="padding: 10px;">Domain</th>
          <th style="padding: 10px;">Total Emails</th>
          <th style="padding: 10px;">Unique Senders</th>
          <th style="padding: 10px;">Moved from Inbox</th>
          <th style="padding: 10px;">Label Created</th>
        </tr>
    `;
    
    domainStats.forEach((stat, index) => {
      const movedCount = moveResult.domainCounts[stat.domain] || 0;
      const rowColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
      htmlBody += `
        <tr style="background-color: ${rowColor};">
          <td style="padding: 8px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px;"><strong>${stat.domain}</strong></td>
          <td style="padding: 8px; text-align: center;">${stat.count}</td>
          <td style="padding: 8px; text-align: center;">${stat.uniqueSenders}</td>
          <td style="padding: 8px; text-align: center; color: #4caf50; font-weight: bold;">${movedCount}</td>
          <td style="padding: 8px; color: #4285f4;">${DOMAIN_CONFIG.LABEL_PREFIX}${stat.domain}</td>
        </tr>
      `;
    });
    
    htmlBody += `
      </table>
      
      <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #4285f4;">
        <h4 style="margin-top: 0;">What happened to your emails?</h4>
        <ul style="line-height: 1.8;">
          <li>Emails have been <strong>moved out of your inbox</strong> to reduce clutter</li>
          <li>They are now organized under their respective <strong>domain labels</strong></li>
          <li>You can find them by clicking on the domain labels in your Gmail sidebar</li>
          <li>All emails are still searchable and accessible in "All Mail"</li>
          <li>New emails from these domains will be automatically organized going forward (if you set up the trigger)</li>
        </ul>
      </div>
      
      <div style="margin-top: 20px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px;">
        <strong>💡 Tip:</strong> To automatically organize future emails, run the <code>setupDomainAutomaticProcessing()</code> function to set up daily processing.
      </div>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This report was generated by the Gmail Domain Organizer script on ${new Date().toLocaleString()}.
      </p>
    `;
    
    GmailApp.sendEmail(
      userEmail,
      `✅ Inbox Organized - ${totalMoved} Emails Moved - ${new Date().toLocaleDateString()}`,
      'Please view this email in HTML format.',
      {
        htmlBody: htmlBody,
        name: 'Gmail Domain Organizer'
      }
    );
    
    Logger.log('Email report sent to: ' + userEmail);
    
  } catch (error) {
    Logger.log('Error sending email report: ' + error.toString());
  }
}

/**
 * Function to set up automatic processing trigger for new emails
 */
function setupDomainAutomaticProcessing() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processDomainNewEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger to run every hour
  ScriptApp.newTrigger('processDomainNewEmails')
    .timeBased()
    .everyHours(1) // Run hourly to keep inbox clean
    .create();
  
  Logger.log('Automatic domain processing trigger set up successfully (runs hourly)');
}

/**
 * Process only new emails since last run
 */
function processDomainNewEmails() {
  const userProperties = PropertiesService.getUserProperties();
  const lastProcessed = userProperties.getProperty('DOMAIN_LAST_PROCESSED_DATE');
  
  let searchQuery = 'in:inbox';
  if (lastProcessed) {
    searchQuery = `in:inbox after:${lastProcessed}`;
  }
  
  try {
    const threads = GmailApp.search(searchQuery, 0, 100);
    Logger.log(`Processing ${threads.length} new inbox threads`);
    
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
    
    let movedCount = 0;
    
    // Process new threads
    threads.forEach(thread => {
      const messages = thread.getMessages();
      
      messages.forEach(message => {
        const from = message.getFrom();
        if (from) {
          const domain = extractDomain(from);
          
          if (domain && existingLabels[domain]) {
            thread.addLabel(existingLabels[domain]);
            
            // Move out of inbox
            if (DOMAIN_CONFIG.MOVE_FROM_INBOX) {
              thread.moveToArchive();
              movedCount++;
            }
            
            Logger.log(`Processed email from ${domain}`);
          }
        }
      });
    });
    
    // Update last processed date
    const now = new Date();
    const dateString = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
    userProperties.setProperty('DOMAIN_LAST_PROCESSED_DATE', dateString);
    
    if (movedCount > 0) {
      Logger.log(`Moved ${movedCount} new emails out of inbox`);
    }
    
  } catch (error) {
    Logger.log('Error processing new emails: ' + error.toString());
  }
}

/**
 * Function to move only existing labeled emails out of inbox (without creating new labels)
 */
function moveExistingLabeledEmailsFromInbox() {
  try {
    const allLabels = GmailApp.getUserLabels();
    let totalMoved = 0;
    
    allLabels.forEach(label => {
      const name = label.getName();
      if (name.startsWith(DOMAIN_CONFIG.LABEL_PREFIX)) {
        // Search for emails with this label that are still in inbox
        const searchQuery = `label:"${name}" in:inbox`;
        const threads = GmailApp.search(searchQuery, 0, 100);
        
        if (threads.length > 0) {
          threads.forEach(thread => {
            thread.moveToArchive();
            totalMoved++;
          });
          
          Logger.log(`Moved ${threads.length} threads with label ${name} out of inbox`);
        }
      }
    });
    
    Logger.log(`Total threads moved out of inbox: ${totalMoved}`);
    return totalMoved;
    
  } catch (error) {
    Logger.log('Error moving labeled emails: ' + error.toString());
    throw error;
  }
}

/**
 * Get current domain statistics without creating labels or moving emails
 */
function getDomainStatisticsOnly() {
  const stats = getTopSenderDomains();
  Logger.log('\n========== DOMAIN STATISTICS (Preview Mode) ==========');
  stats.forEach((stat, index) => {
    Logger.log(`${index + 1}. ${stat.domain}: ${stat.count} emails from ${stat.uniqueSenders} senders`);
  });
  Logger.log('======================================================\n');
  return stats;
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
