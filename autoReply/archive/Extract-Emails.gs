// Script: search Gmail and extract email addresses into a Sheet
function extractEmailsFromGmailSearch() {
  var query = 'Torrance'; // <-- change your search query here
  var sheetName = 'Gmail Email Extract';
  var ss = SpreadsheetApp.create(sheetName);
  var sheet = ss.getActiveSheet();
  sheet.appendRow(['Email','Occurrences','Sample Subject']);

  var threads = GmailApp.search(query, 0, 500); // adjust max results as needed
  var addrCounts = {};
  var sampleSubjects = {};

  for (var i = 0; i < threads.length; i++) {
    var msgs = threads[i].getMessages();
    for (var j = 0; j < msgs.length; j++) {
      var msg = msgs[j];
      // gather addresses from From, To, Cc
      var headers = [msg.getFrom(), msg.getTo(), msg.getCc()];
      for (var k = 0; k < headers.length; k++) {
        var h = headers[k];
        if (!h) continue;
        // extract emails via regex
        var re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
        var matches = h.match(re);
        if (matches) {
          matches.forEach(function(email) {
            email = email.trim().toLowerCase();
            addrCounts[email] = (addrCounts[email] || 0) + 1;
            // store one example subject per email
            if (!sampleSubjects[email]) sampleSubjects[email] = msg.getSubject();
          });
        }
      }
    }
  }

  // convert to array and sort by count desc
  var rows = [];
  for (var e in addrCounts) rows.push([e, addrCounts[e], sampleSubjects[e] || '']);
  rows.sort(function(a,b){return b[1]-a[1];});
  // append rows to sheet
  if (rows.length) sheet.getRange(2,1,rows.length,3).setValues(rows);
  Logger.log('Done. Sheet URL: ' + ss.getUrl());
}


