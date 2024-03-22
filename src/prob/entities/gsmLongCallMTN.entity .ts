import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { callStatus } from "../enum/callStatus.enum";
import { GPSData } from "./gps-data.entity";
import { Inspection } from "./inspection.entity";

@Entity()
export class GSMLongCallMTN {
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
    bsic: string

    @Column({ nullable: true })
    arfcn: string

    @Column({ nullable: true })
    bandgsm: string

    @Column({ nullable: true })
    rxlev: string

    @Column({ nullable: true })
    txp: string

    @Column({ nullable: true })
    tla: string

    @Column({ nullable: true })
    drx: string

    @Column({ nullable: true })
    c1: string

    @Column({ nullable: true })
    c2: string

    @Column({ nullable: true })
    gprs: string

    @Column({ nullable: true })
    tch: string

    @Column({ nullable: true })
    ts: string

    @Column({ nullable: true })
    ta: string

    @Column({ nullable: true })
    maio: string

    @Column({ nullable: true })
    hsn: string

    @Column({ nullable: true })
    rxlevsub: string

    @Column({ nullable: true })
    rxlevfull: string

    @Column({ nullable: true })
    rxqualsub: string

    @Column({ nullable: true })
    rxqualfull: string

    @Column({ nullable: true })
    voicecodec: string

    @Column({ type: 'enum', enum: callStatus, default: callStatus.Idle }) // this should be idle at first
    callingStatus: callStatus

    @ManyToOne(() => Inspection, (inspection) => inspection.gsmLongCallsMCI, { nullable: false })
    inspection: Inspection;

    @ManyToOne(() => GPSData, (location) => location.gsmLongCallSamplesMCI, { nullable: true })
    location: GPSData

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}