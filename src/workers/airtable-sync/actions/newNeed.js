const slackapi = require("~slack/webApi");
const { findChannelByName, addBotToChannel } = require("~slack/channels");
const { REQUESTS_CHANNEL, REQUESTS_TEST_CHANNEL } = require("~slack/constants");
const { needsFields, needsTable } = require("~airtable/tables/needs");
const { str } = require("~strings/i18nextWrappers");
const getAddressMetadata = require("~lib/geo/getAddressMetadata");

module.exports = async function newNeed(need) {
  let channel;
  const directedTo = need.get(needsFields.directedTo);
  if (
    directedTo &&
    directedTo.includes(needsFields.directedTo_options.communityNeedsTest)
  ) {
    channel = REQUESTS_TEST_CHANNEL;
  }
  if (
    directedTo &&
    directedTo.includes(needsFields.directedTo_options.communityNeeds)
  ) {
    channel = REQUESTS_CHANNEL;
  }

  if (!channel) {
    return;
  }
  const needsChannel = await findChannelByName(channel);
  await addBotToChannel(needsChannel.id);

  const id = need.get(needsFields.shortId);
  console.debug(`New Needs Request: ${id}`);

  const messageText = await makeMessageText(need);
  const deliveryMessage = await slackapi.chat.postMessage({
    channel: needsChannel.id,
    unfurl_media: false,
    text: messageText,
    blocks: [
      // Message text should always be first block
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: messageText
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
  if (!deliveryMessage.ok) {
    console.debug(`Couldn't post request: ${id}`);
    return;
  }

  await needsTable.update([
    {
      id: need.getId(),
      fields: {
        [needsFields.slackThreadId]: deliveryMessage.ts,
        [needsFields.status]: needsFields.status_options.posted
      }
    }
  ]);
};

async function makeMessageText(need) {
  const address = need.get(needsFields.address);
  let streets = "(No Location Provided!)";
  if (address) {
    const addressMeta = await getAddressMetadata(address);
    streets = [
      addressMeta.intersection.street_1,
      addressMeta.intersection.street_2
    ]
      .filter(s => s !== undefined)
      .join(" & ");
  }
  const intro = str("slackapp:needsBotPost.post.message.intro", {
    defaultValue: `A neighbor at {{- streets}} needs your support`,
    streets
  });

  const languages = need.get(needsFields.languages);
  const needs = need.get(needsFields.supportType);
  const extraFields = [
    ["Code", need.get(needsFields.fullId)],
    [
      "Language(s)",
      languages && languages.length
        ? multiSelectJoin(languages)
        : needsFields.languages_options.english
    ],
    [
      "Ppl in household",
      need.get(needsFields.householdSize) || str("common:notAvailable")
    ],
    [
      "Need(s)",
      needs && needs.length
        ? multiSelectJoin(needs)
        : str("common:notAvailable")
    ],
    [
      "Economic Ability",
      need.get(needsFields.payment) || str("common:notAvailable")
    ],
    [
      "Ability to leave residence",
      need.get(needsFields.canLeave) || str("common:notAvailable")
    ]
  ];
  const status = str(
    "slackapp:needsBotPost.post.statusPrefix.default",
    ":red_circle:"
  );
  const fieldRepresentation = extraFields
    .filter(kv => kv[1])
    .map(kv => `*${kv[0]}*: ${String(kv[1])}`)
    .join("\n");
  // HACK: use non-breaking space as a delimiter between the status and the rest of the message: \u00A0
  return `${status}\u00A0${intro}:\n${fieldRepresentation}
  
${str(
  "slackapp:needsBotPost.post.message.outro",
  "_*Note*: By accepting this request, you're requesting responsibility for completing it._"
)}`;
}

const multiSelectJoin = selections => {
  return selections.map(selection => `\n  -  ${selection}`).join("");
};
