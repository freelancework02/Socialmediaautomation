require("dotenv").config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { google } = require("googleapis");
const axios = require("axios");

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

const campaignContent = [
  {
    day: 1,
    videoFile: "Day1.mp4",
    title: "Read This Dua When Everything Feels Heavy | Day 1 of 7",
    caption: `Before you ask for the outcome, ask for the ease.

When Musa (as) was sent with the heaviest task of his life, the first thing he asked for was not success. It was an open chest and an easier path.

رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي
Rabbi-shraḥ lī ṣadrī wa yassir lī amrī
"My Lord, expand my chest for me, and make my task easy for me."
— Qur'an, Sūrah Ṭā-Hā 20:25–26

Some weeks start heavy. This is a place to begin.

This is Day 1 of a 7-day dua series — one short, authentic dua each day, for the things most of us are quietly carrying. Seven days is just the format; the asking is the point.

Today: say it once before your day starts.

Save this and come back tomorrow for Day 2.
Which part of your life needs ease right now?

CTA: Save this · come back tomorrow for Day 2

#dua #dailydua #islamicreminder #quran #duafromquran #7daydua #muslimreminder #deen #islamicpost #dhikr #islamicquotes #muslimcommunity`,
    description: `A short dua from Sūrah Ṭā-Hā (20:25–26) asking Allah for an open heart and an easier path — the dua Musa (as) made before anything else. Day 1 of a 7-day dua series: one authentic dua a day, from the Qur'an and the Sunnah. Save it, and come back tomorrow for Day 2.

#dua #quran #islamicreminder #shorts #dailydua`,
  },
  {
    day: 2,
    videoFile: "Day2.mp4",
    title: "A Dua for When You Feel Too Far Gone | Day 2 of 7",
    caption: `The door of forgiveness has no closing time.

The first recorded return in the Qur'an isn't an excuse or an explanation. It's an admission — and Allah accepted it.

رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ
Rabbanā ẓalamnā anfusanā wa il-lam taghfir lanā wa tarḥamnā lanakūnanna minal-khāsirīn
"Our Lord, we have wronged ourselves. If You do not forgive us and have mercy on us, we will surely be among the losers."
— Qur'an, Sūrah al-A'rāf 7:23

You don't need to fix yourself before you turn back. Turning back is the fixing.

Day 2 of the 7-day dua series.
Today: say it once, slowly, in your own quiet.

Send this to someone who's been carrying something heavy.

CTA: Share this with someone who needs it

#dua #istighfar #forgiveness #quran #islamicreminder #dailydua #duafromquran #7daydua #tawbah #muslimreminder #deen #islamicquotes`,
    description: `The dua of Adam (as) from Sūrah al-A'rāf 7:23 — the words of returning to Allah after a mistake. Day 2 of a 7-day dua series: one short, authentic dua each day. Save it and come back for Day 3.

#dua #istighfar #quran #islamicreminder #shorts`,
  },
  {
    day: 3,
    videoFile: "Day3.mp4",
    title: "The Short Dua of Protection You Can Say Anywhere | Day 3 of 7",
    caption: `Ten seconds of protection you can say anywhere.

No wudu needed. No specific time. Just a few words the Prophet ﷺ taught as a shelter.

أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ
A'ūdhu bikalimātillāhit-tāmmāti min sharri mā khalaq
"I seek refuge in the perfect words of Allah from the evil of what He has created."
— Ṣaḥīḥ Muslim 2708

Short enough to keep with you all day — in traffic, before a meeting, when you walk into somewhere unfamiliar.

Day 3 of the 7-day dua series.
Today: say it three times in the evening.

Save it where you'll actually see it.
Comment "Ameen" if you're keeping up with the challenge.

CTA: Save this for your evening routine

#dua #duafromsunnah #protection #islamicreminder #dailydua #hadith #7daydua #muslimreminder #adhkar #deen #islamicpost #dhikr`,
    description: `A brief dua of refuge from Ṣaḥīḥ Muslim 2708, taught by the Prophet ﷺ. Day 3 of a 7-day dua series with the Arabic, transliteration and meaning for each dua. Save it for your evening adhkar.

#dua #sunnah #adhkar #islamicreminder #shorts`,
  },
  {
    day: 4,
    videoFile: "Day4.mp4",
    title: "A Dua for Halal Rizq and Peace With Money | Day 4 of 7",
    caption: `Not just more rizq. Cleaner rizq.

This dua doesn't ask for a bigger number. It asks for what's lawful to be enough, and for the freedom of not needing anyone but Allah.

اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ
Allāhummakfinī biḥalālika 'an ḥarāmik, wa aghninī bifaḍlika 'amman siwāk
"O Allah, suffice me with what is lawful against what is forbidden, and enrich me by Your favour from all besides You."
— Jāmi' at-Tirmidhī 3563 (graded ḥasan)

Barakah is not the same thing as more. Sometimes it's the same income, spent with peace.

Day 4 — you're halfway through.
Today: say it after Fajr, before you open your work.

Save this for the mornings you feel stretched.

CTA: Halfway there — save Day 4

#dua #rizq #barakah #halal #islamicreminder #dailydua #duafromsunnah #7daydua #muslimreminder #deen #islamicquotes #hadith`,
    description: `A dua taught by the Prophet ﷺ (Tirmidhī 3563, graded ḥasan) asking for sufficiency in what is lawful and independence from everyone besides Allah. Day 4 of a 7-day dua series. Save it for your morning routine.

#dua #rizq #barakah #islamicreminder #shorts`,
  },
  {
    day: 5,
    videoFile: "Day5.mp4",
    title: "The Qur'an's Dua for Patience When You Want to Give Up | Day 5 of 7",
    caption: `Sabr isn't summoned. It's asked for.

We talk about patience like it's something you either have or you don't. The Qur'an teaches it as something you request — poured over you, not squeezed out of you.

رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا
Rabbanā afrigh 'alaynā ṣabran wa thabbit aqdāmanā
"Our Lord, pour patience upon us and make our steps firm."
— Qur'an, Sūrah al-Baqarah 2:250

It was said by a small group standing in front of something far larger than them. Most of us know that feeling.

Day 5 of the 7-day dua series. Two days left.
Today: repeat it in the moment you want to give up.

Save this for the day you'll need it.
Which one of these five days did you need most?

CTA: Two days left — save this one

#dua #sabr #patience #quran #duafromquran #islamicreminder #dailydua #7daydua #muslimreminder #deen #islamicquotes #strength`,
    description: `A short dua from Sūrah al-Baqarah 2:250 asking Allah to pour patience over us and steady our footing. Day 5 of a 7-day dua series with the Arabic, transliteration and meaning for every dua. Save it for the day you need it.

#dua #sabr #quran #islamicreminder #shorts`,
  },
  {
    day: 6,
    videoFile: "Day6.mp4",
    title: "Say This Dua When Your Mind Won't Switch Off | Day 6 of 7",
    caption: `For the thoughts that arrive after everyone else is asleep.

Anxiety and grief aren't a sign of weak faith. The Prophet ﷺ taught us words to say precisely because they come.

اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ
Allāhumma innī a'ūdhu bika minal-hammi wal-ḥazan
"O Allah, I seek refuge in You from anxiety and grief."
— Ṣaḥīḥ al-Bukhārī 6369 (the opening of a longer supplication)

Worry was never meant to be carried alone. This is where you put it down.

Day 6 of the 7-day dua series. One day left.
Tonight: say it before you sleep.

Send this to someone who's had a long month.

CTA: Share this with someone who's struggling

#dua #anxiety #islamicreminder #mentalhealth #dailydua #duafromsunnah #7daydua #muslimreminder #tawakkul #deen #hadith #islamicquotes`,
    description: `A short dua from Ṣaḥīḥ al-Bukhārī 6369 seeking refuge from anxiety and grief — part of a longer supplication taught by the Prophet ﷺ. Day 6 of a 7-day dua series. Save it for tonight.

#dua #anxiety #sunnah #islamicreminder #shorts`,
  },
  {
    day: 7,
    videoFile: "Day7.mp4",
    title: "The Dua the Prophet ﷺ Made Most Often | Day 7 of 7",
    caption: `The dua the Prophet ﷺ made most often was only one line long.

Anas ibn Mālik (ra) said this was the supplication he ﷺ said most (Ṣaḥīḥ al-Bukhārī 6389). It asks for everything, in both worlds, in a single breath.

رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ
Rabbanā ātinā fid-dunyā ḥasanatan wa fil-ākhirati ḥasanatan wa qinā 'adhāban-nār
"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire."
— Qur'an, Sūrah al-Baqarah 2:201

Seven days, one habit: asking. Keep this one for the rest of them.

You've completed the challenge.
Today: make it your closing dua after every salah.

Comment "Ameen" if you made it through all seven.
Save the full set and start again whenever you need to.

CTA: You completed the challenge — comment "Ameen"

#dua #quran #dailydua #islamicreminder #duafromquran #7daydua #muslimreminder #deen #islamicpost #dhikr #islamicquotes #muslimcommunity`,
    description: `A one-line dua from Sūrah al-Baqarah 2:201 asking for good in this life and the next. Anas ibn Mālik (ra) reported it was the supplication the Prophet ﷺ made most frequently (Ṣaḥīḥ al-Bukhārī 6389). The final day of a 7-day dua series.

#dua #quran #islamicreminder #sunnah #shorts`,
  },
];

async function main() {
  console.log("==================================================");
  console.log("🚀 Starting 7-Day Dua Challenge Ingestion Script");
  console.log("==================================================\n");

  const contentDir = path.join(__dirname, "..", "Content");

  // Step 1: Upload all 7 videos to Cloudinary
  console.log("--- Step 1: Uploading Videos to Cloudinary ---");
  const uploadedFiles = [];

  for (const item of campaignContent) {
    const filePath = path.join(contentDir, item.videoFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`);
    }

    const publicId = `Day${item.day}`;
    console.log(`\nUploading Day ${item.day} (${item.videoFile}) to Cloudinary folder 'Reels'...`);

    const uploadRes = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      folder: "Reels",
      public_id: publicId,
      overwrite: true,
    });

    const storedFileName = `${uploadRes.public_id}.${uploadRes.format}`;
    console.log(`✅ Uploaded successfully: ${storedFileName}`);
    console.log(`   Secure URL: ${uploadRes.secure_url}`);

    // Verify URL accessibility
    try {
      const headRes = await axios.head(uploadRes.secure_url);
      console.log(`   Verification: HTTP ${headRes.status} OK`);
    } catch (headErr) {
      console.warn(`   ⚠️ Warning: URL check returned ${headErr.message}`);
    }

    uploadedFiles.push({
      ...item,
      storedFileName,
    });
  }

  // Step 2: Mark Row 12 as "Posted" if needed, so Day 1 is next in queue
  console.log("\n--- Step 2: Checking Google Sheet & Row 12 Status ---");
  const sheetMeta = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!A1:F50",
  });
  const existingRows = sheetMeta.data.values || [];
  console.log(`Current row count in Sheet1: ${existingRows.length}`);

  if (existingRows.length >= 12) {
    const row12 = existingRows[11]; // 0-indexed
    console.log(`Row 12 currently: File=${row12[0]}, IG=${row12[4]}, YT=${row12[5]}`);
    if (row12[4]?.trim() !== "Posted" || row12[5]?.trim() !== "Posted") {
      console.log("Updating Row 12 to 'Posted' so Day 1 becomes the next upcoming reel...");
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID,
        range: "Sheet1!E12:F12",
        valueInputOption: "RAW",
        requestBody: {
          values: [["Posted", "Posted"]],
        },
      });
      console.log("✅ Row 12 marked as 'Posted'");
    }
  }

  // Step 3: Append rows to Google Sheet
  console.log("\n--- Step 3: Appending 7 New Rows to Google Sheet ---");
  const rowsToAppend = uploadedFiles.map((item) => [
    item.storedFileName, // Col A: Files Name
    item.caption,        // Col B: Caption
    item.description,    // Col C: Description
    item.title,          // Col D: Title
    "Pending",           // Col E: IsInstagramUpload
    "Pending",           // Col F: IsYouTubeShortUpload
  ]);

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!A:F",
    valueInputOption: "RAW",
    requestBody: {
      values: rowsToAppend,
    },
  });

  console.log(`✅ Appended ${rowsToAppend.length} rows to Google Sheet!`);
  console.log(`   Updated Range: ${appendRes.data.updates.updatedRange}`);

  console.log("\n==================================================");
  console.log("🎉 All 7 Days Successfully Ingested!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("\n❌ Ingestion Failed:", err);
  process.exit(1);
});
