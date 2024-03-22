import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { logLocationType } from "../enum/logLocationType.enum";
import { User } from "./user.entity";
import { GSMIdleMCI } from "./gsmIdleMCI.entity";
import { WCDMAIdleMCI } from "./wcdmaIdleMCI.entity";
import { LTEIdleMCI } from "./lteIdleMCI.entity";
import { GSMLongCallMCI } from "./gsmLongCallMCI.entity";
import { WCDMALongCallMCI } from "./wcdmaLongCallMCI.entity";
import { FTPDL } from "./ftpDL.entity";
import { FTPUL } from "./ftpUL.entity";
import { MSData } from "./ms-data.entity";
import { GPSData } from "./gps-data.entity";
import { GSMIdleMTN } from "./gsmIdleMTN.entity";
import { WCDMAIdleMTN } from "./wcdmaIdleMTN.entity";
import { LTEIdleMTN } from "./lteIdleMTN.entity";
import { GSMLongCallMTN } from "./gsmLongCallMTN.entity ";
import { WCDMALongCallMTN } from "./wcdmaLongCallMTN.entity";

@Entity()
export class Inspection {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false })
    type: logLocationType;

    @Column({ nullable: false })
    code: string

    @ManyToOne(() => User, (user) => user.inspections, { nullable: false })
    expert: User;
////////////////////////////////////////////////////////////////////////////////////////////////////
    @OneToMany(() => GSMIdleMCI, (gsmIdle) => gsmIdle.inspection, { cascade: true })
    gsmIdlesMCI: GSMIdleMCI[];

    @OneToMany(() => WCDMAIdleMCI, (wcdmaIdle) => wcdmaIdle.inspection, { cascade: true })
    wcdmaIdlesMCI: WCDMAIdleMCI[];

    @OneToMany(() => LTEIdleMCI, (lteIdle) => lteIdle.inspection, { cascade: true })
    lteIdlesMCI: LTEIdleMCI[];

    @OneToMany(() => GSMLongCallMCI, (gsmLongCall) => gsmLongCall.inspection, { cascade: true })
    gsmLongCallsMCI: GSMLongCallMCI[];

    @OneToMany(() => WCDMALongCallMCI, (wcdmaLongCall) => wcdmaLongCall.inspection, { cascade: true })
    wcdmaLongCallsMCI: WCDMALongCallMCI[];
////////////////////////////////////////////////////////////////////////////////////////////////////
    @OneToMany(() => GSMIdleMTN, (gsmIdle) => gsmIdle.inspection, { cascade: true })
    gsmIdlesMTN: GSMIdleMTN[];

    @OneToMany(() => WCDMAIdleMTN, (wcdmaIdle) => wcdmaIdle.inspection, { cascade: true })
    wcdmaIdlesMTN: WCDMAIdleMTN[];

    @OneToMany(() => LTEIdleMTN, (lteIdle) => lteIdle.inspection, { cascade: true })
    lteIdlesMTN: LTEIdleMTN[];

    @OneToMany(() => GSMLongCallMTN, (gsmLongCall) => gsmLongCall.inspection, { cascade: true })
    gsmLongCallsMTN: GSMLongCallMTN[];

    @OneToMany(() => WCDMALongCallMTN, (wcdmaLongCall) => wcdmaLongCall.inspection, { cascade: true })
    wcdmaLongCallsMTN: WCDMALongCallMTN[];
/////////////////////////////////////////////////////////////////////////////////////////////////////
    @OneToMany(() => FTPDL, (ftpDL) => ftpDL.inspection, { cascade: true })
    ftpDLs: FTPDL[];

    @OneToMany(() => FTPUL, (ftpUL) => ftpUL.inspection, { cascade: true })
    ftpULs: FTPUL[];

    @OneToMany(() => MSData, (msData) => msData.inspection, { cascade: true })
    msDatas: MSData[];

    @OneToMany(() => GPSData, (gpsData) => gpsData.inspection, { cascade: true })
    gpsDatas: GPSData[];

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}