import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inspection } from "./inspection.entity";
import { GPSData } from "./gps-data.entity";
import { callStatus } from "../enum/callStatus.enum";

@Entity()
export class FTPDL {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    speed: number    

    @Column({ nullable: true })
    roundNumber: number 

    @ManyToOne(() => Inspection, (inspection) => inspection.ftpDLs, { nullable: false })
    inspection: Inspection;

    @ManyToOne(() => GPSData, (location) => location.ftpDLSamples, { nullable: true })
    location: GPSData

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}