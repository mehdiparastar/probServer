import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { logLocationType } from "../enum/logLocationType.enum";

@Entity()
export class Quectel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    serialPortNumber: number

    @Column()
    modelName: string

    @Column()
    revision: string

    @Column()
    fd: number

    @Column({ nullable: true })
    IMSI?: string

    @Column({ nullable: true })
    IMEI?: string

    @Column({ nullable: true })
    simStatus?: string

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}
