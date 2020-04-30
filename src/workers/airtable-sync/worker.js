const ChangeDetector = require("airtable-change-detector");
const {
  needsTable,
  needsFields,
  needsSensitiveFields
} = require("~airtable/tables/needs");
const newNeed = require("./actions/newNeed");

const defaultInterval = 10000;

function startWorker(interval) {
  let pollInterval = interval;
  if (pollInterval < defaultInterval) {
    console.log(
      `Interval ${pollInterval} is too low. Clamping to ${defaultInterval}`
    );
    pollInterval = defaultInterval;
  }
  const sharedDetectorOptions = {
    writeDelayMs: 100
  };

  const needsChanges = new ChangeDetector(needsTable, {
    senstiveFields: needsSensitiveFields,
    ...sharedDetectorOptions
  });
  needsChanges.pollWithInterval(
    "airtable-sync.needs",
    interval,
    async recordsChanged => {
      console.info(`Found ${recordsChanged.length} changes in Requests`);
      const promises = [];
      recordsChanged.forEach(record => {
        if (record.didChange(needsFields.status)) {
          const status = record.get(needsFields.status);
          const newStatus = record.getPrior(needsFields.status);
          console.log(
            `${record.get(
              needsFields.shortId
            )} moved from ${newStatus} -> ${status}`
          );
        }
        // TODO: Think about how to rate limit this to Airtable's 5 rps
        const priorTo = record.getPrior(needsFields.directedTo) || [];
        const currentTo = record.get(needsFields.directedTo) || [];
        if (priorTo.length !== currentTo.length) {
          promises.push(newNeed(record));
        }
      });
      return Promise.all(promises);
    }
  );
}

module.exports = startWorker;
if (require.main === module) {
  startWorker(defaultInterval);
}
