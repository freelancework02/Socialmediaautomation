require("dotenv").config();
const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:5000/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes required for YouTube video uploading
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
];

async function updateEnvFile(newToken) {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  let content = fs.readFileSync(envPath, "utf8");
  if (content.includes("YOUTUBE_REFRESH_TOKEN=")) {
    content = content.replace(
      /YOUTUBE_REFRESH_TOKEN=.*/,
      `YOUTUBE_REFRESH_TOKEN=${newToken}`
    );
  } else {
    content += `\nYOUTUBE_REFRESH_TOKEN=${newToken}\n`;
  }
  fs.writeFileSync(envPath, content, "utf8");
  console.log("\n✅ .env file automatically updated with your new YOUTUBE_REFRESH_TOKEN!");
}

async function handleCode(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n==================================================");
    console.log("🎉 Authorization Successful!");
    console.log("==================================================");

    if (tokens.refresh_token) {
      console.log("\nYour New Refresh Token:");
      console.log("--------------------------------------------------");
      console.log(tokens.refresh_token);
      console.log("--------------------------------------------------");
      await updateEnvFile(tokens.refresh_token);
      console.log("\nYou can now restart the server and upload YouTube Shorts without issues!");
    } else {
      console.log("\n⚠️ No new refresh_token returned.");
      console.log("Google only issues a refresh_token when prompt: 'consent' is approved.");
      console.log("Access Token:", tokens.access_token);
    }
  } catch (err) {
    console.error("\n❌ Error exchanging code for tokens:", err.message);
  }
}

async function main() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Forces Google to issue a new refresh token
    scope: SCOPES,
  });

  console.log("==================================================");
  console.log("🔑 YouTube Token Generator");
  console.log("==================================================\n");
  console.log("Step 1: Open this URL in your web browser:\n");
  console.log(authUrl);
  console.log("\n--------------------------------------------------");

  // Try opening automatically if 'open' module is available
  try {
    const open = require("open");
    await open(authUrl);
  } catch (e) {
    // fallback if open fails
  }

  // Set up local server to listen on port 5000 if available
  let server;
  try {
    server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.pathname === "/oauth2callback") {
        const code = parsedUrl.query.code;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>Authentication Successful!</h1><p>You can close this tab and return to the terminal.</p>");
        server.close();
        if (code) {
          await handleCode(code);
          process.exit(0);
        }
      }
    });

    server.on("error", (err) => {
      // If port 5000 is occupied by index.js, fallback to manual code input
      server.close();
    });

    server.listen(5000);
  } catch (e) {
    // Port 5000 is occupied
  }

  // Also prompt user in terminal so they can paste code or redirect URL manually if port is busy
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nStep 2: Sign in with your Google account and grant permissions.");
  console.log("If the browser automatically redirects to http://localhost:5000/oauth2callback, the script will capture it.");
  console.log("If the browser shows 'This site can’t be reached' or port 5000 is busy, simply copy the full redirected URL or the 'code' parameter from your browser address bar and paste it below:\n");

  rl.question("Paste full redirect URL or code here: ", async (input) => {
    rl.close();
    if (server) {
      try { server.close(); } catch (e) {}
    }

    let code = input.trim();
    if (code.includes("code=")) {
      const parsed = url.parse(code, true);
      code = parsed.query.code || code.split("code=")[1].split("&")[0];
    }

    if (code) {
      await handleCode(code);
    } else {
      console.log("❌ No valid authorization code found.");
    }
    process.exit(0);
  });
}

main();
