import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { GSMIdle } from "./gsmIdle.entity";
import { WCDMAIdle } from "./wcdmaIdle.entity";
import { LTEIdle } from "./lteIdle.entity";
import { GSMLongCall } from "./gsmLongCall.entity";
import { WCDMALongCall } from "./wcdmaLongCall.entity";
import { FTPDL } from "./ftpDL.entity";
import { FTPUL } from "./ftpUL.entity";
import { ALLTECHIdle } from "./alltechIdle.entity";
import { Inspection } from "./inspection.entity";

@Entity()
export class GPSData {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    gpsTime?: string; // Store GPS time as seconds since the GPS epoch

    @Column()
    latitude: string;

    @Column()
    longitude: string;

    @Column({ nullable: true })
    altitude: string;

    @Column({ nullable: true })
    groundSpeed: string;

    @OneToMany(() => GSMIdle, (gsmIdle) => gsmIdle.location, { cascade: true, nullable: true })
    gsmIdleSamples: GSMIdle[];

    @OneToMany(() => WCDMAIdle, (wcdmaIdle) => wcdmaIdle.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    wcdmaIdleSamples: WCDMAIdle[]

    @OneToMany(() => LTEIdle, (lteIdle) => lteIdle.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    lteIdleSamples: LTEIdle[]

    @OneToMany(() => ALLTECHIdle, (alltechIdle) => alltechIdle.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    alltechIdleSamples: ALLTECHIdle[]

    @OneToMany(() => GSMLongCall, (gsmLongCall) => gsmLongCall.location, { cascade: true, nullable: true })
    gsmLongCallSamples: GSMLongCall[];

    @OneToMany(() => WCDMALongCall, (wcdmaLongCall) => wcdmaLongCall.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    wcdmaLongCallSamples: WCDMALongCall[]

    @OneToMany(() => FTPDL, (ftpdl) => ftpdl.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    ftpDLSamples: FTPDL[]

    @OneToMany(() => FTPUL, (ftpul) => ftpul.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    ftpULSamples: FTPUL[]

    @ManyToOne(() => Inspection, (inspection) => inspection.gpsDatas, { nullable: false })
    inspection: Inspection;

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}