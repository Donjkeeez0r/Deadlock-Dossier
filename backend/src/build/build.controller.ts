import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BuildService } from './build.service';
import { SaveBuildDto } from './dto/save-build.dto';
import { RenameBuildDto } from './dto/rename-build.dto';
import {
  type AuthRequest,
  type AuthUser,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

@Controller('api/builds')
export class BuildController {
  constructor(private readonly buildService: BuildService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  saveBuild(@Body() dto: SaveBuildDto, @Req() req: AuthRequest) {
    return this.buildService.saveBuild(dto, req.user?.id);
  }

  // Объявлен раньше ':id', иначе «mine» попадёт в параметр.
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMyBuilds(@Req() req: AuthRequest) {
    return this.buildService.getUserBuilds((req.user as AuthUser).id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getBuild(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.buildService.getBuildByShareId(id, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  renameBuild(
    @Param('id') id: string,
    @Body() dto: RenameBuildDto,
    @Req() req: AuthRequest,
  ) {
    return this.buildService.renameBuild(
      id,
      (req.user as AuthUser).id,
      dto.name,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBuild(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.buildService.deleteBuild(id, (req.user as AuthUser).id);
  }
}
