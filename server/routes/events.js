import express from "express";
import EventsController from "../controllers/events.js";

const router = express.Router();

router.get("/", EventsController.list);
router.get("/:eventId", EventsController.getById);

export default router;
