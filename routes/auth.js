const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

const router = express.Router();


// ================= HOME =================


// ✅ ROOT ROUTE


// ================= REGISTER =================
router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);

    await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hash
    });

    res.redirect("/auth/login");

  } catch (err) {
    console.log(err);
    res.send("Error in registration");
  }
});


// ================= LOGIN =================
router.get("/login", (req, res) => {
  res.render("login");
});


router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.send("User not found");
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res.send("Wrong password");
    }

    // ✅ IMPORTANT CHANGE (ROLE ADD)
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || "user"   // 🔥 THIS LINE
    };

    req.session.save(() => {

      // ✅ ROLE BASED REDIRECT
      if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
      }

      res.redirect("/");
    });

  } catch (err) {
    console.log(err);
    res.send("Login error");
  }
});


// ================= AUTH MIDDLEWARE =================
function isLoggedIn(req, res, next) {
  if (!req.session.user) {
 return res.redirect("/auth/login");
  }
  next();
}


// ================= DASHBOARD =================
router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      user: req.session.user._id
    });

    const courseIds = enrollments
      .filter(e => e.course)
      .map(e => e.course);

    const courses = await Course.find({
      _id: { $in: courseIds }
    });

    const courseData = courses.map(course => {
      const enroll = enrollments.find(
        e => e.course && e.course.equals(course._id)
      );

      return {
        ...course._doc,
        progress: enroll ? enroll.progress : 0
      };
    });

    res.render("dashboard", {
      user: req.session.user,
      courses: courseData
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});
// ================= LOGOUT =================
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.redirect("/auth/dashboard");;
    }

    res.clearCookie("connect.sid");
    res.redirect("/auth/login");
  });
});


module.exports = router;