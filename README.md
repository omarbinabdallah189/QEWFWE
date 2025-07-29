# Discord Selfbot Script

This is a Discord selfbot script that connects to a specific voice channel, maintains the connection, and listens for commands from the user itself in a specific text channel. It supports dynamic activity updates, avatar changes, and graceful shutdown.

## Features

- Connects to a specified voice channel and maintains connection with automatic reconnection.
- Responds to commands like `!ping`, `!activity <text>`, and `!avatar <url>` in a specific text channel.
- Updates user presence and avatar.
- Sets default activity on startup.
- Graceful shutdown on process termination.

## Setup

1. Clone the repository.

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:

```
DISCORD_TOKEN=your_discord_token_here
```

Replace `your_discord_token_here` with your actual Discord token.

## Usage

Start the bot with:

```bash
npm start
```

## Notes

- This is a selfbot script and may violate Discord's Terms of Service. Use at your own risk.
- Make sure to keep your token secure and never share it publicly.

## License

ISC
