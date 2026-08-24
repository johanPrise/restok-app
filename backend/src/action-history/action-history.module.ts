import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ActionHistoryController } from './action-history.controller';
import { ActionHistoryService } from './action-history.service';
import { ActionHistory } from './entities/action-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActionHistory]), AuthModule],
  controllers: [ActionHistoryController],
  providers: [ActionHistoryService],
  exports: [ActionHistoryService],
})
export class ActionHistoryModule {}
