import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Quectel } from "./prob/entities/quectel.entity";
import { GPSData } from "./prob/entities/gps-data.entity";
import { User } from "./prob/entities/user.entity";
import { Inspection } from "./prob/entities/inspection.entity";
import { GSMIdle } from "./prob/entities/gsmIdle.entity";
import { WCDMAIdle } from "./prob/entities/wcdmaIdle.entity";
import { LTEIdle } from "./prob/entities/lteIdle.entity";

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService<IconfigService>) => {
                const options: TypeOrmModuleOptions = {
                    type: 'mysql',
                    logging: false,
                    replication: {
                        master: {
                            host: configService.get<string>('MYSQL_HOST'),
                            port: configService.get<number>('MYSQL_PORT'),
                            username: configService.get<string>('MYSQL_USERNAME'),
                            password: configService.get<string>('MYSQL_PASSWORD'),
                            database: configService.get<string>('MYSQL_DB_NAME'),
                        },
                        slaves: [
                            {
                                host: '192.168.0.108',
                                port: 3366,
                                username: configService.get<string>('MYSQL_USERNAME'),
                                password: configService.get<string>('MYSQL_PASSWORD'),
                                database: configService.get<string>('MYSQL_DB_NAME'),
                            }
                        ]
                    },
                    entities: [
                        User,
                        Quectel,
                        GPSData,
                        Inspection,
                        GSMIdle,
                        WCDMAIdle,
                        LTEIdle
                    ],
                    synchronize: true,
                    // synchronize: false,
                    // migrations: ['src/migration_dev/*.js'],
                };

                return options;
            },
            inject: [ConfigService],
        }),
    ]
})

export class DatabaseModule { }