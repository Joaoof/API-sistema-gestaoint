export class Gift {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string,
    public price: number,
    public imageUrl?: string,
    public status: 'available' | 'reserved' = 'available',
    public createdAt: Date = new Date(),
  ) {}
}