const slackapi = require("~slack/webApi");
const { sendThreadPostFactory, findChannelByName } = require("~slack/channels");
const {
  updateNeedByShortId,
  findNeedByShortId,
  needsFields
} = require("~airtable/tables/needs");
const { REQUESTS_CHANNEL } = require("~slack/constants");
const { str } = require("~strings/i18nextWrappers");

exports.unassignRequest = async payload => {
  const slackThreadId = payload.container.message_ts;
  const slackChannelId = payload.container.channel_id;
  const id = payload.actions[0].value;
  console.log(`Unassign delivery: ${id}`);
  const sendThreadPost = sendThreadPostFactory(slackChannelId, slackThreadId);
  try {
    const [need, _err] = await findNeedByShortId(id);
    if (!need) {
      await sendThreadPost(
        "It looks like this request could have been deleted :/"
      );
      return;
    }

    const [_updated, uerr] = await updateNeedByShortId(id, {
      [needsFields.status]: needsFields.status_options.posted,
      [needsFields.delivererSlackId]: ""
    });
    if (uerr) {
      throw new Error(uerr);
    }

    const needPostThreadId = need.get(needsFields.slackThreadId);
    const needsChannel = await findChannelByName(REQUESTS_CHANNEL);
    await updateNeedPost(needPostThreadId, needsChannel.id, id);
  } catch (error) {
    await sendThreadPost(
      "There was an error assigning to delivery :( Please try again!"
    );
    console.log(`Assign delivery error for ${id}: ${error}`);
  }
};

const updateNeedPost = async (threadId, channelId, id) => {
  const existingMessage = await getExistingMessage(threadId, channelId);
  const oldContent = existingMessage.text;
  // Set up the status emoji/phrase
  // HACK: use non-breaking space as a delimiter between the status and the rest of the message: \u00A0
  const statusBadge = str(
    "slackapp:needsBotPost.post.statusPrefix.default",
    ":red_circle:"
  );
  const contentWithoutStatus = oldContent.replace(/^(.|[\r\n])*\u00A0/, "");
  const newContent = `${statusBadge}\u00A0${contentWithoutStatus}\n`;

  await slackapi.chat.update({
    channel: channelId,
    ts: threadId,
    text: newContent,
    blocks: [
      // Message text should always be first block
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: newContent
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Accept Request"
            },
            action_id: "assign-need-to-me",
            value: String(id),
            confirm: {
              title: {
                type: "plain_text",
                text: "Are you sure?"
              },
              text: {
                type: "mrkdwn",
                text: "Only click if you can accept responsibility!"
              },
              confirm: {
                type: "plain_text",
                text: "Accept Request"
              }
            }
          }
        ]
      }
    ]
  });
};

async function getExistingMessage(ts, channel) {
  const message = await slackapi.conversations.history({
    channel,
    latest: ts,
    limit: 1,
    inclusive: true
  });
  if (!message.messages[0]) {
    return null;
  }
  return message.messages[0];
}
