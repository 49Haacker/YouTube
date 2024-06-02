import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    // here access token from cookies or request headers
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const validUser = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!validUser) {
      throw new ApiError(404, "Invalid access Token");
    }

    req.user = validUser;

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});