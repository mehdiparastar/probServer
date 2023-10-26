import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inspection } from "./inspection.entity";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index({ unique: true })
    email: string;

    @Column({ nullable: true })
    name: string;

    @OneToMany(() => Inspection, (inspection) => inspection.expert, { cascade: true })
    inspections: Inspection[];

    @CreateDateColumn()
    createdAt?: Date;

    @UpdateDateColumn()
    updatedAt?: Date;
}