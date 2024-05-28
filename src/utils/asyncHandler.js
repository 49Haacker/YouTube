// using promisses

const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler).catch((error) => next(error));
  };
};

export { asyncHandler };

// // using try and catch

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res.status(err.code || 500).json({
//       status: false,
//       message: err.message,
//     });
//   }
// };

// export { asyncHandler };
