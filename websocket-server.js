// Example braid-peer as a web server

module.exports = require['websocket-server'] = function add_websocket_server(node, certificate, private_key) {
    var port = '3007'
    var s = new (require('ws')).Server({port})

    s.on('connection', function(conn) {
        var pipe = require('./pipe.js')({node, connect, send})

        conn.on('message', (msg) => {
            var m = JSON.parse(msg)
            nlog('ws: Recv',
                pipe.them || m.my_name_is,
                m.method.toUpperCase().padEnd(7),
                msg.substr(0,70))

            pipe.recv(JSON.parse(msg))
        })
        conn.on('close', () => {
            log('ws: server closed', s.dead ? '<<dead>>' : '')
            if (s.dead) return
            pipe.disconnected()
        })
        pipe.connected()

        function connect () {
            log('ws-serve: connecting!')
            // pipe.connected()
        }
        function send (msg) {
            nlog('ws: Send',
                pipe.them || '? ',
                msg.method.toUpperCase().padEnd(7),
                JSON.stringify(msg).substr(0,70))

            conn.send(JSON.stringify(msg))
        }
    })
    return s
}