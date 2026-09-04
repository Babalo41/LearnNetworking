# LearnNetworking

An offline, interactive trainer for the networking you actually use: subnetting, switching,
and — the core of it — multicast and IGMP, plus Linux and Windows diagnostics and the
remote-access tools (MobaXterm, WinSCP, FreeRDP) that go with them.

**Open `index.html` in a browser. That is the whole install.** No server, no build step,
no dependencies. Progress is stored in the browser's localStorage; use *Export progress*
in the sidebar to keep a copy.

## The five modes

| Mode | What it is |
|---|---|
| **Learn** | Concept cards with worked examples and pitfalls. Cards unlock as you read their prerequisites — the order is the dependency chain, not a menu. |
| **Drill** | Spaced-repetition review. Mixes questions you are due to forget with freshly generated subnetting and multicast problems, so there is no answer key to memorise. |
| **Lab** | A simulated switch, hosts, VLANs and IGMP with a fake shell. Break things and watch why. |
| **Incident** | Decision-tree scenarios built from real situations. Wrong branches explain *why* they are wrong. |
| **Progress** | Per-concept retention, accuracy, streak, and reset/export. |

## Start here

In **Lab**, type `help`, then run this — it is the whole IGMP story in eight commands:

```
stream start app01 239.1.1.1     # a source begins transmitting
use app02
join 239.1.1.1                   # one host subscribes
use app03
top                              # app03 never joined — look at the si (softirq) column
switch snooping on               # read the warning it prints
tcpdump -i eth0 igmp 300         # silence here is itself the diagnosis
switch show igmp                 # the entries are gone; the stream is dead
switch querier on                # the missing half of the configuration
use app02
join 239.1.1.1
tick 300
switch show igmp                 # now it holds
```

Then: `topo vlans` (broadcast domains, mask mismatch) and `topo sina`
(`send 239.1.1.1 1500 5` — multicast at an encrypting boundary).

## Layout

```
index.html              loads everything with plain <script> tags
css/app.css
content/                the material — data, not code
  t1-addressing.js      IP/mask/CIDR, same-subnet rule, ARP, /etc/hosts
  t2-switching.js       MAC table, VLANs/broadcast domains, flooding and CPU
  t3-multicast.js       modes, group addressing, IGMP, snooping, querier, scope, triage
  t4-linux.js            shell navigation, systemd, logs, disk, crash dumps/OOM, paths, tmux
  t5-windows.js          shortcuts, CMD/PowerShell, Event Viewer, crash dumps, perfmon, paths
  t6-remote-tools.js     MobaXterm, WinSCP, FreeRDP, and a cross-machine triage workflow
  scenarios.js          incident decision trees
js/
  core.js               localStorage + SM-2 spaced repetition + content index
  net.js                the network model (hosts, switch, VLANs, IGMP, boundary)
  shell.js              topologies and the fake terminal
  drills.js             generated practice problems
  ui.js  app.js         views and navigation
```

## Adding material

A concept card is a plain object in a `content/*.js` file:

```js
{ id:"t3-foo", title:"…", prereqs:["t3-igmp"],
  why:"why this matters in your environment",
  body:`<p>HTML…</p>`,
  pitfalls:["…"],
  items:[ {type:"mcq", q:"…", choices:[…], correct:1, explain:"…"},
          {type:"input", q:"…", accept:["…"], explain:"…"} ] }
```

`prereqs` drives unlocking, `items` feed the spaced-repetition scheduler. A new
track is a `LN.tracks.push({id, title, blurb, cards:[…]})` in a new file, added
to the `<script>` list in `index.html`.

New topologies go in `LN.topologies` in `js/shell.js`; new generated drill types
go in `gens` in `js/drills.js`.

## Note on content

Everything here is built from public, vendor-documentation-level knowledge and uses
invented addresses and hostnames that mirror common topologies. Do not paste real
addresses, hostnames or configuration from a production or accredited network into
these files.
