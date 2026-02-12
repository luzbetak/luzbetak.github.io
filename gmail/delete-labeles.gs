function deleteLabelsExcept00VIP() {
  // Get all user-created labels
  var labels = GmailApp.getUserLabels();
  
  // Labels to keep (add more if needed)
  var keepLabels = ['00 VIP'];
  
  var deletedCount = 0;
  var skippedCount = 0;
  
  for (var i = 0; i < labels.length; i++) {
    var labelName = labels[i].getName();
    
    // Check if this label should be kept
    if (keepLabels.indexOf(labelName) === -1) {
      try {
        labels[i].deleteLabel();
        Logger.log('Deleted: ' + labelName);
        deletedCount++;
      } catch (e) {
        Logger.log('Error deleting ' + labelName + ': ' + e.message);
      }
    } else {
      Logger.log('Kept: ' + labelName);
      skippedCount++;
    }
  }
  
  Logger.log('-------------------');
  Logger.log('Total deleted: ' + deletedCount);
  Logger.log('Total kept: ' + skippedCount);
}

// Optional: Preview what will be deleted without actually deleting
function previewLabelsToDelete() {
  var labels = GmailApp.getUserLabels();
  var keepLabels = ['00 VIP'];
  
  Logger.log('Labels that WILL BE DELETED:');
  Logger.log('-------------------');
  
  for (var i = 0; i < labels.length; i++) {
    var labelName = labels[i].getName();
    
    if (keepLabels.indexOf(labelName) === -1) {
      Logger.log('  - ' + labelName);
    }
  }
  
  Logger.log('-------------------');
  Logger.log('Labels that WILL BE KEPT:');
  Logger.log('-------------------');
  
  for (var i = 0; i < labels.length; i++) {
    var labelName = labels[i].getName();
    
    if (keepLabels.indexOf(labelName) !== -1) {
      Logger.log('  - ' + labelName);
    }
  }
}
