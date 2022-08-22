if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

AFRAME.registerSystem('broadcast', {
  schema: {
    url: {type: 'string', default: `wss://${window.location.host}/`},
    interval: {type: 'number', default: 10}
  },
  init: function () {
    var sceneEl = this.el.sceneEl;
    var url = this.data.url;
    let message = ''
    if (!url) { return; }

    this.socket = new WebSocket(this.data.url);
    console.log('CLIENT SOCKET:', this.socket);

    this.socket.addEventListener('error', (e) => {
      console.log('CLIENT ERROR', e)
    });
    this.socket.addEventListener('connect', () => {
      console.log('CLIENT CONNECTED', url);
    }, {once: true});
    this.socket.addEventListener('open', (e) => {
      console.log('CLIENT OPEN');
    }, {once: true});
    this.socket.addEventListener('close', (e) => {
      console.log('CLIENT CLOSE');
    });
    this.socket.addEventListener('message', (e) => {
      if (!e.data) {
        console.log('CLIENT MESSAGE CONTAINED NO DATA')
        return
      }
      if (e.data.includes('Closed')) return
      // Process other messages
      message = JSON.parse(e.data)
      console.log(message)
      if (message.type === 'DOWNSTREAM_PLAYER_UPDATE') {
        if (message.updates && Array.isArray(message.updates)) {
          this.processUpdate(message.updates)
        }
      } else {
        console.log('CLIENT MESSAGE', message);
      }
    });

    this.sendQueue = [];
    this.worldPositionReceive = new THREE.Vector3();
    this.worldPositionSend = new THREE.Vector3();
    this.worldQuaternionReceive = new THREE.Quaternion();
    this.worldQuaternionSend = new THREE.Quaternion();

    var that = this;

    this.processUpdate = (updates) => {
      console.log('Processing:', updates)
      updates.forEach(function syncState (entity) {
        var el = sceneEl.querySelector('#' + entity.id);

        if (!el) {
          el = document.createElement('a-entity');
          el.setAttribute('id', entity.id);
          sceneEl.appendChild(el);
          console.log('CREATED NEW ENTITY', entity.id)
        }

        entity.components.forEach(function setAttribute (component) {
          if (component[0] === 'rotation') {
            that.worldQuaternionReceive.fromArray(component[1]);
            el.object3D.setRotationFromQuaternion(that.worldQuaternionReceive);
          } else if (component[0] === 'position') {
            that.worldPositionReceive.fromArray(component[1]);
            el.object3D.position.set(that.worldPositionReceive.x, that.worldPositionReceive.y, that.worldPositionReceive.z);
          } else {
            el.setAttribute(component[0], component[1]);
          };
        });
      });
    };

    this.addSend = AFRAME.utils.bind(this.addSend, this)
  },

  addSend: function (el, sendComponents) {
    if (!el.getAttribute('id')) {
      el.setAttribute('id', guid());
    }
    var that = this;
    this.sendQueue.push(function send () {
      return {
        id: el.getAttribute('id'),
        parentId: el.parentNode.getAttribute('id'),
        components: sendComponents.map(function getAttribute (componentName) {
          if (componentName === 'rotation') {
            el.object3D.getWorldQuaternion(that.worldQuaternionSend);
            return [componentName, that.worldQuaternionSend.toArray()];
          } else if (componentName === 'position') {
            el.object3D.getWorldPosition(that.worldPositionSend);
            return [componentName, that.worldPositionSend.toArray()];
          } else {
            return [componentName, el.getAttribute(componentName)];
          };
        })
      };
    });
  },

  tick: function (time, dt) {
    if (time - this.time < this.data.interval) { return; }
    this.time = time;

    if (this.socket.readyState === WebSocket.OPEN) {
      const test = this.sendQueue.map(function call (getSend) {
        return getSend();
      })
      // Send an update from this client to the server
      this.socket.send(JSON.stringify(
        { 'type': 'UPSTREAM_PLAYER_UPDATE',
          'updates': test
        }
      ));
    }
  }
});

/**
 * Broadcast component for A-Frame.
 */
AFRAME.registerComponent('broadcast', {
  schema: {
    url: {type: 'string'},
    send: {type: 'array', default: ['position', 'rotation']}
  },

  init: function () {
    var data = this.data;
    var el = this.el;
    var system = this.system;

    if (el.isScene || !data.send.length) { return; }
    system.addSend(el, data.send);
  }
});

const guid = () => {
  var text = '';
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (var i = 0; i < 8; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}