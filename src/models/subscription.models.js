import mongoose, { Schema, model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // one who is
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // one who suscriber is suscribeing
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
