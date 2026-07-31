module.exports = {
  apps: [
    {
      name: "trackodev-scheduler",
      cwd: __dirname,
      script: "artisan",
      args: "schedule:work",
      interpreter: "php",
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
      time: true,
      env: {
        APP_ENV: "production",
      },
    },
  ],
};
