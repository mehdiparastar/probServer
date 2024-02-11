import { IsNumber, IsString, IsEnum, MinLength } from 'class-validator';
import { logLocationType } from '../enum/logLocationType.enum';

export class StartLogDto {
    @IsEnum(logLocationType)
    type: logLocationType;

    @IsString()
    @MinLength(5, { message: 'The location code must be at least 2 characters long' })
    code: string;

    @IsNumber()
    expertId: number;
}