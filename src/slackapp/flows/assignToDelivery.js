const slackapi = require("~slack/webApi");
const {
  sendThreadPostFactory,
  sendEphemeralPostFactory
} = require("~slack/channels");
const {
  updateNeedByShortId,
  findNeedByShortId,
  needsFields
} = require("~airtable/tables/needs");
const { REQUESTS_CHANNEL } = require("~slack/constants");
const { str } = require("~strings/i18nextWrappers");

exports.assignToDelivery = async payload => {
  const slackThreadId = payload.container.message_ts;
  const slackChannelId = payload.container.channel_id;
  const slackUserId = payload.user.id;
  const slackUsername = payload.user.name;
  const id = payload.actions[0].value;
  console.log(`Assign delivery: ${id}`);
  const sendThreadPost = sendThreadPostFactory(slackChannelId, slackThreadId);
  const sendEphemeralPost = sendEphemeralPostFactory(
    slackChannelId,
    slackUserId,
    slackThreadId
  );
  try {
    const [need, _err] = await findNeedByShortId(id);
    if (!need) {
      sendEphemeralPost(
        `It looks like this request could have been deleted (id: ${id}) :/`
      );
      return {};
    }

    if (need.get(needsFields.volunteer)) {
      sendEphemeralPost(
        "Someone tried to accept request, but it is already assigned!"
      );
      return {};
    }

    const [_updated, uerr] = await updateNeedByShortId(id, {
      [needsFields.status]: needsFields.status_options.inProgress,
      [needsFields.delivererSlackId]: slackUserId,
      [needsFields.volunteer]: slackUsername
    });
    if (uerr) {
      throw new Error(uerr);
    }

    await sendDirectMessage(need, slackUserId, id);
    await sendThreadPost(
      `<@${slackUserId}> you're on! You'll get a DM soon with details :slightly_smiling_face:`
    );
    await updateNeedPost(payload.message, slackThreadId, slackChannelId, id);
  } catch (error) {
    console.log(`Assign delivery error for ${id}: ${error}`);
    sendEphemeralPost(
      "There was an error assigning to delivery :( Please try again!"
    );
  }
  return {};
};

const sendDirectMessage = async (need, delivererSlackId, id) => {
  const dmResponse = await slackapi.conversations.open({
    token: process.env.SLACK_BOT_TOKEN,
    users: `${delivererSlackId}`
  });
  const dmMessageId = dmResponse.channel.id;
  const dmLines = [
    `*${need.get(needsFields.fullId)}*\n\n`,
    `*Name:* ${need.get(needsFields.name) || str("common:notAvailable")}`,
    `*Phone:* ${need.get(needsFields.phone) || str("common:notAvailable")}`,
    `*Email:* ${need.get(needsFields.email) || str("common:notAvailable")}`,
    `*Contact by:* ${multiSelectJoin(need.get(needsFields.communicationPref))}`,
    `*Language(s):* ${multiSelectJoin(need.get(needsFields.languages))}`,
    `*Address:* ${need.get(needsFields.address) ||
      str("common:notAvailable")}\n\n`,
    `*Urgency:* ${need.get(needsFields.timeSensitivity) ||
      str("common:notAvailable")}`,
    `*Economic Ability:* ${need.get(needsFields.payment) ||
      str("common:notAvailable")}`,
    `*Group(s):* ${multiSelectJoin(need.get(needsFields.hardHitCommunity))}`,
    `*Household Size:* ${need.get(needsFields.householdSize) ||
      str("common:notAvailable")}\n\n`,
    `*Request(s):* ${multiSelectJoin(need.get(needsFields.supportType))}`,
    `*Other Request:* ${need.get(needsFields.otherSupport) ||
      str("common:notAvailable")}`,
    `*Notes:* ${need.get(needsFields.otherNotes) || str("common:notAvailable")}`
  ];

  await slackapi.chat.postMessage({
    channel: dmMessageId,
    text: "Delivery accepted!",
    blocks: [
      // Message text should always be first block
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: dmLines.join("\n")
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "_*Note:* Mark this request as completed after you're done._"
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "I can no longer complete this request"
            },
            action_id: "request-unassign",
            value: String(id),
            style: "danger",
            confirm: {
              title: {
                type: "plain_text",
                text: "I can no longer complete this request"
              },
              text: {
                type: "mrkdwn",
                text: "No worries :) The bot can handle reposting everything"
              },
              confirm: {
                type: "plain_text",
                text: "Unassign Request"
              }
            }
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "The request has been completed"
            },
            action_id: "request-complete",
            value: String(id),
            style: "primary",
            confirm: {
              title: {
                type: "plain_text",
                text: "Complete Request :)"
              },
              text: {
                type: "mrkdwn",
                text: "Have the needs been met by you or another group?"
              },
              confirm: {
                type: "plain_text",
                text: "Complete Request"
              }
            }
          }
        ]
      }
    ]
  });
};

const updateNeedPost = async (oldMessage, threadId, channelId) => {
  const oldContent = oldMessage.blocks[0].text.text;
  // Set up the status emoji/phrase
  // HACK: use non-breaking space as a delimiter between the status and the rest of the message: \u00A0
  const statusBadge = str("slackapp:needsBotPost.post.statusPrefix.assigned");
  const contentWithoutStatus = oldContent.replace(/^(.|[\r\n])*\u00A0/, "");
  const newContent = `${statusBadge}\u00A0${contentWithoutStatus}\n`;

  await slackapi.chat.update({
    channel: channelId,
    ts: threadId,
    text: newContent,
    blocks: []
  });
};

const multiSelectJoin = selections => {
  if (!selections || !selections.length) {
    return str("common:notAvailable");
  }
  return selections.map(selection => `\n  -  ${selection}`).join("");
};
