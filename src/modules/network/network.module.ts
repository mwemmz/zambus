import { Module } from '@nestjs/common';
import { OperatorModule } from '../operator/operator.module';
import { RouteController, ScheduleController } from './network.controller';
import { RouteService, ScheduleService } from './network.service';

@Module({
  imports: [OperatorModule],
  controllers: [RouteController, ScheduleController],
  providers: [RouteService, ScheduleService],
  exports: [RouteService, ScheduleService],
})
export class NetworkModule {}
