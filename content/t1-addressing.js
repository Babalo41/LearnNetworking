window.LN = window.LN || { tracks: [] };
LN.tracks.push({
id: "t1", title: "T1 · Addressing & Subnets",
blurb: "Why two machines can or cannot talk to each other at all.",
cards: [

{ id:"t1-ip", title:"An IP address is two things at once", prereqs:[],
  why:"Every 'why can't these two boxes see each other' ticket ends here. The address alone tells you nothing — the address <em>plus the mask</em> tells you everything.",
  body:`
<p>An IPv4 address is 32 bits, written as four bytes: <code>10.42.7.93</code>. On its own it is meaningless for troubleshooting. It only becomes useful when paired with a <b>subnet mask</b>, which splits those 32 bits into two parts:</p>
<pre>  10.42.7.93 / 24
  |________||__|
   network   host

  network part = "which street"   -&gt; shared by everyone on the segment
  host part    = "which house"    -&gt; unique per machine</pre>
<p>The <code>/24</code> is <b>CIDR notation</b>: the number of leading 1-bits in the mask. <code>/24</code> = <code>255.255.255.0</code> = the first 24 bits (three bytes) are network, the last 8 are host.</p>
<table>
<tr><th>CIDR</th><th>Mask</th><th>Host bits</th><th>Usable hosts</th></tr>
<tr><td><code>/24</code></td><td>255.255.255.0</td><td>8</td><td>254</td></tr>
<tr><td><code>/25</code></td><td>255.255.255.128</td><td>7</td><td>126</td></tr>
<tr><td><code>/26</code></td><td>255.255.255.192</td><td>6</td><td>62</td></tr>
<tr><td><code>/27</code></td><td>255.255.255.224</td><td>5</td><td>30</td></tr>
<tr><td><code>/28</code></td><td>255.255.255.240</td><td>4</td><td>14</td></tr>
<tr><td><code>/30</code></td><td>255.255.255.252</td><td>2</td><td>2</td></tr>
</table>
<p>Usable = 2^(host bits) − 2. You lose two: the all-zeros host address (the <b>network address</b>, names the segment itself) and the all-ones host address (the <b>broadcast address</b>, means "everyone here").</p>`,
  pitfalls:[
    "The mask lives on <em>each host</em>, not on the wire. Two machines plugged into the same switch can have mismatched masks and disagree about whether they are neighbours — one pings fine, the other does not. That asymmetry is the classic fingerprint of a mask typo.",
    "<code>/32</code> means a single address with no room for neighbours. On a normal server NIC that is a mistake."
  ],
  items:[
    {type:"mcq", q:"What does the <code>/26</code> in <code>10.42.7.93/26</code> actually specify?",
     choices:["The 26th host on the network","That 26 bits are the network part, leaving 6 host bits","A maximum of 26 hosts","The VLAN ID"],
     correct:1, explain:"CIDR = count of leading 1-bits in the mask. 32 − 26 = 6 host bits → 2^6 − 2 = 62 usable addresses."},
    {type:"input", q:"How many <b>usable host</b> addresses does a <code>/27</code> provide? (number only)",
     accept:["30"], explain:"32 − 27 = 5 host bits. 2^5 = 32 total, minus network and broadcast = 30."},
    {type:"mcq", q:"Two servers on the same switch: A is <code>192.168.5.10/24</code>, B is <code>192.168.5.200/25</code>. What happens?",
     choices:["Both ping each other fine","Neither can ping the other","A thinks B is local; B thinks A is remote and sends via its gateway","They get an IP conflict"],
     correct:2, explain:"A's /24 covers .0–.255, so B looks local to A. B's /25 covers .128–.255, so A (.10) looks remote to B — B hands the packet to its gateway. Traffic works one way at best. This asymmetry is the signature of a mask mismatch."}
  ]},

{ id:"t1-same-subnet", title:"\"They must be in the same subnet to communicate\"", prereqs:["t1-ip"],
  why:"You have heard this sentence at work. It is true, but the real rule is more precise — and the precise version is what lets you fix things instead of guessing.",
  body:`
<p>The accurate rule: <b>a host decides, for every single packet it sends, whether the destination is local or remote.</b> It does this with one calculation:</p>
<pre>  my_ip AND my_mask  ==  dest_ip AND my_mask  ?
     |                        |
   same network number  -&gt; LOCAL:  deliver directly, find MAC via ARP
   different            -&gt; REMOTE: hand the packet to my default gateway</pre>
<p>Worked example — can <code>10.42.7.93/26</code> reach <code>10.42.7.130</code> directly?</p>
<pre>  /26 → mask 255.255.255.192 → block size 64 in the last byte
  Subnets:  .0-.63  |  .64-.127  |  .128-.191  |  .192-.255
  .93  lives in  .64-.127
  .130 lives in  .128-.191
  Different blocks -&gt; NOT local -&gt; needs a router.</pre>
<p>So "same subnet" really means: <b>same network number, when masked with your own mask.</b> If they are in the same subnet, a plain Layer-2 switch is enough. If not, you need a router with a leg in both subnets — and something must actually be configured to route.</p>
<h3>The fast mental method</h3>
<p>For any mask, <b>block size = 256 − last octet of the mask</b>. Subnets start at multiples of the block size. <code>/26</code> → 256−192 = 64 → boundaries at 0, 64, 128, 192.</p>`,
  pitfalls:[
    "Same physical switch ≠ same subnet. Cabling has nothing to do with it; the mask decides.",
    "Same subnet, no routing needed, and <em>still</em> no connectivity ⇒ look at Layer 2 (VLAN, port down) or a host firewall, not at routing.",
    "A host with a correct IP and mask but <b>no default gateway</b> talks to its own subnet perfectly and fails at everything else with <code>Network is unreachable</code>."
  ],
  items:[
    {type:"mcq", q:"Host <code>10.42.7.93/26</code> pings <code>10.42.7.130</code>. What does it do first?",
     choices:["ARP for 10.42.7.130 on the local wire","Send the packet to its default gateway","Broadcast to 10.42.7.255","Drop it as an invalid address"],
     correct:1, explain:"/26 puts .93 in the .64–.127 block and .130 in .128–.191. Different subnet → remote → gateway. With no gateway set you get 'Network is unreachable'."},
    {type:"input", q:"For a <code>/28</code> mask, what is the block size in the last octet? (number only)",
     accept:["16"], explain:"/28 → 255.255.255.240 → 256 − 240 = 16. Subnets start at .0, .16, .32, .48, …"},
    {type:"mcq", q:"A server has a valid IP and mask but no default gateway. Local pings work; everything else fails <em>instantly</em>. Why instantly rather than timing out?",
     choices:["The switch is dropping the frames","The kernel has no matching route, so it fails before any packet leaves the host","DNS is broken","The cable is unplugged"],
     correct:1, explain:"No matching route → the kernel refuses locally and returns 'Network is unreachable' immediately. A timeout instead means the packet DID leave and nothing answered — a completely different fault."}
  ]},

{ id:"t1-arp", title:"ARP: how local delivery actually happens", prereqs:["t1-same-subnet"],
  why:"Switches do not know about IP addresses at all. Understanding the IP→MAC step is what makes IGMP snooping (T3) obvious later — snooping is the same trick applied to multicast.",
  body:`
<p>Once a host decides a destination is <b>local</b>, it still cannot send. Ethernet frames are addressed by <b>MAC address</b> (48-bit, on the NIC), not by IP. So the host asks:</p>
<pre>  Host A (10.42.7.10) wants 10.42.7.25

  1. A broadcasts:  "Who has 10.42.7.25? Tell 10.42.7.10"
                    dest MAC = ff:ff:ff:ff:ff:ff   (everyone)
  2. Switch floods that frame out every port in the broadcast domain
  3. Only B answers, unicast: "10.42.7.25 is at 00:1b:21:aa:bb:cc"
  4. A caches it in the ARP table and sends the real packet</pre>
<p>Check the cache with <code>ip neigh</code> (modern) or <code>arp -n</code> (older):</p>
<pre>$ ip neigh
10.42.7.25   dev eth0 lladdr 00:1b:21:aa:bb:cc REACHABLE
10.42.7.1    dev eth0 lladdr 00:1b:21:00:00:01 STALE
10.42.7.44   dev eth0  INCOMPLETE</pre>
<p><code>INCOMPLETE</code> is a diagnosis by itself: <b>we asked and nobody answered.</b> The host is off, on another VLAN, or the address does not exist. That is a Layer-2 problem, not a routing one.</p>
<p>For a <b>remote</b> destination, A ARPs for the <em>gateway's</em> IP. The frame carries the gateway's MAC but the destination's IP — that split is the whole L2/L3 boundary.</p>`,
  pitfalls:[
    "Your gateway showing INCOMPLETE means you cannot reach your own router — stop looking at DNS and firewalls.",
    "Two hosts with the <b>same IP</b> produce a flapping ARP entry (the MAC keeps changing). That is the duplicate-address fingerprint."
  ],
  items:[
    {type:"mcq", q:"Host A sends to a <b>remote</b> IP. Whose MAC goes in the Ethernet frame?",
     choices:["The remote host's MAC","The default gateway's MAC","ff:ff:ff:ff:ff:ff","No MAC is used for routed traffic"],
     correct:1, explain:"Destination IP stays the remote host; destination MAC is the next hop. Each router rewrites the MACs hop by hop while the IPs stay unchanged."},
    {type:"mcq", q:"<code>ip neigh</code> shows your default gateway as <code>INCOMPLETE</code>. Best next step?",
     choices:["Restart DNS","Check VLAN / port state and whether the gateway IP is correct — this is L2 reachability","Add a static route","Increase the MTU"],
     correct:1, explain:"INCOMPLETE means the ARP broadcast got no reply. Either nothing in this broadcast domain owns that IP, or your port is in the wrong VLAN."},
    {type:"input", q:"What destination MAC does an ARP request use?",
     accept:["ff:ff:ff:ff:ff:ff","ffffffffffff","ff-ff-ff-ff-ff-ff","broadcast"], explain:"ARP requests are broadcast to ff:ff:ff:ff:ff:ff so every host in the broadcast domain sees them."}
  ]},

{ id:"t1-hosts", title:"/etc/hosts, and why your site uses it", prereqs:["t1-ip"],
  why:"You said: 'we have a host file for IPs and so many IP addresses and everything is configured.' That is deliberate in isolated networks — no DNS server to run, audit or get wrong. It also has a specific failure mode worth knowing cold.",
  body:`
<p>Before any connection, a name must become an IP. On Linux the order is set by <code>/etc/nsswitch.conf</code>:</p>
<pre>hosts:  files dns</pre>
<p><code>files</code> = <code>/etc/hosts</code>, checked <b>first</b>. Only on a miss does it ask DNS. In an air-gapped or accredited network there is often no DNS at all, so <code>/etc/hosts</code> is the entire name system:</p>
<pre>$ cat /etc/hosts
127.0.0.1       localhost
10.42.7.10      app01   app01.site.local
10.42.7.11      app02   app02.site.local
10.42.7.20      nas01
10.42.7.1       gw01</pre>
<p>Verify what the resolver will actually do — do not trust reading the file by eye:</p>
<pre>$ getent hosts nas01
10.42.7.20      nas01</pre>
<p><code>getent</code> follows the real nsswitch path, so it catches a duplicate, a typo, or a line shadowed by an earlier one.</p>`,
  pitfalls:[
    "<b>Duplicate names:</b> if a name appears twice, the <em>first</em> line wins. Someone appends a corrected entry at the bottom, nothing changes, and hours disappear. <code>getent hosts NAME</code> shows the truth.",
    "<b>Drift:</b> every host holds its own copy. A change applied to 9 of 10 machines leaves one box stale — usually the one that breaks at 3 a.m. Compare with <code>md5sum /etc/hosts</code> across the fleet.",
    "A name resolving says nothing about reachability. <code>getent</code> works but <code>ping</code> fails ⇒ the problem is the network, not the name."
  ],
  items:[
    {type:"mcq", q:"<code>/etc/hosts</code> lists <code>nas01</code> twice with different IPs. Which is used?",
     choices:["The last one","The first matching line","Both, round-robin","Neither — it is an error"],
     correct:1, explain:"The resolver returns the first match and stops. Appending a 'fix' at the bottom changes nothing — which is why such edits sometimes appear to have no effect."},
    {type:"input", q:"Which command checks name resolution through the real nsswitch path? (two words)",
     accept:["getent hosts","getent"], explain:"getent hosts NAME uses the same resolution path applications do, so it reflects reality including duplicates and nsswitch order."},
    {type:"mcq", q:"<code>getent hosts nas01</code> returns the right IP, but <code>ping nas01</code> times out. What have you ruled out?",
     choices:["Nothing","Name resolution — the fault is in the network path (subnet, VLAN, host down, firewall)","The NAS being powered off","The subnet mask"],
     correct:1, explain:"Correct resolution isolates the fault to Layers 1–3. Note the failure mode: a timeout means the packet left and nothing answered, unlike 'Network is unreachable', which never leaves the host."}
  ]}
]});
