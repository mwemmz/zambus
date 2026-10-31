import { Module } from '@nestjs/common';
import { OperatorContextService } from './operator-context.service';
import { OperatorController } from './operator.controller';

@Module({
  controllers: [OperatorController],
  providers: [OperatorContextService],
  exports: [OperatorContextService],
})
export class OperatorModule {}
