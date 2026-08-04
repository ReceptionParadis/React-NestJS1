import { Body, Controller, Param, Post } from '@nestjs/common';
import { AllocationService } from './allocation.service';

@Controller('allocation')
export class AllocationController {
  constructor(private readonly allocationService: AllocationService) {}

  @Post(':groupId/propose')
  propose(@Param('groupId') groupId: string) {
    return this.allocationService.propose(groupId);
  }

  @Post(':groupId/apply')
  apply(
    @Param('groupId') groupId: string,
    @Body() body: { assignments: Array<{ entryId: string; roomId: string }> },
  ) {
    return this.allocationService.apply(groupId, body.assignments ?? []);
  }
}
