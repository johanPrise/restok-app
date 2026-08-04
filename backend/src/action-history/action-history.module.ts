import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionHistoryService } from './action-history.service';
import { ActionHistory } from './entities/action-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActionHistory])],
  providers: [ActionHistoryService],
  exports: [ActionHistoryService],
})
export class ActionHistoryModule {}
