import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { BusService } from './bus.service';
import { CreateBusDto, ListBusesQuery, UpdateBusDto } from './dto/bus.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';

@Roles(RoleName.OPERATOR)
@Controller('operator/buses')
export class BusController {
  constructor(private readonly buses: BusService) {}

  @Get()
  list(@Query() query: ListBusesQuery, @CurrentUser() user: AuthUser) {
    return this.buses.list(user, query);
  }

  @Post()
  create(@Body() dto: CreateBusDto, @CurrentUser() user: AuthUser) {
    return this.buses.create(user, dto);
  }

  @Get(':busId')
  detail(@Param('busId') busId: string, @CurrentUser() user: AuthUser) {
    return this.buses.detail(user, busId);
  }

  @Patch(':busId')
  update(@Param('busId') busId: string, @Body() dto: UpdateBusDto, @CurrentUser() user: AuthUser) {
    return this.buses.update(user, busId, dto);
  }
}
