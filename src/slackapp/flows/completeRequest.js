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

exports.completeRequest = async payload => {
  const slackThreadId = payload.container.message_ts;
  const slackUserId = payload.user.id;
  const slackChannelId = payload.container.channel_id;
  const id = payload.actions[0].value;
  console.log(`Complete Request: ${id}`);
  const sendEphemeralPost = sendEphemeralPostFactory(
    slackChannelId,
    slackUserId,
    slackThreadId
  );
  try {
    const [need, err] = await findNeedByShortId(id);
    if (err) {
      sendEphemeralPost(
        `It looks like this request could have been deleted (id: ${id}) :/`
      );
      return {};
    }

    if (need.get(needsFields.delivererSlackId) !== slackUserId) {
      sendEphemeralPost(
        `Looks like you aren't assigned to this request. Maybe you clicked unassign?`
      );
      return {};
    }

    const [_updated, uerr] = await updateNeedByShortId(id, {
      [needsFields.status]: needsFields.status_options.completed
    });
    if (uerr) {
      throw new Error(uerr);
    }

    const needPostThreadId = need.get(needsFields.slackThreadId);
    const needsChannel = await findChannelByName(REQUESTS_CHANNEL);
    await updateNeedPost(needPostThreadId, needsChannel.id);

    sendEphemeralPost("Request Marked Completed!");
  } catch (error) {
    console.log(`Assign delivery error for ${id}: ${error}`);
    sendEphemeralPost(
      "There was an error completing request :( Please try again!"
    );
  }
  return {};
};

const updateNeedPost = async (threadId, channelId) => {
  const statusBadge = str(
    "slackapp:needsBotPost.post.statusPrefix.completed",
    ":heavy_check_mark:  REQUEST COMPLETED\n"
  );
  await slackapi.chat.update({
    channel: channelId,
    ts: threadId,
    text: statusBadge,
    blocks: []
  });
};
