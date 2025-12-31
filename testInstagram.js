require("dotenv").config();
const axios = require("axios");

async function testInstagramConnection() {
  try {
    const url = `https://graph.facebook.com/v23.0/${process.env.IG_ID}`;
    
    const res = await axios.get(url, {
      params: {
        fields: "id,username,name,followers_count,media_count",
        access_token: process.env.META_TOKEN,
      },
    });

    console.log("✅ Instagram connection successful!\n");
    console.log("Instagram Account Details:");
    console.log("ID             :", res.data.id);
    console.log("Username       :", res.data.username);
    console.log("Name           :", res.data.name);
    console.log("Followers      :", res.data.followers_count);
    console.log("Total Media    :", res.data.media_count);
  } catch (err) {
    console.error("❌ Instagram connection failed");
    if (err.response) {
      console.error("Error:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

testInstagramConnection();
