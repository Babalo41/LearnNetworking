window.LN = window.LN || { tracks: [] };
LN.scenarios = [

{ id:"sc-querier", title:"The stream that dies after five minutes", diff:"core",
  brief:"Operators report that the distribution app works right after a restart, then stops delivering to all receivers about five minutes later. Restarting the app fixes it — for another five minutes. A switch change was made yesterday. Single flat VLAN, no router on it.",
  steps:[
    { q:"Where do you start?",
      options:[
        {t:"Restart the application again to confirm the pattern", ok:false, fb:"You already know the pattern from the report. Repeating it costs five minutes and tells you nothing new."},
        {t:"Check on a receiver whether the app is still joined to the group", ok:true, fb:"Correct — start at the receiver. ip maddr show / cat /proc/net/igmp is free and immediately separates 'app stopped asking' from 'network stopped delivering'."},
        {t:"Open a ticket with the switch vendor", ok:false, fb:"Far too early. You have not established which layer is failing."},
        {t:"Increase the multicast TTL", ok:false, fb:"TTL affects crossing routers. This is a single flat VLAN, and it works initially — TTL is not time-dependent."}
      ]},
    { q:"<code>/proc/net/igmp</code> still shows the group joined on the receiver, but no data arrives. What does that establish?",
      options:[
        {t:"The application is broken", ok:false, fb:"The opposite — the app is still holding its membership. The failure is below it."},
        {t:"The host still wants the traffic, so the network stopped delivering it — the fault is in the path, not the app", ok:true, fb:"Exactly. A live membership with no data means something between source and receiver stopped forwarding."},
        {t:"The source has stopped transmitting", ok:false, fb:"Possible, but not yet established — you have not looked at the source or the wire."},
        {t:"There is an IP conflict", ok:false, fb:"A conflict would not follow a clean five-minute timer."}
      ]},
    { q:"You run <code>tcpdump -i eth0 igmp</code> on the receiver and leave it for four minutes. You see the host's own report at the start, then nothing at all. Significance?",
      options:[
        {t:"Normal — IGMP is quiet by design", ok:false, fb:"Not normal. A healthy segment shows a General Query roughly every 125 s. Silence is the finding."},
        {t:"No queries are arriving, so nothing refreshes membership — there is no active querier on this VLAN", ok:true, fb:"That is the diagnosis. Membership is soft state; with no querier the switch's snooping table expires after ~260 s and it prunes every port. Five minutes matches perfectly."},
        {t:"tcpdump cannot capture IGMP", ok:false, fb:"It captures IGMP fine — you saw the host's own report."},
        {t:"The NIC is dropping packets", ok:false, fb:"It captured the outbound report, so the interface works."}
      ]},
    { q:"Yesterday's change enabled IGMP snooping on the VLAN. What is the fix?",
      options:[
        {t:"Disable IGMP snooping and go back to flooding", ok:false, fb:"That restores service but throws away the CPU saving you wanted, and leaves every host processing traffic it never asked for. It is a rollback, not a fix."},
        {t:"Enable the switch's IGMP querier on that VLAN, then verify queries appear in a capture", ok:true, fb:"Correct. Snooping and querier are a pair. With no router on this VLAN, the switch must supply the querier — configured on the specific VLAN, not just globally."},
        {t:"Have the application re-join every 60 seconds", ok:false, fb:"Working around a network fault in application code. It also does not help the switch, which prunes based on its own timers."},
        {t:"Set fast-leave on all ports", ok:false, fb:"Fast-leave makes pruning more aggressive — the exact opposite of what is needed, and unsafe on multi-host ports."}
      ]}
  ],
  debrief:"<b>The rule:</b> IGMP snooping and an IGMP querier are a single unit — never configure one without the other. Snooping alone converts a working (wasteful) flooded network into a broken one on a ~260 s delay. Because the break is delayed, it is rarely connected to the change that caused it.<br><br><b>The tell:</b> 'works for a few minutes after restart, then dies' is, in practice, always this."},

{ id:"sc-ipxe", title:"iPXE boot damaged the NAS", diff:"core",
  brief:"A storage server was power-cycled during maintenance. It did not come back with its normal OS. The NAS volume is now inconsistent and the array reports a problem. Nobody deliberately reinstalled anything. A provisioning server for imaging new machines was set up on this segment last week.",
  steps:[
    { q:"The machine did not boot its installed OS. What is the most likely mechanism?",
      options:[
        {t:"The disk failed at exactly the moment of the power cycle", ok:false, fb:"Possible but it does not explain a successful boot into something else. Prefer the explanation that covers all the facts."},
        {t:"BIOS/UEFI boot order fell through to network boot, and the segment's provisioning server answered", ok:true, fb:"Correct. Boot order is a list: if the first entry fails or a disk is slow to be detected, firmware moves to the next entry — often PXE. Any DHCP server offering boot options can then hand it an image."},
        {t:"The kernel panicked", ok:false, fb:"A panic leaves the machine stopped, not running a different environment and touching storage."},
        {t:"Someone logged in and reinstalled it", ok:false, fb:"Nothing suggests that, and the timing with the new provisioning server is too strong to ignore."}
      ]},
    { q:"How does a network boot actually get pointed at an image?",
      options:[
        {t:"The switch pushes it over IGMP", ok:false, fb:"IGMP is multicast group signalling; it has nothing to do with boot."},
        {t:"DHCP hands out an IP plus boot options (next-server / filename, options 66 and 67), and the client fetches the image over TFTP or HTTP", ok:true, fb:"Right. This is why an unintended DHCP/PXE server is dangerous: any machine that falls through to network boot will take whatever it is offered, with no authentication at all."},
        {t:"The BIOS contains the image", ok:false, fb:"Firmware only contains the client that fetches an image over the network."},
        {t:"It uses ARP to find an image server", ok:false, fb:"ARP resolves IP to MAC; it carries no boot information."}
      ]},
    { q:"Why would that damage the NAS volume rather than just boot the wrong thing?",
      options:[
        {t:"Network boot always wipes disks", ok:false, fb:"It does not. What runs afterwards decides that."},
        {t:"The delivered image was an installer or imaging environment, which partitions and writes to local disks — including the array members", ok:true, fb:"Exactly. An unattended installer's whole job is to claim disks and write to them. It cannot tell 'a blank new machine' from 'a production storage array'."},
        {t:"TFTP corrupts filesystems", ok:false, fb:"TFTP just transfers a file over the network."},
        {t:"The RAID controller cannot handle a reboot", ok:false, fb:"Controllers handle reboots routinely. Something wrote to the disks."}
      ]},
    { q:"Immediate containment, before you touch the NAS?",
      options:[
        {t:"Reboot the NAS again and hope", ok:false, fb:"Dangerous. If boot order still falls through to the network, you repeat the damage."},
        {t:"Stop the rogue/unscoped boot service or restrict it, and fix boot order on the affected machines so local disk comes first with network boot disabled", ok:true, fb:"Correct order: remove the hazard first, then repair. Rebooting before this risks a second pass of the installer."},
        {t:"Start rebuilding the array immediately", ok:false, fb:"Repairing while the cause is still live invites the same damage again. Contain first."},
        {t:"Enable IGMP snooping", ok:false, fb:"Unrelated to boot."}
      ]},
    { q:"What is the durable preventive control?",
      options:[
        {t:"Tell everyone to be careful", ok:false, fb:"Not a control. It fails on the first busy day."},
        {t:"Disable network boot in firmware on production machines, set a firmware password, and scope the provisioning server to specific MACs or an isolated VLAN", ok:true, fb:"Defence in depth: the client cannot be tempted, the firmware cannot be casually changed, and the server cannot answer machines it was not meant to serve."},
        {t:"Put the NAS on a different subnet", ok:false, fb:"Helps a little — DHCP is broadcast and does not cross subnets by default — but relay agents exist and it leaves boot order still unsafe."},
        {t:"Take more backups", ok:false, fb:"Backups limit the damage; they do not prevent it. Do both, but this is not the control."}
      ]}
  ],
  debrief:"<b>The chain:</b> boot order falls through → firmware network-boot client sends DHCP → a provisioning server answers with next-server/filename → an imaging environment loads → it writes to local disks → array damaged.<br><br><b>The control points, in order of value:</b> (1) network boot disabled in firmware on production hosts; (2) provisioning server scoped to known MACs or an isolated VLAN; (3) firmware password so boot order cannot drift.<br><br>Nothing here authenticates anything — a PXE client trusts whatever answers first. That is the whole risk in one sentence."},

{ id:"sc-cpu", title:"The application is using too much CPU", diff:"core",
  brief:"Monitoring reports sustained high CPU on several hosts running the distribution app. The team's assumption is that the application has a performance bug. All affected hosts are on the same VLAN. Hosts on other VLANs running the same version are fine.",
  steps:[
    { q:"First observation that shapes the whole investigation:",
      options:[
        {t:"The app must have a memory leak", ok:false, fb:"A leak shows as growing memory, not CPU, and it would not respect VLAN boundaries."},
        {t:"Only hosts on one VLAN are affected, though the software is identical elsewhere — that points at the segment, not the software", ok:true, fb:"Exactly the right inference. When a fault follows the network segment rather than the software version, the cause is environmental."},
        {t:"They need bigger machines", ok:false, fb:"Capacity is the answer once you know the work is legitimate. You do not know that yet."},
        {t:"It is a kernel bug", ok:false, fb:"Nothing yet suggests it, and it would not be VLAN-scoped."}
      ]},
    { q:"You run <code>top</code>. Which line matters most here, and why?",
      options:[
        {t:"The process list sorted by %CPU", ok:false, fb:"Useful, but it will just show your app and confirm the existing assumption. The summary line is more discriminating."},
        {t:"The <code>%Cpu(s)</code> summary — specifically the <code>si</code> (softirq) figure, which is kernel packet-processing time", ok:true, fb:"Right. Suppose it reads '8.1 us, 4.2 sy, 26.7 si'. Only 8% is your application in userspace; 27% is the kernel handling packets. That single number redirects the whole investigation."},
        {t:"Load average", ok:false, fb:"Tells you there is pressure, not where it comes from."},
        {t:"Memory usage", ok:false, fb:"Not the reported symptom."}
      ]},
    { q:"High softirq. Next command to identify the traffic?",
      options:[
        {t:"<code>ps aux | grep app</code>", ok:false, fb:"Confirms the process exists and its CPU share. It cannot tell you what is on the wire."},
        {t:"<code>tcpdump -i eth0 -n multicast</code> to see what multicast the host is actually receiving", ok:true, fb:"Correct. Suppose it shows several groups arriving at high rate, but /proc/net/igmp shows the host joined only one. The host is being sent traffic it never asked for."},
        {t:"<code>systemctl restart app</code>", ok:false, fb:"Destroys the evidence and, at best, buys minutes."},
        {t:"<code>df -h</code>", ok:false, fb:"Disk space is not implicated."}
      ]},
    { q:"The host is receiving four groups but joined only one. What is happening?",
      options:[
        {t:"The application is joining groups it should not", ok:false, fb:"/proc/net/igmp is the kernel's own record of what was joined — it shows one group. The app is not the source of this."},
        {t:"The switch is flooding all multicast to every port because IGMP snooping is not enabled on this VLAN", ok:true, fb:"That is it, and it explains the VLAN-scoped pattern precisely: other VLANs have snooping configured, this one does not."},
        {t:"An attacker is sending traffic", ok:false, fb:"Nothing indicates that, and ordinary misconfiguration explains every observation."},
        {t:"The NIC is faulty", ok:false, fb:"A faulty NIC would not produce a clean per-VLAN pattern."}
      ]},
    { q:"The fix, stated completely:",
      options:[
        {t:"Enable IGMP snooping on that VLAN", ok:false, fb:"Half right, and dangerous alone. Snooping without a querier will silently break the stream after about 260 s."},
        {t:"Enable IGMP snooping <b>and</b> a querier on that VLAN, then verify with a capture that queries appear and CPU drops", ok:true, fb:"Complete: the pair together, plus verification of both the mechanism (queries visible) and the outcome (softirq falls)."},
        {t:"Move the app to bigger hosts", ok:false, fb:"Buys headroom for work that should not be happening at all."},
        {t:"Ask developers to optimise the receive loop", ok:false, fb:"The application is using 8%. There is nothing to optimise here — and this is how a network fault becomes a months-long software investigation."}
      ]}
  ],
  debrief:"<b>The lesson:</b> 'high CPU from the app' is a conclusion, not an observation. The observation is a number in <code>top</code>, and <em>which column</em> it sits in changes the entire investigation.<br><br><code>us</code> high → genuinely your application. <code>sy</code> high → syscalls, often I/O patterns. <b><code>si</code> high → network receive processing</b>, usually traffic the host never asked for. <code>wa</code> high → blocked on disk.<br><br>A fault that follows the <em>network segment</em> rather than the software version is environmental until proven otherwise."},

{ id:"sc-sina", title:"Multicast will not cross the encrypted link", diff:"advanced",
  brief:"Two sites are joined by encrypting gateways. Unicast works perfectly in both directions — SSH, file copies, monitoring, all fine. The distribution app's multicast stream is received at the source site but never at the remote site. Both sites have IGMP snooping and a querier configured and verified.",
  steps:[
    { q:"What does 'unicast works, multicast does not' immediately tell you?",
      options:[
        {t:"The remote switch is misconfigured", ok:false, fb:"Possible in general, but they verified snooping and querier at both sites. And it would not explain why the boundary is the only thing that differs."},
        {t:"The physical path, addressing and the tunnel itself are all healthy — so the fault is specific to multicast handling, most likely at the boundary device", ok:true, fb:"Correct reasoning. Working unicast eliminates cabling, addressing, routing and the tunnel being down. What remains is multicast-specific behaviour."},
        {t:"The application is broken", ok:false, fb:"It works at the source site, so it sends correctly."},
        {t:"DNS is failing", ok:false, fb:"Unicast by name works, so resolution is fine."}
      ]},
    { q:"You capture at the remote site and see no multicast data and no IGMP at all from the far side. Which two things could be true?",
      options:[
        {t:"The source stopped sending", ok:false, fb:"It is confirmed received at the source site."},
        {t:"The tunnel does not carry multicast, and IGMP joins from the remote side never reach the source-side querier", ok:true, fb:"Both, and they compound. Many tunnel modes are unicast point-to-point and drop multicast at entry. Separately, IGMP is link-local signalling that does not traverse the tunnel — so even a working data path would have nobody registered as interested."},
        {t:"The remote hosts have the wrong subnet mask", ok:false, fb:"Unicast between sites works, so addressing is sound."},
        {t:"TTL is 1", ok:false, fb:"A real candidate in general — but with TTL 1 you would still see the join attempts locally. Seeing no IGMP at all points at the boundary."}
      ]},
    { q:"Which check separates 'multicast is entirely blocked' from 'multicast is blocked only for large packets'?",
      options:[
        {t:"Ping the remote gateway", ok:false, fb:"Tests unicast, which you already know works."},
        {t:"Send small test multicast datagrams and see whether any size arrives — if small ones cross and large ones do not, it is MTU, not policy", ok:true, fb:"Exactly the right split. A size-dependent failure is always MTU. Encapsulation plus encryption overhead pushes a 1500-byte datagram over the limit, and with UDP there is no feedback path, so nothing is ever reported."},
        {t:"Disable IGMP snooping at both sites", ok:false, fb:"Removes a working mechanism and introduces flooding without testing the hypothesis."},
        {t:"Restart the gateways", ok:false, fb:"Untargeted, disruptive, and it would not distinguish the two cases."}
      ]},
    { q:"No size crosses. What is the correct resolution path?",
      options:[
        {t:"Rewrite the app to use unicast to every remote receiver", ok:false, fb:"A legitimate fallback that many sites end up choosing — but only after establishing that the boundary genuinely cannot carry multicast. Do not start here."},
        {t:"Confirm with the gateway's documentation and its administrator whether multicast across the tunnel is supported and how it must be configured, since in accredited environments this is a policy question as much as a technical one", ok:true, fb:"Right. On these devices the crossing of multicast is a configured, approved capability — not something you enable ad hoc. The change also has to respect the accreditation of the link."},
        {t:"Raise the MTU on all hosts to 9000", ok:false, fb:"You established the failure is not size-dependent, and unilateral MTU changes across a crypto boundary create new problems."},
        {t:"Set TTL to 255 and retry", ok:false, fb:"Worth ruling out, but you have already seen that nothing multicast crosses at all, including signalling."}
      ]},
    { q:"If multicast across the boundary is genuinely unsupported, what is the standard architectural answer?",
      options:[
        {t:"Give up on multicast entirely, everywhere", ok:false, fb:"Overcorrection. Multicast is still the right choice within each site, where most receivers are."},
        {t:"Keep multicast inside each site, and bridge between sites with a relay: one process subscribes locally, forwards over a unicast connection through the tunnel, and re-injects as multicast on the far side", ok:true, fb:"The standard pattern. One unicast flow crosses the boundary; each site keeps the efficiency of multicast internally. It also gives you one clear place to monitor and to reason about for accreditation."},
        {t:"Put both sites in one large subnet", ok:false, fb:"Stretching a broadcast domain across a crypto boundary is usually impossible and always undesirable."},
        {t:"Increase the multicast TTL and hope routing handles it", ok:false, fb:"Hope is not a design, and the boundary drops it regardless of TTL."}
      ]}
  ],
  debrief:"<b>The reasoning shape:</b> when one traffic class works and another does not over the same path, the fault is in whatever treats those classes differently — here, the boundary device.<br><br><b>Three independent things must hold for multicast to cross any boundary:</b> the data path must carry multicast; the IGMP signalling must reach the source-side querier; and the MTU must accommodate encapsulation overhead. Each fails silently and in a distinguishable way — total absence vs. size-dependent loss.<br><br><b>And a non-technical constraint:</b> on accredited encrypting gateways, what crosses the boundary is a policy decision with an approval trail, not a config flag you flip. The relay pattern is common precisely because it keeps the boundary simple and auditable."}

];
