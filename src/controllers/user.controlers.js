import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const currentUser = await User.findById(userId);
    // console.log(userId);
    const AccessToken = currentUser.generateAccessToken();
    const RefrshToken = currentUser.generateRefreshToken();

    // console.log(AccessToken, RefrshToken);

    // save value in object
    currentUser.refreshToken = RefrshToken;
    await currentUser.save({ validateBeforeSave: true });

    return { AccessToken, RefrshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;
  //   console.log(req.body);

  //   check all fields are fill are not
  if (
    [fullname, username, email, password].some((fields) => {
      fields?.trim() === "";
    })
  ) {
    throw new ApiError(400, "all fileds are required");
  }

  //   check the user exist or not
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "username and email are already taken");
  }

  //   check fils
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar fields are required");
  }
  //   console.log(req.files);

  //   upload on cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  //   const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  let coverImage;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  if (!avatar) {
    throw new ApiError(400, "avatar is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user register successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // agenda
  // req body -> data
  // username or email -> these login with email and also login with username
  // find the user
  // check password
  // access and refreshToken
  // send cookies

  const { email, username, password } = req.body;
  // console.log(req.body);

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  // console.log("existingUser =", existingUser);

  if (!existingUser) {
    throw new ApiError(404, "usr does not exist");
  }

  // verify the password here isPasswordCorrect is method which create in user.model.js
  const ispasswordValid = await existingUser.isPasswordCorrect(password);
  if (!ispasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { AccessToken, RefrshToken } = await generateAccessAndRefereshTokens(
    existingUser._id
  );

  // send in cookies

  const loggedInUser = await User.findById(existingUser._id).select(
    "-password -refreshToken"
  );

  // when send cookies then use this option this helps to only modified only by server
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", AccessToken, options)
    .cookie("refreshToken", RefrshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          AccessToken,
          RefrshToken,
        },
        "User logged in Successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  // clear cookies
  //  and remove the refresh toke form DB

  await User.findByIdAndUpdate(
    req.user._id,
    {
      // $set: { refreshToken: undefined },
      $unset: { refreshToken: 1 }, // this remove filed from backend
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

// regenerate access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  // access the refresh toke from cookies
  // and verfiy the token
  // and regenrate access token and refresh token

  const incommingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  // console.log(req.cookies);

  if (!incommingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }

  try {
    // verify the refresh token
    const decodedToken = await jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // console.log(decodedToken);

    const verifyedUser = await User.findById(decodedToken._id);
    // console.log(verifyedUser);

    if (!verifyedUser) {
      throw new ApiError(401, "Invalid refresh token!");
    }

    // compare the incomming refresh token and user refresh token which stre in DB
    if (incommingRefreshToken !== verifyedUser.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // if match the refresh token then again regenerate the refresh and access token

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(verifyedUser._id);
    // console.log(newAccessToken, newRefreshToken);

    return res
      .status(200)
      .cookies("accessToken", newAccessToken, options)
      .cookies("accessToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          newRefreshToken,
          "access token and refresh token was generated sucessfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// chnage the password
const chnageCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body;
  // console.log(req.body);

  if (!(newPassword === confPassword)) {
    throw new ApiError(401, "password was not match");
  }

  const user = await User.findById(req.user?._id); // here come the user info and req.user we access because we have write the middleware in routes of chnage password middlware was jwtVeify here verify the token and return the user info in re.user

  // console.log(user);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); // isPasswordCorrect is a method which accept value password to verify the password this menthod write in user.model.js file

  // console.log(isPasswordCorrect);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword; // in user object chnage the password filed to newPassword now save the user in db

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password chnage successfully"));
});

// get current user info
const getCurrentUser = asyncHandler(async (req, res) => {
  // console.log(req.user);
  // const currentUser = req.user;

  // if (!currentUser) {
  //   throw new ApiError(401, "unauthorize");
  // }

  // console.log(currentUser);

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetch successfully"));
});

// update account details
const updateAccoutnDetails = asyncHandler(async (req, res) => {
  const { fullname, email, username } = req.body;

  // console.log(req.body);

  if (!fullname || !email || !username) {
    throw new ApiError(400, "All fileds are required");
  }

  // console.log(req.user);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullname, email: email, username: username } },
    { new: true }
  ).select("-password");

  // console.log("updated users ", user);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detail updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // req.files come from mullter middleware
  // const avatarLocalPath = req.fils?.path;
  const avatarLocalPath = req.files?.avatar[0]?.path;

  // console.log(avatarLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // TODO: delete old image - assignment

  // here after uploade avatar succesfully uopload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  // console.log(avatar);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  // console.log(req.user.avatar);

  await deleteOnCloudinary(req.user.avatar);

  // if (destroy.result === "not found") {
  //   throw new ApiError(401, "Image Not deleted form cloudinary");
  // }

  // console.log("delte image ", destroy.url);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // req.files come from mullter middleware
  // const coverImageLocalPath = req.fils?.path;
  const coverImageLocalPath = req.files.coverImage[0].path;

  // console.log(coverImageLocalPath);

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on coverImage");
  }

  // console.log(req.user.avatar);

  await deleteOnCloudinary(req.user.coverImage);

  // if (destroy.result === "not found") {
  //   throw new ApiError(401, "Image Not deleted form cloudinary");
  // }

  // console.log("delte image ", destroy.url);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  // aggregation piplene
  // User.find({ username });
  const channel = await User.aggregate([
    // first lookup match the user
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },

    // second lookup find the subscribers
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },

    // third lookup find the subscribersTo means how many subsciber you
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },

    // fourth add addition fields subscriber count, and susbscriber couont to, is subscriber
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    // fiveth use project to
    {
      $project: {
        fullname: 1,
        email: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  // console.log(channel);

  if (!channel?.length) {
    throw new ApiError(400, "Channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },

    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetch successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  chnageCurrentPassword,
  getCurrentUser,
  updateAccoutnDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
