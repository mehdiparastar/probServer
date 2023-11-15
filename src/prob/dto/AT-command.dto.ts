import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ATCommandDto {
    // @IsNumber()
    @IsString()
    @ApiProperty({ default: '3' })
    portNumber: string;

    @IsString()
    @ApiProperty({ default: 'ATI', description: 'if at command, you will used ", insert \ before it. like: "AT+QENG=\\\\\"servingcell\\\\\""' })
    command: any;
}