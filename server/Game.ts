import {TweetService} from './TweetService';

export class Game {
  private tweetService: TweetService;
  private intervalId;
  private games: any = {};
  private socket;
  private roundTime: number = 10 * 1000; // 10 seconds

  constructor(socket) {
    this.socket = socket;
    this.tweetService = new TweetService();
    this.tweetService.start();
  }

  public init(roomCode: string) {
    this.games[roomCode] = {
      timeoutId: undefined,
      rounds: []
    };
    const room = this.socket.of(`/${roomCode}`);
    room.on('connection', socket => {
      socket.on('join', (user) => {
        console.log(`${user.name} joined ${roomCode}`);
        socket.broadcast.emit('join', user);
      });

      socket.on('choice', data => {
        const round = this.games[roomCode].rounds[this.games[roomCode].rounds.length - 1];
        round.answers.push(data);
      });
    });
  }

  public start(roomCode: string) {
    console.log(`Starting a game in room ${roomCode}`);
    this.socket.of(`/${roomCode}`).emit('start');
    this.nextRound(roomCode);
  }

  public stop(roomCode: string) {
    console.log(`Ending game in room ${roomCode}`);

    if (this.games[roomCode].rounds && this.games[roomCode].rounds.length) {
      let winners: any[] = [];
      this.games[roomCode].rounds.forEach(round => {
        winners = winners.concat(round.answers.filter(answer => answer.answer === round.tweet.user.screen_name).map(answer => answer.user));
      });

      let uniqueWinners: any[] = winners.filter((v,i,arr) => i==arr.findIndex(w=>w.name===v.name));
      uniqueWinners = uniqueWinners.map(winner => {
        return {
          name: winner.name,
          photo: winner.photo,
          wins: winners.filter(w => w.name === winner.name).length
        };
      });

      const winningScore = Math.max(...<number[]>Object.values(uniqueWinners.map(w => w.wins)));
      uniqueWinners = uniqueWinners.filter(winner => winner.wins === winningScore);
      this.socket.of(`/${roomCode}`).emit('endResults', uniqueWinners);
    }

    clearTimeout(this.games[roomCode].timeoutId);
  }

  private nextRound(roomCode: string) {
    if (this.games[roomCode].rounds && this.games[roomCode].rounds.length) {
      // Announce winners
      const round = this.games[roomCode].rounds[this.games[roomCode].rounds.length - 1];
      const winners = round.answers
        .filter(answer => answer.answer === round.tweet.user.screen_name)
        .map(answer => answer.user);
      const losers = round.answers
        .filter(answer => answer.answer !== round.tweet.user.screen_name)
        .map(answer => answer.user);

      this.socket.of(`/${roomCode}`).emit('endRound', {
        winners: winners,
        losers: losers
      });
    }

    const tweet = this.tweetService.getTweet();
    this.games[roomCode].rounds.push({
      tweet: tweet.tweet,
      answers: []
    });
    this.socket.of(`/${roomCode}`).emit('tweet', {
      text: tweet.text,
      choices: tweet.choices
    });
    this.games[roomCode].timeoutId = setTimeout(() => this.nextRound(roomCode), this.roundTime);
  }
}