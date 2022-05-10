export default {
  registry: {},
  web: {
    port: 1234,
    user: process.env.REGISTRY_ADMIN_USER,
    password: process.env.REGISTRY_ADMIN_PASSWORD,
    webclient:
      process.env.REGISTRY_WEB_CLIENT || "http://web.pokemon-online.eu/",
  },
  antispam: {
    logins: 10,
    requests: 40,
    byterate: 100_000,
  },
};
