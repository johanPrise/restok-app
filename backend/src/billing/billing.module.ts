import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '../groups/entities/group.entity';
import { EntitlementsService } from './entitlements.service';
import { Purchase } from './entities/purchase.entity';

/**
 * Le déblocage payant, isolé de tout le reste.
 *
 * Il n'importe **aucun** module métier, seulement les entités qu'il lit : c'est
 * ce qui permet aux quatre modules verrouillés — items, groupes, recettes,
 * journal — de l'importer sans cycle.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Group, Purchase])],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class BillingModule {}
