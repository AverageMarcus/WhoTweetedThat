import * as Hapi from 'hapi';
import * as HTTP from 'http';
import * as SocketIO from 'socket.io';
import {Game} from './Game';

export class Server {
  private server: any;
  private socket: any;

  private game;

  constructor() {
  }

  public async start() {
    this.server = new Hapi.Server();
    this.server.register(require('vision'), (err) => {
      this.server.views({
        engines: {
          html: require('handlebars')
        },
        isCached: false,
        relativeTo: __dirname,
        layout: true,
        path: 'views',
        layoutPath: 'views/layout'
      });

      this.server.connection({
        host: 'localhost',
        port: process.env.PORT
      });

      this.socket = SocketIO(this.server.listener);
      this.game = new Game(this.socket);

      this.server.route({
        method: 'GET',
        path:'/',
        handler: (request, reply) => {
          return reply.view('index');
        }
      });

      this.server.route({
        method: 'GET',
        path:'/host',
        handler: (request, reply) => {
          const roomCode = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 4).toUpperCase();
          this.game.init(roomCode);
          return reply.view('host', { roomCode: roomCode });
        }
      });

      this.server.route({
        method: 'GET',
        path:'/start/{roomCode}',
        handler: (request, reply) => {
          this.game.start(request.params.roomCode);
          return reply(200);
        }
      });

      this.server.route({
        method: 'GET',
        path:'/stop/{roomCode}',
        handler: (request, reply) => {
          this.game.stop(request.params.roomCode);
          return reply(200);
        }
      });

      this.server.start((err) => {
        if (err) {
          throw err;
        }
        console.log(this.server.info);
      });
    });
  }
}