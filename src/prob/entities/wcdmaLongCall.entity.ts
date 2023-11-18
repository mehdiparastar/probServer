import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inspection } from "./inspection.entity";
import { GPSData } from "./gps-data.entity";
import { callStatus } from "../enum/callStatus.enum";

@Entity()
export class WCDMALongCall {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    tech: string

    @Column({ nullable: true })
    mcc: string

    @Column({ nullable: true })
    mnc: string

    @Column({ nullable: true })
    lac: string

    @Column({ nullable: true })
    cellid: string

    @Column({ nullable: true })
    uarfcn: string

    @Column({ nullable: true })
    psc: string

    @Column({ nullable: true })
    rac: string

    @Column({ nullable: true })
    rscp: string

    @Column({ nullable: true })
    ecio: string

    @Column({ nullable: true })
    phych: string

    @Column({ nullable: true })
    sf: string

    @Column({ nullable: true })
    slot: string

    @Column({ nullable: true })
    speech_code: string

    @Column({ nullable: true })
    comMod: string

    @Column({ type: 'enum', enum: callStatus, default: callStatus.Idle }) // this should be idle at first
    callingStatus: callStatus

    @ManyToOne(() => Inspection, (inspection) => inspection.wcdmaLongCalls, { nullable: false })
    inspection: Inspection;

    @ManyToOne(() => GPSData, (location) => location.wcdmaLongCallSamples, { nullable: true })
    location: GPSData

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}