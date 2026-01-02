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


// ---------- Routes ----------

// Home redirect
app.get("/", (req, res) => {
  res.redirect("/upload");
});

// Upload Page
app.get("/upload", (req, res) => {
  res.render("upload");
});

// Dashboard Page
// Dashboard Page
app.get("/dashboard", async (req, res) => {
  const rows = await getSheetData();

  const total = rows.length;

  // Column E (index 4) is Instagram Status
  // Column F (index 5) is YouTube Status
  const instaPending = rows.filter(r => r[4] !== "Posted").length;
  const ytPending = rows.filter(r => r[5] !== "Posted").length;

  res.render("dashboard", { total, instaPending, ytPending });
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

app.get("/post", async (req, res) => {
  try {
    const reel = await getNextReel();

    if (!reel) {
      return res.render("post", { reel: null, mainUrl: null, fallbackUrl: null });
    }

    const mainUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${reel.fileName}`;

    const fallbackUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1766324641/Reels/${reel.fileName}`;

    res.render("post", { reel, mainUrl, fallbackUrl });

  } catch (err) {
    console.error("Error loading reel:", err);
    res.render("post", { reel: null, mainUrl: null, fallbackUrl: null });
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


app.get("/post-shorts", async (req, res) => {
  try {
    const short = await getNextYouTubeShort();
 
    if (!short) { 
      return res.render("postshorts", { short: null, mainUrl: null, fallbackUrl: null });
    }

    const mainUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${short.fileName}`;

    const fallbackUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1766324641/Reels/${short.fileName}`;

    res.render("postshorts", { short, mainUrl, fallbackUrl });

  } catch (err) {
    console.error("Error loading shorts:", err);
    res.render("postshorts", { short: null, mainUrl: null, fallbackUrl: null });
  }
});


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

// Youtube upload route

// app.post("/upload-youtube", async (req, res) => {

//   try {
//     const short = await getNextYouTubeShort();
//     if (!short) return res.json({ error: "No Youtube Shorts pending" });

//     // 1. Download Video from Cloudinary to Temp File
//     const videoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${short.fileName}`;
//     const tempFilePath = path.join(__dirname, 'uploads', `temp_${short.fileName}`);

//     console.log(`📥 Downloading video from: ${videoUrl}`);
//     const writer = fs.createWriteStream(tempFilePath);
//     const response = await axios({
//       url: videoUrl,
//       method: 'GET',
//       responseType: 'stream'
//     });

//     response.data.pipe(writer);

//     // Wait for download to finish
//     await new Promise((resolve, reject) => {
//       writer.on('finish', resolve);
//       writer.on('error', reject);
//     });

//     // 2. Upload to YouTube
//     const youtube = getYouTubeClient();

//     console.log("🚀 Uploading to YouTube...");
//     const fileSize = fs.statSync(tempFilePath).size;

//     const resYoutube = await youtube.videos.insert({
//       part: "snippet,status",
//       requestBody: {
//         snippet: {
//           title: short.title,
//           description: short.description + "\n\n#Shorts",
//           tags: ["Shorts", "YouTubeShorts"],
//           categoryId: "22" // People & Blogs
//         },
//         status: {
//           privacyStatus: "public",   // or "private" / "unlisted"
//           selfDeclaredMadeForKids: false,
//         }
//       },
//       media: {
//         body: fs.createReadStream(tempFilePath),
//       }
//     });

//     console.log(`✅ Upload Complete! Video ID: ${resYoutube.data.id}`);

//     // 3. Cleanup & Mark as Posted
//     fs.unlinkSync(tempFilePath); // Delete temp file
//     await markYouTubePosted(short.rowIndex);

//     res.send(`
//       <script>
//         alert("YouTube Short Posted Successfully! Video ID: ${resYoutube.data.id}");
//         window.location.href='/post-shorts';
//       </script>
//     `);

//   } catch (err) {
//     console.error(err);
//     res.send("❌ Error: " + (err.message || JSON.stringify(err)));
//   }
// });




app.post("/upload-youtube", async (req, res) => {
  try {
    const short = await getNextYouTubeShort();
    if (!short) return res.json({ error: "No Youtube Shorts pending" });

    // ------------------- Build URLs -------------------
    const mainUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${short.fileName}`;
    const fallbackUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1766324641/Reels/${short.fileName}`;


    // Folder Directory creation 
// ---------------- TEMP DIRECTORY ----------------
const cleanName = path.basename(short.fileName);   // <-- IMPORTANT
const tempDir = "/tmp/temp_Reels";

fs.mkdirSync(tempDir, { recursive: true });

const tempFilePath = path.join(tempDir, `temp_${cleanName}`);
const writer = fs.createWriteStream(tempFilePath);


    let downloadUrl = mainUrl;
    console.log("📥 Trying main video URL:", downloadUrl);

    // ------------------- Try MAIN URL first -------------------
    try {
      const response = await axios({
        url: downloadUrl,
        method: "GET",
        responseType: "stream"
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

    } catch (error) {
      console.log("⚠️ Main URL failed. Trying fallback...");

      // ------------------- Try FALLBACK -------------------
      downloadUrl = fallbackUrl;
      const fallbackWriter = fs.createWriteStream(tempFilePath);

      const response2 = await axios({
        url: downloadUrl,
        method: "GET",
        responseType: "stream"
      });

      response2.data.pipe(fallbackWriter);

      await new Promise((resolve, reject) => {
        fallbackWriter.on("finish", resolve);
        fallbackWriter.on("error", reject);
      });
    }

    console.log(`✅ Downloaded successfully from: ${downloadUrl}`);

    // ------------------- Upload To YouTube -------------------
    const youtube = getYouTubeClient();
    console.log("🚀 Uploading to YouTube...");

    const resYoutube = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: short.title,
          description: short.description + "\n\n#Shorts",
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

    console.log(`✅ Upload Complete! Video ID: ${resYoutube.data.id}`);

    // Cleanup + mark posted
    fs.unlinkSync(tempFilePath);
    await markYouTubePosted(short.rowIndex);

    res.send(`
      <script>
        alert("YouTube Short Posted Successfully! Video ID: ${resYoutube.data.id}");
        window.location.href='/post-shorts';
      </script>
    `);

  } catch (err) {
    console.error(err);
    res.send("❌ Error: " + (err.message || JSON.stringify(err)));
  }
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


// ---------- Upload Reel to Instagram ----------
// app.post("/upload", async (req, res) => {
//   try {
//     const reel = await getNextReel();
//     if (!reel) return res.json({ error: "No reels pending" });

//     const videoUrl =
//       `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${reel.fileName}`;

//     // Create reel container
//     const createRes = await axios.post(
//       "https://graph.facebook.com/v23.0/" + process.env.IG_ID + "/media",
//       {
//         video_url: videoUrl,
//         caption: reel.caption,
//         media_type: "REELS",
//         access_token: process.env.META_TOKEN,
//       }
//     );

//     const creationId = createRes.data.id;

//     // Polling logic: Check status until FINISHED
//     let status = "IN_PROGRESS";
//     let attempts = 0;

//     while (status !== "FINISHED") {
//       if (attempts >= 30) { // 30 * 5s = 2.5 minutes timeout
//         throw new Error("Processing timeout: Video took too long to process on Instagram.");
//       }

//       await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
//       attempts++;

//       const statusRes = await axios.get(
//         `https://graph.facebook.com/v23.0/${creationId}`,
//         {
//           params: {
//             fields: "status_code",
//             access_token: process.env.META_TOKEN
//           }
//         }
//       );

//       status = statusRes.data.status_code;
//       console.log(`⏳ Processing Status: ${status} (Attempt ${attempts})`);

//       if (status === "ERROR" || status === "EXPIRED") {
//         throw new Error("Instagram Processing Failed: " + status);
//       }
//     }

//     // Publish Reel
//     const publishRes = await axios.post(
//       "https://graph.facebook.com/v23.0/" + process.env.IG_ID + "/media_publish",
//       {
//         creation_id: creationId,
//         access_token: process.env.META_TOKEN,
//       }
//     );

//     await markAsPosted(reel.rowIndex);

//     res.json({
//       success: true,
//       creationId,
//       postId: publishRes.data.id,
//     });

//   } catch (err) {
//     console.log(err.response?.data || err.message);
//     res.json({
//       error: err.response?.data?.error?.message || err.message
//     });
//   }
// });


app.post("/upload", async (req, res) => {
  try {
    const reel = await getNextReel();
    if (!reel) return res.json({ error: "No reels pending" });

    // ------------------- Build URLs -------------------
    const mainUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${reel.fileName}`;
    const fallbackUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1766324641/Reels/${reel.fileName}`;

    let videoUrl = mainUrl;
    console.log("🎥 Trying main Cloudinary URL for Instagram:", videoUrl);

    // ------------------- Try MAIN URL first -------------------
    try {
      await axios.head(videoUrl);
      console.log("✅ Main URL is valid!");
    } catch (err) {
      console.log("⚠️ Main URL failed, switching to fallback...");
      videoUrl = fallbackUrl;

      // Double check fallback exists
      await axios.head(videoUrl);
      console.log("✅ Fallback URL is valid!");
    }

    // ------------------- Create IG Reel Container -------------------
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

    // ------------------- Poll Status Until FINISHED -------------------
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
      console.log(`⏳ Processing Status: ${status} (Attempt ${attempts})`);

      if (status === "ERROR" || status === "EXPIRED") {
        throw new Error("Instagram Processing Failed: " + status);
      }
    }

    // ------------------- Publish Reel -------------------
    const publishRes = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.IG_ID}/media_publish`,
      {
        creation_id: creationId,
        access_token: process.env.META_TOKEN,
      }
    );

    await markAsPosted(reel.rowIndex);

    res.json({
      success: true,
      creationId,
      postId: publishRes.data.id,
      videoUrlUsed: videoUrl
    });

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.json({
      error: err.response?.data?.error?.message || err.message
    });
  }
});


// ---------- Server ----------
app.listen(5000, () =>
  console.log("🚀 Server running at http://localhost:5000")
);