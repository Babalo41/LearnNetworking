window.LN = window.LN || { tracks: [] };
LN.tracks.push({
id: "t2", title: "T2 · Switching & Broadcast Domains",
blurb: "What a switch does with a frame — and why 'flooding' is the root of your multicast problem.",
cards: [

{ id:"t2-mactable", title:"The MAC address table: a switch's only real idea", prereqs:["t1-arp"],
  why:"A switch has exactly one decision to make per frame: which port(s) to send it out of. Everything else — VLANs, IGMP snooping, storms — is a modification of that single decision.",
  body:`
<p>A switch learns by watching <b>source</b> addresses and forwards by looking up <b>destination</b> addresses.</p>
<pre>Frame arrives on port 3, src 00:aa:..:01, dst 00:aa:..:09

  LEARN:   "00:aa:..:01 lives on port 3"  -&gt; write to MAC table
  FORWARD: look up 00:aa:..:09
             found on port 7   -&gt; send out port 7 only        (unicast)
             not in table      -&gt; send out EVERY other port   (flood)
             dst = ff:ff:..:ff -&gt; send out EVERY other port   (broadcast)</pre>
<pre>switch# show mac-table
 VLAN  MAC ADDRESS        PORT   TYPE
 10    00:aa:bb:cc:00:01  3      dynamic
 10    00:aa:bb:cc:00:09  7      dynamic
 10    00:aa:bb:cc:00:20  12     dynamic</pre>
<p>Entries expire (typically 300 s). A silent host ages out and its traffic gets flooded again until it speaks. This is normal, not a fault.</p>
<h3>The three destinations</h3>
<table>
<tr><th>Kind</th><th>Destination MAC</th><th>Switch behaviour</th></tr>
<tr><td>Unicast</td><td>one specific MAC</td><td>one port (if learned)</td></tr>
<tr><td>Broadcast</td><td><code>ff:ff:ff:ff:ff:ff</code></td><td><b>every</b> port</td></tr>
<tr><td>Multicast</td><td><code>01:00:5e:xx:xx:xx</code></td><td><b>every</b> port — unless IGMP snooping is on</td></tr>
</table>
<p>That last row is the entire reason IGMP configuration exists. Hold on to it.</p>`,
  pitfalls:[
    "A switch never looks at IP addresses. Asking 'which subnet is this switch in' is usually the wrong question — ask which VLAN the port is in.",
    "Flooding is not a malfunction; it is the defined behaviour for unknown-unicast, broadcast, and (by default) multicast. The problem is only the <em>volume</em>."
  ],
  items:[
    {type:"mcq", q:"A frame arrives whose destination MAC is not in the table. What does the switch do?",
     choices:["Drops it","Sends it to the default gateway","Floods it out every other port in the VLAN","Sends an ARP request"],
     correct:2, explain:"Unknown-unicast flooding. The reply then teaches the switch where that MAC lives, so only the first frame floods."},
    {type:"input", q:"Which part of an arriving frame does a switch use to <b>learn</b>? (one word)",
     accept:["source","source mac","src","source address"], explain:"It learns from the source MAC (this address is reachable via the port I received it on) and forwards using the destination MAC."},
    {type:"mcq", q:"By default, how does a switch treat a frame sent to a multicast MAC like <code>01:00:5e:01:01:01</code>?",
     choices:["Drops it","Sends it only to subscribed hosts","Floods it out every port, like a broadcast","Forwards it to the router only"],
     correct:2, explain:"Without IGMP snooping a switch cannot tell who wants a multicast group, so it treats it like broadcast and floods. This is exactly the behaviour IGMP snooping fixes."}
  ]},

{ id:"t2-bcast-domain", title:"Broadcast domains, VLANs, and where the subnet boundary really lives", prereqs:["t2-mactable"],
  why:"'Same subnet' (an IP idea) and 'same broadcast domain' (a switch idea) must line up. When they don't, you get symptoms that look impossible.",
  body:`
<p>A <b>broadcast domain</b> = everywhere a broadcast frame reaches. By default that is the whole switch, and every switch chained to it. It stops only at a <b>router</b> (routers do not forward broadcasts) or at a <b>VLAN</b> boundary.</p>
<pre>          ┌──────────── VLAN 10 ────────────┐  ┌─── VLAN 20 ───┐
  app01 ──┤p1                              p3├──┤p9   nas01     │
  app02 ──┤p2   one broadcast domain         │  │  separate     │
          └──────────────────────────────────┘  └───────────────┘
                       10.42.7.0/24                10.42.8.0/24</pre>
<p>A <b>VLAN</b> slices one physical switch into several independent logical switches. Ports in VLAN 10 cannot reach ports in VLAN 20 at Layer 2 at all — not even by broadcast. Getting between them requires a router.</p>
<p><b>The rule to memorise: one VLAN = one broadcast domain = one IP subnet.</b> Configuration should keep these three in lockstep. Most "impossible" faults are one of the three drifting out of alignment.</p>
<h3>Access vs trunk ports</h3>
<ul>
<li><b>Access port</b> — belongs to one VLAN; the host is unaware VLANs exist. Normal server ports.</li>
<li><b>Trunk port</b> — carries many VLANs between switches, tagging each frame with its VLAN ID (802.1Q). If a VLAN is missing from a trunk's allowed list, that VLAN silently stops at the switch boundary.</li>
</ul>`,
  pitfalls:[
    "Two hosts in the same IP subnet but different VLANs will never talk, no matter how correct the addressing is. ARP shows INCOMPLETE and everything looks 'configured right'.",
    "A VLAN forgotten from a trunk's allowed list produces the most confusing symptom in networking: works within one switch, dead between switches.",
    "Making a broadcast domain huge to 'keep everything in one subnet' means every broadcast and every unsnooped multicast hits every host. That is how a working system degrades as it grows."
  ],
  items:[
    {type:"mcq", q:"Two servers have IPs in the same subnet but sit in different VLANs. Result?",
     choices:["They communicate normally","They cannot communicate at Layer 2 at all; ARP goes unanswered","Only TCP works","The switch routes between them automatically"],
     correct:1, explain:"VLANs are separate broadcast domains. ARP never crosses, so there is no MAC to send to — you would see INCOMPLETE in ip neigh despite perfect IP config."},
    {type:"input", q:"One VLAN should map to exactly one broadcast domain and one what? (one word)",
     accept:["subnet","ip subnet","network"], explain:"One VLAN = one broadcast domain = one IP subnet. Keeping those three aligned prevents most 'impossible' faults."},
    {type:"mcq", q:"Traffic in VLAN 30 works between hosts on switch A, but not between switch A and switch B. Most likely cause?",
     choices:["Wrong subnet mask","VLAN 30 is not in the allowed list on the trunk between the switches","IGMP snooping is off","The MAC table is full"],
     correct:1, explain:"A trunk carries only its allowed VLANs. Anything not allowed is dropped at the inter-switch link — works locally, dead between switches."}
  ]},

{ id:"t2-flooding", title:"Flooding, storms, and why this matters for CPU", prereqs:["t2-bcast-domain"],
  why:"Direct link to your high-CPU symptom. A host that is flooded with multicast it never asked for burns CPU in the kernel and in the app, on traffic it will just discard.",
  body:`
<p>Every flooded frame is delivered to <b>every</b> NIC in the broadcast domain. Each receiving host must then:</p>
<pre>  NIC receives frame
    → interrupt / softirq                (kernel CPU, cannot be avoided)
    → check destination MAC              (multicast MAC may match its filter)
    → pass up to IP layer, check group   (kernel CPU)
    → no socket joined  -&gt; DISCARD       (all that work, wasted)</pre>
<p>With one multicast stream at 50 Mbit/s flooded to 20 hosts, 19 of them are spending real CPU discarding it. On the graph this looks like "the application is using too much CPU", but the time is actually in <code>si</code> (softirq) — visible in <code>top</code>:</p>
<pre>%Cpu(s):  8.1 us,  4.2 sy,  0.0 ni, 61.0 id,  0.0 wa,  0.0 hi, 26.7 si</pre>
<p>A high <code>si</code> figure means <b>the kernel is drowning in packet processing</b>, not that your application is inefficient. That single number redirects an entire investigation.</p>
<h3>Broadcast/multicast storm</h3>
<p>When flooded traffic saturates links, everything on the segment degrades at once: pings get slow, unrelated services time out, and the fault appears to be everywhere. Anything affecting <em>every</em> host on a segment simultaneously is a segment-wide problem — look at flooding, storms, or a loop, not at individual hosts.</p>`,
  pitfalls:[
    "Do not read 'high CPU' as 'bad application' before checking the <code>si</code> column in <code>top</code>. Softirq time is network work.",
    "A host discards unwanted multicast <em>after</em> paying most of the cost. Filtering must happen on the switch — which is what IGMP snooping does."
  ],
  items:[
    {type:"mcq", q:"In <code>top</code>, <code>%Cpu(s)</code> shows <code>26.7 si</code>. What does that point to?",
     choices:["Application inefficiency","Disk I/O wait","Softirq — heavy kernel packet processing, typically a flood of unwanted traffic","Swap thrashing"],
     correct:2, explain:"si = softirq, where network receive processing happens. High si with a busy segment is the fingerprint of flooded traffic the host must inspect and discard."},
    {type:"mcq", q:"Twenty hosts receive a flooded multicast stream; only two joined the group. What do the other eighteen do?",
     choices:["Ignore it at zero cost","Receive it, process it up the stack, then discard it — burning CPU","Send an error back to the source","Automatically join the group"],
     correct:1, explain:"Discarding happens after NIC interrupt and kernel processing. The cost is paid before the decision to drop, which is why filtering has to move to the switch."},
    {type:"input", q:"Filtering unwanted multicast must happen on which device to actually save host CPU? (one word)",
     accept:["switch","the switch"], explain:"Only the switch can stop the traffic before it reaches the host NIC. Host-side filtering has already paid the CPU cost."}
  ]}
]});
