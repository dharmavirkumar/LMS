const express = require("express");
const router = express.Router();
const axios = require("axios");

const LiveSession = require("../models/LiveSession");
const { getZoomAccessToken } = require("../utils/zoom");

// 🔒 Middleware
function isAdmin(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  if (req.session.user.role !== "admin") {
    return res.send("Access Denied ❌");
  }
  next();
}

// 📺 USER PAGE
// 📺 USER PAGE (GET)
router.get("/live-sessions", async (req, res) => {
  try {
    const sessions = await LiveSession.find().populate("course");

    res.render("liveSessions", {
      user: req.session.user,
      sessions
    });
  } catch (err) {
    res.send("Error loading sessions");
  }
});


// 🔥 ADMIN CREATE SESSION (AUTO ZOOM)
router.post("/admin/live-session", async (req, res) => {
  try {

    const { title, description, course, date, duration } = req.body;

    // ✅ FIX: direct use date
    const sessionDate = new Date(date);

    // 🔴 Zoom token
    const token = await getZoomAccessToken();

    // 🔴 Create meeting
    const zoomRes = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      {
        topic: title,
        type: 2,
        start_time: sessionDate.toISOString(),
        duration: Number(duration) || 60,
        timezone: "Asia/Kolkata",
        settings: {
          join_before_host: true
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const meeting = zoomRes.data;

    // ✅ Save
    await LiveSession.create({
      title,
      description,
      course: course || null,
      date: sessionDate,
      duration: Number(duration) || 60,
      zoomLink: meeting.join_url,
      meetingId: meeting.id
    });

    res.redirect("/live-sessions");

  } catch (err) {
    console.log("❌ ERROR:", err.response?.data || err.message);
    res.send("Error creating live session");
  }
});

module.exports = router;