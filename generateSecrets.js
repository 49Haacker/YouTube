import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";

function generateSecretKey() {
  return crypto.randomBytes(64).toString("hex");
}

const accessTokenSecret = generateSecretKey();
const refreshTokenSecret = generateSecretKey();

// Read the existing .env file
const envConfig = dotenv.parse(fs.readFileSync(".env", "utf-8"));

// Update the specific keys
envConfig.ACCESS_TOKEN_SECRET = accessTokenSecret;
envConfig.REFRESH_TOKEN_SECRET = refreshTokenSecret;

// Convert the updated configuration back to a string
const updatedEnvConfig = Object.entries(envConfig)
  .map(([key, value]) => `${key}=${value}`)
  .join("\n");

// Write the updated configuration back to the .env file
fs.writeFileSync(".env", updatedEnvConfig);

console.log(
  "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET have been updated in the .env file"
);
