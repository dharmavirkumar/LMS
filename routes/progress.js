const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const QRCode = require("qrcode");

const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const Enrollment = require("../models/Enrollment");

// ======================================================
// AUTH MIDDLEWARE
// ======================================================
const isLoggedIn = (req, res, next) => {
  if (!req.session?.user?._id) {
    return res.status(401).json({
      success: false,
      message: "Please login first."
    });
  }
  next();
};

// ======================================================
// SAVE COURSE PROGRESS
// ======================================================
router.post("/save-progress", isLoggedIn, async (req, res) => {
  try {
    const { courseId, lectureIndex, totalLectures } = req.body;
    const userId = req.session.user._id;

    // Validation
    if (
      !courseId ||
      lectureIndex === undefined ||
      !totalLectures
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID."
      });
    }

    const lectureNumber = Number(lectureIndex);
    const total = Number(totalLectures);

    if (isNaN(lectureNumber) || isNaN(total) || total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lecture data."
      });
    }

    let progress = await Progress.findOne({
      user: userId,
      course: courseId
    });

    if (!progress) {
      progress = new Progress({
        user: userId,
        course: courseId,
        completedLectures: [],
        totalLectures: total,
        lecturePercentage: 0,
        overallPercentage: 0
      });
    }

    // Add lecture only once
    if (!progress.completedLectures.includes(lectureNumber)) {
      progress.completedLectures.push(lectureNumber);
      progress.completedLectures.sort((a, b) => a - b);
    }

    progress.totalLectures = total;

    const percentage = Math.min(
      100,
      Math.floor(
        (progress.completedLectures.length / total) * 100
      )
    );

    progress.lecturePercentage = percentage;
    progress.overallPercentage = percentage;
    progress.lastWatchedLecture = lectureNumber;
    progress.lastAccessedAt = new Date();

    await progress.save();

    // Update enrollment progress
    await Enrollment.findOneAndUpdate(
      {
        user: userId,
        course: courseId
      },
      {
        $set: {
          progress: percentage,
          lastAccessedAt: new Date()
        }
      },
      {
        new: true
      }
    );

    return res.status(200).json({
      success: true,
      message: "Progress saved successfully.",
      percentage,
      completedLectures: progress.completedLectures
    });

  } catch (error) {
    console.error("Save Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
});



// ======================================================
// PROJECT PAGE ACCESS (100% REQUIRED)
// ======================================================
router.get("/projects/:courseId", isLoggedIn, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.session.user._id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      req.flash("error", "Invalid Course.");
      return res.redirect("/auth/dashboard");;
    }

    const progress = await Progress.findOne({
      user: userId,
      course: courseId
    });

    if (!progress || progress.overallPercentage < 100) {
      req.flash(
        "error",
        "Complete 100% course to unlock Projects."
      );
      return res.redirect(`/course/${courseId}`);
    }

    res.render("student/project-submit", {
      courseId,
      user: req.session.user
    });

  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong.");
    res.redirect("/auth/dashboard");;
  }
});

// ======================================================
// GET COURSE PROGRESS
// ======================================================
router.get("/progress/:courseId", isLoggedIn, async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID."
      });
    }

    const progress = await Progress.findOne({
      user: req.session.user._id,
      course: courseId
    });

    return res.status(200).json({
      success: true,
      progress: progress || {
        completedLectures: [],
        lecturePercentage: 0,
        overallPercentage: 0,
        totalLectures: 0,
        lastWatchedLecture: 0
      }
    });

  } catch (error) {
    console.error("Get Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch progress."
    });
  }
});

// ======================================================
// VIEW CERTIFICATE
// ======================================================
router.get("/certificate/:courseId", isLoggedIn, async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).send("Invalid Course ID.");
    }

    const certificate = await Certificate.findOne({
      user: req.session.user._id,
      course: courseId
    })
      .populate("user")
      .populate("course");

    if (!certificate) {
      return res.status(404).send(
        "Certificate not found. Please complete the course first."
      );
    }

    const verifyUrl = `${req.protocol}://${req.get("host")}/certificate/verify/${certificate.certificateId}`;

    const qrImage = await QRCode.toDataURL(verifyUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    return res.render("certificate", {
      title: "Course Certificate",
      user: certificate.user,
      course: certificate.course,
      certificate,
      qrImage,
      verifyUrl
    });

  } catch (error) {
    console.error("Certificate Error:", error);

    return res.status(500).send(
      "Unable to generate certificate."
    );
  }
});

// ======================================================
// VERIFY CERTIFICATE (BONUS ROUTE)
// ======================================================
router.get("/certificate/verify/:certificateId", async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({
      certificateId
    })
      .populate("user")
      .populate("course");

    if (!certificate) {
      return res.status(404).render("certificate-invalid");
    }

    return res.render("certificate-verify", {
      certificate
    });

  } catch (error) {
    console.error("Certificate Verification Error:", error);

    return res.status(500).send(
      "Verification failed."
    );
  }
});

module.exports = router;