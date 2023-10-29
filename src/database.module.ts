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

declare global {
    interface IconfigService {
        CLIENT_PORT?: number;
        SERVER_PORT?: number;
        JWT_ACCESS_SECRET?: string;
        JWT_REFRESH_SECRET?: string;
        JWT_ACCESS_EXPIRATION_TIME?: string | number;
        JWT_REFRESH_EXPIRATION_TIME?: string | number;
        OAUTH_GOOGLE_ID?: string;
        OAUTH_GOOGLE_SECRET?: string;
        OAUTH_GOOGLE_REDIRECT_URL?: string;

        MYSQL_USERNAME?: string
        MYSQL_PASSWORD?: string
        MYSQL_ROOT_PASSWORD?: string
        MYSQL_DB_NAME?: string
        MYSQL_HOST?: string
        MYSQL_PORT?: number
        RUNNING_MECHINE_URL?: string;

    }
}


@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => (configService.get('typeorm')),
            // useFactory: async (configService: ConfigService<IconfigService>) => {
            //     const options: TypeOrmModuleOptions = {
            //         type: 'mysql',
            //         logging: true,
            //         replication: {
            //             master: {
            //                 host: configService.get<string>('MYSQL_HOST'),
            //                 port: configService.get<number>('MYSQL_PORT'),
            //                 username: configService.get<string>('MYSQL_USERNAME'),
            //                 password: configService.get<string>('MYSQL_PASSWORD'),
            //                 database: configService.get<string>('MYSQL_DB_NAME'),
            //             },
            //             slaves: [
            //                 {
            //                     host: '192.168.0.108',
            //                     port: 3366,
            //                     username: configService.get<string>('MYSQL_USERNAME'),
            //                     password: configService.get<string>('MYSQL_PASSWORD'),
            //                     database: configService.get<string>('MYSQL_DB_NAME'),
            //                 }
            //             ]
            //         },
            //         entities: [
            //             User,
            //             Quectel,
            //             GPSData,
            //             Inspection,
            //             GSMIdle,
            //             WCDMAIdle,
            //             LTEIdle
            //         ],
            //         synchronize: false,
            //         // synchronize: false,
            //         // migrations: ['src/migration_dev/*.js'],
            //     };

            //     return options;
            // },
            inject: [ConfigService],
        }),
    ]
})

export class DatabaseModule { }