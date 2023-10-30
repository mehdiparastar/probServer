import { User } from "./prob/entities/user.entity";
import { Quectel } from "./prob/entities/quectel.entity";
import { GPSData } from "./prob/entities/gps-data.entity";
import { GSMIdle } from "./prob/entities/gsmIdle.entity";
import { Inspection } from "./prob/entities/inspection.entity";
import { LTEIdle } from "./prob/entities/lteIdle.entity";
import { WCDMAIdle } from "./prob/entities/wcdmaIdle.entity";
import { DataSource, DataSourceOptions } from "typeorm";
import { config as dotenvConfig } from 'dotenv';
import { registerAs } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

dotenvConfig({ path: `.${process.env.NODE_ENV}.env` })

const config: TypeOrmModuleOptions = {
  type: 'mysql',
  logging: false,
  host: `${process.env.MYSQL_HOST}`,
  port: Number(process.env.MYSQL_PORT),
  username: `${process.env.MYSQL_USERNAME}`,
  password: `${process.env.MYSQL_PASSWORD}`,
  database: `${process.env.MYSQL_DB_NAME}`,
  migrations: ["dist/migrations/*{.ts,.js}"],
  synchronize: true,
  entities: [
    User,
    Quectel,
    GPSData,
    Inspection,
    GSMIdle,
    WCDMAIdle,
    LTEIdle
  ],
};

export default registerAs('typeorm', () => config)

export const AppDataSource = new DataSource(config as DataSourceOptions);