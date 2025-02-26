const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const crypto = require("crypto"); // Ensure this line is added at the top

require("dotenv").config();

const app = express();
connectDB();

app.use(express.json());
app.use(cors());
app.use(cors({ origin: ["http://localhost:3000","http://localhost:300/forgot-password"], credentials: true }));
app.get("/", (req, res) => {
    res.send("API is running...");
  });

app.use("/api/auth", require("./routes/auth"));
app.use("/api/referrals", require("./routes/referral"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
