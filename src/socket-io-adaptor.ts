import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions, Socket } from 'socket.io';
import { ProbService } from './prob/prob.service';

export class ApplicationSocketIOAdapter extends IoAdapter {
    private readonly logger = new Logger(ApplicationSocketIOAdapter.name);
    constructor(
        private app: INestApplicationContext,
        private configService: ConfigService<IconfigService>,
    ) {
        super(app);
    }

    createIOServer(port: number, options?: ServerOptions) {
        const clientPort = this.configService.get<number>('CLIENT_PORT');

        // cors: {origin: '*'}

        this.logger.warn(port)
        const optionsWithCORS: ServerOptions = {
            ...options,
            cors: { origin: "*" }
        };

        const probService = this.app.get(ProbService);

        const server: Server = super.createIOServer(port, optionsWithCORS);

        server
            .of('prob/prob-socket')
            .use(
                createProbMiddleware(
                    probService,
                    this.logger,
                ),
            );

        return server;
    }
}



const createProbMiddleware =
    (
        probService: ProbService,
        logger: Logger,
    ) =>
        async (socket: Socket, next) => {
            // for Postman testing support, fallback to token header

            try {
                logger.debug(`MiddleWare before connection of socket ${socket.id}`);
                next();
            } catch (ex) {
                next(ex);
                // next(new Error('FORBIDDEN'));
            }
        };
