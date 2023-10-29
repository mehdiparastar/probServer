import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1698585739114 implements MigrationInterface {
    name = 'Init1698585739114'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`gsm_idle\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tech\` varchar(255) NULL, \`mcc\` varchar(255) NULL, \`mnc\` varchar(255) NULL, \`lac\` varchar(255) NULL, \`cellid\` varchar(255) NULL, \`bsic\` varchar(255) NULL, \`arfcn\` varchar(255) NULL, \`bandgsm\` varchar(255) NULL, \`rxlev\` varchar(255) NULL, \`txp\` varchar(255) NULL, \`tla\` varchar(255) NULL, \`drx\` varchar(255) NULL, \`c1\` varchar(255) NULL, \`c2\` varchar(255) NULL, \`gprs\` varchar(255) NULL, \`tch\` varchar(255) NULL, \`ts\` varchar(255) NULL, \`ta\` varchar(255) NULL, \`maio\` varchar(255) NULL, \`hsn\` varchar(255) NULL, \`rxlevsub\` varchar(255) NULL, \`rxlevfull\` varchar(255) NULL, \`rxqualsub\` varchar(255) NULL, \`rxqualfull\` varchar(255) NULL, \`voicecodec\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`inspectionId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`wcdma_idle\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tech\` varchar(255) NULL, \`mcc\` varchar(255) NULL, \`mnc\` varchar(255) NULL, \`lac\` varchar(255) NULL, \`cellid\` varchar(255) NULL, \`uarfcn\` varchar(255) NULL, \`psc\` varchar(255) NULL, \`rac\` varchar(255) NULL, \`rscp\` varchar(255) NULL, \`ecio\` varchar(255) NULL, \`phych\` varchar(255) NULL, \`sf\` varchar(255) NULL, \`slot\` varchar(255) NULL, \`speech_code\` varchar(255) NULL, \`comMod\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`inspectionId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`lte_idle\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tech\` varchar(255) NULL, \`is_tdd\` varchar(255) NULL, \`mcc\` varchar(255) NULL, \`mnc\` varchar(255) NULL, \`cellid\` varchar(255) NULL, \`pcid\` varchar(255) NULL, \`earfcn\` varchar(255) NULL, \`freq_band_ind\` varchar(255) NULL, \`ul_bandwidth\` varchar(255) NULL, \`dl_bandwidth\` varchar(255) NULL, \`tac\` varchar(255) NULL, \`rsrp\` varchar(255) NULL, \`rsrq\` varchar(255) NULL, \`rssi\` varchar(255) NULL, \`sinr\` varchar(255) NULL, \`srxlev\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`inspectionId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`inspection\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` varchar(255) NOT NULL, \`code\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`expertId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`name\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`quectel\` (\`id\` int NOT NULL AUTO_INCREMENT, \`serialPortNumber\` int NOT NULL, \`modelName\` varchar(255) NOT NULL, \`revision\` varchar(255) NOT NULL, \`fd\` int NOT NULL, \`IMSI\` varchar(255) NULL, \`IMEI\` varchar(255) NULL, \`simStatus\` varchar(255) NULL, \`activeScenario\` varchar(255) NULL, \`gpsEnabling\` varchar(255) NULL, \`isGPSActive\` varchar(255) NULL, \`lockStatus\` varchar(255) NULL DEFAULT 'allTech', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_18732b7a56555b1d1482eb9851\` (\`serialPortNumber\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`gps_data\` (\`id\` int NOT NULL AUTO_INCREMENT, \`gpsTime\` varchar(255) NOT NULL, \`latitude\` varchar(255) NOT NULL, \`longitude\` varchar(255) NOT NULL, \`altitude\` varchar(255) NULL, \`groundSpeed\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_46d0e1b81243641374b88c7a64\` (\`gpsTime\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`gsm_idle\` ADD CONSTRAINT \`FK_ec73a4697e989e4e47106379d88\` FOREIGN KEY (\`inspectionId\`) REFERENCES \`inspection\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`wcdma_idle\` ADD CONSTRAINT \`FK_98b155a835cb18088a231631866\` FOREIGN KEY (\`inspectionId\`) REFERENCES \`inspection\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`lte_idle\` ADD CONSTRAINT \`FK_101c559f318853b32dd7e768ece\` FOREIGN KEY (\`inspectionId\`) REFERENCES \`inspection\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`inspection\` ADD CONSTRAINT \`FK_d3f144c3f4d9504f2ebbb912c99\` FOREIGN KEY (\`expertId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`inspection\` DROP FOREIGN KEY \`FK_d3f144c3f4d9504f2ebbb912c99\``);
        await queryRunner.query(`ALTER TABLE \`lte_idle\` DROP FOREIGN KEY \`FK_101c559f318853b32dd7e768ece\``);
        await queryRunner.query(`ALTER TABLE \`wcdma_idle\` DROP FOREIGN KEY \`FK_98b155a835cb18088a231631866\``);
        await queryRunner.query(`ALTER TABLE \`gsm_idle\` DROP FOREIGN KEY \`FK_ec73a4697e989e4e47106379d88\``);
        await queryRunner.query(`DROP INDEX \`IDX_46d0e1b81243641374b88c7a64\` ON \`gps_data\``);
        await queryRunner.query(`DROP TABLE \`gps_data\``);
        await queryRunner.query(`DROP INDEX \`IDX_18732b7a56555b1d1482eb9851\` ON \`quectel\``);
        await queryRunner.query(`DROP TABLE \`quectel\``);
        await queryRunner.query(`DROP INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` ON \`user\``);
        await queryRunner.query(`DROP TABLE \`user\``);
        await queryRunner.query(`DROP TABLE \`inspection\``);
        await queryRunner.query(`DROP TABLE \`lte_idle\``);
        await queryRunner.query(`DROP TABLE \`wcdma_idle\``);
        await queryRunner.query(`DROP TABLE \`gsm_idle\``);
    }

}
