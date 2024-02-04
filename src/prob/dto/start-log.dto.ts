import { IsNumber, IsString } from 'class-validator';
import { logLocationType } from '../enum/logLocationType.enum';

export class StartLogDto {
    @IsString()
    type: logLocationType;

    @IsString()
    code: string;

    @IsString()
    expertId: number;
}