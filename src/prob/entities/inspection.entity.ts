import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { logLocationType } from "../enum/logLocationType.enum";
import { User } from "./user.entity";
import { GSMIdle } from "./gsmIdle.entity";
import { WCDMAIdle } from "./wcdmaIdle.entity";
import { LTEIdle } from "./lteIdle.entity";

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

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}