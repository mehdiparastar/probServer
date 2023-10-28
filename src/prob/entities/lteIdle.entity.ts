import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inspection } from "./inspection.entity";

@Entity()
export class LTEIdle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    is_tdd: string

    @Column({ nullable: true })
    mmc: string

    @Column({ nullable: true })
    mnc: string

    @Column({ nullable: true })
    cellid: string

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

    @ManyToOne(() => Inspection, (inspection) => inspection.lteIdles, { nullable: false })
    inspection: Inspection;

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}