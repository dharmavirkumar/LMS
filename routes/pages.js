const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Course = require("../models/Course");
// const Task = require("../models/Task");
const TaskAssignment = require("../models/TaskAssignment");
const Submission = require("../models/Submission");
const Certificate = require("../models/Certificate");
const Enrollment = require("../models/Enrollment");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");


const User = require("../models/User");
const Progress = require("../models/Progress");





// ================= REQUIRED IMPORTS =================
const {
  cloudinary,
  uploadImage,
  uploadVideo
} = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// ================= CLOUDINARY STORAGE =================
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "gyansify/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      {
        width: 500,
        height: 500,
        crop: "fill",
        gravity: "face"
      }
    ]
  }
});

const upload = multer({ storage });


// 🔒 auth middleware
function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}

// 👤 PROFILE PAGE
// PROFILE PAGE
router.get("/pages/profile", isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  res.render("profile", { user });
});

// EDIT PAGE
router.get("/pages/profile/edit", isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  res.render("editProfile", { user });
});

// UPDATE PROFILE
router.post("/pages/profile/update", isLoggedIn, upload.single("avatar"), async (req, res) => {

  const { name, bio } = req.body;

  const updateData = {
    name,
    bio
  };

  if (req.file) {
    updateData.avatar = req.file.path;
  }

  await User.findByIdAndUpdate(req.session.user._id, updateData);

  res.redirect("/pages/profile");
});




// ================= INTERNSHIP =================


// router.get("/internship", async (req, res) => {
//   try {
//     if (!req.session.user) return res.redirect("/auth/login");

//     const userId = req.session.user._id;

//     const enrollments = await Enrollment.find({ user: userId })
//       .populate("course");

//     const courses = enrollments.map(e => e.course).filter(Boolean);
//     const courseIds = courses.map(c => c._id);

//     const tasks = await Task.find({
//       course: { $in: courseIds }
//     }).populate("course");

//     const submissions = await Submission.find({ user: userId });

//     const completed = submissions.filter(s => s.status === "approved").length;

//     // ✅ ADD THIS LINE (MOST IMPORTANT)
//     const progresses = await Progress.find({ user: userId });

//     res.render("internship", {
//       user: req.session.user._id,
//       courses,
//       tasks,
//       submissions,
//       completed,
//       progresses   // ✅ now defined
//     });

//   } catch (err) {
//     console.log(err);
//     res.send("Error loading internship page");
//   }
// });

// ================= INTERNSHIP (UPDATED) =================

router.get("/internship", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/auth/login");

    const userId = req.session.user._id;

    const enrollments = await Enrollment.find({
      user: userId
    }).populate("course");

    const courses = enrollments.map(e => e.course).filter(Boolean);

    const assignments = await TaskAssignment.find({
      user: userId
    })
    .populate({
      path: "task",
      populate: {
        path: "course"
      }
    })
    .sort({ assignedAt: -1 });

    const tasks = assignments.map(a => ({
      ...a.task.toObject(),
      dueDate: a.dueDate,
      assignmentId: a._id
    }));

    const submissions = await Submission.find({
      user: userId
    });

    const completed = submissions.filter(
      s => s.status === "approved"
    ).length;

    const progresses = await Progress.find({
      user: userId
    });

    res.render("internship", {
      user: req.session.user,
      courses,
      tasks,
      submissions,
      completed,
      progresses
    });

  } catch (err) {
    console.error(err);
    res.send("Error loading internship page");
  }
});

router.post("/generate-certificate", isLoggedIn, async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.session.user._id;

    // ✅ Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid course ID"
      });
    }

    // ✅ Check enrollment
    const enrolled = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!enrolled) {
      return res.status(403).json({
        success: false,
        msg: "You are not enrolled in this course"
      });
    }

    // ✅ (OPTIONAL BUT BEST) Check completion
    if ((enrolled.progress || 0) < 100) {
      return res.status(400).json({
        success: false,
        msg: "Complete the course to get certificate"
      });
    }

    // ✅ Prevent duplicate (atomic way)
    let cert = await Certificate.findOneAndUpdate(
      { user: userId, course: courseId },
      {
        $setOnInsert: {
          certificateId:
            "GYAN-" + uuidv4().slice(0, 8).toUpperCase()
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    return res.json({
      success: true,
      certificateId: cert.certificateId
    });

  } catch (err) {
    console.error("❌ Certificate Error:", err);

    return res.status(500).json({
      success: false,
      msg: "Server error"
    });
  }
});


// ================= VERIFY CERTIFICATE =================
router.get("/certificate/verify/:id", async (req, res) => {
  try {
    const cert = await Certificate.findOne({
      certificateId: req.params.id
    }).populate("user course");

    if (!cert) {
      return res.send("❌ Invalid Certificate");
    }

    res.render("verifyCertificate", { cert });

  } catch (err) {
    console.log(err);
    res.send("Verification error");
  }
});



router.get('/credibility', async (req, res) => {
  try {
    const courses = await Course.find().limit(6);

    res.render('OurCredibility', {
      courses: courses || []   // 🔥 IMPORTANT
    });

  } catch (err) {
    console.log(err);

    res.render('OurCredibility', {
      courses: []              // 🔥 fallback
    });
  }

  
});

router.get('/about',(req,res)=>{
   res.render("about")
  })

  router.get('/privacypolicy',(req,res)=>{
   res.render("Privacypolicy")
  })

   router.get('/frequently',(req,res)=>{
   res.render("frequently")
  })

  router.get('/refundpolicy',(req,res)=>{
   res.render("refundpolicy")
  })

module.exports = router;