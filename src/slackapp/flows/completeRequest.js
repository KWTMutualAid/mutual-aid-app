const slackapi = require("~slack/webApi");
const { sendThreadPostFactory, findChannelByName } = require("~slack/channels");
const {
  updateNeedByShortId,
  findNeedByShortId,
  needsFields
} = require("~airtable/tables/needs");
const { REQUESTS_CHANNEL } = require("~slack/constants");
const { str } = require("~strings/i18nextWrappers");

exports.completeRequest = async payload => {
  const slackThreadId = payload.container.message_ts;
  const slackChannelId = payload.container.channel_id;
  const slackUserId = payload.user.id;
  const id = payload.actions[0].value;
  console.log(`Complete Request: ${id}`);
  const sendThreadPost = sendThreadPostFactory(slackChannelId, slackThreadId);
  try {
    const [need, err] = await findNeedByShortId(id);
    if (err) {
      await sendThreadPost(
        "It looks like this request could have been deleted :/"
      );
      return;
    }

    if (need.get(needsFields.delivererSlackId) !== slackUserId) {
      await sendThreadPost(
        "Looks like you aren't assigned to this request. Maybe you clicked unassign?"
      );
      return;
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
  } catch (error) {
    // await sendThreadPost(
    //   "There was an error assigning to delivery :( Please try again!"
    // );
    console.log(`Assign delivery error for ${id}: ${error}`);
  }
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
