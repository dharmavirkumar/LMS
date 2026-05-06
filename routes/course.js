const express = require("express");
const path = require("path");
const fs = require("fs");

const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
// routes/course.js
// ✅ Add this at the TOP with your other imports

const { cloudinary } = require("../config/cloudinary");

const router = express.Router();

// ✅ TOP par import karein
// const Task = require("../models/Task");
const TaskAssignment = require("../models/Task");


// ============================================================
// AUTO ASSIGN PROJECTS (60 DAYS)
// ============================================================
async function autoAssignProjects(userId, courseId) {
  try {
    const tasks = await Task.find({
      course: courseId
    }).sort({ createdAt: 1 });

    if (!tasks.length) return;

    const purchaseDate = new Date();
    const totalDays = 60;
    const gap = Math.max(1, Math.floor(totalDays / tasks.length));

    for (let i = 0; i < tasks.length; i++) {
      const dueDate = new Date(purchaseDate);
      dueDate.setDate(dueDate.getDate() + ((i + 1) * gap));

      await TaskAssignment.create({
        user: userId,
        course: courseId,
        task: tasks[i]._id,
        assignedAt: purchaseDate,
        dueDate,
        status: "assigned"
      });
    }

    console.log(`✅ ${tasks.length} projects auto-assigned`);
  } catch (error) {
    console.error("Auto Assign Error:", error);
  }
}

/* ============================================================
   ALL COURSES
============================================================ */
router.get("/", async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = {};

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i"
      };
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    const courses = await Course.find(filter).sort({ createdAt: -1 });

    res.render("index", {
      courses,
      selectedCategory: category || "All",
      searchQuery: search || "",
      user: req.session.user || null
    });

  } catch (error) {
    console.error("Courses Error:", error);
    res.status(500).send("Unable to load courses");
  }
});

/* ============================================================
   COURSE PLAYER (IMPORTANT: MUST COME BEFORE /:id)
============================================================ */
router.get("/player/:id", async (req, res) => {
  try {
    if (!req.session.user) {
      req.flash("error", "Please login first");
   return res.redirect("/auth/login");
    }

    const enrollment = await Enrollment.findOne({
      user: req.session.user._id,
      course: req.params.id
    });

    if (!enrollment) {
      req.flash("error", "Please enroll first");
      return res.redirect(`/course/${req.params.id}`);
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/course");
    }

    let lesson = null;

    if (
      course.modules?.length &&
      course.modules[0].lessons?.length
    ) {
      lesson = course.modules[0].lessons[0];
    }

    res.render("player", {
      course,
      lesson,
      user: req.session.user,
      enrollment
    });

  } catch (error) {
    console.error("Player Error:", error);
    req.flash("error", "Unable to open player");
    res.redirect("/auth/dashboard");;
  }
});


/* ============================================================
   SECURE VIDEO STREAMING (Cloudinary)
============================================================ */
/* ============================================================
   SECURE VIDEO STREAMING (Express 5 + Cloudinary)
============================================================ */
/* ============================================================
   SECURE CLOUDINARY VIDEO STREAM
============================================================ */
router.get(/^\/secure-video\/(.+)/, async (req, res) => {
  try {
    // ✅ Login Required
    if (!req.session.user) {
      return res.status(401).send("Unauthorized");
    }

    // ✅ Enrollment Required
    const enrolled = await Enrollment.findOne({
      user: req.session.user._id,
      course: req.query.courseId
    });

    if (!enrolled) {
      return res.status(403).send("Please enroll first");
    }

    // ✅ Cloudinary Public ID
    const publicId = decodeURIComponent(req.params[0]);

    // ✅ Generate Secure Streaming URL
    const videoUrl = cloudinary.url(publicId, {
      resource_type: "video",
      secure: true,
      format: "mp4"
    });

    console.log("Cloudinary Video URL:", videoUrl);

    // ✅ Redirect to Cloudinary CDN
    return res.redirect(videoUrl);

  } catch (error) {
    console.error("Video Stream Error:", error);
    return res.status(500).send("Video streaming failed");
  }
});

/* ============================================================
   SINGLE COURSE
============================================================ */
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      req.flash("error", "Course not found");
      return res.redirect("/course");
    }

    let isEnrolled = false;

    if (req.session.user) {
      const enrollment = await Enrollment.findOne({
        user: req.session.user._id,
        course: req.params.id
      });

      isEnrolled = !!enrollment;
    }

    res.render("course", {
      course,
      isEnrolled,
      user: req.session.user || null
    });

  } catch (error) {
    console.error("Course Details Error:", error);
    res.status(500).send("Unable to load course");
  }

});

/* ============================================================
   ENROLL COURSE
============================================================ */
router.post("/enroll/:id", async (req, res) => {
  try {
    if (!req.session.user) {
      req.flash("error", "Please login first");
   return res.redirect("/auth/login");
    }

    const userId = req.session.user._id;
    const courseId = req.params.id;

    // Check if already enrolled
    const alreadyEnrolled = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!alreadyEnrolled) {
      // Create Enrollment
      await Enrollment.create({
        user: userId,
        course: courseId,
        progress: 0
      });

      // Auto Assign Projects for 60 Days
      await autoAssignProjects(userId, courseId);
    }

    req.flash("success", "Successfully enrolled!");
    return res.redirect(`/course/player/${courseId}`);

  } catch (error) {
    console.error("Enrollment Error:", error);
    req.flash("error", "Enrollment failed");
    return res.redirect(`/course/${req.params.id}`);
  }
});

/* ============================================================
   UPDATE PROGRESS
============================================================ */
router.post("/progress/:courseId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await Enrollment.findOneAndUpdate(
      {
        user: req.session.user._id,
        course: req.params.courseId
      },
      {
        progress: Number(req.body.progress) || 0
      }
    );

    res.json({
      success: true
    });

  } catch (error) {
    console.error("Progress Error:", error);
    res.status(500).json({
      success: false
    });
  }
});

module.exports = router;