import mongoose from "mongoose";
import dotenv from "dotenv";
import { Player } from "../src/models/player.model.js";
import { Rank } from "../src/models/enums/rank.js";
import { Character } from "../src/models/enums/character.js";

dotenv.config();
dotenv.config({ path: "../mmr-service/.env", override: false });

const REGIONS = ["NA", "EMEA", "AP", "LATAM", "BR", "KR"];

const PREFIXES = [
  "Shadow", "Neon", "Void", "Ghost", "Frost", "Blaze", "Storm", "Cyber",
  "Dark", "Iron", "Toxic", "Hyper", "Omega", "Alpha", "Rogue", "Stealth",
  "Nova", "Lunar", "Solar", "Inferno", "Arctic", "Crimson", "Silent", "Rapid",
  "Elite", "Prime", "Ultra", "Apex", "Titan", "Phantom",
];

const SUFFIXES = [
  "Blade", "Hunter", "Rush", "Walker", "Strike", "Shot", "Ace", "Lord",
  "Fire", "Kill", "Ghost", "Wolf", "Fox", "Eagle", "Hawk", "Viper",
  "Drift", "Snap", "Slash", "Burst", "Frag", "Aim", "Lock", "Sync",
  "Rift", "Edge", "Peak", "Flux", "Core", "Spark",
];

// Distribuição realista: mais jogadores nos ranks médios
const RANK_DISTRIBUTION: { rank: Rank; count: number }[] = [
  { rank: Rank.Bronze1,      count: 3  },
  { rank: Rank.Bronze2,      count: 4  },
  { rank: Rank.Bronze3,      count: 4  },
  { rank: Rank.Prata1,       count: 6  },
  { rank: Rank.Prata2,       count: 7  },
  { rank: Rank.Prata3,       count: 7  },
  { rank: Rank.Ouro1,        count: 8  },
  { rank: Rank.Ouro2,        count: 8  },
  { rank: Rank.Ouro3,        count: 7  },
  { rank: Rank.Platina1,     count: 7  },
  { rank: Rank.Platina2,     count: 6  },
  { rank: Rank.Platina3,     count: 6  },
  { rank: Rank.Diamante1,    count: 5  },
  { rank: Rank.Diamante2,    count: 4  },
  { rank: Rank.Diamante3,    count: 4  },
  { rank: Rank.Ascendente1,  count: 4  },
  { rank: Rank.Ascendente2,  count: 3  },
  { rank: Rank.Ascendente3,  count: 3  },
  { rank: Rank.Imortal1,     count: 3  },
  { rank: Rank.Imortal2,     count: 2  },
  { rank: Rank.Imortal3,     count: 2  },
  { rank: Rank.Radiante,     count: 3  },
];

const ALL_RANKS      = Object.values(Rank);
const ALL_CHARACTERS = Object.values(Character);

// Schema do MMR definido inline para não cruzar imports entre serviços
const mmrSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  historico: [
    {
      kill:   { type: Number, required: true },
      death:  { type: Number, required: true },
      result: { type: String, required: true },
      score:  { type: Number, required: true },
    },
  ],
  mmr: { type: Number, required: true },
});

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

// Converte o rankName armazenado ("5", "Bronze1", etc.) para o score numérico
function rankScore(rankName: string): number {
  const asNumber = parseInt(rankName, 10);
  if (!isNaN(asNumber)) return asNumber * 100;
  return (Rank[rankName] ?? 1) * 100;
}

// Gera histórico de partidas realista para um dado rankScore
function generateHistorico(score: number, matchCount: number) {
  // Jogadores de rank alto matam mais e morrem menos
  const baseKill  = Math.max(5,  Math.floor(score / 150));
  const baseDeath = Math.max(2,  15 - Math.floor(score / 200));
  // Win rate de 40% (rank baixo) até 65% (Radiante)
  const winChance = 0.40 + (score / 2500) * 0.25;

  return Array.from({ length: matchCount }, () => {
    const kill   = Math.max(1, baseKill  + Math.floor(Math.random() * 7) - 3);
    const death  = Math.max(1, baseDeath + Math.floor(Math.random() * 5) - 2);
    const result = Math.random() < winChance ? "Vitória" : "Derrota";
    const playScore = Math.round(kill / death + score);
    return { kill, death, result, score: playScore };
  });
}

// Replica exatamente o cálculo de mmr.service.ts
function calculateMmr(historico: ReturnType<typeof generateHistorico>, score: number): number {
  let mmrFinal = 0;
  let winRate  = 0;
  historico.forEach((play) => {
    play.result.toUpperCase() === "VITÓRIA" ? winRate++ : winRate--;
    mmrFinal = Math.round(play.kill / play.death + score);
  });
  return Math.round((mmrFinal + winRate) / 3);
}

function generatePlayers() {
  const players: {
    nickname: string;
    email: string;
    rank: string;
    agenteFavorito: string;
    regiao: string;
  }[] = [];

  let playerIndex = 0;

  for (const { rank, count } of RANK_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      const prefix   = pick(PREFIXES, playerIndex * 7);
      const suffix   = pick(SUFFIXES, playerIndex * 13);
      const nickname = `${prefix}${suffix}${playerIndex + 1}`;
      const email    = `${prefix.toLowerCase()}.${suffix.toLowerCase()}${playerIndex + 1}@val.gg`;
      const agent    = String(ALL_CHARACTERS[playerIndex % ALL_CHARACTERS.length]);
      const regiao   = pick(REGIONS, playerIndex * 3);
      const rankName = String(ALL_RANKS[rank]);

      players.push({ nickname, email, rank: rankName, agenteFavorito: agent, regiao });
      playerIndex++;
    }
  }

  return players;
}

async function seed() {
  const playerUri = String(process.env.PLAYER_MONGO_URI);
  const mmrUri    = String(process.env.MMR_MONGO_URI);

  // ── Players ──────────────────────────────────────────────────────────────
  console.log("🌱 Conectando ao MongoDB (player)...");
  await mongoose.connect(playerUri);
  console.log("✅ Conectado!\n");

  console.log("🗑️  Limpando coleção de players...");
  await Player.deleteMany({});
  console.log("✅ Coleção limpa!\n");

  const docs = generatePlayers();

  console.log("📥 Inserindo players...");
  await Player.insertMany(docs);
  console.log(`✅ ${docs.length} players inseridos!\n`);

  await mongoose.disconnect();

  // ── MMR ───────────────────────────────────────────────────────────────────
  console.log("🌱 Conectando ao MongoDB (mmr)...");
  const mmrConn = await mongoose.createConnection(mmrUri).asPromise();
  const MMR     = mmrConn.model("MMR", mmrSchema);
  console.log("✅ Conectado!\n");

  console.log("🗑️  Limpando coleção de MMR...");
  await MMR.deleteMany({});
  console.log("✅ Coleção limpa!\n");

  console.log("📥 Inserindo MMR...");
  const mmrDocs = docs.map((player) => {
    const score      = rankScore(player.rank);
    const matchCount = 5 + Math.floor(Math.random() * 11); // 5–15 partidas
    const historico  = generateHistorico(score, matchCount);
    const mmr        = calculateMmr(historico, score);
    return { email: player.email, historico, mmr };
  });
  await MMR.insertMany(mmrDocs);
  console.log(`✅ ${mmrDocs.length} registros de MMR inseridos!\n`);

  // ── Resumo ────────────────────────────────────────────────────────────────
  const byRank: Record<string, number> = {};
  for (const p of docs) byRank[p.rank] = (byRank[p.rank] ?? 0) + 1;

  console.log("  Distribuição por rank:");
  for (const [rank, count] of Object.entries(byRank)) {
    const bar = "█".repeat(count);
    console.log(`    ${rank.padEnd(14)} ${bar} (${count})`);
  }

  const mmrValues  = mmrDocs.map((d) => d.mmr);
  const mmrMin     = Math.min(...mmrValues);
  const mmrMax     = Math.max(...mmrValues);
  const mmrAvg     = Math.round(mmrValues.reduce((a, b) => a + b, 0) / mmrValues.length);
  console.log(`\n  MMR — mín: ${mmrMin} | méd: ${mmrAvg} | máx: ${mmrMax}`);

  await mmrConn.close();
  console.log("\n🔌 Desconectado. Banco pronto para testes!");
}

seed().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
