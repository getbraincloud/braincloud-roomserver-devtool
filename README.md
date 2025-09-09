# Room Server Manager Dev Tool (RSM tool for short) for brainCloud

This is a development tool for room servers and an example of how you can run your own room server manager to launch your own dedicated room servers for your brainCloud application/game. 

In this example, it is assumed that you have a docker image of your server, this uses the Dockerode node.js package to create a container for your server image and run it locally.

This tool is ideal for development use, it enables the developer to have immediate access to the room server logs and to debug and test any issues with room servers more easily.

## Setup

First, you need to create a Room Server Manager type server in your apps dashboard in the brainCloud portal, then point the IP address of this room server manager to the IP of the machine that will run this Room Server Manager.

IMPORTANT: This tool runs a listen server on port 3000 - You must make sure this port is open on the machine that runs this

Then you must create a new lobby type which uses this room server manager.

You also need to have a Docker image of your server built, if you want to run your server through other means, there are many ways you can run and manage it through node.js

Make sure to modify the config.js file to input your brainCloud credentials, as well as the image identifier for the Docker image you want to run.

## Running

Make sure all node packages are installed by running `npm install` in the projects folder

To run, simply call `node app.js` in a command prompt in the projects folder.

## Testing

To test, have your project create a lobby of the lobby type you created earlier that uses the room server manager, then start that lobby and it should connect to your Room Server Manager and request a room server.

## Extending and building on this tool

If you wish to launch a server in a different manner, or if you want to create and actual room server manager that can launch multiple instances of different types of servers, it is possible to use this tool as a starting point. For example, if your server is a `.exe` file that can take in the `appId`, `serverName`, `serverSecret` and `LobbyId` as parameters when running it, then you can modify the code in `app.js` to instead open that `.exe` file with those parameters.

## Debug Mode

In the latest update, we've added the ability to run the tool in `debug` mode by setting `config.debug` to `true`. When debug mode is false, a server is launched as a Docker container based on the server image referred to in `config.dockerImage` and the credentials are provided as environment variables to that container, so the server can initialize and be ready to receive players on startup, this is good for general testing, making sure everything works. When debug mode is true, a server would have to be already running and idling, and can receive the S2S credentials and lobbyId from the RSM tool during runtime, instead of as environment variables on start. This allows for deeper debugging of your server, but your server has to be set up to handle debug mode as well. The flow for debug mode goes like this:

- Create a client build of your game, this is what a normal player would run. This would allow players to log into brainCloud, get into a lobby and start the lobby.
- Run the RSM tool with `config.debug` set to true in `config.js` 
- Run an instance of your game server locally, if you are using Unity or Unreal, you could run it in the editor. For Unreal, you need to Play as a Listen Server, you can also use this to hit any breakpoints you want to test for. 
- In your server instance, have a way to connect to the RSM tool websocket server, this could either be done on server start or with a UI button, make sure to connect to `ws://127.0.0.1:8888`
- Once connected, the RSM tool will send this message to your server: ```ws.send(`{op: 'InitS2S', data: { appId:${config.appId}, serverName:${config.serverName}, serverSecret:${config.serverSecret}}}`);``` - Your server should handle this message by initializing the proper S2S library with these given credentials.
- Once S2S is initialized, your server is ready to receive the lobbyId. Run an instance of your client build that you built in the first step, log in and create a lobby (of the lobby type that uses the RSM server) and then start that lobby. You should be seeing the RSM tool process that request for a room server and send the given lobbyId to your local running server via the WebSocket message like so: ```ws.send(`{op: 'AssignLobby', data: { lobbyId: ${lobbyId}}}`);``` Your server should handle this message to then properly look up the lobbyId and get the lobbys data from brainCloud, and then call `{"service":"lobby", "operation":"SYS_ROOM_READY", "data":{"lobbyId":[theLobbyId]}}` - When this is called the lobby will receive the `ROOM_READY` message and the lobby members should then begin to connect to your game server.

This is showcased in the Unreal dedicated server demo, also known as Strike of Duty (Dedicated) in the readme [here](https://github.com/getbraincloud/braincloud-roomserver-unreal/tree/nick/RSMDebugging?tab=readme-ov-file#server-debugging) 






