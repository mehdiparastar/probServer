import {
  forwardRef,
  Inject,
  Logger,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { WsCatchAllFilter } from 'src/exceptions/ws-catch-all-filter';
import { ProbService } from './prob.service';
import { dtCurrentStatusENUM } from './enum/dtcurrentStatus.enum';
import { logLocationType } from './enum/logLocationType.enum';


export const probSocketInItRoom = "probSocketInItRoom"




@UsePipes(new ValidationPipe())
@UseFilters(new WsCatchAllFilter())
@WebSocketGateway({
  namespace: 'prob/prob-socket',
})
export class ProbGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ProbGateway.name);

  @WebSocketServer() io: Namespace;

  constructor(
    @Inject(forwardRef(() => ProbService))
    private readonly probService: ProbService,
  ) { }

  async afterInit(io: Namespace) {
    this.logger.log(
      `**Websocket Gateway initialized with the name => ${io.name}.**`,
    );
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const sockets = this.io.sockets;
    this.logger.debug(`Socket connected with id: ${client.id}`);
    this.logger.debug(`Number of connected sockets: ${sockets.size}`);

    await client.join(probSocketInItRoom);

    const clients = this.io.adapter.rooms.get(probSocketInItRoom)
    this.emitProbSocket()

    this.logger.debug(`socket id: ${client.id} joined to ${probSocketInItRoom} room. Current ROOMS Count is: ${clients ? clients.size : 0}`);
    // To Know Rooms name do: client.rooms.forEach((roomId) => console.log(roomId));
  }

  async handleDisconnect(client: Socket) {
    await client.leave(probSocketInItRoom)
    this.emitProbSocket()
    console.log(`socket with id of '${client.id}' disconnected.`);
  }

  emitProbSocket() {
    const clients = this.io.adapter.rooms.get(probSocketInItRoom)
    this.io.to(probSocketInItRoom).emit('getProbSocket', { connected: true, connectedClientCount: clients ? clients.size : 0 })
  }

  emitPortsInitingStatus(portNumber: number, progress: number) {
    this.io.to(probSocketInItRoom).emit("portsInitingStatus", {
      port: portNumber,
      progress,
    });
  }

  emitDTCurrentStatus(status: dtCurrentStatusENUM) {
    this.io.to(probSocketInItRoom).emit('dtCurrentStatus', { status })
  }

  emitDTCurrentExpertId(expertId: number) {
    this.io.to(probSocketInItRoom).emit('dtCurrentExpertId', { expertId })
  }

  emitDTCurrentLogLocType(logLocType: logLocationType) {
    this.io.to(probSocketInItRoom).emit('dtCurrentLogLocType', { logLocType })
  }

  emitDTCurrentLogLocCode(logLocCode: string) {
    this.io.to(probSocketInItRoom).emit('dtCurrentLogLocCode', { logLocCode })
  }
}


