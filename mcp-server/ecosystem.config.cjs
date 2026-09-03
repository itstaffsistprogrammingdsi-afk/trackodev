module.exports = {
  apps: [{
    name: "traco-mcp",
    script: "dist/src/index.js",
    cwd: __dirname,
    interpreter: "node",
    node_args: "--enable-source-maps",
    instances: 1,
    autorestart: true,
    max_memory_restart: "256M",
    time: true,
    env: {
      NODE_ENV: "production",
      MCP_TRANSPORT: "http",
      MCP_HTTP_HOST: "127.0.0.1",
      MCP_HTTP_PORT: "3333",
    },
  }],
};
