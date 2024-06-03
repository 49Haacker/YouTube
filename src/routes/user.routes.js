import { Router } from "express";
import {
  chnageCurrentPassword,
  getCurrentUser,
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
router.post("/update-user", verifyJwt, updateAccoutnDetails);

// update avatar image
router.post(
  "/update-avatar",
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  verifyJwt,
  updateUserAvatar
);

// update user cover image
router.post(
  "/update-coverImage",
  upload.fields([
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  verifyJwt,
  updateUserCoverImage
);

export default router;
