// routes/blog.js
const express = require("express");
const router = express.Router();

const Blog = require("../models/Blog");
const Course = require("../models/Course");
const { uploadImage } = require("../config/cloudinary");


//Admin can approve/reject blogs from admin dashboard (not implemented yet, so all blogs are auto-approved for now)
// routes/admin.js
// ================= BLOG MANAGEMENT =================
// ================= ADMIN MIDDLEWARE =================
// function isAdmin(req, res, next) {
//   if (!req.session.user) {
//     req.flash("error", "Please login first");
//  return res.redirect("/auth/login");
//   }

//   if (req.session.user.role !== "admin") {
//     req.flash("error", "Access denied");
//     return res.redirect("/");
//   }

//   next();
// }
// All Blogs
// ================= TEMP ADMIN MIDDLEWARE =================
const isAdmin = (req, res, next) => {
  next();
};
// ================= ADMIN BLOG MANAGEMENT =================

// All Blogs
router.get("/admin", isAdmin, async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate("author", "name email avatar")
      .populate("course", "title")
      .sort({ createdAt: -1 });

    res.render("admin-blogs", {
      blogs,
      user: req.session.user
    });

  } catch (error) {
    console.error(error);
    req.flash("error", "Unable to load blogs");
    res.redirect("/admin");
  }
});

// Approve Blog
router.post("/admin/:id/approve", isAdmin, async (req, res) => {
  try {
    await Blog.findByIdAndUpdate(req.params.id, {
      status: "approved"
    });

    req.flash("success", "Blog approved successfully");
    res.redirect("/blogs/admin");

  } catch (error) {
    console.error(error);
    req.flash("error", "Approval failed");
    res.redirect("/blogs/admin");
  }
});

// Reject Blog
router.post("/admin/:id/reject", isAdmin, async (req, res) => {
  try {
    await Blog.findByIdAndUpdate(req.params.id, {
      status: "rejected"
    });

    req.flash("success", "Blog rejected successfully");
    res.redirect("/blogs/admin");

  } catch (error) {
    console.error(error);
    req.flash("error", "Rejection failed");
    res.redirect("/blogs/admin");
  }
});

// Create Blog Page
router.get("/create", async (req, res) => {
  if (!req.session.user) {
    req.flash("error", "Please login first");
 return res.redirect("/auth/login");
  }

  const courses = await Course.find();

  res.render("blogcreate", {
    courses,
    user: req.session.user
  });
});

// Save Blog
router.post(
  "/create",
  uploadImage.single("thumbnail"),
  async (req, res) => {
    try {
      if (!req.session.user) {
        req.flash("error", "Please login first");
     return res.redirect("/auth/login");
      }

      const {
        title,
        summary,
        githubUrl,
        liveUrl,
        course
      } = req.body;

      await Blog.create({
        title,
        summary,
        githubUrl,
        liveUrl,
        course,
        thumbnail: req.file.path,
        author: req.session.user._id
      });

      req.flash(
        "success",
        "Blog submitted successfully. Waiting for admin approval."
      );

      res.redirect("/blogs/my");

    } catch (error) {
      console.error(error);
      req.flash("error", "Unable to create blog");
      res.redirect("/blogcreate");
    }
  }
);

// My Blogs
// ================= MY BLOGS =================
router.get("/my", async (req, res) => {
  try {
    // Login Check
    if (!req.session.user) {
      req.flash("error", "Please login first");
   return res.redirect("/auth/login");
    }

    const blogs = await Blog.find({
      author: req.session.user._id
    })
      .populate("course")
      .sort({ createdAt: -1 });

    res.render("bloglisting", {
      blogs,
      user: req.session.user
    });

  } catch (error) {
    console.error("My Blogs Error:", error);
    req.flash("error", "Unable to load blogs");
    res.redirect("/auth/dashboard");;
  }
});

// Public Blogs
router.get("/", async (req, res) => {
  const blogs = await Blog.find({
    status: "approved"
  })
    .populate("author", "name avatar")
    .populate("course", "title")
    .sort({ createdAt: -1 });

  res.render("bloglisting", {
    blogs,
    user: req.session.user || null
  });
});

// Single Blog
// ================= SINGLE BLOG =================
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("author", "name avatar")
      .populate("course", "title");

    if (!blog) {
      req.flash("error", "Blog not found");
      return res.redirect("/blogs");
    }

    // Owner apna pending/rejected blog dekh sakta hai
    const isOwner =
      req.session.user &&
      blog.author &&
      blog.author._id.toString() === req.session.user._id.toString();

    // Public users sirf approved blogs dekh sakte hain
    if (blog.status !== "approved" && !isOwner) {
      req.flash("error", "Blog not available");
      return res.redirect("/blogs");
    }

    res.render("blogshow", {
      blog,
      user: req.session.user || null
    });

  } catch (error) {
    console.error("Blog Details Error:", error);
    req.flash("error", "Unable to load blog");
    res.redirect("/blogs");
  }
});


module.exports = router;