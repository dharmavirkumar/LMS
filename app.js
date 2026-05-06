require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");

const Course = require("./models/Course");
// const ai = require('./routes/ai')
const paymentRoutes = require("./routes/payment");
const pageRoutes = require("./routes/pages");
const liveRoutes = require("./routes/liveSessions");
const progressRoutes = require("./routes/progress");
const blogRoutes = require("./routes/blog");

const app = express();


/* ============================================================
   DATABASE CONNECTIONss
============================================================ */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ============================================================
   VIEW ENGINE
============================================================ */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ============================================================
   MIDDLEWARE
============================================================ */
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "100mb"
}));

app.use(express.static(path.join(__dirname, "public")));

/* ============================================================
   SESSION
============================================================ */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-lms-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 Day
    }
  })
);

/* ============================================================
   FLASH MESSAGES
============================================================ */
app.use(flash());

/* ============================================================
   GLOBAL VARIABLES
============================================================ */
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

/* ============================================================
   ROUTES
============================================================ */

// ✅ ADD this new route
// HOME (TOP PE RAKHO)
app.get("/", async (req, res) => {
  try {
    const courses = await Course.find()
      .sort({ createdAt: -1 })
      .limit(6);

    res.render("home", {
      user: req.session.user || null,
      courses
    });
  } catch (error) {
    res.status(500).send("Home Error");
  }
});

// OTHER ROUTES
// app.use("/admin", require("./routes/admin"));
// app.use("/blogs", blogRoutes);
// app.use("/payment", paymentRoutes);
// app.use("/course", require("./routes/course"));

// 🔥 IMPORTANT CHANGE
// app.use("/auth", require("./routes/auth")); // instead of "/"
// app.use("/", pageRoutes);
// app.use("/", require("./routes/submission"));
// app.use("/", liveRoutes);
// app.use("/", progressRoutes);

app.use("/auth", require("./routes/auth"));        // login, register

app.use("/pages", pageRoutes);                 // static pages
app.use("/submission", require("./routes/submission"));
app.use("/live", liveRoutes);
app.use("/progress", progressRoutes);
app.use("/ai", require("./routes/ai"));
app.use("/admin", require("./routes/admin"));
app.use("/course", require("./routes/course"));
app.use("/payment", paymentRoutes);
app.use("/blogs", blogRoutes);

app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});
/* ============================================================
   SERVER
============================================================ */
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});