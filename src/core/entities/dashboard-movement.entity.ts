// src/core/entities/dashboard-movement.entity.ts

export class DashboardMovement {
  constructor(
    public readonly todayEntries: number,
    public readonly todayExits: number,
    public readonly todayBalance: number,
    public readonly monthlyTotal: number,
  ) {}

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
