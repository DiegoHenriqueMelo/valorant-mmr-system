import mongoose, { Schema } from "mongoose";

const mmrSchema = new Schema({
  email: { type: String, required: true, unique: true },
  historico: [
    {
      kill: { type: Number, required: true },
      death: { type: Number, required: true },
      result: { type: String, required: true },
      score: { type: Number, required: true },
    },
  ],
  mmr: { type: Number, required: true },
});

export const MMR = mongoose.model("MMR", mmrSchema);
