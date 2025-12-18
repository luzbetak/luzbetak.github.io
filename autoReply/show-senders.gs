function showSenderDB() {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty(SENDER_DB_KEY);
  if (!raw) {
    Logger.log('No sender database found.');
    return;
  }
  const db = JSON.parse(raw);
  Logger.log(JSON.stringify(db, null, 2));
}

