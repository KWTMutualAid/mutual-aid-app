const { merge } = require("lodash");
const { airbase } = require("~airtable/bases");

exports.findNeedByShortId = async shortId => {
  try {
    const records = await needsTable
      .select({
        filterByFormula: `({${fields.shortId}} = ${shortId})`
      })
      .firstPage();
    if (records.length === 0) {
      return [null, "No needs found with that code."];
    }
    const record = records[0];
    return [record, null];
  } catch (e) {
    return [null, `Error while finding need: ${e}`];
  }
};

// `update` should look like:
// {
//   "Some Need Field": "New Value",
//   "Another field": "Another New Value"
//   "Meta": {key: "value"}
// }
exports.updateNeedByShortId = async (shortId, update) => {
  try {
    const records = await needsTable
      .select({
        filterByFormula: `({${fields.shortId}} = ${shortId})`
      })
      .firstPage();
    if (records.length === 0) {
      return [null, `No needs found with shortId: ${shortId}`];
    }
    if (update[fields.meta]) {
      // Support for updating Meta as an object (rather than string)
      /* eslint no-param-reassign: ["error", { "props": false }] */
      const parsed = JSON.parse(records[0].get(fields.meta));
      merge(parsed, update[fields.meta]);
      update[fields.meta] = JSON.stringify(parsed);
    }
    const record = records[0];
    const airUpdate = {
      id: record.id,
      fields: update
    };
    const updatedRecords = await needsTable.update([airUpdate]);
    return [updatedRecords[0], null];
  } catch (e) {
    return [null, `Error while processing update: ${e}`];
  }
};

// ==================================================================
// Schema
// ==================================================================

const needsTableName = (exports.needsTableName = "Needs");
const needsTable = (exports.needsTable = airbase(needsTableName));
const fields = (exports.needsFields = {
  fullId: "Request ID",
  shortId: "auto-num",
  name: "Name",
  phone: "Phone Number",
  email: "Email",
  timeSensitivity: "How soon do you need support?",
  timeSensitivity_options: {
    crisis: "Immediately, I'm in crisis",
    fewDays: "In the next few days",
    worried: "I'm okay for now, but am worried that I won't be soon"
  },
  zone: "Which zone is the person IN NEED in?",
  zone_options: {
    zoneA: "Zone A",
    zoneB: "Zone B",
    zoneC: "Zone C",
    zoneD: "Zone D",
    zoneE: "Zone E",
    zoneF: "Zone F",
    zoneG: "Zone G",
    zoneH: "Zone H",
    imNotInAnyOfThoseZones: "I'm not in any of those zones."
  },
  neighborhood: "Which neighborhood are you in?",
  address: "What is your address?",
  languages: "Which languages are you able to communicate in?",
  languages_options: {
    english: "English",
    spanishEspanolCastillano: "Spanish - español - castillano",
    arabicModernStandardAl_ʻarabiyah_العربية:
      "Arabic (Modern Standard) - (al-ʻarabīyah) العربية",
    frenchFrancais: "French - français",
    haitianCreoleKreyolAyisyen: "Haitian Creole - Kreyòl ayisyen",
    urdu_اُردُو: "Urdu - اُردُو",
    persianFarsiFɒːɾˈsiːFarsi_فارسی:
      "Persian (Farsi) - [fɒːɾˈsiː] (fārsi) فارسی",
    bengaliBangla_বাংলা: "Bengali - Bangla - বাংলা",
    chineseMandarin_官话Guanhua_國語Guoyǔ:
      "Chinese (Mandarin) - 官话 (Guānhuà) - 國語 (Guóyǔ)",
    russian_русский_языкRusskiyYazyk: "Russian - Русский язык (russkiy yazyk)",
    polishPolski_ˈpɔlskʲi: "Polish - polski [ˈpɔlskʲi]",
    americanSignLanguageAsl: "American Sign Language - ASL",
    wolofWollof: "Wolof - Wollof",
    frenchGuianeseCreoleGuyanaisPatwa:
      "French Guianese Creole - Guyanais - Patwa",
    guineaBissauCreoleKriolKiriolKrioluPurtuguis:
      "Guinea-Bissau Creole - Kriol - Kiriol - Kriolu - Purtuguis",
    uzbek_ўзбек_тилиOzbekTili_أۇزبېك_ﺗﻴﻠی:
      "Uzbek - Ўзбек тили - O'zbek tili - أۇزبېك ﺗﻴﻠی",
    tagalogTagalog: "Tagalog - Tagalog",
    japanese_日本語Nihongo_ɲihonɡo: "Japanese - 日本語 (nihongo) [ɲihoŋɡo]",
    korean_한국어_韓國語HangukEoSouthKorea:
      "Korean - 한국어 [韓國語] (hanguk-eo) - South Korea",
    vietnameseTiếngViệt_㗂越TǐənViəˀtTǐənJiək:
      "Vietnamese - Tiếng Việt (㗂越) [tǐəŋ vìəˀt] / [tǐəŋ jìək]",
    yiddishYidish_ײִדיש_מאַמע_לשון: "Yiddish - (yidish) ײִדיש - מאַמע לשון",
    hebrew_ʔivˈʁit_ʕivˈɾitIvrit_עברית:
      "Hebrew - [ʔivˈʁit / ʕivˈɾit] (Ivrit) עברית",
    turkishTurkce: "Turkish - Türkçe",
    greek_ελληνικάElinika: "Greek - ελληνικά (elinika)",
    armenian_հայերէնHayerenHɑjɛˈɾɛn: "Armenian - Հայերէն (hayeren) [hɑjɛˈɾɛn]",
    hindi_हिन्दी: "Hindi - हिन्दी",
    punjabi_ਪੰਜਾਬੀ_پنجابی: "Punjabi - ਪੰਜਾਬੀ - پنجابی",
    tamil_தமிழ்Tamiḻ: "Tamil - தமிழ் (tamiḻ)",
    italianItaliano: "Italian - italiano",
    germanDeutsch: "German - Deutsch",
    otherMyLanguageIsNotListed: "Other - My language is not listed",
    chineseCantonese_廣東話GwongdungWa:
      "Chinese (Cantonese) - 廣東話 (Gwóngdūng wá)"
  },
  communicationPref: "Which is the best way for us to communicate with you?",
  communicationPref_options: {
    text: "Text",
    call: "Call",
    email: "Email"
  },
  supportType: "What type(s) of support are you seeking?",
  supportType_options: {
    groceriesFood: "Groceries / Food",
    suppliesPrescription: "Supplies / Prescription",
    "1On1CheckInsPhoneCallOrVideoChat":
      "1 on 1 check-ins (phone call or video chat)",
    financialSupport: "Financial support",
    translationInterpretation: "Translation / interpretation",
    helpWithGovernmentFormsIEUnemploymentForm:
      "Help with government forms (i.e. Unemployment Form)",
    otherPleaseDescribeBelow: "Other (please describe below)",
    jfsdf: "jfsdf"
  },
  otherSupport:
    "If you're seeking another type of support, please share it here.",
  hardHitCommunity:
    "Are you, or anyone in your household in one or more of these hardest-hit groups?",
  hardHitCommunity_options: {
    youth: "Youth",
    homelessHousingUnstablePublicHousing:
      "Homeless / housing unstable / public housing",
    unemployedLowWageOutsideTheFormalEconomy:
      "Unemployed / low-wage / outside the formal economy",
    blackIndigenousPeopleOfColor: "Black / indigenous / people of color",
    immigrants: "Immigrants",
    incarceratedOverPoliced: "Incarcerated / over-policed",
    healthcareCareWorkerDomesticWorker:
      "Healthcare / care worker / domestic worker",
    disabledChronicIllnessImmunocompromised:
      "Disabled / chronic illness / immunocompromised",
    seniorElder: "Senior / elder",
    familyChildrenPregnant: "Family / children / pregnant"
  },
  otherNotes:
    "Notes / Anything else you want to share about your situation at this time?",
  consent:
    "By checking this box, I agree to have my information shared with groups providing support in my neighborhood, borough and/or citywide. I understand that this information will not be shared widely or used for any other purpose.",
  status: "Status",
  status_options: {
    inProgress: "In Progress",
    completed: "Completed",
    posted: "Posted"
  },
  volunteer: "Volunteer",
  "onlyEditOverThere_🚨": "<---  Only edit over there 🚨",
  directedTo: "Directed To",
  directedTo_options: {
    pin: "PIN",
    acmwRamadanFoodPantryGift: "ACMW Ramadan Food Pantry Gift",
    makingMasksPpe: "#making-masks-ppe",
    communityNeeds: "#community-needs",
    communityNeedsTest: "#community-needs-test",
    christApostolicChurchGokeFoodPantry:
      "Christ Apostolic Church Goke Food Pantry",
    nationalSuicidePreventionLifeline8002738255:
      "National Suicide Prevention Lifeline 800-273-8255",
    violenceInterventionProgram8006645880:
      "Violence Intervention Program 800-664-5880",
    nationalSexualAssaultHotline8006564673:
      "National Sexual Assault Hotline 800-656-4673",
    nycElderAbuseCenter2127466905MF95:
      "NYC Elder Abuse Center 212-746-6905 (M-F 9-5)",
    nycDeptForTheAging2124424103MF95:
      "NYC Dept for the Aging 212-442-4103 (M-F 9-5)",
    agingConnect2122446469: "Aging Connect 212-244-6469",
    "1888NycWellTextWellTo65173": "1-888-NYC-Well - text ‘Well’ to 65173",
    shahanaHanif: "Shahana Hanif",
    mazedaUddin: "Mazeda Uddin",
    bedfordStuyvesantFoodBank7327719663:
      "Bedford Stuyvesant Food Bank: (732)-771-9663",
    crownHeightsFoodBank9173417675: "Crown Heights Food Bank: (917)-341-7675",
    flatbushFoodBank7187327196: "Flatbush Food Bank: (718)-732-7196",
    foodBankForNycMain2125667855: "Food Bank for NYC Main: (212)-566-7855 ",
    facebook: "Facebook",
    volunteerEmailList: "Volunteer Email List",
    publicSchoolPantry: "Public School Pantry",
    peerToPeerDonation: "Peer-to-peer donation"
  },
  statusModified: "Status Modified",
  householdSize: "How many people are in your household / family?",
  payment: "What is your economic ability?",
  payment_options: {
    iCannotPay: "I cannot pay",
    iCanPaySome: "I can pay some",
    iCanPay: "I can pay"
  },
  canLeave: "Are you able to leave your residence?",
  canLeave_options: {
    yes: "Yes",
    no: "No"
  },
  expenses: "Expenses",
  slackThreadId: "SlackThreadId",
  delivererSlackId: "DelivererSlackId"
});
exports.needsSensitiveFields = [
  fields.address,
  fields.phone,
  fields.email,
  fields.otherSupport,
  fields.otherNotes
];
