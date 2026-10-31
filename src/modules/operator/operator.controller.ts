import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { RoleName } from '@prisma/client';
import { OperatorContextService } from './operator-context.service';
import { RegisterOperatorDto, UpdateOperatorDto } from './dto/operator.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';

@Controller('operator')
export class OperatorController {
  constructor(private readonly operators: OperatorContextService) {}

  /** Any signed-in user may apply to become an operator. */
  @Post('profile')
  async register(@Body() dto: RegisterOperatorDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const operator = await this.operators.registerCompany(user, dto, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
    return {
      operator: {
        id: operator.id,
        name: operator.name,
        registrationNo: operator.registrationNo,
        status: operator.status,
      },
      nextStep:
        'Your operator profile is pending ZamBus approval. You can add buses and routes now; trips can be published once approved.',
    };
  }

  @Roles(RoleName.OPERATOR)
  @Get('profile')
  async profile(@CurrentUser() user: AuthUser) {
    const operatorId = this.operators.requireOperatorId(user);
    const operator = await this.operators.getOperator(operatorId);
    return { operator };
  }

  @Roles(RoleName.OPERATOR)
  @Patch('profile')
  async update(@Body() dto: UpdateOperatorDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const operatorId = this.operators.requireOperatorId(user);
    const operator = await this.operators.updateCompany(operatorId, user.id, dto, { ip: req.ip });
    return { operator };
  }
}
