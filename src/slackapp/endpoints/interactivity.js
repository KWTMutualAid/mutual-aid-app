const { createMessageAdapter } = require("@slack/interactive-messages");
const { assignToDelivery } = require("../flows/assignToDelivery.js");
const { completeRequest } = require("../flows/completeRequest.js");
const { unassignRequest } = require("../flows/unassignRequest.js");

const editPost = require("../flows/editPost");

const slackInteractions = createMessageAdapter(
  process.env.SLACK_SIGNING_SECRET
);

// ==================================================================
// Assign To Delivery flow
// ==================================================================

slackInteractions.action(
  {
    type: "button",
    actionId: "assign-need-to-me"
  },
  assignToDelivery
);
slackInteractions.action(
  {
    type: "button",
    actionId: "request-complete"
  },
  completeRequest
);
slackInteractions.action(
  {
    type: "button",
    actionId: "request-unassign"
  },
  unassignRequest
);

// ==== Edit Post flow ====
editPost.register(slackInteractions);

module.exports = slackInteractions.requestListener();
