const http = require("http");
const app = require("./app");
const { initializeSocket } = require("./socket/socket");

const PORT = 5000;
const server = http.createServer(app);

initializeSocket(server);

server.listen(PORT, () => {
  console.log(`DevFlow AI API running on port ${PORT}`);
});