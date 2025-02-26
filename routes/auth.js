const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator"); // Validation library
const crypto = require("crypto"); // Ensure this line is added at the top

require("dotenv").config();

const router = express.Router();

// ✅ User Registration with Validation
router.post(
    "/register",
    [
        // Validate Email Format
        body("email").isEmail().withMessage("Invalid email format"),

        // Validate Password Strength
        body("password")
            .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
            .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
            .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
            .matches(/[0-9]/).withMessage("Password must contain at least one number")
            .matches(/[@$!%*?&]/).withMessage("Password must contain at least one special character (@$!%*?&)"),

        // Validate Username (no special characters, min 3 chars)
        body("username")
            .isLength({ min: 3 }).withMessage("Username must be at least 3 characters long")
            .matches(/^[a-zA-Z0-9]+$/).withMessage("Username can only contain letters and numbers"),

        // Referral Code (Optional but must be valid if provided)
        body("referralCode")
            .optional()
            .custom(async (value) => {
                if (value) {
                    const referrer = await User.findOne({ referralCode: value });
                    if (!referrer) {
                        throw new Error("Invalid referral code");
                    }
                }
                return true;
            }),
    ],
    async (req, res) => {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { username, email, password, referralCode } = req.body;

            if (referralCode === username) {
                return res.status(400).json({ message: "You cannot refer yourself." });
            }
            // Check for duplicate email
            if (await User.findOne({ email })) {
                return res.status(400).json({ message: "Email already exists" });
            }

            // Check for duplicate username
            if (await User.findOne({ username })) {
                return res.status(400).json({ message: "Username already exists" });
            }

            // Generate unique referral code
            const userReferralCode = username;

            // Find referrer (if referral code exists)
            let referrer = null;
            if (referralCode) {
                referrer = await User.findOne({ referralCode });
            }

            // Hash password before saving
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create new user
            const user = new User({
                username,
                email,
                password,
                referralCode: userReferralCode,
                referredBy: referrer ? referrer._id : null,
            });

            await user.save();

            res.status(201).json({
                message: "User registered successfully",
                referralLink: `https://yourdomain.com/signup?ref=${userReferralCode}`,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// ✅ User Login with Validation
router.post(
    "/login",
    [
        // Ensure email or username is provided
        body("emailOrUsername").notEmpty().withMessage("Email or username is required"),
        body("password").notEmpty().withMessage("Password is required"),
    ],
    async (req, res) => {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { emailOrUsername, password } = req.body;

            // Find user by email or username
            const user = await User.findOne({
                $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
            });

            if (!user) {
                return res.status(400).json({ message: "Invalid email/username or password" });
            }

            // Compare password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log("Entered Password:", password, "Type:", typeof password);
                console.log("Stored Hashed Password:", user.password, "Type:", typeof user.password);


                return res.status(400).json({ message: "Invalid email/username or password" });
            }

            // Generate JWT Token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

            // Send response with token & user details
            res.json({
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                },
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);



// ✅ 1️⃣ Request Password Reset
router.post("/forgot-password", async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            secure: true,
            port: 465,
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail email
                pass: process.env.EMAIL_PASS, // Your Gmail App Password
            },
        });
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Generate a unique reset token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Set expiration (15 minutes from now)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        // Create reset link
        const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

        // Send email with reset link
        await transporter.sendMail({
            from: `"Support" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Password Reset Request",
            html: `
        <p>Click <a href="${resetLink}" target="_blank" style="color: blue; text-decoration: underline;">here</a> to reset your password.</p>
        <p>If the link doesn't work, copy and paste the following URL into your browser:</p>
        <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
    `,
        });

        res.json({ message: "Password reset link sent to email." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ 2️⃣ Reset Password Using Token
router.post("/reset-password/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired token" });

        // Hash new password
        // const salt = await bcrypt.genSalt(10);
        user.password = newPassword;

        // Clear reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: "Password reset successful!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
