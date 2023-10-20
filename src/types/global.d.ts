import { User as UserEntity } from "src/users/entities/user.entity";
import { DataSourceOptions } from "typeorm";

export { };

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

    interface IDBConfig {
        development: DataSourceOptions;
        test?: DataSourceOptions;
        production?: DataSourceOptions;
    }

    namespace Express {
        interface Request {
            user?: Partial<UserEntity>;
        }
    }

    interface IGoogleUser {
        provider: string;
        providerId: string;
        name: string;
        email: string;
        photo: string;
        accessToken?: string;
        refreshToken?: string;
    }

    interface IJwtPayload {
        sub: number;
        email: string;
    }

    interface IJWTTokensPair {
        accessToken: string;
        refreshToken: string;
    }

    type SocketWithAuth = Socket & AuthPayload;
    type RequestWithAuth = Request & AuthPayload;
}