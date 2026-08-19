import mongoose, { Schema } from "mongoose";

const playerSchema = new Schema(
  {
    email: { type: String, required: true },
    mmr: { type: Number, required: true },
  },
  { _id: false },
);

const matchSchema = new Schema(
  {
    teamA: { type: [playerSchema], required: true },
    teamB: { type: [playerSchema], required: true },
    averageMMR: { type: Number, required: true },
  },
  { timestamps: true },
);

export const MatchModel = mongoose.model("Match", matchSchema);
