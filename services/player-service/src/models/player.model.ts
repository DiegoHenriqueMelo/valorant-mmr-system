import mongoose, { Schema } from "mongoose";

const playerSchema = new Schema({
  email: { type: String, required: true, unique: true },
  nickname: { type: String, required: true, unique: true },
  rank: { type: String, required: true },
  agenteFavorito: { type: String, required: true },
  regiao:{type:String, required:true}
});

export const Player = mongoose.model("Player", playerSchema);
