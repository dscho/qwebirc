qwebirc.irc.ConnectionAdaptor = new Class({
  Implements: [Events, Options],
  options: {
    initialNickname: "ircconnX",
    serverPassword: null,
    userName: "wibble",
    initialUserModes: "+",
    realName: "wibble",
    errorAlert: true
  },
  initialize: function(connectionFactory, options) {
  console.log("ca", "init");
    this.setOptions(options);
    this.__conn = connectionFactory();
    this.__conn.onopen = this.__onopen.bind(this);
    this.__conn.onclose = this.__onclose.bind(this);
    this.__conn.onmessage = this.__onmessage.bind(this);
    this.__conn.onerror = this.__onerror.bind(this);
  },
  connect: function() {
  console.log("ca", "connect");
    this.__conn.connect();
  },
  disconnect: function() {
  console.log("ca", "disconnect");
    this.__conn.close();
  },
  send: function(data) {
  console.log("ca", "send", data);
    this.__conn.send(data);
  },
  __onopen: function() {
  console.log("ca", "onopen");
    if(this.options.serverPassword != null)
      this.__conn.send("PASS :" + this.options.serverPassword + "\r\n");
    this.__conn.send("NICK " + this.options.initialNickname + "\r\n");
    this.__conn.send("USER " + this.options.userName + " " + this.options.initialUserModes + " JUNK :" + this.options.realName + "\r\n");
  },
  __onclose: function(reason) {
  console.log("ca", "onclose", reason);
    var b = ["disconnect"];
    if(reason)
      b.push(reason);
    this.fireEvent("recv", [b]);
  },
  __onmessage: function(message) {
    console.log("ca", "onmessage", message);
    var x = message.split("\r\n");
    for(var i=0;i<x.length;i++) {
      if(x[i] == "")
        continue;
      var m = qwebirc.irc.ircParse(x[i]); /* prefix, command, args */
      var prefix = m.shift();
      var command = m.shift();
      m.unshift(prefix);
      m.unshift(command);
      m.unshift("c");
      console.log("fired", m);
      this.fireEvent("recv", [m]);
    }
  },
  __onerror: function(reason) {
  console.log("ca", "onerror");
    this.fireEvent("error", reason);

    if(this.options.errorAlert)
      alert(reason);
  }
});

qwebirc.irc.QWebIRCv1IRCConnectionAdaptor = function() {
  console.log("q1ac", "init");
  this.readyState = -1; /* UNUSED */

  this.__registered = false;
  this.__nick = null;
  this.__user = null;
  this.__pass = null;
};

qwebirc.irc.QWebIRCv1IRCConnectionAdaptor.prototype.connect = function() {
  console.log("q1ac", "connect");
  if(this.readyState != -1)
    return;

  this.readyState = 1; /* OPENED */
  if(this.onopen)
    this.onopen();
};
qwebirc.irc.QWebIRCv1IRCConnectionAdaptor.prototype.send = function(data) {
  var x = data.split("\r\n");
  for(var i=0;i<x.length;i++) {
    if(x[i] == "")
      continue;
    this.__send(x[i]);
  }
}
qwebirc.irc.QWebIRCv1IRCConnectionAdaptor.prototype.__send = function(data) {
  console.log("q1ac", "send", data);
  if(this.readyState != 1) /* OPENED */
    return;

  if(this.__registered) {
    this.__conn.send(data);
    return;
  }

  var tokens = qwebirc.irc.ircParse(data);
  console.log("tokens == ", tokens);
  if(tokens === null) {
    this.__onerror("Bad data sent upon registration.");
    return;
  }

  var command = tokens[1];
  if(command == "NICK") {
    this.__nick = tokens[2][0];
  } else if(command == "USER") {
    this.__user = {userName: tokens[2][0], initialUserModes: tokens[2][1], realName: tokens[2][3]};
  } else if(command == "PASS") {
    this.__pass = tokens[2][0];
  } else {
    this.__onerror("Bad data sent upon registration.");
    return;
  }

  if(this.__nick === null || this.__user === null)
    return;

  /* do registration */
  this.__registered = true;
  this.__conn = new qwebirc.irc.IRCConnection({initialNickname: this.__nick, serverPassword: this.__pass, errorAlert: false, initialUserModes: this.__user.initialUserModes, realName: this.__user.realName, userName: this.__user.userName});
  this.__conn.addEvent("error", this.__onerror.bind(this));
  this.__conn.addEvent("recv", this.__onrecv.bind(this));
  this.__conn.connect();
};

qwebirc.irc.QWebIRCv1IRCConnectionAdaptor.prototype.__onerror = function(reason) {
  console.log("q1ac", "onerror", reason);
  if(this.readyState != 1) /* OPENED */
    return;

  this.readyState = 3; /* CLOSED */

  if(this.__conn && !this.__conn.disconnected)
    this.__conn.disconnect();

  if(this.onerror)
    this.onerror(reason);

  if(this.onclose)
    this.onclose(reason + " (socket error)");
};
qwebirc.irc.QWebIRCv1IRCConnectionAdaptor.prototype.__onrecv = function(m) {
  console.log("q1ac", "__onrecv", m);
  if(this.readyState != 1) /* OPENED */
    return;

  var t = m[0];
  if(t == "c") {
    var buf = [];
    if(m[2] !== "")
      buf.push(":" + m[2]);
    buf.push(m[1]);
    if(m[3].length > 0) {
      var last = m[3].pop();
      buf = buf.concat(m[3]);
      buf.push(":" + last);
    }
    if(this.onmessage)
      this.onmessage(buf.join(" ") + "\r\n");
  } else if(t == "connect") {
    /* ignore */
  } else if(t == "disconnect") {
    this.__close(m[1]);
    return;
  }
};

qwebirc.irc.QWebIRCv1IRCConnectionAdaptor.prototype.close = function() {
  this.__close();
}
qwebirc.irc.QWebIRCv1IRCConnectionAdaptor.prototype.__close = function(reason) {
  console.log("q1ac", "close");
  if(this.readyState != 1) /* OPENED */
    return;

  this.readyState = 2; /* CLOSING */

  if(this.__conn && !this.__conn.disconnected)
    this.__conn.disconnect();

  if(this.onclose)
    this.onclose(reason);
  this.readyState = 3; /* CLOSED */
};
