require("dotenv").config();
const axios = require("axios");
const { google } = require("googleapis");

async function uploadReel() {
  // ---------- Google Sheets ----------
  const auth = new google.auth.GoogleAuth({
    keyFile: "config/google.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const sheetRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!A2:D",
  });

  const rows = sheetRes.data.values;
  if (!rows || rows.length === 0) {
    console.log("❌ No data found in sheet");
    return;
  }

  // Take FIRST ROW ONLY for test
  const rowIndex = 2;
  const [fileName, caption, description, status] = rows[0];

  if (status === "Posted") {
    console.log("⚠️ This reel is already posted");
    return;
  }

  const videoUrl = `https://res.cloudinary.com/dombz5xan/video/upload/${fileName}`;

  console.log("🎥 Video URL:", videoUrl);
  console.log("📝 Caption:", caption);

  // ---------- Instagram: Create Reel ----------
  const createRes = await axios.post(
    `https://graph.facebook.com/v23.0/${process.env.IG_ID}/media`,
    {
      video_url: videoUrl,
      caption: caption,
      media_type: "REELS",
      access_token: process.env.META_TOKEN,
    }
  );

  const creationId = createRes.data.id;
  console.log("📦 Reel container created:", creationId);

  // ---------- Wait ----------
  console.log("⏳ Waiting 60 seconds...");
  await new Promise(r => setTimeout(r, 60000));

  // ---------- Publish Reel ----------
  const publishRes = await axios.post(
    `https://graph.facebook.com/v23.0/${process.env.IG_ID}/media_publish`,
    {
      creation_id: creationId,
      access_token: process.env.META_TOKEN,
    }
  );

  console.log("✅ Reel published successfully!");
  console.log("Post ID:", publishRes.data.id);

  // ---------- Update Sheet ----------
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `Sheet1!D${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["Posted"]],
    },
  });

  console.log("📄 Sheet updated → Status = Posted");
}

uploadReel().catch(err => {
  console.error("❌ Error:", err.response?.data || err.message);
});
