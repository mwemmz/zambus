import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { RouteService, ScheduleService } from './network.service';
import {
  CreateRouteDto,
  CreateScheduleDto,
  ListRoutesQuery,
  ListSchedulesQuery,
  UpdateRouteDto,
  UpdateScheduleDto,
} from './dto/network.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';

@Roles(RoleName.OPERATOR)
@Controller('operator/routes')
export class RouteController {
  constructor(private readonly routes: RouteService) {}

  @Get()
  list(@Query() query: ListRoutesQuery, @CurrentUser() user: AuthUser) {
    return this.routes.list(user, query);
  }

  @Post()
  create(@Body() dto: CreateRouteDto, @CurrentUser() user: AuthUser) {
    return this.routes.create(user, dto);
  }

  @Get(':routeId')
  detail(@Param('routeId') routeId: string, @CurrentUser() user: AuthUser) {
    return this.routes.detail(user, routeId);
  }

  @Patch(':routeId')
  update(@Param('routeId') routeId: string, @Body() dto: UpdateRouteDto, @CurrentUser() user: AuthUser) {
    return this.routes.update(user, routeId, dto);
  }
}

@Roles(RoleName.OPERATOR)
@Controller('operator/schedules')
export class ScheduleController {
  constructor(private readonly schedules: ScheduleService) {}

  @Get()
  list(@Query() query: ListSchedulesQuery, @CurrentUser() user: AuthUser) {
    return this.schedules.list(user, query);
  }

  @Post()
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: AuthUser) {
    return this.schedules.create(user, dto);
  }

  @Patch(':scheduleId')
  update(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.schedules.update(user, scheduleId, dto);
  }
}
