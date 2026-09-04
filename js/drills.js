/* drills.js — generated practice. Infinite variants, so nothing can be memorised
   as an answer key; you have to actually do the work each time. */
(function () {
  "use strict";
  const U = LN.net.util;
  const R = n => Math.floor(Math.random() * n);
  const pick = a => a[R(a.length)];
  const randIp = () => pick([10, 172, 192]) === 10
    ? `10.${R(256)}.${R(256)}.${1 + R(254)}`
    : `192.168.${R(256)}.${1 + R(254)}`;

  const gens = {

    "subnet-network": () => {
      const c = pick([25, 26, 27, 28, 29]), ip = randIp();
      return {
        q: `What is the <b>network address</b> of <code>${ip}/${c}</code>?`,
        accept: [U.int2ip(U.network(ip, c))],
        explain: `Mask /${c} = ${U.int2ip(U.cidr2mask(c))}, block size ${256 - (U.cidr2mask(c) & 255)} in the last octet. ` +
                 `${ip} falls in the block starting at ${U.int2ip(U.network(ip, c))}, and that is the network address.`
      };
    },

    "subnet-broadcast": () => {
      const c = pick([25, 26, 27, 28]), ip = randIp();
      return {
        q: `What is the <b>broadcast address</b> of <code>${ip}/${c}</code>?`,
        accept: [U.int2ip(U.broadcast(ip, c))],
        explain: `Network ${U.int2ip(U.network(ip, c))}, block size ${256 - (U.cidr2mask(c) & 255)}. ` +
                 `The broadcast is the last address in the block: ${U.int2ip(U.broadcast(ip, c))}.`
      };
    },

    "subnet-hosts": () => {
      const c = pick([22, 23, 24, 25, 26, 27, 28, 29, 30]);
      return {
        q: `How many <b>usable host addresses</b> does a <code>/${c}</code> provide?`,
        accept: [String(Math.pow(2, 32 - c) - 2)],
        explain: `${32 - c} host bits → 2^${32 - c} = ${Math.pow(2, 32 - c)} addresses, minus the network and broadcast = ${Math.pow(2, 32 - c) - 2}.`
      };
    },

    "subnet-block": () => {
      const c = pick([25, 26, 27, 28, 29, 30]);
      return {
        q: `For a <code>/${c}</code>, what is the <b>block size</b> in the last octet?`,
        accept: [String(256 - (U.cidr2mask(c) & 255))],
        explain: `/${c} = ${U.int2ip(U.cidr2mask(c))}. 256 − ${U.cidr2mask(c) & 255} = ${256 - (U.cidr2mask(c) & 255)}. Subnets begin at every multiple of that.`
      };
    },

    "subnet-same": () => {
      const c = pick([25, 26, 27, 28]);
      const base = `10.${R(256)}.${R(256)}.`;
      const a = base + (1 + R(254));
      const same = Math.random() < 0.5;
      let b;
      if (same) {
        const n = U.network(a, c), size = Math.pow(2, 32 - c);
        b = U.int2ip(n + 1 + R(size - 2));
      } else {
        b = base + (1 + R(254));
      }
      const isSame = U.sameSubnet(a, b, c);
      return {
        q: `Host <code>${a}/${c}</code> sends to <code>${b}</code>. Does it deliver <b>directly</b> on the local wire, or hand the packet to its gateway?<br><span style="color:#8b97a8;font-size:12px">answer: <code>direct</code> or <code>gateway</code></span>`,
        accept: isSame ? ["direct", "local", "arp"] : ["gateway", "router", "remote", "gw"],
        explain: `${a} AND /${c} → ${U.int2ip(U.network(a, c))}. ${b} AND the same mask → ${U.int2ip(U.network(b, c))}. ` +
                 (isSame ? "Same network number → LOCAL → ARP and deliver directly."
                         : "Different network numbers → REMOTE → send to the default gateway (or fail with 'Network is unreachable' if none is set).")
      };
    },

    "mcast-mac": () => {
      const g = `239.${R(256)}.${R(256)}.${1 + R(254)}`;
      return {
        q: `Which Ethernet MAC does multicast group <code>${g}</code> map to?`,
        accept: [U.mcastMac(g), U.mcastMac(g).replace(/:/g, "")],
        explain: `Prefix 01:00:5e plus the low 23 bits of the group → ${U.mcastMac(g)}. The top 5 bits are discarded, which is why 32 different groups share one MAC.`
      };
    },

    "mcast-collide": () => {
      const o2 = 1 + R(120);
      const g = `239.${o2}.${R(256)}.${1 + R(254)}`;
      const p = g.split(".");
      // colliders differ only in bits the MAC mapping throws away (octet 1, or +128 on octet 2)
      const colliders = [`224.${p[1]}.${p[2]}.${p[3]}`, `239.${o2 + 128}.${p[2]}.${p[3]}`, `230.${o2 + 128}.${p[2]}.${p[3]}`];
      const distinct = [`239.${o2}.${p[2]}.${(+p[3] + 7) % 254 + 1}`, `239.${o2 + 1}.${p[2]}.${p[3]}`, `239.${o2}.${(+p[2] + 3) % 256}.${p[3]}`];
      const collider = Math.random() < 0.5 ? pick(colliders) : pick(distinct);
      const same = U.mcastMac(g) === U.mcastMac(collider);
      return {
        q: `A host joined <code>${g}</code>. Traffic for <code>${collider}</code> also arrives on the wire. Does this host's <b>NIC</b> accept those frames?<br><span style="color:#8b97a8;font-size:12px">answer: <code>yes</code> or <code>no</code></span>`,
        accept: same ? ["yes", "y"] : ["no", "n"],
        explain: `${g} → ${U.mcastMac(g)}, ${collider} → ${U.mcastMac(collider)}. ` +
                 (same ? "Identical MACs — the NIC accepts both and the kernel discards the unwanted one after paying the CPU cost."
                       : "Different MACs — the NIC filters it in hardware, at no cost.")
      };
    },

    "mcast-range": () => {
      const cands = [
        { ip: `239.${R(256)}.${R(256)}.${1 + R(254)}`, ok: true, why: "239.0.0.0/8 is the administratively scoped range — the correct choice for in-house applications." },
        { ip: `224.0.0.${1 + R(30)}`, ok: false, why: "224.0.0.0/24 is link-local control traffic (all-hosts, all-routers, IGMPv3 reports). Never use it for an application — switches deliberately flood it." },
        { ip: `10.${R(256)}.${R(256)}.5`, ok: false, why: "That is a normal unicast RFC1918 address, not multicast. Multicast is 224.0.0.0/4." },
        { ip: `232.${R(256)}.${R(256)}.9`, ok: false, why: "232.0.0.0/8 is reserved for source-specific multicast (SSM) with IGMPv3. Not a general-purpose choice for an internal app." },
        { ip: `240.${R(256)}.0.1`, ok: false, why: "240.0.0.0/4 is reserved space, above the multicast range entirely. Multicast ends at 239.255.255.255." }
      ];
      const c = pick(cands);
      return {
        q: `Is <code>${c.ip}</code> an appropriate group address for an internal application?<br><span style="color:#8b97a8;font-size:12px">answer: <code>yes</code> or <code>no</code></span>`,
        accept: c.ok ? ["yes", "y"] : ["no", "n"],
        explain: c.why
      };
    },

    "symptom": () => {
      const rows = [
        { s: "Multicast works for ~5 minutes after each restart, then stops for every receiver.", a: ["querier", "no querier", "missing querier"], e: "Snooping enabled with no querier. Memberships are soft state; with nothing refreshing them they expire after ~260s and the switch prunes every port." },
        { s: "Delivery works, but every host on the VLAN shows high softirq (si) CPU.", a: ["snooping", "no snooping", "flooding", "snooping off"], e: "Snooping is off, so multicast is flooded to every port. Each host processes and discards traffic it never joined." },
        { s: "Small multicast messages cross the encrypted link; large ones never arrive and nothing is logged.", a: ["mtu"], e: "Size-dependent loss is always MTU. Encapsulation overhead pushes large datagrams over the limit, and UDP provides no feedback path." },
        { s: "Multicast works on the local segment but never reaches hosts beyond the router.", a: ["ttl", "ttl 1", "ttl=1", "pim"], e: "Either TTL=1 (the library default — dropped at the first router) or no multicast routing protocol (PIM) configured. Both fail silently." },
        { s: "A host receives traffic for a group nobody ever joined, and CPU is elevated.", a: ["mac collision", "collision", "32:1", "mac"], e: "The 32:1 IP-to-MAC mapping: another group shares the same 01:00:5e MAC, so the NIC accepts it and the kernel discards it afterwards." },
        { s: "Two hosts on one switch, same IP subnet, correct masks — ARP shows INCOMPLETE both ways.", a: ["vlan", "different vlan", "vlans"], e: "Different VLANs. They are separate broadcast domains, so ARP never crosses, regardless of how correct the IP configuration is." },
        { s: "Multicast stopped working after an unrelated new device was added to the VLAN.", a: ["querier", "querier election", "election"], e: "Querier election goes to the lowest IP. The new device took over the role and its queries are not doing the job." },
        { s: "A host talks to its own subnet fine; everything else fails instantly, with no timeout.", a: ["gateway", "no gateway", "default gateway", "no default gateway", "route"], e: "No default route. The kernel rejects it locally ('Network is unreachable') before any packet leaves — hence instant, not a timeout." }
      ];
      const r = pick(rows);
      return {
        q: `<b>Symptom:</b> ${r.s}<br><span style="color:#8b97a8;font-size:12px">Name the cause in a word or two.</span>`,
        accept: r.a, explain: r.e
      };
    },

    "igmp-facts": () => {
      const rows = [
        { q: "How often does an IGMP querier send a general query, by default (seconds)?", a: ["125"], e: "125 s. Membership expires after roughly 260 s of silence." },
        { q: "After roughly how many seconds without queries does snooping prune a port?", a: ["260"], e: "~260 s: two missed 125 s intervals plus max response time." },
        { q: "Which IP protocol number is IGMP?", a: ["2"], e: "Protocol 2 — not TCP, not UDP. A firewall permitting 'TCP and UDP only' silently kills multicast signalling." },
        { q: "Which address does a general query go to?", a: ["224.0.0.1"], e: "224.0.0.1, the all-hosts group." },
        { q: "What is the multicast TTL that limits traffic to the local subnet?", a: ["1"], e: "TTL 1 — the default in many libraries, dropped at the first router." },
        { q: "Which switch port leads toward the multicast router/querier? (two words)", a: ["mrouter port", "mrouter", "multicast router port"], e: "The mrouter port; joins and multicast are always forwarded toward it." },
        { q: "Which /4 block is the entire IPv4 multicast range?", a: ["224.0.0.0/4", "224/4"], e: "224.0.0.0/4 — 224.0.0.0 through 239.255.255.255." },
        { q: "Which command lists the multicast groups an interface has joined? (two words)", a: ["ip maddr", "ip maddr show"], e: "ip maddr show dev eth0, or cat /proc/net/igmp for the raw view." }
      ];
      const r = pick(rows);
      return { q: r.q, accept: r.a, explain: r.e };
    }
  };

  const order = ["subnet-network", "subnet-broadcast", "subnet-hosts", "subnet-block", "subnet-same",
                 "mcast-mac", "mcast-collide", "mcast-range", "symptom", "igmp-facts"];

  LN.drills = {
    gens, order,
    make(id) { const g = gens[id] || gens[pick(order)]; const d = g(); d.gen = id; d.key = "drill:" + id; return d; },
    random() { return this.make(pick(order)); },
    /** normalised comparison — forgiving about case, spaces and trailing punctuation */
    check(input, accept) {
      const n = s => String(s).toLowerCase().trim().replace(/\s+/g, " ").replace(/[.]$/, "");
      return accept.some(a => n(a) === n(input));
    }
  };
})();
