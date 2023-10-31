import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inspection } from "./inspection.entity";
import { GPSData } from "./gps-data.entity";

@Entity()
export class ALLTECHIdle {
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

    //////////////////////////////// 2G ///////////////////////////////////////

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

    //////////////////////////////// 3G ///////////////////////////////////////

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

    //////////////////////////////// 4G ///////////////////////////////////////

    @Column({ nullable: true })
    is_tdd: string

    @Column({ nullable: true })
    pcid: string

    @Column({ nullable: true })
    earfcn: string

    @Column({ nullable: true })
    freq_band_ind: string

    @Column({ nullable: true })
    ul_bandwidth: string

    @Column({ nullable: true })
    dl_bandwidth: string

    @Column({ nullable: true })
    tac: string

    @Column({ nullable: true })
    rsrp: string

    @Column({ nullable: true })
    rsrq: string

    @Column({ nullable: true })
    rssi: string

    @Column({ nullable: true })
    sinr: string

    @Column({ nullable: true })
    srxlev: string

    //////////////////////////////// All //////////////////////////////////////

    @ManyToOne(() => Inspection, (inspection) => inspection.gsmIdles, { nullable: false })
    inspection: Inspection;

    @ManyToOne(() => GPSData, (location) => location.gsmIdleSamples, { nullable: true })
    location: GPSData

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}