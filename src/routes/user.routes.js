import Router from "express";
import {
  changeCurrentPassword,
  getUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
const router = Router();
router.route("/register").post(
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

//note this upload is middleware which helps in parsing of form data
router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyUser, logoutUser);
router.route("/refresh").post(refreshAccessToken);
router.route("/change-password").post(verifyUser, changeCurrentPassword);
router.route("/current-user").get(verifyUser, getUser);
router.route("/update-Details").patch(verifyUser, updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyUser, upload.single("avatar"), updateAvatar);
router
  .route("/coverImage")
  .patch(verifyUser, upload.single("coverImage"), updateCoverImage);
router.route("/c/:username").get(verifyUser, getUserChannelProfile);
router.route("/history").get(verifyUser, getWatchHistory);
export default router;
