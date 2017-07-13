var pull = require('pull-stream')
var paramap = require('pull-paramap')
var crypto = require('crypto')

function randint (n) {
  return ~~(Math.random()*n)
}

function randary (a) {
  return a[randint(a.length)]
}

function randbytes (n) {
  return crypto.randomBytes(n)
}

// initialize a connected network of N peers
exports.initialize = function (sbot, n, f, cb) {
  var peers = [sbot]
  ;(function next () {
    if(peers.length == n) return cb(null, peers)

    var peer = sbot.createFeed()
    ;(function next_peer (_f) {
      var _peer
      if(f > peers.length)
        _peer = peers[_f]
      else
        _peer = randary(peers)

      _peer.publish({
        type: 'contact',
        contact: peer.id,
        following: true
      }, function (err, m) {

        if(err) return cb(err)
        if(_f < f && (f < peers.length))
          next_peer(_f+1)
        else {
          peers.push(peer)
          next()
        }
      })
    })(0)
  })()
}

exports.messages = function (createMsg, peers, n, cb) {
  pull(
    pull.count(n),
    paramap(function (n, cb) {
      var peer = randary(peers)
      peer.publish(
        createMsg(n, peer.id, peers),
        function (err, msg) {
          cb(null, msg)
        }
      )
    }, 32),
    pull.drain(null, cb)
  )

}

if(!module.parent) {
  var createSbot = require('scuttlebot')
   .use(require('scuttlebot/plugins/replicate'))
//    .use(require('../'))
    .use(require('ssb-friends'))
  var sbot = createSbot({
    temp: 'alice',
  //  port: 45451, host: 'localhost', timeout: 20001,
  //  replicate: {hops: 3, legacy: false}, keys: alice
  })

  var l = 0, _ts = Date.now(), _l = 0
  sbot.post(function (msg) {
    l++
    if(Date.now() > _ts + 1000) {
      console.log(l, l - _l)
      _l = l
      _ts = Date.now()
    }
  })

  exports.initialize(sbot, 1000, 4, function (err, peers) {
    if(err) throw err
    console.log('initialized')
    //console.log(peers.map(function (e) { return e.id }))
    exports.messages(function (n) {
      return {
        type: 'test',
        ts: Date.now(),
        random: Math.random(),
        value: randbytes(randint(1024)).toString('base64')
      }
    }, peers, 100000, function () {
      var c = 0
      console.log('done', l)
      console.log(sbot.status())
      process.exit()
//      pull(
//        sbot.createLogStream(),
//        pull.drain(function () {
//          c++
//        }, function () {
//          console.log(c)
//        })
//      )
    })

  })
}


