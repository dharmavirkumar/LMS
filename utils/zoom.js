const axios = require("axios");

async function getZoomAccessToken() {
  try {
    const res = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
      {},
      {
        auth: {
          username: process.env.ZOOM_CLIENT_ID,
          password: process.env.ZOOM_CLIENT_SECRET
        }
      }
    );

    return res.data.access_token;

  } catch (err) {
    console.log("Zoom Token Error:", err.response?.data || err.message);
  }
}

module.exports = { getZoomAccessToken };