const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware"); // Protect routes

const router = express.Router();

/** ✅ GET /api/referral-stats
 * Fetch referral statistics (total sign-ups from user's referral)
 */
router.get("/referral-stats", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const totalReferrals = await User.countDocuments({ referredBy: userId });

        res.json({ totalReferrals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/** ✅ GET /api/referrals
 * Fetch the list of users referred by the logged-in user
 */
router.get("/referrals", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const referrals = await User.find({ referredBy: userId }).select("username email createdAt");

        res.json(referrals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
