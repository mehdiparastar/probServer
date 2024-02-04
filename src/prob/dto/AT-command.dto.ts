import { IsNumber, IsString } from 'class-validator';

export class ATCommandDto {
    // @IsNumber()
    @IsString()
    portNumber: string;

    @IsString()
    command: any;
}