import { Router } from "express";
import { registerUser } from "../controllers/user.controlers.js";

const router = Router();

// router.route("/register").post(registerUser);
router.post("/register", registerUser);

export default router;
