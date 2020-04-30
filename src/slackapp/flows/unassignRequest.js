const slackapi = require("~slack/webApi");
const {
  findChannelByName,
  sendEphemeralPostFactory
} = require("~slack/channels");
const {
  updateNeedByShortId,
  findNeedByShortId,
  needsFields
} = require("~airtable/tables/needs");
const { REQUESTS_CHANNEL } = require("~slack/constants");
const { str } = require("~strings/i18nextWrappers");

exports.unassignRequest = async payload => {
  const slackThreadId = payload.container.message_ts;
  const slackUserId = payload.user.id;
  const slackChannelId = payload.container.channel_id;
  const id = payload.actions[0].value;
  const sendEphemeralPost = sendEphemeralPostFactory(
    slackChannelId,
    slackUserId,
    slackThreadId
  );
  console.log(`Unassign delivery: ${id}`);
  try {
    const [need, _err] = await findNeedByShortId(id);
    if (!need) {
      sendEphemeralPost(
        `It looks like this request could have been deleted (id: ${id}) :/`
      );
      return {};
    }

    if (need.get(needsFields.status) === needsFields.status_options.completed) {
      sendEphemeralPost(`Request is already complete!`);
      return {};
    }

    if (need.get(needsFields.delivererSlackId) !== slackUserId) {
      sendEphemeralPost(
        `Looks like you aren't assigned to this request. Maybe you clicked unassign?`
      );
      return {};
    }

    const [_updated, uerr] = await updateNeedByShortId(id, {
      [needsFields.status]: needsFields.status_options.posted,
      [needsFields.delivererSlackId]: "",
      [needsFields.volunteer]: ""
    });
    if (uerr) {
      throw new Error(uerr);
    }

    const needPostThreadId = need.get(needsFields.slackThreadId);
    const needsChannel = await findChannelByName(REQUESTS_CHANNEL);
    await updateNeedPost(needPostThreadId, needsChannel.id, id);

    sendEphemeralPost(`Unassign Success!`);
  } catch (error) {
    console.log(`Assign delivery error for ${id}: ${error}`);
    sendEphemeralPost(
      "There was an error unassigning request :( Please try again!"
    );
  }
  return {};
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
