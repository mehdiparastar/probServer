import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inspection } from "./inspection.entity";
import { GPSData } from "./gps-data.entity";

@Entity()
export class GSMIdleMTN {
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

    @ManyToOne(() => Inspection, (inspection) => inspection.gsmIdlesMCI, { nullable: false })
    inspection: Inspection;

    @ManyToOne(() => GPSData, (location) => location.gsmIdleSamplesMCI, { nullable: true })
    location: GPSData

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}