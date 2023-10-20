import { PartialType } from '@nestjs/mapped-types';
import { CreateProbDto } from './create-prob.dto';

export class UpdateProbDto extends PartialType(CreateProbDto) {}
