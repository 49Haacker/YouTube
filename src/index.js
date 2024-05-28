// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/connectionDB.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(proccess.env.PORT || 8000, () => {
      console.log(`server is running at port : ${proccess.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO DB connection failed !!!", err);
  });

// this is first approach to connect DB
// import express from "express";

// const app = express()(
//   // ifes syntax
//   async () => {
//     try {
//       await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);

//       app.on("error", (error) => {
//         console.log("ERROR:", error);
//         throw error;
//       });

//       app.listen(process.env.PORT, () => {
//         console.log(`app is listening on port ${proccess.env.PORT}`);
//       });
//     } catch (error) {
//       console.log("ERROR", error);
//       throw error;
//     }
//   }
// )();
