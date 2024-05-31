import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload an image
const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath || typeof localFilePath !== "string") {
    throw new Error("Invalid file path");
  }

  try {
    // upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded sucessfully
    // console.log("file is uploaded on cloudinary", response.url);

    // Remove the locally saved temporary file
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);

    // fs.unlinkSync(localFilePath);
    if (localFilePath && typeof localFilePath === "string") {
      try {
        fs.unlinkSync(localFilePath);
      } catch (unlinkError) {
        console.error("Error deleting local file:", unlinkError);
      }
    }
    // remover the locally saved temporary file as the upload operation got faild return null
    throw error;
  }
};

export { uploadOnCloudinary };
