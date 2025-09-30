export class DashboardMovement {
  public readonly todayEntries: number;
  public readonly todayExits: number;
  public readonly todayBalance: number;
  public readonly monthlyTotal: number;
  constructor(
    todayEntries: number,
    todayExits: number,
    todayBalance: number,
    monthlyTotal: number,
  ) {
    this.todayEntries = todayEntries;
    this.todayExits = todayExits;
    this.todayBalance = todayBalance;
    this.monthlyTotal = monthlyTotal;
  }

  // ✅ Garanta que o retorno tem exatamente os mesmos nomes dos campos no GraphQL
  toJSON() {
    return {
      todayEntries: this.todayEntries,
      todayExits: this.todayExits,
      todayBalance: this.todayBalance,
      monthlyTotal: this.monthlyTotal,
    };
  }
}
