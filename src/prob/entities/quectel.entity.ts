import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { scenarioName } from "../enum/scenarioName.enum";

@Entity()
export class Quectel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    serialPortNumber: number

    @Column({ nullable: true })
    modelName: string

    @Column({ nullable: true })
    revision: string

    @Column({ nullable: true })
    fd: number

    @Column({ nullable: true })
    IMSI?: string

    @Column({ nullable: true })
    IMEI?: string

    @Column({ nullable: true })
    simStatus?: string

    @Column({ nullable: true })
    activeScenario?: scenarioName

    @Column({ nullable: true })
    gpsEnabling?: string

    @Column({ nullable: true })
    isGPSActive?: string

    @Column({ nullable: true, default: 'allTech' })
    lockStatus?: string

    @Column({ nullable: true })
    callability?: boolean

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}
