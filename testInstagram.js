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
    console.error("\n❌ Instagram connection failed!");

    const msg = err.message || "";
    const code = err.code || "";
    const isCertError =
      code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      msg.includes("unable to verify the first certificate") ||
      msg.includes("self-signed certificate");

    if (isCertError) {
      console.error("\n================ DIAGNOSTIC REPORT ================");
      console.error("🚨 ROOT CAUSE: Network Firewall SSL Interception / Block");
      console.error("Your current network (e.g. college/office LAN via Sophos Firewall)");
      console.error("is actively intercepting and blocking HTTPS traffic to Meta/Instagram");
      console.error("under the 'Social Networking' restricted category.");
      console.error("\n👉 HOW TO FIX THIS NOW:");
      console.error("1. [RECOMMENDED] Switch your internet connection to a Mobile Hotspot");
      console.error("   or a personal Wi-Fi network without social media restrictions.");
      console.error("2. Or turn on a VPN (e.g. Cloudflare WARP 1.1.1.1, ProtonVPN).");
      console.error("3. Or log into your network captive portal at:");
      console.error("   https://192.168.0.199:8090/httpclient.html");
      console.error("===================================================\n");
    } else if (err.response) {
      console.error("API Error Response:", err.response.data);
    } else {
      console.error("Error Message:", msg);
    }
  }
}

testInstagramConnection();
