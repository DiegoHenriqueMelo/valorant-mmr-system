import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, required: true },
  lastLogin: { type: Date, required: true },
});

export const User = mongoose.model("User", userSchema);
