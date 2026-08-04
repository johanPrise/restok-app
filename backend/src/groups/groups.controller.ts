import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // Accès « authentifié » et non « membre » : on n'a précisément pas encore
  // de groupe à ce stade.
  @Post()
  create(@Body() dto: CreateGroupDto, @CurrentUser('id') memberId: string) {
    return this.groupsService.create(dto, memberId);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(@Body() dto: JoinGroupDto, @CurrentUser('id') memberId: string) {
    return this.groupsService.join(dto, memberId);
  }

  @Get('me')
  @UseGuards(GroupMemberGuard)
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.findMine(user.groupId!);
  }

  @Patch('me')
  @UseGuards(GroupMemberGuard, AdminGuard)
  rename(@Body() dto: UpdateGroupDto, @CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.rename(user.groupId!, dto);
  }

  @Delete('me')
  @UseGuards(GroupMemberGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.remove(user.groupId!);
  }
}
