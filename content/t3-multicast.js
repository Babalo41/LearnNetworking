window.LN = window.LN || { tracks: [] };
LN.tracks.push({
id: "t3", title: "T3 · Multicast & IGMP",
blurb: "The core track: how an app sends one stream to many hosts, and how you make the switch deliver it only to those who asked.",
cards: [

{ id:"t3-modes", title:"Unicast, broadcast, multicast — pick the right one", prereqs:["t2-flooding"],
  why:"Your app sends the same data to several hosts. There are three ways to do that and only one of them scales. Knowing exactly why is the foundation of everything else in this track.",
  body:`
<p>One source, N receivers. Three options:</p>
<table>
<tr><th>Mode</th><th>How</th><th>Cost on the source</th><th>Who receives it</th></tr>
<tr><td><b>Unicast</b></td><td>N separate copies</td><td>N × bandwidth — scales linearly</td><td>exactly the N you addressed</td></tr>
<tr><td><b>Broadcast</b></td><td>1 copy to <code>x.x.x.255</code></td><td>1 × bandwidth</td><td><b>everyone</b>, wanted or not; never crosses a router</td></tr>
<tr><td><b>Multicast</b></td><td>1 copy to a <i>group</i></td><td>1 × bandwidth</td><td>only hosts that <b>joined</b> the group</td></tr>
</table>
<pre>UNICAST                 BROADCAST               MULTICAST
 src                     src                     src
  ├─→ A (wants)           └─→ ALL                 └─→ group 239.1.1.1
  ├─→ B (wants)               A ✓ wants               ├─→ A ✓ joined
  └─→ C (wants)               B ✓ wants               └─→ B ✓ joined
 3 copies on the wire         C ✗ discards            C never sees it
                              D ✗ discards          1 copy on the wire</pre>
<p>Multicast is the only option that sends <b>one copy</b> and still reaches <b>only the interested</b>. That combination is why it exists — and why a data-distribution app uses it.</p>
<p>The catch, and the whole reason for this track: <b>a plain switch cannot tell who is interested.</b> Left alone it degrades multicast into broadcast by flooding it. Multicast only delivers on its promise once the switch is taught who joined — and IGMP is how it is taught.</p>`,
  pitfalls:[
    "Multicast is UDP. There is no retransmission, no ordering guarantee, no connection. A receiver that misses data will never be told.",
    "'It works' on a small quiet lab segment proves nothing — flooding is invisible until the link fills up or hosts get busy."
  ],
  items:[
    {type:"mcq", q:"Why is multicast preferred over unicast for one-to-many data distribution?",
     choices:["It is more reliable","The source sends one copy regardless of how many receivers there are","It is encrypted","It crosses routers more easily"],
     correct:1, explain:"Unicast bandwidth scales with the number of receivers; multicast does not. Reliability is actually worse (UDP), and crossing routers is harder, not easier."},
    {type:"mcq", q:"What does a switch with no IGMP snooping do with multicast traffic?",
     choices:["Drops it","Delivers it only to joined hosts","Floods it out every port, effectively turning it into broadcast","Sends it to the router only"],
     correct:2, explain:"With no group knowledge the switch cannot filter, so it floods. Multicast then costs every host CPU, exactly like broadcast."},
    {type:"input", q:"Which transport protocol does IP multicast use? (one word)",
     accept:["udp"], explain:"Multicast is UDP — connectionless, no retransmission. Any reliability must be built by the application on top."}
  ]},

{ id:"t3-groups", title:"Group addresses, and the MAC mapping that bites people", prereqs:["t3-modes"],
  why:"You will read group addresses out of your app's config. Knowing which ranges are safe, which are reserved, and how a group maps onto a MAC address explains a whole class of 'traffic I never subscribed to' faults.",
  body:`
<p>Multicast lives in <b>224.0.0.0/4</b> — every address from 224.0.0.0 to 239.255.255.255. It is not assigned to any host; it names a <b>group</b> that hosts choose to join.</p>
<table>
<tr><th>Range</th><th>Name</th><th>Notes</th></tr>
<tr><td><code>224.0.0.0/24</code></td><td>Link-local control</td><td><b>Never</b> forwarded or snooped-away. <code>224.0.0.1</code> = all hosts, <code>224.0.0.2</code> = all routers, <code>224.0.0.22</code> = IGMPv3 reports</td></tr>
<tr><td><code>224.0.1.0</code>–<code>238.x</code></td><td>Globally routable</td><td>Internet-wide scope; not for internal apps</td></tr>
<tr><td><b><code>239.0.0.0/8</code></b></td><td><b>Administratively scoped</b></td><td><b>Use this range for in-house applications.</b> Private, like RFC1918</td></tr>
</table>
<h3>The IP → MAC mapping (and its 32:1 collision)</h3>
<p>To put a group on Ethernet, the NIC needs a MAC. The rule: prefix <code>01:00:5e</code>, then the <b>low 23 bits</b> of the group address.</p>
<pre>  239.1.1.1
    = 11101111.00000001.00000001.00000001
                ^ these low 23 bits are copied
  MAC = 01:00:5e:01:01:01

  BUT the top 5 bits are thrown away, so 2^5 = 32 different
  group addresses map onto the SAME MAC address:

  239.1.1.1   -&gt; 01:00:5e:01:01:01
  239.129.1.1 -&gt; 01:00:5e:01:01:01   (same!)
  224.1.1.1   -&gt; 01:00:5e:01:01:01   (same!)</pre>
<p>Consequence: a host that joined <code>239.1.1.1</code> will have its NIC accept frames for <code>239.129.1.1</code> too. The kernel drops them after inspecting the IP header — so you get unexplained CPU load and <code>tcpdump</code> showing traffic for a group you never joined. Choosing group addresses that differ only in the top 5 bits is a real, avoidable mistake.</p>`,
  pitfalls:[
    "Never pick a group in <code>224.0.0.0/24</code> for an application. That range is link-local control traffic; switches deliberately flood it and IGMP snooping is required to leave it alone.",
    "Group addresses that differ only in the first octet or the top bits collide at the MAC layer. Vary the <b>lower</b> octets to keep them distinct.",
    "TTL on multicast defaults to 1 in many libraries — the packet dies at the first router. If your app must cross a router, TTL must be set explicitly."
  ],
  items:[
    {type:"input", q:"Which /8 range is administratively scoped and correct for in-house applications? (e.g. 224.0.0.0/8)",
     accept:["239.0.0.0/8","239/8","239.0.0.0"], explain:"239.0.0.0/8 is the private multicast range — the multicast equivalent of RFC1918. Internal apps belong here."},
    {type:"mcq", q:"How many distinct multicast group addresses map to a single Ethernet multicast MAC?",
     choices:["1","32","256","1024"],
     correct:1, explain:"Only the low 23 bits are copied into the MAC; 5 bits are discarded, so 2^5 = 32 groups collide on one MAC. The NIC accepts all 32; the kernel filters the rest."},
    {type:"mcq", q:"<code>tcpdump</code> shows your host receiving a group it never joined, and CPU is elevated. Most likely explanation?",
     choices:["The switch is broken","A MAC-layer collision: another group shares the same 01:00:5e MAC, so the NIC accepts it and the kernel discards it","Someone spoofed your IP","IGMPv3 is required"],
     correct:1, explain:"The 32:1 mapping means the NIC's hardware filter cannot distinguish those groups. The fix is to choose group addresses whose low 23 bits differ."},
    {type:"input", q:"What three-byte prefix starts every IPv4 multicast MAC address?",
     accept:["01:00:5e","01-00-5e","01005e"], explain:"01:00:5e, followed by the low 23 bits of the group address."}
  ]},

{ id:"t3-igmp", title:"IGMP: how a host says \"I want this group\"", prereqs:["t3-groups"],
  why:"This is the protocol behind the sentence 'IGMP configuration had to be made to send only to who asked for it.' IGMP is the asking. Snooping (next card) is the listening.",
  body:`
<p><b>IGMP = Internet Group Management Protocol.</b> It runs between hosts and the router/querier on a segment. It has only three messages that matter:</p>
<table>
<tr><th>Message</th><th>Sent by</th><th>Meaning</th></tr>
<tr><td><b>Membership Report</b> ("join")</td><td>host</td><td>"I want group G" — sent when an app opens the socket, and again in reply to queries</td></tr>
<tr><td><b>Query</b></td><td>querier (router/switch)</td><td>"Who still wants anything?" — sent every ~125 s to <code>224.0.0.1</code></td></tr>
<tr><td><b>Leave Group</b></td><td>host</td><td>"I am done with G" (IGMPv2+); triggers a group-specific query to check nobody else wants it</td></tr>
</table>
<pre>  app calls setsockopt(IP_ADD_MEMBERSHIP, 239.1.1.1)
        │
        └─→ kernel sends IGMP Membership Report for 239.1.1.1
                  │
                  └─→ querier and any snooping switch record:
                      "port 7 wants 239.1.1.1"

  ...every 125 s...
  querier -&gt; General Query to 224.0.0.1  ("anyone still interested?")
  host    -&gt; Report for 239.1.1.1        (refreshes the entry)

  no report for ~260 s  -&gt; entry expires -&gt; traffic stops going to that port</pre>
<h3>v2 vs v3 — the one difference to remember</h3>
<ul>
<li><b>IGMPv2</b>: "I want group G", from any source. Simple, universally supported.</li>
<li><b>IGMPv3</b>: "I want group G <em>from source S</em>" (SSM — source-specific multicast). Filters at join time and avoids collisions between two apps using the same group.</li>
</ul>
<p><b>Version mismatch is a classic outage:</b> if any device on the segment only speaks v2, the querier drops the whole segment to v2, and v3 source filters stop being honoured. Everything keeps "working" but hosts receive more than they asked for.</p>
<h3>Seeing it on Linux</h3>
<pre>$ ip maddr show dev eth0        # groups this interface has joined
$ cat /proc/net/igmp            # per-interface group membership + refcount
$ tcpdump -i eth0 igmp          # watch joins, queries and leaves live</pre>`,
  pitfalls:[
    "A join lasts only as long as the socket. If the app crashes or is restarted, membership disappears and traffic stops — which looks like a network fault but is an application fault.",
    "Membership is refreshed by <em>replies to queries</em>. No querier on the segment ⇒ no queries ⇒ entries age out ⇒ traffic stops after a few minutes. See the next card.",
    "IGMP is its own IP protocol (number 2), not TCP or UDP. A firewall rule allowing 'udp only' silently kills multicast."
  ],
  items:[
    {type:"mcq", q:"What causes a host to send an IGMP Membership Report?",
     choices:["Booting up","An application joining a group, or a reply to a periodic query","Receiving multicast traffic","Its ARP cache expiring"],
     correct:1, explain:"Joins are triggered by the application (IP_ADD_MEMBERSHIP) and refreshed by answering the querier's periodic General Query."},
    {type:"input", q:"Roughly how often does the querier send a General Query, in seconds? (default)",
     accept:["125","125s","125 seconds"], explain:"The default query interval is 125 s; membership typically expires after about 260 s of silence (two missed queries plus response time)."},
    {type:"mcq", q:"The key difference of IGMPv3 over v2:",
     choices:["It is faster","It can request a group from a specific source (source-specific multicast)","It works without a querier","It supports IPv6"],
     correct:1, explain:"v3 adds source filtering. Note that one v2-only device on the segment can force the whole segment back to v2, silently discarding those filters."},
    {type:"mcq", q:"A firewall allows 'TCP and UDP only'. What happens to multicast?",
     choices:["Nothing, multicast is UDP","IGMP is blocked (IP protocol 2), so joins never register and traffic never gets delivered","Only IGMPv3 breaks","Traffic is delivered but unencrypted"],
     correct:1, explain:"The data is UDP, but the signalling is IGMP — a distinct IP protocol. Block IGMP and the data plane has no idea anyone wants the stream."},
    {type:"input", q:"Which file shows per-interface IGMP group membership on Linux? (full path)",
     accept:["/proc/net/igmp","proc/net/igmp"], explain:"/proc/net/igmp lists each interface's joined groups with reference counts. ip maddr show is the friendlier view."}
  ]},

{ id:"t3-snooping", title:"IGMP snooping: \"send only to who asked for it\"", prereqs:["t3-igmp"],
  why:"This is the exact configuration you described. This card is the centre of the whole tool.",
  body:`
<p>Recall the problem: IGMP is a conversation between <b>hosts and the router</b> at Layer 3. A switch works at Layer 2 and is not part of that conversation — so by default it knows nothing about groups and floods everything.</p>
<p><b>IGMP snooping</b> is the switch eavesdropping on IGMP messages passing through it, and building a per-port group table from what it overhears:</p>
<pre>WITHOUT SNOOPING                    WITH SNOOPING
  src ──→ [switch] ──→ p1 A ✓         src ──→ [switch] ──→ p1 A ✓ joined
                └───→ p2 B ✓                        └────→ p2 B ✓ joined
                └───→ p3 C ✗ discards                      p3 C  (nothing sent)
                └───→ p4 D ✗ discards                      p4 D  (nothing sent)
  every host pays CPU                 only subscribers see a single frame</pre>
<pre>switch# show igmp snooping groups
 VLAN  GROUP        PORTS        EXPIRES
 10    239.1.1.1    p1, p2       0:04:12
 10    239.1.1.2    p7           0:03:55

switch# show igmp snooping
 IGMP snooping        : enabled
 Querier              : enabled  (10.42.7.1)
 Query interval       : 125 s
 Fast-leave           : disabled</pre>
<h3>What changes on the host</h3>
<p>Nothing. Applications do not know snooping exists. That is the point — it is a pure switch-side optimisation, invisible until you look at CPU or a packet capture.</p>
<h3>Two settings that go with it</h3>
<ul>
<li><b>Querier</b> — someone must send the periodic queries that keep memberships alive. Covered in the next card; this is the number one cause of snooping failures.</li>
<li><b>Fast-leave / immediate-leave</b> — on receiving a Leave, drop the port immediately instead of asking "anyone else?". Only safe when <b>one host per port</b>. Enable it on a shared/hub port and you cut off other listeners.</li>
</ul>
<h3>The mrouter port</h3>
<p>The switch must always forward multicast (and all joins) toward the port where the router/querier lives — the <b>mrouter port</b>. It is detected automatically from queries, or set statically. If the switch cannot find it, joins never reach the router and inter-subnet multicast dies.</p>`,
  pitfalls:[
    "<b>Snooping without a querier is worse than no snooping.</b> Memberships age out with nothing to refresh them, the switch prunes every port, and the stream stops entirely after a few minutes. The classic symptom: 'it works for about 5 minutes after a restart, then dies.'",
    "Fast-leave on a port with more than one listener cuts off the others the moment any one of them leaves.",
    "Snooping applies per VLAN. Enabling it globally but not on the VLAN carrying the traffic changes nothing."
  ],
  items:[
    {type:"mcq", q:"What is IGMP snooping, precisely?",
     choices:["A router protocol for forwarding multicast between subnets","A switch inspecting IGMP messages passing through it to learn which ports joined which groups","A host-side filter for unwanted groups","An encryption layer for multicast"],
     correct:1, explain:"It is a Layer-2 device listening in on a Layer-3 conversation to build a per-port group table, so it can forward instead of flood."},
    {type:"mcq", q:"Multicast works for about five minutes after every restart, then stops. Most likely cause?",
     choices:["Bad cable","IGMP snooping is enabled but there is no querier on the VLAN, so memberships age out","MTU mismatch","Wrong subnet mask"],
     correct:1, explain:"The initial join populates the table; with no querier nothing refreshes it, so it expires (~260 s) and the switch prunes every port. This is the single most common IGMP snooping fault."},
    {type:"mcq", q:"When is fast-leave (immediate-leave) safe to enable?",
     choices:["Always","Only when there is exactly one host per switch port","Only with IGMPv3","Only when snooping is disabled"],
     correct:1, explain:"Fast-leave prunes the port without checking for other listeners. With multiple hosts behind one port, one leave cuts off everyone else."},
    {type:"input", q:"What is the name of the switch port leading toward the multicast router/querier? (two words)",
     accept:["mrouter port","multicast router port","mrouter"], explain:"The mrouter port. Joins and multicast are always forwarded toward it; if it is not detected, inter-subnet multicast fails."},
    {type:"mcq", q:"After enabling IGMP snooping correctly, what must change in the application?",
     choices:["It must use IGMPv3","Nothing — snooping is invisible to hosts","It must re-join every 125 s manually","It must switch from UDP to TCP"],
     correct:1, explain:"Snooping is purely a switch-side forwarding optimisation. The kernel already answers queries on the application's behalf."}
  ]},

{ id:"t3-querier", title:"The querier: the piece everyone forgets", prereqs:["t3-snooping"],
  why:"Directly the highest-value fact in this whole tool. If you remember one thing about IGMP configuration, remember that snooping and querier are a pair.",
  body:`
<p>IGMP membership is <b>soft state</b>: it must be continuously re-confirmed or it disappears. The confirmation cycle is driven by the <b>querier</b>:</p>
<pre>   querier ──General Query──→ 224.0.0.1 (all hosts)   every 125 s
   hosts   ──Membership Report──→                     refresh entries
   switch  (snooping) overhears reports              -&gt; timers reset

   No querier  -&gt;  no queries  -&gt;  no reports  -&gt;  timers expire (~260 s)
               -&gt;  switch prunes every port     -&gt;  stream dies everywhere</pre>
<p>Normally the multicast <b>router</b> is the querier. But in a flat, single-subnet, isolated network — exactly the kind of segment where a data-distribution app runs — <b>there may be no router on that VLAN at all.</b> Then nothing sends queries, and enabling snooping actively breaks a network that previously worked by flooding.</p>
<p>The fix is to enable the switch's built-in querier:</p>
<pre>switch(config)# ip igmp snooping vlan 10
switch(config)# ip igmp snooping vlan 10 querier
switch(config)# ip igmp snooping vlan 10 querier address 10.42.7.2</pre>
<h3>Querier election</h3>
<p>If several queriers exist on one VLAN, the one with the <b>lowest IP address</b> wins and the rest go quiet. That creates a subtle trap: add a new device with a lower IP and it silently takes over querying. If it is misconfigured or its queries do not reach everywhere, the whole segment's multicast fails for a reason that appears entirely unrelated to the change that was made.</p>
<h3>Verifying</h3>
<pre>switch# show ip igmp snooping querier
 VLAN  IP ADDRESS   VERSION  STATE
 10    10.42.7.2    v2       Querier   &lt;- this switch is active querier

$ tcpdump -i eth0 igmp
 10:14:02 IP 10.42.7.2 &gt; 224.0.0.1: igmp query v2
 10:14:02 IP 10.42.7.10 &gt; 239.1.1.1: igmp v2 report 239.1.1.1</pre>
<p>Seeing a query roughly every two minutes on a capture is the fastest proof the mechanism is alive.</p>`,
  pitfalls:[
    "Enabling snooping without a querier converts a working (if wasteful) flooded network into a broken one, on a delay of a few minutes. Because the break is delayed, it is rarely connected to the change that caused it.",
    "Querier election is by lowest IP. Adding equipment can silently move the role.",
    "Some devices need the querier enabled <b>per VLAN</b>, not globally. A global-only command can look correct and do nothing."
  ],
  items:[
    {type:"mcq", q:"Why does IGMP snooping need a querier?",
     choices:["To encrypt IGMP messages","Because membership is soft state that must be refreshed by periodic queries, or it expires","To assign multicast IP addresses","To route multicast between VLANs"],
     correct:1, explain:"No queries → no reports → membership timers expire (~260 s) → the switch prunes every port and the stream stops."},
    {type:"mcq", q:"If several devices could be querier on one VLAN, which one wins?",
     choices:["Highest IP address","Lowest IP address","The one configured first","The switch with the most ports"],
     correct:1, explain:"Lowest IP wins; the others stand down. Adding a device with a low IP can silently take over the role and break multicast for unrelated-looking reasons."},
    {type:"input", q:"After roughly how many seconds of no queries does IGMP membership typically expire?",
     accept:["260","260s","260 seconds","~260"], explain:"About 260 s — two missed 125 s queries plus the maximum response time. That delay is why the breakage seems disconnected from the change."},
    {type:"mcq", q:"A flat isolated VLAN has no router at all, and the app uses multicast. You enable IGMP snooping. What must you also do?",
     choices:["Nothing, it will work","Enable the switch's IGMP querier on that VLAN","Switch the app to broadcast","Add a default gateway to every host"],
     correct:1, explain:"With no router there is no natural querier. The switch must supply one, configured on the specific VLAN carrying the traffic."}
  ]},

{ id:"t3-scope", title:"TTL, scope, and why multicast dies at a router or crypto tunnel", prereqs:["t3-querier"],
  why:"Ties multicast to the SINA/segmented side of your environment. Multicast crossing a boundary is a completely different problem from multicast on one segment — and the boundary is usually where it stops.",
  body:`
<p>Two independent things must be true for multicast to leave its own segment. Both fail silently.</p>
<h3>1. TTL must be large enough</h3>
<p>Every router decrements TTL and drops the packet at zero. Many multicast libraries default the TTL to <b>1</b>, meaning "this segment only":</p>
<table>
<tr><th>TTL</th><th>Reach</th></tr>
<tr><td>0</td><td>the sending host only</td></tr>
<tr><td><b>1</b></td><td>the local subnet — <b>common default</b></td></tr>
<tr><td>&gt;1</td><td>up to that many router hops</td></tr>
</table>
<pre>setsockopt(sock, IPPROTO_IP, IP_MULTICAST_TTL, &amp;ttl, sizeof(ttl));</pre>
<h3>2. Something must route multicast</h3>
<p>Unicast routing is standard; <b>multicast routing is not enabled by default anywhere.</b> It needs a separate protocol — usually <b>PIM</b> — configured on every router in the path. Without it a router receives your multicast and drops it, with no error and no log.</p>
<h3>Crypto gateways and tunnels (SINA and similar)</h3>
<p>An encrypting gateway builds a tunnel between segments. Multicast interacts badly with tunnels in three specific ways:</p>
<ul>
<li><b>It is often simply not carried.</b> Many tunnel modes are unicast point-to-point; multicast and broadcast are dropped at the entry. The tunnel is up, unicast works perfectly, and multicast vanishes.</li>
<li><b>IGMP does not cross either.</b> Even if data could pass, joins from the far side never reach the source-side querier, so nobody is ever registered as interested.</li>
<li><b>MTU.</b> Encapsulation plus encryption adds overhead. A 1500-byte multicast datagram becomes too large; with DF set it is dropped, and since multicast is UDP with no feedback path, no error ever reaches the application. Symptom: small messages arrive, large ones never do.</li>
</ul>
<p><b>Diagnostic that separates the cases:</b> if unicast works across the boundary but multicast does not, the boundary is the fault — not the switch, not the app, not IGMP. And if <em>small</em> multicast messages cross but large ones do not, it is MTU.</p>`,
  pitfalls:[
    "TTL 1 is the default in a lot of code. It looks fine in a lab where everything is on one segment, then fails the moment a router appears.",
    "No error is generated when a router drops multicast for lack of PIM. Absence of logs is not evidence of correct configuration.",
    "'The tunnel is up' only ever proves unicast works. Multicast across a tunnel is a separate capability that must be explicitly supported and configured."
  ],
  items:[
    {type:"mcq", q:"An app's multicast works locally but never crosses the router. TTL is at its library default. Most likely cause?",
     choices:["Wrong group address","TTL is 1, so the packet is discarded at the first router","IGMP snooping is enabled","Wrong subnet mask"],
     correct:1, explain:"TTL 1 means local segment only. Even with multicast routing configured correctly, the packet never survives the first hop."},
    {type:"mcq", q:"What is additionally required for a router to forward multicast between subnets?",
     choices:["Nothing, routers forward it by default","A multicast routing protocol such as PIM, explicitly configured","IGMPv3 on all hosts","A larger MTU"],
     correct:1, explain:"Multicast routing is off by default everywhere. Without PIM the router silently drops multicast — no error, no log entry."},
    {type:"mcq", q:"Across a crypto tunnel, unicast works but multicast does not. What does that tell you?",
     choices:["The switch's IGMP snooping is broken","The application is misconfigured","The boundary device is the fault — many tunnel modes do not carry multicast, and IGMP joins do not cross either","The MAC table is full"],
     correct:2, explain:"Working unicast proves the path and the tunnel itself are fine. Multicast across a tunnel is a separate capability; both the data and the IGMP signalling must be explicitly supported."},
    {type:"mcq", q:"Small multicast messages cross the encrypted link; large ones never arrive, with no errors anywhere. Cause?",
     choices:["IGMP version mismatch","MTU — encapsulation overhead makes large datagrams too big, and UDP gives no feedback","Querier election","Wrong TTL"],
     correct:1, explain:"A size-dependent failure is always MTU. Because multicast is UDP with no feedback path, nothing reports the drop to the application."},
    {type:"input", q:"What is the multicast TTL value that restricts traffic to the local subnet? (number)",
     accept:["1"], explain:"TTL 1 — the first router decrements it to 0 and drops it. It is the default in many libraries."}
  ]},

{ id:"t3-triage", title:"Triage order for a broken multicast stream", prereqs:["t3-scope"],
  why:"A repeatable sequence beats guessing. Each step splits the problem in half, and each has one command that gives an unambiguous answer.",
  body:`
<p>Work outward from the receiver. Stop at the first step that fails — everything after it is noise.</p>
<table>
<tr><th>#</th><th>Question</th><th>Command</th><th>If it fails</th></tr>
<tr><td>1</td><td>Is the app actually joined?</td><td><code>ip maddr show dev eth0</code><br><code>cat /proc/net/igmp</code></td><td>Application fault — the socket is not open or is bound to the wrong interface</td></tr>
<tr><td>2</td><td>Is the join leaving the host?</td><td><code>tcpdump -i eth0 igmp</code></td><td>Host firewall blocking IGMP (IP protocol 2), or wrong source interface</td></tr>
<tr><td>3</td><td>Are queries arriving?</td><td><code>tcpdump -i eth0 igmp</code> — expect a query every ~125 s</td><td><b>No querier.</b> The most common fault of all</td></tr>
<tr><td>4</td><td>Does the switch know about the port?</td><td><code>show igmp snooping groups</code></td><td>Snooping misconfigured, wrong VLAN, or the join never arrived</td></tr>
<tr><td>5</td><td>Is data reaching the wire?</td><td><code>tcpdump -i eth0 host 239.1.1.1</code></td><td>Source not sending, wrong group, or pruned upstream</td></tr>
<tr><td>6</td><td>Does it cross the boundary?</td><td>capture on both sides</td><td>TTL, missing PIM, or a tunnel that does not carry multicast</td></tr>
</table>
<h3>Reading the symptom before you start</h3>
<table>
<tr><th>Symptom</th><th>Points to</th></tr>
<tr><td>Works ~5 min after restart, then stops</td><td>Snooping enabled, no querier</td></tr>
<tr><td>Never works at all, one segment</td><td>Wrong group/port, app not joined, or firewall blocking IGMP</td></tr>
<tr><td>Works, but every host has high softirq CPU</td><td>Snooping <em>off</em> — flooding</td></tr>
<tr><td>Small messages arrive, large ones do not</td><td>MTU at a tunnel or encapsulation point</td></tr>
<tr><td>Works locally, never across the router/gateway</td><td>TTL=1, no PIM, or the tunnel drops multicast</td></tr>
<tr><td>Receiving groups nobody joined</td><td>32:1 MAC collision between group addresses</td></tr>
<tr><td>Stopped after unrelated equipment was added</td><td>Querier election moved to a lower-IP device</td></tr>
</table>`,
  pitfalls:[
    "Do not start at the switch. Start at the receiver — step 1 is free and eliminates the application, which is the cause more often than anyone expects.",
    "A capture showing no queries is a complete diagnosis on its own. Do not keep investigating past it."
  ],
  items:[
    {type:"mcq", q:"First thing to check when one receiver is not getting a multicast stream?",
     choices:["Switch IGMP snooping table","Whether the application has actually joined the group (ip maddr / /proc/net/igmp)","Cabling","The querier"],
     correct:1, explain:"Start at the receiver: cheapest check, and 'the app never joined' or 'joined on the wrong interface' is a very common cause."},
    {type:"mcq", q:"Symptom: the stream works for a few minutes after every restart, then stops. Diagnosis?",
     choices:["MTU mismatch","Snooping enabled with no querier — memberships age out","TTL too low","Duplicate IP address"],
     correct:1, explain:"The initial join populates the snooping table; nothing refreshes it, so it expires after ~260 s and every port is pruned."},
    {type:"mcq", q:"Symptom: everything works, but all hosts show high softirq CPU. Diagnosis?",
     choices:["Snooping is off, so multicast is being flooded to every host","No querier","Wrong VLAN","IGMPv3 mismatch"],
     correct:0, explain:"Working delivery plus segment-wide CPU cost is the signature of flooding. Enable snooping (with a querier) to prune it."},
    {type:"input", q:"Which single tcpdump filter shows joins, queries and leaves? Write the full command for eth0.",
     accept:["tcpdump -i eth0 igmp","tcpdump igmp","tcpdump -i eth0 igmp -n"], explain:"tcpdump -i eth0 igmp answers steps 2 and 3 at once: is my join leaving, and are queries arriving?"}
  ]}
]});
