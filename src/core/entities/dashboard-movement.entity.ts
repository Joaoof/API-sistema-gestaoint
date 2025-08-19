// entities/dashboard-movement.entity.ts

export class DashboardMovement {
    constructor(
        public readonly todayEntries: number,
        public readonly todayExits: number,
        public readonly todayBalance: number,
        public readonly monthlyTotal: number
    ) { }

    // Método opcional para converter em objeto simples (útil para retorno em API)
    toJSON() {
        return {
            today: {
                entries: this.todayEntries,
                exits: this.todayExits,
                balance: this.todayBalance,
            },
            monthlyTotal: this.monthlyTotal,
        };
    }
}