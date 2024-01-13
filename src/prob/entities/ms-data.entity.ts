import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { scenarioName } from "../enum/scenarioName.enum";
import { techType } from "../enum/techType.enum";

@Entity()
export class MSData {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    dmPortNumber: number

    @Column({ nullable: true })
    modelName: string

    @Column({ nullable: true })
    revision: string

    @Column({ unique: true, nullable: true })
    IMSI?: string

    @Column({ unique: true, nullable: false })
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

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}
