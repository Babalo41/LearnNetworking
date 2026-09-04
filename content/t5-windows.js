window.LN = window.LN || { tracks: [] };
LN.tracks.push({
id: "t5", title: "T5 · Windows Diagnostics",
blurb: "Navigation shortcuts, the command line, and where Windows hides the evidence when something goes wrong.",
cards: [

{ id:"t5-nav", title:"Navigation shortcuts you'll use constantly", prereqs:[],
  why:"On a display PC you often only have keyboard/mouse, no admin install rights, and need to get to a diagnostic tool fast. These get you there without hunting through menus.",
  body:`
<table>
<tr><th>Shortcut</th><th>Opens</th></tr>
<tr><td><code>Win</code></td><td>Start menu / search — type an app name and hit Enter, faster than clicking</td></tr>
<tr><td><code>Win + R</code></td><td>Run dialog — type a command/path and Enter (see table below)</td></tr>
<tr><td><code>Win + E</code></td><td>File Explorer, new window</td></tr>
<tr><td><code>Win + X</code></td><td>power-user menu — Device Manager, Disk Management, Event Viewer, Terminal, all one keystroke away</td></tr>
<tr><td><code>Ctrl + Shift + Esc</code></td><td>Task Manager directly — faster than Ctrl+Alt+Del then clicking</td></tr>
<tr><td><code>Win + L</code></td><td>lock the session</td></tr>
<tr><td><code>Win + D</code></td><td>show desktop / toggle back</td></tr>
<tr><td><code>Win + Tab</code></td><td>Task View — virtual desktops, all open windows</td></tr>
<tr><td><code>Alt + Tab</code></td><td>switch between open windows</td></tr>
<tr><td><code>Win + Shift + S</code></td><td>screenshot/snip a region — essential for capturing an error dialog</td></tr>
</table>
<p><code>Win + R</code> is a keyboard shortcut to dozens of tools by name — worth memorising directly:</p>
<pre>eventvwr       Event Viewer
devmgmt.msc    Device Manager
services.msc   Services
compmgmt.msc   Computer Management (all the .msc snap-ins in one window)
diskmgmt.msc   Disk Management
taskschd.msc   Task Scheduler
perfmon        Performance Monitor
resmon         Resource Monitor
msconfig       System Configuration (startup items, boot options)
regedit        Registry Editor
cmd            Command Prompt
powershell     PowerShell
%TEMP%          jump straight to your temp folder
.               (single dot) current folder in a path field</pre>`,
  pitfalls:[
    "Most <code>.msc</code> snap-ins (Event Viewer, Services, Device Manager) require an elevated (admin) prompt to make changes, even though they open fine without one for viewing — if a control is greyed out, that's why.",
    "<code>Win + R</code> remembers your history — on a shared machine, previously-typed commands (including paths you typed) are visible in the dropdown."
  ],
  items:[
    {type:"mcq", q:"Fastest way to open Task Manager directly, skipping any intermediate screen?",
     choices:["Ctrl+Alt+Del then click Task Manager","Ctrl+Shift+Esc","Right-click desktop","Win+R, type taskmgr"],
     correct:1, explain:"Ctrl+Shift+Esc opens Task Manager immediately — no intermediate security screen, faster than Ctrl+Alt+Del."},
    {type:"input", q:"What do you type into Win+R to open Event Viewer directly? (one word)",
     accept:["eventvwr","eventvwr.msc"], explain:"eventvwr opens Event Viewer directly, skipping Control Panel navigation."},
    {type:"mcq", q:"You open services.msc but can't start/stop any service — controls are greyed out. Most likely reason?",
     choices:["Services.msc is broken","You need an elevated (Run as administrator) session","The service doesn't exist","Windows Update is running"],
     correct:1, explain:"Viewing service status needs no special rights; changing state does. Right-click and 'Run as administrator', or open an elevated terminal and launch services.msc from there."}
  ]},

{ id:"t5-cmd", title:"Command line basics: CMD and PowerShell", prereqs:["t5-nav"],
  why:"Windows has two shells in daily use. Knowing both — and that PowerShell is the modern default — saves time translating mentally between them.",
  body:`
<p>CMD (legacy, still everywhere) vs PowerShell (modern, object-based, what Windows Terminal defaults to now):</p>
<table>
<tr><th>Task</th><th>CMD</th><th>PowerShell</th></tr>
<tr><td>list files</td><td><code>dir</code></td><td><code>dir</code> or <code>Get-ChildItem</code> / <code>ls</code> (aliased)</td></tr>
<tr><td>change directory</td><td><code>cd path</code></td><td><code>cd path</code> or <code>Set-Location</code></td></tr>
<tr><td>current directory</td><td><code>cd</code></td><td><code>pwd</code> / <code>Get-Location</code></td></tr>
<tr><td>copy / move / delete</td><td><code>copy</code>/<code>move</code>/<code>del</code></td><td><code>Copy-Item</code>/<code>Move-Item</code>/<code>Remove-Item</code></td></tr>
<tr><td>show a text file</td><td><code>type file.txt</code></td><td><code>Get-Content file.txt</code> (alias <code>cat</code>)</td></tr>
<tr><td>find text in a file</td><td><code>findstr pattern file</code></td><td><code>Select-String pattern file</code></td></tr>
<tr><td>list processes</td><td><code>tasklist</code></td><td><code>Get-Process</code></td></tr>
<tr><td>kill a process</td><td><code>taskkill /PID 1234 /F</code></td><td><code>Stop-Process -Id 1234 -Force</code></td></tr>
<tr><td>environment variable</td><td><code>echo %TEMP%</code></td><td><code>$env:TEMP</code></td></tr>
<tr><td>help for a command</td><td><code>command /?</code></td><td><code>Get-Help Command -Full</code></td></tr>
</table>
<p>PowerShell's real advantage: output is <b>objects</b>, not text, so you filter and reshape it directly instead of parsing strings:</p>
<pre>Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Get-Service | Where-Object {$_.Status -eq "Stopped"}
Get-ChildItem C:\\Logs -Recurse -Filter *.log | Where-Object {$_.Length -gt 100MB}</pre>
<p>Run as administrator: right-click the shell icon → "Run as administrator", or from an existing prompt, <code>powershell Start-Process cmd -Verb RunAs</code>.</p>`,
  pitfalls:[
    "PowerShell's execution policy can block running <code>.ps1</code> scripts entirely with 'cannot be loaded because running scripts is disabled' — check with <code>Get-ExecutionPolicy</code>, and only change it (<code>Set-ExecutionPolicy RemoteSigned</code>) when you understand why it was restricted.",
    "Tab-completion in PowerShell cycles through matches on repeated Tab; in CMD it does too but is far less reliable with wildcards — don't assume CMD habits carry over exactly.",
    "<code>del</code>/<code>Remove-Item</code> in both shells skip the Recycle Bin by default — unlike deleting via File Explorer, there's no undo."
  ],
  items:[
    {type:"mcq", q:"PowerShell equivalent of CMD's tasklist?",
     choices:["Get-Content","Get-Process","Get-Service","Get-ChildItem"],
     correct:1, explain:"Get-Process lists running processes as objects, so you can pipe it into Sort-Object, Where-Object, etc. — unlike tasklist's plain text table."},
    {type:"input", q:"CMD command to search for a text pattern inside a file? (findstr, or use grep-equivalent)",
     accept:["findstr"], explain:"findstr searches file contents in CMD; PowerShell's equivalent is Select-String."},
    {type:"mcq", q:"Running a downloaded .ps1 script gives 'cannot be loaded because running scripts is disabled on this system'. What's this?",
     choices:["A virus warning","PowerShell's execution policy blocking script execution by default","A missing .NET runtime","A typo in the script"],
     correct:1, explain:"Execution policy is a safety guardrail against running arbitrary scripts. Check current policy with Get-ExecutionPolicy; only relax it deliberately, e.g. RemoteSigned."}
  ]},

{ id:"t5-tasks", title:"Task Manager and Resource Monitor", prereqs:["t5-cmd"],
  why:"This is the Windows equivalent of top/htop — your first stop for 'something is slow' or 'something is using all the CPU/memory/disk'.",
  body:`
<p>Task Manager (<code>Ctrl+Shift+Esc</code>) tabs, in the order you'll actually use them:</p>
<table>
<tr><th>Tab</th><th>Use it for</th></tr>
<tr><td>Processes</td><td>sort by CPU/Memory/Disk/Network column to find the hog, right-click → End task</td></tr>
<tr><td>Performance</td><td>live graphs — CPU, Memory, Disk, Ethernet, GPU; click a graph for more detail (e.g. per-core CPU)</td></tr>
<tr><td>Startup</td><td>what launches at login and its measured impact — a common cause of a slow boot</td></tr>
<tr><td>Details</td><td>PID, exact exe path, priority — the granular view Processes tab summarises</td></tr>
<tr><td>Services</td><td>same list as services.msc, quick status check without opening a separate snap-in</td></tr>
</table>
<p><b>Resource Monitor</b> (<code>resmon</code>, or the link at the bottom of Task Manager's Performance tab) goes one level deeper — specifically useful for disk and network attribution that Task Manager summarises too coarsely:</p>
<pre>Disk tab    -&gt; which PROCESS is doing the I/O, and to which FILE, right now
Network tab -&gt; which process owns which TCP connection, to which remote address
Memory tab  -&gt; hard faults/sec — a spike here means the system is paging (swapping) to disk, a strong "not enough RAM" signal</pre>
<p>"CPU shows low but the machine still feels frozen" almost always means look at Disk (queue length climbing) or hard faults in Resource Monitor's Memory tab, not CPU.</p>`,
  pitfalls:[
    "Ending a task via 'End task' is the equivalent of SIGKILL — no chance for the app to save state or shut down cleanly. Try closing the app normally first if it's still responsive at all.",
    "A process using near-0% CPU can still be the problem — check Disk and Network columns too, not just CPU, before concluding a process is 'idle and innocent'.",
    "Task Manager's default view can hide processes running as SYSTEM or another user unless you click 'Show processes from all users' — easy to miss the actual culprit."
  ],
  items:[
    {type:"mcq", q:"System feels frozen but Task Manager's CPU graph is low. Next place to check?",
     choices:["Restart immediately","Resource Monitor's Disk tab (queue length) or Memory tab (hard faults/paging)","Check the GPU tab only","Nothing else needed — CPU low means healthy"],
     correct:1, explain:"A 'frozen but CPU-idle' machine is classically a disk-bound or memory-paging problem, not a CPU one — Resource Monitor attributes disk I/O and hard faults per-process, which Task Manager only summarises."},
    {type:"input", q:"Command/Run-dialog entry to open Resource Monitor directly? (one word)",
     accept:["resmon"], explain:"resmon opens Resource Monitor, the deeper per-process disk/network/memory breakdown beneath Task Manager."},
    {type:"mcq", q:"Which Task Manager tab tells you what launches automatically at login, with a measured performance impact?",
     choices:["Processes","Startup","Services","Users"],
     correct:1, explain:"Startup tab lists login items with Windows' own 'Startup impact' rating — the first place to look for a slow-boot complaint."}
  ]},

{ id:"t5-eventvwr", title:"Event Viewer: Windows' equivalent of the system log", prereqs:["t5-nav"],
  why:"Every meaningful Windows system event — a crash, a failed service start, a driver fault, a logon — gets an Event ID somewhere in here. It's the Windows analogue to journalctl/dmesg.",
  body:`
<p>Open with <code>eventvwr</code>. Three logs matter most, under Windows Logs:</p>
<table>
<tr><th>Log</th><th>Contains</th></tr>
<tr><td>Application</td><td>events from installed apps — crashes (Source: Application Error), app-specific warnings</td></tr>
<tr><td>System</td><td>OS/driver/service events — unexpected shutdowns, driver failures, service start/stop</td></tr>
<tr><td>Security</td><td>logon/logoff, privilege use — needs auditing enabled to be populated fully</td></tr>
</table>
<p>Each entry has a <b>Level</b> (Critical/Error/Warning/Information), a <b>Source</b> (which component logged it), and an <b>Event ID</b> (a numeric code you can look up). A handful worth recognising on sight:</p>
<pre>Event ID 41   Kernel-Power  — "system rebooted without cleanly shutting down" (System log)
                              the single strongest signal of a crash/power-loss/hard-hang, not a clean restart
Event ID 1001 BugCheck       — a Blue Screen (STOP error) occurred; the code (0x...) identifies the fault
Event ID 6008                — "previous system shutdown was unexpected"
Event ID 7000 / 7001         — a service failed to start
Event ID 4625                — failed logon (Security log)</pre>
<p>Filtering: right-click a log → "Filter Current Log" → pick Event level and/or type an Event ID. For "what happened right before it crashed", sort by Date and Time (default) and look at the timestamps immediately before the gap.</p>
<p><b>Custom Views → Administrative Events</b> is a pre-built filter across all logs for Critical/Error/Warning only — usually faster than digging through Application and System separately.</p>`,
  pitfalls:[
    "An Event ID means different things depending on its Source — always read Source alongside the ID, don't match on the number alone across different vendors' entries.",
    "Security log logon/logoff auditing is often NOT enabled by default outside domain environments — an empty Security log doesn't mean nothing happened, it may mean nothing was being recorded.",
    "Event Viewer only shows what made it to disk before a crash. A true hard freeze or power loss can lose the last few seconds of buffered log entries — absence of a final error doesn't rule out a hardware fault."
  ],
  items:[
    {type:"mcq", q:"Which System-log Event ID is the strongest signal that the machine rebooted uncleanly (crash, power loss, hard hang) rather than a normal restart?",
     choices:["Event ID 41 (Kernel-Power)","Event ID 4625","Event ID 7000","Event ID 1000"],
     correct:0, explain:"Event ID 41 from source Kernel-Power specifically means the system started up again without a clean, logged shutdown beforehand — the standard fingerprint of a crash or power event."},
    {type:"input", q:"Which Windows log records app-level crashes like Source: Application Error? (one word)",
     accept:["Application"], explain:"The Application log holds events logged by installed applications, including their crash reports."},
    {type:"mcq", q:"You want Critical/Error/Warning events across ALL logs at once, without checking Application and System separately. Fastest path?",
     choices:["Custom Views → Administrative Events","Security log only","Export every log to CSV and grep","There is no combined view"],
     correct:0, explain:"Administrative Events is a built-in filtered view spanning multiple logs at Critical/Error/Warning level — usually the fastest single place to start."}
  ]},

{ id:"t5-crash", title:"Crash dumps on Windows: BSOD, minidumps, and WER", prereqs:["t5-eventvwr"],
  why:"When a Windows box blue-screens or an app crashes, the actual diagnostic evidence is a memory dump file on disk, not just what Event Viewer summarises. Knowing where it lives is the difference between a real root cause and a guess.",
  body:`
<h3>BSOD (kernel crashes / STOP errors)</h3>
<p>When Windows hits a fatal kernel-level error, it blue-screens, shows a STOP code (e.g. <code>IRQL_NOT_LESS_OR_EQUAL</code>, <code>0x0000000A</code>), and — if configured — writes a dump before rebooting:</p>
<pre>C:\\Windows\\Minidump\\           small (~256KB) dumps, one per crash, easiest to collect/share
C:\\Windows\\MEMORY.DMP           full (or kernel) memory dump — much larger, one file, overwritten each crash by default</pre>
<p>Check/configure what gets written: <b>System Properties → Advanced → Startup and Recovery → Settings</b> (or Win+R → <code>SystemPropertiesAdvanced</code>). "Write debugging information" dropdown: None / Small memory dump (minidump) / Kernel memory dump / Complete memory dump / Automatic memory dump.</p>
<p>Reading a minidump needs a debugger — <b>WinDbg</b> (free, from the Microsoft Store or Windows SDK):</p>
<pre>WinDbg → File → Open Crash Dump → select the .dmp
!analyze -v            the single most useful command — auto-analyses the dump and names the likely faulting driver/module</pre>
<p>The STOP code itself is often enough to search on and narrows the category immediately — e.g. <code>DRIVER_IRQL_NOT_LESS_OR_EQUAL</code> points at a driver, <code>PAGE_FAULT_IN_NONPAGED_AREA</code> often points at faulty RAM or a driver bug touching bad memory.</p>
<h3>Application crashes — Windows Error Reporting (WER)</h3>
<pre>%LOCALAPPDATA%\\CrashDumps\\           per-app-crash minidumps, if WER local dumps are configured
%PROGRAMDATA%\\Microsoft\\Windows\\WER\\ReportQueue\\   pending Windows Error Reporting reports</pre>
<p>Event Viewer's Application log entry (Source: Application Error) names the faulting module and offset even without opening a dump — often enough to identify "which DLL" even before deeper analysis.</p>`,
  pitfalls:[
    "MEMORY.DMP (full kernel dump) is overwritten by the NEXT crash by default — if you need to keep it for analysis, copy it off immediately after a crash, before the machine crashes again.",
    "A minidump is small specifically because it only captures the crashing thread's stack and loaded module list — for some faults there just isn't enough in it to be conclusive, and you need a Kernel or Complete dump configured in advance.",
    "The STOP code alone is a starting hypothesis, not a diagnosis — the same code can point at bad RAM, a buggy third-party driver, or overclocking instability. !analyze -v's 'likely culprit' module name is a lead to verify, not a verdict."
  ],
  items:[
    {type:"mcq", q:"Where does Windows write small per-crash BSOD dump files by default?",
     choices:["C:\\Windows\\Minidump\\","C:\\ProgramData\\Dumps\\","C:\\Users\\Public\\","C:\\Windows\\Temp\\Crash\\"],
     correct:0, explain:"C:\\Windows\\Minidump\\ holds the small (~256KB) per-crash dumps; C:\\Windows\\MEMORY.DMP holds the single larger full/kernel dump, overwritten each time by default."},
    {type:"input", q:"WinDbg command that auto-analyses an opened crash dump and suggests the likely faulting module? (with the -v flag)",
     accept:["!analyze -v"], explain:"!analyze -v is the standard first command after opening any dump in WinDbg — it walks the stack and names a probable cause."},
    {type:"mcq", q:"Where do per-application crash minidumps land if Windows Error Reporting local dump collection is configured?",
     choices:["%LOCALAPPDATA%\\CrashDumps\\","C:\\Windows\\Minidump\\","%TEMP%\\WER\\","C:\\Windows\\System32\\config\\"],
     correct:0, explain:"%LOCALAPPDATA%\\CrashDumps\\ is WER's local-dump location for individual application crashes — separate from the kernel-level BSOD dumps under C:\\Windows\\."}
  ]},

{ id:"t5-services", title:"Services, Task Scheduler, and Device Manager", prereqs:["t5-cmd"],
  why:"Custom-built display PCs often run a specific app as a service or scheduled task so it survives reboots and logons unattended — these three tools are where that automation lives and where it breaks.",
  body:`
<p><b>Services</b> (<code>services.msc</code>) — background processes managed by the OS:</p>
<pre>Status         Running / Stopped
Startup Type   Automatic / Automatic (Delayed Start) / Manual / Disabled
Log On As      which account it runs under — Local System, Network Service, or a specific user</pre>
<p>Right-click → Properties → Recovery tab: what happens on the 1st/2nd/subsequent failure (restart the service, run a program, restart the computer) — worth checking for anything critical that should self-heal.</p>
<p>PowerShell equivalents: <code>Get-Service</code>, <code>Start-Service NAME</code>, <code>Stop-Service NAME</code>, <code>Restart-Service NAME</code>, <code>Set-Service NAME -StartupType Automatic</code>.</p>
<p><b>Task Scheduler</b> (<code>taskschd.msc</code>) — runs a program on a schedule OR a trigger (at logon, at startup, on an event, on idle):</p>
<pre>Task Scheduler Library    the tree of tasks — check both the root and \\Microsoft\\Windows\\ subfolders
Triggers tab               WHEN it runs
Actions tab                WHAT it runs — the actual command/script and arguments
History tab                did it actually fire, and did it succeed? — enable "All Tasks History" if empty</pre>
<p>A task showing "Ready" but never actually running is usually a trigger condition not being met (e.g. "only if on AC power", "only if network available") — check the Conditions tab, not just Triggers.</p>
<p><b>Device Manager</b> (<code>devmgmt.msc</code>) — hardware and driver status. A yellow warning triangle on a device is a driver problem; look at Properties → Device status for the specific error code (e.g. Code 43 = the device reported a problem and Windows disabled it). Common on custom display hardware with vendor-supplied drivers.</p>`,
  pitfalls:[
    "A service set to 'Automatic' still has to wait for its dependencies — check the Dependencies tab if it fails to start with no obvious reason.",
    "A scheduled task that works when you 'Run' it manually but never fires on its own trigger is almost always a Conditions-tab setting (power, network, idle) silently blocking it — this is the single most common Task Scheduler gotcha.",
    "A service or task configured to 'Log On As' a specific user will stop working the moment that user's password changes or the account is disabled — this is a frequent, delayed-onset failure mode long after the actual change."
  ],
  items:[
    {type:"mcq", q:"A scheduled task runs fine when you click 'Run' manually, but never fires on its own trigger. First place to check?",
     choices:["Triggers tab (already checked, correct schedule)","Conditions tab — power/network/idle requirements","Delete and recreate the task","Reinstall Task Scheduler"],
     correct:1, explain:"Conditions (like 'only if on AC power' or 'only if network available') silently prevent an otherwise-correctly-triggered task from running — the most common cause of this exact symptom."},
    {type:"mcq", q:"Device Manager shows a yellow warning triangle with Code 43 on a device. What does that mean?",
     choices:["The device is missing a driver entirely","Windows has stopped the device because it reported a problem","The device is disabled by the user","Normal — no action needed"],
     correct:1, explain:"Code 43 specifically means the device itself (or its driver) reported a failure to Windows, which then disabled it — different from 'no driver installed' (a different code) or a user-initiated disable."},
    {type:"input", q:"Run-dialog command to open Task Scheduler directly? (one word)",
     accept:["taskschd.msc","taskschd"], explain:"taskschd.msc opens Task Scheduler directly from Win+R."}
  ]},

{ id:"t5-paths", title:"Essential Windows paths and environment variables", prereqs:["t5-nav"],
  why:"Windows spreads configuration and logs across several conventional locations, mostly addressed by environment variable rather than hardcoded path — knowing the variables makes you portable across machines and user accounts.",
  body:`
<table>
<tr><th>Variable / Path</th><th>Points to</th></tr>
<tr><td><code>%USERPROFILE%</code></td><td>C:\\Users\\&lt;you&gt; — your user folder</td></tr>
<tr><td><code>%APPDATA%</code></td><td>C:\\Users\\&lt;you&gt;\\AppData\\Roaming — per-user app settings, roams with the profile on a domain</td></tr>
<tr><td><code>%LOCALAPPDATA%</code></td><td>C:\\Users\\&lt;you&gt;\\AppData\\Local — per-user, per-machine data (incl. CrashDumps, see the crash-dumps card)</td></tr>
<tr><td><code>%TEMP%</code> / <code>%TMP%</code></td><td>C:\\Users\\&lt;you&gt;\\AppData\\Local\\Temp — temporary files, safe-ish to clean when full</td></tr>
<tr><td><code>%WINDIR%</code></td><td>C:\\Windows</td></tr>
<tr><td><code>%SYSTEMROOT%\\System32</code></td><td>core OS binaries, drivers, cmd.exe/powershell.exe themselves</td></tr>
<tr><td><code>%PROGRAMDATA%</code></td><td>C:\\ProgramData — shared, all-user app data (not roaming, not user-specific)</td></tr>
<tr><td><code>%PROGRAMFILES%</code></td><td>C:\\Program Files — 64-bit installed apps</td></tr>
<tr><td><code>%PROGRAMFILES(X86)%</code></td><td>C:\\Program Files (x86) — 32-bit installed apps on a 64-bit OS</td></tr>
<tr><td>C:\\Windows\\System32\\drivers\\etc\\hosts</td><td>Windows' equivalent of /etc/hosts</td></tr>
<tr><td>C:\\Windows\\System32\\winevt\\Logs</td><td>raw .evtx files behind Event Viewer</td></tr>
<tr><td>C:\\Windows\\Minidump, C:\\Windows\\MEMORY.DMP</td><td>crash dumps, covered next</td></tr>
</table>
<p>See any of these live from a shell: CMD <code>echo %APPDATA%</code>, PowerShell <code>$env:APPDATA</code>, or type the variable directly into File Explorer's address bar (e.g. <code>%TEMP%</code> and press Enter) — Explorer resolves it for you.</p>
<h3>Registry, briefly</h3>
<p>The registry is Windows' hierarchical config database, edited with <code>regedit</code>. Two root keys matter most for triage: <code>HKEY_LOCAL_MACHINE</code> (machine-wide settings, HKLM) and <code>HKEY_CURRENT_USER</code> (the logged-in user's settings, HKCU). Autostart entries commonly live under <code>HKLM\\...\\Run</code> and <code>HKCU\\...\\Run</code> — a second place besides Task Scheduler and the Startup folder to check for things launching at logon.</p>`,
  pitfalls:[
    "%APPDATA% (Roaming) and %LOCALAPPDATA% (Local) are easy to confuse — Roaming follows the user across machines in a domain environment, Local does not. An app writing large caches to Roaming by mistake bloats logon/profile-sync time.",
    "Editing the registry has no undo beyond a manual backup — always export the specific key (right-click → Export) before changing it.",
    "C:\\Program Files vs C:\\Program Files (x86) — on a 64-bit Windows install, 32-bit software installs to the (x86) folder. Looking in the wrong one is a common 'the file isn't there' false alarm."
  ],
  items:[
    {type:"mcq", q:"Which folder holds per-user app data that does NOT roam across machines in a domain (unlike %APPDATA%)?",
     choices:["%LOCALAPPDATA%","%PROGRAMDATA%","%WINDIR%","%USERPROFILE%\\Documents"],
     correct:0, explain:"%LOCALAPPDATA% is user- and machine-specific; %APPDATA% (Roaming) is designed to follow the user profile across machines on a domain."},
    {type:"input", q:"Windows' equivalent of /etc/hosts — full path? (drive letter, System32\\drivers\\etc\\hosts)",
     accept:["C:\\Windows\\System32\\drivers\\etc\\hosts","c:\\windows\\system32\\drivers\\etc\\hosts","system32\\drivers\\etc\\hosts"], explain:"C:\\Windows\\System32\\drivers\\etc\\hosts — same purpose and format as Linux's /etc/hosts, just a much deeper path."},
    {type:"mcq", q:"You're looking for a 32-bit app's install folder on a 64-bit Windows machine and it's not in Program Files. Where next?",
     choices:["It doesn't exist on 64-bit Windows","Program Files (x86)","AppData\\Local","System32"],
     correct:1, explain:"32-bit applications on a 64-bit Windows install go into 'Program Files (x86)' by convention — a very common first place to look when a file 'isn't there'."}
  ]},

{ id:"t5-perf", title:"Performance Monitor: counters over time", prereqs:["t5-tasks"],
  why:"Task Manager shows you right now. Performance Monitor (perfmon) shows you a trend over hours or days — the tool for 'it gets slow every afternoon' style problems that a single glance can't catch.",
  body:`
<p>Open with <code>perfmon</code>. Two modes matter:</p>
<pre>Performance Monitor (live graph)   -&gt; add counters, watch them update in real time
Data Collector Sets                -&gt; schedule counters to log to a file over hours/days, review later</pre>
<p>Counters worth knowing by name (Object: Counter):</p>
<table>
<tr><th>Counter</th><th>Watch for</th></tr>
<tr><td>Processor: % Processor Time</td><td>sustained high = CPU-bound; combine with Process(*)\\% Processor Time to find which process</td></tr>
<tr><td>Memory: Available MBytes</td><td>trending toward zero = memory pressure building</td></tr>
<tr><td>Memory: Pages/sec</td><td>high and sustained = active paging to disk, a strong low-RAM signal</td></tr>
<tr><td>PhysicalDisk: % Disk Time</td><td>consistently near 100% = disk is the bottleneck</td></tr>
<tr><td>PhysicalDisk: Avg. Disk sec/Transfer</td><td>rising latency per I/O — a failing or overloaded disk</td></tr>
<tr><td>Network Interface: Bytes Total/sec</td><td>sustained near link speed = network-bound</td></tr>
</table>
<p>Workflow for an intermittent problem: create a Data Collector Set with the counters above, set it to log continuously (or on a schedule) over the period the issue occurs, then reopen the saved .blg log afterward and scrub to the timestamp of the complaint — much more reliable than trying to have Task Manager open at the exact right moment.</p>`,
  pitfalls:[
    "perfmon's live view only shows what's happening while you're watching — for an intermittent, hard-to-catch issue, set up a Data Collector Set to log continuously instead of babysitting a graph.",
    "A single spike in a graph is often noise; look for a sustained trend over the actual complaint window before concluding a counter identifies the cause.",
    "Counters are per-instance for multi-core/multi-disk systems (e.g. one line per CPU core) — the '_Total' instance is usually what you want first, then drill into individual instances."
  ],
  items:[
    {type:"mcq", q:"Which counter most directly indicates the system is actively paging (swapping) memory to disk?",
     choices:["Processor: % Processor Time","Memory: Pages/sec","Network Interface: Bytes Total/sec","PhysicalDisk: % Disk Time"],
     correct:1, explain:"Memory: Pages/sec sustained and high is the direct signal of active paging — memory pressure severe enough that Windows is writing/reading pages from disk."},
    {type:"mcq", q:"A problem only happens intermittently, roughly once a day, and you can never be watching Task Manager at the right moment. Best tool?",
     choices:["Keep Task Manager open and hope","perfmon Data Collector Set logging continuously, reviewed after the fact","Reinstall Windows","Event Viewer only"],
     correct:1, explain:"A Data Collector Set logs chosen counters to a file over an extended period — you review the .blg log after the next occurrence and scrub straight to that timestamp."},
    {type:"input", q:"Run-dialog command to open Performance Monitor? (one word)",
     accept:["perfmon"], explain:"perfmon opens Performance Monitor directly."}
  ]},

{ id:"t5-net", title:"Windows network diagnostics", prereqs:["t5-cmd"],
  why:"The Windows-side equivalents of ip/ss/tcpdump. Necessary when a display PC can't reach the rest of the network and you need to isolate where.",
  body:`
<pre>ipconfig /all              full adapter config: IP, mask, gateway, DNS, MAC — CMD or PowerShell
ipconfig /release           drop the current DHCP lease
ipconfig /renew             request a new one
ipconfig /flushdns          clear the local DNS resolver cache — fixes stale-DNS symptoms
ping 10.42.7.20              basic reachability, ICMP
ping -t 10.42.7.20           continuous ping (Ctrl+C to stop) — good for watching a link recover
tracert 10.42.7.20           hop-by-hop path — CMD's traceroute equivalent
netstat -ano                 all connections + listening ports + owning PID (-o)
nslookup app01.site.local     manual DNS query</pre>
<p>PowerShell's newer, more scriptable equivalents:</p>
<pre>Get-NetIPConfiguration            like ipconfig /all, as objects
Get-NetAdapter                     list adapters and their link status (Up/Disconnected)
Test-NetConnection 10.42.7.20 -Port 22    ping AND a TCP port-reachability test in one command
Test-NetConnection -TraceRoute            adds hop-by-hop path to the same command
Get-DnsClientCache                 view the local DNS cache contents
Resolve-DnsName app01.site.local   modern nslookup equivalent</pre>
<p><code>Test-NetConnection</code> is the one worth internalising: it replaces both ping and a manual "can I even reach this port" check (which ping alone cannot tell you — ICMP being blocked doesn't mean the actual service port is unreachable, and vice versa).</p>`,
  pitfalls:[
    "ping succeeding does not mean the actual service is reachable — ICMP and the application's TCP port are filtered independently by firewalls. Use Test-NetConnection -Port to check the real port, not just ping.",
    "A stale DNS cache (client-side) can make a renamed or re-IP'd host resolve to the old address long after the change — ipconfig /flushdns (or Clear-DnsClientCache in PowerShell) is the fix, and worth trying before assuming DNS itself is broken.",
    "netstat -ano's PID column needs cross-referencing against Task Manager's Details tab (PID column, enabled via View → Select Columns if hidden) to identify the actual owning process."
  ],
  items:[
    {type:"mcq", q:"You can ping a server but the app connecting to port 443 on it times out. What does this tell you?",
     choices:["The server is definitely down","Nothing useful — ping and the actual TCP port are checked independently, so ICMP working doesn't guarantee the port is reachable","DNS is broken","The gateway is misconfigured"],
     correct:1, explain:"ICMP (ping) and a specific TCP port can be filtered completely independently by firewalls along the path. Use Test-NetConnection -Port 443 to check the actual port, not ping, when the app itself is failing."},
    {type:"input", q:"Command to clear the local DNS resolver cache on Windows? (ipconfig with a flag)",
     accept:["ipconfig /flushdns"], explain:"ipconfig /flushdns clears cached DNS answers — the fix for 'a renamed host still resolves to its old IP on this one machine'."},
    {type:"mcq", q:"Which single PowerShell command checks both basic reachability AND whether a specific TCP port is open?",
     choices:["ping","Test-NetConnection -Port","tracert","Get-NetAdapter"],
     correct:1, explain:"Test-NetConnection with -Port does a real TCP connection attempt to that port, in addition to the basic ping-style test — one command instead of two separate tools."}
  ]},

{ id:"t5-powershell", title:"PowerShell diagnostics cmdlets, tied together", prereqs:["t5-cmd"],
  why:"Once you know Get-Verb/Noun naming, most diagnostic cmdlets are guessable. These are the specific ones worth having memorised.",
  body:`
<pre>Get-EventLog -LogName System -Newest 20            older cmdlet, classic .evt-style logs only
Get-WinEvent -LogName System -MaxEvents 20           modern equivalent, also reads .evtx and newer log types — prefer this one
Get-WinEvent -FilterHashtable @{LogName='System'; Level=2; StartTime=(Get-Date).AddHours(-24)}
                                                       Level 2 = Error; last 24 hours only</pre>
<pre>Get-Process | Sort-Object WS -Descending | Select -First 10     top 10 by working-set memory
Get-Service | Where-Object Status -eq 'Running'
Get-Counter '\\Memory\\Available MBytes'                          one-shot read of a perfmon counter from the command line
Get-Counter '\\Processor(_Total)\\% Processor Time' -Continuous   live-streamed, Ctrl+C to stop</pre>
<pre>Get-ComputerInfo                                     OS build, BIOS, memory, one big object — quick machine fingerprint
Get-CimInstance Win32_LogicalDisk                     disk info including free space, via WMI/CIM
Get-HotFix                                            installed Windows updates/patches, useful when a patch is suspected</pre>
<p>The pattern that makes all of this composable: everything is an object, so <code>| Where-Object</code>, <code>| Sort-Object</code>, <code>| Select-Object -First N</code>, and <code>| Export-Csv report.csv</code> work identically regardless of which Get-* cmdlet produced the data.</p>`,
  pitfalls:[
    "Get-EventLog is deprecated / limited to classic logs and is noticeably slower on a large log — prefer Get-WinEvent for anything modern, especially with -FilterHashtable which filters at the source instead of after pulling everything.",
    "Get-Counter's path syntax is exact and easy to get subtly wrong (leading backslash, exact object/counter/instance names) — use Get-Counter -ListSet * to discover the exact available names on that machine rather than guessing.",
    "Piping a huge Get-WinEvent result into Where-Object AFTER retrieval (instead of using -FilterHashtable) pulls everything into memory first — slow and occasionally very slow on a large or old log. Filter as early in the pipeline as possible."
  ],
  items:[
    {type:"mcq", q:"Which cmdlet should you prefer over Get-EventLog for modern log reading, especially with large logs?",
     choices:["Get-WinEvent","Get-Content","Get-ChildItem","Get-History"],
     correct:0, explain:"Get-WinEvent is the modern replacement, supports .evtx and newer log formats, and -FilterHashtable filters server-side/at-source rather than pulling everything into memory first."},
    {type:"input", q:"Cmdlet to get a one-shot or continuous read of a perfmon-style counter from PowerShell? (one word)",
     accept:["Get-Counter"], explain:"Get-Counter reads perfmon counters directly from the command line, with -Continuous for live streaming."},
    {type:"mcq", q:"Why prefer Get-WinEvent -FilterHashtable over piping the full result through Where-Object afterward?",
     choices:["No difference in performance","FilterHashtable filters at the source, avoiding pulling the entire log into memory first — much faster on large logs","Where-Object doesn't work on event logs","FilterHashtable is required, Where-Object is invalid here"],
     correct:1, explain:"Filtering early (server-side/source-side via FilterHashtable) avoids the cost of retrieving and holding every single event before discarding most of them — the difference is dramatic on a large log."}
  ]},

{ id:"t5-repair", title:"Built-in repair tools: SFC, DISM, chkdsk, Safe Mode, System Restore", prereqs:["t5-cmd"],
  why:"Before reinstalling anything, Windows ships its own repair toolkit for the most common categories of damage — corrupted system files, a damaged disk, or a boot-blocking driver. These are the 'try this first' commands.",
  body:`
<h3>System files</h3>
<pre>sfc /scannow                    System File Checker — scans and repairs protected system files using a local cache
DISM /Online /Cleanup-Image /CheckHealth      is the underlying Windows image (the source SFC repairs FROM) healthy?
DISM /Online /Cleanup-Image /ScanHealth        deeper scan for corruption in that image
DISM /Online /Cleanup-Image /RestoreHealth     repair the image itself, using Windows Update as the source</pre>
<p>Run in that order when system files are suspected: DISM first (repairs the underlying image SFC repairs FROM), then <code>sfc /scannow</code> (repairs the live system using that now-healthy image as its source).</p>
<h3>Disk</h3>
<pre>chkdsk C:                     check only, report problems, no changes
chkdsk C: /f                   fix errors found — needs exclusive access, usually prompts to schedule at next reboot for the system drive
chkdsk C: /r                    /f, plus locate and flag bad sectors — slower, more thorough</pre>
<h3>When Windows won't boot normally</h3>
<pre>Safe Mode           loads only essential drivers — the classic "does it work with everything else disabled" test
                     Settings -&gt; Recovery -&gt; Advanced startup -&gt; Restart now, or hold Shift while clicking Restart
WinRE                Windows Recovery Environment — auto-triggers after repeated failed boots, or reachable the same way
                     as Safe Mode above; offers Startup Repair, System Restore, Command Prompt, "Reset this PC"
System Restore       rolls SYSTEM FILES AND SETTINGS back to an earlier restore point — does not touch personal files
                     rstrui.exe to launch it manually while Windows is running</pre>
<p>Order of increasing intrusiveness when something is broken and won't boot: Safe Mode (diagnose) → Startup Repair (automated fix attempt) → System Restore (roll back a recent change) → Reset this PC (last resort, much larger blast radius).</p>`,
  pitfalls:[
    "Running sfc /scannow when the underlying Windows image itself is corrupted can report it 'could not fix some files' — that's the signal to run DISM /RestoreHealth first, then retry sfc, not to give up.",
    "chkdsk /f on the boot drive (usually C:) can't get exclusive access while Windows is running on it — it schedules the check for the next restart instead of running immediately; a machine that then takes a long time to boot afterward is running that scheduled check, not hung.",
    "System Restore only touches system files, installed programs, and settings — it explicitly does not delete or roll back personal files (documents, photos) sitting in user folders, contrary to what people sometimes assume."
  ],
  items:[
    {type:"mcq", q:"You suspect corrupted system files, and sfc /scannow reports it could not fix some of them. Next step?",
     choices:["Give up, reinstall Windows immediately","Run DISM /Online /Cleanup-Image /RestoreHealth first (repairs the underlying image), then retry sfc /scannow","Run chkdsk /r","Nothing else to try"],
     correct:1, explain:"sfc repairs using a local image as its source; if that source image is itself damaged, sfc can't fully succeed. DISM /RestoreHealth repairs the image (using Windows Update), after which sfc has a healthy source to repair from."},
    {type:"mcq", q:"What does System Restore actually roll back?",
     choices:["Everything including personal documents and photos","System files, installed programs, and settings only — not personal files","Only the registry","Nothing, it's just a backup viewer"],
     correct:1, explain:"System Restore targets system state (files, settings, installed software) at a restore point in time; it deliberately leaves personal files in user folders untouched."},
    {type:"input", q:"Command to check a disk for errors AND fix them, needing exclusive access (often scheduled for next reboot on the system drive)? (chkdsk with a flag)",
     accept:["chkdsk /f","chkdsk c: /f"], explain:"chkdsk C: /f actively fixes errors found (vs. a report-only chkdsk C:); /r additionally scans for and flags bad sectors."}
  ]},

{ id:"t5-sysinternals", title:"Sysinternals: the expert-level toolkit", prereqs:["t5-tasks"],
  why:"Task Manager and Event Viewer cover the basics. When a problem resists both, the free Microsoft Sysinternals suite is the next level — this is what actual Windows experts reach for.",
  body:`
<p>Free, no install required (portable .exe), from Microsoft — download the whole suite or grab tools individually. Four worth knowing by name:</p>
<table>
<tr><th>Tool</th><th>What it's for</th></tr>
<tr><td><b>Process Explorer</b> (procexp)</td><td>Task Manager, hugely expanded — see a process's loaded DLLs, open handles, parent/child tree, and which process owns a locked file/port; hover a process for a live tooltip of its details</td></tr>
<tr><td><b>Autoruns</b></td><td>every single thing configured to start automatically, from every mechanism at once — Registry Run keys, services, scheduled tasks, browser extensions, drivers — in one list, with easy per-item disable</td></tr>
<tr><td><b>Process Monitor</b> (procmon)</td><td>live trace of every file, registry, and process/thread event on the system, filterable — the tool for "what exactly is this app trying to touch, and where does it fail"</td></tr>
<tr><td><b>PsExec</b></td><td>run a command on a REMOTE Windows machine from the command line, without a full RDP session — lightweight remote execution</td></tr>
</table>
<p>A concrete Process Explorer move: <b>Find → Find Handle or DLL</b>, search for a locked file's name, and it tells you exactly which process holds it open — solves "this file is in use by another process" without guessing.</p>
<p>A concrete Autoruns move: something starts automatically and you don't know why — Autoruns' single list (grouped by category, with a Logon tab, Scheduled Tasks tab, Services tab, etc.) is faster than checking msconfig, Task Scheduler, and the registry separately.</p>
<p>A concrete Procmon move: an app fails with a vague error — filter Procmon to that process name, look for the first <code>NAME NOT FOUND</code> or <code>ACCESS DENIED</code> result just before the failure; that's very often the exact missing file or blocked registry key causing it.</p>`,
  pitfalls:[
    "Process Monitor captures an enormous volume of events with no filter applied — always set a Process Name filter (or similar) BEFORE starting a capture on a busy system, or the log becomes too large to usefully scroll through.",
    "PsExec requires appropriate credentials and the target's admin$ share reachable over the network (standard Windows file sharing ports) — it is not magic remote access, it needs the same underlying network/auth access RDP would.",
    "Antivirus software sometimes flags PsExec specifically, because the exact same remote-execution mechanism is also used by attackers — this is a known false-positive pattern for a legitimate admin tool, not a sign PsExec itself is compromised."
  ],
  items:[
    {type:"mcq", q:"A file shows \"in use by another process\" but you don't know which one. Which Sysinternals tool, and which feature, answers this directly?",
     choices:["Autoruns, Logon tab","Process Explorer, Find Handle or DLL","Process Monitor, boot logging","PsExec, remote query"],
     correct:1, explain:"Process Explorer's Find → Find Handle or DLL searches all processes for one holding a matching handle open — the direct way to identify what has a file locked."},
    {type:"mcq", q:"Something launches automatically at logon and you can't tell if it's a registry Run key, a scheduled task, or a service. Fastest single tool to check all of them at once?",
     choices:["Task Manager Startup tab only","Autoruns","chkdsk","Event Viewer"],
     correct:1, explain:"Autoruns aggregates every autostart mechanism — registry Run keys, services, scheduled tasks, browser extensions, drivers — into one list, rather than checking each mechanism separately."},
    {type:"input", q:"Which Sysinternals tool traces live file/registry/process activity system-wide, filterable, useful for finding exactly where an app fails? (one word)",
     accept:["Procmon","Process Monitor"], explain:"Process Monitor (procmon) shows a live, filterable stream of file/registry/process events — filter to the failing process and look for the first NAME NOT FOUND or ACCESS DENIED right before the error."}
  ]},

{ id:"t5-users", title:"User accounts, UAC, and local permissions", prereqs:["t5-cmd"],
  why:"'Access denied' and 'this app needs to run as administrator' both trace back to the same account/privilege model — knowing it prevents chasing the wrong fix.",
  body:`
<pre>whoami                    which account am I running as
whoami /groups              every group I belong to (Administrators, Users, etc.)
net user                    list local accounts
net user svcaccount          details for one local account
net localgroup Administrators   who's actually in the local Administrators group
net user newuser P@ssw0rd /add   create a local account (CMD, needs elevation)</pre>
<p>PowerShell equivalents: <code>Get-LocalUser</code>, <code>Get-LocalGroupMember Administrators</code>, <code>New-LocalUser</code>.</p>
<h3>UAC — User Account Control</h3>
<p>Even a full administrator account runs most processes with a reduced, "standard user" token by default. UAC is the prompt that elevates a specific action to the full administrator token, on demand:</p>
<pre>Right-click an .exe -&gt; "Run as administrator"     elevate just this one launch
An app requesting admin rights                       triggers the UAC prompt automatically
whoami /groups                                        shows Administrators group membership even when NOT currently elevated
                                                        — membership ≠ currently running elevated</pre>
<p>This split (member of Administrators, but running non-elevated by default) is exactly why a script or command can fail with "Access denied" even when run by an admin account — the account has the RIGHT, but the current process doesn't have the elevated TOKEN. Open an elevated PowerShell/CMD (right-click → Run as administrator) to actually use those rights.</p>`,
  pitfalls:[
    "Being in the Administrators group does not mean every process you run is elevated — Windows deliberately runs most things at standard-user level even for admin accounts (UAC), and the specific process needs its own elevation.",
    "'net user' output can be misread — a disabled account still appears in the list; check the 'Account active' field in 'net user accountname' rather than assuming presence means it's usable.",
    "Adding an account to Administrators grants very broad rights — for a service account or anything automated, consider whether the narrower fix (a specific permission, a specific group) actually solves the real problem instead."
  ],
  items:[
    {type:"mcq", q:"An account is a member of the local Administrators group, but a command run in a normal (non-elevated) prompt fails with Access denied. Why?",
     choices:["The account isn't really an admin","UAC means most processes run with a reduced token by default even for admin accounts — the process itself needs elevation, not just group membership","net user is broken","This can't happen"],
     correct:1, explain:"UAC deliberately separates group membership (the right to elevate) from the current process's actual token (elevated or not). Right-click → Run as administrator, or open an elevated prompt, to get the elevated token for that specific action."},
    {type:"input", q:"Command to see which groups your CURRENT account belongs to? (whoami with a flag)",
     accept:["whoami /groups"], explain:"whoami /groups lists every group the current account belongs to, including Administrators if applicable — separate from whether the current process is actually elevated."},
    {type:"mcq", q:"Which command lists who is actually in the local Administrators group on this machine?",
     choices:["whoami","net localgroup Administrators","net user","chkdsk"],
     correct:1, explain:"net localgroup Administrators lists current members of that specific local group — the direct answer to 'who has admin rights on this box'."}
  ]},

{ id:"t5-firewall", title:"Windows Firewall: is it actually blocking you", prereqs:["t5-net"],
  why:"A service that works locally but is unreachable from another machine on the network is, after ruling out the network path itself, very often the Windows Firewall on the target — this is how you check and fix it without turning it off entirely.",
  body:`
<pre>wf.msc                                   Windows Defender Firewall with Advanced Security — the full GUI
Get-NetFirewallProfile                    PowerShell: are Domain/Private/Public profiles on or off
Get-NetFirewallRule -DisplayName "*RDP*"   find rules matching a name pattern
New-NetFirewallRule -DisplayName "Allow App 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
netsh advfirewall show allprofiles         classic CMD equivalent of Get-NetFirewallProfile
netsh advfirewall firewall show rule name=all   classic CMD equivalent of listing rules</pre>
<p>Windows Firewall has three <b>profiles</b> — Domain, Private, Public — and applies different rules depending which one the current network connection is classified as. A rule that works fine on your home/office network (Private) can silently not apply if the connection is misclassified as Public, or vice versa. Check <code>Get-NetFirewallProfile</code> to see which profile is active and whether it's even enabled.</p>
<p>The specific diagnostic move: an inbound connection is refused (not just timing out) — that's consistent with the firewall actively rejecting it, versus a timeout which is more consistent with nothing listening or a network-path block further away. <code>Test-NetConnection targetip -Port N</code> from another machine on the network distinguishes "actively refused" from "no response at all" in its output.</p>`,
  pitfalls:[
    "Disabling the firewall entirely to 'test' whether it's the cause and then forgetting to re-enable it is a common, easy-to-overlook security regression — add a specific allow rule for the exact port/app instead of disabling the whole profile, even temporarily.",
    "A new inbound rule added under the wrong profile (e.g. added while classified Public, but the real connection comes in as Private) silently doesn't apply — check which profile is actually active for that network adapter.",
    "Windows Firewall is not the only thing that can be blocking a port — third-party security software, antivirus with its own firewall component, or a router/switch ACL further upstream can all produce the identical symptom."
  ],
  items:[
    {type:"mcq", q:"A new inbound firewall rule was added but still doesn't seem to apply. What's a likely reason specific to Windows Firewall's design?",
     choices:["Firewall rules never work on the first try","The rule may have been added under a different profile (Domain/Private/Public) than the one currently active for that connection","Rules require a reboot always","PowerShell rules don't take effect, only GUI ones do"],
     correct:1, explain:"Windows Firewall applies different rule sets per network profile. A rule scoped to the wrong profile relative to how the current connection is classified silently doesn't apply — check Get-NetFirewallProfile for the active state."},
    {type:"input", q:"Run-dialog command to open the full Windows Defender Firewall GUI? (three letters + .msc)",
     accept:["wf.msc","wf"], explain:"wf.msc opens Windows Defender Firewall with Advanced Security — the detailed rule-management GUI."},
    {type:"mcq", q:"Why add a specific allow rule instead of disabling the firewall entirely to fix a blocked port?",
     choices:["No real difference","A specific rule fixes just that port while keeping everything else protected; disabling the whole firewall is a much larger, easy-to-forget security exposure","Disabling the firewall is faster to configure","Specific rules don't actually work"],
     correct:1, explain:"A targeted allow rule solves the exact problem with minimal exposure; disabling the firewall entirely (even 'temporarily, to test') is a common way security regressions get left in place by accident."}
  ]},

{ id:"t5-updates", title:"Windows Update: checking status and troubleshooting", prereqs:["t5-cmd"],
  why:"A recent Windows Update is one of the most common causes of a machine suddenly behaving differently — knowing what installed and when, and how to force a re-check, closes off or confirms that theory fast.",
  body:`
<pre>Settings -&gt; Windows Update -&gt; Update history      what installed, and when, from the GUI
Get-HotFix                                          installed updates, from PowerShell — sortable by InstalledOn
Get-HotFix | Sort-Object InstalledOn -Descending | Select -First 10   most recent updates first</pre>
<p>If the timing of a problem lines up with an update's InstalledOn date, that's a strong lead — not proof, but worth checking before looking elsewhere.</p>
<pre>Settings -&gt; Windows Update -&gt; Check for updates    force a manual check instead of waiting
Settings -&gt; Windows Update -&gt; Update history -&gt; Uninstall updates   remove a specific recent update if it's the suspect
wuauclt /detectnow                                    older, less reliable way to trigger a check (legacy, may no-op on modern builds)
UsoClient StartScan                                    modern equivalent trigger, still unofficial/undocumented behaviour — GUI "Check for updates" is the reliable path</pre>
<p>Update logs, if you need to go deeper than the GUI history:</p>
<pre>Get-WindowsUpdateLog                 generates a readable log from Windows' internal ETW trace format, saves to the desktop
C:\\Windows\\Logs\\WindowsUpdate\\      the raw ETW trace files themselves, not human-readable directly</pre>`,
  pitfalls:[
    "wuauclt /detectnow is a legacy command that may silently do nothing on current Windows versions — don't rely on it as your check; use the Settings GUI's 'Check for updates' button, which is still the reliable trigger.",
    "Uninstalling a recent update to test a theory is itself a real system change (and may auto-reinstall later depending on policy) — confirm the InstalledOn date genuinely lines up with when the symptom started before reaching for this, rather than uninstalling speculatively.",
    "The raw files under C:\\Windows\\Logs\\WindowsUpdate\\ are in ETW trace format and not directly readable — always go through Get-WindowsUpdateLog to convert them to something you can actually read."
  ],
  items:[
    {type:"mcq", q:"A problem started right around the time Windows Update ran. Fastest way to confirm what installed and exactly when?",
     choices:["Reinstall Windows to be safe","Get-HotFix | Sort-Object InstalledOn -Descending, or Settings -> Update history","wuauclt /detectnow","There's no way to check after the fact"],
     correct:1, explain:"Get-HotFix (or the GUI's Update history) shows exactly what installed and when — the direct way to check whether the timing actually lines up with the symptom before assuming update-caused."},
    {type:"input", q:"PowerShell cmdlet that converts Windows Update's raw ETW trace logs into a readable log file? (two words)",
     accept:["Get-WindowsUpdateLog"], explain:"Get-WindowsUpdateLog reads the raw trace files under C:\\Windows\\Logs\\WindowsUpdate\\ and produces a single readable log, typically saved to the desktop."},
    {type:"mcq", q:"Why is wuauclt /detectnow considered unreliable on current Windows versions?",
     choices:["It was never a real command","It's a legacy mechanism that may silently no-op on modern builds — the Settings GUI's 'Check for updates' is the dependable trigger","It requires a reboot first","It only works on Windows Server"],
     correct:1, explain:"wuauclt's old detection-trigger behaviour has been superseded internally; it can appear to run without actually doing anything on newer builds. The Settings app's manual check button remains the trustworthy way to force a scan."}
  ]},

{ id:"t5-dns", title:"DNS and DHCP troubleshooting on Windows", prereqs:["t5-net"],
  why:"The Windows-side equivalent of dig/resolvectl — and the DHCP half of 'why does this machine have the wrong IP' that ipconfig alone only hints at.",
  body:`
<pre>nslookup app01.site.local              classic query tool, still the default everywhere
nslookup app01.site.local 10.42.7.1     query a SPECIFIC server directly, bypassing normal config
Resolve-DnsName app01.site.local        PowerShell's modern equivalent, richer object output
Resolve-DnsName app01.site.local -Server 10.42.7.1   same, against a specific server
Resolve-DnsName -Name app01.site.local -Type PTR      reverse lookup: IP -> name (via the in-addr.arpa name)</pre>
<p>The local DNS client cache sits in front of every query, same idea as Linux's systemd-resolved stub:</p>
<pre>ipconfig /displaydns          show everything currently cached
ipconfig /flushdns             clear it — the first move for "stale answer" symptoms
Get-DnsClientCache             PowerShell equivalent of /displaydns, as objects</pre>
<p>Which DNS servers a machine actually uses often comes from DHCP, not manual config — check both together:</p>
<pre>ipconfig /all                              shows the DNS servers currently in effect, however they got set
Get-DnsClientServerAddress                  PowerShell equivalent, per interface
Get-NetIPConfiguration                       DNS servers alongside IP/gateway in one object</pre>
<h3>DHCP</h3>
<pre>ipconfig /release      give back the current lease
ipconfig /renew         request a new one — the two together are the standard "get unstuck" sequence
Get-DhcpServerv4Lease -ScopeId 10.42.7.0 -ComputerName dhcp01   (from the DHCP SERVER itself, if you're an admin there)
                          which client has which IP, and until when</pre>
<p>An IP that starts with <code>169.254.</code> is APIPA — Windows self-assigning an address because DHCP never answered. That prefix alone is the diagnosis: stop looking at the application, the machine never got a real lease.</p>`,
  pitfalls:[
    "An address in 169.254.0.0/16 (APIPA) means DHCP failed silently, not that anything about the network stack itself is broken — check DHCP server reachability and the switch port/VLAN, not the app.",
    "ipconfig /all shows CURRENT effective settings, which may be a stale cached lease from hours ago — ipconfig /release then /renew forces a fresh negotiation instead of trusting what's currently cached.",
    "nslookup's default behaviour queries whatever server is configured on the machine; forgetting to specify a server when you meant to test a SPECIFIC DNS server directly is a common source of 'works in nslookup, so DNS is fine' false confidence."
  ],
  items:[
    {type:"mcq", q:"A Windows machine has IP 169.254.34.12. What does that address range specifically tell you?",
     choices:["Nothing unusual, it's a normal private IP","APIPA — Windows self-assigned this because DHCP never answered","It's a DNS server address","It's a loopback address"],
     correct:1, explain:"169.254.0.0/16 is Automatic Private IP Addressing — Windows' fallback when no DHCP server responds. Seeing this address is itself the diagnosis: the machine never got a real lease."},
    {type:"input", q:"Command to clear the Windows DNS client cache? (ipconfig with a flag)",
     accept:["ipconfig /flushdns"], explain:"ipconfig /flushdns clears cached DNS answers — the standard first move when a renamed or re-IP'd host still resolves to its old address on one specific machine."},
    {type:"mcq", q:"What's the standard two-command sequence to force a fresh DHCP lease instead of trusting a possibly-stale cached one?",
     choices:["ipconfig /all then ipconfig /flushdns","ipconfig /release then ipconfig /renew","ipconfig /displaydns then ipconfig /registerdns","nslookup then Resolve-DnsName"],
     correct:1, explain:"release gives back the current lease, renew requests a fresh one — together they force a real DHCP negotiation instead of relying on whatever ipconfig /all currently shows as cached."}
  ]}

]});
