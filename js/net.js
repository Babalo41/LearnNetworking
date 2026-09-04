/* net.js — the simulated network: hosts, a switch, VLANs, IGMP, a crypto boundary.
   Pure model, no DOM. Every operation returns explanation lines so the lab can
   show *why* something happened, not just the result. */
(function () {
  "use strict";

  /* ---------------- IPv4 helpers ---------------- */
  const ip2int = s => s.split(".").reduce((a, o) => (a << 8 >>> 0) + (+o), 0) >>> 0;
  const int2ip = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  const cidr2mask = c => (c === 0 ? 0 : (0xffffffff << (32 - c)) >>> 0);
  const mask2cidr = m => { let n = 0, x = ip2int(m); while (x & 0x80000000) { n++; x = (x << 1) >>> 0; } return n; };
  const network = (ip, c) => (ip2int(ip) & cidr2mask(c)) >>> 0;
  const broadcast = (ip, c) => ((ip2int(ip) & cidr2mask(c)) | (~cidr2mask(c) >>> 0)) >>> 0;
  const sameSubnet = (a, b, c) => network(a, c) === network(b, c);
  const isMulticast = ip => { const f = +ip.split(".")[0]; return f >= 224 && f <= 239; };
  const isValidIp = s => /^(\d{1,3}\.){3}\d{1,3}$/.test(s) && s.split(".").every(o => +o >= 0 && +o <= 255);

  /* IPv4 multicast -> Ethernet MAC: 01:00:5e + low 23 bits (top 5 bits discarded) */
  function mcastMac(group) {
    const n = ip2int(group) & 0x7fffff;
    const h = x => x.toString(16).padStart(2, "0");
    return "01:00:5e:" + h((n >>> 16) & 0x7f) + ":" + h((n >>> 8) & 255) + ":" + h(n & 255);
  }

  const QUERY_INTERVAL = 125;   // seconds
  const MEMBER_TIMEOUT = 260;   // seconds without a report before pruning

  /* ---------------- Network ---------------- */
  function Network(def) {
    this.t = 0;                                   // virtual clock, seconds
    this.hosts = {};
    this.ports = {};                              // portName -> {vlan, host}
    this.vlans = {};                              // vlanId -> {snooping, querier, querierIp, groups:{}}
    this.boundary = def.boundary || null;         // crypto gateway description
    this.name = def.name || "lab";
    this.desc = def.desc || "";

    (def.vlans || [{ id: 10, snooping: false, querier: false }]).forEach(v => {
      this.vlans[v.id] = {
        id: v.id, snooping: !!v.snooping, querier: !!v.querier,
        querierIp: v.querierIp || null, groups: {}, lastQuery: -1e9
      };
    });

    (def.hosts || []).forEach(h => {
      this.hosts[h.name] = {
        name: h.name, port: h.port, vlan: h.vlan || 10,
        ip: h.ip, cidr: h.cidr, gw: h.gw || null,
        mac: h.mac || "00:aa:bb:00:00:" + (Object.keys(this.hosts).length + 1).toString(16).padStart(2, "0"),
        joined: [], up: h.up !== false, role: h.role || "host",
        rx: { delivered: 0, wasted: 0 }
      };
      this.ports[h.port] = { vlan: h.vlan || 10, host: h.name };
    });
    this.hostsFile = def.hostsFile || {};
    this.cur = def.start || Object.keys(this.hosts)[0];
  }

  Network.prototype.host = function (n) { return this.hosts[n] || null; };
  Network.prototype.vlanOf = function (h) { return this.vlans[h.vlan]; };

  Network.prototype.resolve = function (nameOrIp) {
    if (isValidIp(nameOrIp)) return nameOrIp;
    if (this.hostsFile[nameOrIp]) return this.hostsFile[nameOrIp];
    const h = this.hosts[nameOrIp];
    return h ? h.ip : null;
  };

  Network.prototype.hostByIp = function (ip) {
    return Object.values(this.hosts).find(h => h.ip === ip) || null;
  };

  /* ---------------- time ---------------- */
  Network.prototype.tick = function (seconds) {
    const out = [];
    const end = this.t + seconds;
    // step in query-interval chunks so queriers fire at the right moments
    while (this.t < end) {
      const step = Math.min(end - this.t, 5);
      this.t += step;
      Object.values(this.vlans).forEach(v => {
        if (v.querier && this.t - v.lastQuery >= QUERY_INTERVAL) {
          v.lastQuery = this.t;
          out.push({ cls: "note", s: `[t=${fmt(this.t)}] querier ${v.querierIp || "switch"} -> 224.0.0.1: IGMP general query (vlan ${v.id})` });
          // every joined host answers, refreshing the snooping entry
          Object.values(this.hosts).forEach(h => {
            if (h.vlan !== v.id || !h.up) return;
            h.joined.forEach(g => {
              out.push({ cls: "note", s: `[t=${fmt(this.t)}]   ${h.name} -> ${g}: IGMP membership report` });
              this._learnGroup(v, g, h.port);
            });
          });
        }
      });
      // expire snooping entries nobody has refreshed
      Object.values(this.vlans).forEach(v => {
        Object.keys(v.groups).forEach(g => {
          Object.keys(v.groups[g]).forEach(p => {
            if (v.groups[g][p] <= this.t) {
              delete v.groups[g][p];
              out.push({ cls: "err", s: `[t=${fmt(this.t)}] switch: membership expired — vlan ${v.id} group ${g} pruned from ${p}` });
            }
          });
          if (!Object.keys(v.groups[g]).length) delete v.groups[g];
        });
      });
    }
    return out;
  };

  const fmt = s => {
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + String(r).padStart(2, "0");
  };
  Network.prototype.clock = function () { return fmt(this.t); };

  Network.prototype._learnGroup = function (v, g, port) {
    if (!v.snooping) return;
    if (!v.groups[g]) v.groups[g] = {};
    v.groups[g][port] = this.t + MEMBER_TIMEOUT;
  };

  /* ---------------- IGMP ---------------- */
  Network.prototype.join = function (hostName, group) {
    const h = this.host(hostName), out = [];
    if (!h) return [{ cls: "err", s: "no such host: " + hostName }];
    if (!isMulticast(group)) return [{ cls: "err", s: group + " is not a multicast address (must be 224.0.0.0/4)" }];
    if (h.joined.includes(group)) return [{ cls: "note", s: h.name + " has already joined " + group }];
    h.joined.push(group);
    out.push({ cls: "", s: `${h.name}: setsockopt(IP_ADD_MEMBERSHIP, ${group})` });
    out.push({ cls: "note", s: `${h.name} -> ${group}: IGMP v2 membership report   (MAC ${mcastMac(group)})` });
    const v = this.vlanOf(h);
    if (v.snooping) {
      this._learnGroup(v, group, h.port);
      out.push({ cls: "note", s: `switch: snooping overheard the report — vlan ${v.id} group ${group} now includes ${h.port} (expires in ${MEMBER_TIMEOUT}s)` });
      if (!v.querier)
        out.push({ cls: "hit", s: `warning: snooping is on but there is NO querier on vlan ${v.id}. Nothing will refresh this entry — it will expire in ${MEMBER_TIMEOUT}s. Try: tick 300` });
    } else {
      out.push({ cls: "note", s: `switch: IGMP snooping is off on vlan ${v.id} — the report is ignored and this group will be flooded to every port` });
    }
    return out;
  };

  Network.prototype.leave = function (hostName, group) {
    const h = this.host(hostName), out = [];
    if (!h) return [{ cls: "err", s: "no such host: " + hostName }];
    const i = h.joined.indexOf(group);
    if (i < 0) return [{ cls: "err", s: `${h.name} has not joined ${group}` }];
    h.joined.splice(i, 1);
    out.push({ cls: "note", s: `${h.name}: IGMP leave group ${group}` });
    const v = this.vlanOf(h);
    if (v.snooping && v.groups[group]) {
      delete v.groups[group][h.port];
      if (!Object.keys(v.groups[group]).length) delete v.groups[group];
      out.push({ cls: "note", s: `switch: ${h.port} removed from ${group} on vlan ${v.id}` });
    }
    return out;
  };

  /* ---------------- multicast transmission ---------------- */
  Network.prototype.send = function (srcName, group, opts) {
    opts = opts || {};
    const size = opts.size || 500, ttl = opts.ttl === undefined ? 1 : opts.ttl;
    const src = this.host(srcName), out = [];
    if (!src) return [{ cls: "err", s: "no such host: " + srcName }];
    if (!isMulticast(group)) return [{ cls: "err", s: group + " is not a multicast address" }];

    const v = this.vlanOf(src);
    out.push({ cls: "", s: `${src.name} -> ${group}  udp ${size} bytes, ttl=${ttl}, dst mac ${mcastMac(group)}` });

    const peers = Object.values(this.hosts).filter(h => h.vlan === src.vlan && h.name !== src.name && h.up);
    let targets;
    if (v.snooping) {
      const ports = v.groups[group] ? Object.keys(v.groups[group]) : [];
      targets = peers.filter(h => ports.includes(h.port));
      out.push({ cls: "note", s: `switch: snooping ON — group ${group} maps to ${ports.length ? ports.join(", ") : "(no ports)"} ; forwarding to ${targets.length} port(s)` });
      if (!ports.length)
        out.push({ cls: "hit", s: `nobody is registered for ${group} on vlan ${v.id}. Either no host joined, or the entries expired with no querier.` });
    } else {
      targets = peers;
      out.push({ cls: "hit", s: `switch: snooping OFF — flooding ${group} out all ${targets.length} other ports in vlan ${v.id}` });
    }

    let wasted = 0;
    targets.forEach(h => {
      if (h.joined.includes(group)) {
        h.rx.delivered++;
        out.push({ cls: "", s: `  ${h.port} ${h.name}: delivered to application (joined)` });
      } else {
        const collide = h.joined.find(g => mcastMac(g) === mcastMac(group));
        h.rx.wasted++; wasted++;
        if (collide)
          out.push({ cls: "hit", s: `  ${h.port} ${h.name}: NIC ACCEPTED it — ${collide} shares MAC ${mcastMac(group)} (32:1 collision) — kernel discards after processing. Wasted CPU.` });
        else
          out.push({ cls: "err", s: `  ${h.port} ${h.name}: received, not joined -> discarded after kernel processing. Wasted CPU.` });
      }
    });

    if (wasted)
      out.push({ cls: "hit", s: `${wasted} host(s) burned CPU on traffic they never asked for. This is what shows up as softirq ("si") in top.` });

    // crossing the boundary
    if (this.boundary) {
      const b = this.boundary;
      if (ttl <= 1)
        out.push({ cls: "err", s: `boundary ${b.name}: dropped — ttl=1 means local segment only` });
      else if (!b.carriesMulticast)
        out.push({ cls: "err", s: `boundary ${b.name}: tunnel is up (unicast fine) but this mode does not carry multicast — dropped silently, no error to the sender` });
      else if (size > (b.mtu || 1400))
        out.push({ cls: "err", s: `boundary ${b.name}: ${size} bytes exceeds effective MTU ${b.mtu} after encapsulation — dropped. UDP has no feedback path, so the app never learns.` });
      else
        out.push({ cls: "note", s: `boundary ${b.name}: forwarded to the remote site` });
    }
    return out;
  };

  /* ---------------- unicast reachability ---------------- */
  Network.prototype.ping = function (srcName, target) {
    const src = this.host(srcName), out = [];
    if (!src) return [{ cls: "err", s: "no such host" }];
    const dst = this.resolve(target);
    if (!dst) return [{ cls: "err", s: `ping: ${target}: Name or service not known  (not in /etc/hosts)` }];
    if (target !== dst) out.push({ cls: "note", s: `resolved ${target} -> ${dst} via /etc/hosts` });

    if (dst === src.ip) return out.concat([{ cls: "", s: "64 bytes from " + dst + ": icmp_seq=1 ttl=64 time=0.02 ms  (self)" }]);

    const local = sameSubnet(src.ip, dst, src.cidr);
    out.push({
      cls: "note",
      s: `${src.name}: ${src.ip}/${src.cidr} AND mask -> ${int2ip(network(src.ip, src.cidr))}; ` +
         `${dst} AND same mask -> ${int2ip(network(dst, src.cidr))}  =>  ${local ? "LOCAL" : "REMOTE"}`
    });

    const h = this.hostByIp(dst);
    if (local) {
      out.push({ cls: "note", s: `${src.name} broadcasts ARP: who has ${dst}?` });
      if (!h || !h.up || h.vlan !== src.vlan) {
        if (h && h.vlan !== src.vlan)
          out.push({ cls: "err", s: `switch: ${h.name} is in vlan ${h.vlan}, this is vlan ${src.vlan} — the ARP broadcast never reaches it` });
        out.push({ cls: "err", s: `ip neigh: ${dst} INCOMPLETE — no reply` });
        return out.concat([{ cls: "err", s: `From ${src.ip} icmp_seq=1 Destination Host Unreachable` }]);
      }
      // does the far host consider us local too? (mask mismatch check)
      if (!sameSubnet(h.ip, src.ip, h.cidr))
        out.push({ cls: "hit", s: `note: ${h.name} has /${h.cidr}, so it considers ${src.ip} REMOTE and will reply via its gateway — asymmetric masks` });
      out.push({ cls: "note", s: `${h.name} replies: ${dst} is at ${h.mac}` });
      return out.concat([{ cls: "", s: `64 bytes from ${dst}: icmp_seq=1 ttl=64 time=0.21 ms` }]);
    }

    if (!src.gw) {
      out.push({ cls: "err", s: "no default gateway configured for this host" });
      return out.concat([{ cls: "err", s: "connect: Network is unreachable   (failed instantly — the packet never left)" }]);
    }
    out.push({ cls: "note", s: `remote destination -> hand the frame to gateway ${src.gw} (dst IP stays ${dst}, dst MAC becomes the gateway's)` });
    if (!h || !h.up)
      return out.concat([{ cls: "err", s: `no route beyond the gateway to ${dst} — request timed out (the packet DID leave; nothing answered)` }]);
    if (this.boundary && h.vlan !== src.vlan)
      out.push({ cls: "note", s: `boundary ${this.boundary.name}: unicast permitted, forwarded` });
    return out.concat([{ cls: "", s: `64 bytes from ${dst}: icmp_seq=1 ttl=63 time=1.44 ms` }]);
  };

  /* ---------------- exports ---------------- */
  LN.net = {
    Network,
    util: { ip2int, int2ip, cidr2mask, mask2cidr, network, broadcast, sameSubnet, isMulticast, isValidIp, mcastMac, fmt },
    QUERY_INTERVAL, MEMBER_TIMEOUT
  };
})();
