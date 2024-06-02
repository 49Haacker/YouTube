import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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
      $set: { refreshToken: undefined },
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

export { registerUser, loginUser, logOutUser, refreshAccessToken };
