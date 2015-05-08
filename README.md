# po-registry
A simple registry for Pokemon Online written in nodejs

### Requirements

```
sudo apt-get install nodejs npm redis-server
```

`redis-server` will install the Redis database. You may need to start it before the registry, if it's not already done automatically, with the command `redis-server`.

### Setup

In your project's directory:

```
npm install
```

### Running

```
nodejs registry.js
```

### Configuration

You can configure the registry through redis. Launch the redis client with the `redis-cli` command.

You can then use the keys belows to configure the registry:

* `po-registry:announcement` - The announcement

For example:

```
$ redis-cli
127.0.0.1:6379> set po-registry:announcement "Hello, Welcome to Pokemon Online!"
OK
```