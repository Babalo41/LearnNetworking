/* shell.js — the fake terminal: topologies, command parsing, Linux + switch commands.
   Nothing here touches the real system. */
(function () {
  "use strict";
  const U = LN.net.util;

  /* ---------------- topologies ---------------- */
  LN.topologies = {
    flat: {
      name: "flat",
      desc: "One VLAN, one switch, five hosts. app01 is the data source. Snooping and querier both OFF — the starting state.",
      vlans: [{ id: 10, snooping: false, querier: false, querierIp: "10.42.7.2" }],
      hosts: [
        { name: "app01", port: "p1", ip: "10.42.7.10", cidr: 24, gw: "10.42.7.1", role: "source" },
        { name: "app02", port: "p2", ip: "10.42.7.11", cidr: 24, gw: "10.42.7.1" },
        { name: "app03", port: "p3", ip: "10.42.7.12", cidr: 24, gw: "10.42.7.1" },
        { name: "nas01", port: "p4", ip: "10.42.7.20", cidr: 24, gw: "10.42.7.1" },
        { name: "mon01", port: "p5", ip: "10.42.7.30", cidr: 24, gw: "10.42.7.1" }
      ],
      hostsFile: { app01: "10.42.7.10", app02: "10.42.7.11", app03: "10.42.7.12", nas01: "10.42.7.20", mon01: "10.42.7.30", gw01: "10.42.7.1" },
      start: "app01"
    },
    vlans: {
      name: "vlans",
      desc: "Two VLANs / two subnets. Use it to feel where the broadcast domain actually ends. Note web01's mask.",
      vlans: [{ id: 10, snooping: true, querier: true, querierIp: "10.42.7.2" }, { id: 20, snooping: false, querier: false }],
      hosts: [
        { name: "app01", port: "p1", vlan: 10, ip: "10.42.7.10", cidr: 24, gw: "10.42.7.1", role: "source" },
        { name: "app02", port: "p2", vlan: 10, ip: "10.42.7.11", cidr: 24, gw: "10.42.7.1" },
        { name: "web01", port: "p3", vlan: 10, ip: "10.42.7.200", cidr: 25, gw: "10.42.7.129" },
        { name: "nas01", port: "p9", vlan: 20, ip: "10.42.8.20", cidr: 24, gw: "10.42.8.1" },
        { name: "bak01", port: "p10", vlan: 20, ip: "10.42.8.21", cidr: 24, gw: "10.42.8.1" }
      ],
      hostsFile: { app01: "10.42.7.10", app02: "10.42.7.11", web01: "10.42.7.200", nas01: "10.42.8.20", bak01: "10.42.8.21" },
      start: "app01"
    },
    sina: {
      name: "sina",
      desc: "Local segment plus an encrypting gateway to a remote site. Unicast crosses; multicast is a separate question.",
      vlans: [{ id: 10, snooping: true, querier: true, querierIp: "10.42.7.2" }, { id: 30, snooping: true, querier: true, querierIp: "10.99.1.2" }],
      hosts: [
        { name: "app01", port: "p1", vlan: 10, ip: "10.42.7.10", cidr: 24, gw: "10.42.7.1", role: "source" },
        { name: "app02", port: "p2", vlan: 10, ip: "10.42.7.11", cidr: 24, gw: "10.42.7.1" },
        { name: "rem01", port: "p20", vlan: 30, ip: "10.99.1.10", cidr: 24, gw: "10.99.1.1" },
        { name: "rem02", port: "p21", vlan: 30, ip: "10.99.1.11", cidr: 24, gw: "10.99.1.1" }
      ],
      boundary: { name: "cg01", carriesMulticast: false, mtu: 1380 },
      hostsFile: { app01: "10.42.7.10", app02: "10.42.7.11", rem01: "10.99.1.10", rem02: "10.99.1.11" },
      start: "app01"
    }
  };

  /* ---------------- shell ---------------- */
  function Shell(topoName) {
    this.load(topoName || "flat");
  }

  Shell.prototype.load = function (name) {
    const def = LN.topologies[name];
    if (!def) return [{ cls: "err", s: "unknown topology: " + name }];
    this.topo = name;
    this.net = new LN.net.Network(def);
    this.streams = [];
    this.cap = [];      // capture buffer: {t, kinds:[], hosts:[], cls, s}
    this.services = { "app-distributor": "active", "nfs-server": "active", "sshd": "active" };
    return [{ cls: "note", s: `topology "${name}" loaded — ${def.desc}` }];
  };

  Shell.prototype.ps1 = function () { return `[${this.net.cur} t=${this.net.clock()}]$ `; };

  /* record events into the capture buffer as time advances */
  Shell.prototype.advance = function (seconds) {
    const out = [];
    let left = seconds;
    while (left > 0) {
      const step = Math.min(left, 30);
      left -= step;
      this.net.tick(step).forEach(l => {
        const kinds = /igmp|query|report|membership|expired|pruned/i.test(l.s) ? ["igmp"] : ["other"];
        this.cap.push({ t: this.net.t, kinds, hosts: null, cls: l.cls, s: l.s });
        out.push(l);
      });
      // active streams transmit
      this.streams.forEach(st => {
        const res = this.net.send(st.src, st.group, { size: st.size, ttl: st.ttl });
        res.forEach(l => {
          if (/delivered to application/.test(l.s) || /received, not joined/.test(l.s) || /NIC ACCEPTED/.test(l.s)) {
            const who = (l.s.match(/p\d+\s+(\w+):/) || [])[1];
            this.cap.push({ t: this.net.t, kinds: ["mcast"], hosts: who ? [who] : null, cls: l.cls, s: `[t=${U.fmt(this.net.t)}] ${st.src} > ${st.group}: udp ${st.size}  -> ${l.s.trim()}` });
          }
        });
      });
    }
    return out;
  };

  /* ---------------- command dispatch ---------------- */
  Shell.prototype.run = function (line) {
    const raw = line.trim();
    if (!raw) return [];
    const echo = [{ cls: "cmd", s: this.ps1() + raw }];
    let out;
    try { out = this.exec(raw); }
    catch (e) { out = [{ cls: "err", s: "error: " + e.message }]; }
    return echo.concat(out || []);
  };

  Shell.prototype.exec = function (raw) {
    const pipe = raw.split("|").map(s => s.trim());
    const a = pipe[0].split(/\s+/);
    const cmd = a[0];
    const H = () => this.net.host(this.net.cur);
    const net = this.net;

    switch (cmd) {
      case "help": return this.help();
      case "clear": return "CLEAR";
      case "topo":
        if (!a[1]) return [{ cls: "", s: "available: " + Object.keys(LN.topologies).join(", ") + "   (current: " + this.topo + ")" }];
        return this.load(a[1]);
      case "hosts": case "who":
        return Object.values(net.hosts).map(h => ({
          cls: "", s: `${h.name.padEnd(8)} ${h.port.padEnd(4)} vlan${String(h.vlan).padEnd(3)} ${(h.ip + "/" + h.cidr).padEnd(18)} ${h.role === "source" ? "[source]" : ""} ${h.joined.length ? "joined: " + h.joined.join(",") : ""}`
        }));
      case "use": case "su": {
        if (!net.host(a[1])) return [{ cls: "err", s: "no such host: " + a[1] }];
        net.cur = a[1];
        return [{ cls: "note", s: "you are now on " + a[1] }];
      }
      case "whoami": return [{ cls: "", s: net.cur }];

      /* ---- ip ---- */
      case "ip": return this.ipCmd(a, H());
      case "arp": return this.neigh(H());
      case "ipcalc": return this.ipcalc(a[1]);

      /* ---- names ---- */
      case "cat": return this.cat(a[1], H());
      case "getent": {
        if (a[1] !== "hosts") return [{ cls: "err", s: "usage: getent hosts NAME" }];
        const ip = net.hostsFile[a[2]];
        return ip ? [{ cls: "", s: `${ip}\t${a[2]}` }]
                  : [{ cls: "err", s: `(no output — ${a[2]} is not in /etc/hosts and there is no DNS)` }];
      }

      /* ---- reachability ---- */
      case "ping": {
        if (!a[1]) return [{ cls: "err", s: "usage: ping HOST|IP" }];
        return net.ping(net.cur, a[1]);
      }

      /* ---- multicast ---- */
      case "join": return net.join(a[1] && net.host(a[1]) && a[2] ? a[1] : net.cur, a[2] || a[1]);
      case "leave": return net.leave(a[1] && net.host(a[1]) && a[2] ? a[1] : net.cur, a[2] || a[1]);
      case "send": {
        const g = a[1];
        if (!g) return [{ cls: "err", s: "usage: send GROUP [size] [ttl]" }];
        return net.send(net.cur, g, { size: +a[2] || 500, ttl: a[3] === undefined ? 1 : +a[3] });
      }
      case "stream": return this.stream(a);

      /* ---- capture / time ---- */
      case "tcpdump": return this.tcpdump(a);
      case "tick": {
        const s = +a[1] || 60;
        const ev = this.advance(s);
        return [{ cls: "note", s: `--- advancing ${s}s of virtual time ---` }].concat(
          ev.length ? ev : [{ cls: "note", s: "(nothing happened — no querier is sending anything)" }]);
      }

      /* ---- host state ---- */
      case "top": return this.top();
      case "ps": return this.ps(pipe);
      case "systemctl": return this.systemctl(a);
      case "ss": return this.ss();
      case "uptime": return [{ cls: "", s: ` ${new Date().toTimeString().slice(0, 5)} up 14 days,  load average: ${(this.softirq()/20+0.4).toFixed(2)}, 0.71, 0.63` }];

      /* ---- switch ---- */
      case "switch": case "sw": return this.switchCmd(a);

      default:
        return [{ cls: "err", s: cmd + ": command not found — type 'help'" }];
    }
  };

  /* ---------------- ip ---------------- */
  Shell.prototype.ipCmd = function (a, h) {
    const sub = a[1] || "";
    if (/^a(ddr)?$/.test(sub)) {
      if (a[2] === "add") {
        const m = (a[3] || "").match(/^([\d.]+)\/(\d+)$/);
        if (!m) return [{ cls: "err", s: "usage: ip addr add A.B.C.D/PREFIX" }];
        h.ip = m[1]; h.cidr = +m[2];
        return [{ cls: "note", s: `${h.name}: address set to ${h.ip}/${h.cidr}` }];
      }
      return [
        { cls: "", s: "1: lo: <LOOPBACK,UP> mtu 65536" },
        { cls: "", s: "    inet 127.0.0.1/8 scope host lo" },
        { cls: "", s: `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500` },
        { cls: "", s: `    link/ether ${h.mac} brd ff:ff:ff:ff:ff:ff` },
        { cls: "", s: `    inet ${h.ip}/${h.cidr} brd ${U.int2ip(U.broadcast(h.ip, h.cidr))} scope global eth0` }
      ];
    }
    if (/^r(oute)?$/.test(sub)) {
      if (a[2] === "add" && a[3] === "default" && a[4] === "via") {
        h.gw = a[5];
        return [{ cls: "note", s: "default route via " + h.gw + " added" }];
      }
      const net0 = U.int2ip(U.network(h.ip, h.cidr));
      const l = [{ cls: "", s: `${net0}/${h.cidr} dev eth0 proto kernel scope link src ${h.ip}` }];
      if (h.gw) l.unshift({ cls: "", s: `default via ${h.gw} dev eth0` });
      else l.push({ cls: "hit", s: "(no default route — anything outside this subnet fails instantly with 'Network is unreachable')" });
      return l;
    }
    if (/^neigh/.test(sub)) return this.neigh(h);
    if (/^maddr/.test(sub)) {
      const l = [{ cls: "", s: "2:\teth0" }, { cls: "", s: "\tinet  224.0.0.1" }];
      h.joined.forEach(g => l.push({ cls: "", s: `\tinet  ${g}   (mac ${U.mcastMac(g)})` }));
      if (!h.joined.length) l.push({ cls: "hit", s: "(no application groups joined on this host)" });
      return l;
    }
    if (/^l(ink)?$/.test(sub))
      return [{ cls: "", s: `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP` }, { cls: "", s: `    link/ether ${h.mac}` }];
    return [{ cls: "err", s: "supported: ip addr | ip addr add | ip route | ip route add default via | ip neigh | ip maddr | ip link" }];
  };

  Shell.prototype.neigh = function (h) {
    const out = [];
    Object.values(this.net.hosts).forEach(p => {
      if (p.name === h.name) return;
      if (!U.sameSubnet(h.ip, p.ip, h.cidr)) return;
      if (p.vlan !== h.vlan || !p.up) out.push({ cls: "err", s: `${p.ip} dev eth0  INCOMPLETE` });
      else out.push({ cls: "", s: `${p.ip} dev eth0 lladdr ${p.mac} REACHABLE` });
    });
    if (h.gw) out.push({ cls: "", s: `${h.gw} dev eth0 lladdr 00:aa:bb:00:00:01 STALE` });
    return out.length ? out : [{ cls: "note", s: "(arp cache empty — nothing has been contacted yet)" }];
  };

  Shell.prototype.ipcalc = function (spec) {
    const m = (spec || "").match(/^([\d.]+)\/(\d+)$/);
    if (!m) return [{ cls: "err", s: "usage: ipcalc 10.42.7.93/26" }];
    const ip = m[1], c = +m[2];
    if (!U.isValidIp(ip) || c < 0 || c > 32) return [{ cls: "err", s: "invalid address or prefix" }];
    const netA = U.network(ip, c), bc = U.broadcast(ip, c), hosts = c >= 31 ? 0 : Math.pow(2, 32 - c) - 2;
    return [
      { cls: "", s: `Address:   ${ip}` },
      { cls: "", s: `Netmask:   ${U.int2ip(U.cidr2mask(c))} = /${c}` },
      { cls: "", s: `Network:   ${U.int2ip(netA)}/${c}` },
      { cls: "", s: `Broadcast: ${U.int2ip(bc)}` },
      { cls: "", s: `HostMin:   ${hosts ? U.int2ip(netA + 1) : "-"}` },
      { cls: "", s: `HostMax:   ${hosts ? U.int2ip(bc - 1) : "-"}` },
      { cls: "note", s: `Hosts:     ${hosts}     block size in last octet: ${256 - (U.cidr2mask(c) & 255)}` }
    ];
  };

  Shell.prototype.cat = function (path, h) {
    if (path === "/etc/hosts") {
      const l = [{ cls: "", s: "127.0.0.1\tlocalhost" }];
      Object.entries(this.net.hostsFile).forEach(([n, ip]) => l.push({ cls: "", s: `${ip}\t${n}` }));
      return l;
    }
    if (path === "/proc/net/igmp") {
      const l = [{ cls: "", s: "Idx\tDevice    : Count Querier\tGroup    Users Timer\tReporter" }];
      l.push({ cls: "", s: `1\tlo        :     1      V3` });
      l.push({ cls: "", s: `2\teth0      :     ${h.joined.length + 1}      V2` });
      l.push({ cls: "", s: `\t\t\t\t010000E0     1 0:00000000\t0` });
      h.joined.forEach(g => {
        const hex = g.split(".").reverse().map(o => (+o).toString(16).padStart(2, "0")).join("").toUpperCase();
        l.push({ cls: "", s: `\t\t\t\t${hex}     1 0:00000000\t0     <- ${g}` });
      });
      if (!h.joined.length) l.push({ cls: "hit", s: "(only 224.0.0.1 — this host has joined no application group)" });
      return l;
    }
    return [{ cls: "err", s: `cat: ${path}: No such file or directory  (try /etc/hosts or /proc/net/igmp)` }];
  };

  /* ---------------- multicast streams ---------------- */
  Shell.prototype.stream = function (a) {
    if (a[1] === "start") {
      const src = a[2], group = a[3];
      if (!this.net.host(src)) return [{ cls: "err", s: "usage: stream start HOST GROUP [size] [ttl]" }];
      this.streams.push({ src, group, size: +a[4] || 500, ttl: a[5] === undefined ? 1 : +a[5] });
      return [{ cls: "note", s: `${src} is now transmitting to ${group} continuously. Advance time with 'tick 300' or capture with 'tcpdump -i eth0 multicast 130'.` }];
    }
    if (a[1] === "stop") { this.streams = []; return [{ cls: "note", s: "all streams stopped" }]; }
    if (!this.streams.length) return [{ cls: "note", s: "no active streams. usage: stream start HOST GROUP" }];
    return this.streams.map(s => ({ cls: "", s: `${s.src} -> ${s.group}  ${s.size}B ttl=${s.ttl}` }));
  };

  /* ---------------- tcpdump ---------------- */
  Shell.prototype.tcpdump = function (a) {
    const args = a.slice(1).filter(x => x !== "-i" && x !== "eth0" && x !== "-n");
    const secs = +(args.find(x => /^\d+$/.test(x))) || 130;
    const filters = args.filter(x => !/^\d+$/.test(x));
    const from = this.net.t;
    const head = [{ cls: "note", s: `tcpdump: listening on eth0 for ${secs}s of virtual time...` }];
    this.advance(secs);
    const me = this.net.cur;

    let ev = this.cap.filter(c => c.t > from);
    if (filters.includes("igmp")) ev = ev.filter(c => c.kinds.includes("igmp"));
    else if (filters.includes("multicast") || filters.some(f => U.isValidIp(f)))
      ev = ev.filter(c => c.kinds.includes("mcast") && (!c.hosts || c.hosts.includes(me)));

    if (!ev.length) {
      const tail = [{ cls: "err", s: `0 packets captured` }];
      if (filters.includes("igmp"))
        tail.push({ cls: "hit", s: "Silence on an IGMP capture is a finding: a healthy segment shows a general query about every 125s. No queries => no querier => memberships will expire." });
      else
        tail.push({ cls: "note", s: "Nothing arrived. Is a source sending ('stream start app01 239.1.1.1')? Is this host joined? Did the switch prune the port?" });
      return head.concat(tail);
    }
    return head.concat(ev.map(c => ({ cls: c.cls, s: c.s })), [{ cls: "note", s: `${ev.length} packets captured` }]);
  };

  /* ---------------- host state ---------------- */

  Shell.prototype.softirq = function () {
    const h = this.net.host(this.net.cur);
    // wasted receives drive softirq; streams make it continuous
    const flooding = this.streams.length && !this.net.vlanOf(h).snooping;
    return Math.min(70, h.rx.wasted * 2 + (flooding ? 26 : 0));
  };

  Shell.prototype.top = function () {
    const h = this.net.host(this.net.cur);
    const si = this.softirq();
    const us = this.streams.length && h.joined.length ? 8.1 : 2.4;
    const id = Math.max(0, 100 - si - us - 4.2).toFixed(1);
    const l = [
      { cls: "", s: `top - ${new Date().toTimeString().slice(0, 8)} up 14 days,  2 users,  load average: ${(si / 20 + 0.4).toFixed(2)}, 0.71, 0.63` },
      { cls: "", s: `Tasks: 148 total,   1 running, 147 sleeping` },
      { cls: si > 15 ? "hit" : "", s: `%Cpu(s): ${us.toFixed(1)} us,  4.2 sy,  0.0 ni, ${id} id,  0.0 wa,  0.0 hi, ${si.toFixed(1)} si` },
      { cls: "", s: `MiB Mem : 15872.0 total,  9120.4 free,  3204.1 used` },
      { cls: "", s: `` },
      { cls: "", s: `  PID USER      %CPU %MEM COMMAND` },
      { cls: "", s: ` 1428 appsvc    ${us.toFixed(1).padStart(4)}  2.1 app-distributor` },
      { cls: "", s: `  912 root       0.7  0.4 systemd-journald` },
      { cls: "", s: `    9 root       ${(si / 2).toFixed(1).padStart(4)}  0.0 [ksoftirqd/0]` }
    ];
    if (si > 15) l.push({ cls: "hit", s: `NOTE: si=${si.toFixed(1)} is softirq — kernel packet processing. The application is only using ${us}% in userspace. This host is being flooded with traffic it did not ask for.` });
    return l;
  };

  Shell.prototype.ps = function (pipe) {
    const grep = pipe[1] && pipe[1].startsWith("grep") ? pipe[1].split(/\s+/)[1] : null;
    const rows = [
      "appsvc    1428  8.1  2.1 /usr/bin/app-distributor --group 239.1.1.1 --iface eth0",
      "root       912  0.7  0.4 /usr/lib/systemd/systemd-journald",
      "root      1533  0.1  0.2 /usr/sbin/sshd -D",
      "root      2201  0.0  0.1 /usr/sbin/rpc.nfsd"
    ];
    const sel = grep ? rows.filter(r => r.includes(grep)) : rows;
    const out = [{ cls: "", s: "USER       PID  %CPU %MEM COMMAND" }].concat(sel.map(s => ({ cls: "", s })));
    if (grep && !sel.length) out.push({ cls: "err", s: `(no process matching "${grep}")` });
    return out;
  };

  Shell.prototype.systemctl = function (a) {
    const verb = a[1], unit = a[2];
    if (verb === "status") {
      if (!unit || !(unit in this.services)) return [{ cls: "err", s: `Unit ${unit} could not be found.  known: ${Object.keys(this.services).join(", ")}` }];
      const st = this.services[unit];
      return [
        { cls: "", s: `● ${unit}.service - ${unit}` },
        { cls: st === "active" ? "" : "err", s: `   Loaded: loaded (/etc/systemd/system/${unit}.service; enabled)` },
        { cls: st === "active" ? "" : "err", s: `   Active: ${st === "active" ? "active (running) since Mon 09:14:02; 3 days ago" : "inactive (dead)"}` },
        { cls: "", s: `  Main PID: 1428 (${unit})` },
        { cls: "note", s: `   note: if this unit restarts, its multicast joins are dropped and re-issued — membership lives with the socket, not the machine.` }
      ];
    }
    if (verb === "start" || verb === "stop" || verb === "restart") {
      if (!(unit in this.services)) return [{ cls: "err", s: `Unit ${unit} could not be found.` }];
      const h = this.net.host(this.net.cur);
      if (verb === "stop") {
        this.services[unit] = "inactive";
        const dropped = h.joined.slice();
        const l = [{ cls: "note", s: `${unit} stopped` }];
        dropped.forEach(g => {
          l.push({ cls: "hit", s: `  socket closed -> IGMP leave ${g}. Membership lives with the socket, not the machine.` });
          this.net.leave(h.name, g).forEach(x => l.push(x));
        });
        return l;
      }
      this.services[unit] = "active";
      return [{ cls: "note", s: `${unit} ${verb}ed — the app re-joins its groups on startup (use 'join GROUP' to model that)` }];
    }
    return [{ cls: "err", s: "usage: systemctl status|start|stop|restart UNIT" }];
  };

  Shell.prototype.ss = function () {
    const h = this.net.host(this.net.cur);
    const l = [{ cls: "", s: "Netid State  Local Address:Port   Process" }];
    l.push({ cls: "", s: "tcp   LISTEN 0.0.0.0:22            users:((\"sshd\",pid=1533))" });
    if (h.joined.length)
      h.joined.forEach(g => l.push({ cls: "", s: `udp   UNCONN 0.0.0.0:5000          users:(("app-distributor",pid=1428))   joined ${g}` }));
    else
      l.push({ cls: "note", s: "(no multicast sockets bound on this host)" });
    return l;
  };

  /* ---------------- switch ---------------- */
  Shell.prototype.switchCmd = function (a) {
    const net = this.net;
    const vlanArg = () => {
      const i = a.indexOf("vlan");
      return i > -1 ? net.vlans[+a[i + 1]] : net.vlans[net.host(net.cur).vlan];
    };
    if (a[1] === "show") {
      if (a[2] === "mac-table" || a[2] === "mac") {
        const l = [{ cls: "", s: " VLAN  MAC ADDRESS        PORT  TYPE" }];
        Object.values(net.hosts).forEach(h => l.push({ cls: "", s: ` ${String(h.vlan).padEnd(5)} ${h.mac}  ${h.port.padEnd(5)} dynamic` }));
        return l;
      }
      if (a[2] === "igmp" || a[2] === "groups") {
        const l = [];
        Object.values(net.vlans).forEach(v => {
          l.push({ cls: "", s: `vlan ${v.id}:  snooping ${v.snooping ? "ENABLED" : "disabled"}   querier ${v.querier ? "ENABLED (" + (v.querierIp || "switch") + ")" : "disabled"}` });
          const gs = Object.keys(v.groups);
          if (!gs.length) l.push({ cls: v.snooping ? "err" : "note", s: `   (no group entries)` });
          gs.forEach(g => Object.entries(v.groups[g]).forEach(([p, exp]) =>
            l.push({ cls: "", s: `   ${g}   ${p}   expires in ${Math.max(0, Math.round(exp - net.t))}s` })));
          if (v.snooping && !v.querier)
            l.push({ cls: "hit", s: `   WARNING vlan ${v.id}: snooping without a querier — entries will expire and every port will be pruned` });
        });
        return l;
      }
      return [{ cls: "err", s: "switch show mac-table | igmp" }];
    }
    if (a[1] === "snooping" || a[1] === "querier") {
      const v = vlanArg();
      if (!v) return [{ cls: "err", s: "unknown vlan" }];
      const on = a[2] === "on" || a[2] === "enable";
      const off = a[2] === "off" || a[2] === "disable";
      if (!on && !off) return [{ cls: "err", s: `usage: switch ${a[1]} on|off [vlan N]` }];
      v[a[1] === "snooping" ? "snooping" : "querier"] = on;
      const l = [{ cls: "note", s: `vlan ${v.id}: igmp ${a[1]} ${on ? "enabled" : "disabled"}` }];
      if (a[1] === "snooping" && on) {
        v.groups = {};
        Object.values(net.hosts).forEach(h => { if (h.vlan === v.id) h.joined.forEach(g => net._learnGroup(v, g, h.port)); });
        l.push({ cls: "note", s: "existing memberships imported from currently joined hosts" });
        if (!v.querier) l.push({ cls: "hit", s: `WARNING: no querier on vlan ${v.id}. Entries expire after ${LN.net.MEMBER_TIMEOUT}s with nothing to refresh them. Run 'tick 300' to watch the stream die.` });
      }
      if (a[1] === "querier" && on) { v.lastQuery = -1e9; l.push({ cls: "note", s: "the switch will now send general queries every 125s" }); }
      return l;
    }
    return [{ cls: "err", s: "switch show mac-table | switch show igmp | switch snooping on|off [vlan N] | switch querier on|off [vlan N]" }];
  };

  /* ---------------- help ---------------- */
  Shell.prototype.help = function () {
    return [
      { cls: "note", s: "WHERE AM I" },
      { cls: "", s: "  hosts                     list every host, its port, vlan, address, joined groups" },
      { cls: "", s: "  use HOST                  become that host (the prompt shows who you are)" },
      { cls: "note", s: "ADDRESSING" },
      { cls: "", s: "  ip addr                   show interfaces      ip addr add 10.42.7.5/24" },
      { cls: "", s: "  ip route                  routing table        ip route add default via 10.42.7.1" },
      { cls: "", s: "  ip neigh                  arp cache (INCOMPLETE = asked, nobody answered)" },
      { cls: "", s: "  ipcalc 10.42.7.93/26      network, broadcast, range, block size" },
      { cls: "", s: "  ping HOST|IP              shows the local-vs-remote decision it makes" },
      { cls: "", s: "  cat /etc/hosts            getent hosts NAME" },
      { cls: "note", s: "MULTICAST" },
      { cls: "", s: "  join GROUP                this host joins (e.g. join 239.1.1.1)" },
      { cls: "", s: "  leave GROUP               ip maddr / cat /proc/net/igmp   to inspect" },
      { cls: "", s: "  send GROUP [size] [ttl]   one datagram; shows exactly who receives it and who wastes CPU" },
      { cls: "", s: "  stream start HOST GROUP   continuous source     stream stop" },
      { cls: "note", s: "SWITCH" },
      { cls: "", s: "  switch show igmp          snooping/querier state and group table" },
      { cls: "", s: "  switch show mac-table" },
      { cls: "", s: "  switch snooping on|off [vlan N]        switch querier on|off [vlan N]" },
      { cls: "note", s: "TIME AND CAPTURE  (this is where IGMP becomes visible)" },
      { cls: "", s: "  tick 300                  advance 300s of virtual time — expiry happens here" },
      { cls: "", s: "  tcpdump -i eth0 igmp 300  capture joins/queries/leaves while time advances" },
      { cls: "", s: "  tcpdump -i eth0 multicast 130" },
      { cls: "note", s: "HOST STATE" },
      { cls: "", s: "  top                       watch the si (softirq) column, not just the process list" },
      { cls: "", s: "  ps aux | grep app         ss        systemctl status|stop|start app-distributor" },
      { cls: "note", s: "ENVIRONMENT" },
      { cls: "", s: "  topo                      list topologies      topo flat | topo vlans | topo sina" },
      { cls: "", s: "  clear" },
      { cls: "hit", s: "Try this first:  stream start app01 239.1.1.1  →  use app02  →  join 239.1.1.1  →  top  →  switch snooping on  →  tick 300" }
    ];
  };

  LN.Shell = Shell;
})();
