module.exports = {
  apps: [{
    name: "moshavi",
    script: "./node_modules/.bin/next",
    args: "start",
    cwd: "/var/www/moshavi",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
};
