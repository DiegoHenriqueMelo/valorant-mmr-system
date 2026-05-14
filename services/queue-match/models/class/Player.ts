export class Player {
  public email: string;
  public mmr: number;

  constructor(email: string, mmr: number) {
    ((this.email = email), (this.mmr = mmr));
  }
}
