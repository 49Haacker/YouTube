import { Router } from "express";
import {
  chnageCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  logOutUser,
  loginUser,
  refreshAccessToken,
  registerUser,
  updateAccoutnDetails,
  updateUserAvatar,
  updateUserCoverImage,
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

// chnage password
router.post("/chnage-password", verifyJwt, chnageCurrentPassword);

// get current user
router.post("/current-user", verifyJwt, getCurrentUser);

// update account details
router.patch("/update-user", verifyJwt, updateAccoutnDetails);

// update avatar image
router.patch(
  "/update-avatar",
  upload.single("avatar"),
  verifyJwt,
  updateUserAvatar
);

// update user cover image
router.patch(
  "/update-coverImage",
  upload.single("coverImage"),
  verifyJwt,
  updateUserCoverImage
);

router.get("/c/:username", verifyJwt, getUserChannelProfile);

router.get("/watch-history", verifyJwt, getWatchHistory);

export default router;
