import express from "express";
import RsvpsController from "../controllers/rsvps.js";

const router = express.Router();

router.get("/", RsvpsController.list);

export default router;
