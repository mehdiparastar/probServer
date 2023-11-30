import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inspection } from "./inspection.entity";
import { GPSData } from "./gps-data.entity";
import { callStatus } from "../enum/callStatus.enum";

@Entity()
export class FTPUL {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    speed: number

    @Column({ nullable: true })
    roundNumber: number

    @Column({ nullable: true })
    transferLen: number

    @Column({ default: false })
    downloadCompleted: boolean

    @Column({ nullable: true })
    tech: string

    @Column({ nullable: true })
    mcc: string

    @Column({ nullable: true })
    mnc: string

    @ManyToOne(() => Inspection, (inspection) => inspection.ftpULs, { nullable: false })
    inspection: Inspection;

    @ManyToOne(() => GPSData, (location) => location.ftpULSamples, { nullable: true })
    location: GPSData

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}