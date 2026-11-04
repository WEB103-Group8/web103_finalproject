import express from "express";
import UsersController from "../controllers/users.js";

const router = express.Router();

router.get("/", UsersController.list);
router.get("/:userId", UsersController.getById);

export default router;
