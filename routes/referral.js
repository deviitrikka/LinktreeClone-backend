const express = require("express");
const User = require("../models/User");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

// Get referrals
router.get("/referral-stats", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // ✅ Count only users who were referred by the logged-in user
        const totalReferrals = await User.countDocuments({ referredBy: userId });

        res.json({ totalReferrals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/** ✅ GET /api/referrals
 * Fetch the list of users referred by the logged-in user (Not all users)
 */
router.get("/referrals", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // ✅ Find only users who were referred by the logged-in user
        const referrals = await User.find({ referredBy: userId }).select("username email createdAt");

        res.json(referrals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
