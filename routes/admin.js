const express = require("express");
const mongoose = require('mongoose')
const multer = require("multer");
const Course = require("../models/Course");
const Task = require("../models/Task");
const User = require("../models/User");
const TaskAssignment = require("../models/TaskAssignment");
const Submission = require("../models/Submission");
const Progress = require("../models/Progress");
const { cloudinary } = require("../config/cloudinary");


const router = express.Router();

// upload config

const { CloudinaryStorage } = require("multer-storage-cloudinary");


function isAdmin(req, res, next) {
  if (!req.session.user) {
 return res.redirect("/auth/login");
  }

  if (req.session.user.role !== "admin") {
    return res.send("Access Denied ❌");
  }

  next();
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "lms_misc";

    if (file.fieldname === "videos") {
      folder = "lms_videos";
    } else if (file.fieldname === "thumbnail") {
      folder = "lms_thumbnails";
    } else if (file.fieldname === "avatar") {
      folder = "lms_profiles";
    }

    return {
      folder,
      resource_type: file.mimetype.startsWith("video")
        ? "video"
        : "image",
      public_id: `${Date.now()}-${file.originalname
  .split(".")[0]
  .replace(/[^\w]/g, "_")}`
    };
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});
// ================== ADMIN DASHBOARD ==================
router.get("/dashboard", isAdmin, async (req, res) => {
  try {
    const courses = await Course.find();
    const tasks = await Task.find();
    const submissions = await Submission.find();

    res.render("admin-dashboard", {
      courses,
      tasks,
      submissions,
      selectedCourse: null
    });
  } catch (err) {
    console.log(err);
    res.send("Dashboard error");
  }
});

// ================== ADD COURSE ==================

router.get("/add-course", isAdmin, (req, res) => {
  res.render("add-course");
});


router.post("/add-course", isAdmin, upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "videos", maxCount: 200 }
]), async (req, res) => {

const modules = [];

const moduleIds = [].concat(req.body.moduleId || []);
const moduleTitles = [].concat(req.body.moduleTitle || []);

const lessonTitles = [].concat(req.body.lessonTitle || []);
const lessonModuleIds = [].concat(req.body.lessonModuleId || []);

const lessonVideos = req.files?.videos || [];

for (let i = 0; i < moduleIds.length; i++) {

  modules.push({
    id: moduleIds[i],
    title: moduleTitles[i],
    lessons: []
  });

}

let videoIndex = 0;

for (let i = 0; i < lessonTitles.length; i++) {

  const moduleId = lessonModuleIds[i];

  const moduleIndex = modules.findIndex(
    m => m.id === moduleId
  );

  if (moduleIndex === -1) continue;

  modules[moduleIndex].lessons.push({
    title: lessonTitles[i],
    videos: lessonVideos[videoIndex]
      ? [lessonVideos[videoIndex].path]
      : []
  });

  videoIndex++;
}

const finalModules = modules.map(m => ({
  title: m.title,
  lessons: m.lessons
}));

  const careerTitles = [].concat(req.body.careerTitle || []);
  const careerDescs = [].concat(req.body.careerDesc || []);

  const careerBenefits = careerTitles.map((t, i) => ({
    title: t,
    description: careerDescs[i] || ""
  }));

  await Course.create({
    title: req.body.title,
    description: req.body.description,
    price: req.body.price,
    category: req.body.category,
    thumbnail: req.files.thumbnail?.[0]?.path || "",
    modules: finalModules,
    overview: req.body.overview || "",
    content: [].concat(req.body.content || []),
    objectives: [].concat(req.body.objectives || []),
    features: [].concat(req.body.features || []),
    certifications: [].concat(req.body.certifications || []),
    careerBenefits
  });

  res.redirect("/admin/dashboard");
});
// ================== EDIT COURSE ==================
router.get("/edit/:id", isAdmin, async (req, res) => {
  const course = await Course.findById(req.params.id);
  res.render("edit-course", { course });
});

router.post("/edit/:id", isAdmin, upload.any(), async (req, res) => {
  try {

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.send("Course not found");
    }

    const moduleIds = [].concat(req.body.moduleId || []);
    const moduleTitles = [].concat(req.body.moduleTitle || []);

    const lessonIds = [].concat(req.body.lessonId || []);
    const lessonTitles = [].concat(req.body.lessonTitle || []);
    const lessonModuleIds = [].concat(req.body.lessonModuleId || []);
    const lessonFileKeys = [].concat(req.body.lessonFileKey || []);

    const modules = [];

    // ================= CREATE MODULES =================

    for (let i = 0; i < moduleIds.length; i++) {

      const rawId = moduleIds[i];

      modules.push({
        _id: rawId.startsWith("new")
          ? new mongoose.Types.ObjectId()
          : rawId,

        title: moduleTitles[i],
        lessons: []
      });
    }

    // ================= OLD LESSON MAP =================

    const oldLessons = {};

    course.modules.forEach((mod) => {

      mod.lessons.forEach((lesson) => {

        oldLessons[lesson._id.toString()] = {
          title: lesson.title,
          videos: lesson.videos || []
        };

      });

    });

    // ================= BUILD LESSONS =================

    // ================= BUILD LESSONS =================
for (let i = 0; i < lessonIds.length; i++) {

  const lessonId = lessonIds[i];
  const lessonTitle = lessonTitles[i];
  const moduleRef = lessonModuleIds[i];
  const fileKey = lessonFileKeys[i];

  const moduleIndex = modules.findIndex(
    m => m._id.toString() === moduleRef
  );

  if (moduleIndex === -1) continue;

  let videosArray = [];

  // OLD VIDEOS KEEP
  if (oldLessons[lessonId]) {
    videosArray = [...oldLessons[lessonId].videos];
  }

  // NEW VIDEO FILE
  const uploadedFiles = req.files.filter(
    f => f.fieldname === fileKey
  );

  if (uploadedFiles.length > 0) {

    const newVideos = uploadedFiles.map(file => file.path);

    videosArray = [...videosArray, ...newVideos];
  }

  modules[moduleIndex].lessons.push({
    _id:
      lessonId === "new"
        ? new mongoose.Types.ObjectId()
        : lessonId,

    title: lessonTitle,
    videos: videosArray
  });
}
course.modules = modules;
// await course.save();

    // ================= THUMBNAIL =================

    let thumbnail = course.thumbnail;

    const thumb = req.files.find(
      file => file.fieldname === "thumbnail"
    );

    if (thumb) {
      thumbnail = thumb.path;
    }

    // ================= UPDATE =================

    await Course.findByIdAndUpdate(req.params.id, {

      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      overview: req.body.overview,
      thumbnail,
      modules

    });

    res.redirect("/admin/dashboard");

  } catch (err) {

    console.log(err);
    res.send(err.message);

  }
});
// ================== DELETE COURSE ==================
router.post("/delete/:id", isAdmin, async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.redirect("/admin/dashboard");
});



router.get("/add-task", isAdmin, async (req, res) => {
  const courses = await Course.find();
  const selectedCourse = req.query.course || null;

  res.render("add-task", { courses, selectedCourse });
});

// router.post("/add-task", async (req, res) => {
//   try {
//     const { title, description, dueDate, course } = req.body;

//     await Task.create({
//       title,
//       description,
//       dueDate,
//       course
//     });

//     res.redirect("/admin/dashboard");

//   } catch (err) {
//     console.log(err);
//     res.send("Error creating task");
//   }
// });

// router.get("/tasks", async (req, res) => {
//   const tasks = await Task.find().populate("course");
//   res.render("admin/tasks", { tasks });
// });

// =============================
// REPLACE YOUR POST /add-task
// =============================
router.post("/add-task", isAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      course,
      studentEmail
    } = req.body;

    // Create Task
    const task = await Task.create({
      title,
      description,
      dueDate,
      course
    });

    // If email entered, assign instantly
    if (studentEmail && studentEmail.trim() !== "") {
      const user = await User.findOne({
        email: studentEmail.toLowerCase().trim()
      });

      if (user) {
        await TaskAssignment.create({
          user: user._id,
          task: task._id,
          course: course,
          assignedAt: new Date(),
          dueDate: dueDate || null,
          status: "assigned"
        });
      }
    }

    req.flash("success", "Task created successfully!");
    res.redirect("/admin/add-task");

  } catch (err) {
    console.error(err);
    req.flash("error", "Error creating task");
    res.redirect("/admin/add-task");
  }
});

// ================== VIEW SUBMISSIONS ==================
router.get("/submissions", isAdmin, async (req, res) => {
  const submissions = await Submission.find()
    .populate("user")
    .populate({
      path: "task",
      populate: { path: "course" }
    });

  res.render("admin-submissions", { submissions });
});

// ✅ APPROVE
router.post("/approve-submission/:id", isAdmin, async (req, res) => {

  const submission = await Submission.findById(req.params.id)
    .populate("task");

  submission.status = "approved";
  await submission.save();

  res.redirect("/admin/submissions");
});

// ❌ REJECT
router.post("/reject-submission/:id", isAdmin, async (req, res) => {

  await Submission.findByIdAndUpdate(req.params.id, {
    status: "rejected"
  });

  res.redirect("/admin/submissions");
});


module.exports = router;