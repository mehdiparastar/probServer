import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { logLocationType } from '../enum/logLocationType.enum';

export class StartLogDto {
    @IsString()
    @ApiProperty({ enum: logLocationType })
    type: logLocationType;

    @IsString()
    @ApiProperty({})
    code: string;

    @IsString()
    @ApiProperty({})
    expert: string;   
}