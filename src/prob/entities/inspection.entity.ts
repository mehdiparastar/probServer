import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { logLocationType } from "../enum/logLocationType.enum";
import { User } from "./user.entity";
import { GSMIdle } from "./gsmIdle.entity";
import { WCDMAIdle } from "./wcdmaIdle.entity";
import { LTEIdle } from "./lteIdle.entity";
import { GSMLongCall } from "./gsmLongCall.entity";
import { WCDMALongCall } from "./wcdmaLongCall.entity";
import { FTPDL } from "./ftpDL.entity";
import { FTPUL } from "./ftpUL.entity";
import { ALLTECHIdle } from "./alltechIdle.entity";

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

    @OneToMany(() => GSMIdle, (gsmIdle) => gsmIdle.inspection, { cascade: true })
    gsmIdles: GSMIdle[];

    @OneToMany(() => WCDMAIdle, (wcdmaIdle) => wcdmaIdle.inspection, { cascade: true })
    wcdmaIdles: WCDMAIdle[];

    @OneToMany(() => LTEIdle, (lteIdle) => lteIdle.inspection, { cascade: true })
    lteIdles: LTEIdle[];

    @OneToMany(() => ALLTECHIdle, (alltechIdle) => alltechIdle.inspection, { cascade: true })
    alltechIdles: ALLTECHIdle[];

    @OneToMany(() => GSMLongCall, (gsmLongCall) => gsmLongCall.inspection, { cascade: true })
    gsmLongCalls: GSMLongCall[];

    @OneToMany(() => WCDMALongCall, (wcdmaLongCall) => wcdmaLongCall.inspection, { cascade: true })
    wcdmaLongCalls: WCDMALongCall[];

    @OneToMany(() => FTPDL, (ftpDL) => ftpDL.inspection, { cascade: true })
    ftpDLs: FTPDL[];

    @OneToMany(() => FTPUL, (ftpUL) => ftpUL.inspection, { cascade: true })
    ftpULs: FTPUL[];

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}