import { Expose } from "class-transformer";
import { logLocationType } from "../enum/logLocationType.enum";

export class InspectionDto {
    @Expose()
    id: number;

    @Expose()
    type: logLocationType;

    @Expose()
    code: string

    @Expose()
    expertId: number;
}