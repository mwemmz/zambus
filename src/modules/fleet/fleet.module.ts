import { Module } from '@nestjs/common';
import { OperatorModule } from '../operator/operator.module';
import { BusController } from './bus.controller';
import { BusService } from './bus.service';

@Module({
  imports: [OperatorModule],
  controllers: [BusController],
  providers: [BusService],
})
export class FleetModule {}
