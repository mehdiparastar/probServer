import { User } from "./prob/entities/user.entity";
import { Quectel } from "./prob/entities/quectel.entity";
import { GPSData } from "./prob/entities/gps-data.entity";
import { GSMIdleMCI } from "./prob/entities/gsmIdleMCI.entity";
import { Inspection } from "./prob/entities/inspection.entity";
import { LTEIdleMCI } from "./prob/entities/lteIdleMCI.entity";
import { WCDMAIdleMCI } from "./prob/entities/wcdmaIdleMCI.entity";
import { DataSource, DataSourceOptions } from "typeorm";
import { config as dotenvConfig } from 'dotenv';
import { registerAs } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { GSMLongCallMCI } from "./prob/entities/gsmLongCallMCI.entity";
import { WCDMALongCallMCI } from "./prob/entities/wcdmaLongCallMCI.entity";
import { FTPDL } from "./prob/entities/ftpDL.entity";
import { FTPUL } from "./prob/entities/ftpUL.entity";
import { MSData } from "./prob/entities/ms-data.entity";
import { GSMIdleMTN } from "./prob/entities/gsmIdleMTN.entity";
import { WCDMAIdleMTN } from "./prob/entities/wcdmaIdleMTN.entity";
import { LTEIdleMTN } from "./prob/entities/lteIdleMTN.entity";
import { GSMLongCallMTN } from "./prob/entities/gsmLongCallMTN.entity ";
import { WCDMALongCallMTN } from "./prob/entities/wcdmaLongCallMTN.entity";

dotenvConfig({ path: `.${process.env.NODE_ENV}.env` })

const config: TypeOrmModuleOptions = {
  type: 'mariadb',
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
    GSMIdleMCI,
    WCDMAIdleMCI,
    LTEIdleMCI,
    GSMLongCallMCI,
    WCDMALongCallMCI,
    GSMIdleMTN,
    WCDMAIdleMTN,
    LTEIdleMTN,
    GSMLongCallMTN,
    WCDMALongCallMTN,
    FTPDL,
    FTPUL,
    MSData
  ],
};

export default registerAs('typeorm', () => config)

export const AppDataSource = new DataSource(config as DataSourceOptions);