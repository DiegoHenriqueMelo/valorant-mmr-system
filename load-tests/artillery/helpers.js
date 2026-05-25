'use strict';

const RANKS = [1, 4, 7, 10, 13, 16, 19, 22, 25];
const AGENTS = [0, 2, 5, 11, 13, 17, 19, 20, 22];
const REGIOES = ['Américas', 'Europa', 'Ásia-Pacífico'];
const RESULTADOS = ['VITÓRIA', 'Derrota'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uniqueId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateAuthUser(requestParams, ctx, ee, next) {
  const id = uniqueId();
  ctx.vars.email = `artillery_${id}@valorant.test`;
  ctx.vars.password = 'LoadTest@123';
  ctx.vars.newPassword = 'NewPass@456';
  return next();
}

function generatePlayerData(requestParams, ctx, ee, next) {
  const id = uniqueId();
  ctx.vars.nickname = `ArtPlayer_${id}`.substring(0, 30);
  ctx.vars.rank = randomItem(RANKS);
  ctx.vars.agenteFavorito = randomItem(AGENTS);
  ctx.vars.regiao = randomItem(REGIOES);
  return next();
}

function generateMatchData(requestParams, ctx, ee, next) {
  ctx.vars.kill1 = randomInt(1, 30);
  ctx.vars.death1 = randomInt(1, 20); // nunca 0
  ctx.vars.result1 = randomItem(RESULTADOS);
  ctx.vars.kill2 = randomInt(1, 30);
  ctx.vars.death2 = randomInt(1, 20);
  ctx.vars.result2 = randomItem(RESULTADOS);
  ctx.vars.kill3 = randomInt(1, 30);
  ctx.vars.death3 = randomInt(1, 20);
  ctx.vars.result3 = randomItem(RESULTADOS);
  return next();
}

module.exports = {
  generateAuthUser,
  generatePlayerData,
  generateMatchData,
};
