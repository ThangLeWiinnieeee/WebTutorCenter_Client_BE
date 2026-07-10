const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const tutorRoutes = require("./tutor.routes");
const locationRoutes = require("./location.routes");
const notificationRoutes = require("./notification.routes");
const classRoutes = require("./class.routes");
const lookupRoutes = require("./lookup.routes");
const subjectRoutes = require("./subject.routes");
const adminRoutes = require("./admin.routes");
const settingsRoutes = require("./settings.routes");
const promoRoutes = require("./promo.routes");
const reviewRoutes = require("./review.routes");
const chatRoutes = require("./chat.routes");
const chatbotRoutes = require("./chatbot.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/tutors", tutorRoutes);
router.use("/locations", locationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/classes", classRoutes);
router.use("/lookups", lookupRoutes);
router.use("/subjects", subjectRoutes);
router.use("/admin", adminRoutes);
router.use("/settings", settingsRoutes);
router.use("/promos", promoRoutes);
router.use("/reviews", reviewRoutes);
router.use("/chat", chatRoutes);
router.use("/chatbot", chatbotRoutes);

module.exports = router;
