import * as Twitter from 'twit';

function shuffle(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
  return a;
}

export class TweetService {
  private twitter: Twitter;
  private users: string[];
  private tweets: any[] = [];
  private twitterUsers: any[] = [];

  constructor() {
    this.twitter = new Twitter({
      consumer_key: process.env.TWITTER_KEY,
      consumer_secret: process.env.TWITTER_SECRET,
      app_only_auth: true
    });

    this.users = process.env.TWITTER_USERS.split(',').map(user => user.trim());
    console.log(this.users);
  }

  public async start() {
    await this.updateCache();
  }

  public getTweet() {
    const tweet = this.tweets[Math.floor(Math.random()*this.tweets.length)];
    const choices = [tweet.user].concat(this.twitterUsers.filter(user => user.screen_name !== tweet.user.screen_name)).slice(0, 4);

    return {
      text: tweet.text,
      choices: shuffle(choices),
      tweet: tweet
    };
  }

  private async updateCache() {
    this.tweets = [];
    this.twitterUsers = [];
    for (let user of this.users) {
      if (user[0] !== '@') {
        user = '@' + user;
      }
      this.tweets = this.tweets.concat((await this.getTweets(user)).map(this.stripTweet));
    }
    this.tweets = this.tweets.filter(tweet => !!tweet);
  }

  private async getTweets(user): Promise<any> {
    console.log(`Getting tweets for ${user}`);
    return new Promise<any>((resolve, reject) => {
      this.twitter.get('statuses/user_timeline', <any>{
        screen_name: user,
        include_rts: false,
        count: 100
      }, (err, data, response) => {
        if(err || !data) {
          console.log(data);
          return reject('💩 ' + err);
        }

        this.twitterUsers.push(data[0].user);
        return resolve(data);
      });
    });
  }

  private stripTweet(tweet) {
    if (tweet && tweet.text) {
      tweet.text = tweet.text.replace(/#\S+/g, '');
      tweet.text = tweet.text.replace(/\s\s+/g, ' ');
      return tweet;
    }
  }
}