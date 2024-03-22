import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { GSMIdleMCI } from "./gsmIdleMCI.entity";
import { WCDMAIdleMCI } from "./wcdmaIdleMCI.entity";
import { LTEIdleMCI } from "./lteIdleMCI.entity";
import { GSMLongCallMCI } from "./gsmLongCallMCI.entity";
import { WCDMALongCallMCI } from "./wcdmaLongCallMCI.entity";
import { FTPDL } from "./ftpDL.entity";
import { FTPUL } from "./ftpUL.entity";
import { Inspection } from "./inspection.entity";
import { GSMIdleMTN } from "./gsmIdleMTN.entity";
import { WCDMAIdleMTN } from "./wcdmaIdleMTN.entity";
import { LTEIdleMTN } from "./lteIdleMTN.entity";
import { GSMLongCallMTN } from "./gsmLongCallMTN.entity ";
import { WCDMALongCallMTN } from "./wcdmaLongCallMTN.entity";

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
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    @OneToMany(() => GSMIdleMCI, (gsmIdle) => gsmIdle.location, { cascade: true, nullable: true })
    gsmIdleSamplesMCI: GSMIdleMCI[];

    @OneToMany(() => WCDMAIdleMCI, (wcdmaIdle) => wcdmaIdle.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    wcdmaIdleSamplesMCI: WCDMAIdleMCI[]

    @OneToMany(() => LTEIdleMCI, (lteIdle) => lteIdle.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    lteIdleSamplesMCI: LTEIdleMCI[]

    @OneToMany(() => GSMLongCallMCI, (gsmLongCall) => gsmLongCall.location, { cascade: true, nullable: true })
    gsmLongCallSamplesMCI: GSMLongCallMCI[];

    @OneToMany(() => WCDMALongCallMCI, (wcdmaLongCall) => wcdmaLongCall.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    wcdmaLongCallSamplesMCI: WCDMALongCallMCI[]
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    @OneToMany(() => GSMIdleMTN, (gsmIdle) => gsmIdle.location, { cascade: true, nullable: true })
    gsmIdleSamplesMTN: GSMIdleMTN[];

    @OneToMany(() => WCDMAIdleMTN, (wcdmaIdle) => wcdmaIdle.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    wcdmaIdleSamplesMTN: WCDMAIdleMTN[]

    @OneToMany(() => LTEIdleMTN, (lteIdle) => lteIdle.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    lteIdleSamplesMTN: LTEIdleMTN[]

    @OneToMany(() => GSMLongCallMTN, (gsmLongCall) => gsmLongCall.location, { cascade: true, nullable: true })
    gsmLongCallSamplesMTN: GSMLongCallMTN[];

    @OneToMany(() => WCDMALongCallMTN, (wcdmaLongCall) => wcdmaLongCall.location, { cascade: true, nullable: true }) // specify inverse side as a second parameter
    wcdmaLongCallSamplesMTN: WCDMALongCallMTN[]
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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