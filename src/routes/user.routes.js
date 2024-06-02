import { Router } from "express";
import {
  logOutUser,
  loginUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controlers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";

const router = Router();

// router.route("/register").post(registerUser);
router.post(
  "/register",
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// upload.none() if use this middleware then you can accept the data in row in postman

router.post("/login", loginUser);

// secured routes
router.post("/logout", verifyJwt, logOutUser);

// regenrate access token using refreshtoken if accessToken is expire
router.post("/refres-token", refreshAccessToken);

export default router;
