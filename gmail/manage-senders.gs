/**
 * Show all entries in the sender database
 */
function showSenderDB() {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty(CONFIG.senderDB.key);
  
  if (!raw) {
    Logger.log('No sender database found.');
    return;
  }
  
  try {
    const db = JSON.parse(raw);
    const entries = Object.entries(db);
    
    Logger.log(`=== Sender Database (${entries.length} entries) ===`);
    
    // Sort by timestamp (newest first)
    entries.sort((a, b) => (b[1] || '').localeCompare(a[1] || ''));
    
    for (const [email, timestamp] of entries) {
      const date = new Date(timestamp);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      Logger.log(`${email} - ${date.toLocaleString()} (${daysAgo} days ago)`);
    }
  } catch (e) {
    Logger.log('Error parsing sender database: ' + e);
    Logger.log('Raw data: ' + raw);
  }
}

/**
 * Delete the entire sender database
 * WARNING: This will allow auto-replies to all senders again
 */
function deleteSenderDB() {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty(CONFIG.senderDB.key);
  
  if (!raw) {
    Logger.log('No sender database found. Nothing to delete.');
    return;
  }
  
  try {
    const db = JSON.parse(raw);
    const count = Object.keys(db).length;
    
    props.deleteProperty(CONFIG.senderDB.key);
    Logger.log(`=== Sender Database Deleted ===`);
    Logger.log(`Removed ${count} sender entries.`);
    Logger.log('All senders can now receive auto-replies again.');
  } catch (e) {
    // Delete even if parsing fails
    props.deleteProperty(CONFIG.senderDB.key);
    Logger.log('Sender database deleted (had parsing errors).');
  }
}
