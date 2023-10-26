import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { logLocationType } from "../enum/logLocationType.enum";
import { User } from "./user.entity";
import { GSMIdle } from "./gsmIdle.entity";

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

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}