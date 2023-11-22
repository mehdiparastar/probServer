import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { GSMIdle } from "./gsmIdle.entity";
import { WCDMAIdle } from "./wcdmaIdle.entity";
import { LTEIdle } from "./lteIdle.entity";
import { GSMLongCall } from "./gsmLongCall.entity";
import { WCDMALongCall } from "./wcdmaLongCall.entity";
import { FTPDL } from "./ftpDL.entity";

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

    @OneToMany(() => GSMLongCall, (gsmLongCall) => gsmLongCall.location, { cascade: true, nullable: true })
    gsmLongCallSamples: GSMLongCall[];

    @OneToMany(() => WCDMALongCall, (wcdmaLongCall) => wcdmaLongCall.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    wcdmaLongCallSamples: WCDMALongCall[]

    @OneToMany(() => FTPDL, (ftpdl) => ftpdl.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    ftpDLSamples: FTPDL[]

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}