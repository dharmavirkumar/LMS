require("dotenv").config();
const express = require("express");
const crypto = require("crypto");

const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

const router = express.Router();

// ✅ Razorpay lazy init (CRASH SAFE)
let razorpay = null;

function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.log("⚠ Razorpay keys missing");
    return null;
  }

  if (!razorpay) {
    const Razorpay = require("razorpay");

    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpay;
}

//
// ================= CREATE ORDER =================
//
router.post("/create-order", async (req, res) => {
  try {
    const instance = getRazorpayInstance();

    if (!instance) {
      return res.status(500).json({
        success: false,
        message: "Payment system not configured",
      });
    }

    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID required",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ✅ Ensure valid price
    const amount = Number(course.price);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid course price",
      });
    }

    const options = {
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `receipt_${course._id}_${Date.now()}`
    };

    const order = await instance.orders.create(options);

    return res.json({
      success: true,
      order,
    });

  } catch (err) {
    console.error("Create Order Error:", err);

    return res.status(500).json({
      success: false,
      message: "Order creation failed",
    });
  }
});

//
// ================= VERIFY PAYMENT =================
//
router.post("/verify", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "User not logged in",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment data",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Payment verification not configured",
      });
    }

    // 🔐 SIGNATURE VERIFY
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // ✅ ENROLL USER (NO DUPLICATE)
    await Enrollment.findOneAndUpdate(
      {
        user: req.session.user._id,
        course: courseId,
      },
      {
        $setOnInsert: {
          progress: 0,
          enrolledAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return res.json({
      success: true,
      message: "Payment verified & enrolled",
    });

  } catch (err) {
    console.error("Verify Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error during verification",
    });
  }
});

module.exports = router;