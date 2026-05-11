import mongoose from "mongoose";
import dotenv from "dotenv";
import { Player } from "../src/models/player.model.js";
import { Rank } from "../src/models/enums/rank.js";
import { Character } from "../src/models/enums/character.js";

dotenv.config();

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

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
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
  const uri = String(process.env.PLAYER_MONGO_URI);

  console.log("🌱 Conectando ao MongoDB...");
  await mongoose.connect(uri);
  console.log("✅ Conectado!\n");

  console.log("🗑️  Limpando coleção de players...");
  await Player.deleteMany({});
  console.log("✅ Coleção limpa!\n");

  const docs = generatePlayers();

  console.log("📥 Inserindo players...");
  await Player.insertMany(docs);

  console.log(`\n✅ Seed concluído! ${docs.length} players inseridos:\n`);

  const byRank: Record<string, number> = {};
  for (const p of docs) {
    byRank[p.rank] = (byRank[p.rank] ?? 0) + 1;
  }
  console.log("  Distribuição por rank:");
  for (const [rank, count] of Object.entries(byRank)) {
    const bar = "█".repeat(count);
    console.log(`    ${rank.padEnd(14)} ${bar} (${count})`);
  }

  await mongoose.disconnect();
  console.log("\n🔌 Desconectado. Banco pronto para testes!");
}

seed().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
