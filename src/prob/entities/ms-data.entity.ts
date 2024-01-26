import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { scenarioName } from "../enum/scenarioName.enum";
import { techType } from "../enum/techType.enum";
import { Inspection } from "./inspection.entity";

@Entity()
@Index('pk', ['inspection', 'IMEI'], { unique: true })
export class MSData {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false })
    dmPortNumber: number

    @Column({ nullable: true })
    modelName: string

    @Column({ nullable: true })
    revision: string

    @Column({ nullable: true })
    IMSI?: string

    @Column({ nullable: false })
    IMEI?: string

    @Column({ nullable: true })
    simStatus?: string

    @Column({ nullable: true })
    activeScenario?: scenarioName

    @Column({ default: false })
    isGPS?: boolean

    @Column({ nullable: true, default: techType.alltech })
    lockStatus?: techType

    @Column({ nullable: true })
    callability?: boolean

    @ManyToOne(() => Inspection, (inspection) => inspection.msDatas, { nullable: false })
    inspection: Inspection;

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}
