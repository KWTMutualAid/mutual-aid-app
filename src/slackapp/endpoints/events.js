const { createEventAdapter } = require("@slack/events-api");
// const { openHomeWithSections } = require("~slack/home");
const onReimbursementReply = require("../event-listeners/reimbursementReply");

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

slackEvents.on("error", console.error);
// slackEvents.on("app_home_opened", async event => {
//   try {
//     openHomeWithSections(event.user, ["base"]);
//   } catch (error) {
//     console.error(`Error opening home page: ${error}`);
//     openHomeWithSections(event.user, ["base"]);
//   }
// });

onReimbursementReply.register(slackEvents);

module.exports = slackEvents.requestListener();
