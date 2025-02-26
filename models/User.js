const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  referralCode: { type: String, unique: true }, // Unique referral code
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Referrer

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date, index: { expires: '15m' } },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("User", UserSchema);