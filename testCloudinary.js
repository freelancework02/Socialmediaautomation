require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testCloudinary() {
  try {
    console.log("🔍 Testing Cloudinary connection...");

    const result = await cloudinary.uploader.upload(
      "https://res.cloudinary.com/demo/image/upload/sample.jpg", 
      {
        folder: "Test",
        public_id: "cloudinary_test",
        overwrite: true
      }
    );

    console.log("✅ Cloudinary Connected Successfully!");
    console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    console.log("Test File URL:", result.secure_url);

  } catch (error) {
    console.log("❌ Cloudinary Connection Failed");
    console.log(error.message);
  }
}

testCloudinary();
