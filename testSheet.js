require("dotenv").config();
const { google } = require("googleapis");

async function readSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "config/google.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const range = "Sheet1!A2:D"; // Adjust if sheet name changes

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range,
  });

  const rows = res.data.values;

  if (!rows || rows.length === 0) {
    console.log("No data found.");
    return;
  }

  console.log("📄 Google Sheet Data:\n");

  rows.forEach((row, index) => {
    const [fileName, caption, description, status] = row;

    console.log(`Row ${index + 2}`);
    console.log("File Name   :", fileName);
    console.log("Caption     :", caption);
    console.log("Description :", description);
    console.log("Status      :", status || "Not Posted");
    console.log("---------------------------");
  });
}

readSheet().catch(err => {
  console.error("❌ Error reading sheet:", err.message);
});
