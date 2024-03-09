import { User as UserEntity } from "src/users/entities/user.entity";
import { DataSourceOptions } from "typeorm";
import { dtCurrentStatusENUM } from '../prob/enum/dtcurrentStatus.enum'

export { };

declare global {
    var recording: boolean
    var activeIntervals: NodeJS.Timeout[]

    var portsInitingStatus = [{
        port: number,
        progress: number
    }]

    var dtCurrentStatus: dtCurrentStatusENUM

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

    interface IDBConfig {
        development: DataSourceOptions;
        test?: DataSourceOptions;
        production?: DataSourceOptions;
    }

}