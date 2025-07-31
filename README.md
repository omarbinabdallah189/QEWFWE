# Selfbot Script for Discord

## Overview
This script is a selfbot for Discord using the `discord.js-selfbot-v13` library. It supports multiple accounts and automates activities such as setting presence, joining voice channels, and responding to specific commands.

## Configuration
- Static configurations such as accounts (except tokens) and auto activities are stored in `config.json`.
- Tokens must be provided via environment variables named `DISCORD_TOKEN_1`, `DISCORD_TOKEN_2`, etc.

## Usage
1. Set your Discord tokens as environment variables.
2. Configure your accounts and auto activities in `config.json`.
3. Run the script with Node.js.

## Recommendations and Best Practices

### Code Quality and Modularity
- The script scopes all mutable client variables inside the `createClient` function to avoid side effects between instances.
- Static configurations are externalized to `config.json` for easier maintenance.
- Unused dependencies and dead code have been removed to reduce complexity and resource usage.

### Error Handling and Logging
- Enhanced error handling with detailed logs including timestamps and error types.
- Input validation and sanitization are implemented for commands that accept user input.

### Security Considerations
- Tokens are managed securely via environment variables; avoid committing tokens to version control.
- Be aware of Discord API rate limits to prevent account bans.
- Validate and sanitize all user inputs to prevent unexpected behavior.

### Compliance and Alternatives
- Using selfbots violates Discord's Terms of Service and risks account termination.
- It is strongly recommended to migrate to official Discord bots using the Discord Bot API for automation.
- If continuing with selfbots, consider a minimalistic approach by disabling interactive commands to reduce detection risk.

## Disclaimer
Use this script at your own risk. The author is not responsible for any account bans or other consequences resulting from its use.

## License
Specify your license here.
