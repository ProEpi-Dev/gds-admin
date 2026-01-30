import { PartialType } from '@nestjs/swagger';
import { CreateTrackCycleDto } from './create-track-cycle.dto';

export class UpdateTrackCycleDto extends PartialType(CreateTrackCycleDto) {}
