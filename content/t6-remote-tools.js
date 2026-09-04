window.LN = window.LN || { tracks: [] };
LN.tracks.push({
id: "t6", title: "T6 · Remote Access: MobaXterm, WinSCP, FreeRDP",
blurb: "The three tools that get you from your seat onto the Linux box and the Windows displays across the room.",
cards: [

{ id:"t6-mobaxterm", title:"MobaXterm: SSH, sessions, and the embedded X server", prereqs:[],
  why:"MobaXterm is usually the first hop onto your Linux box — SSH client, SFTP file browser, and an X server all in one window, which matters the moment you need to run something graphical remotely.",
  body:`
<p>Core layout: a session list on the left, tabs for multiple open sessions, and — for SSH sessions specifically — an <b>SFTP file browser docked on the left side automatically</b>, showing the remote home directory alongside your terminal. Drag files between it and your local Explorer without a separate tool.</p>
<pre>Session -&gt; New Session -&gt; SSH
  Remote host:  10.42.7.10
  Username:     svc
  Port:         22 (default)
  Advanced SSH settings -&gt; X11-Forwarding   (checkbox — see below)</pre>
<p><b>X11 forwarding</b> is the standout feature: MobaXterm bundles its own X server, so a graphical Linux app launched over your SSH session displays its window directly on your Windows desktop, no separate X server install needed. Enable the checkbox above, then on the remote side just run the GUI app — <code>xclock</code> is the classic sanity test.</p>
<pre># on the remote Linux box, inside a MobaXterm SSH session with X11 fwd enabled
$ echo $DISPLAY
localhost:10.0            &lt;- non-empty means X forwarding is active for this session
$ xclock                   &lt;- a clock window should appear on YOUR Windows screen</pre>
<p>Local terminal, no SSH: MobaXterm also ships a Unix-like local shell (based on Cygwin) usable without connecting anywhere — useful for running familiar commands (<code>ls</code>, <code>grep</code>, <code>ssh</code> itself) directly on the Windows machine.</p>
<p><b>Tunneling</b> (Tools → MobaSSHTunnel, or the tunnel icon): forwards a local port through the SSH connection to a service only reachable from the far side — e.g. a web UI bound to localhost on the Linux box, tunnelled to <code>localhost:8080</code> on your Windows machine so you can open it in a normal browser.</p>`,
  pitfalls:[
    "$DISPLAY being empty on the remote side means X11 forwarding is NOT active for that session — check the Advanced SSH settings checkbox was enabled BEFORE connecting; it can't be toggled on retroactively without reconnecting.",
    "A graphical app launched over a slow or high-latency link via X11 forwarding can be very sluggish — it's genuinely shipping draw commands over the network, not just a screenshot. For a heavy GUI, prefer FreeRDP/RDP instead.",
    "MobaXterm's SFTP panel and your terminal session share the same connection but are logically separate views — a file you just edited in the terminal via vim may not visibly refresh in the SFTP panel until you click refresh."
  ],
  items:[
    {type:"mcq", q:"What does enabling X11-Forwarding in a MobaXterm SSH session actually let you do?",
     choices:["Transfer files faster","Run a graphical Linux application and have its window appear on your Windows desktop","Encrypt the session (already encrypted by SSH)","Enable copy-paste"],
     correct:1, explain:"MobaXterm bundles an X server; with forwarding enabled, a GUI app run remotely displays its window locally via that embedded X server — no separate X server install needed."},
    {type:"input", q:"Environment variable to check, on the remote Linux side, to confirm X11 forwarding is active for your session? (one word)",
     accept:["$DISPLAY","DISPLAY"], explain:"A non-empty $DISPLAY (e.g. localhost:10.0) means the forwarding is set up; empty means it isn't, regardless of what the checkbox showed."},
    {type:"mcq", q:"A web dashboard on the remote Linux box only listens on localhost:8080 there — not reachable directly from your machine. Which MobaXterm feature solves this without changing the remote service's bind address?",
     choices:["SFTP browser","X11 forwarding","SSH tunneling (port forwarding)","Local shell"],
     correct:2, explain:"Tunneling forwards a local port through the existing SSH connection to a port on the remote side (or reachable from it) — the standard way to reach a localhost-bound service without exposing it more broadly."}
  ]},

{ id:"t6-winscp", title:"WinSCP: moving files between Windows and Linux", prereqs:[],
  why:"MobaXterm's SFTP panel covers quick drags; WinSCP is the dedicated tool when you need real sync, scripted transfers, or editing a remote file directly in a local editor.",
  body:`
<pre>Session -&gt; New Session
  File protocol:  SFTP (default, runs over SSH — same port 22, same credentials as ssh)
  Host name:      10.42.7.10
  User name:      svc
  (Port 22, password or key-based auth — same key you'd use for ssh/MobaXterm)</pre>
<p>Default view: <b>Commander</b> — two panes, local on one side (usually left) and remote on the other, drag-and-drop between them like a dual-pane file manager. Alt view: <b>Explorer</b> — single pane, more like standard Windows Explorer, toggled in Options.</p>
<p><b>Keep remote directory up to date / Synchronize</b> (toolbar or right-click on a folder): compares local and remote trees and transfers only the differences — the right tool for "push these config changes to five identical boxes" instead of re-uploading everything by hand each time.</p>
<p><b>Edit a remote file directly</b>: double-click a remote text file (or right-click → Edit) and WinSCP opens it in your configured local editor; saving uploads the change back automatically. Faster than downloading, editing, and re-uploading manually for a quick config tweak.</p>
<p><b>Scripting</b> — WinSCP has a full scripting mode for repeatable, unattended transfers:</p>
<pre>winscp.com /command ^
  "open sftp://svc@10.42.7.10/ -privatekey=C:\\keys\\id_rsa" ^
  "get /var/log/app.log C:\\pulls\\" ^
  "exit"</pre>
<p>Useful for a scheduled task that pulls fresh logs off the Linux box automatically — pairs directly with Task Scheduler (T5 · Services, Task Scheduler, and Device Manager).</p>`,
  pitfalls:[
    "SFTP and FTP are not the same protocol despite the similar name — SFTP runs over SSH (port 22, same auth as ssh); plain FTP is unencrypted and a different port entirely. Don't mix up which one a given service actually offers.",
    "Synchronize can delete files on the target side to match the source if you enable that option — read the direction (which side is source, which is target) carefully before confirming, especially the first time you run it against a box with data you care about.",
    "WinSCP's 'Edit' feature uploads on save silently — if you're editing a live config file for a running service, that save may take effect immediately depending on the service, not just when you 'deploy' something."
  ],
  items:[
    {type:"mcq", q:"What protocol does WinSCP's default SFTP mode actually run over?",
     choices:["Plain unencrypted FTP","SSH (same port and auth as an ssh/MobaXterm connection)","HTTPS","SMB"],
     correct:1, explain:"SFTP is SSH's file transfer subsystem — same port 22, same key/password auth as a normal SSH session, fully encrypted. It is unrelated to FTP despite the similar name."},
    {type:"mcq", q:"You need to push the same three config files to five identical Linux boxes, and later re-push only what's changed. Best WinSCP feature for this?",
     choices:["Manually drag-and-drop each time","Synchronize / Keep remote directory up to date","Edit in local editor","Change file protocol to FTP"],
     correct:1, explain:"Synchronize compares local and remote trees and transfers only differences — built for exactly this repeated-push, changed-files-only workflow."},
    {type:"input", q:"WinSCP's command-line executable for scripted, unattended transfers (used with /command)? (one word, .com)",
     accept:["winscp.com","winscp"], explain:"winscp.com /command \"...\" runs a scripted session non-interactively — the basis for scheduled log pulls or automated deployments."}
  ]},

{ id:"t6-freerdp", title:"FreeRDP: RDP into the Windows display PCs", prereqs:[],
  why:"When you need the actual Windows desktop of one of the display PCs — not just a file or a shell — FreeRDP (or Windows' own Remote Desktop client) is how you get there, including from a Linux box.",
  body:`
<p>The command-line client is <code>xfreerdp</code> (package <code>freerdp2-x11</code> or similar depending on distro):</p>
<pre>xfreerdp /v:10.42.7.30 /u:svc /p:'yourpassword'
xfreerdp /v:10.42.7.30 /u:svc                       # omit /p, prompted interactively — avoids password in shell history
xfreerdp /v:10.42.7.30 /u:DOMAIN\\svc /p:'pw'         # domain-joined target
xfreerdp /v:10.42.7.30 /u:svc /p:'pw' /w:1920 /h:1080   # explicit resolution
xfreerdp /v:10.42.7.30 /u:svc /p:'pw' /f                # fullscreen
xfreerdp /v:10.42.7.30 /u:svc /p:'pw' /cert:ignore       # skip cert validation prompt (self-signed target — see pitfall)
xfreerdp /v:10.42.7.30 /u:svc /p:'pw' +clipboard          # share clipboard between local and remote
xfreerdp /v:10.42.7.30 /u:svc /p:'pw' /drive:share,/home/you/shared   # mount a local folder as a remote drive</pre>
<p>On the Windows side, RDP must actually be enabled first: <b>Settings → System → Remote Desktop</b> (or <code>sysdm.cpl</code> → Remote tab) — off by default on most editions. The account connecting needs to either be an administrator or be explicitly added under "Select users that can remotely access this PC."</p>
<p>From Windows to Windows, the built-in client is <code>mstsc</code> (Win+R → mstsc) — same protocol, GUI instead of command line, no separate install needed.</p>
<p>Firewall: RDP uses <b>TCP 3389</b> by default. If the connection hangs rather than being actively refused, that's the first thing to check — <code>Test-NetConnection targetip -Port 3389</code> from another Windows box, or a quick <code>nc -zv 10.42.7.30 3389</code> from Linux.</p>`,
  pitfalls:[
    "Remote Desktop is disabled by default on most Windows editions and must be turned on locally first — you cannot enable it remotely if it isn't already on (chicken-and-egg for a box you can't physically reach).",
    "Putting the password directly on the command line with /p leaves it in your shell history and visible to anyone who can read your process list at that moment — omit /p to be prompted interactively when that matters.",
    "/cert:ignore silences a legitimate warning as much as a self-signed-and-known one — fine for a known internal display PC with a self-signed cert, risky as a habit against anything you haven't verified is actually the intended target.",
    "Some Windows editions (Home) don't support being an RDP SERVER at all, only a client — if RDP settings are missing entirely rather than just toggled off, that's the edition, not a misconfiguration."
  ],
  items:[
    {type:"mcq", q:"Default TCP port used by RDP?",
     choices:["22","443","3389","3306"],
     correct:2, explain:"RDP defaults to TCP 3389. A hung (not refused) connection attempt often means this port is blocked somewhere along the path — check with Test-NetConnection or nc -zv before assuming the Windows side is misconfigured."},
    {type:"mcq", q:"Where do you enable Remote Desktop on the target Windows machine before FreeRDP/mstsc can connect to it?",
     choices:["It's on by default, nothing to do","Settings → System → Remote Desktop (or sysdm.cpl, Remote tab)","Device Manager","Task Scheduler"],
     correct:1, explain:"RDP is off by default on most editions — must be enabled locally on the target first, and the connecting account added to the allowed-users list if it isn't already an administrator."},
    {type:"input", q:"xfreerdp flag to skip typing the password on the command line and be prompted instead — you simply omit which flag?",
     accept:["/p","-p"], explain:"Omitting /p (rather than passing it) makes xfreerdp prompt interactively, keeping the password out of your shell history and process list."}
  ]},

{ id:"t6-workflow", title:"Putting it together: a real triage workflow across your five PCs", prereqs:["t6-mobaxterm","t6-winscp","t6-freerdp"],
  why:"Your environment — one Linux box, four Windows display PCs, custom hardware — has a natural order of operations when something goes wrong. Knowing the sequence saves you from bouncing between tools randomly.",
  body:`
<p>A concrete shape for "one of the display PCs is acting up":</p>
<pre>1. From your seat, MobaXterm SSH into the Linux box first
   -&gt; it's usually the control/monitoring point, and often reachable even
      when a display PC itself is struggling

2. From the Linux box (or directly from Windows), FreeRDP/mstsc into the
   affected display PC's desktop
   -&gt; see what's actually on screen: a hung app, a BSOD, a login screen
      that shouldn't be there

3. If the desktop is unresponsive but the machine still answers RDP,
   pull evidence WITHOUT trying to fix anything live first:
     - Event Viewer (T5) for Event ID 41 / 1001 / recent Errors
     - Task Manager -&gt; Resource Monitor if it's sluggish but not fully hung
     - note the exact time — you'll need it to correlate logs later

4. Use WinSCP (or the RDP session's own file transfer / clipboard) to
   pull the relevant evidence off the Windows box:
     - exported Event Viewer logs (.evtx)
     - C:\\Windows\\Minidump\\*.dmp if it BSOD'd
     - the specific app's own log directory

5. Correlate timestamps against the Linux side's logs (journalctl --since,
   T4) if the display PC talks to a service running there — a display
   crash and a service restart at the same second is not a coincidence</pre>
<p>The general principle underneath all five steps: <b>look before you touch.</b> Restarting a hung app or rebooting a frozen box is sometimes necessary, but it destroys the exact evidence (process state, open handles, on-screen error) that would have told you why it happened — collect what you can first, then intervene.</p>`,
  pitfalls:[
    "Rebooting a Windows box the moment you see it's unresponsive throws away Task Manager/Resource Monitor's live view and anything not yet flushed to a log file — if it's not actively causing harm to leave it a few minutes, grab what evidence you can first.",
    "Jumping straight to RDP without first confirming the Linux control box is healthy can waste time chasing a display-PC symptom that's actually caused by something upstream (e.g. the service the display PC depends on, running on the Linux box).",
    "Pulled evidence (dumps, exported .evtx) with no noted timestamp is much less useful once you have logs from multiple machines to correlate — always note wall-clock time, not just 'it happened this afternoon'."
  ],
  items:[
    {type:"mcq", q:"A display PC is fully hung — screen frozen, RDP still connects but nothing responds. What's the recommended first move?",
     choices:["Immediately hold the power button","Immediately restart the RDP session repeatedly","Grab whatever evidence is available (note the time, check what's visible) before intervening, since a reboot destroys live state","Reinstall Windows"],
     correct:2, explain:"A hard reboot destroys exactly the live evidence (process state, on-screen error, open handles) that explains WHY it hung. If it's not actively causing harm, a brief evidence-gathering pass first pays off — then intervene."},
    {type:"mcq", q:"Why check the Linux control box's health before diving into a display PC's specific symptom?",
     choices:["It's always faster to start there out of habit","The display PC may depend on a service running on the Linux box, so an upstream problem can masquerade as a display-PC-specific issue","Windows machines can't be diagnosed directly","There's no reason, order doesn't matter"],
     correct:1, explain:"If the display PC's misbehaviour traces back to a dependency on the Linux side, troubleshooting purely on the Windows box chases a symptom instead of the cause."},
    {type:"input", q:"What's the one habit, applied across every step of this workflow, that preserves your ability to find root cause instead of just clearing the symptom?", accept:["look before you touch","note the timestamp","record before intervening","gather evidence first"], explain:"Look before you touch, and note exact timestamps — both preserve the evidence a reboot or restart would otherwise erase, and let you correlate across machines afterward."}
  ]}

]});
