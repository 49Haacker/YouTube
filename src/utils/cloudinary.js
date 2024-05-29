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
  try {
    // upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded sucessfully
    console.log("file is uploaded on cloudinary", response);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    // remover the locally saved temporary file as the upload operation got faild return null
  }
};

export { uploadOnCloudinary };
