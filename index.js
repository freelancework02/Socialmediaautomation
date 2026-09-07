require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const expressLayouts = require("express-ejs-layouts");


const fs = require('fs');
const path = require('path');

const app = express();

// ---------- Middlewares ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(expressLayouts);
app.set("layout", "layout");

// ---------- Cloudinary ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: "uploads/" });

// ---------- Google Sheets ----------

// Google Sheets Authentication
// using specific env variables for better compatibility across platforms

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});


const sheets = google.sheets({ version: "v4", auth });

async function getSheetData() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!A2:F",
  });

  return res.data.values || [];
}



async function appendRow(fileName, caption, description, title) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!A:F",
    valueInputOption: "RAW",
    requestBody: {
      values: [[fileName, caption, description, title, "Pending", "Pending"]]
    }
  });
}


async function getNextReel() {
  const rows = await getSheetData();

  for (let i = 0; i < rows.length; i++) {
    const [fileName, caption, description, title, IsInstagramUpload] = rows[i];
    if (IsInstagramUpload !== "Posted") {
      return {
        rowIndex: i + 2,
        fileName,
        caption,
        description,
        pendingList: rows.filter(r => r[3] !== "Posted").map(r => r[0]),
      };
    }
  }

  return null;
}



async function markAsPosted(rowIndex) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `Sheet1!E${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["Posted"]],
    },
  });
}


async function getNextYouTubeShort() {
  const rows = await getSheetData();

  for (let i = 0; i < rows.length; i++) {
    const [fileName, caption, description, title, instaStatus, ytStatus] = rows[i];

    if (ytStatus !== "Posted") {
      return {
        rowIndex: i + 2,
        fileName,
        title,
        description,
        caption,
        pendingList: rows.filter(r => r[5] !== "Posted").map(r => r[0]),
      };
    }
  }

  return null;
}


async function markYouTubePosted(rowIndex) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `Sheet1!F${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [["Posted"]],
    },
  });
}

// Single next reel that still needs posting to Instagram and/or YouTube
async function getNextUpcomingReel() {
  const rows = await getSheetData();

  for (let i = 0; i < rows.length; i++) {
    const [fileName, caption, description, title, igStatus, ytStatus] = rows[i];
    const igClean = (igStatus || "").trim();
    const ytClean = (ytStatus || "").trim();

    if (igClean !== "Posted" || ytClean !== "Posted") {
      return {
        rowIndex: i + 2,
        fileName,
        caption,
        description,
        title,
        igPosted: igClean === "Posted",
        ytPosted: ytClean === "Posted",
      };
    }
  }

  return null;
}

function buildVideoUrls(fileName) {
  return {
    mainUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${fileName}`,
    fallbackUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1766324641/Reels/${fileName}`,
  };
}

// ---------- Reusable upload actions (used by both the manual routes and the combined "upload to both" action) ----------

async function uploadReelToInstagram(reel) {
  try {
    const { mainUrl, fallbackUrl } = buildVideoUrls(reel.fileName);

    let videoUrl = mainUrl;
    try {
      await axios.head(videoUrl);
    } catch (err) {
      videoUrl = fallbackUrl;
      await axios.head(videoUrl);
    }

    const createRes = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.IG_ID}/media`,
      {
        video_url: videoUrl,
        caption: reel.caption,
        media_type: "REELS",
        access_token: process.env.META_TOKEN,
      }
    );

    const creationId = createRes.data.id;

    let status = "IN_PROGRESS";
    let attempts = 0;

    while (status !== "FINISHED") {
      if (attempts >= 30) {
        throw new Error("Processing timeout: Video took too long to process on Instagram.");
      }

      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      const statusRes = await axios.get(
        `https://graph.facebook.com/v23.0/${creationId}`,
        {
          params: {
            fields: "status_code",
            access_token: process.env.META_TOKEN
          }
        }
      );

      status = statusRes.data.status_code;

      if (status === "ERROR" || status === "EXPIRED") {
        throw new Error("Instagram Processing Failed: " + status);
      }
    }

    const publishRes = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.IG_ID}/media_publish`,
      {
        creation_id: creationId,
        access_token: process.env.META_TOKEN,
      }
    );

    return { success: true, postId: publishRes.data.id, videoUrlUsed: videoUrl };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}

async function uploadShortToYouTube(short) {
  const { mainUrl, fallbackUrl } = buildVideoUrls(short.fileName);

  const cleanName = path.basename(short.fileName);
  const tempDir = process.env.TEMP_DIR || path.join(require("os").tmpdir(), "temp_Reels");
  fs.mkdirSync(tempDir, { recursive: true });
  const tempFilePath = path.join(tempDir, `temp_${cleanName}`);

  try {
    let downloadUrl = mainUrl;

    try {
      const response = await axios({ url: downloadUrl, method: "GET", responseType: "stream" });
      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    } catch (error) {
      downloadUrl = fallbackUrl;
      const response2 = await axios({ url: downloadUrl, method: "GET", responseType: "stream" });
      const fallbackWriter = fs.createWriteStream(tempFilePath);
      response2.data.pipe(fallbackWriter);
      await new Promise((resolve, reject) => {
        fallbackWriter.on("finish", resolve);
        fallbackWriter.on("error", reject);
      });
    }

    const youtube = getYouTubeClient();

    const resYoutube = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: short.title,
          description: (short.description || "") + "\n\n#Shorts",
          tags: ["Shorts", "YouTubeShorts"],
          categoryId: "22"
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(tempFilePath)
      }
    });

    fs.unlinkSync(tempFilePath);

    return { success: true, videoId: resYoutube.data.id };
  } catch (err) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message,
    };
  }
}


// ---------- Routes ----------

// Home redirect
app.get("/", (req, res) => {
  res.redirect("/upload");
});

// Upload Page
app.get("/upload", (req, res) => {
  res.render("upload");
});

// Dashboard Page with Live Social Media Profile Metrics & Queue List
app.get("/dashboard", async (req, res) => {
  try {
    const rows = await getSheetData();

    const total = rows.length;

    // Filter statuses cleanly with whitespace trimming
    const instaPending = rows.filter(r => (r[4] || "").trim() !== "Posted").length;
    const ytPending = rows.filter(r => (r[5] || "").trim() !== "Posted").length;

    const reelsList = rows.map((r, i) => {
      const igStatus = (r[4] || "").trim() || "Pending";
      const ytStatus = (r[5] || "").trim() || "Pending";
      return {
        rowIndex: i + 2,
        fileName: r[0] || "",
        caption: r[1] || "",
        description: r[2] || "",
        title: r[3] || "Untitled Reel",
        igStatus,
        ytStatus,
        isFullyPosted: igStatus === "Posted" && ytStatus === "Posted",
        isPending: igStatus !== "Posted" || ytStatus !== "Posted",
      };
    });

    // 1. Fetch Instagram Profile Details
    let igProfile = null;
    try {
      const igRes = await axios.get(`https://graph.facebook.com/v23.0/${process.env.IG_ID}`, {
        params: {
          fields: "id,username,name,followers_count,media_count,profile_picture_url",
          access_token: process.env.META_TOKEN,
        },
        timeout: 4000,
      });
      igProfile = igRes.data;
    } catch (igErr) {
      console.warn("Could not fetch Instagram profile metrics:", igErr.message);
    }

    // 2. Fetch YouTube Channel Details
    let ytProfile = null;
    try {
      const youtube = getYouTubeClient();
      const ytRes = await youtube.channels.list({
        part: "snippet,statistics",
        mine: true,
      });
      if (ytRes.data.items && ytRes.data.items.length > 0) {
        const item = ytRes.data.items[0];
        ytProfile = {
          id: item.id,
          title: item.snippet.title,
          customUrl: item.snippet.customUrl,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          subscribers: Number(item.statistics.subscriberCount).toLocaleString(),
          views: Number(item.statistics.viewCount).toLocaleString(),
          videoCount: Number(item.statistics.videoCount).toLocaleString(),
        };
      }
    } catch (ytErr) {
      console.warn("Could not fetch YouTube channel metrics:", ytErr.message);
    }

    res.render("dashboard", {
      total,
      instaPending,
      ytPending,
      reelsList,
      igProfile,
      ytProfile,
    });
  } catch (err) {
    console.error("Dashboard render error:", err);
    res.status(500).send("Error loading dashboard: " + err.message);
  }
});

// Post Page
// app.get("/post", async (req, res) => {
//   const reel = await getNextReel();

//   if (!reel) {
//     return res.render("post", { reel: null });
//   }

//   const videoUrl =
//     `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${reel.fileName}`;

//   res.render("post", { reel, videoUrl });
// });

app.get("/post", (req, res) => res.redirect("/next"));

// ---------- Next Upload (single reel -> both platforms, one click) ----------

app.get("/next", (req, res) => {
  res.render("next");
});

app.get("/api/next-reel", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const reel = await getNextUpcomingReel();
    if (!reel) return res.json({ reel: null });

    const { mainUrl, fallbackUrl } = buildVideoUrls(reel.fileName);
    res.json({ reel, mainUrl, fallbackUrl });
  } catch (err) {
    console.error("Error loading next reel:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload-reel", async (req, res) => {
  try {
    const reel = await getNextUpcomingReel();
    if (!reel) return res.json({ error: "No pending reels" });

    const result = { fileName: reel.fileName, instagram: null, youtube: null };

    result.instagram = reel.igPosted
      ? { success: true, skipped: true }
      : await uploadReelToInstagram(reel);
    if (result.instagram.success && !result.instagram.skipped) {
      await markAsPosted(reel.rowIndex);
    }

    result.youtube = reel.ytPosted
      ? { success: true, skipped: true }
      : await uploadShortToYouTube(reel);
    if (result.youtube.success && !result.youtube.skipped) {
      await markYouTubePosted(reel.rowIndex);
    }

    result.success = result.instagram.success && result.youtube.success;
    res.json(result);
  } catch (err) {
    console.error("Error uploading reel:", err);
    res.status(500).json({ error: err.message });
  }
});


// ---------- YouTube Shorts Preview Page ----------
// app.get("/post-shorts", async (req, res) => {
//   const short = await getNextYouTubeShort();

//   if (!short) {
//     return res.render("postshorts", { short: null });
//   }

//   const videoUrl =
//     `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1766324641/Reels/${short.fileName}`;

//   res.render("postshorts", { short, videoUrl });
// });


app.get("/post-shorts", (req, res) => res.redirect("/next"));


// ---------- Upload to YouTube Shorts ----------
// ---------- Upload to YouTube Shorts ----------

function getYouTubeClient() {
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    "http://localhost:5000/oauth2callback"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
  });

  return google.youtube({ version: "v3", auth: oauth2Client });
}

// Local avatar proxy to ensure YouTube avatar displays reliably without browser/referrer blocking
app.get("/api/youtube-avatar", async (req, res) => {
  try {
    const youtube = getYouTubeClient();
    const ytRes = await youtube.channels.list({
      part: "snippet",
      mine: true,
    });
    const avatarUrl = ytRes.data.items?.[0]?.snippet?.thumbnails?.medium?.url;
    if (!avatarUrl) return res.status(404).send("No avatar found");

    const imageStream = await axios({
      url: avatarUrl,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      }
    });

    res.set("Content-Type", imageStream.headers["content-type"] || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    imageStream.data.pipe(res);
  } catch (err) {
    res.status(500).send("Avatar fetch error: " + err.message);
  }
});

// Route to initiate YouTube OAuth login
app.get("/auth/youtube", (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    "http://localhost:5000/oauth2callback"
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
    ],
  });

  res.redirect(authUrl);
});

// OAuth2 Callback endpoint to receive authorization code and save permanent refresh token
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No authorization code returned.");
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      "http://localhost:5000/oauth2callback"
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      process.env.YOUTUBE_REFRESH_TOKEN = tokens.refresh_token;

      // Update .env file permanently
      const envPath = path.join(__dirname, ".env");
      let envContent = fs.readFileSync(envPath, "utf8");
      if (envContent.includes("YOUTUBE_REFRESH_TOKEN=")) {
        envContent = envContent.replace(
          /YOUTUBE_REFRESH_TOKEN=.*/,
          `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`
        );
      } else {
        envContent += `\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
      }
      fs.writeFileSync(envPath, envContent, "utf8");

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>YouTube Connected</title></head>
        <body style="margin:0;padding:50px;background:#0b1120;color:#f8fafc;font-family:sans-serif;display:flex;justify-content:center;">
          <div style="max-width:480px;background:#111a2e;border:1px solid #233046;padding:32px;border-radius:16px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🎉</div>
            <h1 style="color:#22d3ee;margin:0 0 12px 0;">YouTube Connected!</h1>
            <p style="color:#94a3b8;font-size:15px;line-height:1.6;">Your permanent refresh token has been created and saved directly to your <code>.env</code> file.</p>
            <a href="/next" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#22d3ee;color:#0b1120;font-weight:bold;border-radius:10px;text-decoration:none;">🚀 Go to Next Upload</a>
          </div>
        </body>
        </html>
      `);
    } else {
      return res.send("⚠️ No refresh token was returned by Google. Please ensure prompt=consent is used.");
    }
  } catch (err) {
    return res.status(500).send("Error connecting to YouTube: " + err.message);
  }
});

// Legacy single-platform trigger, kept for manual/API use — the "Next Upload" page uses
// POST /api/upload-reel instead, which posts to both platforms in one call.
app.post("/upload-youtube", async (req, res) => {
  const short = await getNextYouTubeShort();
  if (!short) return res.json({ error: "No Youtube Shorts pending" });

  const result = await uploadShortToYouTube(short);
  if (!result.success) return res.json({ error: result.error });

  await markYouTubePosted(short.rowIndex);
  res.json({ success: true, videoId: result.videoId });
});



// ---------- Upload to Cloudinary + Sheet ----------
app.post("/upload-cloudinary", upload.single("video"), async (req, res) => {
  try {
    const caption = req.body.caption;
    const description = req.body.description;
    const title = req.body.title;


    // Use the original filename (without extension) for a clean look
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, "");

    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "Reels",
      public_id: originalName, // Force Cloudinary to use the real name
      overwrite: true
    });

    // Store the full path so the URL is always correct (e.g., "Reels/MyVideo.mp4")
    const fileName = uploaded.public_id + "." + uploaded.format;

    await appendRow(fileName, caption, description, title);

    res.send(`
      <script>
        alert("Video uploaded! Name: ${fileName}");
        window.location.href = "/upload";
      </script>
    `);

  } catch (e) {
    console.log(e);
    res.send("❌ Error: " + e.message);
  }
});


// Legacy single-platform trigger, kept for manual/API use — the "Next Upload" page uses
// POST /api/upload-reel instead, which posts to both platforms in one call.
app.post("/upload", async (req, res) => {
  const reel = await getNextReel();
  if (!reel) return res.json({ error: "No reels pending" });

  const result = await uploadReelToInstagram(reel);
  if (!result.success) return res.json({ error: result.error });

  await markAsPosted(reel.rowIndex);
  res.json({ success: true, postId: result.postId, videoUrlUsed: result.videoUrlUsed });
});


// ---------- Server ----------
app.listen(5000, () =>
  console.log("🚀 Server running at http://localhost:5000")
);