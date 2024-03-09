import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

declare global {
    interface IconfigService {
        CLIENT_PORT?: number;
        SERVER_PORT?: number;

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
            inject: [ConfigService],
        }),
    ]
})

export class DatabaseModule { }