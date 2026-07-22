import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  ListOperatorExecutionOperationsQueryDto,
  ListOperatorExecutionsQueryDto,
  OperatorExecutionPeriodDto,
} from './dto/operator-execution.dto';
import { OperatorExecutionsService } from './operator-executions.service';

@Controller('operator-executions')
@Roles(Role.OWNER, Role.MANAGER)
export class OperatorExecutionsController {
  constructor(private readonly executions: OperatorExecutionsService) {}

  @Get()
  list(@Query() query: ListOperatorExecutionsQueryDto): Promise<unknown> {
    return this.executions.list(query);
  }

  @Get(':operatorId')
  get(
    @Param('operatorId', new ParseUUIDPipe({ version: '4' })) operatorId: string,
    @Query() query: OperatorExecutionPeriodDto,
  ): Promise<unknown> {
    return this.executions.get(operatorId, query);
  }

  @Get(':operatorId/operations')
  operations(
    @Param('operatorId', new ParseUUIDPipe({ version: '4' })) operatorId: string,
    @Query() query: ListOperatorExecutionOperationsQueryDto,
  ): Promise<unknown> {
    return this.executions.operations(operatorId, query);
  }
}
