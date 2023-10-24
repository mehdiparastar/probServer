import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}