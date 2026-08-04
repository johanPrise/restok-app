import { ItemStatus } from '../entities/item.entity';

export const ITEM_STATUS_CHANGED = 'item.status.changed';

export class ItemStatusChangedEvent {
  constructor(
    public readonly itemId: string,
    public readonly itemName: string,
    public readonly groupId: string,
    public readonly previousStatus: ItemStatus,
    public readonly newStatus: ItemStatus,
    public readonly triggeredByMemberId: string,
  ) {}
}
