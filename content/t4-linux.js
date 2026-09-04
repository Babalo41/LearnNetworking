window.LN = window.LN || { tracks: [] };
LN.tracks.push({
id: "t4", title: "T4 · Linux Diagnostics",
blurb: "Navigation, the commands you will actually type every day, and where to look when a Linux box is unwell.",
cards: [

{ id:"t4-nav", title:"Shell navigation: the muscle memory", prereqs:[],
  why:"Every other Linux card assumes you can move around a filesystem without thinking about it. Get this automatic first.",
  body:`
<p>Five commands cover most movement:</p>
<pre>pwd                 print working directory — "where am I"
cd /var/log         absolute path — always works, from anywhere
cd ../..            relative path — up two levels
cd -                jump back to the PREVIOUS directory (toggle)
cd  (no args)       jump to your home directory</pre>
<p>Listing, and the flags worth knowing cold:</p>
<pre>ls -la              -l long format (perms, owner, size, date) -a include dotfiles
ls -lh              -h human sizes (K/M/G instead of bytes)
ls -lt              sort by modification time, newest first</pre>
<p>Copy / move / remove — same argument order as <code>cp SOURCE DEST</code>:</p>
<pre>cp file.txt /tmp/           copy a file
cp -r dir/ /tmp/            copy a directory (recursive — required for dirs)
mv old.txt new.txt          rename or move
rm file.txt                 delete a file (NO undo, no trash)
rm -rf dir/                 delete a directory and contents, no prompts</pre>
<p>Two habits that pay for themselves immediately: <b>Tab</b> completes paths and command names (press it, don't type the whole thing); <b>Up arrow</b> / <code>Ctrl+R</code> search your command history instead of retyping.</p>`,
  pitfalls:[
    "<code>rm -rf</code> has no trash can and no confirmation. Before running it on a variable path, run <code>echo</code> with the same path first to see exactly what will match.",
    "<code>cd</code> with no arguments does not mean 'stay put' — it takes you home. If you meant 'do nothing', that surprises people.",
    "Relative paths (<code>../config</code>) depend on your current directory. When writing a script or a cron job, prefer absolute paths — cron does not start you where you think."
  ],
  items:[
    {type:"mcq", q:"What does <code>cd -</code> do?",
     choices:["Goes to the root directory /","Goes to your home directory","Toggles back to the previous working directory","Goes up one level"],
     correct:2, explain:"cd - jumps to whatever directory you were in before your last cd — handy for bouncing between two locations."},
    {type:"input", q:"Command to print your current working directory? (one word)",
     accept:["pwd"], explain:"pwd = print working directory."},
    {type:"mcq", q:"You need to delete a non-empty directory. Which flag combination is required on <code>rm</code>?",
     choices:["-v","-r (recursive) at minimum, usually with -f to skip prompts","-l","none needed"],
     correct:1, explain:"rm refuses a non-empty directory without -r. -f additionally suppresses per-file confirmation — powerful and dangerous together."}
  ]},

{ id:"t4-textfu", title:"Reading and searching text: cat, less, tail, grep, find", prereqs:["t4-nav"],
  why:"Diagnosis on Linux is mostly reading text — logs, config files, command output. These five tools are 90% of that.",
  body:`
<pre>cat file.txt          dump the whole file to the screen — fine for short files
less file.txt          page through it: space=next page, b=back, /pattern=search, q=quit
tail -n 50 file.log    last 50 lines
tail -f file.log       FOLLOW — stream new lines as they're written (Ctrl+C to stop)
tail -f /var/log/syslog | grep -i error   the classic "watch it break live" combo</pre>
<p><code>grep</code> — search text for a pattern:</p>
<pre>grep "refused" auth.log        lines containing "refused"
grep -i error app.log          -i = case-insensitive
grep -r "TODO" src/            -r = recurse into a directory
grep -v "^#" config.conf       -v = INVERT: show lines that DON'T match (skip comments)
grep -c "error" app.log        -c = count matching lines, not the lines themselves
grep -B2 -A2 "panic" kern.log  -B/-A = lines of context before/after each match</pre>
<p><code>find</code> — locate files by name, age, size, not content:</p>
<pre>find / -name "core.*"                    by name, from root (slow, thorough)
find /var/log -mtime -1                  modified in the last 1 day
find / -size +500M                       files bigger than 500 MB — the disk-full hunt
find . -name "*.log" -mtime +30 -delete  cleanup: 30+ day old logs, actually deletes</pre>
<p>Piping ties it together: <code>command | grep pattern</code> filters any command's output, not just files.</p>`,
  pitfalls:[
    "<code>cat</code> on a multi-megabyte log floods your terminal and is genuinely hard to read. Reach for <code>less</code> or <code>tail</code> instead.",
    "<code>grep pattern file</code> vs <code>grep pattern *.log</code>: with multiple files grep prefixes each match with the filename automatically — useful, but surprising the first time.",
    "<code>find ... -delete</code> is irreversible and evaluates left to right — always run the same find WITHOUT -delete first and read the list before adding it back."
  ],
  items:[
    {type:"mcq", q:"You want to watch a log file update live as new lines are written. Which command?",
     choices:["cat file.log","tail -f file.log","grep file.log","less file.log"],
     correct:1, explain:"tail -f follows the file, printing new lines as they appear — the standard way to watch something fail in real time."},
    {type:"mcq", q:"<code>grep -v \"^#\" config.conf</code> shows you:",
     choices:["Only comment lines","Every line that is NOT a comment (doesn't start with #)","Lines containing the letter v","Nothing — invalid syntax"],
     correct:1, explain:"-v inverts the match. ^# means 'starts with #'. Together: show the actual active config, skip comments."},
    {type:"input", q:"Which command finds files by name/size/age rather than by their contents? (one word)",
     accept:["find"], explain:"find searches the filesystem tree by metadata (name, size, mtime, permissions); grep searches file contents."}
  ]},

{ id:"t4-perm", title:"Permissions and sudo: who is allowed to do what", prereqs:["t4-nav"],
  why:"'Permission denied' is one of the most common Linux errors you will see, and misreading it wastes time on the wrong fix.",
  body:`
<pre>$ ls -l app.sh
-rwxr-xr--  1 svc  ops   1204  Sep  3 10:11 app.sh
 |||||||||
 |owner||group| others
 rwx     r-x   r--
 read/write/execute, per owner / group / everyone-else</pre>
<pre>chmod +x app.sh          add execute for everyone (symbolic form)
chmod 755 app.sh          rwxr-xr-x — owner all, group/other read+execute (numeric form)
chmod 644 file.txt        rw-r--r-- — the common "readable file" default
chown svc:ops app.sh      change owner:group (needs root)</pre>
<p>Numeric mode: each digit is read(4)+write(2)+execute(1) added together — 7=rwx, 5=r-x, 4=r--.</p>
<p><code>sudo</code> runs one command as another user (root by default), logged to <code>/var/log/auth.log</code> (Debian/Ubuntu) or <code>/var/log/secure</code> (RHEL):</p>
<pre>sudo systemctl restart app.service
sudo -i                    open a root interactive shell (use sparingly)
sudo -u svcuser cmd        run as a specific non-root user, not root</pre>`,
  pitfalls:[
    "A directory needs its own <b>execute</b> bit to be entered (<code>cd</code>) even if you can't write to it — execute on a directory means 'traverse', not 'run'.",
    "<code>chmod 777</code> ('just make it work') is a diagnosis, not a fix — it means the real permission requirement was never identified. Fine for throwaway local testing, wrong for anything shared.",
    "'Permission denied' vs 'No such file or directory' are different faults: the first means the file exists and you can't access it; the second means the path is wrong. Read the exact error."
  ],
  items:[
    {type:"input", q:"Numeric chmod for rwxr-xr-x? (three digits)",
     accept:["755"], explain:"owner rwx=7, group r-x=5, other r-x=5 → 755, the standard 'executable that others can read/run' mode."},
    {type:"mcq", q:"You can list a directory's contents but cd into it fails with Permission denied. Missing bit?",
     choices:["read","write","execute (traverse)","setuid"],
     correct:2, explain:"Listing needs read; entering/traversing a directory needs execute. They're independent — read without execute lets you see names but not enter."},
    {type:"mcq", q:"Where does sudo usage typically get logged on a Debian/Ubuntu box?",
     choices:["/var/log/sudo.log","/var/log/auth.log","/etc/sudoers.log","It is never logged"],
     correct:1, explain:"auth.log (RHEL: /var/log/secure) records every sudo invocation — who, what command, when. Check it after 'who changed this?'."}
  ]},

{ id:"t4-procs", title:"Processes and resource usage: ps, top, kill", prereqs:["t4-nav"],
  why:"\"Something is using all the CPU/memory\" is one of the most common pages you'll get. This is how you find out what, and stop it safely.",
  body:`
<pre>ps aux                 every process, every user, full detail (BSD-style flags, no dashes)
ps aux | grep app       filter to processes matching "app"
ps -ef --forest         tree view — see parent/child relationships</pre>
<pre>top                     live, refreshing view — the default triage tool
htop                    nicer top, if installed — colour, scrollable, mouse-clickable kill</pre>
<pre>top - 14:22:03 up 3 days,  load average: 4.12, 3.80, 2.95
%Cpu(s): 22.1 us,  8.4 sy,  0.0 ni, 68.1 id
MiB Mem : 15872 total, 1120 free, 11200 used
  PID USER  %CPU %MEM COMMAND
 4821 svc   210.0 4.2  app-worker      <- over 100%: using more than one core
 1203 root    0.3 0.1  sshd</pre>
<p><b>Load average</b> (1/5/15-minute) is "how many processes wanted the CPU, on average" — on a 4-core box, sustained load above ~4 means things are queuing, not just busy. Compare it to core count, not to zero.</p>
<pre>kill 4821               ask nicely (SIGTERM) — the process can catch this and clean up
kill -9 4821             SIGKILL — the kernel kills it immediately, no cleanup, last resort
pkill -f app-worker      kill by name/pattern instead of PID
nice -n 10 ./job.sh      start something with LOWER priority (higher nice = nicer to others)
renice -n 5 -p 4821      change priority of an already-running process</pre>`,
  pitfalls:[
    "%CPU in top can exceed 100% on multi-core systems — 400% means fully using 4 cores. Divide by core count to get overall utilisation.",
    "<code>kill -9</code> gives the process no chance to flush buffers, release locks, or write a clean shutdown log. Try plain <code>kill</code> (SIGTERM) first and only escalate if it ignores you.",
    "A process in state <code>D</code> (uninterruptible sleep, visible in <code>ps aux</code>'s STAT column) is waiting on I/O and cannot even be killed with -9 until that I/O completes — that's a storage/NFS problem, not a process problem."
  ],
  items:[
    {type:"mcq", q:"top shows a process at 350% CPU on an 8-core box. What does that mean?",
     choices:["It is broken / impossible","It is using roughly 3.5 of the 8 cores","350% of total system capacity — the box is overloaded","It is a typo, max is 100%"],
     correct:1, explain:"Per-process CPU% in top can go up to (core count × 100%). 350% ≈ 3.5 cores busy — check against nproc before panicking."},
    {type:"mcq", q:"Difference between kill and kill -9?",
     choices:["No difference","kill (SIGTERM) asks the process to clean up and exit; kill -9 (SIGKILL) terminates immediately with no cleanup","kill -9 is slower","kill only works as root"],
     correct:1, explain:"SIGTERM is a request the app can catch and handle gracefully; SIGKILL is enforced by the kernel and cannot be caught, blocked, or ignored — use it only when SIGTERM fails."},
    {type:"input", q:"In ps aux's STAT column, which single letter means a process is stuck waiting on uninterruptible I/O?",
     accept:["D"], explain:"State D = uninterruptible sleep, almost always disk or network storage I/O. Not killable until the I/O resolves — investigate the storage, not the process."}
  ]},

{ id:"t4-systemd", title:"systemd: services and the boot sequence", prereqs:["t4-procs"],
  why:"Nearly every modern distro (RHEL, Ubuntu, Debian, SUSE) manages services with systemd. 'Is it running, and why did it stop' starts here.",
  body:`
<pre>systemctl status app.service      is it running? recent log lines, PID, memory
systemctl start app.service        start it now
systemctl stop app.service         stop it now
systemctl restart app.service      stop then start
systemctl enable app.service       start automatically on boot (does NOT start it now)
systemctl enable --now app.service enable AND start in one command
systemctl disable app.service      don't start on boot
systemctl list-units --failed      everything that failed to start — check this first after a reboot</pre>
<pre>$ systemctl status nginx
● nginx.service - A high performance web server
   Loaded: loaded (/lib/systemd/system/nginx.service; enabled)
   Active: failed (Result: exit-code) since Tue 10:04:12; 22min ago
  Process: 891 ExecStart=/usr/sbin/nginx (code=exited, status=1/FAILURE)
</pre>
<p><code>Active: failed</code> plus a non-zero exit code is your starting point — the next move is always <code>journalctl -u SERVICE</code> (next card) to see WHY it exited.</p>
<p>Where units live: <code>/etc/systemd/system/</code> (local overrides, wins) and <code>/lib/systemd/system/</code> or <code>/usr/lib/systemd/system/</code> (package-installed defaults). After hand-editing a unit file, run <code>systemctl daemon-reload</code> or your edit is silently ignored.</p>`,
  pitfalls:[
    "<code>enable</code> alone does not start the service now — it only wires it into the boot sequence. People expect enable to mean 'running'; use <code>enable --now</code> for both.",
    "Editing a unit file directly and forgetting <code>systemctl daemon-reload</code> means systemd keeps using its old in-memory copy — your change appears to do nothing.",
    "A service that is 'active (running)' but not actually working (e.g. crash-looping and restarting fast) can still show green-ish status. Check <code>Active</code> line's uptime — seconds-old means it just restarted, look at why."
  ],
  items:[
    {type:"mcq", q:"After a reboot, what's the fastest single command to see everything that failed to start?",
     choices:["systemctl status","systemctl list-units --failed","ps aux","journalctl -b"],
     correct:1, explain:"systemctl list-units --failed lists only failed units directly — much faster than checking services one by one."},
    {type:"mcq", q:"You ran systemctl enable app.service. Is it running right now?",
     choices:["Yes, enable always starts it","Not necessarily — enable only configures it to start on the NEXT boot, unless you added --now","Only if you also reboot","enable is only for disabling"],
     correct:1, explain:"enable wires the unit into boot targets (symlinks); it does not touch the current running state. Use 'enable --now' to do both at once."},
    {type:"input", q:"Command to make systemd reread a unit file you just hand-edited, before restarting the service? (two words)",
     accept:["daemon-reload","systemctl daemon-reload"], explain:"systemctl daemon-reload reloads unit definitions from disk. Skip it and your edits are invisible to systemd until the next reboot."}
  ]},

{ id:"t4-logs", title:"Logs: journalctl and /var/log", prereqs:["t4-systemd"],
  why:"\"Why did it crash\" and \"what happened before it crashed\" both live here. This is the single most-used diagnostic skill on Linux.",
  body:`
<pre>journalctl -u app.service         all logs for one systemd unit
journalctl -u app.service -f       follow it live (like tail -f)
journalctl -u app.service --since "10 min ago"
journalctl -b                      logs since the current boot
journalctl -b -1                   logs from the PREVIOUS boot — read this after an unexpected reboot
journalctl -p err -b               only priority "error" or worse, this boot
journalctl -k                      kernel messages only (same content as dmesg)</pre>
<p>Priority levels, worst to best: <code>emerg alert crit err warning notice info debug</code>. <code>-p err</code> means "err and everything more severe" (err, crit, alert, emerg).</p>
<p>Classic flat-file logs, still present alongside the journal on most distros:</p>
<pre>/var/log/syslog           Debian/Ubuntu general system log
/var/log/messages         RHEL/CentOS/SUSE equivalent
/var/log/auth.log         Debian/Ubuntu authentication (ssh, sudo)
/var/log/secure           RHEL equivalent
/var/log/dmesg            kernel ring buffer at last boot (also: the dmesg command, live)
/var/log/kern.log         kernel-only messages (Debian/Ubuntu)
/var/log/audit/audit.log  SELinux/audit subsystem, if enabled
/var/log/cron             cron job execution log</pre>
<p><code>dmesg -T | tail -50</code> — human-readable timestamps (-T) on the last 50 kernel lines; this is usually the fastest way to see a driver failure, disk error, or OOM kill.</p>`,
  pitfalls:[
    "By default <code>journalctl</code> may be size- or time-limited (see <code>journalctl --disk-usage</code>) — if you need history from weeks ago and it's gone, that's expected, not a bug, unless persistent logging (<code>/var/log/journal/</code>) was never enabled.",
    "<code>journalctl -b -1</code> only works if the previous boot's logs were persisted to disk. On a system with volatile-only journal storage, a hard crash can lose exactly the logs you most need.",
    "grepping <code>/var/log/syslog</code> and finding nothing does not mean nothing happened — the service might log only to the journal, or to its own log file under <code>/var/log/<app>/</code>."
  ],
  items:[
    {type:"mcq", q:"The box rebooted unexpectedly overnight. Which command shows logs from right before that reboot?",
     choices:["journalctl -b","journalctl -b -1","dmesg","journalctl -f"],
     correct:1, explain:"journalctl -b -1 shows the previous boot's journal — exactly the window you need to see what happened just before an unexpected restart."},
    {type:"input", q:"Command to see only kernel ring-buffer messages, live? (one word)",
     accept:["dmesg"], explain:"dmesg prints the kernel ring buffer — driver errors, hardware faults, OOM kills. journalctl -k shows the same data via the journal."},
    {type:"mcq", q:"journalctl -u app.service -p err -b shows:",
     choices:["Every log line ever for that service","Error-or-worse priority lines for that service, this boot only","Only lines containing the word 'error'","Nothing — invalid combination of flags"],
     correct:1, explain:"-p err filters by severity (err and worse: err/crit/alert/emerg), -b restricts to the current boot, -u restricts to the unit. Combine freely."}
  ]},

{ id:"t4-disk", title:"Disk and filesystem diagnostics", prereqs:["t4-nav"],
  why:"\"Disk full\" and \"disk full but df says there's space\" are two different, common failures — and they need different commands.",
  body:`
<pre>df -h                          disk usage BY FILESYSTEM (mounted volumes), human sizes
du -sh /var/log                disk usage of a DIRECTORY, summarised (-s), human sizes
du -h /var/log | sort -rh | head -20   biggest subdirectories under /var/log, top 20
lsblk                          block devices and their partitions/mounts, as a tree
mount | grep /data              is this path actually mounted, and with what options?
findmnt /data                   same idea, cleaner output</pre>
<p><code>df -h</code> and <code>du -sh</code> disagree in one classic case: a process still has a <b>deleted</b> file open. The file is unlinked (invisible to du/ls) but the space isn't freed until the process closes it or exits.</p>
<pre>$ lsof +L1                       # files with 0 remaining links (deleted, still open)
COMMAND   PID  USER  FD   TYPE DEVICE SIZE/OFF  NLINK NAME
app-log  4821  svc   3w   REG   8,1   4.2G       0    /var/log/app.log (deleted)</pre>
<p>Fix: restart or signal the holding process (e.g. <code>kill -HUP</code> for log rotation, or a real restart) so it releases the handle. Killing the process it belongs to is the reliable option if you can't rotate cleanly.</p>
<p>A second classic: <code>df -h</code> shows free bytes but writes still fail with "No space left on device" — you've run out of <b>inodes</b> (metadata slots), typically from millions of tiny files:</p>
<pre>df -i                          inode usage per filesystem — IUse% at 100% is the tell</pre>`,
  pitfalls:[
    "'df says 2% free but du on the whole tree adds up to way less than used' → suspect a deleted-but-open file. Check <code>lsof +L1</code> before hunting for phantom files that don't exist anymore.",
    "<code>du</code> without <code>-s</code> recurses and prints every subdirectory — on a big tree that's an enormous, mostly useless wall of text. Always start with <code>-sh</code> at the top, narrow from there.",
    "Filling the filesystem that holds <code>/</code> (root) can prevent even login and basic commands from working, since temp files and libraries may fail to write — this is worse than a full data-only mount."
  ],
  items:[
    {type:"mcq", q:"df -h shows a filesystem is 98% full, but manually summing du -sh across every directory only accounts for 40%. Most likely cause?",
     choices:["df is buggy","A process holds a deleted file open, so its space hasn't actually been freed","The disk is failing","You need to run du as root"],
     correct:1, explain:"Deleting a file only unlinks its directory entry. If a process still has the file descriptor open, the blocks stay allocated and invisible to du until that handle closes."},
    {type:"input", q:"Which command shows inode usage per filesystem (not byte usage)? (df with a flag — 'df -X')",
     accept:["df -i","-i"], explain:"df -i shows IUse% — 100% means you're out of inode slots even though byte-space (df -h) may look fine."},
    {type:"mcq", q:"Fastest way to find the biggest subdirectories under /var/log?",
     choices:["ls -la /var/log","du -h /var/log | sort -rh | head -20","df -h /var/log","cat /var/log/*"],
     correct:1, explain:"du -h gives per-directory sizes; piping through sort -rh (reverse, human-numeric aware) then head narrows straight to the worst offenders."}
  ]},

{ id:"t4-crash", title:"Crash dumps and OOM kills on Linux", prereqs:["t4-logs","t4-procs"],
  why:"Two distinct 'crash' stories exist on Linux: a single process dying and leaving a core dump, and the kernel itself killing something (or panicking). Knowing which one you're looking at changes where you dig.",
  body:`
<h3>Application crashes — core dumps</h3>
<p>A core dump is a snapshot of a process's memory at the moment it crashed (segfault, abort). Two things must both be true for one to be written:</p>
<pre>ulimit -c                     current core-dump size limit for THIS shell — 0 means disabled
ulimit -c unlimited            enable for this shell/session (not persistent)
cat /proc/sys/kernel/core_pattern   where the kernel actually WRITES cores
  core                              -&gt; current working directory of the crashed process, filename "core"
  |/usr/share/apport/apport %p ...  -&gt; piped to a handler (Ubuntu's apport) instead of a plain file
  /var/crash/core.%e.%p.%t          -&gt; a fixed path with process name/PID/timestamp</pre>
<p>Once you have a core file, <code>gdb</code> gives you a backtrace without needing to reproduce the crash:</p>
<pre>gdb /usr/bin/app core.app.4821
(gdb) bt              backtrace — the call stack at the moment of the crash</pre>
<h3>Kernel-level crashes</h3>
<pre>dmesg -T | grep -i -E "panic|oops|segfault"     recent kernel-level faults, human timestamps
journalctl -k -b -1                              kernel log from the previous boot (after a hard crash)</pre>
<p><b>kdump</b> is the mechanism for capturing a full memory image when the <em>kernel itself</em> panics (not a normal reboot): a small reserved-memory secondary kernel boots, dumps RAM to <code>/var/crash/</code>, then reboots normally. Check whether it's configured:</p>
<pre>systemctl status kdump          (RHEL/SUSE naming — kdump.service)
ls /var/crash/                  where captured vmcore images land, if kdump fired</pre>
<h3>The OOM killer</h3>
<p>When memory is exhausted, the kernel picks a process to sacrifice rather than let the whole system deadlock. This is the single most common "why did my process just disappear with no error" cause:</p>
<pre>$ dmesg -T | grep -i "killed process"
[Tue Sep  3 03:14:07] Out of memory: Killed process 4821 (app-worker) total-vm:9872112kB</pre>
<p>No exception, no core dump, no log from the app itself — it's simply gone. The proof lives in dmesg/journalctl -k, never in the application's own logs.</p>`,
  pitfalls:[
    "A process 'just disappearing' with nothing in its own log is the OOM-killer's signature — check <code>dmesg</code> before assuming the application has a bug.",
    "<code>ulimit -c unlimited</code> set in an interactive shell does NOT apply to a service started by systemd or at boot — for those, set <code>LimitCORE=infinity</code> in the unit file instead.",
    "A full disk on the core-dump path silently prevents the dump from being written — you'll see the crash in the log but find no core file. Check free space before assuming the crash left no evidence."
  ],
  items:[
    {type:"mcq", q:"A service vanishes with no error, no core dump, nothing in its own log. Where do you look first?",
     choices:["The application's own log file again, more carefully","dmesg / journalctl -k, for an OOM-killer message","The network switch logs","/etc/passwd"],
     correct:1, explain:"A silent disappearance with zero self-logged error is the classic OOM-killer fingerprint — the kernel terminates the process before it gets a chance to log anything."},
    {type:"input", q:"Which kernel file tells you where core dumps actually get written? (path under /proc/sys/kernel)",
     accept:["/proc/sys/kernel/core_pattern","core_pattern"], explain:"core_pattern controls the destination — a bare filename, a fixed path with %e/%p/%t tokens, or a pipe to a handler like apport."},
    {type:"mcq", q:"What does kdump actually capture, and when?",
     choices:["A per-process core file, on any crash","A full memory image (vmcore), specifically when the KERNEL itself panics","Network packet captures","Disk SMART data"],
     correct:1, explain:"kdump is for kernel panics, not application crashes — it boots a secondary kernel from reserved memory to write out a full RAM image to /var/crash/, useful when the whole box, not just one process, went down."}
  ]},

{ id:"t4-paths", title:"Essential Linux paths cheat sheet", prereqs:["t4-nav"],
  why:"Knowing where things live without searching is what separates fast triage from slow triage. This is the map.",
  body:`
<table>
<tr><th>Path</th><th>What lives there</th></tr>
<tr><td><code>/etc</code></td><td>system-wide configuration — nearly everything you'll hand-edit</td></tr>
<tr><td><code>/etc/hosts</code></td><td>static name→IP mappings, see T1's /etc/hosts card</td></tr>
<tr><td><code>/etc/systemd/system/</code></td><td>local systemd unit overrides — wins over package defaults</td></tr>
<tr><td><code>/var/log</code></td><td>logs — syslog, auth.log, dmesg, per-app subdirectories</td></tr>
<tr><td><code>/var/crash</code></td><td>kdump vmcore images and (on some distros) app crash reports</td></tr>
<tr><td><code>/proc</code></td><td>live kernel/process state as a virtual filesystem — not real files on disk</td></tr>
<tr><td><code>/proc/cpuinfo</code>, <code>/proc/meminfo</code></td><td>CPU and memory info, machine-readable</td></tr>
<tr><td><code>/proc/&lt;pid&gt;/</code></td><td>everything about one running process — cmdline, environ, open fds under fd/</td></tr>
<tr><td><code>/sys</code></td><td>kernel device/driver state — hardware, not processes</td></tr>
<tr><td><code>/boot</code></td><td>kernel images, initramfs, bootloader config (grub)</td></tr>
<tr><td><code>/tmp</code></td><td>temporary files — often cleared on reboot, world-writable</td></tr>
<tr><td><code>/opt</code></td><td>third-party / manually-installed application software, by convention</td></tr>
<tr><td><code>/home/&lt;user&gt;</code></td><td>per-user files and dotfile configs (<code>~/.bashrc</code> etc.)</td></tr>
<tr><td><code>/root</code></td><td>the root user's home — not the same as <code>/</code></td></tr>
<tr><td><code>~/.ssh/</code></td><td>SSH keys and <code>known_hosts</code> — relevant when MobaXterm/WinSCP auth fails</td></tr>
</table>
<p><code>/proc</code> is worth a second look: it's a live window into the kernel, not a normal directory. <code>cat /proc/&lt;pid&gt;/status</code> shows a process's exact memory and state; <code>ls /proc/&lt;pid&gt;/fd</code> lists every file descriptor it holds open — the same technique behind the <code>lsof +L1</code> trick from the disk-diagnostics card.</p>`,
  pitfalls:[
    "Editing a file under <code>/proc</code> or <code>/sys</code> changes live kernel state immediately, with no confirmation and often no persistence across reboot — treat both as 'handle with care', not as normal config files.",
    "<code>/root</code> is the root user's home directory; it is not the same thing as <code>/</code> (filesystem root). Confusing them in a path sends you to the wrong place entirely.",
    "<code>/tmp</code> being world-writable and sometimes cleared on reboot means it is the wrong place for anything you need to survive a restart."
  ],
  items:[
    {type:"mcq", q:"Where do local systemd unit file overrides live, taking priority over package-installed defaults?",
     choices:["/usr/lib/systemd/system/","/etc/systemd/system/","/var/systemd/","/boot/systemd/"],
     correct:1, explain:"/etc/systemd/system/ is for local admin overrides and wins over the package-provided units under /lib or /usr/lib/systemd/system/."},
    {type:"input", q:"Which virtual filesystem gives you live info about running processes — /proc/<pid>/status etc? (one word, path)",
     accept:["/proc","proc"], explain:"/proc is a kernel-generated virtual filesystem reflecting live process and kernel state, not files stored on disk."},
    {type:"mcq", q:"Which directory holds kernel images and the bootloader configuration?",
     choices:["/opt","/boot","/sys","/root"],
     correct:1, explain:"/boot holds the kernel, initramfs, and grub config — what the machine reads before the main OS is even running."}
  ]},

{ id:"t4-shortcuts", title:"Terminal shortcuts and staying connected: tmux/screen", prereqs:["t4-nav"],
  why:"An SSH session that drops mid-task kills whatever you were running — unless it was inside a multiplexer. And a handful of keystrokes save minutes every single day.",
  body:`
<h3>Line-editing shortcuts (readline — works in bash, most shells)</h3>
<pre>Ctrl+A / Ctrl+E     jump to start / end of the line
Ctrl+U / Ctrl+K      delete from cursor to start / to end of the line
Ctrl+W               delete the previous word
Ctrl+R               reverse-search command history — start typing, it finds the last match
Ctrl+L               clear the screen (same as 'clear')
Ctrl+C                interrupt/kill the current foreground command
Ctrl+Z                SUSPEND the current command (doesn't kill it — see 'fg'/'bg'/'jobs' below)
Tab / Tab-Tab          complete a path or command / show all matches if ambiguous</pre>
<pre>command &amp;             run in the background immediately
Ctrl+Z, then bg        suspend a running command, then resume it in the background
fg                     bring the (most recent) background/suspended job to the foreground
jobs                   list background/suspended jobs in this shell</pre>
<h3>Staying connected: tmux</h3>
<p>The problem tmux solves: your SSH connection drops (laptop sleeps, VPN blips, MobaXterm session closes) and every command running in that shell dies with it — unless it was inside tmux.</p>
<pre>tmux new -s work        start a new named session called "work"
                          ... do your work, run long commands ...
Ctrl+B then D            DETACH — session keeps running, you're back at your normal shell
tmux ls                  list sessions still running
tmux attach -t work      reattach — exactly where you left off, even from a different terminal</pre>
<p><code>screen</code> is the older equivalent (<code>screen -S work</code>, <code>Ctrl+A D</code> to detach, <code>screen -r</code> to reattach) — same idea, different keybindings, still common on older systems.</p>`,
  pitfalls:[
    "<code>Ctrl+Z</code> suspends, it does not kill. A 'stopped' job left forgotten and suspended is a common source of 'why is this still using the port/lock' confusion — check <code>jobs</code>.",
    "Starting a long-running command directly over SSH without tmux/screen and then losing the connection kills it — even <code>nohup command &amp;</code> is a partial workaround; a real multiplexer session is more reliable and lets you reattach and see live output.",
    "tmux's default prefix is Ctrl+B, not Ctrl+A — screen uses Ctrl+A. Running the wrong keybinding in the wrong tool does nothing useful and is a common early mixup."
  ],
  items:[
    {type:"mcq", q:"You start a long migration script directly over a plain SSH session with no tmux. Your laptop sleeps and the connection drops. What happens to the script?",
     choices:["It keeps running unaffected","It is killed along with the shell that spawned it","It pauses and resumes automatically on reconnect","It is unaffected only if you used &"],
     correct:1, explain:"A process tied to a terminal normally dies (SIGHUP) when that terminal's connection drops. tmux/screen decouple the process from the SSH session so it survives the disconnect."},
    {type:"input", q:"In tmux, what's the keystroke sequence to detach and leave the session running? (prefix key, then letter)",
     accept:["ctrl+b d","ctrl-b d","c-b d"], explain:"Ctrl+B is tmux's default prefix; pressing D after it detaches. tmux attach -t <name> brings you back."},
    {type:"mcq", q:"Ctrl+Z on a running command does what?",
     choices:["Kills it immediately","Suspends it (stopped, resumable with fg/bg)","Undoes the last command","Clears the terminal"],
     correct:1, explain:"Ctrl+Z sends SIGTSTP, suspending the process. It's still there — 'jobs' lists it, 'fg' resumes it in the foreground, 'bg' resumes it in the background."}
  ]},

{ id:"t4-editors", title:"Editing files without a GUI: nano and vim", prereqs:["t4-nav"],
  why:"A custom or headless Linux box usually has no desktop — every config edit happens in a terminal editor. Knowing how to save and quit without help text is not optional.",
  body:`
<h3>nano — simple, the shortcuts are on screen</h3>
<pre>nano /etc/hosts
  Ctrl+O   write out (save)      Ctrl+X   exit
  Ctrl+K   cut a line             Ctrl+U   paste it back
  Ctrl+W   search</pre>
<p>nano prints its own shortcut bar at the bottom of the screen (<code>^</code> means Ctrl) — when in doubt, read it. It's the safe default if vim isn't installed or you just need to change one line fast.</p>
<h3>vim — the one you'll actually find everywhere</h3>
<p>vim has <b>modes</b>. This single fact explains almost all vim confusion: keys do different things depending which mode you're in.</p>
<pre>vim /etc/hosts

NORMAL mode (where you land on open) — keys are COMMANDS, not text
  i        enter INSERT mode, start typing text before the cursor
  Esc      back to NORMAL mode from anywhere — the universal "get me out" key
  :wq      (in NORMAL mode) write and quit
  :q!      quit WITHOUT saving — discard changes
  :w       save without quitting
  dd       delete (cut) the current line
  yy       yank (copy) the current line
  p        paste after the cursor
  /pattern  search forward for "pattern", n = next match
  gg / G    jump to top / bottom of the file</pre>
<p>The one sequence worth memorising cold, because it gets you unstuck from anywhere: <b>Esc</b>, then <code>:wq</code> and Enter to save-and-quit, or <b>Esc</b> then <code>:q!</code> and Enter to abandon changes entirely.</p>`,
  pitfalls:[
    "Typing text while still in NORMAL mode doesn't insert it — each letter is interpreted as a command, which can silently delete or move things. If the screen starts doing unexpected things, press Esc first, then figure out what mode you're actually in.",
    "Opening vim and being unable to figure out how to exit is common enough to be a running joke — the fix is always the same: Esc, then :q! (discard) or :wq (save and quit).",
    "vim on a fresh minimal install may be the cut-down 'vi' rather than full vim — some conveniences (syntax highlighting, undo depth) differ, but the modal Esc/:wq basics are identical."
  ],
  items:[
    {type:"mcq", q:"You're stuck in vim and just want out without saving any accidental changes. What do you press?",
     choices:["Ctrl+C","Esc, then type :q! and Enter","Alt+F4","Ctrl+X"],
     correct:1, explain:"Esc guarantees you're in NORMAL mode; :q! then discards any changes and quits. :wq instead would save first."},
    {type:"mcq", q:"In vim, what does pressing 'i' do?",
     choices:["Inserts the current line into a buffer","Switches from NORMAL to INSERT mode so typed keys become text","Immediately saves the file","Indents the current line"],
     correct:1, explain:"'i' is a NORMAL-mode command that switches to INSERT mode. Only in INSERT mode does typing add text to the file."},
    {type:"input", q:"nano keyboard shortcut to save (\"write out\")? (Ctrl+ which letter)",
     accept:["ctrl+o","ctrl-o","^o"], explain:"Ctrl+O writes out (saves) in nano; Ctrl+X exits. Both are shown on nano's own bottom shortcut bar."}
  ]},

{ id:"t4-users", title:"Users and groups: who can do what", prereqs:["t4-perm"],
  why:"Beyond a single chmod, real triage sometimes needs 'which users exist, which groups do they belong to, and why does this one account behave differently.'",
  body:`
<pre>whoami                  who am I logged in as
id                       my UID, GID, and every group I belong to
id svcuser                same, for another user
groups svcuser            just the group list for that user
cat /etc/passwd           every local account: name:x:UID:GID:comment:home:shell
cat /etc/group            every local group and its members</pre>
<pre>$ id svc
uid=1002(svc) gid=1002(svc) groups=1002(svc),27(sudo),999(docker)</pre>
<p>Group membership is often the real reason a specific account can or can't do something — e.g. membership in <code>sudo</code>/<code>wheel</code> grants sudo rights; membership in <code>docker</code> grants effective root via the Docker socket, without ever touching <code>/etc/sudoers</code> directly.</p>
<pre>sudo useradd -m -s /bin/bash newuser    create a user, with a home dir (-m) and shell (-s)
sudo passwd newuser                      set/change that user's password
sudo usermod -aG docker svc              ADD svc to the docker group (-aG = append, don't replace)
sudo userdel -r olduser                  delete a user AND their home directory (-r)</pre>
<p><code>/etc/shadow</code> holds the actual password hashes (not <code>/etc/passwd</code>, historically) and is readable only by root — <code>cat /etc/shadow</code> as a normal user is expected to fail with Permission denied.</p>`,
  pitfalls:[
    "<code>usermod -G</code> without <code>-a</code> REPLACES a user's entire group list instead of adding to it — a common way to accidentally strip someone's existing group memberships (like sudo) while trying to add one new group.",
    "A user account existing in <code>/etc/passwd</code> doesn't mean they can log in interactively — check the shell field (last colon-separated value); <code>/usr/sbin/nologin</code> or <code>/bin/false</code> means service accounts that exist for ownership purposes only.",
    "Group changes (via usermod) don't apply to sessions already open — the user (or their already-running processes) needs to log out and back in, or run <code>newgrp groupname</code>, before the new membership takes effect."
  ],
  items:[
    {type:"mcq", q:"You run 'usermod -G docker svc' (no -a flag). What actually happens to svc's other group memberships?",
     choices:["They are preserved, docker is simply added","They are REPLACED — svc now belongs ONLY to docker (plus primary group), losing any other groups like sudo","Nothing happens without -a","It throws an error"],
     correct:1, explain:"Without -a (append), -G replaces the entire supplementary group list. This is a very common accidental-privilege-loss mistake — always use -aG to add."},
    {type:"input", q:"Command to see a user's UID, GID, and full group membership in one line? (one word)",
     accept:["id"], explain:"id (or id username) shows uid, gid, and every group — the fastest single check for 'why can/can't this account do X'."},
    {type:"mcq", q:"A service account's shell in /etc/passwd is /usr/sbin/nologin. What does that mean?",
     choices:["The account is broken","The account exists (e.g. for file ownership) but cannot be used for an interactive login","The account has no password","The account is an admin account"],
     correct:1, explain:"/usr/sbin/nologin (or /bin/false) is a deliberate convention for service/system accounts that should never get an interactive shell, even though the account itself is valid."}
  ]},

{ id:"t4-pkg", title:"Package management: apt, dnf/yum, and what's installed", prereqs:["t4-nav"],
  why:"Different distro families use different package managers. Knowing both families' basic verbs means you're not stuck the first time you hit a RHEL box after only ever using Ubuntu, or vice versa.",
  body:`
<table>
<tr><th>Task</th><th>Debian/Ubuntu (apt)</th><th>RHEL/CentOS/Fedora (dnf, older: yum)</th></tr>
<tr><td>update package index</td><td><code>sudo apt update</code></td><td>(dnf checks automatically)</td></tr>
<tr><td>upgrade installed packages</td><td><code>sudo apt upgrade</code></td><td><code>sudo dnf upgrade</code></td></tr>
<tr><td>install a package</td><td><code>sudo apt install nginx</code></td><td><code>sudo dnf install nginx</code></td></tr>
<tr><td>remove a package</td><td><code>sudo apt remove nginx</code></td><td><code>sudo dnf remove nginx</code></td></tr>
<tr><td>search for a package</td><td><code>apt search keyword</code></td><td><code>dnf search keyword</code></td></tr>
<tr><td>is X installed? version?</td><td><code>dpkg -l | grep nginx</code></td><td><code>rpm -qa | grep nginx</code></td></tr>
<tr><td>which package owns this file?</td><td><code>dpkg -S /usr/sbin/nginx</code></td><td><code>rpm -qf /usr/sbin/nginx</code></td></tr>
<tr><td>list files a package installed</td><td><code>dpkg -L nginx</code></td><td><code>rpm -ql nginx</code></td></tr>
</table>
<p>"Which package owns this file" is the diagnostic move worth remembering — when you find a binary or config and don't know where it came from, <code>dpkg -S</code> / <code>rpm -qf</code> answers it directly instead of guessing.</p>`,
  pitfalls:[
    "On Debian/Ubuntu, forgetting <code>sudo apt update</code> before <code>install</code> on a box that hasn't refreshed its index in a while can fail to find a package or a fix that genuinely exists in the repo — update the index first when something 'isn't found' unexpectedly.",
    "<code>apt remove</code> leaves configuration files behind by default (for a clean reinstall later); <code>apt purge</code> removes those too — different result, same-sounding intent. Know which one you actually want.",
    "Mixing package-manager-installed and manually-compiled/copied versions of the same tool is a classic 'why is the old version still running' trap — check <code>which toolname</code> and compare against where the package manager says it installed to."
  ],
  items:[
    {type:"mcq", q:"You find an unfamiliar binary at /usr/sbin/nginx on a Debian box and want to know which package put it there. Command?",
     choices:["apt search nginx","dpkg -S /usr/sbin/nginx","dpkg -L nginx","apt list nginx"],
     correct:1, explain:"dpkg -S FILEPATH answers 'which installed package owns this exact file' — the reverse lookup from file to package. dpkg -L goes the other direction (package to files)."},
    {type:"input", q:"RHEL/Fedora package manager command family used in modern versions (replaced yum)? (one word)",
     accept:["dnf"], explain:"dnf is the modern successor to yum on RHEL/Fedora-family distros; yum commands still mostly work as aliases on many systems."},
    {type:"mcq", q:"Difference between 'apt remove' and 'apt purge'?",
     choices:["No difference","remove uninstalls the package but leaves its config files; purge removes both the package and its config files","purge is faster","remove requires sudo, purge doesn't"],
     correct:1, explain:"remove keeps config files (useful if you plan to reinstall later with the same settings); purge removes everything, a genuinely clean uninstall."}
  ]},

{ id:"t4-netcfg", title:"Linux network configuration and the local firewall", prereqs:["t4-nav"],
  why:"T1-T3 cover how IP/switching/multicast WORK. This card covers the Linux-side commands to actually inspect and change a host's own network config and firewall — a different, complementary skill.",
  body:`
<pre>ip addr show               (or: ip a) — every interface, its IP(s), and state (UP/DOWN)
ip link show                 interfaces at Layer 2 — MTU, MAC, link state
ip route show                 the routing table — where does traffic to X actually go
ss -tulpn                     listening TCP/UDP sockets, with the owning process — modern netstat
ss -tan                       all TCP connections and their state (ESTABLISHED, TIME_WAIT, ...)
ethtool eth0                  link speed/duplex, and whether a cable is actually detected
nmcli device status            NetworkManager's view of every interface, if NetworkManager manages this box</pre>
<p>Two very different network-config systems exist across distros — check which one owns this box before editing anything by hand:</p>
<pre>NetworkManager (most desktop + many server installs)  -&gt; nmcli, or /etc/NetworkManager/
netplan (Ubuntu server default)                         -&gt; /etc/netplan/*.yaml, applied with 'sudo netplan apply'
systemd-networkd                                        -&gt; /etc/systemd/network/*.network</pre>
<h3>Local firewall</h3>
<pre>sudo ufw status verbose        Ubuntu's simplified firewall front-end — is it even on?
sudo ufw allow 22/tcp           allow a port
sudo firewall-cmd --state       RHEL/CentOS equivalent check (firewalld)
sudo firewall-cmd --list-all    what's actually allowed right now
sudo iptables -L -n -v          the underlying raw ruleset both of the above configure — the ground truth</pre>
<p>ufw and firewalld are front-ends; iptables (or nftables on newer systems) is the actual enforcement underneath both. When in doubt about what's really blocking a connection, <code>iptables -L -n -v</code> (or <code>nft list ruleset</code>) shows the real rules regardless of which front-end wrote them.</p>`,
  pitfalls:[
    "A service listening correctly (visible in ss -tulpn) can still be unreachable from another host purely because of the local firewall — 'is it listening' and 'is it reachable' are two separate checks, don't stop at the first one.",
    "Editing netplan YAML with wrong indentation fails silently in confusing ways — YAML is whitespace-sensitive; always run 'sudo netplan try' (which auto-reverts if you don't confirm) before 'netplan apply' on a box you're accessing remotely, so a bad config can't lock you out.",
    "ufw showing 'inactive' means the firewall is off entirely — every port is reachable regardless of any 'allow' rules you've configured but never activated with 'ufw enable'."
  ],
  items:[
    {type:"mcq", q:"A service shows as listening in 'ss -tulpn' but a remote host still can't connect. What have you NOT yet ruled out?",
     choices:["Nothing — listening means reachable","The local firewall (ufw/firewalld/iptables) may still be blocking the port","DNS","The service is definitely broken"],
     correct:1, explain:"Listening locally and being reachable from the network are independent — the local firewall can block an otherwise correctly-listening service. Check firewall rules as a separate step."},
    {type:"input", q:"Modern replacement for netstat that shows listening sockets with owning process (with -tulpn)? (two letters)",
     accept:["ss"], explain:"ss is the modern socket-statistics tool; -tulpn = tcp, udp, listening, processes, numeric ports — the direct netstat -tulpn equivalent."},
    {type:"mcq", q:"You want the ground-truth firewall rules regardless of whether ufw or firewalld configured them. Command?",
     choices:["ufw status","firewall-cmd --list-all","iptables -L -n -v (or nft list ruleset)","ip addr show"],
     correct:2, explain:"ufw and firewalld are front-ends that both ultimately write iptables/nftables rules — iptables -L -n -v (or the nftables equivalent) shows what's actually enforced, independent of which front-end wrote it."}
  ]},

{ id:"t4-ssh", title:"SSH itself: keys, config, and moving files", prereqs:["t4-nav"],
  why:"MobaXterm and WinSCP are GUI wrappers around SSH — but on the Linux box itself (or scripting from one Linux box to another) you need the plain ssh/scp/rsync commands directly.",
  body:`
<pre>ssh svc@10.42.7.10                connect
ssh -p 2222 svc@10.42.7.10         non-default port
ssh -i ~/.ssh/id_deploy svc@host   use a specific private key
ssh svc@host "df -h"                run one remote command and exit, no interactive shell</pre>
<p>Key-based auth, generated once per machine/user you connect FROM:</p>
<pre>ssh-keygen -t ed25519 -C "you@laptop"     generates ~/.ssh/id_ed25519 (private) and .pub (public)
ssh-copy-id svc@10.42.7.10                  installs your public key on the remote's ~/.ssh/authorized_keys</pre>
<p><b>Never share the private key</b> (no <code>.pub</code> extension); the public key is the one that gets copied to servers. <code>~/.ssh/config</code> saves you from retyping options every time:</p>
<pre># ~/.ssh/config
Host app01
    HostName 10.42.7.10
    User svc
    Port 22
    IdentityFile ~/.ssh/id_deploy

# then simply:
$ ssh app01</pre>
<p>Copying files without a GUI tool:</p>
<pre>scp file.txt svc@10.42.7.10:/tmp/          copy TO remote
scp svc@10.42.7.10:/var/log/app.log .       copy FROM remote, to current local dir
scp -r dir/ svc@10.42.7.10:/tmp/            recursive, for a directory
rsync -avz dir/ svc@10.42.7.10:/tmp/dir/    like scp but SYNCS — only transfers changed parts, resumable</pre>
<p>Prefer <code>rsync</code> over <code>scp</code> for anything large or repeated: it transfers only what changed and can resume an interrupted transfer, where scp restarts from zero.</p>`,
  pitfalls:[
    "A file/directory with overly-open permissions under ~/.ssh (e.g. private key readable by others) makes ssh refuse to use it with 'Permissions are too open' — fix with <code>chmod 600 ~/.ssh/id_ed25519</code>.",
    "Confusing which key is public vs private and pasting the private key into a server's authorized_keys does not work and is also a security exposure — only the .pub file ever goes on a remote server.",
    "scp restarting from zero on an interrupted large transfer wastes real time on a flaky link — reach for rsync instead, which resumes and only re-sends the changed bytes."
  ],
  items:[
    {type:"mcq", q:"Which file goes into a remote server's ~/.ssh/authorized_keys — the .pub file or the private key file?",
     choices:["The private key file","The public key file (.pub)","Both, concatenated","Neither — authorized_keys is generated automatically"],
     correct:1, explain:"Only the public key (.pub) is ever copied to a server. The private key stays only on the machine you connect FROM, and is never shared."},
    {type:"input", q:"Command that copies your public key to a remote server's authorized_keys in one step? (two words)",
     accept:["ssh-copy-id"], explain:"ssh-copy-id svc@host handles appending your public key to the remote's authorized_keys file for you."},
    {type:"mcq", q:"You need to transfer a large directory over a flaky link and want it to resume if interrupted rather than restart from zero. Best tool?",
     choices:["scp -r","rsync -avz","cp -r over an SSH mount","cat piped through ssh"],
     correct:1, explain:"rsync transfers only changed/missing data and can resume an interrupted sync, unlike scp which starts over from the beginning on failure."}
  ]},

{ id:"t4-cron", title:"Scheduling: cron and at", prereqs:["t4-nav"],
  why:"Recurring tasks (log rotation, health checks, backups) on Linux run through cron — and a 'why didn't this run' ticket needs you to read crontab syntax fluently, not guess at it.",
  body:`
<pre>crontab -l              list the current user's cron jobs
crontab -e               edit them (opens your default editor — often vi/vim, see the editors card)
sudo crontab -u svc -l    list another user's crontab
/etc/crontab              system-wide crontab — has an EXTRA field: which user to run as
/etc/cron.d/               drop-in system cron files, same extra-user-field format
/etc/cron.daily/ .hourly/ .weekly/   scripts run by run-parts on that cadence — no crontab syntax needed, just drop an executable script in</pre>
<p>Crontab line format — five time fields, then the command:</p>
<pre>*  *  *  *  *  command
|  |  |  |  |
|  |  |  |  +-- day of week (0-6, 0=Sunday, or names)
|  |  |  +----- month (1-12)
|  |  +-------- day of month (1-31)
|  +----------- hour (0-23)
+-------------- minute (0-59)

Examples:
0 2 * * *      every day at 02:00
*/15 * * * *    every 15 minutes
0 0 1 * *       midnight on the 1st of every month
0 9 * * 1-5     09:00, Monday through Friday</pre>
<p><code>at</code> is cron's one-shot cousin — run something once, at a specific future time, rather than on a recurring schedule:</p>
<pre>echo "systemctl restart app" | at 23:30
atq                        list pending 'at' jobs
atrm 3                     cancel job number 3</pre>`,
  pitfalls:[
    "A cron job that works fine when you run the command manually often fails silently under cron because cron runs with a minimal environment — no full PATH, no interactive shell's aliases/profile. Always use absolute paths for commands inside crontab entries.",
    "cron's output isn't shown anywhere by default — mail it or redirect it: append <code>&gt;&gt; /var/log/myjob.log 2&gt;&amp;1</code> to the command, or the job silently succeeds/fails with zero visible trace.",
    "The system-wide /etc/crontab and /etc/cron.d/ files have an extra 'which user' field that a personal 'crontab -e' file does NOT have — copying a line between the two formats without adjusting it breaks silently or errors."
  ],
  items:[
    {type:"input", q:"crontab entry to run a command every day at 2:00 AM — the five time fields only, space-separated (e.g. '0 2 * * *')",
     accept:["0 2 * * *"], explain:"minute=0, hour=2, every day-of-month, every month, every day-of-week → 02:00 daily."},
    {type:"mcq", q:"A cron job works when you run the exact same command manually, but fails under cron. Most common cause?",
     choices:["cron is broken","cron runs with a minimal environment (limited PATH, no shell profile) — use absolute paths","The crontab syntax is always wrong","Cron jobs can't call scripts"],
     correct:1, explain:"cron does not source your interactive shell's profile/aliases and has a minimal PATH — a command that resolves fine interactively can be 'not found' under cron unless you use full absolute paths."},
    {type:"mcq", q:"You want to run something exactly ONCE, at 11:30pm tonight, not on a recurring schedule. Which tool?",
     choices:["cron","at","systemd-analyze","anacron"],
     correct:1, explain:"at schedules a one-time future job; cron is for recurring schedules. atq lists pending at jobs, atrm cancels one."}
  ]},

{ id:"t4-sysinfo", title:"System info and archives at a glance", prereqs:["t4-nav"],
  why:"Before diagnosing anything specific, you often need the basic shape of the machine — what OS, how much RAM, how many cores — and archives are how logs/configs get packaged up to move or preserve.",
  body:`
<pre>hostnamectl              hostname, OS, kernel version, architecture, virtualization — one clean summary
uname -a                  kernel name/version/architecture, older/more universal than hostnamectl
lscpu                     CPU model, core/thread count, architecture
free -h                   memory: total/used/free/available, human-readable
uptime                    how long since boot, plus load average (same numbers top shows)
lsblk                     block devices/partitions as a tree (also in the disk card)
lspci                      PCI hardware — network cards, GPUs, controllers
lsusb                      USB devices attached</pre>
<pre>$ free -h
              total    used    free   shared  buff/cache  available
Mem:           15Gi    3.2Gi   8.1Gi   120Mi      3.9Gi       11Gi</pre>
<p><code>available</code> is the number that matters, not <code>free</code> — Linux deliberately uses spare RAM for disk cache (<code>buff/cache</code>) since it's free to reclaim instantly when an app needs it. A small "free" number with a large "available" number is normal, healthy behaviour, not a problem.</p>
<h3>Archives</h3>
<pre>tar -czvf backup.tar.gz /etc/nginx/     create (c), gzip (z), verbose (v), file (f) — a .tar.gz archive
tar -xzvf backup.tar.gz                  extract
tar -tzvf backup.tar.gz                  list contents WITHOUT extracting — check before you unpack
zip -r archive.zip folder/                zip instead of tar, if you need Windows-native compatibility
unzip archive.zip</pre>`,
  pitfalls:[
    "Reading 'free' memory as the health indicator instead of 'available' is the single most common Linux memory misunderstanding — a mostly-full 'used' column with high buff/cache is completely normal, not a leak.",
    "tar's flag order matters with the classic short form — 'tar -xzvf file.tar.gz' works, but forgetting the mode flag (x for extract vs c for create) on an existing archive will silently overwrite it if you meant extract but typed create.",
    "Always run 'tar -tzvf' to preview contents before extracting an unfamiliar archive into a directory you care about — tar extracts using the paths stored inside the archive, which can include unexpected subdirectories."
  ],
  items:[
    {type:"mcq", q:"free -h shows very little in the 'free' column but a large 'available' column. What does this mean?",
     choices:["The system is almost out of memory — urgent problem","Normal — most spare RAM is being used as reclaimable disk cache (buff/cache), which counts as available","A memory leak is in progress","Swap is about to be used"],
     correct:1, explain:"'available' accounts for the fact that buff/cache can be instantly reclaimed if an application needs it. 'free' alone deliberately ignores that reclaimable cache and looks far worse than the real situation."},
    {type:"input", q:"Command to see a quick summary of hostname, OS, and kernel version in one shot? (one word)",
     accept:["hostnamectl"], explain:"hostnamectl gives a clean one-shot summary; uname -a gives similar (older, more universal) kernel-focused info."},
    {type:"mcq", q:"Before extracting an unfamiliar .tar.gz into a shared directory, what should you check first?",
     choices:["Nothing, just extract it","List its contents first with tar -tzvf, to see the paths before they land on disk","Rename the archive","Check its file size only"],
     correct:1, explain:"tar -tzvf lists contents without extracting — worth doing first since tar writes files using whatever paths are stored inside the archive, which can include unexpected or deeply nested directories."}
  ]}

]});
