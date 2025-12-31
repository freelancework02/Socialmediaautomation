const cron = require("node-cron");
const { getPendingReel, markAsPosted } = require("../services/googleSheets");
const { uploadReel } = require("../services/instagram");

cron.schedule("0 9,18 * * *", async () => {
  try {
    const reel = await getPendingReel();
    if (!reel) return console.log("No reels to post");

    const videoUrl = `https://res.cloudinary.com/drzrtfh87/video/upload/Reels/${reel.fileName}`;

    await uploadReel(videoUrl, reel.description);
    await markAsPosted(reel.rowIndex);

    console.log("Reel posted successfully");
  } catch (err) {
    console.error("Error posting reel:", err.message);
  }
});
