# po-registry
A simple registry for Pokemon Online written in nodejs

### Requirements

```
sudo apt-get install nodejs npm redis-server

npm install -g bower
npm install -g grunt-cli
```

`redis-server` will install the Redis database. You may need to start it before the registry, if it's not already done automatically, with the command `redis-server`.

### Setup

In your project's directory:

```
npm install
```

### Webserver setup

* Install npm, bower, grunt-cli, redis-server
* run `npm install` and `bower install` in the root of the repository
* run `grunt less` and `grunt concat`

### Running

```
nodejs registry.js
```

If you want a web interface:

```
nodejs webserver.js
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

* `sadd po-registry:banned-ips "XXX.XXX.XXX.XXX"` to add a banned ip

* `srem po-registry:banned-ips "XXX.XXX.XXX.XXX"` to remove a banned ip

* `smembers po-registry:banned-ips` to show banneds ips