import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.findAllInGroup(user.groupId!);
  }

  @Patch('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePushToken(
    @Body() dto: UpdatePushTokenDto,
    @CurrentUser('id') memberId: string,
  ) {
    return this.membersService.updatePushToken(memberId, dto.pushToken);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membersService.removeFromGroup(
      targetId,
      user.id,
      user.groupId!,
    );
  }
}
