import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Quectel } from "./prob/entities/quectel.entity";

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService<IconfigService>) => {
                const options: TypeOrmModuleOptions = {
                    type: 'mysql',
                    host: configService.get<string>('MYSQL_HOST'),
                    port: configService.get<number>('MYSQL_PORT'),
                    username: configService.get<string>('MYSQL_USERNAME'),
                    password: configService.get<string>('MYSQL_PASSWORD'),
                    database: configService.get<string>('MYSQL_DB_NAME'),
                    entities: [
                        Quectel
                    ],
                    synchronize: true,
                    // synchronize: false,
                    // migrations: ['src/migration_dev/*.js'],
                    logging: false,
                };

                return options;
            },
            inject: [ConfigService],
        }),
    ]
})

export class DatabaseModule { }