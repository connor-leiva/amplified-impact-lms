/* HANDOFF COPY (Nov 15, 2026): signed-off Round 2 mockup + the two review nits resolved before generating ref/:
   (1) Cohorts & Sessions Attendance "—" is muted (.mu) like Replay's "—";
   (2) phone Overview Live attendance labels use a fixed 124px column (same as desktop) so all bars start at the same x.
   Nit 3 (row numbers only when the Curriculum table is >= 1100px wide, i.e. 1440) is intended and unchanged.
   Everything else is byte-identical to the signed-off export (see BUILD-SPEC.md for its sha256), except:
   (3) D-239 (Nov 22, 2026, Connor: "Much much better!"): the sidebar is the approved one from handoff/admin-mockup/
       (ADMIN-SIDEBAR-SPEC.md): six rows, one open, the academy logo, the program's own tile, and the collapse that
       travels. build_admin.py's three sidebar blocks, without its today/proposed switch, its new screens or its data.
   (4) D-253 (R-5 Phase 1, Nov 25, 2026, Connor: "This is perfect, create a handoff for Claude code for me."): the frame
       from handoff/admin-mockup/ (ADMIN-RESTRUCTURE-SPEC.md § 3 and Phase 1): Overview, Program, Cohort, People and
       Revenue as single rows, a hairline, then Operations (System Health first) and Access; four pages with tabs, each
       tab one of today's screens with its title dropped and its own tabs as a segmented control; the cohort picker; the
       crumbs; the palette's pages and tabs. build_admin.py's "third pass" edits that make the frame, without its new
       screens (Cohort › Overview, Settings, Submissions, New cohort, Utah Life, Revenue › Summary, the new Curriculum).
       Course settings and Community are the app's own pages (D-174, D-238), not drawn here; their tabs are.
   (5) D-265 (R-5 Phase 6, the same approval): Program's pages from handoff/admin-mockup/ (p3-areas.jsx `Curriculum3`,
       `WeekEdit`; ia-screens.jsx `CourseSet`): Curriculum is the program's weeks, a week is built in sections, and Course
       Settings is drawn, with PLAN.md § 10.8's words. */
/* Amplified Impact LMS — Admin redesign, round 2. One file: admin + console screens.
   Notes: "Design notes.md". Fonts: Geist + Geist Mono from Google Fonts for the mock; the product self-hosts. */
import React from 'react';
import LOGO_APP from '../brand/amplified-impact-academy-app.svg';
import LOGO_ACCELERATOR from './logos/program-accelerator-tile.svg';
const { useState, useEffect, useLayoutEffect, useRef, createContext, useContext, Fragment } = React;

const CSS = `
.arx{height:100vh;display:flex;flex-direction:column;background:#D9D5CA;font-family:Geist,system-ui,sans-serif}
.arx *,.arx *:before,.arx *:after{box-sizing:border-box}
.arx button,.arx input,.arx select,.arx textarea{font:inherit;color:inherit;margin:0}
.mk{background:#15211D;color:#F4F2EC;padding:8px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex:none;font-size:13px}
.mk select,.mk button{height:30px;border-radius:7px;border:1px solid #47534E;background:#202D28;color:#F4F2EC;padding:0 9px;cursor:pointer}
.mk .sg{display:flex;border:1px solid #47534E;border-radius:7px;overflow:hidden}
.mk .sg button{border:0;border-radius:0;background:none}
.mk .sg button.on,.mk button.on{background:#6FD3A5;color:#15211D;border-color:#6FD3A5}
.stg{flex:1;min-height:0;overflow:hidden auto;padding:16px}
.hold{position:relative;margin:0 auto}
.ax{--ink:#15211D;--f2:#46524D;--f3:#5F6A64;--line:#E6E3DA;--line2:#D3CFC3;--bg:#F4F2EC;--sf:#fff;--hov:#FAF9F5;--sub:#F1EFE8;--for:#1F4D40;--forh:#183E33;--mint:#6FD3A5;--tint:#E7F1EB;
--ok:#1D6B45;--okb:#E3F2E8;--info:#2B58A8;--infob:#E7EEF9;--bad:#A93A25;--badb:#FAE9E4;--warn:#7D5207;--warnb:#FAEFD6;
--t:14px;--tl:20px;--m:12px;--ml:16px;--mo:13px;--sh:15px;--h:26px;--hl:32px;--c:32px;--cp:36px;--row:52px;--pad:32px;--pl:22px;
position:absolute;left:0;top:0;transform-origin:0 0;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--ink);font:400 var(--t)/var(--tl) Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased;border:1px solid var(--line2)}
.ax.lap{--pad:24px}
.ax.ph{--t:16px;--tl:24px;--m:16px;--ml:22px;--mo:16px;--sh:17px;--h:24px;--hl:30px;--c:44px;--cp:48px;--pad:16px;--pl:28px}
.ax :focus{outline:none}
.ax :focus-visible{outline:none;box-shadow:0 0 0 2px var(--sf),0 0 0 4px var(--for);border-radius:8px}
.ax input:focus-visible,.ax textarea:focus-visible,.ax select:focus-visible{border-color:var(--for);box-shadow:0 0 0 3px rgba(111,211,165,.4)}
.ax h1{font:600 var(--h)/var(--hl) Geist,sans-serif;letter-spacing:-.02em;margin:0}
.ax h2{font:600 var(--sh)/22px Geist,sans-serif;letter-spacing:-.005em;margin:0}
.ax p{margin:0;text-wrap:pretty}
.mo{font-family:'Geist Mono',ui-monospace,monospace;font-size:var(--mo);letter-spacing:-.01em}
.mu{color:var(--f3)}.s2{color:var(--f2)}.er{margin:0;color:var(--bad)}.me{font-size:var(--m);line-height:var(--ml);color:var(--f3)}.w5{font-weight:500}.w6{font-weight:600}
.el{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tn{font-variant-numeric:tabular-nums}
.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.row.nw{flex-wrap:nowrap}
.col{display:flex;flex-direction:column;gap:16px;min-width:0}.col.s{gap:4px}.col.m{gap:8px}
.sp{flex:1}
.g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.g4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.g5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.gms{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
.lap .g5{grid-template-columns:repeat(6,minmax(0,1fr))}.lap .g5>*{grid-column:span 2}.lap .g5>:nth-child(n+4){grid-column:span 3}.lap .gms{grid-template-columns:minmax(0,1fr) 300px}
.ph .g2,.ph .g3,.ph .gms{grid-template-columns:minmax(0,1fr)}
/* D-269 (R-5 Phase 8): Revenue › Summary's cash by month, from the mockup (ia-screens.jsx). This month is two parts, what
   was collected under what is on its calendar (.rvb's column); a phone keeps the 16px floor, its figures shortened. */
.rvc{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;align-items:end;height:300px}
.rvm{display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;min-width:0}
.rvb{flex:1;width:100%;max-width:72px;display:flex;flex-direction:column;justify-content:flex-end;border-bottom:1px solid var(--line)}
.rvb i{display:block;width:100%;flex:none;border-radius:6px 6px 0 0;background:var(--for)}.rvb i+i{border-radius:0}
.hat{background:repeating-linear-gradient(135deg,#BFE3D0 0 6px,#E7F1EB 6px 12px)!important}
.ph .rvc{gap:6px;height:180px}
.lg{display:inline-flex;align-items:center;gap:6px;font-size:var(--m);color:var(--f2)}.lg i{width:8px;height:8px;border-radius:2px;flex:none;display:block}.ph .g4,.ph .g5{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
/* masquerade banner */
.mq{background:#F7E2A6;color:#3D2A03;border-bottom:1px solid #DDBE66;padding:6px var(--pad);min-height:40px;display:flex;gap:4px 12px;align-items:center;flex-wrap:wrap;flex:none}
.mq .who{flex:1 1 300px;min-width:0}
.mq .b{background:transparent;border-color:#A8842A;color:#3D2A03;box-shadow:none}.mq .b:hover{background:#F0D689}
.mq .b.p{background:#3D2A03;border-color:#3D2A03;color:#fff}.mq .b.p:hover{background:#2A1C02}
.ax.msq{box-shadow:inset 0 0 0 2px #DDBE66}
/* shell */
.shell{flex:1;display:flex;min-height:0}
.sb{width:244px;flex:none;background:var(--sf);border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.sb.rail{width:64px}
.sb-top{height:52px;display:flex;align-items:center;padding:0 16px;flex:none}
.sb.rail .sb-top{justify-content:center;padding:0}
.wm{display:block;flex:none}
.sw{margin:0 8px 8px;display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--sf);cursor:pointer;text-align:left;min-height:44px;width:calc(100% - 16px)}
.sw:hover{background:var(--hov);border-color:var(--line2)}
.sw .tile{width:24px;height:24px;border-radius:6px;background:var(--for);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex:none}
.sb.rail .sw{justify-content:center;padding:0;border:0;min-height:36px}
.nav{flex:1;overflow:auto;padding:4px 8px 16px}
.ng{display:flex;align-items:center;gap:4px;width:100%;height:28px;padding:0 8px;margin-top:8px;border:0;background:none;border-radius:6px;font-size:12px;font-weight:500;color:var(--f3);cursor:pointer;text-align:left}
.ng:hover{color:var(--ink);background:var(--hov)}
.ng svg{transition:transform .15s}.ng.op svg{transform:rotate(90deg)}
.ni{display:flex;align-items:center;gap:10px;width:100%;height:var(--c);padding:0 8px;border:0;background:none;border-radius:8px;font-size:calc(var(--t) - 1px);font-weight:500;color:var(--f2);cursor:pointer;text-align:left;white-space:nowrap}
.ph .ni{font-size:16px}
.ni:hover{background:var(--sub);color:var(--ink)}
.ni.on{background:var(--tint);color:var(--for)}
.ni .ct{margin-left:auto;font-size:11px;font-weight:500;color:var(--f2);background:var(--sf);border:1px solid var(--line);border-radius:999px;padding:0 6px;line-height:16px}
.ph .ni .ct{font-size:16px;line-height:24px;padding:0 8px}
.ph .ng{height:44px;font-size:16px}
.sw1{font-size:13px;line-height:18px}.sw2{font-size:12px;line-height:16px;color:var(--f3)}
.ph .sw1,.ph .sw2{font-size:16px;line-height:22px}.ph .sw .tile{width:36px;height:36px;font-size:16px}.ph .sw{min-height:60px}
.sb.rail .ni{justify-content:center;padding:0;height:36px}
.sb.rail .nav{padding:4px 12px 16px}
.rsep{height:1px;background:var(--line);margin:8px 4px}
.sb-ft{border-top:1px solid var(--line);padding:8px;flex:none;display:flex;flex-direction:column;gap:2px}
.uc{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:8px;min-width:0}
.sb.rail .uc{justify-content:center;padding:6px 0}
.av{width:28px;height:28px;border-radius:50%;background:var(--tint);color:var(--for);font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;flex:none}
.ph .av{width:40px;height:40px;font-size:16px}
.ph .pc .av{display:none}.ph .pc .w6.mo,.ph .pc .w6 .mo{font-weight:500}
.main{scrollbar-gutter:stable}
.ph .pc .me{font-weight:400}.ph .pc .w6 .w5{font-weight:600}
.mainc{flex:1;min-width:0;display:flex;flex-direction:column}
.tb{height:52px;flex:none;display:flex;align-items:center;gap:12px;padding:0 var(--pad);border-bottom:1px solid var(--line)}
.ph .tb{height:56px;padding:0 8px;gap:4px;background:var(--sf)}
.bc{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--f3);min-width:0}
.bc b{font-weight:500;color:var(--ink)}
.srch{height:32px;width:240px;display:flex;align-items:center;gap:8px;padding:0 8px 0 10px;border:1px solid var(--line);border-radius:8px;background:var(--sf);color:var(--f3);cursor:pointer;font-size:13px}
.srch:hover{border-color:var(--line2)}
.kbd{font:500 11px/16px 'Geist Mono',monospace;border:1px solid var(--line);border-radius:4px;padding:0 5px;background:var(--bg);color:var(--f2)}
.ph .kbd{font-size:14px;line-height:22px}
.main{flex:1;overflow:auto;min-height:0}
.pg{max-width:1400px;margin:0 auto;padding:28px var(--pad) 64px;display:flex;flex-direction:column;gap:20px}
.ph .pg{padding:20px 16px 48px;gap:16px}
.hd{display:flex;gap:12px 16px;align-items:flex-end;flex-wrap:wrap}
.hd .b{height:var(--cp);padding:0 14px}
/* controls */
.b{height:var(--c);padding:0 12px;border-radius:8px;border:1px solid var(--line2);background:var(--sf);color:var(--ink);font-weight:500;font-size:calc(var(--t) - 1px);display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;white-space:nowrap;box-shadow:0 1px 1px rgba(21,33,29,.04);transition:background .12s,border-color .12s}
.ph .b{font-size:16px;padding:0 16px}
.b:hover{background:var(--hov);border-color:#C4BFB1}
.b:active{transform:translateY(.5px)}
.b.p{background:var(--for);border-color:var(--for);color:#fff}.b.p:hover{background:var(--forh)}
.b.d{color:var(--bad)}.b.p.d{background:var(--bad);border-color:var(--bad);color:#fff}
.b.q{border-color:transparent;background:none;box-shadow:none;color:var(--f2)}.b.q:hover{background:var(--sub);color:var(--ink)}
.b:disabled{opacity:.45;cursor:not-allowed}
.ib{width:var(--c);height:var(--c);border:0;background:none;border-radius:8px;color:var(--f2);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.ib:hover{background:var(--sub);color:var(--ink)}
.lk{border:0;background:none;padding:0;font-weight:500;color:var(--ink);cursor:pointer;text-align:left;border-radius:4px;max-width:100%}
.lk:hover{color:var(--for);text-decoration:underline;text-decoration-color:var(--mint);text-underline-offset:3px}
.lk.a{color:var(--for)}
.ph .lk{min-height:44px;display:inline-flex;align-items:center}
.ph button.pl{height:44px}
.ph textarea.ine{min-height:44px}
.prc{height:40px}.ph .prc{height:48px}
.in{height:var(--c);padding:0 10px;border:1px solid var(--line2);border-radius:8px;background:var(--sf);width:100%;font-size:var(--t);transition:border-color .12s,box-shadow .12s}
textarea.in{height:auto;padding:8px 10px;line-height:var(--tl);resize:vertical}
select.in{width:auto;max-width:100%;padding-right:28px;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%235F6A64' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.5 6.5 8 10l3.5-3.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;cursor:pointer}
.ph .row>select.in{flex:1 1 130px}
.sin{position:relative;flex:1 1 220px;max-width:320px}.sin .in{padding-left:32px}.sin svg{position:absolute;left:10px;top:50%;margin-top:-8px;color:var(--f3)}
.ph .sin{max-width:none;flex:1 1 150px}.ph .sin svg{margin-top:-9px}
.lab{display:flex;flex-direction:column;gap:6px;font-weight:500;font-size:calc(var(--t) - 1px)}
.ph .lab{font-size:16px}
.ine{border-color:transparent;background:transparent;font-weight:500;padding:0 8px;margin-left:-8px}
.ine:hover{border-color:var(--line2);background:var(--sf)}
.pl{display:inline-flex;align-items:center;gap:5px;height:var(--pl);padding:0 8px;border-radius:999px;font-size:var(--m);font-weight:500;white-space:nowrap;background:var(--sub);color:var(--f2)}
.pl.ok{background:var(--okb);color:var(--ok)}.pl.info{background:var(--infob);color:var(--info)}.pl.bad{background:var(--badb);color:var(--bad)}.pl.warn{background:var(--warnb);color:var(--warn)}
button.pl{border:0;cursor:pointer}button.pl:hover{filter:brightness(.96)}
.st{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;color:var(--ink)}
.st i{width:7px;height:7px;border-radius:50%;background:#9AA39E;flex:none}
.st.ok i{background:#2E9A63}.st.info i{background:#3B74D6}.st.bad i{background:#D0492F}.st.warn i{background:#D99A1C}
.st.run i{background:none;border:2px solid #3B74D6}.st.off i{background:none;border:1.5px solid #9AA39E}
.cd{background:var(--sf);border:1px solid var(--line);border-radius:12px;box-shadow:0 1px 2px rgba(21,33,29,.03);min-width:0}
.cd.pd{padding:20px}.ph .cd.pd{padding:16px}
.cdh{display:flex;align-items:center;gap:8px;padding:14px 20px;border-bottom:1px solid var(--line);min-height:52px}
.ph .cdh{padding:12px 16px}
.cdb{padding:16px 20px}.ph .cdb{padding:12px 16px}
.li{display:flex;gap:8px 12px;align-items:center;padding:10px 20px;border-bottom:1px solid var(--line);min-height:44px}
.li:last-child{border-bottom:0}.ph .li{padding:12px 16px;flex-wrap:wrap}
/* tables */
.th,.tr{display:grid;gap:16px;align-items:center;padding:0 20px}
.th{height:40px;border-bottom:1px solid var(--line);font-size:12px;font-weight:500;color:var(--f3)}
.th button{border:0;background:none;padding:0;font-weight:500;color:inherit;cursor:pointer;display:inline-flex;gap:4px;align-items:center;height:28px;border-radius:4px}
.th button:hover{color:var(--ink)}.th .ar{opacity:0}.th button:hover .ar{opacity:.5}.th .ar.on{opacity:1;color:var(--for)}
.tr{min-height:var(--row);border-bottom:1px solid var(--line);transition:background .1s}
.tr:last-child{border-bottom:0;border-radius:0 0 12px 12px}
.tr:hover{background:var(--hov)}.tr.ck{cursor:pointer}.tr.sel{background:#F3F8F5}
.tr.drg{opacity:.4}.tr.over{box-shadow:inset 0 2px 0 var(--for)}
.cl{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cl.r,.th .r{text-align:right;justify-self:end}
.cl.ov{overflow:visible}
.ra{display:flex;gap:2px;align-items:center;justify-content:flex-end;position:relative}
.ra .hv{display:flex;gap:2px;opacity:0;transition:opacity .12s;position:absolute;right:100%;top:50%;transform:translateY(-50%);padding:0 4px 0 24px;background:linear-gradient(90deg,transparent,var(--hov) 24px);pointer-events:none}
.tr:hover .hv,.tr:focus-within .hv{pointer-events:auto}
.tr:hover .hv,.tr:focus-within .hv{opacity:1}
.grip{width:20px;height:28px;border:0;background:none;color:#A9B0AB;cursor:grab;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;padding:0}
.grip:hover{color:var(--ink);background:var(--sub)}
.chk{width:16px;height:16px;accent-color:#1F4D40;margin:0;cursor:pointer}
.ph .chk{width:22px;height:22px}
.pc{padding:14px 16px;display:flex;flex-direction:column;gap:6px}
.pc-r{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.pc-r>span:last-child{text-align:right;min-width:0;overflow-wrap:break-word}
.menu{position:relative;display:inline-flex}
.pop{position:absolute;right:0;top:calc(100% + 4px);z-index:30;background:var(--sf);border:1px solid var(--line2);border-radius:10px;padding:4px;min-width:200px;box-shadow:0 8px 24px rgba(21,33,29,.10),0 1px 2px rgba(21,33,29,.06)}
.pop.up{top:auto;bottom:calc(100% + 4px)}.pop.lf{right:auto;left:0}
.pop button{display:flex;gap:8px;align-items:center;width:100%;height:var(--c);padding:0 10px;border:0;background:none;border-radius:6px;text-align:left;cursor:pointer;white-space:nowrap;font-size:calc(var(--t) - 1px)}
.ph .pop button{font-size:16px}
.pop button:hover{background:var(--sub)}.pop button.d{color:var(--bad)}.pop button:disabled{color:var(--f3);cursor:not-allowed;background:none}
.pop hr{border:0;border-top:1px solid var(--line);margin:4px}
.tabs{display:flex;gap:20px;border-bottom:1px solid var(--line)}
.tab{height:36px;padding:0;border:0;background:none;font-weight:500;font-size:calc(var(--t) - 1px);color:var(--f3);border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;border-radius:0}
.tab:hover{color:var(--ink)}.tab.on{color:var(--ink);border-bottom-color:var(--for)}
.stat{padding:16px;display:flex;flex-direction:column;gap:4px;align-items:flex-start;text-align:left}
.ph .stat{padding:12px 16px}
button.stat{cursor:pointer;transition:border-color .12s,box-shadow .12s}button.stat:hover{border-color:var(--line2);box-shadow:0 2px 8px rgba(21,33,29,.06)}
.fig{font:600 24px/32px Geist,sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.fx{display:flex;flex-wrap:wrap;gap:1px;background:var(--line);overflow:hidden}
.fx>div{background:var(--sf);padding:12px 20px;display:flex;flex-direction:column;gap:2px;flex:1 0 auto;max-width:100%;white-space:nowrap}
.ph .fx{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.ph .fx>div{padding:12px 10px 12px 12px;min-width:0}.ph .fx>div>span:last-child{font-size:15px}.ph .fx>div>span{max-width:100%;overflow:hidden;text-overflow:ellipsis}
/* D-267: a key fact's stamp on a phone, two lines at the phone floor, 16px (D-160's decision A) */
.ph .tzp>span{display:block;overflow:hidden;text-overflow:ellipsis;font-size:16px}.ph .fx>div:last-child:nth-child(odd),.ph .fx>div.fxw{grid-column:1/-1}
.kv{display:grid;grid-template-columns:150px minmax(0,1fr);gap:10px 16px;margin:0}
.kv dt{color:var(--f3)}.kv dd{margin:0;min-width:0;overflow-wrap:break-word}
.ph .kv,.kvs .kv{grid-template-columns:minmax(0,1fr);gap:2px}.ph .kv dd,.kvs .kv dd{margin-bottom:10px}
.bar{height:6px;border-radius:3px;background:var(--sub);overflow:hidden;min-width:40px;flex:1;display:flex}
.bar i{display:block;height:100%;background:#2E9A63}.bar i.b2{background:#3B74D6}.bar.hot i{background:#D99A1C}.bar.full i{background:#9AA39E}
.tl{position:relative;padding:0 0 16px 20px;border-left:1px solid var(--line);margin-left:4px}
.tl:last-child{padding-bottom:0}.tl:before{content:'';position:absolute;left:-4px;top:6px;width:7px;height:7px;border-radius:50%;background:var(--sf);border:1.5px solid var(--f3)}
.scrim{position:absolute;inset:0;background:rgba(21,33,29,.38);display:flex;align-items:center;justify-content:center;padding:16px;z-index:40}
.scrim.top0{align-items:flex-start;padding-top:96px}.ph .scrim.top0{padding-top:16px}
.modal{background:var(--sf);border-radius:12px;border:1px solid var(--line2);width:100%;max-width:480px;max-height:100%;overflow:auto;box-shadow:0 24px 64px rgba(21,33,29,.22)}
.mh{padding:16px 20px 0;display:flex;gap:8px;align-items:flex-start}.mb{padding:12px 20px 20px;display:flex;flex-direction:column;gap:12px}
.mf{padding:12px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px;background:var(--hov);border-radius:0 0 12px 12px}
.drw{position:absolute;top:0;bottom:0;left:0;width:300px;max-width:86%;z-index:41;display:flex}
.drw .sb{width:100%}
.toast{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);background:#15211D;color:#F4F2EC;border-radius:8px;padding:8px 12px;z-index:50;max-width:calc(100% - 32px);font-size:calc(var(--t) - 1px);box-shadow:0 8px 24px rgba(21,33,29,.2);display:flex;gap:8px;align-items:center}
.sk{height:10px;border-radius:5px;background:linear-gradient(90deg,#EFEDE6 0,#F7F5F0 50%,#EFEDE6 100%);background-size:200% 100%;animation:arxs 1.4s linear infinite}
@keyframes arxs{to{background-position:-200% 0}}
.emp{padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.emp .ic{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--f3);margin-bottom:6px;background:var(--hov)}
.pre{font:400 var(--mo)/20px 'Geist Mono',monospace;background:var(--hov);border:1px solid var(--line);border-radius:8px;padding:10px 12px;white-space:pre-wrap;overflow-wrap:break-word;margin:0}
.pal-i{display:flex;gap:10px;width:100%;height:var(--cp);align-items:center;padding:0 10px;border:0;background:none;border-radius:8px;text-align:left;cursor:pointer;font-size:var(--t)}
.pal-i.on{background:var(--tint)}.pal-i:hover{background:var(--sub)}.pal-i.on:hover{background:var(--tint)}
.mt{width:32px;height:32px;border-radius:8px;background:var(--tint);color:var(--for);display:flex;align-items:center;justify-content:center;flex:none}
.note{background:var(--hov);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.bb{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:start}
.bb>:last-child{grid-column:2}
.wide .bb{grid-template-columns:220px minmax(0,1fr) 264px}.wide .bb>:last-child{grid-column:auto}
.ph .bb{grid-template-columns:minmax(0,1fr)}.ph .bb>:last-child{grid-column:1}
.ph .pc .el{white-space:normal}
.ax{hyphens:none;-webkit-hyphens:none}
.lk.el{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ph .lk.el{display:inline-flex}
.cl2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal}
.cl3{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:normal}
.ph .pc .cl1{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stl{font-size:13px;white-space:nowrap}.ph .stl{font-size:16px}
.ph .g5>:nth-child(5){grid-column:1/-1}.ph .g3.st2{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.pop.rt{left:calc(100% + 12px);right:auto;top:0}
.sb.rail .nav{overflow:visible;display:flex;flex-direction:column;gap:4px}.sb.rail .nav .menu{display:flex}
.mx{width:28px;height:28px;border-radius:8px;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;background:var(--okb);color:var(--ok)}
.mx.lk2{background:var(--warnb);color:var(--warn);border-color:#EBD9A8}.mx:disabled{cursor:default}
.ph .mx{width:44px;height:44px}
/* the logo is one image; the rail shows it through a 26px window: its "ai". The window closes with the column */
.wm{display:flex;flex:none;position:relative;left:0;width:161px;overflow:hidden}.wm img{display:block;flex:none}
.sb .wm-ai{width:26px;left:2.5px}
.sb.rail .sb-top{justify-content:flex-start;padding:0 16px}
/* the sidebar collapsing and opening, in the brand's motion (Amplified Impact Motion v1: the same tokens the learner sidebar uses) */
.ax{--aim-ease:cubic-bezier(.2,.7,.2,1);--aim-ease-spring:cubic-bezier(.3,1.3,.6,1);--aim-dur-quick:160ms;--aim-dur-base:240ms;--aim-dur-move:380ms;--aim-dur-spring:560ms}
@supports (animation-timing-function:linear(0,1)){.ax{--aim-ease-spring:linear(0,0.011,0.041,0.087,0.143,0.208,0.278,0.351,0.425,0.497,0.567,0.634,0.696,0.754,0.807,0.854,0.895,0.932,0.963,0.989,1.011,1.029,1.043,1.053,1.06,1.065,1.067,1.068,1.067,1.065,1.062,1.058,1.053,1.048,1.043,1.038,1.033,1.029,1.024,1.02,1.016,1.013,1.009,1.007,1.004,1.002,1)}}
.sb.nar{width:64px}
.fl{display:flex;flex:none}
.sb.a-collapsing{transition:width var(--aim-dur-move) var(--aim-ease);overflow:clip}
.sb.a-expanding{transition:width var(--aim-dur-spring) var(--aim-ease-spring);overflow:clip}
.sb[class*=" a-"] .wm{transition:width var(--aim-dur-move) var(--aim-ease),left var(--aim-dur-move) var(--aim-ease)}
/* each layout keeps its own width whatever the column is doing, so nothing inside re-wraps or drifts on the way; the edge clips it */
.sb[class*=" a-"]:not(.rail)>*{min-width:243px}
.sb[class*=" a-"].rail>*{max-width:63px}
.sb.a-collapsing:not(.rail) :is(.gx>.el,.gx .rb,.gx .cv,.gw,.sw>.col,.sw>.mu,.lb,.uc>.col,.ng,.nav:not(.snf) .ni){opacity:0;transition:opacity var(--aim-dur-quick) var(--aim-ease)}
.sb.a-collapsing:not(.rail) .sw{border-color:transparent;background-color:transparent;transition:border-color var(--aim-dur-quick) var(--aim-ease),background-color var(--aim-dur-quick) var(--aim-ease)}
.sb.a-collapsing:not(.rail) :is(.gx.has,.gk.on){background-color:transparent;transition:background-color var(--aim-dur-quick) var(--aim-ease)}
@keyframes sbfade{from{opacity:0}}
@keyframes sbbox{from{border-color:transparent;background-color:transparent}}
.sb.a-expanding :is(.gx>.el,.gx .rb,.gx .cv,.gw,.sw>.col,.sw>.mu,.lb,.uc>.col,.ng,.nav:not(.snf) .ni){animation:sbfade var(--aim-dur-base) var(--aim-ease) backwards}
.sb.a-expanding .sw{animation:sbbox var(--aim-dur-base) var(--aim-ease) backwards}
/* today's nav has no icon in common between its two layouts, so there the rail's icons fade in */
.sb.a-collapsing.rail:not(.nm-focus) .nav .ni{animation:sbfade var(--aim-dur-base) var(--aim-ease) backwards}
.sb.rail .ni.on{transition:background-color var(--aim-dur-base) var(--aim-ease)}
@media (prefers-reduced-motion:reduce){.sb,.sb .wm{transition:none!important}}
/* the sidebar proposal: six rows, one open. A group is a row with its icon; its pages hang from it on a guide line, as the learner sidebar's Weeks do */
.nav.snf{padding:6px 8px 16px}
.gx{display:flex;align-items:center;gap:10px;width:100%;height:var(--cp);padding:0 8px;margin-top:2px;border:0;background:none;border-radius:8px;font-size:calc(var(--t) - 1px);font-weight:500;color:var(--ink);cursor:pointer;text-align:left;white-space:nowrap}
.ph .gx{font-size:16px}
.gx>.fl{color:var(--f2)}
.gx:hover{background:var(--sub)}
.gx.has,.gx.has>.fl{color:var(--for)}
.gx.has:not(.op){background:var(--tint)}
.gx>.el{flex:none}.gx .rb{margin-left:auto;font-size:12px;font-weight:400;color:var(--f3);min-width:0;overflow:hidden;text-overflow:ellipsis}.gx .rb.bad{color:var(--bad);font-weight:500}
.ph .gx .rb{font-size:16px}
.gx .cv{margin-left:auto;display:flex;color:var(--f3)}.gx .rb+.cv{margin-left:8px}
.gx .cv svg{transition:transform .2s ease}.gx.op .cv svg{transform:rotate(90deg)}
.gw{display:grid;grid-template-rows:0fr;transition:grid-template-rows .2s ease}.gw.op{grid-template-rows:1fr}
.gwi{overflow:hidden;min-height:0;visibility:hidden;transition:visibility 0s .2s}.gw.op .gwi{visibility:visible;transition-delay:0s}
.gkids{margin:2px 0 6px 15.5px;padding-left:10px;border-left:1px solid var(--line);display:flex;flex-direction:column;gap:1px}
.gk{display:flex;align-items:center;gap:8px;width:100%;height:calc(var(--c) - 2px);padding:0 8px;border:0;background:none;border-radius:7px;font-size:calc(var(--t) - 1px);font-weight:400;color:var(--f2);cursor:pointer;text-align:left;white-space:nowrap}
.ph .gk{font-size:16px;height:var(--c)}
.gk:hover{background:var(--sub);color:var(--ink)}
.gk.on{background:var(--tint);color:var(--for);font-weight:500}
.gk .ct{margin-left:auto;font-size:11px;font-weight:500;color:var(--f2);background:var(--sf);border:1px solid var(--line);border-radius:999px;padding:0 6px;line-height:16px}.gk .ct.bad{color:var(--bad);border-color:var(--badb);background:var(--badb)}
.ph .gk .ct{font-size:16px;line-height:24px;padding:0 8px}
@media (prefers-reduced-motion:reduce){.gw,.gwi,.gx .cv svg{transition:none}}
/* the program's own tile (program-logo.ts, variant "tile"), never under 32px */
.sw img.tile{width:32px;height:32px;border-radius:0;background:none}
/* in the rail the switcher sits on the same centre line as the logo and the icons */
.sb>.menu{display:flex}.sb .sw{margin:0 8px 8px}.sb.rail>.menu{justify-content:center}.sb.rail .sw{margin:0 0 8px;width:36px}.ph .sw img.tile{width:36px;height:36px}

/* ---- D-253 (R-5 Phase 1): the frame, from handoff/admin-mockup/build_admin.py ("Nov 25" and "third pass: four pages with tabs") ---- */
/* the cohort picker in the Cohort page's title */
.cpk{display:inline-flex;align-items:center;gap:8px;height:var(--c);padding:0 8px 0 6px;border:1px solid var(--line2);border-radius:8px;background:var(--sf);font-size:calc(var(--t) - 1px);font-weight:500;color:var(--ink);cursor:pointer;max-width:100%;box-shadow:0 1px 1px rgba(21,33,29,.04)}
.cpk:hover{background:var(--hov)}.cpk>svg{color:var(--f3);flex:none}.cpk img{border-radius:5px;flex:none}
.cpk.big{height:auto;padding:2px 8px 2px 0;margin:-2px 0;border-color:transparent;background:none;box-shadow:none;font:inherit;letter-spacing:inherit;border-radius:8px;gap:6px}
.cpk.big:hover{background:var(--sub)}.cpk.big:hover>svg{color:var(--ink)}
.hd h1 .menu{max-width:100%}
/* D-253: on a phone the picker is a 44px target, as every other control there (the mockup's own .ph .lk); the mockup's is 36 */
.ph .cpk.big{min-height:44px}
/* a page's own tabs, inside a tab: a segmented control */
.sgm{display:inline-flex;border:1px solid var(--line2);border-radius:8px;overflow:hidden;background:var(--sf);align-self:flex-start}
.ph .sgm button{padding:0 9px}.sgm button{white-space:nowrap;height:var(--c);padding:0 12px;border:0;border-right:1px solid var(--line2);background:none;font-size:calc(var(--t) - 1px);font-weight:500;color:var(--f2);cursor:pointer}.sgm button:last-child{border-right:0}
.sgm button:hover{background:var(--hov)}.sgm button.on{background:var(--tint);color:var(--for)}
.area>.atb{display:flex;flex-direction:column;gap:20px;min-width:0}.ph .area>.atb{gap:16px}
.area .atb .pg{padding:0;max-width:none;margin:0}
.shd{display:flex;gap:12px 16px;align-items:center;justify-content:space-between;flex-wrap:wrap}.shd>p{max-width:720px;margin:0}.shd .b{height:var(--cp);padding:0 14px}
.sgm.stb{flex:none}.sgm .tn{margin-left:6px;font-weight:400;color:var(--f3)}.sgm button.on .tn{color:var(--for)}
.area>.tabs{overflow-x:auto;scrollbar-width:none}.area>.tabs .tab{white-space:nowrap;flex:none}
/* the sidebar's single rows, and the hairline above the system pages */
.gx.solo .rb{margin-left:auto}.gx .rb.dr{color:var(--warn)}
.gsep{margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}

/* ---- D-255 (R-5 Phase 3): the Cohort page's tabs and New cohort, from build_admin.py ("Nov 25", "third pass") ---- */
.fx>.fxl{background:var(--sf);border:0;padding:12px 34px 12px 20px;display:flex;flex-direction:column;gap:2px;flex:1 0 auto;max-width:100%;white-space:nowrap;text-align:left;cursor:pointer;position:relative;color:inherit;transition:background-color .12s}
.fx>.fxl:hover{background:var(--hov)}.fx>.fxl>svg{position:absolute;right:14px;top:50%;margin-top:-6px;color:var(--line2);transition:color .12s,transform .12s}.fx>.fxl:hover>svg{color:var(--for);transform:translateX(2px)}
.ph .fx>.fxl{padding:12px 26px 12px 12px;min-width:0}.ph .fx>.fxl>span{max-width:100%;overflow:hidden;text-overflow:ellipsis}.ph .fx>.fxl>span:nth-child(2){font-size:16px}.ph .fx>.fxl>svg{right:8px}
.ph .fx>.fxl:last-child:nth-child(odd){grid-column:1/-1}
.fat{font-weight:400;font-size:var(--m);line-height:var(--ml);color:var(--f3);margin-top:-4px}
.lns{display:flex;flex-direction:column;gap:6px}
.wkl{display:flex;flex-direction:column}.wkl>*+*{border-top:1px solid var(--line)}
.wn{width:28px;height:28px;border-radius:8px;background:var(--tint);color:var(--for);font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;flex:none;font-variant-numeric:tabular-nums}
.wn.sm{width:24px;height:24px;border-radius:6px;font-size:12px;background:var(--sub);color:var(--f2)}.wn.sm.pk{background:var(--tint);color:var(--for)}
.rnw,.nyr,.rdy{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;text-align:left;cursor:pointer;color:inherit;font-size:calc(var(--t) - 1px)}
.rnw{padding:8px;margin:-4px -8px;width:calc(100% + 16px);border-radius:8px}.rnw:hover{background:var(--sub)}.rnw>svg:last-child,.nyr>svg:last-child{color:var(--line2);flex:none}.rnw:hover>svg:last-child,.nyr:hover>svg:last-child{color:var(--for)}
.nyr{padding:12px 16px 12px 20px;min-height:60px}.nyr:hover{background:var(--hov)}.nyr.rn{min-height:52px;padding-block:8px}
.nyr.now{background:linear-gradient(90deg,var(--tint),transparent 60%)}.ph .nyr{padding:12px 16px}
/* D-270 (R-5 Phase 9): the Overview's tiles, Needs You's group labels and the audience bar (the mockup's Home) */
.thr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.lap .thr{grid-template-columns:repeat(2,minmax(0,1fr))}.ph .thr{grid-template-columns:minmax(0,1fr);gap:12px}
.thl{display:flex;flex-direction:column;gap:4px;align-items:stretch;text-align:left;padding:14px 16px 16px;cursor:pointer;color:inherit;transition:border-color .12s,box-shadow .12s;min-width:0}
.thl:hover{border-color:var(--line2);box-shadow:0 2px 8px rgba(21,33,29,.06)}
.tlk{display:flex;align-items:center;gap:8px;font-size:var(--m);line-height:var(--ml);font-weight:500;color:var(--f2);margin-bottom:6px}.tlk .mt{width:24px;height:24px;border-radius:6px}.tlk .mt svg{width:14px;height:14px}
.tlk>svg:last-child{margin-left:auto;color:var(--line2);transition:color .12s,transform .12s}.thl:hover .tlk>svg:last-child{color:var(--for);transform:translateX(2px)}
.thl .fig{font-size:20px;line-height:28px}.thl .me{white-space:normal}
.ngl{padding:8px 20px;font-size:var(--m);line-height:var(--ml);font-weight:500;color:var(--f3);background:var(--hov)}.ph .ngl{padding:8px 16px}
.aub{display:flex;gap:2px;height:10px;border-radius:5px;overflow:hidden}.aub i{display:block;min-width:4px}
.aul{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}.lap .aul{grid-template-columns:repeat(3,minmax(0,1fr))}.ph .aul{grid-template-columns:repeat(2,minmax(0,1fr))}
.auk{display:flex;align-items:flex-start;gap:8px;padding:8px;margin:0 -8px 0 0;border:0;background:none;border-radius:8px;text-align:left;cursor:pointer;color:inherit}.auk:hover{background:var(--sub)}.auk>i{width:8px;height:8px;border-radius:2px;flex:none;display:block;margin-top:8px}.auk .w5{font-size:17px;line-height:24px}
.mt.bad{background:var(--badb);color:var(--bad)}.mt.warn{background:var(--warnb);color:var(--warn)}
.rdy{padding:6px 8px;margin:-2px -8px;width:calc(100% + 16px);border-radius:8px;gap:10px}.rdy:hover{background:var(--sub)}
/* D-269: a cohort card's Seats sold row opens Enrollment, so on a phone it is a 44px target, as the mockup's own .ph .lk */
.ph .rvs{min-height:44px}
.rdn{flex:none;white-space:nowrap;text-align:right;min-width:44px}
/* D-268 (R-5 Phase 7): People's audiences, chips to filter by and a square beside each way in (the mockup's third pass) */
.chs{display:flex;flex-wrap:wrap;gap:6px}
.ch{display:inline-flex;align-items:center;gap:7px;height:var(--c);padding:0 12px;border:1px solid var(--line2);border-radius:999px;background:var(--sf);font-size:calc(var(--t) - 1px);font-weight:500;color:var(--f2);cursor:pointer}
.ch:hover{color:var(--ink);background:var(--hov)}.ch.on{background:var(--ink);border-color:var(--ink);color:#fff}.ch i,.pl.aud i{width:8px;height:8px;border-radius:2px;flex:none;display:block}
.ch .tn{font-weight:400;color:var(--f3)}.ch.on .tn{color:#C9D2CD}
.ph .chs{flex-wrap:nowrap;overflow-x:auto;margin:0 -16px;padding:0 16px 2px;scrollbar-width:none}.ph .chs::-webkit-scrollbar{display:none}.ph .ch{flex:none}
.mt.off{background:var(--sub);color:var(--f3)}
/* D-268: the phone's 16px floor for a fact's value (D-156; D-265's decision 18), on Utah Life's own facts */
.ph .p7f .fx>div>span:last-child{font-size:16px}
.lk.inl{text-decoration:underline;text-decoration-color:var(--mint);text-underline-offset:3px}.ph .lk.inl{min-height:0;display:inline}
.dt{width:36px;height:40px;border-radius:8px;border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;line-height:1}.dt b{font-size:15px;font-weight:600}.dt span{font-size:10px;color:var(--f3);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
.stp2{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line2);border-radius:8px;background:var(--sf);align-self:flex-start;height:var(--c)}.stp2 b{min-width:28px;text-align:center;font-weight:600}.stp2 button{height:calc(var(--c) - 2px);min-width:32px;border:0;background:none;border-radius:7px;font-size:16px;color:var(--f2);cursor:pointer}.stp2 button:disabled{opacity:.35;cursor:default}
.slt{display:flex;align-items:center;gap:4px}.slt .in{flex:1 1 0;min-width:0;font-weight:400}.ph .slt{flex-wrap:wrap}.ph .slt .in{flex:1 1 40%}
.ckr{display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:calc(var(--t) - 1px)}.ckr input{margin:3px 0 0;width:16px;height:16px;accent-color:var(--for);flex:none}
.skf{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}.skf>div{background:var(--sf);padding:10px 12px;display:flex;flex-direction:column}.skf b{font-size:20px;line-height:26px;font-weight:600}
.skc{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:6px;background:var(--tint);color:var(--for);font-size:var(--m);font-weight:500;white-space:nowrap}
.skc.alt{background:var(--infob);color:var(--info)}.skc.off{background:var(--sub);color:var(--f3)}
.ncl{display:flex;flex-direction:column;max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:10px 12px;gap:10px;font-weight:400}.ncw{display:flex;align-items:flex-start;gap:10px}
.ncl.free{max-height:none;overflow:visible}
.tdc{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line2);display:flex;align-items:center;justify-content:center;flex:none;color:#fff}
.tdo.ok .tdc{background:#2E9A63;border-color:#2E9A63}.tdo.ok .w5{color:var(--f2);font-weight:400}
.set2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}.lap .set2,.ph .set2{grid-template-columns:minmax(0,1fr)}
.cfx{display:grid;grid-template-columns:116px minmax(0,1fr);gap:4px 16px;font-size:calc(var(--t) - 1px)}.ph .cfx{grid-template-columns:minmax(0,1fr);font-size:16px}
.cfl{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:2px;font-weight:400}
.wpl{display:flex;flex-direction:column}.wpl>*+*{border-top:1px solid var(--line)}
.wpk{display:flex;align-items:center;gap:12px;padding:10px 20px;min-height:56px;cursor:pointer;font-size:calc(var(--t) - 1px)}.wpk:hover{background:var(--hov)}.ph .wpk{padding:10px 16px;flex-wrap:wrap}
.wpk input{width:16px;height:16px;accent-color:var(--for);flex:none;margin:0}.wpk:not(.on) .w5,.wpk:not(.on) .me{color:var(--f3)}.wpk:not(.on) .w5{font-weight:400}
.ewl{display:flex;flex-direction:column;gap:6px;margin-top:2px}.ewr{display:grid;grid-template-columns:24px minmax(0,1fr) 150px 150px;gap:8px;align-items:center;font-weight:400}.ewf{display:block;min-width:0}.ewf .in{min-width:0;width:100%}.ewk{display:none}
.ewh{color:var(--f3);font-size:var(--m);line-height:var(--ml)}
.ph .ewh{display:none}.ph .ewl{gap:14px}.ph .ewr{grid-template-columns:24px minmax(0,1fr);row-gap:6px}.ph .ewf{grid-column:2;display:grid;grid-template-columns:64px minmax(0,1fr);align-items:center}.ph .ewk{display:block;color:var(--f3)}
.nsk{position:sticky;top:0}.ph .nsk{position:static}

/* ---- D-265 (R-5 Phase 6): Program › Curriculum, a week and Course Settings, from build_admin.py ("third pass") ---- */
.wn.off{background:var(--sub);color:var(--f3)}
.srg{display:grid;grid-template-columns:216px minmax(0,1fr);gap:24px;align-items:start}
.ph .srg{grid-template-columns:minmax(0,1fr);gap:16px}
.srl{display:flex;flex-direction:column;gap:1px;position:sticky;top:0}
.srb{display:flex;align-items:center;gap:8px;height:var(--c);padding:0 10px;border:0;background:none;border-radius:8px;font-size:calc(var(--t) - 1px);color:var(--f2);cursor:pointer;text-align:left}
.srb:hover{background:var(--sub);color:var(--ink)}
.srb.on{background:var(--tint);color:var(--for);font-weight:500}
.srb .el{flex:1}
.srb .tn{font-size:var(--m);color:var(--f3);font-weight:400}
.ln{display:flex;align-items:center;gap:4px}
.ln .in{flex:1;font-weight:400}
.grp{display:flex;align-items:center;justify-content:center;width:20px;height:var(--c);color:var(--line2);cursor:grab;flex:none}
.wkr:hover .grp,.ln:hover .grp{color:var(--f3)}
.wkr{display:flex;align-items:center;gap:12px;padding:10px 12px 10px 8px;min-height:60px}
.ph .wkr{flex-wrap:wrap;padding:12px 12px 12px 16px;gap:8px 12px}
.wkr.stp{padding-left:12px}
.wkr:hover{background:var(--hov)}
.wkm{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;border:0;background:none;padding:0;text-align:left;cursor:pointer;color:inherit;border-radius:4px}
.wkm:hover .w5{color:var(--for);text-decoration:underline;text-decoration-color:var(--mint);text-underline-offset:3px}
.wkc{flex:0 0 104px;display:flex;flex-direction:column;min-width:0;font-size:calc(var(--t) - 1px)}
.wkc.wkd{flex-basis:172px}
.stp .wkc{flex:0 0 196px}
.stp .wkc .row{flex-wrap:nowrap}
.ph .stp .wkc{flex:1 1 auto}
.wks{flex:0 0 96px;display:flex;justify-content:flex-start;font-size:calc(var(--t) - 1px)}
.lap .wkc{flex-basis:120px}
.lap .wkc.wkd{display:none}
.ph .wkr .wn{order:0}
.ph .wkm{order:1;flex:1 1 calc(100% - 100px)}
.ph .wkr>.menu{order:2}
.ph .wkc{display:none}
.ph .wkc.wkd,.ph .stp .wkc{display:flex;order:3;flex:1 1 auto;margin-left:40px}
.ph .stp .wkc{margin-left:36px}
.ph .wks{order:4;flex:0 0 auto;align-items:center}
/* D-265: the phone's 16px floor (D-156, D-160's decision A) for these columns, as the mockup's own .ph .lab and .ph .b set it */
.ph .wkc,.ph .wks{font-size:16px}
.svb{position:sticky;bottom:16px;display:flex;align-items:center;gap:8px;padding:10px 12px 10px 16px;background:var(--ink);color:#F4F2EC;border-radius:12px;box-shadow:0 8px 24px rgba(21,33,29,.18);font-size:calc(var(--t) - 1px);z-index:3}
.svb .b{border-color:#47534E;background:#202D28;color:#F4F2EC;box-shadow:none}
.svb .b:hover{background:#2A3832}
.svb .b.p{background:var(--mint);border-color:var(--mint);color:var(--ink)}
.svb .b.p:hover{background:#86DDB5}
.cfb{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px 14px;border:1px dashed var(--line2);border-radius:10px;background:var(--hov);font-size:calc(var(--t) - 1px)}
.lk.uin{font-weight:400;color:var(--f2)}
.uir{margin:0;width:100%;border:1px solid var(--line);padding:8px 12px}
`;

/* ---------- icons: 24 grid, 1.75 stroke, round caps, drawn at 16 ---------- */
const P = {
  overview: 'M5 20v-8M12 20V5M19 20v-5', health: 'M3 12h4l3-8 4 16 3-8h4', curriculum: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5', builder: 'M4 20l1-5L16 4l4 4L9 19l-5 1z',
  vault: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z', cohorts: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', announce: 'M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z',
  learners: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 7M19 15a6 6 0 0 1 3 6', workspaces: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3',
  users: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', masquerade: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', tiers: 'M3 6h18v12H3zM3 10h18',
  billing: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6', usage: 'M3 17l6-6 4 4 8-8M15 7h6v6', incidents: 'M12 4l9 16H3l9-16zM12 10v4M12 17h.01', audit: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  api: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16', jobs: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', email: 'M3 6h18v12H3zM3 7l9 6 9-6', integrations: 'M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v4',
  deploys: 'M6 8v8M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 8v1a4 4 0 0 1-4 4H6',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3', flags: 'M5 21V4M5 4h13l-2.5 4 2.5 4H5', roles: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16.5 16.5L21 21', x: 'M6 6l12 12M18 6L6 18', menu: 'M4 7h16M4 12h16M4 17h16', more: 'M5 12h.01M12 12h.01M19 12h.01', chev: 'M9 6l6 6-6 6', back: 'M15 6l-6 6 6 6',
  updown: 'M8 9l4-4 4 4M8 15l4 4 4-4', chevd: 'M6 9l6 6 6-6', plus: 'M12 5v14M5 12h14', lock: 'M6 11h12v9H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11', grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01', check: 'M5 12.5l4.5 4.5L19 7',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14', panel: 'M4 5h16v14H4zM9 5v14', bolt: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6', file: 'M6 3h8l4 4v14H6zM14 3v4h4', play: 'M7 5l12 7-12 7V5z', refresh: 'M20 12a8 8 0 0 1-14 5M4 12a8 8 0 0 1 14-5M18 3v4h-4M6 21v-4h4',
};
Object.assign(P, { program: P.curriculum, cohort: P.cohorts, people: P.users, revenue: P.usage });
const I = ({ n, s = 16, w }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w || (n === 'more' || n === 'grip' ? 2.6 : 1.75)} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d={P[n] || P.file} /></svg>;

/* ---------- sample data (fictional; "today" is Thu, Dec 10, 2026, MT; every time in MT with CT after it, D-267) ---------- */
const MODS0 = [
  { id: 'm1', n: 'Marketing AI Employee', d: 'Paste an MLS listing → Fair-Housing-checked copy', ic: 'announce', tier: 'both', ses: null, st: 'Published', steps: 6, files: 3, dep: 66 },
  { id: 'm2', n: 'Week 0 · Get Ready', d: 'Your accounts, operator, and baseline', ic: 'audit', tier: 'team', ses: null, st: 'Published', steps: 6, files: 2, dep: 91 },
  { id: 'm3', n: 'Week 1 · Know the Business', d: 'A checked view of what your business earns and spends', ic: 'tiers', tier: 'team', ses: ['Session 1 · Lead-Source ROI Live Build', 'Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT · Replay ready'], st: 'Published', steps: 6, files: 4, dep: 74 },
  { id: 'm4', n: 'Sales AI Employee', d: 'Paste a new lead → a first reply in your voice', ic: 'bolt', tier: 'both', ses: null, st: 'Published', steps: 6, files: 3, dep: 35 },
  { id: 'm5', n: 'Week 2 · Own the Day', d: 'A ten-minute morning brief from your own data', ic: 'jobs', tier: 'team', ses: ['Session 2 · Morning Brief Live Build', 'Wed, Dec 9 · 12:00 PM MT / 1:00 PM CT · Replay ready'], st: 'Published', steps: 6, files: 3, dep: 38 },
  { id: 'm6', n: 'Database AI Employee', d: 'Upload your contact export → ten warm conversations', ic: 'db', tier: 'both', ses: null, st: 'Scheduled', steps: 6, files: 3, opens: 'Opens Dec 14' },
  { id: 'm7', n: 'Week 3 · Work the Database', d: 'Sort your sphere and plan the week of calls', ic: 'learners', tier: 'team', ses: ['Session 3 · Database Live Build', 'Wed, Dec 16 · 12:00 PM MT / 1:00 PM CT'], st: 'Scheduled', steps: 6, files: 2, opens: 'Opens Dec 14' },
  { id: 'm8', n: 'Meetings AI Employee', d: 'Paste a meeting transcript → decisions and owners', ic: 'email', tier: 'team', ses: null, st: 'Scheduled', steps: 5, files: 2, opens: 'Opens Dec 21' },
  { id: 'm9', n: 'Week 4 · Run the Meeting', d: 'A weekly meeting that runs from your scorecard', ic: 'cohorts', tier: 'team', ses: ['Session 4 · Scorecard Live Build', 'Wed, Dec 23 · 12:00 PM MT / 1:00 PM CT'], st: 'Scheduled', steps: 6, files: 2, opens: 'Opens Dec 21' },
  { id: 'm10', n: 'Finance AI Employee', d: 'Upload a ledger export → spend mapped to a standard chart', ic: 'billing', tier: 'team', ses: null, st: 'Draft', steps: 4, files: 1 },
  { id: 'm11', n: 'Week 5 · Close Clean', d: 'Contract-to-close checklist with dates and owners', ic: 'check', tier: 'team', ses: ['Session 5 · Contract to Close', 'Wed, Dec 30 · 12:00 PM MT / 1:00 PM CT'], st: 'Draft', steps: 3, files: 0 },
  { id: 'm12', n: 'Operations AI Employee', d: 'Upload an executed contract → a dated task list', ic: 'jobs', tier: 'team', ses: null, st: 'Draft', steps: 2, files: 0 },
  { id: 'm13', n: 'Week 6 · Hand It Off', d: 'Document each AI Employee so a teammate can run it', ic: 'file', tier: 'team', ses: ['Session 6 · Handoff', 'Wed, Jan 6 · 12:00 PM MT / 1:00 PM CT'], st: 'Draft', steps: 2, files: 0 },
  { id: 'm14', n: 'Recruiting AI Employee', d: 'Paste a candidate profile → call prep and questions', ic: 'users', tier: 'team', ses: null, st: 'Draft', steps: 1, files: 0 },
  { id: 'm15', n: 'Listing AI Employee', d: 'Paste seller notes → a listing appointment follow-up', ic: 'vault', tier: 'team', ses: null, st: 'Draft', steps: 1, files: 0 },
];
const WS = [
  { id: 'ws_northshore', n: 'Northshore Group', plan: 'Team Plan · 41 seats', used: 33, cap: 41, st: 'Active', last: 'Dec 10, 8:52 AM MT / 9:52 AM CT', owner: 'Elena Vargas', mrr: '$1,495', cus: 'cus_Rk3NshoreA1', sub: 'sub_1Qn7NshoreT41' },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', plan: 'Team Plan · 16 seats', used: 15, cap: 16, st: 'Active', last: 'Dec 9, 6:10 PM MT / 7:10 PM CT', owner: 'Jordan Hale', mrr: '$695', cus: 'cus_Rm8HaleMrl02', sub: 'sub_1Qp2HaleT16' },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', plan: 'Agent Plan', used: 46, cap: 50, st: 'Active', last: 'Dec 10, 12:41 AM MT / 1:41 AM CT', owner: 'Noor Haddad', mrr: '$1,450', cus: 'cus_Rj1RedClf03', sub: 'sub_1Qk9RedClfA50' },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', plan: 'AI Accelerator', used: 2, cap: 2, st: 'Active', last: 'Dec 9, 2:15 PM MT / 3:15 PM CT', owner: 'Devon Achterberg', mrr: 'One-time', cus: 'cus_Rp4CoprBsn04', sub: '—' },
  { id: 'ws_tidewater', n: 'Tidewater Property Co.', plan: 'Insiders', used: 1, cap: 1, st: 'Past due', last: 'Dec 4, 9:03 AM MT / 10:03 AM CT', owner: 'Sam Whitlock', mrr: '$97', cus: 'cus_Rg6Tidewtr05', sub: 'sub_1Qh3TidewI1' },
  { id: 'ws_lantern', n: 'Lantern Street Partners', plan: 'Team Plan · 16 seats', used: 6, cap: 16, st: 'Trialing', last: 'Dec 9, 11:27 AM MT / 12:27 PM CT', owner: 'Tessa Lindqvist', mrr: '$0', cus: 'cus_Rt2Lantern06', sub: 'sub_1Qv5LanternT16' },
  { id: 'ws_fourthmeridian', n: 'Fourth Meridian', plan: 'Team Plan · 16 seats', used: 0, cap: 16, st: 'Canceled', last: 'Nov 2, 4:40 PM MT / 5:40 PM CT', owner: 'Priya Raman', mrr: '$0', cus: 'cus_Rb9FourthM07', sub: 'sub_1Qc1FourthT16' },
];
const USERS = [
  { id: 'u_1042', n: 'Elena Vargas', e: 'elena@northshoregroup.example', ws: 'Northshore Group', role: 'Team owner', tier: 'Team', last: 'Dec 10, 8:52 AM MT / 9:52 AM CT', st: 'Active', pr: 4, of: 5 },
  { id: 'u_1043', n: 'Marcus Oyelaran', e: 'marcus@northshoregroup.example', ws: 'Northshore Group', role: 'Agent', tier: 'Team', last: 'Dec 9, 4:31 PM MT / 5:31 PM CT', st: 'Active', pr: 3, of: 5 },
  { id: 'u_1061', n: 'Jordan Hale', e: 'jordan@halemarlowe.example', ws: 'Hale & Marlowe Realty', role: 'Team owner', tier: 'Team', last: 'Dec 9, 6:10 PM MT / 7:10 PM CT', st: 'Active', pr: 5, of: 5 },
  { id: 'u_1077', n: 'Noor Haddad', e: 'noor@redcliffcollective.example', ws: 'Red Cliff Collective', role: 'Team owner', tier: 'Agent', last: 'Dec 10, 12:41 AM MT / 1:41 AM CT', st: 'Active', pr: 2, of: 2 },
  { id: 'u_1090', n: 'Devon Achterberg', e: 'devon@copperbasin.example', ws: 'Copper Basin Realty', role: 'Team owner', tier: 'Team', last: 'Dec 9, 2:15 PM MT / 3:15 PM CT', st: 'Active', pr: 2, of: 5 },
  { id: 'u_1104', n: 'Sam Whitlock', e: 'sam@tidewaterproperty.example', ws: 'Tidewater Property Co.', role: 'Agent', tier: 'Agent', last: 'Dec 4, 9:03 AM MT / 10:03 AM CT', st: 'Past due', pr: 1, of: 2 },
  { id: 'u_1118', n: 'Tessa Lindqvist', e: 'tessa@lanternstreet.example', ws: 'Lantern Street Partners', role: 'Team owner', tier: 'Team', last: 'Dec 9, 11:27 AM MT / 12:27 PM CT', st: 'Trialing', pr: 1, of: 5 },
  { id: 'u_1125', n: 'Priya Raman', e: 'priya@fourthmeridian.example', ws: 'Fourth Meridian', role: 'Team owner', tier: 'Team', last: 'Nov 2, 4:40 PM MT / 5:40 PM CT', st: 'Canceled', pr: 0, of: 5 },
];
const STAFF = [
  { n: 'Connor Leiva', role: 'Owner', e: 'connor@amplifiedimpact.io', last: 'Dec 10, 9:22 AM MT / 10:22 AM CT' },
  { n: 'Avery Stone', role: 'Admin', e: 'avery@amplifiedimpact.example', last: 'Dec 9, 5:48 PM MT / 6:48 PM CT' },
  { n: 'Imani Brooks', role: 'Support', e: 'imani@amplifiedimpact.example', last: 'Dec 9, 9:30 PM MT / 10:30 PM CT' },
];
const ROLES = ['Owner', 'Admin', 'Support'];
const INV = [
  { id: 'in_1QxT4mNs0291', c: 'Northshore Group', amt: '$1,495.00', st: 'Paid', d: 'Dec 8, 2026', card: 'Visa ending 4242' },
  { id: 'in_1QxR9aRc0288', c: 'Red Cliff Collective', amt: '$1,450.00', st: 'Paid', d: 'Dec 6, 2026', card: 'Amex ending 1007' },
  { id: 'in_1QxQ2cCb0285', c: 'Copper Basin Realty', amt: '$3,750.00', st: 'Paid', d: 'Dec 5, 2026', card: 'Visa ending 1881' },
  { id: 'in_1QxP7tTw0283', c: 'Tidewater Property Co.', amt: '$97.00', st: 'Failed', d: 'Dec 4, 2026', card: 'Mastercard ending 5521' },
  { id: 'in_1QxN1hHm0279', c: 'Hale & Marlowe Realty', amt: '$695.00', st: 'Open', d: 'Dec 3, 2026', card: 'Visa ending 3310' },
  { id: 'in_1QxK5fFm0270', c: 'Fourth Meridian', amt: '$695.00', st: 'Refunded', d: 'Nov 1, 2026', card: 'Visa ending 9034' },
];
const JOBS = [
  { j: 'session-24h', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM MT / 10:20 AM CT', dur: '0.4 s', st: 'Succeeded', next: '9:25 AM MT / 10:25 AM CT' },
  { j: 'session-1h', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM MT / 10:20 AM CT', dur: '0.3 s', st: 'Succeeded', next: '9:25 AM MT / 10:25 AM CT' },
  { j: 'replay-ready', sch: 'Every 15 min', last: 'Dec 10, 9:15 AM MT / 10:15 AM CT', dur: '0.9 s', st: 'Succeeded', next: '9:30 AM MT / 10:30 AM CT' },
  { j: 'build-48h', sch: 'Hourly', last: 'Dec 10, 9:00 AM MT / 10:00 AM CT', dur: '0.5 s', st: 'Succeeded', next: '10:00 AM MT / 11:00 AM CT' },
  { j: 'weekly-digest', sch: 'Mon 7:00 AM MT / 8:00 AM CT', last: 'Dec 7, 7:00 AM MT / 8:00 AM CT', dur: '48 s', st: 'Succeeded', next: 'Dec 14, 7:00 AM MT / 8:00 AM CT' },
  { j: 'announcement', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM MT / 10:20 AM CT', dur: '0.2 s', st: 'Succeeded', next: '9:25 AM MT / 10:25 AM CT' },
  { j: 'billing', sch: 'Hourly', last: 'Dec 10, 9:00 AM MT / 10:00 AM CT', dur: '2.1 s', st: 'Succeeded', next: '10:00 AM MT / 11:00 AM CT' },
  { j: 'accelerator-reminders', sch: 'Daily 9:00 AM MT / 10:00 AM CT', last: 'Dec 10, 9:00 AM MT / 10:00 AM CT', dur: '1.4 s', st: 'Succeeded', next: 'Dec 11, 9:00 AM MT / 10:00 AM CT' },
  { j: 'ghl-sync', sch: 'Every 10 min', last: 'Dec 10, 9:20 AM MT / 10:20 AM CT', dur: '3.8 s', st: 'Running', next: '9:30 AM MT / 10:30 AM CT' },
  { j: 'ghl-logins', sch: 'Every 10 min', last: 'Dec 10, 9:10 AM MT / 10:10 AM CT', dur: '1.1 s', st: 'Succeeded', next: '9:30 AM MT / 10:30 AM CT' },
  { j: 'ghl-orders', sch: 'Every 10 min', last: 'Dec 10, 9:10 AM MT / 10:10 AM CT', dur: '0.6 s', st: 'Failed', next: '9:30 AM MT / 10:30 AM CT' },
  { j: 'ghl-extras', sch: 'Hourly', last: 'Dec 10, 9:00 AM MT / 10:00 AM CT', dur: '0.8 s', st: 'Waiting', next: '10:00 AM MT / 11:00 AM CT' },
];
const HOOKS = [
  { src: 'GoHighLevel', ev: 'order.sync', id: 'ord_2291', st: 'Failed', att: '3 of 5', next: 'Dec 10, 9:30 AM MT / 10:30 AM CT', err: '401 Unauthorized from GHL API' },
  { src: 'GoHighLevel', ev: 'order.sync', id: 'ord_2288', st: 'Failed', att: '3 of 5', next: 'Dec 10, 9:30 AM MT / 10:30 AM CT', err: '401 Unauthorized from GHL API' },
  { src: 'GoHighLevel', ev: 'login.sync', id: 'u_1077', st: 'Retrying', att: '2 of 5', next: 'Dec 10, 9:30 AM MT / 10:30 AM CT', err: '401 Unauthorized from GHL API' },
  { src: 'Stripe', ev: 'invoice.payment_failed', id: 'evt_1QxP7tTw83', st: 'Delivered', att: '1 of 5', next: '—', err: '—' },
  { src: 'Stripe', ev: 'checkout.session.completed', id: 'evt_1QxQ2cCb85', st: 'Delivered', att: '1 of 5', next: '—', err: '—' },
  { src: 'Stripe', ev: 'customer.subscription.updated', id: 'evt_1QxN1hHm79', st: 'Failed', att: '5 of 5', next: 'None, attempts used', err: 'Handler timeout after 10 s' },
  { src: 'Zoom', ev: 'recording.completed', id: '—', st: 'Not configured', att: '—', next: '—', err: 'Recording webhook is not live' },
];
const ENDPOINTS = [
  { p: 'GET /api/events', req: '41,208', p50: 'stream', p95: 'stream', er: 0.1 }, { p: 'GET /api/snapshot', req: '18,940', p50: '48 ms', p95: '212 ms', er: 0.2 },
  { p: 'POST /api/mutate', req: '6,312', p50: '61 ms', p95: '240 ms', er: 0.4 }, { p: 'GET /api/skills', req: '5,926', p50: '35 ms', p95: '118 ms', er: 0.0 },
  { p: 'GET /api/course', req: '3,410', p50: '42 ms', p95: '160 ms', er: 0.1 }, { p: 'GET /api/sessions/:id/join', req: '286', p50: '90 ms', p95: '410 ms', er: 0.7 },
  { p: 'POST /api/billing/webhook', req: '142', p50: '120 ms', p95: '880 ms', er: 2.1 }, { p: 'POST /api/crm-sync', req: '96', p50: '310 ms', p95: '1,940 ms', er: 6.3 },
];
/* D-263: each email's delivery from Resend's webhook (st: Sent, Delivered, Delayed, Bounced or Complained), when it
   was delivered (dl), its opens (op, first fo, last lo), its clicks (cl, first fc, last lc) and the last link
   clicked (ln), and a bounce's type, subtype and message (br). */
const EMAILS = [
  { to: 'elena@northshoregroup.example', tpl: 'session-24h', sub: 'Tomorrow at 12:00 PM MT / 1:00 PM CT: Session 2 live build', st: 'Delivered', t: 'Dec 8, 12:00 PM MT / 1:00 PM CT', dl: 'Dec 8, 12:00 PM MT / 1:00 PM CT', op: 2, fo: 'Dec 8, 12:41 PM MT / 1:41 PM CT', lo: 'Dec 8, 6:40 PM MT / 7:40 PM CT', cl: 1, fc: 'Dec 8, 12:42 PM MT / 1:42 PM CT', lc: 'Dec 8, 12:42 PM MT / 1:42 PM CT', ln: 'https://learn.example.com/sessions/2' },
  { to: 'sam@tidewaterproperty.example', tpl: 'payment-failed', sub: 'Your Insiders payment did not go through', st: 'Delivered', t: 'Dec 4, 9:04 AM MT / 10:04 AM CT', dl: 'Dec 4, 9:04 AM MT / 10:04 AM CT', op: 1, fo: 'Dec 4, 9:30 AM MT / 10:30 AM CT', lo: 'Dec 4, 9:30 AM MT / 10:30 AM CT', cl: 0 },
  { to: 'devon@copperbasin.example', tpl: 'replay-ready', sub: 'The Session 2 replay is ready', st: 'Delivered', t: 'Dec 9, 3:10 PM MT / 4:10 PM CT', dl: 'Dec 9, 3:10 PM MT / 4:10 PM CT', op: 3, fo: 'Dec 9, 3:12 PM MT / 4:12 PM CT', lo: 'Dec 9, 8:12 PM MT / 9:12 PM CT', cl: 2, fc: 'Dec 9, 3:13 PM MT / 4:13 PM CT', lc: 'Dec 9, 8:13 PM MT / 9:13 PM CT', ln: 'https://learn.example.com/replays/2' },
  { to: 'tessa@lanternstreet.example', tpl: 'magic-link', sub: 'Your sign-in link', st: 'Delivered', t: 'Dec 9, 11:26 AM MT / 12:26 PM CT', dl: 'Dec 9, 11:26 AM MT / 12:26 PM CT', op: 1, fo: 'Dec 9, 11:27 AM MT / 12:27 PM CT', lo: 'Dec 9, 11:27 AM MT / 12:27 PM CT', cl: 1, fc: 'Dec 9, 11:27 AM MT / 12:27 PM CT', lc: 'Dec 9, 11:27 AM MT / 12:27 PM CT', ln: 'https://learn.example.com/sign-in' },
  { to: 'priya@fourthmeridian.example', tpl: 'weekly-digest', sub: 'This week: 2 new AI Employees', st: 'Bounced', t: 'Dec 7, 7:00 AM MT / 8:00 AM CT', op: 0, cl: 0, br: 'Permanent · General · The mailbox does not exist.' },
  { to: 'jordan@halemarlowe.example', tpl: 'receipt', sub: 'Receipt for Team Plan, 16 seats', st: 'Sent', t: 'Dec 10, 9:18 AM MT / 10:18 AM CT', op: 0, cl: 0 },
  { to: 'noor@redcliffcollective.example', tpl: 'announcement', sub: 'New in the vault: listing appointment checklist', st: 'Delivered', t: 'Dec 8, 3:00 PM MT / 4:00 PM CT', dl: 'Dec 8, 3:00 PM MT / 4:00 PM CT', op: 0, cl: 0 },
];
const DEPLOYS = [
  { sha: 'a3f91c2', m: 'Scope 16px floor and 44px targets to phone widths', a: 'Connor Leiva', t: 'Dec 9, 10:42 PM MT / 11:42 PM CT', st: 'Live', dur: '1m 48s' },
  { sha: '7be20d4', m: 'Curriculum: fitted grid, tier pill, drag handles', a: 'Avery Stone', t: 'Dec 9, 3:15 PM MT / 4:15 PM CT', st: 'Succeeded', dur: '1m 52s' },
  { sha: 'c41d8e0', m: 'GHL orders: back off on 401 and record last error', a: 'Connor Leiva', t: 'Dec 8, 8:02 PM MT / 9:02 PM CT', st: 'Succeeded', dur: '1m 44s' },
  { sha: '19aa6f3', m: 'Sidebar: collapsible groups and cohort switcher', a: 'Avery Stone', t: 'Dec 8, 11:20 AM MT / 12:20 PM CT', st: 'Failed', dur: '0m 39s' },
  { sha: 'e5527b9', m: 'Cohort starts at first build (migration 0014)', a: 'Connor Leiva', t: 'Dec 2, 9:48 AM MT / 10:48 AM CT', st: 'Succeeded', dur: '2m 03s' },
];
const INCIDENTS = [
  { id: 'INC-0007', t: 'GHL order sync failing with 401', sev: 'Sev 2', st: 'Open', o: 'Dec 9, 9:14 PM MT / 10:14 PM CT', own: 'Imani Brooks', links: [['jobs', 'Job ghl-orders'], ['api', '3 webhook deliveries']],
    tl: [['Dec 9, 9:14 PM MT / 10:14 PM CT', 'Opened automatically after 3 failed runs of ghl-orders.'], ['Dec 9, 9:20 PM MT / 10:20 PM CT', 'Imani Brooks confirmed orders are saved locally. Only the GHL copy is behind.'], ['Dec 9, 10:42 PM MT / 11:42 PM CT', 'Deploy a3f91c2 went live. No change in error rate.']] },
  { id: 'INC-0006', t: 'Stripe subscription.updated handler timeout', sev: 'Sev 3', st: 'Acknowledged', o: 'Dec 8, 7:31 PM MT / 8:31 PM CT', own: 'Avery Stone', links: [['api', '1 webhook delivery']],
    tl: [['Dec 8, 7:31 PM MT / 8:31 PM CT', 'Opened after a delivery used all 5 attempts.'], ['Dec 8, 7:40 PM MT / 8:40 PM CT', 'Acknowledged by Avery Stone.']] },
  { id: 'INC-0005', t: 'Weekly digest bounces above 2%', sev: 'Sev 3', st: 'Resolved', o: 'Dec 7, 7:12 AM MT / 8:12 AM CT', own: 'Connor Leiva', links: [['email', 'Email log, weekly-digest']],
    tl: [['Dec 7, 7:12 AM MT / 8:12 AM CT', 'Opened by Connor Leiva.'], ['Dec 7, 2:05 PM MT / 3:05 PM CT', 'Canceled workspaces removed from the digest audience.'], ['Dec 7, 2:10 PM MT / 3:10 PM CT', 'Resolved by Connor Leiva.']] },
];
const AUDIT0 = [
  { t: 'Dec 10, 8:58 AM MT / 9:58 AM CT', actor: 'Connor Leiva', act: 'job.run_now', tg: 'ghl-orders', d: 'Manual run. Failed with 401.' },
  { t: 'Dec 9, 9:31 PM MT / 10:31 PM CT', actor: 'Avery Stone', act: 'masquerade.stop', tg: 'Sam Whitlock', d: 'Exited by staff after 6 min.' },
  { t: 'Dec 9, 9:27 PM MT / 10:27 PM CT', actor: 'Avery Stone', act: 'masquerade.blocked_action', tg: 'Sam Whitlock', d: 'Tried: Refund in_1QxP7tTw0283.' },
  { t: 'Dec 9, 9:25 PM MT / 10:25 PM CT', actor: 'Avery Stone', act: 'masquerade.start', tg: 'Sam Whitlock', d: 'Reason: Customer cannot see the Session 2 replay.' },
  { t: 'Dec 9, 5:02 PM MT / 6:02 PM CT', actor: 'Imani Brooks', act: 'audit.export', tg: 'Audit log', d: 'CSV, last 7 days, 212 rows.' },
  { t: 'Dec 9, 3:20 PM MT / 4:20 PM CT', actor: 'Avery Stone', act: 'module.publish', tg: 'Sales AI Employee', d: 'Draft to Published.' },
  { t: 'Dec 9, 2:10 PM MT / 3:10 PM CT', actor: 'Connor Leiva', act: 'permission.change', tg: 'Support', d: 'Refund or void an invoice: allowed to not allowed.' },
  { t: 'Dec 8, 4:44 PM MT / 5:44 PM CT', actor: 'Connor Leiva', act: 'tier.access_change', tg: 'Database AI Employee', d: 'Team only to Agent + Team.' },
  { t: 'Dec 8, 9:05 AM MT / 10:05 AM CT', actor: 'Imani Brooks', act: 'email_log.export', tg: 'Email log', d: 'CSV, template weekly-digest, 388 rows.' },
  { t: 'Nov 1, 4:44 PM MT / 5:44 PM CT', actor: 'Connor Leiva', act: 'billing.refund', tg: 'in_1QxK5fFm0270', d: '$695.00. Reason: canceled inside trial window.' },
];
const PERMS0 = [
  ['build', 'Edit curriculum, vault, sessions, announcements, tiers', [1, 1, 0]], ['masq', 'Start and extend masquerade', [1, 1, 0]], ['account', 'Send password reset or change email', [1, 1, 1]],
  ['billview', 'View billing', [1, 1, 1]], ['refund', 'Refund or void an invoice', [1, 1, 0]], ['jobs', 'Run a job now, retry a webhook, update incidents', [1, 1, 0]],
  ['export', 'Export audit and email logs', [1, 1, 1]], ['ops', 'View integrations, deploys, DB health, flags, roles', [1, 1, 0]], ['staff', 'Edit staff roles and this matrix', [1, 0, 0]],
];
const NAV = [
  ['Overview', [['overview', 'Overview']]],
  ['Program', [['program', 'Program']]],
  ['Cohort', [['cohort', 'Cohort']]],
  ['People', [['people', 'People']]],
  ['Revenue', [['revenue', 'Revenue']]],
  ['Operations', [['health', 'System Health'], ['incidents', 'Incidents', 0, '1'], ['audit', 'Audit Log'], ['api', 'API & Webhooks'], ['jobs', 'Scheduled Jobs'], ['email', 'Email Log'], ['integrations', 'Integrations', 'ops'], ['deploys', 'Deploys & Commits', 'ops'], ['db', 'DB Health', 'ops'], ['flags', 'Environment Flags', 'ops']]],
  ['Access', [['roles', 'Roles & Permissions', 'ops']]],
];
const PARENT = { builder: 'program', workspace: 'people', user: 'people', incident: 'incidents', as: 'people', newcohort: 'cohort' };
const TONE = { Active: 'ok', Paid: 'ok', Delivered: 'ok', Opened: 'ok', Succeeded: 'ok', Live: 'ok', Published: 'ok', Connected: 'ok', Resolved: 'ok', Present: 'ok', Sent: 'ok', On: 'ok', Healthy: 'ok', Ready: 'ok', Approved: 'ok',
  Running: 'run', Retrying: 'run', Scheduled: 'info', Trialing: 'info', Queued: 'info', Acknowledged: 'info', Upcoming: 'info',
  Failed: 'bad', 'Past due': 'bad', Bounced: 'bad', Complained: 'bad', Degraded: 'bad', 'Sev 2': 'bad', 'Sev 1': 'bad',
  Waiting: 'warn', 'Not configured': 'warn', 'Sev 3': 'warn', Pending: 'warn', Refunded: 'warn', Delayed: 'warn',
  Draft: 'off', Off: 'off', Canceled: 'off', Open: 'warn' };

/* ---------- primitives ---------- */
const Ctx = createContext(null);
const AreaCtx = createContext(0);
const useC = () => useContext(Ctx);
const ini = n => n.split(' ').map(x => x[0]).join('').slice(0, 2);
const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
const St = ({ v, tone }) => <span className={'st ' + (tone || TONE[v] || '')}><i />{v}</span>;
const Pill = ({ v, tone, children }) => <span className={'pl ' + (tone !== undefined ? tone : TONE[v] === 'run' ? 'info' : TONE[v] === 'off' ? '' : TONE[v] || '')}>{children || v}</span>;
const Btn = ({ k = '', ic, children, ...p }) => <button className={'b ' + k} {...p}>{ic && <I n={ic} />}{children}</button>;
const fixedSeats = w => !!w && (w.plan === 'AI Accelerator' || w.plan === 'Insiders');
const Bar = ({ v, max = 100, v2, fx }) => <span className={'bar' + (fx && v >= max ? ' full' : v2 === undefined && max !== 100 && v / max >= 0.9 ? ' hot' : '')}><i style={{ width: (v / max) * 100 + '%' }} />{v2 !== undefined && <i className="b2" style={{ width: (v2 / max) * 100 + '%' }} />}</span>;
const KV = ({ rows }) => <dl className="kv">{rows.map(([k, v], i) => <Fragment key={i}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>;
const Sel = ({ v, on, opts, label }) => <select className="in" aria-label={label} value={v} onChange={e => on(e.target.value)}>{opts.map(o => <option key={o}>{o}</option>)}</select>;
const Find = ({ v, on, ph }) => <span className="sin"><I n="search" /><input className="in" placeholder={ph} aria-label={ph} value={v} onChange={e => on(e.target.value)} /></span>;
const Facts = ({ items }) => <div className="cd fx">{items.map(([k, v, full], i) => <div key={i} className={full ? 'fxw' : undefined}><span className="me">{k}</span><span className="w5 el"><Stamp v={v} fx /></span></div>)}</div>;
const Card = ({ t, sub, right, children, pad = true }) => <section className="cd">{t && <div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>{t}</h2>{sub && <span className="me">{sub}</span>}</div>{right}</div>}{pad ? <div className="cdb">{children}</div> : children}</section>;

function GBtn({ perm, label, go, k = '', ic, children }) {
  const { masq, guard, can } = useC();
  const locked = masq || !can(perm);
  return <Btn k={k} ic={locked ? 'lock' : ic} onClick={() => guard(perm, label, go)} title={masq ? 'Blocked while masquerading' : !can(perm) ? 'Your role cannot do this' : undefined}>{children}</Btn>;
}
function Head({ t, d, right, back, meta }) {
  const { go, ph } = useC();
  if (useContext(AreaCtx)) return d || right ? <div className="shd">{d ? <p className="s2">{d}</p> : <span />}{right && <div className="row">{right}</div>}</div> : null;
  return <div className="col m">
    {back && <button className="b q" style={{ alignSelf: 'flex-start', marginLeft: -10, height: ph ? 44 : 28 }} onClick={() => go(back[0])}><I n="back" />{back[1]}</button>}
    <div className="hd"><div className="col s" style={{ flex: '1 1 320px' }}><div className="row" style={{ gap: 10 }}><h1>{t}</h1>{meta}</div>{d && <p className="s2" style={{ maxWidth: 720 }}>{d}</p>}</div>{right && <div className="row">{right}</div>}</div>
  </div>;
}
function Empty({ ic = 'file', t, b, cta, on }) {
  return <div className="emp"><span className="ic"><I n={ic} s={18} /></span><span className="w6" style={{ fontSize: 'var(--sh)' }}>{t}</span>{b && <p className="mu" style={{ maxWidth: 380 }}>{b}</p>}{cta && <Btn onClick={on} style={{ marginTop: 10 }}>{cta}</Btn>}</div>;
}
function ErrBox() {
  const { setDs } = useC();
  return <div className="emp" role="alert"><span className="ic" style={{ color: 'var(--bad)', background: 'var(--badb)', borderColor: '#F0CFC6' }}><I n="incidents" s={18} /></span><span className="w6" style={{ fontSize: 'var(--sh)' }}>This didn't load</span><p className="mu" style={{ maxWidth: 380 }}>The admin API returned a 502. Nothing was changed.</p><Btn ic="refresh" onClick={() => setDs('default')} style={{ marginTop: 10 }}>Retry</Btn></div>;
}
const Skel = ({ n = 5 }) => <div className="cd pd col" aria-busy="true" aria-label="Loading" style={{ gap: 18 }}>{Array.from({ length: n }).map((_, i) => <div key={i} className="sk" style={{ width: 88 - i * 12 + '%' }} />)}</div>;
function Gate({ children, n, empty }) {
  const { ds } = useC();
  if (ds === 'loading') return <Skel n={n} />;
  if (ds === 'error') return <div className="cd"><ErrBox /></div>;
  if (ds === 'empty' && empty) return <div className="cd"><Empty {...empty} /></div>;
  return children;
}
function Tabs({ tabs, v, on }) {
  const { ph } = useC();
  if (useContext(AreaCtx) && !ph) return <div className="sgm stb" role="tablist">{tabs.map(([k, l, c]) => <button key={k} type="button" role="tab" aria-selected={v === k} className={v === k ? 'on' : ''} onClick={() => on(k)}>{l}{c !== undefined && <span className="tn">{c}</span>}</button>)}</div>;
  if (ph) return <select className="in" style={{ width: '100%' }} aria-label="Section" value={v} onChange={e => on(e.target.value)}>{tabs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
  return <div className="tabs" role="tablist">{tabs.map(([k, l, c]) => <button key={k} role="tab" aria-selected={v === k} className={'tab' + (v === k ? ' on' : '')} onClick={() => on(k)}>{l}{c !== undefined && <span className="mu" style={{ marginLeft: 6, fontWeight: 400 }}>{c}</span>}</button>)}</div>;
}
function Menu({ items, up, trigger, lf, rt }) {
  const [o, setO] = useState(false);
  const { masq } = useC();
  return <span className="menu" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setO(false); }}>
    {trigger ? trigger(() => setO(!o), o) : <button className="ib" aria-label="More actions" aria-expanded={o} onClick={() => setO(!o)}><I n="more" /></button>}
    {o && <div className={'pop' + (up ? ' up' : '') + (lf ? ' lf' : '') + (rt ? ' rt' : '')} role="menu">{items.map((it, i) => it === '-' ? <hr key={i} /> : <button key={i} role="menuitem" disabled={it.off} className={it.d ? 'd' : ''} onClick={() => { setO(false); it.fn(); }}>{(it.off || (it.g && masq)) ? <I n="lock" /> : it.ic ? <I n={it.ic} /> : null}{it.l}{it.on && <span style={{ marginLeft: 'auto' }}><I n="check" /></span>}</button>)}</div>}
  </span>;
}
/* Table: CSS-grid rows. cols: {k,l,w,r,mo,num,ns,hide:'lap'}; menu(r) -> "…" items; quick(r) -> hover icon buttons; primary(r) -> always-visible control */
function Table({ cols, rows, onRow, menu, quick, primary, aw, empty, sel, bulk, onMove, title, right, card }) {
  const { ph, lap, ds } = useC();
  const [sort, setSort] = useState(null), [chk, setChk] = useState({}), [drag, setDrag] = useState(null), [over, setOver] = useState(null);
  const box = useRef(null), [tw, setTw] = useState(9999);
  useEffect(() => { const el = box.current; if (!el) return; const g = () => setTw(el.clientWidth); g(); const ro = new ResizeObserver(g); ro.observe(el); return () => ro.disconnect(); }, []);
  const need = cs => cs.reduce((a, c) => a + (parseInt(((c.w || '').match(/(\d+)px/) || [0, 120])[1], 10)) + 16, 0) + 40 + (onMove ? 36 : 0) + (sel ? 32 : 0) + (menu || quick || primary ? parseInt(aw || '32', 10) + 16 : 0);
  const drop = !ph && need(cols) > tw && (lap || tw < 800);
  const vis = cols.filter(c => !(c.hide === 'lap' && drop));
  const tight = need(vis) > tw;
  const hasA = menu || quick || primary;
  const tpl = (onMove ? '20px ' : '') + (sel ? '16px ' : '') + vis.map(c => (c.w || 'minmax(0,1fr)').replace(/minmax\(\d+px,/, tight ? 'minmax(0,' : '$&')).join(' ') + (hasA ? ' ' + (aw || '32px') : '');
  const head = !ph && <div className="th" style={{ gridTemplateColumns: tpl }}>
    {onMove && <span />}
    {sel && <input type="checkbox" className="chk" aria-label="Select all" checked={rows.length > 0 && rows.every((_, i) => chk[i])} onChange={e => setChk(e.target.checked ? Object.fromEntries(rows.map((_, i) => [i, true])) : {})} />}
    {vis.map((c, i) => <span key={i} className={c.num ? 'r' : ''} aria-sort={sort && sort.i === i ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined}>{c.ns || onMove ? c.l : <button onClick={() => setSort({ i, dir: sort && sort.i === i ? -sort.dir : 1 })}>{c.l}<span className={'ar' + (sort && sort.i === i ? ' on' : '')}><I n={sort && sort.i === i && sort.dir < 0 ? 'down' : 'up'} s={12} /></span></button>}</span>)}
    {hasA && <span />}
  </div>;
  const wrap = body => <section className="cd" ref={box}>{title && <div className="cdh"><h2 style={{ flex: 1 }}>{title}</h2>{right}</div>}{body}</section>;
  if (ds === 'loading') return wrap(<div aria-busy="true" aria-label="Loading">{head}{Array.from({ length: 6 }).map((_, i) => <div key={i} className="tr" style={{ gridTemplateColumns: ph ? '1fr' : tpl }}>{(ph ? [0] : [...(onMove ? [0] : []), ...(sel ? [0] : []), ...vis]).map((_, j) => <div key={j} className="sk" style={{ width: 40 + ((i * 7 + j * 13) % 50) + '%' }} />)}</div>)}</div>);
  if (ds === 'error') return wrap(<ErrBox />);
  if (ds === 'empty' || !rows.length) return wrap(<Empty {...(ds === 'empty' ? empty || { t: 'Nothing here yet' } : { ic: 'search', t: 'No matches', b: 'Try a different search or clear the filters.' })} />);
  const val = (c, r) => (c.sv ? c.sv(r) : r[c.k]);
  const data = sort && !onMove ? [...rows].sort((a, b) => { const c = vis[sort.i]; const x = val(c, a), y = val(c, b); return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; }) : rows;
  const cell = (c, r) => (c.r ? c.r(r, { drop, tight, tw }) : r[c.k]);
  const nSel = Object.values(chk).filter(Boolean).length;
  const key = r => rows.indexOf(r);
  const click = (e, r) => { if (onRow && !e.target.closest('button,a,input,select,label')) onRow(r); };
  const acts = (r, i) => <div className="ra">
    {quick && <span className="hv">{quick(r).map((q, j) => <button key={j} className="ib" aria-label={q.l} title={q.l} onClick={q.fn}><I n={q.ic} /></button>)}</span>}
    {primary && primary(r)}
    {menu && <Menu items={menu(r)} up={data.length > 5 && i >= data.length - 2} />}
  </div>;
  const bulkBar = sel && nSel > 0 && <div className="li" style={{ background: '#F3F8F5' }}><span className="w5">{nSel} selected</span><span className="sp" />{bulk}<Btn k="q" onClick={() => setChk({})}>Clear</Btn></div>;
  const pm = (r, i) => [...(quick ? quick(r).map(q => ({ l: q.l, ic: q.ic, fn: q.fn })) : []), ...(onMove && i > 0 ? [{ l: 'Move up', ic: 'up', fn: () => onMove(i, i - 1) }] : []), ...(onMove && i < data.length - 1 ? [{ l: 'Move down', ic: 'down', fn: () => onMove(i, i + 1) }] : []), ...(onMove && menu ? ['-'] : []), ...(menu ? menu(r) : [])];
  if (ph && card) return wrap(<div>{data.map((r, i) => <div key={key(r)} className="pc" style={{ borderBottom: i < data.length - 1 ? '1px solid var(--line)' : 0 }}>{card(r, i, pm(r, i), data.length > 3 && i >= data.length - 2)}</div>)}</div>);
  if (ph) return wrap(<div>{bulkBar}{data.map((r, i) => <div key={key(r)} className="pc" style={{ borderBottom: i < data.length - 1 ? '1px solid var(--line)' : 0 }} onClick={e => click(e, r)}>
    <div className="row nw" style={{ alignItems: 'flex-start' }}>
      {sel && <label style={{ display: 'flex', width: 44, height: 44, margin: '-10px 0 -10px -11px', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><input type="checkbox" className="chk" aria-label="Select row" checked={!!chk[key(r)]} onChange={e => setChk({ ...chk, [key(r)]: e.target.checked })} /></label>}
      <div className={'w6' + (cols[0].mo ? ' mo' : '')} style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word' }}>{cell(cols[0], r)}</div>
      {(menu || onMove) && <span style={{ margin: '-8px -8px 0 0' }}><Menu items={pm(r, i)} up={data.length > 3 && i >= data.length - 2} /></span>}
    </div>
    {cols.slice(1).map((c, j) => <div key={j} className="pc-r"><span className="mu">{c.l}</span><span className={c.mo ? 'mo' : ''}>{cell(c, r)}</span></div>)}
    {primary && primary(r) && <div className="row" style={{ paddingTop: 6 }}>{primary(r)}</div>}
  </div>)}</div>);
  return wrap(<div>{bulkBar}{head}{data.map((r, i) => <div key={key(r)} className={'tr' + (onRow ? ' ck' : '') + (chk[key(r)] ? ' sel' : '') + (drag === i ? ' drg' : '') + (over === i && drag !== null && drag !== i ? ' over' : '')} style={{ gridTemplateColumns: tpl }} onClick={e => click(e, r)}
    onDragOver={onMove ? e => { e.preventDefault(); setOver(i); } : undefined} onDrop={onMove ? () => { if (drag !== null && drag !== i) onMove(drag, i); setDrag(null); setOver(null); } : undefined}>
    {onMove && <button className="grip" draggable aria-label={'Reorder row ' + (i + 1) + '. Alt plus arrow keys move it.'} title="Drag to reorder" onDragStart={() => setDrag(i)} onDragEnd={() => { setDrag(null); setOver(null); }}
      onKeyDown={e => { if (e.altKey && e.key === 'ArrowUp' && i > 0) { e.preventDefault(); onMove(i, i - 1); } if (e.altKey && e.key === 'ArrowDown' && i < data.length - 1) { e.preventDefault(); onMove(i, i + 1); } }}><I n="grip" s={14} /></button>}
    {sel && <input type="checkbox" className="chk" aria-label="Select row" checked={!!chk[key(r)]} onChange={e => setChk({ ...chk, [key(r)]: e.target.checked })} />}
    {vis.map((c, j) => <div key={j} className={'cl' + (c.mo ? ' mo' : '') + (c.num ? ' r tn' : '') + (c.ov ? ' ov' : '')}>{j === 0 && onRow && !c.r ? <button className={'lk el' + (c.mo ? ' mo' : '')} style={{ display: 'block' }} onClick={() => onRow(r)}>{cell(c, r)}</button> : cell(c, r)}</div>)}
    {hasA && acts(r, i)}
  </div>)}</div>);
}
function Modal({ title, children, foot, onClose, lock, w }) {
  return <div className="scrim" onMouseDown={e => { if (!lock && e.target === e.currentTarget) onClose(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={w ? { maxWidth: w } : undefined}>
      <div className="mh"><h2 style={{ flex: 1, paddingTop: 4 }}>{title}</h2>{!lock && <button className="ib" style={{ margin: '-2px -8px 0 0' }} aria-label="Close" onClick={onClose}><I n="x" /></button>}</div>
      <div className="mb">{children}</div>
      {foot && <div className="mf">{foot}</div>}
    </div>
  </div>;
}
const Stat = ({ l, v, sub, go, tone }) => {
  const C = go ? 'button' : 'div';
  return <C className="cd stat" onClick={go}><span className="mu stl">{l}</span><span className="fig">{v}</span>{sub && <span className="me" style={tone ? { color: 'var(--' + tone + ')' } : undefined}>{sub}</span>}</C>;
};
const nb = s => typeof s === 'string' && s.includes('-') ? s.split(/(\S+-\S+)/).map((p, i) => i % 2 ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{p}</span> : p) : s;
/* D-267 (PR #286's review): words with a time in MT and CT, "Dec 9, 9:14 PM MT / 10:14 PM CT" (the app's Stamp). `two`: a
   table's narrow column, the MT moment over its zones ("Dec 9, 9:14 PM" over "MT / 10:14 PM CT"); `fx`: a key fact's, one
   line, and those two on a phone; otherwise a line never breaks inside a time, between a time and its zone, or before
   the "/". */
const Stamp = ({ v, two, fx }) => { if (typeof v !== 'string' || !v.includes(' MT / ')) return v; const i = v.indexOf(' MT / '), L = { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' };
  if (fx) return <span className="tzp"><span>{v.slice(0, i)}</span> <span>{v.slice(i + 1)}</span></span>;
  return two ? <span style={{ display: 'block' }}><span style={L}>{v.slice(0, i)}</span> <span style={L}>{v.slice(i + 1)}</span></span> : v.split(/(\d{1,2}:\d{2} [AP]M MT \/|\d{1,2}:\d{2} [AP]M CT)/).map((p, j) => j % 2 ? <span key={j} style={{ whiteSpace: 'nowrap' }}>{p}</span> : p); };
const brk = s => typeof s === 'string' && s.includes('@') ? s.split('@').map((p, i) => <Fragment key={i}>{i > 0 && <>@<wbr /></>}{p}</Fragment>) : s;
const Two = ({ a, b, mo }) => <div className="col" style={{ gap: 0 }}><span className="w5 el">{a}</span><span className={'me el' + (mo ? ' mo' : '')}>{brk(b)}</span></div>;

/* ---------- admin screens ---------- */
/* ---------- D-270 (R-5 Phase 9): the Overview, the mockup's `Home` (handoff/admin-mockup/p3-areas.jsx) ----------
   Ported on this reference's own data (its now, Thu, Dec 10): the program as its pages draw it (`P6_LIB`), December running
   its weeks on `P6_DEC_RUN` with its sessions (`P6_DEC_SES`) and January created as a draft (`P3_COH.jan27`); People's
   audiences (`P7_PEOPLE`); Revenue's figures (`RV_PER`, `RV_NEXT`, `RV_FAILED`); Plans & Upgrades' requests and the open
   incident. Each figure is the app's rule: a cohort's run counts its published weeks (a draft week is no learner's yet);
   its Teams and Learners are its roster's (D-267: December's one AI Accelerator team); a draft's group is Before It Opens'
   lines not done, its Sessions line naming the Thursday its office hours meet at December's; failed payments say how many
   Stripe is retrying; each audience segment opens People filtered. Every time is "12:00 PM MT / 1:00 PM CT". */
const HOME_REQ = () => TIERS_REQ0.filter(r => r[4] === 'Pending');
const homeDecSes = () => P6_DEC_SES.map(s => ({ ...s, mins: s.k === 'Live build' ? 90 : 60 }));
const homeDecRun = () => P6_DEC_RUN.filter(w => P6_LIB[w.n].st !== 'Draft');
const homeShort = c => c.n.replace(' Cohort', '');
const homeWord = n => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] || String(n);
function homeBefore(c) {
  const clash = c.ses.filter(s => homeDecSes().some(x => x.start === s.start)).length;
  return p3Before(c).map(l => l[0] === 'Sessions' ? ['Sessions', c.ses.length + ' on the calendar' + (clash ? '. ' + clash + ' are at the same time as December’s office hours.' : ''), c.ses.length > 0 && !clash, 'cohorts'] : l);
}
function Overview() {
  const { go } = useC();
  const dec = P3_COH.dec26, jan = P3_COH.jan27, ses = homeDecSes(), run = homeDecRun(), build = run.filter(w => w.n > 0);
  const wk = Math.max(1, ...build.filter(w => w.opens <= NOW_P3).map(w => w.n));
  const dr = P6_LIB.filter(w => w.st === 'Draft').length, ul = P7_PEOPLE.filter(x => x.a === 'Utah Life').length, acc = P7_PEOPLE.filter(x => x.a === 'AI Accelerator').length;
  const noZoom = ses.filter(s => !s.zoom && s.start > NOW_P3), retry = RV_NEXT.filter(r => r[4] === 'Retrying').length, req = HOME_REQ(), inc = INCIDENTS.filter(i => i.st === 'Open').length;
  const at = (c, to) => () => { P3C = c; go(to); };
  const groups = [
    [dec.n, noZoom.length ? [['cohorts', noZoom.length + ' sessions have no Zoom link', 'The next one without a link is ' + mtDay(noZoom[0].start) + '.', at(dec, 'cohorts'), 'warn']] : []],
    [jan.n + ' · Draft', homeBefore(jan).filter(l => !l[2]).map(l => ['cohorts', l[0], l[1], at(jan, l[3]), 'warn'])],
    ['Payments and system', [['billing', RV_FAILED + ' payments failed', 'Stripe is retrying ' + homeWord(retry) + '. ' + homeWord(RV_FAILED - retry).replace(/^./, x => x.toUpperCase()) + ' need a new card.', () => go('payments', null, 'failed'), 'bad'],
      ['tiers', req.length + ' teams asked to move up a plan', 'From ' + req.map(r => r[0]).join(' and ') + '.', () => go('tiers'), ''], ['incidents', inc + ' incident is open', 'Open it in Operations.', () => go('incidents'), 'bad']]]].filter(g => g[1].length);
  const needN = groups.reduce((a, g) => a + g[1].length, 0);
  const tiles = [
    ['Program', 'curriculum', 'AI Accelerator', P6_LIB.length + ' weeks · ' + (P6_LIB.length - dr) + ' published, ' + dr + ' in draft', () => go('program')],
    ['Cohort', 'cohorts', homeShort(dec), 'Week ' + wk + ' of ' + build.length + ' · ' + acc + ' of ' + dec.cap + ' seats', at(dec, 'cohort')],
    ['People', 'learners', P7_PEOPLE.length + ' with a sign-in', acc + ' in the cohort · ' + ul + ' Utah Life, kept apart', () => go('users')],
    ['Revenue', 'billing', RV_PER['All time'].c + ' collected', '$7,500 still to collect · $12,429 a month', () => go('billing')],
  ];
  const cohorts = [[dec, build.length + ' weeks · ' + p3Meets([1, 2]) + ' · opens ' + mtDay(run[0].opens), 'Active'], [jan, p3Shape(jan) + ' weeks · ' + p3Meets(jan.slots) + ' · opens ' + mtDay(jan.opens), 'Draft']];
  const soon = [...ses.filter(s => s.start + s.mins * 6e4 > NOW_P3).slice(0, 2).map(s => ({ t: s.t, start: s.start, zoom: s.zoom, c: dec })), ...jan.ses.slice(0, 2).map(s => ({ t: s.title, start: s.start, zoom: false, c: jan }))].sort((a, b) => a.start - b.start).slice(0, 4);
  const aud = P7_AUD.map(([a, col]) => [a, P7_PEOPLE.filter(x => x.a === a).length, col]).filter(a => a[1]);
  return <div className="pg">
    <Head t="Overview" d="What you teach, who is going through it, who has a sign-in, and what has been paid. Each one opens its page." />
    <div className="thr">{tiles.map(t => <button key={t[0]} className="cd thl" onClick={t[4]}><span className="tlk"><span className="mt"><I n={t[1]} /></span><span>{t[0]}</span><I n="chev" s={12} w={2.2} /></span><span className="fig el">{t[2]}</span><span className="me">{t[3]}</span></button>)}</div>
    <div className="gms">
      <div className="col">
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Needs You</h2><span className="me">Across the cohort, payments and the system</span></div><span className="pl warn">{needN}</span></div>
          <div className="wkl">{groups.map(g => <Fragment key={g[0]}><div className="ngl">{g[0]}</div>{g[1].map(n => <button key={g[0] + n[1]} className="nyr" onClick={n[3]}><span className={'mt' + (n[4] ? ' ' + n[4] : '')}><I n={n[0]} /></span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{n[1]}</span><span className="me">{n[2]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</Fragment>)}</div></section>
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Who Has a Sign-In</h2><span className="me">{P7_PEOPLE.length} people, each counted once. Utah Life agents are kept out of the learner count and out of revenue.</span></div><Btn onClick={() => go('users')}>People</Btn></div>
          <div className="cdb col m"><div className="aub" aria-hidden="true">{aud.map(a => <i key={a[0]} style={{ flex: a[1], background: a[2] }} />)}</div>
            <div className="aul">{aud.map(a => <button key={a[0]} className="auk" onClick={() => go('users')}><i style={{ background: a[2] }} /><span className="col" style={{ gap: 0 }}><span className="w5 tn">{a[1]}</span><span className="me">{a[0]}</span></span></button>)}</div></div></section>
      </div>
      <div className="col">
        <Card t="Cohorts" right={<Btn ic="plus" onClick={() => go('newcohort')}>New cohort</Btn>}><div className="col m">{cohorts.map(([c, line, st]) => <button key={c.id} className="rnw" onClick={at(c, 'cohort')}><PTile /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{c.n}</span><span className="me el">{line}</span></span><St v={st} /></button>)}</div></Card>
        <Card t="Coming Up" right={<Btn onClick={at(dec, 'cohorts')}>Schedule</Btn>}><div className="col m">{soon.map(s => { const [dow, mon, dd] = mtDay(s.start).replace(',', '').split(' ');
          return <button key={s.c.id + s.start} className="rnw" onClick={at(s.c, 'cohorts')}><span className="dt"><b>{dd}</b><span>{mon}</span></span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{s.t}</span><span className="me el">{dow + ' · ' + mtCt(s.start) + ' · ' + homeShort(s.c)}</span></span>{!s.zoom && <span className="pl warn">No link</span>}</button>; })}</div></Card>
      </div>
    </div>
  </div>;
}

/* Plans & Upgrades' requests (`req`); D-270: the Overview's "2 teams asked to move up a plan" counts the pending ones. */
const TIERS_REQ0 = [['Kenji Watanabe', 'Agent → Team · 16 seats', '$4,000', 'Dec 9, 3:02 PM MT / 4:02 PM CT', 'Pending'], ['Jordan Hale', 'Team · 16 seats → 41 seats', '$4,000', 'Dec 9, 6:12 PM MT / 7:12 PM CT', 'Pending'], ['Rosa Delgado', 'Agent → Team · 16 seats', '$4,000', 'Dec 4, 1:30 PM MT / 2:30 PM CT', 'Approved']];
function TierPill({ m, set }) {
  const { guard, log } = useC();
  const ch = v => guard('build', 'Change tier access for ' + m.n, () => { set(v); log('tier.access_change', m.n, v === 'both' ? 'Team only to Agent + Team.' : 'Agent + Team to Team only.'); });
  return <Menu lf trigger={(t, o) => <button className={'pl ' + (m.tier === 'both' ? 'ok' : 'warn')} aria-expanded={o} aria-label={'Tier access: ' + (m.tier === 'both' ? 'Agent + Team' : 'Team only')} onClick={t}>{m.tier === 'both' ? 'Agent + Team' : 'Team only'}<I n="chevd" s={11} w={2.4} /></button>}
    items={[{ l: 'Agent + Team', on: m.tier === 'both', fn: () => m.tier !== 'both' && ch('both') }, { l: 'Team only', on: m.tier === 'team', fn: () => m.tier !== 'team' && ch('team') }]} />;
}
function Curriculum() {
  const { mods, setMods, started, guard, log, toast, go, setDlg, setPrev, lap, wide, ph } = useC();
  const [q, setQ] = useState(''), [f, setF] = useState('All statuses');
  const upd = (id, p) => setMods(ms => ms.map(m => m.id === id ? { ...m, ...p } : m));
  const pub = (m, on) => guard('build', (on ? 'Publish ' : 'Unpublish ') + m.n, () => setDlg({ title: (on ? 'Publish ' : 'Unpublish ') + m.n + '?', body: on ? 'Learners with access see it in the portal right away.' : 'It is hidden from learners right away. Their progress is kept.', cta: on ? 'Publish' : 'Unpublish', yes: () => { upd(m.id, { st: on ? 'Published' : 'Draft', dep: on ? (m.dep || 0) : m.dep }); log('module.' + (on ? 'publish' : 'unpublish'), m.n, ''); toast(m.n + (on ? ' is published' : ' is now a draft')); } }));
  const filt = q || f !== 'All statuses';
  const rows = mods.filter(m => m.n.toLowerCase().includes(q.toLowerCase()) && (f === 'All statuses' || m.st === f));
  const move = (a, b) => guard('build', 'Reorder curriculum', () => setMods(ms => { const x = [...ms]; const [r] = x.splice(a, 1); x.splice(b, 0, r); return x; }));
  return <div className="pg">
    <Head t="Curriculum" d={mods.length + ' AI Employees · ' + mods.filter(m => m.tier === 'both').length + (ph ? ' in Agent\u00A0Tier\u00A0·\u00A0' : ' in Agent Tier, all in Team Tier · ') + mods.filter(m => m.st === 'Draft').length + '\u00A0draft'}
      right={<GBtn k="p" ic="plus" perm="build" label="New AI Employee" go={() => go('builder')}>New AI Employee</GBtn>} />
    <div className="row"><Find v={q} on={setQ} ph="Filter AI Employees" /><Sel label="Status" v={f} on={setF} opts={['All statuses', 'Published', 'Scheduled', 'Draft']} /></div>
    <Table rows={rows} onMove={filt ? undefined : move} aw="104px" empty={{ ic: 'curriculum', t: 'No AI Employees yet', b: 'Create the first one to start the curriculum.', cta: 'New AI Employee', on: () => go('builder') }}
      cols={[
        { k: 'n', l: 'AI Employee', w: wide ? 'minmax(260px,1.6fr)' : 'minmax(194px,1fr)', r: (m, x) => <div className="row nw" style={{ gap: x.tw < 1100 ? 8 : 12 }}>{x.tw >= 1100 && <span className="me tn" style={{ width: 16, textAlign: 'right', flex: 'none' }}>{mods.indexOf(m) + 1}</span>}<span className="mt" style={x.tw < 1100 ? { width: 28, height: 28 } : undefined}><I n={m.ic} /></span><div className="col" style={{ gap: 0, padding: '6px 0' }}><button className={'lk' + (x.tw < 1100 ? '' : ' el')} onClick={() => go('builder', m.id)}>{m.n}</button><span className="me el">{x.drop ? (m.ses ? m.ses[0].split(' · ')[0] + ' · ' + m.ses[1].split(' · ').slice(0, 2).join(' · ') : 'Self-paced') : nb(m.d)}</span></div></div> },
        { k: 'tier', l: 'Tier access', w: wide || lap ? '124px' : '116px', ov: 1, r: m => <TierPill m={m} set={v => upd(m.id, { tier: v })} /> },
        { k: 'ses', l: 'Live session', w: wide ? 'minmax(250px,1.6fr)' : '132px', hide: 'lap', r: (m, x) => m.ses ? <div className="col" style={{ gap: 0, padding: '6px 0' }} title={m.ses[0] + ' · ' + m.ses[1]} aria-label={m.ses[0] + ' · ' + m.ses[1]}><span className={wide ? 'cl3' : 'el'}>{wide ? nb(m.ses[0]) : m.ses[0].replace(/^Session \d+ · /, '').replace(/ Live Build$/, '')}</span><span className="me" style={{ whiteSpace: 'normal' }}>{x.tw < 1100 ? m.ses[1].split(' · ').slice(0, 2).join(' · ') : m.ses[1]}</span></div> : <span className="mu">Self-paced</span> },
        { k: 'st', l: 'Status', w: lap ? '112px' : wide ? '128px' : '120px', r: m => m.st === 'Draft' && lap ? <div className="col" style={{ gap: 2, alignItems: 'flex-start' }}><St v={m.st} /><span className="pl" title="Hidden from learners" aria-label="Hidden from learners">Hidden</span></div> : <div className="col" style={{ gap: 0 }}><St v={m.st} /><span className="me" style={{ whiteSpace: 'nowrap' }}>{m.st === 'Draft' ? 'Hidden from learners' : m.st === 'Scheduled' ? m.opens : m.steps + ' steps · ' + m.files + ' files'}</span></div> },
        { k: 'dep', l: 'Deployed', w: '96px', ov: 1, r: m => !started || m.st !== 'Published' ? <span className="mu">{m.st === 'Draft' ? 'Not published' : 'Not started'}</span> : <span className="row nw" style={{ gap: 10 }}><Bar v={m.dep} /><span className="tn w5" style={{ minWidth: 34, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{m.dep}%</span></span> },
      ]}
      card={(m, i, items, up) => <><button className="lk w6" style={{ fontSize: 17, lineHeight: '24px', margin: '-10px 0' }} onClick={() => go('builder', m.id)}>{m.n}</button><p className="s2 cl2">{nb(m.d)}</p><span className="mu cl1">{m.st === 'Draft' ? 'Hidden from learners · ' : ''}{m.ses ? (m.st === 'Draft' ? '' : m.ses[0].split(' · ')[0] + ' · ') + m.ses[1].split(' · ')[0] : 'Self-paced'}{started && m.st === 'Published' ? ' · ' + m.dep + '% deployed' : !started && m.st === 'Published' ? ' · Not started' : ''}</span><div className="row nw" style={{ gap: 6 }}><span title={m.st === 'Draft' ? 'Hidden from learners' : undefined} aria-label={m.st === 'Draft' ? 'Draft. Hidden from learners' : undefined}><St v={m.st} /></span><TierPill m={m} set={v => upd(m.id, { tier: v })} /><span className="sp" />{m.st === 'Draft' && <Btn k="p" style={{ padding: '0 12px' }} onClick={() => pub(m, true)}>Publish</Btn>}<Menu items={items} up={up} /></div></>}
      quick={m => [{ l: 'Preview as Learner', ic: 'eye', fn: () => setPrev(m) }]}
      primary={m => m.st === 'Draft' ? <Btn k="p" onClick={() => pub(m, true)}>Publish</Btn> : null}
      menu={m => [{ l: 'Edit in Module Builder', ic: 'builder', fn: () => go('builder', m.id) }, { l: 'Preview as Learner', ic: 'eye', fn: () => setPrev(m) }, { l: 'Duplicate', g: 1, fn: () => guard('build', 'Duplicate ' + m.n, () => toast('Duplicated as a draft')) }, '-', m.st === 'Draft' ? { l: 'Publish', g: 1, fn: () => pub(m, true) } : { l: 'Unpublish', g: 1, d: 1, fn: () => pub(m, false) }]} />
    <p className="me">Tier access and publish status update the learner portal immediately. Session times are MT, with CT after. {ph ? 'Reorder from the … menu.' : 'Drag the handle, or focus it and press Alt with an arrow key, to reorder.'}</p>
  </div>;
}

function Builder() {
  const { mods, setMods, route, guard, toast, log, setPrev, ph, ds } = useC();
  const [id, setId] = useState(route.id || 'm1');
  const m = mods.find(x => x.id === id) || mods[0];
  const [steps, setSteps] = useState([['Watch', 'What this AI Employee does', '4 min'], ['Read', 'Before you start: what to have open', '3 min'], ['Build', 'Install the skill file', '6 min'], ['Build', 'Run it on your first real input', '8 min'], ['Check', 'Review the output against the checklist', '5 min'], ['Ship', 'Mark as deployed', '1 min']]);
  const [dirty, setDirty] = useState(false);
  const upd = p => { setMods(ms => ms.map(x => x.id === m.id ? { ...x, ...p } : x)); setDirty(true); };
  const move = (a, b) => { const x = [...steps]; const [r] = x.splice(a, 1); x.splice(b, 0, r); setSteps(x); setDirty(true); };
  return <div className="pg">
    <Head t="Module Builder" d="Edit one AI Employee: its steps, files, tier access, and live session." right={<><Btn ic="eye" onClick={() => setPrev(m)}>Preview as Learner</Btn><GBtn k="p" perm="build" label={'Save ' + m.n} go={() => { setDirty(false); log('module.save', m.n, ''); toast('Saved'); }}>{dirty ? 'Save changes' : 'Saved'}</GBtn></>} />
    <Gate n={8} empty={{ ic: 'builder', t: 'No module selected', b: 'Create an AI Employee in Curriculum, then build it here.' }}>
      <div className="bb">
        {ph ? <select className="in" style={{ width: '100%' }} aria-label="AI Employee" value={m.id} onChange={e => setId(e.target.value)}>{mods.map(x => <option key={x.id} value={x.id}>{x.n}</option>)}</select>
          : <section className="cd" style={{ padding: 4, maxHeight: 560, overflow: 'auto' }}>{mods.map(x => <button key={x.id} className={'ni' + (x.id === m.id ? ' on' : '')} onClick={() => setId(x.id)}><span className={'st ' + TONE[x.st]}><i /></span><span className="el">{x.n}</span></button>)}</section>}
        <div className="col">
          <section className="cd pd col m">
            <div className="row nw"><span className="mt"><I n={m.ic} /></span><input className="in ine" style={{ fontSize: 'var(--sh)', fontWeight: 600 }} aria-label="Name" value={m.n} onChange={e => upd({ n: e.target.value })} /></div>
            <input className="in ine s2" style={{ fontWeight: 400 }} aria-label="Summary" value={m.d} onChange={e => upd({ d: e.target.value })} />
          </section>
          <Table title={'Steps · ' + steps.length} right={<GBtn k="q" ic="plus" perm="build" label="Add step" go={() => { setSteps([...steps, ['Build', 'New step', '5 min']]); setDirty(true); }}>Add step</GBtn>} rows={steps} onMove={move}
            cols={[{ k: 1, l: 'Step', w: 'minmax(0,1fr)', r: s => <textarea className="in ine" rows={1} style={{ resize: 'none', fieldSizing: 'content', whiteSpace: 'normal', display: 'block', margin: '6px 0 6px -8px', width: 'calc(100% + 8px)' }} aria-label="Step title" title={s[1]} value={s[1]} onChange={e => { setSteps(steps.map(x => x === s ? [s[0], e.target.value, s[2]] : x)); setDirty(true); }} /> }, { k: 0, l: 'Type', w: '64px', r: s => <Pill v={s[0]} tone="" /> }, { k: 2, l: 'Length', w: '48px', num: 1 }]}
            menu={s => [{ l: 'Duplicate step', fn: () => { setSteps([...steps, [...s]]); setDirty(true); } }, { l: 'Remove step', d: 1, g: 1, fn: () => guard('build', 'Remove step', () => { setSteps(steps.filter(x => x !== s)); setDirty(true); }) }]} />
          <Card t={'Files · 3'} pad={false} right={<GBtn k="q" ic="plus" perm="build" label="Attach file" go={() => toast('File picker opens here')}>Attach</GBtn>}>
            {[['skill-file.zip', 'Skill file', '184 KB'], ['system-prompt.md', 'System prompt', '6 KB'], ['review-checklist.pdf', 'Checklist', '412 KB']].map(f => <div key={f[0]} className="li"><I n="file" /><span className="mo el" style={{ flex: 1 }}>{f[0]}</span><span className="mu">{f[1]}</span><span className="me tn" style={{ width: 56, textAlign: 'right' }}>{f[2]}</span></div>)}
          </Card>
        </div>
        <Card t="Settings"><div className="col kvs">
          <KV rows={[['Status', <St v={m.st} />], ['Tier access', <TierPill m={m} set={v => upd({ tier: v })} />], ['Live session', m.ses ? <span>{m.ses[0]}<br /><span className="me">{m.ses[1]}</span></span> : <span className="mu">Self-paced</span>], ['Opens', m.st === 'Scheduled' ? m.opens.replace('Opens ', '') : m.st === 'Draft' ? <span className="mu">Not scheduled</span> : 'Open now'], ['Skill guide', <span className="row" style={{ gap: 6 }}><I n="check" />Linked</span>]]} />
          <p className="me">Preview as Learner opens a read-only copy in a new tab. It is not masquerade and is not audit-logged.</p>
        </div></Card>
      </div>
    </Gate>
  </div>;
}

/* D-265: the vault's rows, also counted on Program › Curriculum (Shared by Every Week) */
const VAULT_ROWS = [['Listing appointment checklist', 'PDF', 'Listing AI Employee', 'Agent + Team', '412 KB', 'Dec 8', 86], ['Standard chart of accounts', 'Sheet', 'Finance AI Employee', 'Team only', '88 KB', 'Dec 6', 31], ['Fair Housing review checklist', 'PDF', 'Marketing AI Employee', 'Agent + Team', '240 KB', 'Dec 2', 128], ['Session 1 replay', 'Video', 'Week 1 · Know the Business', 'Team only', '214 MB', 'Dec 2', 97], ['Session 2 replay', 'Video', 'Week 2 · Own the Day', 'Team only', '198 MB', 'Dec 9', 64], ['Skill install walkthrough', 'Video', 'Week 0 · Get Ready', 'Agent + Team', '96 MB', 'Nov 24', 141], ['Morning brief prompt pack', 'Prompt', 'Week 2 · Own the Day', 'Team only', '9 KB', 'Dec 9', 52]];
function Vault() {
  const { guard, toast, setDlg, log } = useC();
  const [q, setQ] = useState(''), [ty, setTy] = useState('All types');
  const R = VAULT_ROWS;
  return <div className="pg">
    <Head t="Resource Vault" d="Files, replays, prompts, and checklists learners can open from the portal." right={<GBtn k="p" ic="plus" perm="build" label="Add resource" go={() => toast('Upload opens here')}>Add resource</GBtn>} />
    <div className="row"><Find v={q} on={setQ} ph="Filter resources" /><Sel label="Type" v={ty} on={setTy} opts={['All types', 'PDF', 'Sheet', 'Video', 'Prompt']} /></div>
    <Table rows={R.filter(r => r[0].toLowerCase().includes(q.toLowerCase()) && (ty === 'All types' || r[1] === ty))} empty={{ ic: 'vault', t: 'The vault is empty', b: 'Add a file or a replay and attach it to an AI Employee.', cta: 'Add resource' }}
      cols={[{ k: 0, l: 'Resource', w: 'minmax(200px,1.6fr)', r: r => <div className="row nw" style={{ gap: 10 }}><I n={r[1] === 'Video' ? 'play' : 'file'} /><span className="w5 el">{r[0]}</span></div> }, { k: 1, l: 'Type', w: '72px' }, { k: 2, l: 'Attached to', w: 'minmax(140px,1fr)', hide: 'lap' }, { k: 3, l: 'Tier access', w: '120px', r: r => <Pill v={r[3]} tone={r[3] === 'Team only' ? 'warn' : 'ok'} /> }, { k: 4, l: 'Size', w: '72px', num: 1, ns: 1 }, { k: 6, l: 'Opens', w: '64px', num: 1 }, { k: 5, l: 'Updated', w: '72px', ns: 1 }]}
      quick={r => [{ l: 'Download', ic: 'download', fn: () => toast('Download started') }]}
      menu={r => [{ l: 'Edit details', g: 1, fn: () => guard('build', 'Edit ' + r[0], () => toast('Editor opens here')) }, { l: 'Replace file', g: 1, fn: () => guard('build', 'Replace ' + r[0], () => toast('File picker opens here')) }, '-', { l: 'Remove from vault', d: 1, g: 1, fn: () => guard('build', 'Remove ' + r[0], () => setDlg({ title: 'Remove "' + r[0] + '"?', body: 'Learners lose access right away. The file stays in storage for 30 days.', cta: 'Remove resource', danger: 1, yes: () => { log('vault.remove', r[0], ''); toast('Removed from the vault'); } })) }]} />
  </div>;
}

const COHORT_SESSIONS = [['Session 1 · Lead-Source ROI Live Build', 'Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT', 'Week 1', 'Sent', 'Ready', '82%'], ['Session 2 · Morning Brief Live Build', 'Wed, Dec 9 · 12:00 PM MT / 1:00 PM CT', 'Week 2', 'Sent', 'Ready', '74%'], ['Session 3 · Database Live Build', 'Wed, Dec 16 · 12:00 PM MT / 1:00 PM CT', 'Week 3', 'Scheduled', '—', '—'], ['Session 4 · Scorecard Live Build', 'Wed, Dec 23 · 12:00 PM MT / 1:00 PM CT', 'Week 4', 'Scheduled', '—', '—'], ['Session 5 · Contract to Close', 'Wed, Dec 30 · 12:00 PM MT / 1:00 PM CT', 'Week 5', 'Draft', '—', '—'], ['Session 6 · Handoff', 'Wed, Jan 6 · 12:00 PM MT / 1:00 PM CT', 'Week 6', 'Draft', '—', '—']];
function Cohorts() {
  const { guard, toast, started } = useC();
  const S = COHORT_SESSIONS;
  return <div className="pg">
    <Head t="Cohorts & Sessions" d="The cohort calendar and each live build on Zoom. All times are MT (America/Denver)." right={<GBtn k="p" ic="plus" perm="build" label="Add session" go={() => toast('Session editor opens here')}>Add session</GBtn>} />
    <Gate n={3}><Facts items={[['Cohort', 'December 2026'], ['Status', <St v={started ? 'Active' : 'Scheduled'} />], ['Opens', 'Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT', 1], ['Week', started ? '2 of 6' : 'Not started'], ['Enrolled', '148 learners'], ['Cadence', 'Wednesdays, weekly', 1]]} /></Gate>
    <Table title="Sessions" rows={S} empty={{ ic: 'cohorts', t: 'No sessions scheduled', b: 'Add the first live build for this cohort.', cta: 'Add session' }}
      cols={[{ k: 0, l: 'Session', w: 'minmax(250px,1.6fr)', r: s => <span className="w5 el" style={{ display: 'block' }}>{s[0]}</span> }, { k: 1, l: 'When', w: '188px', ns: 1, r: s => <div className="col" style={{ gap: 0 }}><span className="el">{s[1]}</span><span className="me">Live on Zoom</span></div> }, { k: 2, l: 'Module', w: '68px', hide: 'lap' }, { k: 3, l: 'Zoom invite', w: '112px', r: s => <St v={!started && s[3] === 'Sent' ? 'Scheduled' : s[3]} /> }, { k: 4, l: 'Replay', w: '72px', r: s => started && s[4] === 'Ready' ? <St v="Ready" /> : <span className="mu">—</span> }, { k: 5, l: 'Attendance', w: '88px', num: 1, r: s => started && s[5] !== '—' ? s[5] : <span className="mu">—</span> }]}
      menu={s => [{ l: 'Edit session', g: 1, fn: () => guard('build', 'Edit ' + s[0], () => toast('Session editor opens here')) }, { l: 'Copy join link', fn: () => toast('Join link copied') }, { l: 'Attach replay', g: 1, fn: () => guard('build', 'Attach replay', () => toast('Replay picker opens here')) }]} />
  </div>;
}

function Announce() {
  const { guard, toast, log } = useC();
  const [open, setOpen] = useState(false), [ti, setTi] = useState(''), [bo, setBo] = useState('');
  const [rows, setRows] = useState([['Session 2 replay is ready', 'Team Tier', 'In-app, email', 'Sent', 'Dec 9, 3:10 PM MT / 4:10 PM CT'], ['New in the vault: listing appointment checklist', 'Everyone', 'In-app, email', 'Sent', 'Dec 8, 3:00 PM MT / 4:00 PM CT'], ['Session 3 is Wednesday at 12:00 PM MT / 1:00 PM CT', 'Team Tier', 'Email', 'Scheduled', 'Dec 15, 12:00 PM MT / 1:00 PM CT'], ['Database AI Employee opens Monday', 'Everyone', 'In-app', 'Draft', '—']]);
  return <div className="pg">
    <Head t="Announcements" d="Messages to learners in the portal and by email." right={<GBtn k="p" ic="plus" perm="build" label="New announcement" go={() => setOpen(true)}>New announcement</GBtn>} />
    <Table rows={rows} empty={{ ic: 'announce', t: 'No announcements yet', b: 'Write the first one to tell learners what is new.', cta: 'New announcement', on: () => setOpen(true) }}
      cols={[{ k: 0, l: 'Announcement', w: 'minmax(220px,2fr)', r: r => <span className="w5 el" style={{ display: 'block' }}>{r[0]}</span> }, { k: 1, l: 'Audience', w: '104px' }, { k: 2, l: 'Channels', w: '120px', hide: 'lap' }, { k: 3, l: 'Status', w: '112px', r: r => <St v={r[3]} /> }, { k: 4, l: 'Send time', w: '136px', ns: 1, r: x => <Stamp v={x[4]} two /> }]}
      menu={r => [{ l: 'Edit', g: 1, fn: () => guard('build', 'Edit announcement', () => toast('Editor opens here')) }, { l: 'Duplicate', g: 1, fn: () => guard('build', 'Duplicate announcement', () => toast('Duplicated as a draft')) }]} />
    {open && <Modal title="New announcement" onClose={() => setOpen(false)} foot={<><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn k="p" disabled={!ti.trim()} onClick={() => { setRows([[ti, 'Everyone', 'In-app', 'Draft', '—'], ...rows]); log('announcement.create', ti, 'Draft'); setOpen(false); setTi(''); setBo(''); toast('Saved as a draft'); }}>Save draft</Btn></>}>
      <label className="lab">Title<input className="in" autoFocus value={ti} onChange={e => setTi(e.target.value)} /></label>
      <label className="lab">Message<textarea className="in" rows={4} value={bo} onChange={e => setBo(e.target.value)} /></label>
      <div className="row"><label className="lab" style={{ flex: 1 }}>Audience<select className="in" style={{ width: '100%' }}><option>Everyone</option><option>Agent Tier</option><option>Team Tier</option></select></label><label className="lab" style={{ flex: 1 }}>Channels<select className="in" style={{ width: '100%' }}><option>In-app</option><option>In-app, email</option><option>Email</option></select></label></div>
    </Modal>}
  </div>;
}

/* D-268: December's teams as the parity world seats them (`WS` in parity-r2.ts: its seats are the Tiers screen's), and its
   learners (the six who are not canceled); a team's people are those signed in of its seats. */
const P7_SEATS = { ws_northshore: 41, ws_halemarlowe: 16, ws_redcliff: 41, ws_copperbasin: 16, ws_tidewater: 16, ws_lantern: 16, ws_fourthmeridian: 16 };
function Learners() {
  // D-268 (R-5 Phase 7): Cohort › People, the mockup's `CohortPeople`: the cohort's roster, Teams first, with Paid, Intake, the
  // week it is on and Last active. This reference's December has no weeks in its run (D-267), so it has no week column: a
  // cohort with weeks shows "Week N" and each team's steps done of that week's. It replaces Learners & Teams; the export stays.
  const { go, toast, startMasq } = useC();
  const [tab, setTab] = useState('teams'), [q, setQ] = useState('');
  const L = USERS.filter(u => u.st !== 'Canceled');
  const CT = WS.map(w => { const m = L.filter(u => u.ws === w.n); const last = m.map(u => p7At(u.last)).sort((a, b) => b - a)[0]; const o = L.find(u => u.n === w.owner); return { id: w.id, n: w.n, owner: o ? o.n : 'None', in: m.length, seats: P7_SEATS[w.id], last: last ? m.find(u => p7At(u.last) === last).last : null }; });
  const f = r => (r.n + (r.owner || '') + (r.ws || '')).toLowerCase().includes(q.toLowerCase());
  return <div className="col">
    <div className="row"><Tabs v={tab} on={setTab} tabs={[['teams', 'Teams', CT.length + ' of ' + P3_COH.dec26.cap], ['learners', 'Learners', L.length]]} /><Find v={q} on={setQ} ph={tab === 'teams' ? 'Find a team' : 'Find a person'} /><span className="sp" /><Btn ic="download" onClick={() => toast('Exported as CSV')}>Export</Btn></div>
    {tab === 'teams' && <Table rows={CT.filter(f)} onRow={t => go('workspace', t.id)}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(200px,1.5fr)', r: t => <Two a={t.n} b={t.owner} /> }, { k: 'seats', l: 'People', w: '120px', r: t => <span className="tn">{t.in} of {t.seats} signed in</span> },
        { k: 'pay', l: 'Paid', w: '140px', hide: 'lap', r: () => <St v="Paid" tone="ok" /> },
        { k: 'intake', l: 'Intake', w: '120px', r: () => <St v="Not started" tone="off" /> },
        { k: 'last', l: 'Last active', w: '150px', ns: 1, hide: 'lap', r: t => t.last ? <Stamp v={p7Stamp(t.last)} two /> : 'Never signed in' }]}
      menu={t => [{ l: 'Open team', fn: () => go('workspace', t.id) }, { l: 'Read their intake', fn: () => go('cohort') }, { l: 'What they turned in', fn: () => go('cohort') }]} />}
    {tab === 'learners' && <><Table rows={L.filter(f)} onRow={u => go('user', u.id)}
      cols={[{ k: 'n', l: 'Learner', w: 'minmax(210px,1.5fr)', r: u => <Two a={u.n} b={u.e} /> }, { k: 'ws', l: 'Team', w: 'minmax(160px,1fr)' },
        { k: 'role', l: 'Seat', w: '190px', hide: 'lap' }, { k: 'last', l: 'Last active', w: '150px', ns: 1, r: u => <Stamp v={p7Stamp(u.last)} two /> }]}
      menu={u => [{ l: 'Open person', fn: () => go('user', u.id) }, { l: 'Masquerade…', ic: 'masquerade', fn: () => startMasq(u) }]} />
      <p className="me">Showing {L.filter(f).length} of {L.length}.</p></>}
    <p className="me">This is the cohort’s roster: who is in it and how far along they are. For a sign-in, a plan or a seat, open the person or the team.</p>
  </div>;
}

function Tiers() {
  const { mods, setMods, guard, log, toast, setDlg, ph } = useC();
  const [price, setPrice] = useState({ a: '995', t16: '4995', t41: '9995' });
  const [req, setReq] = useState(TIERS_REQ0);
  const T = [['a', 'Agent Tier', '1 seat', 'per agent, per cohort', '104 licenses', '$103,480', 'For individual agents building their own AI Employees.', ['Marketing, Sales and Database AI Employees', 'System prompts, skill files and checklists', 'Resource Vault']],
    ['t16', 'Team Tier', '16 seats', 'per team, per cohort', '5 teams', '$24,975', 'For teams that want every seat building, plus the leadership modules.', ['All 15 AI Employees and weekly live builds', '16 seats', 'Team progress tracking']],
    ['t41', 'Team Tier', '41 seats', 'per team, per cohort', '2 teams', '$19,990', 'The same Team Tier, sized for larger teams.', ['All 15 AI Employees and weekly live builds', '41 seats', 'Team progress tracking']]];
  const tog = m => guard('build', 'Change tier access for ' + m.n, () => { setMods(ms => ms.map(x => x.id === m.id ? { ...x, tier: x.tier === 'both' ? 'team' : 'both' } : x)); log('tier.access_change', m.n, m.tier === 'both' ? 'Agent + Team to Team only.' : 'Team only to Agent + Team.'); });
  return <div className="pg">
    <Head t="Plans & Upgrades" d="What each plan costs and holds, and the teams asking to move between them." />
    <Gate n={8}>
      <div className="g3">{T.map(t => <section key={t[0]} className="cd pd col" style={{ gap: 12 }}>
        <div className="row nw"><h2>{t[1]}</h2><Pill v={t[2]} tone="" /><span className="sp" /><span className="me">{t[4]}</span></div>
        <div className="row nw" style={{ alignItems: 'baseline' }}><span className="row nw prc" style={{ gap: 2, border: '1px solid var(--line2)', borderRadius: 8, padding: '0 10px', width: 124 }}><span className="mu">$</span><input className="tn" aria-label={t[1] + ' ' + t[2] + ' price'} style={{ border: 0, outline: 0, background: 'none', width: '100%', height: '100%', font: '600 20px/28px Geist,sans-serif', letterSpacing: '-.02em', boxShadow: 'none' }} value={price[t[0]]} onChange={e => guard('build', 'Change ' + t[1] + ' price', () => setPrice({ ...price, [t[0]]: e.target.value.replace(/\D/g, '') }))} /></span><span className="me">{t[3]}</span></div>
        <p className="s2">{t[6]}</p>
        <div className="col" style={{ gap: 6 }}>{t[7].map(x => <span key={x} className="row nw" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--ok)', paddingTop: 2 }}><I n="check" /></span><span>{x}</span></span>)}</div>
        <div className="row nw" style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 'auto' }}><span className="mu">Cohort revenue</span><span className="sp" /><span className="w6 tn">{t[5]}</span></div>
      </section>)}</div>
      <Table title="Upgrade requests" rows={req} empty={{ ic: 'tiers', t: 'No upgrade requests' }}
        cols={[{ k: 0, l: 'From', w: 'minmax(140px,1fr)', r: r => <span className="w5">{r[0]}</span> }, { k: 1, l: 'Request', w: 'minmax(180px,1.4fr)' }, { k: 2, l: 'Value', w: '80px', num: 1 }, { k: 3, l: 'Received', w: '136px', ns: 1, hide: 'lap', r: x => <Stamp v={x[3]} two /> }, { k: 4, l: 'Status', w: '104px', r: r => <St v={r[4]} /> }]} aw="124px"
        primary={r => r[4] === 'Pending' ? <Btn onClick={() => guard('build', 'Approve upgrade for ' + r[0], () => setDlg({ title: 'Approve upgrade for ' + r[0] + '?', body: r[1] + '. They get an email with a checkout link for ' + r[2] + '.', cta: 'Approve and send link', yes: () => { setReq(req.map(x => x === r ? [r[0], r[1], r[2], r[3], 'Approved'] : x)); log('upgrade.approve', r[0], r[1]); toast('Approved. Checkout link sent.'); } }))}>Approve</Btn> : null}
        menu={r => [{ l: 'Decline', d: 1, g: 1, fn: () => guard('build', 'Decline upgrade', () => toast('Declined')) }]} />
      <Card t="Access matrix" sub="Click an Agent cell to include or gate a module. Team Tier always includes everything." pad={false}>
        {!ph && <div className="th" style={{ gridTemplateColumns: 'minmax(0,1fr) 80px 80px' }}><span>Included</span><span style={{ textAlign: 'center' }}>Agent</span><span style={{ textAlign: 'center' }}>Team</span></div>}
        {mods.map(m => <div key={m.id} className="tr" style={{ gridTemplateColumns: 'minmax(0,1fr) ' + (ph ? '44px 44px' : '80px 80px'), minHeight: ph ? 56 : 44 }}><span className="el">{m.n}</span>
          <span style={{ justifySelf: 'center' }}><button className={'mx' + (m.tier === 'both' ? '' : ' lk2')} aria-label={m.n + ', Agent Tier: ' + (m.tier === 'both' ? 'included' : 'gated')} onClick={() => tog(m)}><I n={m.tier === 'both' ? 'check' : 'lock'} s={14} /></button></span>
          <span style={{ justifySelf: 'center' }}><button className="mx" disabled aria-label={m.n + ', Team Tier: included'}><I n="check" s={14} /></button></span></div>)}
      </Card>
    </Gate>
  </div>;
}

function Audit() {
  const { audit, log, toast, guard } = useC();
  const [actor, setActor] = useState('Any actor'), [act, setAct] = useState('Any action'), [q, setQ] = useState(''), [range, setRange] = useState('Last 7 days');
  const rows = audit.filter(a => (actor === 'Any actor' || a.actor === actor) && (act === 'Any action' || a.act.startsWith(act)) && (a.tg + a.d).toLowerCase().includes(q.toLowerCase()));
  const exp = () => guard('export', 'Export audit log', () => { log('audit.export', 'Audit log', 'CSV, ' + range.toLowerCase() + ', ' + rows.length + ' rows.'); toast('Export started. The export is in the log.'); });
  return <div className="pg">
    <Head t="Audit Log" d="Every staff action. Append-only." right={<GBtn ic="download" perm="export" label="Export audit log" go={exp}>Export CSV</GBtn>} />
    <div className="row"><Find v={q} on={setQ} ph="Filter target or detail" /><Sel label="Actor" v={actor} on={setActor} opts={['Any actor', ...STAFF.map(s => s.n)]} /><Sel label="Action" v={act} on={setAct} opts={['Any action', 'masquerade', 'billing', 'permission', 'module', 'tier', 'job', 'audit', 'email_log', 'incident', 'user']} /><Sel label="Date range" v={range} on={setRange} opts={['Last 24 hours', 'Last 7 days', 'Last 30 days']} /></div>
    <Table rows={rows} sel bulk={<Btn onClick={exp}>Export selected</Btn>} empty={{ ic: 'audit', t: 'No audit entries yet', b: 'Staff actions are recorded here as they happen.' }}
      cols={[{ k: 't', l: 'Time', w: '136px', ns: 1, r: a => <span className="mo s2"><Stamp v={a.t} two /></span> }, { k: 'actor', l: 'Actor', w: '128px' }, { k: 'act', l: 'Action', w: 'minmax(210px,1.2fr)', mo: 1 }, { k: 'tg', l: 'Target', w: 'minmax(110px,.9fr)' }, { k: 'd', l: 'Detail', w: 'minmax(160px,1.6fr)', ns: 1, hide: 'lap', r: a => <span className="s2">{a.d}</span> }]} />
  </div>;
}

function Roles() {
  const { perms, setPerms, guard, log, ph, role, toast, setDlg } = useC();
  const locked = (p, r) => ROLES[r] === 'Support' && (p[0] === 'refund' || p[0] === 'masq');
  const flip = (i, r) => guard('staff', 'Change ' + ROLES[r] + ' permission', () => setDlg({ title: (perms[i][2][r] ? 'Remove this permission from ' : 'Give this permission to ') + ROLES[r] + '?', body: perms[i][1] + '. Applies to every ' + ROLES[r] + ' on staff right away.', cta: perms[i][2][r] ? 'Remove permission' : 'Allow', yes: () => { setPerms(perms.map((x, j) => j === i ? [x[0], x[1], x[2].map((v, k) => k === r ? (v ? 0 : 1) : v)] : x)); log('permission.change', ROLES[r], perms[i][1] + ': ' + (perms[i][2][r] ? 'allowed to not allowed.' : 'not allowed to allowed.')); toast('Permission updated'); } }));
  const box = (p, i, r) => locked(p, r) ? <span className="row nw mu" style={{ gap: 4, cursor: 'not-allowed' }} title="Fixed by product rules"><input type="checkbox" className="chk" disabled checked={false} readOnly style={{ cursor: 'not-allowed' }} aria-label={p[1] + ', ' + ROLES[r] + '. Fixed by product rules'} /><I n="lock" s={14} /></span> : <input type="checkbox" className="chk" disabled={r === 0} checked={!!p[2][r]} onChange={() => flip(i, r)} aria-label={p[1] + ', ' + ROLES[r]} />;
  return <div className="pg">
    <Head t="Roles & Permissions" d="Who on staff can do what. Learners, agents, and team owners never see the admin." right={<GBtn k="p" ic="plus" perm="staff" label="Invite staff" go={() => toast('Invite form opens here')}>Invite staff</GBtn>} />
    <Table title="Staff" rows={STAFF} empty={{ ic: 'roles', t: 'No staff yet' }}
      cols={[{ k: 'n', l: 'Staff member', w: 'minmax(200px,1.4fr)', r: s => <div className="row nw" style={{ gap: 10 }}><span className="av">{ini(s.n)}</span><Two a={s.n + (s.role === role ? ' (you)' : '')} b={s.e} /></div> }, { k: 'role', l: 'Role', w: '104px', r: s => <Pill v={s.role} tone={s.role === 'Owner' ? 'ok' : ''} /> }, { k: 'last', l: 'Last sign-in', w: '136px', ns: 1, r: x => <Stamp v={x.last} two /> }]}
      menu={s => [{ l: 'Change role…', g: 1, off: s.role === 'Owner', fn: () => guard('staff', 'Change role for ' + s.n, () => toast('Role picker opens here')) }]} />
    <Gate n={8}><Card t="Permission matrix" sub="Owner always has every permission. Locked boxes are fixed by product rules. Changes are confirmed and audit-logged." pad={false}>
      {!ph && <div className="th" style={{ gridTemplateColumns: 'minmax(0,1fr) 88px 88px 88px' }}><span>Capability</span>{ROLES.map(r => <span key={r}>{r}</span>)}</div>}
      {perms.map((p, i) => ph ? <div key={p[0]} className="pc" style={{ borderBottom: '1px solid var(--line)' }}><span className="w6">{p[1]}</span>{ROLES.map((r, k) => <label key={r} className="pc-r" title={locked(p, k) ? 'Fixed by product rules' : undefined} style={{ alignItems: 'center', minHeight: 44 }}><span className="mu">{r}</span><span className="row nw">{p[2][k] ? 'Allowed' : 'Not allowed'}{box(p, i, k)}</span></label>)}</div>
        : <div key={p[0]} className="tr" style={{ gridTemplateColumns: 'minmax(0,1fr) 88px 88px 88px', minHeight: 44 }}><span className="el">{p[1]}</span>{ROLES.map((r, k) => <label key={r} className="row nw" title={locked(p, k) ? 'Fixed by product rules' : undefined} style={{ cursor: locked(p, k) ? 'not-allowed' : k ? 'pointer' : 'default' }}>{box(p, i, k)}<span className="mu">{p[2][k] ? 'Yes' : 'No'}</span></label>)}</div>)}
    </Card></Gate>
  </div>;
}

/* ---------- console screens (same header, table, card system) ---------- */
function Health() {
  const { go, ds } = useC();
  const e = ds === 'empty';
  return <div className="pg">
    <Head t="System Health" meta={<Pill v={e ? 'All systems normal' : '1 open incident'} tone={e ? 'ok' : 'bad'} />} d="learn.amplifiedimpact.io right now." />
    <Gate n={8}>
      <div className="g4">
        <Stat l="Live sessions" v="37" sub="on /api/events" go={() => go('usage')} />
        <Stat l="Sign-in success" v="98.6%" sub="Healthy · 24h" tone="ok" go={() => go('usage')} />
        <Stat l="Failed payments" v={e ? '0' : '3'} sub={e ? 'None' : 'Needs review'} tone={e ? 'ok' : 'bad'} go={() => go('billing', null, 'failed')} />
        <Stat l="Failed webhooks" v={e ? '0' : '4'} sub={e ? 'None' : '3 GHL, 1 Stripe'} tone={e ? 'ok' : 'bad'} go={() => go('api', null, 'hooks')} />
        <Stat l="Job failures, 24h" v={e ? '0' : '1'} sub={e ? '12 of 12 succeeded' : 'ghl-orders'} tone={e ? 'ok' : 'bad'} go={() => go('jobs')} />
        <Stat l="Open incidents" v={e ? '0' : '1'} sub={e ? 'None' : 'Sev 2 · INC-0007'} tone={e ? 'ok' : 'bad'} go={() => go('incidents')} />
        <Stat l="p95 latency" v="212 ms" sub="Healthy" tone="ok" go={() => go('api')} />
        <Stat l="DB connections" v="14 / 100" sub="Healthy" tone="ok" go={() => go('db')} />
      </div>
      <div className="gms">
        <Card t="Needs attention" pad={false}>
          {e ? <Empty ic="check" t="Nothing needs attention" b="Failed payments, webhooks, and jobs show up here when they happen." /> :
            [['incident', 'INC-0007', 'GHL order sync failing with 401', 'Open since Dec 9, 9:14 PM MT / 10:14 PM CT', 'Sev 2'], ['billing', null, 'Tidewater Property Co. is past due', 'Insiders · $97.00 · 2 retries left', 'Past due'], ['api', null, 'Stripe subscription.updated used all 5 attempts', 'Handler timeout after 10 s', 'Failed'], ['workspace', 'ws_halemarlowe', 'Hale & Marlowe Realty is at 15 of 16 seats', 'Team Plan · 16 seats', 'Waiting']].map((r, i) =>
              <div key={i} className="li"><div className="col" style={{ flex: '1 1 220px', gap: 0 }}><button className="lk el" onClick={() => go(r[0], r[1])}>{r[2]}</button><span className="me">{r[3]}</span></div><Pill v={r[4]} /></div>)}
        </Card>
        <div className="col">
          <Card t="Services" pad={false}>{[['Web · Railway', 'Healthy'], ['Postgres', 'Healthy'], ['Stripe', 'Connected'], ['GoHighLevel', e ? 'Connected' : 'Degraded'], ['Resend', 'Connected'], ['Zoom', 'Connected']].map(s => <div key={s[0]} className="li"><span style={{ flex: 1 }}>{s[0]}</span><St v={s[1]} /></div>)}</Card>
          <Card t="Latest deploy" right={<button className="lk a" onClick={() => go('deploys')}>All deploys</button>}><div className="col m"><div className="row nw"><span className="mo">{DEPLOYS[0].sha}</span><St v="Live" /></div><span className="el">{DEPLOYS[0].m}</span><span className="me">{DEPLOYS[0].a} · {DEPLOYS[0].t}</span></div></Card>
        </div>
      </div>
    </Gate>
  </div>;
}

function Workspaces() {
  // D-268 (R-5 Phase 7): People › Teams, the mockup's `TeamsPg`: today's Workspaces, an access group's team of one left out (Utah
  // Life's agents are people here, not teams). Holds is what a team holds while live; Paying what it pays.
  const { go, startMasq } = useC();
  const [q, setQ] = useState(''), [p, setP] = useState('All products');
  const holds = w => w.st === 'Canceled' ? [] : [w.plan.split(' · ')[0]];
  const paying = w => w.mrr === 'One-time' ? 'Paid in full' : w.st === 'Active' || w.st === 'Past due' ? w.mrr + ' a month' : '$0';
  const rows = WS.filter(w => (w.n + w.owner).toLowerCase().includes(q.toLowerCase()) && (p === 'All products' || holds(w).includes(p)));
  return <div className="pg">
    <Head t="Teams" d="Every team account and what it holds." />
    <div className="row"><Find v={q} on={setQ} ph="Find a team or its owner" /><Sel label="Product" v={p} on={setP} opts={['All products', 'AI Accelerator', 'Team Plan', 'Agent Plan', 'Insiders', 'Insiders for Agents', 'Skill Library']} /></div>
    <Table rows={rows} onRow={w => go('workspace', w.id)} empty={{ ic: 'workspaces', t: 'No team matches' }}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(200px,1.4fr)', r: w => <Two a={w.n} b={w.owner} /> }, { k: 'p', l: 'Holds', w: 'minmax(190px,1fr)', ns: 1, r: w => <span className="row" style={{ gap: 4 }}>{holds(w).map(x => <span key={x} className={'pl' + (x === 'AI Accelerator' ? ' ok' : ' info')}>{x}</span>)}</span> },
        { k: 'used', l: 'Seats used', w: '110px', r: w => <span className="tn">{w.used} of {w.cap}</span> }, { k: 'mrr', l: 'Paying', w: '150px', hide: 'lap', r: paying }, { k: 'st', l: 'Status', w: '104px', r: w => <St v={w.st} /> }]}
      menu={w => [{ l: 'Open team', fn: () => go('workspace', w.id) }, ...(holds(w).includes('AI Accelerator') ? [{ l: 'See them in the cohort', fn: () => go('learners') }] : []), { l: 'Masquerade as owner…', ic: 'masquerade', fn: () => startMasq(USERS.find(u => u.n === w.owner)) }]} />
    <p className="me">{ULA_R2.length} Utah Life agents are not listed here. <button className="lk a inl" onClick={() => go('utah')}>Utah Life</button> · <button className="lk a inl" onClick={() => go('users')}>Everyone</button></p>
  </div>;
}

function Workspace() {
  const { route, go, startMasq, guard, toast, log } = useC();
  const w = WS.find(x => x.id === route.id);
  const [tab, setTab] = useState('members');
  const [notes, setNotes] = useState([['Imani Brooks', 'Dec 7, 3:40 PM MT / 4:40 PM CT', 'Owner asked how seats work when an agent leaves. Sent the seat reassignment guide.'], ['Connor Leiva', 'Nov 24, 10:05 AM MT / 11:05 AM CT', 'Onboarding call done. They want the leadership modules first.']]);
  const [draft, setDraft] = useState('');
  if (!w) return <NotFound />;
  const mem = USERS.filter(u => u.ws === w.n);
  const inv = INV.find(i => i.c === w.n);
  return <div className="pg">
    <Head back={['workspaces', 'Teams']} t={w.n} meta={<Pill v={w.st} />} right={<Btn ic="masquerade" onClick={() => startMasq(USERS.find(u => u.n === w.owner))}>Masquerade as owner</Btn>} />
    <Gate n={3}><Facts items={[['Workspace ID', <span className="mo">{w.id}</span>], ['Plan', w.plan], ['Seats', w.used + ' of ' + w.cap], ['Owner', w.owner], ['MRR', w.mrr], ['Last activity', w.last]]} /></Gate>
    <div className="gms">
      <div className="col">
        <Tabs v={tab} on={setTab} tabs={[['members', 'Members', mem.length], ['plan', 'Plan & entitlements'], ['usage', 'Usage'], ['billing', 'Billing'], ['activity', 'Activity']]} />
        {tab === 'members' && <Table rows={mem} onRow={u => go('user', u.id)} empty={{ ic: 'users', t: 'No members in this workspace' }} cols={[{ k: 'n', l: 'Member', w: 'minmax(180px,1.5fr)', r: u => <div className="row nw" style={{ gap: 10 }}><span className="av">{ini(u.n)}</span><Two a={u.n} b={u.e} /></div> }, { k: 'role', l: 'Role', w: '104px' }, { k: 'st', l: 'Status', w: '96px', r: u => <St v={u.st} /> }]} menu={u => [{ l: 'Open user', fn: () => go('user', u.id) }, { l: 'Masquerade…', ic: 'masquerade', fn: () => startMasq(u) }]} />}
        {tab === 'plan' && <Gate><Card><KV rows={[['Plan', w.plan], ['Status', <St v={w.st} />], ['Seats used', <span className="row nw" style={{ maxWidth: 260 }}><Bar v={w.used} max={w.cap} fx={fixedSeats(w)} /><span className="tn">{w.used} of {w.cap}</span></span>],
          ['Seat tier', w.plan.startsWith('Team') ? <span className="row" style={{ gap: 6 }}><I n="lock" />Team Plan is sold in two sizes, 16 or 41 seats. Changing size is an upgrade request in Tiers & Upgrades.</span> : w.plan === 'AI Accelerator' ? <span className="row" style={{ gap: 6 }}><I n="lock" />Cohort cap is a product rule. View only.</span> : 'Per agent'],
          ['Access groups', <span className="row" style={{ gap: 6 }}><Pill v="library" tone="" /><Pill v="agent" tone="" />{w.plan.startsWith('Team') && <Pill v="team" tone="" />}{w.plan === 'AI Accelerator' && <Pill v="cohort-dec-2026" tone="" />}</span>], ['Renews', w.mrr === 'One-time' ? 'One-time purchase' : 'Jan 8, 2027']]} /></Card></Gate>}
        {tab === 'usage' && <Gate><div className="g4"><Stat l="Sign-ins, 7d" v={String(w.used * 6)} /><Stat l="Lesson plays, 7d" v={String(w.used * 4)} /><Stat l="Guide views, 7d" v={String(w.used * 9)} /><Stat l="Storage" v={(w.used * 0.2).toFixed(1) + ' GB'} /></div></Gate>}
        {tab === 'billing' && <Gate><Card><div className="col"><KV rows={[['Stripe customer', <span className="mo">{w.cus}</span>], ['Subscription', <span className="mo">{w.sub}</span>], ['MRR', w.mrr], ['Last invoice', inv ? <span className="row" style={{ gap: 8 }}><span className="mo">{inv.id}</span><St v={inv.st} /></span> : '—']]} /><div><Btn onClick={() => go('billing', null, 'invoices')}>Open in Billing</Btn></div></div></Card></Gate>}
        {tab === 'activity' && <Gate><Card>{[['Dec 10, 8:52 AM MT / 9:52 AM CT', w.owner + ' signed in'], ['Dec 10, 8:55 AM MT / 9:55 AM CT', w.owner + ' deployed Sales AI Employee'], ['Dec 8, 10:14 AM MT / 11:14 AM CT', 'A member was invited'], ['Dec 8, 9:00 AM MT / 10:00 AM CT', 'Invoice paid']].map((a, i) => <div key={i} className="tl"><div>{a[1]}</div><div className="me mo"><Stamp v={a[0]} /></div></div>)}</Card></Gate>}
      </div>
      <Card t="Staff notes" sub="Internal. Never shown to the workspace."><div className="col m">
        <textarea className="in" rows={3} aria-label="Add a note" value={draft} onChange={e => setDraft(e.target.value)} placeholder="What happened, what you told them" />
        <div><Btn disabled={!draft.trim()} onClick={() => guard('account', 'Add staff note', () => { setNotes([['You', 'Just now', draft.trim()], ...notes]); log('workspace.note_add', w.n, ''); setDraft(''); toast('Note saved'); })}>Save note</Btn></div>
        {notes.map((n, i) => <div key={i} className="note col s"><span><span className="w5">{n[0]}</span> <span className="me">· <Stamp v={n[1]} /></span></span><p className="s2">{n[2]}</p></div>)}
      </div></Card>
    </div>
  </div>;
}

function Users() {
  // D-268 (R-5 Phase 7): People › Everyone, the mockup's `PeoplePg`: today's Users with "Got in through" and its chips, built from
  // who is here (each person counted once). A Utah Life agent opens Utah Life.
  const { go, startMasq, toast } = useC();
  const [a, setA] = useState('all'), [q, setQ] = useState('');
  const chips = [['all', 'Everyone', P7_PEOPLE.length, null], ...P7_AUD.map(x => [x[0], x[0], P7_PEOPLE.filter(p => p.a === x[0]).length, x[1]]).filter(x => x[2])];
  const rows = P7_PEOPLE.filter(p => (a === 'all' || p.a === a) && (p.n + p.e + p.ws).toLowerCase().includes(q.toLowerCase()));
  const open = p => p.a === 'Utah Life' ? go('utah') : go('user', p.id);
  return <div className="pg">
    <div className="chs" role="group" aria-label="Audience">{chips.map(c => <button key={c[0]} className={'ch' + (a === c[0] ? ' on' : '')} aria-pressed={a === c[0]} onClick={() => setA(c[0])}>{c[3] && <i style={{ background: c[3] }} />}{c[1]}<span className="tn">{c[2]}</span></button>)}</div>
    <div className="row"><Find v={q} on={setQ} ph="Find a person by name or email" /><span className="sp" /><Btn ic="download" onClick={() => toast('Export started. It is in the audit log.')}>Export</Btn></div>
    <Table rows={rows} onRow={open} empty={{ ic: 'users', t: 'No one matches', b: 'Try another audience or fewer letters.' }}
      cols={[{ k: 'n', l: 'Person', w: 'minmax(220px,1.5fr)', r: p => <Two a={p.n} b={p.e} /> }, { k: 'a', l: 'Got in through', w: '136px', r: p => <span className="pl aud"><i style={{ background: p7Dot(p.a) }} />{p.a}</span> },
        { k: 'ws', l: 'Team', w: 'minmax(160px,1fr)', hide: 'lap', r: p => p.ws ? p.ws : <span className="mu">On their own</span> }, { k: 'role', l: 'Seat', w: '204px', hide: 'lap' }, { k: 'last', l: 'Last active', w: '150px', ns: 1, r: p => p.last ? <Stamp v={p7Stamp(p.last)} two /> : 'Never' }, { k: 'st', l: 'Status', w: '104px', r: p => <St v={p.st} tone={p.st === 'Invited' ? 'warn' : undefined} /> }]}
      menu={p => [{ l: p.a === 'Utah Life' ? 'Open Utah Life' : 'Open person', fn: () => open(p) }, ...(p.a === 'AI Accelerator' ? [{ l: 'See them in the cohort', fn: () => go('learners') }] : []), ...(p.a === 'Utah Life' ? [] : [{ l: 'Masquerade…', ic: 'masquerade', fn: () => startMasq(p) }])]} />
    <p className="me">Showing {rows.length} of {a === 'all' ? P7_PEOPLE.length : chips.find(c => c[0] === a)[2]}. This list is for the account: sign-in, plan and seat. To see how a cohort is doing, open <button className="lk a inl" onClick={() => go('learners')}>the cohort’s People tab</button>.</p>
  </div>;
}

function User() {
  const { route, go, startMasq, guard, setDlg, toast, log, started } = useC();
  const u = USERS.find(x => x.id === route.id);
  const [tab, setTab] = useState('orders');
  if (!u) return <NotFound />;
  const w = WS.find(x => x.n === u.ws);
  return <div className="pg">
    <Head back={['people', 'People']} t={u.n} meta={<Pill v={u.st} />}
      right={<><Btn ic="masquerade" onClick={() => startMasq(u)}>Masquerade</Btn><Menu items={[
        { l: 'Send password reset…', g: 1, fn: () => guard('account', 'Send password reset to ' + u.n, () => setDlg({ title: 'Send a password reset to ' + u.n + '?', body: 'Emails a reset link to ' + u.e + '. Their current password keeps working until they use it.', cta: 'Send reset email', yes: () => { log('user.password_reset', u.n, ''); toast('Reset email sent'); } })) },
        { l: 'Change email…', g: 1, fn: () => guard('account', 'Change email for ' + u.n, () => setDlg({ title: 'Change sign-in email for ' + u.n + '?', body: 'Current: ' + u.e + '. The new address must be verified before it takes effect.', cta: 'Send verification', needReason: 1, yes: r => { log('user.email_change', u.n, r); toast('Verification sent'); } })) }]} trigger={(t, o) => <button className="b" style={{ height: 'var(--cp)', width: 'var(--cp)', padding: 0 }} aria-label="More actions" aria-expanded={o} onClick={t}><I n="more" /></button>} /></>} />
    <Gate n={3}><Facts items={[['User ID', <span className="mo">{u.id}</span>], ['Email', <span className="mo">{u.e}</span>], ['Workspace', <button className="lk el" onClick={() => go('workspace', w.id)}>{w.n}</button>], ['Role', u.role], ['Tier', u.tier], ['Last sign-in', u.last]]} /></Gate>
    <div className="gms">
      <div className="col">
        <Tabs v={tab} on={setTab} tabs={[['orders', 'Orders'], ['progress', 'Progress'], ['emails', 'Emails sent'], ['activity', 'Activity']]} />
        {tab === 'orders' && <Table rows={INV.filter(i => i.c === u.ws)} empty={{ ic: 'billing', t: 'No orders for this user' }} cols={[{ k: 'id', l: 'Invoice', mo: 1, w: 'minmax(150px,1.4fr)' }, { k: 'amt', l: 'Amount', num: 1, w: '96px' }, { k: 'st', l: 'Status', w: '104px', r: i => <St v={i.st} /> }, { k: 'd', l: 'Date', w: '112px', ns: 1 }]} onRow={() => go('billing', null, 'invoices')} />}
        {tab === 'progress' && <Gate><Card pad={false}>{MODS0.filter(m => m.st === 'Published' && (u.tier === 'Team' || m.tier === 'both')).map((m, i) => <div key={m.id} className="li"><span className="el" style={{ flex: 1 }}>{m.n}</span><St v={!started ? 'Not started' : i < u.pr ? 'Deployed' : i === u.pr ? 'In progress' : 'Not started'} tone={!started ? '' : i < u.pr ? 'ok' : i === u.pr ? 'info' : ''} /></div>)}</Card></Gate>}
        {tab === 'emails' && <Table rows={EMAILS.filter(e => e.to === u.e)} empty={{ ic: 'email', t: 'No emails sent to this user' }} cols={[{ k: 'sub', l: 'Subject', w: 'minmax(200px,2fr)' }, { k: 'tpl', l: 'Template', mo: 1, w: '136px', hide: 'lap' }, { k: 'st', l: 'Status', w: '104px', r: e => <St v={e.st} /> }, { k: 't', l: 'Sent', w: '128px', ns: 1, r: x => <Stamp v={x.t} two /> }]} />}
        {tab === 'activity' && <Gate><Card>{[[u.last, 'Signed in with Google'], ['Dec 8, 2:14 PM MT / 3:14 PM CT', 'Opened the Session 2 replay'], ['Dec 2, 12:01 PM MT / 1:01 PM CT', 'Joined Session 1'], ['Nov 24, 9:30 AM MT / 10:30 AM CT', 'Account created at checkout']].map((a, i) => <div key={i} className="tl"><div>{a[1]}</div><div className="me mo"><Stamp v={a[0]} /></div></div>)}</Card></Gate>}
      </div>
      <div className="col">
        <Card t="Identity"><KV rows={[['Email verified', 'Yes, Nov 24, 2026'], ['Sign-in', 'Password, Google'], ['Staff role', 'None'], ['Access groups', <span className="row" style={{ gap: 6 }}><Pill v="library" tone="" /><Pill v="agent" tone="" />{u.tier === 'Team' && <Pill v="team" tone="" />}</span>]]} /></Card>
        <Card t="Notes" sub="Internal. Never shown to the user."><div className="note col s"><span><span className="w5">Imani Brooks</span> <span className="me">· <Stamp v="Dec 7, 3:40 PM MT / 4:40 PM CT" /></span></span><p className="s2">Prefers email over calls. Mornings MT.</p></div></Card>
      </div>
    </div>
  </div>;
}

function Masquerade() {
  const { masq, startMasq, endMasq, go, can, role } = useC();
  const [pick, setPick] = useState(USERS[0].id);
  return <div className="pg">
    <Head t="Masquerade" d="Sign in as a user to see exactly what they see. Owner and Admin only, time-boxed, and audit-logged." />
    <Gate n={6}>
      <div className="gms">
        <div className="col">
          {masq ? <Card t="Active session" right={<Pill v={fmt(masq.left) + ' left'} tone="warn" />}><div className="col"><KV rows={[['Signed in as', masq.u.n + ' · ' + masq.u.ws], ['Reason', masq.reason], ['Time granted', masq.granted / 60 + ' of 60 minutes']]} /><div className="row"><Btn onClick={() => go('as')}>Open learner view</Btn><Btn k="d" onClick={() => endMasq('Exited by staff')}>Exit masquerade</Btn></div></div></Card>
            : can('masq') ? <Card t="Start a session"><div className="col m"><div className="row"><select className="in" style={{ flex: '1 1 240px' }} aria-label="User" value={pick} onChange={e => setPick(e.target.value)}>{USERS.map(u => <option key={u.id} value={u.id}>{u.n} · {u.ws}</option>)}</select><Btn k="p" ic="masquerade" onClick={() => startMasq(USERS.find(u => u.id === pick))}>Masquerade…</Btn></div><p className="me">You will be asked for a reason. You can also start from any user or workspace record.</p></div></Card>
              : <Card t="Start a session"><div className="row nw" style={{ alignItems: 'flex-start' }}><I n="lock" /><p className="s2">Your role ({role}) can't start masquerade. Ask an Owner or Admin, or send them the user record.</p></div></Card>}
          <Table title="Recent sessions" empty={{ ic: 'masquerade', t: 'No masquerade sessions yet' }} rows={[['Avery Stone', 'Sam Whitlock', 'Customer cannot see the Session 2 replay.', 'Dec 9, 9:25 PM MT / 10:25 PM CT', '6 min', 'Exited by staff'], ['Avery Stone', 'Jordan Hale', 'Checking seat invite flow after upgrade request.', 'Dec 8, 2:02 PM MT / 3:02 PM CT', '15 min', 'Expired'], ['Connor Leiva', 'Elena Vargas', 'Verifying Week 2 step order on her account.', 'Dec 6, 4:18 PM MT / 5:18 PM CT', '11 min', 'Exited by staff']]}
            cols={[{ k: 1, l: 'As user', w: 'minmax(120px,1fr)', r: r => <Two a={r[1]} b={'by ' + r[0]} /> }, { k: 2, l: 'Reason', w: 'minmax(160px,2fr)', ns: 1 }, { k: 3, l: 'Started', w: '128px', ns: 1, hide: 'lap', r: x => <Stamp v={x[3]} two /> }, { k: 4, l: 'Length', w: '64px', num: 1 }, { k: 5, l: 'Ended', w: '120px', r: (r, dr) => dr.drop ? <div className="col" style={{ gap: 0 }}><span className="el">{r[5]}</span><span className="me el">{r[3]}</span></div> : r[5] }]} />
        </div>
        <div className="col">
          <Card t="Rules for every session" pad={false}>{['A written reason is required to start.', '15 minutes. Each extension adds 15 and needs a new reason. 60 minutes is the maximum.', 'A banner stays on screen with the countdown and an Exit control.', 'Every write is blocked: edits, publishes, refunds, exports, retries, notes.', 'Start, stop, extend, and every blocked attempt go to the audit log.'].map((t, i) => <div key={i} className="li" style={{ alignItems: 'flex-start' }}><span className="me tn" style={{ width: 12, paddingTop: 2 }}>{i + 1}</span><span style={{ flex: 1 }}>{t}</span></div>)}</Card>
          <Card t="Not the same as Preview as Learner"><p className="s2">Preview as Learner is a read-only curriculum preview in one tab, as a generic agent or owner. It lives in <button className="lk a" onClick={() => go('curriculum')}>Curriculum</button> and is not audit-logged.</p></Card>
        </div>
      </div>
    </Gate>
  </div>;
}
function LearnerView() {
  const { masq, go } = useC();
  if (!masq) return <div className="pg"><div className="cd"><Empty ic="masquerade" t="No masquerade session is active" b="Start one from a user or workspace record." cta="Go to Masquerade" on={() => go('masquerade')} /></div></div>;
  return <div className="pg">
    <Head t={'Good morning, ' + masq.u.n.split(' ')[0]} d={'The learner portal as ' + masq.u.n + ' sees it. Learner screens are outside this mockup, so this page is a stand-in.'} right={<Btn onClick={() => go('user', masq.u.id)}>Back to user record</Btn>} />
    <div className="g2"><Card t="Your builds"><div className="row nw"><Bar v={masq.u.pr} max={masq.u.of} v2={0} /><span className="tn">{masq.u.pr} of {masq.u.of} deployed</span></div></Card><Card t="Next live build"><span>Session 3 · Wed, Dec 16 · 12:00 PM MT / 1:00 PM CT</span></Card></div>
    <Card t="Try a blocked action"><div className="col m"><p className="s2">Admin tools stay visible during a session, with a lock. Using one shows the block and logs the attempt.</p><div><Btn onClick={() => go('billing', null, 'invoices')}>Go to invoices</Btn></div></div></Card>
  </div>;
}

function Billing({ part }) {
  const { route, go, guard, setDlg, toast, log, can } = useC();
  const sum = part === 'summary';
  const [tab, setTab] = useState(sum ? 'summary' : route.tab || 'customers');
  useEffect(() => { if (!sum && route.tab) setTab(route.tab); }, [route.tab]);
  const ro = !can('refund');
  const refund = i => guard('refund', 'Refund ' + i.id, () => setDlg({ title: 'Refund ' + i.amt + ' to ' + i.c + '?', body: 'Invoice ' + i.id + ', ' + i.card + '. The refund is sent to Stripe and cannot be reversed from the admin.', cta: 'Refund ' + i.amt, danger: 1, needReason: 1, yes: r => { log('billing.refund', i.id, i.amt + '. Reason: ' + r); toast('Refund sent to Stripe'); } }));
  const voidI = i => guard('refund', 'Void ' + i.id, () => setDlg({ title: 'Void invoice ' + i.id + '?', body: i.amt + ' for ' + i.c + '. The customer will no longer be asked to pay it.', cta: 'Void invoice', danger: 1, needReason: 1, yes: r => { log('billing.void', i.id, r); toast('Invoice voided'); } }));
  return <div className="pg">
    {!sum && <Head t="Billing" meta={ro && <Pill v="Read-only for your role" tone="" />} d="The lists behind the money, from Stripe. Prices and Payment Links are made in Stripe and are not edited here." />}
    {!sum && <Tabs v={tab} on={setTab} tabs={[['customers', 'Customers'], ['subs', 'Subscriptions'], ['invoices', 'Invoices'], ['failed', 'Failed payments', 3], ['refunds', 'Refunds']]} />}
    {tab === 'summary' && <><Gate n={3}><div className="g4"><Stat l="MRR · sample" v="$18,516" sub="+$695 this week" tone="ok" /><Stat l="Subscriptions" v="77" sub="Active" /><Stat l="Failed payments" v="3" sub="Needs review" tone="bad" go={() => go('payments', null, 'failed')} /><Stat l="Refunds, 30d" v="$0" go={() => go('payments', null, 'refunds')} /></div></Gate>
      <Table title="Plan economics · sample figures" rows={[['Team Plan · 16 seats', '$695 monthly', '5 teams', '$3,475'], ['Team Plan · 41 seats', '$1,495 monthly', '2 teams', '$2,990'], ['Agent Plan', '$29 per agent, monthly', '212 agents', '$6,148'], ['Insiders', '$97 monthly', '61 members', '$5,917'], ['AI Accelerator', '$7,500 or 2 × $3,750', '11 of 15 seats', 'One-time']]}
        cols={[{ k: 0, l: 'Plan', w: 'minmax(180px,1.4fr)', r: r => <span className="w5">{r[0]}</span> }, { k: 1, l: 'Price', w: 'minmax(160px,1fr)' }, { k: 2, l: 'Active', w: 'minmax(110px,1fr)' }, { k: 3, l: 'MRR', w: '96px', num: 1 }]} />
      <Gate><Card t="AI Accelerator" right={<St v="Active" />}><KV rows={[['Price', '$7,500, or two payments of $3,750'], ['Seats sold', <span className="row nw" style={{ maxWidth: 260 }}><Bar v={11} max={15} /><span className="tn">11 of 15</span></span>], ['Seat cap', <span className="row" style={{ gap: 6 }}><I n="lock" />15 seats. Product rule, view only.</span>], ['Collected', '$67,500'], ['Second payments due', '4 × $3,750 = $15,000']]} /></Card></Gate></>}
    {tab === 'customers' && <Table rows={WS} onRow={w => go('workspace', w.id)} empty={{ ic: 'billing', t: 'No Stripe customers yet' }} cols={[{ k: 'n', l: 'Customer', w: 'minmax(180px,1.4fr)', r: w => <Two a={w.n} b={w.cus} mo /> }, { k: 'plan', l: 'Plan', w: 'minmax(150px,1fr)' }, { k: 'mrr', l: 'MRR', w: '96px', num: 1 }, { k: 'st', l: 'Status', w: '104px', r: w => <St v={w.st} /> }]} />}
    {tab === 'subs' && <Table rows={WS.filter(w => w.sub !== '—')} empty={{ ic: 'billing', t: 'No subscriptions yet' }} cols={[{ k: 'sub', l: 'Subscription', mo: 1, w: 'minmax(170px,1.2fr)' }, { k: 'n', l: 'Workspace', w: 'minmax(150px,1fr)' }, { k: 'plan', l: 'Plan', w: 'minmax(150px,1fr)', hide: 'lap' }, { k: 'mrr', l: 'MRR', w: '96px', num: 1 }, { k: 'st', l: 'Status', w: '104px', r: w => <St v={w.st} /> }]} onRow={w => go('workspace', w.id)} />}
    {tab === 'invoices' && <Table rows={INV} empty={{ ic: 'billing', t: 'No invoices yet' }} cols={[{ k: 'id', l: 'Invoice', mo: 1, w: 'minmax(150px,1.2fr)' }, { k: 'c', l: 'Customer', w: 'minmax(150px,1.2fr)' }, { k: 'card', l: 'Payment method', w: 'minmax(140px,1fr)', hide: 'lap' }, { k: 'amt', l: 'Amount', w: '96px', num: 1 }, { k: 'st', l: 'Status', w: '104px', r: i => <St v={i.st} /> }, { k: 'd', l: 'Date', w: '104px', ns: 1 }]}
      menu={i => [{ l: 'Open customer', fn: () => go('workspace', WS.find(w => w.n === i.c).id) }, ...(i.st === 'Paid' ? ['-', { l: 'Refund…', d: !ro, g: 1, off: ro, fn: () => refund(i) }] : []), ...(i.st === 'Open' || i.st === 'Failed' ? ['-', { l: 'Void invoice…', d: !ro, g: 1, off: ro, fn: () => voidI(i) }] : [])]} />}
    {tab === 'failed' && <Table empty={{ ic: 'check', t: 'No failed payments' }} rows={[['Tidewater Property Co.', '$97.00', 'card_declined: insufficient_funds', '2 of 4', 'Dec 11, 9:00 AM MT / 10:00 AM CT'], ['Hale & Marlowe Realty', '$695.00', 'authentication_required', '1 of 4', 'Dec 11, 8:00 AM MT / 9:00 AM CT'], ['Copper Basin Realty', '$3,750.00', 'card_declined: do_not_honor', '1 of 4', 'Dec 12, 12:00 PM MT / 1:00 PM CT']]}
      cols={[{ k: 0, l: 'Customer', w: 'minmax(170px,1.2fr)', r: r => <span className="w5">{r[0]}</span> }, { k: 2, l: 'Decline reason', mo: 1, w: 'minmax(200px,1.6fr)' }, { k: 1, l: 'Amount', w: '96px', num: 1 }, { k: 3, l: 'Attempts', w: '80px' }, { k: 4, l: 'Next retry', w: '136px', ns: 1, r: x => <Stamp v={x[4]} two /> }]}
      menu={r => [{ l: 'Open customer', fn: () => go('workspace', WS.find(w => w.n === r[0]).id) }, { l: 'Open email log', fn: () => go('email') }]} />}
    {tab === 'refunds' && <Table empty={{ ic: 'billing', t: 'No refunds yet' }} rows={[['re_3QxK5fFm70', 'in_1QxK5fFm0270', '$695.00', 'Canceled inside trial window', 'Connor Leiva', 'Nov 1, 4:44 PM MT / 5:44 PM CT']]} cols={[{ k: 0, l: 'Refund', mo: 1, w: 'minmax(120px,1fr)' }, { k: 1, l: 'Invoice', mo: 1, w: 'minmax(140px,1fr)', hide: 'lap' }, { k: 3, l: 'Reason', w: 'minmax(180px,1.6fr)' }, { k: 4, l: 'By', w: '120px' }, { k: 2, l: 'Amount', w: '96px', num: 1 }, { k: 5, l: 'When', w: '128px', ns: 1, r: x => <Stamp v={x[5]} two /> }]} />}
  </div>;
}

function Usage() {
  const { ph } = useC();
  const [ws, setWs] = useState('All workspaces'), [plan, setPlan] = useState('All plans'), [range, setRange] = useState('Last 14 days');
  const rows = WS.filter(w => (ws === 'All workspaces' || w.n === ws) && (plan === 'All plans' || w.plan.startsWith(plan)) && w.st !== 'Canceled');
  const bars = [62, 71, 68, 80, 77, 31, 28, 74, 85, 88, 92, 81, 36, 30];
  const k = rows.reduce((a, w) => a + w.used, 0);
  return <div className="pg">
    <Head t="Usage" d="How much the product is being used, by workspace and plan." />
    <div className="row"><Sel label="Workspace" v={ws} on={setWs} opts={['All workspaces', ...WS.map(w => w.n)]} /><Sel label="Plan" v={plan} on={setPlan} opts={['All plans', 'Team Plan', 'Agent Plan', 'Insiders', 'AI Accelerator']} /><Sel label="Date range" v={range} on={setRange} opts={['Last 7 days', 'Last 14 days', 'Last 30 days']} /></div>
    <Gate n={8} empty={{ ic: 'usage', t: 'No usage in this range' }}>
      <div className="g3 st2"><Stat l="Sign-ins" v={(k * 16).toLocaleString()} /><Stat l="Lesson plays" v={(k * 43).toLocaleString()} /><Stat l="Skill-guide views" v={(k * 74).toLocaleString()} /><Stat l="Seat utilization" v={Math.round(k / rows.reduce((a, w) => a + w.cap, 0) * 100 || 0) + '%'} /><Stat l="Storage" v="41.2 GB" sub="of 100 GB bucket" /><Stat l="Emails sent" v={(k * 29).toLocaleString()} /></div>
      <Card t="Sign-ins per day" sub={range}><div style={{ display: 'flex', alignItems: 'flex-end', gap: ph ? 4 : 8, height: 140 }} role="img" aria-label="Sign-ins per day. Weekdays run 60 to 90, weekends about 30.">{bars.map((b, i) => <i key={i} style={{ flex: 1, height: b + '%', background: 'var(--for)', borderRadius: '3px 3px 0 0', opacity: b < 40 ? 0.45 : 1 }} />)}</div><div className="row nw me mo" style={{ paddingTop: 8 }}><span>Nov 27</span><span className="sp" /><span>Dec 10</span></div></Card>
    </Gate>
    <Table title="By workspace" rows={rows} empty={{ ic: 'usage', t: 'No usage in this range' }} cols={[{ k: 'n', l: 'Workspace', w: 'minmax(180px,1.5fr)', r: w => <span className="w5">{w.n}</span> }, { k: 'plan', l: 'Plan', w: 'minmax(150px,1fr)', hide: 'lap' }, { k: 'used', l: 'Sign-ins', num: 1, w: '88px', r: w => (w.used * 16).toLocaleString() }, { k: 'used', l: 'Lesson plays', num: 1, w: '104px', r: w => (w.used * 43).toLocaleString() }, { k: 'used', l: 'Seat use', w: '160px', sv: w => w.used / w.cap, r: w => <span className="row nw" style={{ gap: 10 }}><Bar v={w.used} max={w.cap} fx={fixedSeats(w)} /><span className="tn" style={{ minWidth: 36, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{Math.round(w.used / w.cap * 100)}%</span></span> }]} />
  </div>;
}

function Api() {
  const { route, go, guard, setDlg, toast, log } = useC();
  const [tab, setTab] = useState(route.tab || 'endpoints'), [src, setSrc] = useState('All sources');
  return <div className="pg">
    <Head t="API & Webhooks" d="Endpoint latency and error rates over the last 24 hours, and every webhook delivery in and out." />
    <Gate n={3}><div className="g4"><Stat l="p95 latency" v="212 ms" sub="Healthy" tone="ok" /><Stat l="Error rate" v="0.4%" sub="Healthy" tone="ok" /><Stat l="Requests, 24h" v="76,320" /><Stat l="Failed deliveries" v="4" sub="3 GHL, 1 Stripe" tone="bad" go={() => setTab('hooks')} /></div></Gate>
    <Tabs v={tab} on={setTab} tabs={[['endpoints', 'Endpoints'], ['hooks', 'Webhook deliveries', HOOKS.length]]} />
    {tab === 'endpoints' && <Table rows={ENDPOINTS} empty={{ ic: 'api', t: 'No requests in this window' }} cols={[{ k: 'p', l: 'Endpoint', mo: 1, w: 'minmax(220px,2fr)' }, { k: 'req', l: 'Requests', num: 1, ns: 1, w: '88px' }, { k: 'p50', l: 'p50', num: 1, ns: 1, w: '80px' }, { k: 'p95', l: 'p95', num: 1, ns: 1, w: '80px' }, { k: 'er', l: 'Error rate', w: '136px', r: e => <span className="row nw"><span className="tn" style={{ width: 40 }}>{e.er.toFixed(1)}%</span>{e.er >= 2 && <Pill v={e.er >= 5 ? 'High' : 'Elevated'} tone={e.er >= 5 ? 'bad' : 'warn'} />}</span> }]} />}
    {tab === 'hooks' && <><div className="row"><Sel label="Source" v={src} on={setSrc} opts={['All sources', 'Stripe', 'GoHighLevel', 'Zoom']} /></div>
      <Table rows={HOOKS.filter(h => src === 'All sources' || h.src === src)} empty={{ ic: 'api', t: 'No webhook deliveries yet' }}
        cols={[{ k: 'ev', l: 'Event', w: 'minmax(200px,1.6fr)', r: h => <Two a={<span className="mo">{h.ev}</span>} b={h.src + (h.id !== '—' ? ' · ' + h.id : '')} /> }, { k: 'st', l: 'Status', w: '128px', r: h => <St v={h.st} /> }, { k: 'att', l: 'Attempts', w: '80px' }, { k: 'next', l: 'Next attempt', w: '152px', ns: 1, hide: 'lap', r: x => <Stamp v={x.next} two /> }, { k: 'err', l: 'Last error', w: 'minmax(160px,1.4fr)', ns: 1, r: h => <span className="s2">{h.err}</span> }]}
        menu={h => [{ l: 'Retry now…', g: 1, off: !(h.st === 'Failed' || h.st === 'Retrying'), fn: () => guard('jobs', 'Retry ' + h.ev, () => setDlg({ title: 'Retry ' + h.ev + ' for ' + h.id + '?', body: 'Sends this ' + h.src + ' delivery again now. Handlers are idempotent, so a repeat is safe.', cta: 'Retry delivery', yes: () => { log('webhook.retry', h.ev + ' ' + h.id, ''); toast('Retry queued'); } })) }, { l: 'Related incidents', fn: () => go('incidents') }]} />
      <p className="me">Payloads and signing secrets are not shown. Event IDs link a delivery to its order or user.</p></>}
  </div>;
}

function Integrations() {
  const { toast } = useC();
  const L = [
    { n: 'Stripe', use: 'Payments, subscriptions, invoices', st: 'Connected', ok: 'Dec 10, 9:18 AM MT / 10:18 AM CT', err: 'None', sec: [['Secret key', 1], ['Webhook signing secret', 1]] },
    { n: 'GoHighLevel', use: 'CRM sync for logins and orders', st: 'Degraded', ok: 'Dec 9, 9:04 PM MT / 10:04 PM CT', err: 'Dec 10, 9:10 AM MT / 10:10 AM CT · 401 Unauthorized', sec: [['Access token', 1], ['Location ID', 1]] },
    { n: 'Zoom', use: 'Session join links', st: 'Connected', ok: 'Dec 9, 12:00 PM MT / 1:00 PM CT', err: 'None', sec: [['OAuth client secret', 1], ['Recording webhook secret', 0]] },
    { n: 'Google', use: 'Sign in with Google', st: 'Connected', ok: 'Dec 10, 8:52 AM MT / 9:52 AM CT', err: 'None', sec: [['OAuth client secret', 1]] },
    { n: 'Resend', use: 'Transactional email', st: 'Connected', ok: 'Dec 10, 9:18 AM MT / 10:18 AM CT', err: 'Dec 7, 7:00 AM MT / 8:00 AM CT · 1 hard bounce', sec: [['API key', 1]] },
    { n: 'Storage', use: 'Railway S3-compatible bucket', st: 'Connected', ok: 'Dec 10, 9:02 AM MT / 10:02 AM CT', err: 'None', sec: [['Access key', 1]] },
    { n: 'GA4', use: 'Analytics on www only', st: 'Connected', ok: '—', err: '—', id: 'G-TSQ5YB5BCP', sec: [] },
    { n: 'Meta Pixel', use: 'Ads measurement on www only', st: 'Connected', ok: '—', err: '—', id: '1835170747490806', sec: [] },
  ];
  return <div className="pg">
    <Head t="Integrations" d="Connection state for each service. Secret values never reach the browser, so there is nothing to reveal, copy, or replace here." />
    <Gate n={8}><div className="g2">{L.map(x => <Card key={x.n} t={x.n} sub={x.use} right={<St v={x.st} />}><div className="col">
      <KV rows={[['Last success', <span className="mo">{x.ok}</span>], ['Last error', <span className="mo">{x.err}</span>], ...(x.id ? [['Public tag ID', <span className="mo">{x.id}</span>]] : []), ...x.sec.map(s => [s[0], <St v={s[1] ? 'Present' : 'Not configured'} />])]} />
      {x.sec.length > 0 ? <div><Btn ic="refresh" onClick={() => toast(x.n + (x.st === 'Degraded' ? ': test failed, 401 Unauthorized' : ': connection ok'))}>Test connection</Btn></div> : <p className="me">Managed on www. View only.</p>}
    </div></Card>)}</div></Gate>
  </div>;
}

function Deploys() {
  return <div className="pg">
    <Head t="Deploys & Commits" d="Commits on main and their Railway production deploys. Read-only." />
    <Gate n={3}><Facts items={[['Repository', <span className="mo">amplified-impact-lms</span>], ['Branch', <span className="mo">main</span>], ['Railway service', <span className="mo">web</span>], ['Environment', 'Production'], ['Live commit', <span className="row nw" style={{ gap: 8 }}><span className="mo">a3f91c2</span><St v="Live" /></span>]]} /></Gate>
    <Table rows={DEPLOYS} empty={{ ic: 'deploys', t: 'No deploys found' }} cols={[{ k: 'm', l: 'Commit', w: 'minmax(260px,2.4fr)', r: d => <div className="row nw" style={{ gap: 12 }}><St v="" tone={TONE[d.st]} /><Two a={d.m} b={d.sha + ' · main'} mo /></div> }, { k: 'st', l: 'Deploy', w: '112px', r: d => <span className={d.st === 'Failed' ? 'w5' : ''} style={d.st === 'Failed' ? { color: 'var(--bad)' } : undefined}>{d.st}</span> }, { k: 'dur', l: 'Build', w: '72px', num: 1, ns: 1 }, { k: 'a', l: 'Author', w: '128px', hide: 'lap' }, { k: 't', l: 'Time', w: '136px', ns: 1, r: x => <Stamp v={x.t} two /> }]} />
  </div>;
}

function Db() {
  return <div className="pg">
    <Head t="DB Health" meta={<Pill v="Read-only" tone="" />} d="Postgres health. Nothing on this page can change data." />
    <Gate n={8}>
      <div className="g4"><Stat l="Connections" v="14 / 100" sub="Healthy" tone="ok" /><Stat l="Database size" v="1.8 GB" /><Stat l="Slow queries, 24h" v="3" sub="over 500 ms" /><Stat l="Migration" v="0014" sub="Up to date" tone="ok" /></div>
      <Card t="Slow queries" sub="Parameters removed"><div className="col">
        {[['1,940 ms mean · 96 calls', 'SELECT o.id, o.ghl_attempts, o.ghl_error\nFROM orders o\nWHERE o.ghl_synced_at IS NULL\nORDER BY o.created_at\nLIMIT $1'], ['812 ms mean · 14 calls', 'SELECT p.user_id, count(*)\nFROM progress p\nJOIN modules m ON m.id = p.module_id\nWHERE m.cohort_id = $1\nGROUP BY p.user_id'], ['604 ms mean · 7 calls', 'SELECT job, key, sent_at\nFROM job_runs\nWHERE job = $1 AND sent_at > $2']].map((s, i) => <div key={i} className="col m"><span className="me">{s[0]}</span><pre className="pre">{s[1]}</pre></div>)}
      </div></Card>
      <div className="g2">
        <Card t="Largest tables" pad={false}>{[['activity', '412 MB', '2.1M rows'], ['progress', '288 MB', '940K rows'], ['auth_sessions', '164 MB', '310K rows'], ['job_runs', '121 MB', '1.4M rows'], ['stripe_events', '96 MB', '48K rows'], ['orders', '22 MB', '3.2K rows']].map(t => <div key={t[0]} className="li"><span className="mo" style={{ flex: 1 }}>{t[0]}</span><span className="tn">{t[1]}</span><span className="tn mu" style={{ width: 80, textAlign: 'right' }}>{t[2]}</span></div>)}</Card>
        <Card t="Migrations" sub="Drizzle" pad={false}>{[['0014_cohort_starts_at_first_build', 'Dec 2, 9:48 AM MT / 10:48 AM CT'], ['0013_course_guide_links', 'Nov 24, 4:48 PM MT / 5:48 PM CT'], ['0012_access_group_domains', 'Nov 12, 1:10 PM MT / 2:10 PM CT'], ['0011_google_identities', 'Nov 3, 9:32 AM MT / 10:32 AM CT']].map((m, i) => <div key={m[0]} className="li"><span className="mo el" style={{ flex: '1 1 160px' }}>{m[0]}</span>{i === 0 && <Pill v="Latest" tone="ok" />}<span className="me" style={{ whiteSpace: 'nowrap' }}>{m[1]}</span></div>)}</Card>
      </div>
    </Gate>
  </div>;
}

function Flags() {
  const F = [['masquerade_enabled', 'Staff can start masquerade sessions', 1], ['preview_as_learner', 'Curriculum preview in the builder', 1], ['google_sign_in', 'Sign in with Google on the login page', 1], ['accelerator_two_pay', 'Offer two payments at Accelerator checkout', 1], ['weekly_digest', 'Send the Monday digest email', 1], ['ghl_sync_write', 'Write logins and orders to GoHighLevel', 1], ['zoom_recording_webhook', 'Accept Zoom recording webhooks', 0], ['maintenance_mode', 'Show the maintenance page to learners', 0]];
  return <div className="pg">
    <Head t="Environment Flags" meta={<Pill v="Read-only" tone="" />} d="Flag state and whether each secret is configured. Flags are set in the Railway environment, and values are never shown." />
    <Gate n={8}>
      <Facts items={[['Environment', 'Production'], ['Stripe mode', <St v="Live" />], ['Email mode', 'Resend, live sending'], ['Flags on', '6 of 8']]} />
      <div className="g2" style={{ alignItems: 'start' }}>
        <Card t="Feature flags" pad={false}>{F.map(x => <div key={x[0]} className="li"><div className="col" style={{ flex: 1, gap: 0 }}><span className="mo el">{x[0]}</span><span className="me">{x[1]}</span></div><St v={x[2] ? 'On' : 'Off'} /></div>)}</Card>
        <Card t="Configured secrets" sub="Presence only. There is no reveal or replace control." pad={false}>{[['Stripe secret key', 1], ['Stripe webhook signing secret', 1], ['Resend API key', 1], ['GoHighLevel access token', 1], ['Google OAuth client secret', 1], ['Zoom OAuth client secret', 1], ['Zoom recording webhook secret', 0], ['Session signing secret', 1], ['Storage access key', 1]].map(s => <div key={s[0]} className="li"><span style={{ flex: 1 }}>{s[0]}</span><St v={s[1] ? 'Present' : 'Not configured'} /></div>)}</Card>
      </div>
    </Gate>
  </div>;
}

function Jobs() {
  const { guard, setDlg, log, toast, go } = useC();
  const [run, setRun] = useState({});
  return <div className="pg">
    <Head t="Scheduled Jobs" d="Runs are keyed in job_runs, so running a job again skips anything it already sent. One scheduler holds the lock at a time." />
    <Table rows={JOBS} empty={{ ic: 'jobs', t: 'No jobs registered' }} cols={[{ k: 'j', l: 'Job', mo: 1, w: 'minmax(180px,1.5fr)' }, { k: 'sch', l: 'Schedule', w: 'minmax(110px,1fr)', r: x => <Stamp v={x.sch} two /> }, { k: 'st', l: 'Last result', w: '120px', r: j => <St v={run[j.j] ? 'Running' : j.st} /> }, { k: 'last', l: 'Last run', w: '136px', ns: 1, r: x => <Stamp v={x.last} two /> }, { k: 'dur', l: 'Duration', num: 1, ns: 1, w: '72px', hide: 'lap' }, { k: 'next', l: 'Next run', w: '136px', ns: 1, r: x => <Stamp v={x.next} two /> }]}
      menu={j => [j.j === 'billing' ? { l: 'Run now is off for billing', off: 1, fn: () => {} } : { l: 'Run now…', ic: 'play', g: 1, fn: () => guard('jobs', 'Run ' + j.j, () => setDlg({ title: 'Run ' + j.j + ' now?', body: 'Starts one extra run outside the schedule (' + j.sch.toLowerCase() + '). Anything already sent is skipped.', cta: 'Run ' + j.j, yes: () => { setRun({ ...run, [j.j]: 1 }); log('job.run_now', j.j, 'Manual run.'); toast(j.j + ' started'); } })) }, ...(j.st === 'Failed' ? [{ l: 'Open incident', fn: () => go('incident', 'INC-0007') }] : [])]} />
    <p className="me">The billing job only runs on its schedule. It cannot be started by hand.</p>
  </div>;
}

function Incidents() {
  const { go, inc } = useC();
  const [st, setSt] = useState('Any status');
  return <div className="pg">
    <Head t="Incidents" d="What broke, who has it, and what it is linked to." />
    <div className="row"><Sel label="Status" v={st} on={setSt} opts={['Any status', 'Open', 'Acknowledged', 'Resolved']} /></div>
    <Table rows={INCIDENTS.map(i => ({ ...i, st: inc[i.id] || i.st })).filter(i => st === 'Any status' || i.st === st)} onRow={i => go('incident', i.id)} empty={{ ic: 'check', t: 'No incidents', b: 'Failed jobs and webhooks open one automatically.' }}
      cols={[{ k: 't', l: 'Incident', w: 'minmax(240px,2fr)', r: i => <Two a={i.t} b={i.id} mo /> }, { k: 'sev', l: 'Severity', w: '88px', r: i => <Pill v={i.sev} /> }, { k: 'st', l: 'Status', w: '128px', r: i => <St v={i.st} tone={i.st === 'Open' ? 'bad' : undefined} /> }, { k: 'own', l: 'Owner', w: '128px', hide: 'lap' }, { k: 'o', l: 'Opened', w: '128px', ns: 1, r: x => <Stamp v={x.o} two /> }]} />
  </div>;
}
function Incident() {
  const { route, go, inc, setInc, log, guard, toast } = useC();
  const i = INCIDENTS.find(x => x.id === route.id);
  if (!i) return <NotFound />;
  const st = inc[i.id] || i.st;
  const set = s => guard('jobs', s + ' ' + i.id, () => { setInc({ ...inc, [i.id]: s }); log('incident.' + s.toLowerCase(), i.id, ''); toast(i.id + ' is ' + s.toLowerCase()); });
  return <div className="pg">
    <Head back={['incidents', 'Incidents']} t={i.t} meta={<Pill v={i.sev} />} right={<>{st === 'Open' && <GBtn perm="jobs" label={'Acknowledge ' + i.id} go={() => set('Acknowledged')}>Acknowledge</GBtn>}{st !== 'Resolved' && <GBtn k="p" perm="jobs" label={'Resolve ' + i.id} go={() => set('Resolved')}>Resolve</GBtn>}</>} />
    <Gate n={3}><Facts items={[['Incident', <span className="mo">{i.id}</span>], ['Status', <St v={st} tone={st === 'Open' ? 'bad' : undefined} />], ['Severity', i.sev], ['Owner', i.own], ['Opened', i.o]]} /></Gate>
    <Gate><div className="gms">
      <Card t="Timeline">{[...i.tl, ...(st !== i.st ? [['Just now', st + ' by you.']] : [])].map((t, k) => <div key={k} className="tl"><div>{t[1]}</div><div className="me mo"><Stamp v={t[0]} /></div></div>)}</Card>
      <Card t="Linked" pad={false}>{i.links.map((l, k) => <div key={k} className="li"><I n={l[0]} /><button className="lk" style={{ flex: 1 }} onClick={() => go(l[0], null, l[0] === 'api' ? 'hooks' : null)}>{l[1]}</button><I n="chev" /></div>)}</Card>
    </div></Gate>
  </div>;
}

function Email() {
  const { log, toast, guard } = useC();
  const [q, setQ] = useState(''), [tpl, setTpl] = useState('Any template'), [st, setSt] = useState('Any status'), [open, setOpen] = useState(null);
  const rows = EMAILS.filter(e => (e.to + e.sub).toLowerCase().includes(q.toLowerCase()) && (tpl === 'Any template' || e.tpl === tpl) && (st === 'Any status' || e.st === st));
  const exp = () => guard('export', 'Export email log', () => { log('email_log.export', 'Email log', 'CSV, ' + rows.length + ' rows.'); toast('Export started. It is in the audit log.'); });
  /* D-263: the rollup over the rows the filters pick. Delivered is against what Resend took; opens and clicks are unique
     (a row once, however often) and against what was delivered, a complaint counted as delivered. */
  const sent = rows.filter(e => e.st !== 'Failed' && e.st !== 'Skipped').length, got = rows.filter(e => e.st === 'Delivered' || e.st === 'Complained');
  const bo = rows.filter(e => e.st === 'Bounced').length, cp = rows.filter(e => e.st === 'Complained').length, op = got.filter(e => e.op > 0).length, cl = got.filter(e => e.cl > 0).length;
  const pc = (n, d) => d ? Math.round(n / d * 100) + '%' : '—';
  return <div className="pg">
    <Head t="Email Log" d="Every transactional email and notification sent through Resend." right={<GBtn ic="download" perm="export" label="Export email log" go={exp}>Export CSV</GBtn>} />
    <div className="row"><Find v={q} on={setQ} ph="Filter recipient or subject" /><Sel label="Template" v={tpl} on={setTpl} opts={['Any template', ...new Set(EMAILS.map(e => e.tpl))]} /><Sel label="Status" v={st} on={setSt} opts={['Any status', 'Sent', 'Delivered', 'Delayed', 'Bounced', 'Complained', 'Failed', 'Skipped']} /></div>
    <Gate n={3}><div className="g5"><Stat l="Sent" v={String(sent)} sub="Last 180 days" /><Stat l="Delivered" v={pc(got.length, sent)} sub={got.length + ' of ' + sent + ' sent'} /><Stat l="Bounced" v={String(bo)} sub={(sent ? pc(bo, sent) + ' of sent' : 'None sent') + (cp ? ' · ' + cp + (cp === 1 ? ' complaint' : ' complaints') : '')} tone={cp || bo / sent >= 0.04 ? 'bad' : null} /><Stat l="Unique opens" v={pc(op, got.length)} sub={op + ' of ' + got.length + ' delivered'} /><Stat l="Unique clicks" v={pc(cl, got.length)} sub={cl + ' of ' + got.length + ' delivered'} /></div></Gate>
    <Table rows={rows} sel onRow={setOpen} bulk={<Btn onClick={exp}>Export selected</Btn>} empty={{ ic: 'email', t: 'No emails sent yet' }}
      cols={[{ k: 'sub', l: 'Email', w: 'minmax(260px,2fr)', r: e => <Two a={e.sub} b={e.to} mo /> }, { k: 'tpl', l: 'Template', mo: 1, w: '160px', hide: 'lap' }, { k: 'st', l: 'Status', w: '104px', r: e => <St v={e.st} /> }, { k: 'op', l: 'Opens', num: 1, w: '72px' }, { k: 'cl', l: 'Clicks', num: 1, w: '72px' }, { k: 't', l: 'Sent', w: '128px', ns: 1, r: x => <Stamp v={x.t} two /> }]} />
    {open && <Modal title={open.sub} onClose={() => setOpen(null)} foot={<Btn k="p" onClick={() => setOpen(null)}>Done</Btn>}>
      <KV rows={[['To', <span className="mo">{open.to}</span>], ['From', 'Amplified Impact'], ['Template', <span className="mo">{open.tpl}</span>], ['Provider', 'Resend'], ['Status', <St v={open.st} />], ['Sent', open.t],
        ...(open.dl ? [['Delivered', open.dl]] : []), ...(open.br ? [['Bounce', open.br]] : []),
        ['Opens', String(open.op)], ...(open.op ? [['First opened', open.fo], ['Last opened', open.lo]] : []),
        ['Clicks', String(open.cl)], ...(open.cl ? [['First clicked', open.fc], ['Last clicked', open.lc]] : []), ...(open.ln ? [['Last link clicked', <span className="mo">{open.ln}</span>]] : [])]} />
      <p className="me">The log keeps the subject and delivery events. The message body is not stored here.</p>
    </Modal>}
  </div>;
}

function NotFound() {
  const { go, setPal } = useC();
  return <div className="pg"><div className="cd"><Empty ic="search" t="This page doesn't exist" b="The link may be old, or the record was removed. Error 404." /><div className="row" style={{ justifyContent: 'center', paddingBottom: 40, marginTop: -28 }}><Btn k="p" onClick={() => go('overview')}>Go to Overview</Btn><Btn onClick={() => setPal(true)}>Search the admin</Btn></div></div></div>;
}
function Denied({ what }) {
  const { go, role } = useC();
  return <div className="pg"><div className="cd"><Empty ic="lock" t={'Your role can\'t open ' + (what || 'this page')} b={'You are signed in as ' + role + '. An Owner can change this in Roles & Permissions.'} /><div className="row" style={{ justifyContent: 'center', paddingBottom: 40, marginTop: -28 }}><Btn k="p" onClick={() => go('overview')}>Go to Overview</Btn></div></div></div>;
}


/* ---------- D-253 (R-5 Phase 1): four pages with tabs. Each tab is one of today's screens, so nothing is drawn twice:
   inside a tab a screen's own title is dropped and its own tabs become a segmented control (Head, Tabs). A tab is drawn
   once its page exists; Overview, Submissions and Settings (Cohort) and Utah Life (People) arrive in later phases. ---------- */
const SOLO = { Overview: 1, Program: 1, Cohort: 1, People: 1, Revenue: 1 };
const AREAS = {
  program: [['curriculum', 'Curriculum'], ['settings', 'Course Settings'], ['vault', 'Resource Vault']],
  cohort: [['overview', 'Overview'], ['schedule', 'Schedule'], ['people', 'People'], ['submissions', 'Submissions'], ['community', 'Community'], ['announcements', 'Announcements'], ['settings', 'Settings']],
  people: [['everyone', 'Everyone'], ['teams', 'Teams'], ['utah', 'Utah Life'], ['masquerade', 'Masquerade']],
  revenue: [['summary', 'Summary'], ['payments', 'Payments'], ['plans', 'Plans & Upgrades'], ['usage', 'Usage']],
};
const AREA_TABS = Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v.map(t => t[0])]));
/* yesterday's page names still work: each one is a tab now */
const ALIAS = { curriculum: ['program', 'curriculum'], course: ['program', 'settings'], vault: ['program', 'vault'], cohorts: ['cohort', 'schedule'], cohortov: ['cohort', 'overview'], cohortset: ['cohort', 'settings'], learners: ['cohort', 'people'], community: ['cohort', 'community'], announce: ['cohort', 'announcements'],
  users: ['people', 'everyone'], workspaces: ['people', 'teams'], utah: ['people', 'utah'], masquerade: ['people', 'masquerade'], billing: ['revenue', 'summary'], payments: ['revenue', 'payments'], tiers: ['revenue', 'plans'], usage: ['revenue', 'usage'] };
const routeOf = (s, id, tab) => ALIAS[s] ? { s: ALIAS[s][0], tab: ALIAS[s][1], sub: tab, id } : AREA_TABS[s] ? (AREA_TABS[s].includes(tab) ? { s, tab, id } : { s, tab: AREA_TABS[s][0], sub: tab, id }) : { s, id, tab };
const aliasOf = r => Object.keys(ALIAS).find(k => ALIAS[k][0] === r.s && ALIAS[k][1] === r.tab);
/* the cohorts that exist. "New cohort…" arrives with the new-cohort page (Phase 3) */
const COHORTS = [{ id: 'dec26', n: 'December 2026 Cohort', st: 'Active' }];
const COH = COHORTS[0];
/* D-255: the picker lists the cohorts not archived, a draft marked, then "New cohort…" (January, once created) */
const pickItems = go => [...Object.values(P3_COH).filter(c => c.id === 'dec26' || P3C === c).map(c => ({ l: c.n + (c.draft ? ' · Draft' : ''), on: c === P3C, fn: () => { P3C = c; go('cohort'); } })), '-', { l: 'New cohort…', fn: () => go('newcohort') }];
/* the program's own tile (program-logo.ts, variant "tile"), never under 32px */
const PTile = ({ s = 32 }) => <img className="tile" src={LOGO_ACCELERATOR} width={s} height={s} alt="" style={{ width: s, height: s, flex: 'none', borderRadius: Math.round(s * 0.22) }} />;

function Area({ k, t, meta, d, right, counts = {}, children }) {
  const c = useC(), tab = AREA_TABS[k].includes(c.route.tab) ? c.route.tab : AREA_TABS[k][0];
  return <div className="pg area">
    <Head t={t} meta={meta} d={d} right={right} />
    <Tabs v={tab} on={v => c.go(k, null, v)} tabs={AREAS[k].map(([id, l]) => counts[id] === undefined ? [id, l] : [id, l, counts[id]])} />
    <AreaCtx.Provider value={1}><Ctx.Provider value={{ ...c, route: { ...c.route, tab: c.route.sub, sub: undefined } }}><div className="atb" key={tab + '/' + (c.route.sub || '')}>{children(tab)}</div></Ctx.Provider></AreaCtx.Provider>
  </div>;
}
/* a tab whose page is the app's own (Course settings, D-174; Community, D-238): drawn there, not in this reference */
const OffRef = ({ what }) => <div className="cd"><Empty ic="file" t={what} b="This tab's page is the app's own and is not drawn in this reference." /></div>;
function ProgramArea() {
  // D-265 (R-5 Phase 6): Curriculum is the program's weeks (`ProgramCurriculum`) and Course Settings is drawn (`CourseSet`).
  return <Area k="program" t={<span className="row nw" style={{ gap: 10 }}><PTile />Amplified AI Accelerator</span>} meta={<Pill v="Program" tone="" />} d="What you teach. A week is built once here, and every cohort that runs it gets the same week on its own dates." counts={{ curriculum: P6_LIB.length }}>
    {tab => tab === 'settings' ? <CourseSet /> : tab === 'vault' ? <Vault /> : <ProgramCurriculum />}</Area>;
}
function CohortArea() {
  // Schedule counts the cohort's sessions; People its teams, as Learners & Teams' own Teams tab does (7). D-255: the head's status
  // word (Draft, Scheduled, Active, Finished), its shape line, Preview (the staff preview) and its menu; Open enrollment is Phase 5's.
  const { go, toast } = useC();
  const c = P3C;
  return <Area k="cohort" t={<CohortPick />} meta={<St v={c.st} />} d={p3Line(c)}
    right={<><Btn ic="eye" onClick={() => toast('Opens the staff preview of this cohort')}>Preview</Btn><Menu items={[{ l: 'New cohort…', fn: () => go('newcohort') }, { l: 'All settings', fn: () => go('cohortset') }]} /></>}
    counts={{ schedule: c.ses.length, people: 7 }}>
    {tab => tab === 'people' ? <Learners /> : tab === 'submissions' ? <OffRef what="Submissions" /> : tab === 'community' ? <OffRef what="Community" /> : tab === 'announcements' ? <Announce /> : tab === 'schedule' ? <CohortSchedule /> : tab === 'settings' ? <CohortSettings /> : <CohortOverview />}</Area>;
}
function PeopleArea() {
  // R-5 audit (D-267): Utah Life, the access group's own tab, counts its agents (the mockup's PeopleArea "utah").
  // D-268 (R-5 Phase 7): Everyone counts each person once (P7_PEOPLE), Teams the teams it lists (WS).
  return <Area k="people" t="People" d="Everyone with a sign-in, across every product. Each person is counted once, under how they got in." counts={{ everyone: P7_PEOPLE.length, teams: WS.length, utah: ULA_R2.length }}>
    {tab => tab === 'teams' ? <Workspaces /> : tab === 'utah' ? <Groups /> : tab === 'masquerade' ? <Masquerade /> : <Users />}</Area>;
}
/* ---------- R-5 audit (D-267): People › Utah Life, read-only (the mockup's `Groups`, handoff/admin-mockup/ia-screens.jsx,
   as Connor asked for it: the description, Find and the Agents table, each agent's line over their address and when they
   were last active, or "Invite pending"; a row opens the person). Its facts, cards, Export and the two access actions are
   Phase 7's. The mockup's own masked addresses. ---------- */
const ULA_R2 = [['a•••••@liveutah.com', 'Dec 10, 8:02 AM MT / 9:02 AM CT'], ['c•••@liveutah.com', 'Dec 9, 5:47 PM MT / 6:47 PM CT'], ['j••••••@liveutah.com', 'Dec 8, 11:20 AM MT / 12:20 PM CT'], ['k••••@liveutah.com', 'Invite pending'], ['m••••@liveutah.com', 'Dec 7, 2:36 PM MT / 3:36 PM CT'], ['r•••••••@liveutah.com', 'Dec 6, 9:11 AM MT / 10:11 AM CT'], ['s•••@liveutah.com', 'Dec 4, 4:05 PM MT / 5:05 PM CT'], ['t••••••@liveutah.com', 'Dec 3, 10:30 AM MT / 11:30 AM CT']];
/* ---------- D-268 (R-5 Phase 7): People. Every time is "12:00 PM MT / 1:00 PM CT" (a mock stamp is Mountain's, 2026). ---------- */
const p7At = s => Date.parse(s.replace(/ MT \/.*$/, '').replace(/^([A-Z][a-z]{2} \d{1,2}), /, '$1, 2026 ') + ' GMT-0700');
const p7Stamp = s => s.includes(' MT / ') ? s : s.split(', ')[0] + ', ' + mtCt(p7At(s));
/* how each person got in: their team's plan (the Console's label), else Utah Life; one square each, in the R2 tokens */
const P7_AUD = [['AI Accelerator', 'var(--for)'], ['Team Plan', '#2E9A63'], ['Agent Plan', '#6FD3A5'], ['Insiders', '#3B74D6'], ['Utah Life', '#9AA39E']];
const p7Plan = ws => (WS.find(w => w.n === ws) || { plan: '' }).plan.split(' · ')[0];
const p7Dot = a => (P7_AUD.find(x => x[0] === a) || [a, '#9AA39E'])[1];
const P7_PEOPLE = [...USERS.map(u => ({ ...u, a: p7Plan(u.ws) })), ...ULA_R2.map(([e, last], i) => ({ id: 'u_ul' + (i + 1), n: 'Utah Life agent', e, ws: '', role: 'Agent', last: last === 'Invite pending' ? null : last, st: last === 'Invite pending' ? 'Invited' : 'Active', a: 'Utah Life' }))];
/* Utah Life's agents beyond D-267's two columns: first sign-in and skills opened (the mockup's ULA), and its Most opened */
const P7_UL_MORE = { 'a•••••@liveutah.com': ['Nov 12', 9], 'c•••@liveutah.com': ['Nov 12', 14], 'j••••••@liveutah.com': ['Nov 12', 4], 'k••••@liveutah.com': ['Never', 0], 'm••••@liveutah.com': ['Nov 12', 6], 'r•••••••@liveutah.com': ['Nov 13', 3], 's•••@liveutah.com': ['Nov 13', 2], 't••••••@liveutah.com': ['Nov 14', 1] };
const P7_MOST = [['Appointment Follow-Up', 22], ['Repair Request Response', 19], ['Listing Description Writer', 11], ['Speed to Lead Reply', 7]];
function Groups() {
  // D-268 (R-5 Phase 7): the rest of the mockup's `Groups`: its facts, the Agents table's first sign-in and skills opened, what they
  // can open, what they open most, where they are counted, Export, and the menu's two writes (Owner and Admin, confirmed, audited).
  const { go, guard, toast, setDlg, log } = useC();
  const [q, setQ] = useState('');
  const signed = ULA_R2.filter(r => r[1] !== 'Invite pending');
  const rows = ULA_R2.filter(r => r[0].includes(q.toLowerCase()));
  const toTable = () => {};
  return <div className="pg">
    <Head t="Utah Life" meta={<Pill v="Access group" tone="" />} d="Agents with a liveutah.com address get the Agent Plan’s skills at no charge. They are counted here: not in a cohort, not as teams, and not in revenue."
      right={<><Btn ic="download" onClick={() => toast('Export started. It is in the audit log.')}>Export</Btn><Menu items={[{ l: 'Add an address outside the domain…', g: 1, fn: () => guard('account', 'Add an address', () => toast('Address added')) }, '-', { l: 'End access…', d: 1, g: 1, fn: () => guard('account', 'End Utah Life access', () => setDlg({ title: 'End Utah Life access?', body: ULA_R2.length + ' agents lose the Agent Plan’s skills right away. Their accounts stay, with nothing to open.', cta: 'End access', danger: 1, needReason: 1, yes: r => { log('access_group.end', 'Utah Life', r); toast('Access ended'); } })) }]} /></>} />
    <div className="p7f"><LFacts items={[['Agents signed in', String(signed.length), toTable], ['Active, last 30 days', String(signed.length), toTable], ['Gets', 'Agent Plan skills, free', 'course'], ['Who qualifies', 'A verified @liveutah.com address'], ['Since', 'Thu, Nov 12, 2026'], ['Ends', 'No end date']]} /></div>
    <div className="gms">
      <div className="col">
        <div className="row"><Find v={q} on={setQ} ph="Find an agent by email" /></div>
        <Table title="Agents" rows={rows} onRow={() => go('user', 'u_1042')}
          cols={[{ k: 0, l: 'Agent', w: 'minmax(200px,1.5fr)', r: r => <Two a="Utah Life agent" b={r[0]} /> }, { k: 2, l: 'First sign-in', w: '120px', ns: 1, r: r => P7_UL_MORE[r[0]][0] }, { k: 1, l: 'Last active', w: '170px', ns: 1, r: r => <Stamp v={r[1]} two /> }, { k: 3, l: 'Skills opened', w: '110px', num: 1, r: r => P7_UL_MORE[r[0]][1] }]} />
        <p className="me">Showing {rows.length} of {ULA_R2.length}.</p>
      </div>
      <div className="col">
        <Card t="What They Can Open"><div className="col m">
          <div className="row nw" style={{ gap: 10 }}><span className="mt"><I n="check" /></span><span className="col" style={{ gap: 0 }}><span className="w5">The Agent Plan’s skills</span><span className="me">Every agent skill, and each new one as it is released</span></span></div>
          <div className="row nw" style={{ gap: 10 }}><span className="mt off"><I n="lock" /></span><span className="col" style={{ gap: 0 }}><span className="w5">Not the Accelerator, not team skills</span><span className="me">A locked skill says “Not included with Utah Life access”</span></span></div>
          <button className="lk a" style={{ alignSelf: 'flex-start' }} onClick={() => go('course')}>Change that line in Words</button></div></Card>
        <Card t="Most Opened" sub="Last 30 days"><div className="col m">{P7_MOST.map(x => <div key={x[0]} className="rdy" style={{ cursor: 'default' }}><span className="el" style={{ flex: '0 0 176px' }}>{x[0]}</span><Bar v={x[1]} max={P7_MOST[0][1]} v2={0} /><span className="tn w5 rdn" style={{ minWidth: 24 }}>{x[1]}</span></div>)}</div></Card>
        <Card t="Where They Are Counted"><div className="kvs"><KV rows={[['A cohort', 'Never. They are not in one.'], ['Teams', 'Never. Each is one person.'], ['Revenue', 'Never. The access is free.']]} /></div></Card>
      </div>
    </div>
  </div>;
}
/* ---------- D-269 (R-5 Phase 8): Revenue › Summary ----------
   Ported from handoff/admin-mockup/ia-screens.jsx (`Revenue`) on this reference's own data: its "now" (Thu, Dec 10), its
   teams (`WS`), December at its capacity (`P3_COH.dec26.cap`) and January created as a draft (a By Product row, no card:
   it is neither selling nor running). Each figure is the app's rule: Cash collected is Stripe's paid invoices and the
   skills, less refunds, in the period; Still to collect the two-payment seats' remaining payments, dated by Stripe; the
   chart six months, the three before this one and the two after, this month collected under what is on its calendar; By
   Product one row per cohort and per billing line, then Skills; Coming in the next 60 days; a card per cohort that is
   selling or running. Its times are days, so none names a zone. On a phone the chart's figures are shortened ("$45K")
   to keep the 16px floor, where the mockup set them at 11px. */
const RV_FAILED = 3;
const RV_PER = {
  'All time': { c: '$82,694', cs: 'Since Aug 2026', t: '$90,194' },
  'This month': { c: '$8,160', cs: 'Dec 1 to Dec 10', t: '$15,660' },
};
// [month, collected, on the calendar]: December is this month, both.
const RV_MONTHS = [['Sep', 9917, 0], ['Oct', 12137, 0], ['Nov', 45000, 0], ['Dec', 8160, 9645], ['Jan', 0, 1495], ['Feb', 0, 1997]];
const RV_NOW = 'Dec';
// [product, its line, collected (all time, this month), still to collect, MRR, where it opens]. A function: the cohorts are
// defined further down.
const rvProd = () => [
  ['AI Accelerator', 'December 2026 · 7 of ' + P3_COH.dec26.cap + ' seats', ['$45,000', '$0'], '$7,500', 'One-time', 'dec26'],
  ['AI Accelerator', 'January 2027 · 0 of ' + P3_COH.jan27.cap + ' seats', ['$0', '$0'], '$0', 'One-time', 'jan27'],
  ['Team Plan · 16 seats', '5 teams · 27 people', ['$10,425', '$2,780'], '$0', '$3,475', 'subs'],
  ['Team Plan · 41 seats', '2 teams · 12 people', ['$8,970', '$1,495'], '$0', '$2,990', 'subs'],
  ['Agent Plan', '46 agents', ['$16,146', '$3,483'], '$0', '$5,382', 'subs'],
  ['Insiders', '6 members', ['$1,746', '$291'], '$0', '$582', 'subs'],
  ['Insiders for Agents', '0 members', ['$0', '$0'], '$0', '$0', 'subs'],
  ['Skills', '11 bought', ['$407', '$111'], '$0', 'One-time', 'invoices'],
];
const RV_SKILLS_MONTH = '3 bought';
const RV_NEXT = [
  ['Fri, Dec 11', 'Tidewater Property Co.', 'Insiders, second try', '$97', 'Retrying', 'ws_tidewater'],
  ['Tue, Dec 15', 'Hale & Marlowe Realty', 'Team Plan renewal', '$695', 'Scheduled', 'ws_halemarlowe'],
  ['Sun, Dec 20', 'Red Cliff Collective', 'Agent Plan renewal', '$1,450', 'Scheduled', 'ws_redcliff'],
  ['Wed, Dec 30', 'Copper Basin Realty', 'Accelerator, payment 2 of 2', '$3,750', 'Scheduled', 'ws_copperbasin'],
  ['Wed, Dec 30', 'Lantern Street Partners', 'Accelerator, payment 2 of 2', '$3,750', 'Scheduled', 'ws_lantern'],
  ['Mon, Jan 4', 'Northshore Group', 'Team Plan renewal', '$1,495', 'Scheduled', 'ws_northshore'],
];
const rvShort = n => n >= 10000 ? '$' + Math.round(n / 1000) + 'K' : n >= 1000 ? '$' + (Math.round(n / 100) / 10) + 'K' : '$' + n;
function Revenue() {
  const { go, ph } = useC();
  const [per, setPer] = useState('All time');
  const r = RV_PER[per], m0 = per === 'All time' ? 0 : 1, max = Math.max(...RV_MONTHS.map(m => m[1] + m[2]));
  const usd = n => '$' + n.toLocaleString('en-US');
  const h = v => Math.max(4, (v / max) * 100) + '%';
  const to = id => document.getElementById(id) && document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
  const legend = <><span className="lg"><i style={{ background: 'var(--for)' }} />Collected</span><span className="lg"><i className="hat" />On the calendar</span></>;
  const n = s => +s.slice(1).replace(/,/g, '');
  const prod = rvProd().map(p => [p[0], p[0] === 'Skills' && m0 ? RV_SKILLS_MONTH : p[1], p[2][m0], p[3], usd(n(p[2][m0]) + n(p[3])), p[4], p[5]]);
  return <div className="pg">
    <Head t="Revenue" right={<Sel label="Period" v={per} on={setPer} opts={['All time', 'This month']} />} />
    <div className="g5">
      <Stat l="Cash collected" v={r.c} sub={r.cs} go={() => go('payments', null, 'invoices')} />
      <Stat l="Still to collect" v="$7,500" sub={ph ? '2 payments · Dec 30' : '2 payments · Wed, Dec 30'} tone="info" go={() => to('rv-next')} />
      <Stat l="Total revenue" v={r.t} sub="Collected + still to collect" go={() => to('rv-prod')} />
      <Stat l="MRR" v="$12,429" sub="59 subscriptions" tone="ok" go={() => go('payments', null, 'subs')} />
      <Stat l="Failed payments" v={String(RV_FAILED)} sub="Needs review" tone="bad" go={() => go('payments', null, 'failed')} />
    </div>
    <div className="gms">
      <Card t="Cash By Month" sub="Collected, and what Stripe already has on the calendar" right={!ph && <span className="row" style={{ gap: 12 }}>{legend}</span>}>
        <div className="rvc" role="img" aria-label="Cash collected by month from September to December, and what is scheduled for December to February.">{RV_MONTHS.map(m => <div key={m[0]} className="rvm"><span className="tn me">{ph ? rvShort(m[1] + m[2]) : usd(m[1] + m[2])}</span><span className="rvb">{m[2] ? <i className="hat" style={{ height: h(m[2]) }} /> : null}{m[1] || !m[2] ? <i style={{ height: h(m[1]) }} /> : null}</span><span className={'w5' + (m[0] === RV_NOW ? '' : ' mu')}>{m[0]}</span></div>)}</div>
        {ph && <div className="row" style={{ gap: 12, marginTop: 12 }}>{legend}</div>}
        <p className="me" style={{ marginTop: 12 }}>December counts two second payments ($7,500) and this month’s renewals. It is not a forecast of new sales.</p>
      </Card>
      <div className="col">
        <Card t="AI Accelerator" sub={P3_COH.dec26.n} right={<Btn onClick={() => { P3C = P3_COH.dec26; go('learners'); }}>People</Btn>}><div className="col m">
          <button className="rdy rvs" onClick={() => { P3C = P3_COH.dec26; go('cohortset'); }}><span style={{ flex: '0 0 96px' }}>Seats sold</span><Bar v={7} max={P3_COH.dec26.cap} fx /><span className="tn w5 rdn">7 of {P3_COH.dec26.cap}</span></button>
          <div className="kvs"><KV rows={[['Paid in full', '5 teams · $37,500'], ['On two payments', '2 teams · $7,500 in, $7,500 to come'], ['Refunds', 'None']]} /></div></div></Card>
        <Card t="Refunds" sub="Last 30 days" right={<Btn onClick={() => go('payments', null, 'refunds')}>Open</Btn>}><span className="fig">$0</span><p className="me">None</p></Card>
      </div>
    </div>
    <div id="rv-prod"><Table title="By Product" rows={prod} onRow={p => { if (p[0] === 'AI Accelerator') { P3C = P3_COH[p[6]]; go('learners'); } else go('payments', null, p[6]); }}
      cols={[{ k: 0, l: 'Product', w: 'minmax(160px,1.4fr)', r: p => <Two a={p[0]} b={p[1]} /> }, { k: 2, l: 'Collected', w: '110px', num: 1 }, { k: 3, l: 'Still to collect', w: '120px', num: 1, hide: 'lap' }, { k: 4, l: 'Total', w: '110px', num: 1, r: p => <span className="w5">{p[4]}</span> }, { k: 5, l: 'MRR', w: '100px', num: 1 }]} /></div>
    <div id="rv-next"><Table title="Coming In" right={<span className="me">Next 60 days · $11,237</span>} rows={RV_NEXT} onRow={p => go('workspace', p[5])}
      cols={[{ k: 0, l: 'When', w: '120px', ns: 1 }, { k: 1, l: 'From', w: 'minmax(180px,1.3fr)', r: p => <span className="w5 el" style={{ display: 'block' }}>{p[1]}</span> }, { k: 2, l: 'For', w: 'minmax(190px,1.3fr)', hide: 'lap' }, { k: 3, l: 'Amount', w: '96px', num: 1 }, { k: 4, l: 'Status', w: '112px', r: p => <St v={p[4]} /> }]} /></div>
  </div>;
}
function RevenueArea() {
  // Plans & upgrades counts the upgrade requests waiting (Tiers & Upgrades' own "2"). D-269: Summary is the mockup's Revenue.
  return <Area k="revenue" t="Revenue" d="What has come in, what is still owed on a payment plan, and what repeats every month. Every figure is from Stripe and opens the payments behind it." counts={{ plans: 2 }}>
    {tab => tab === 'payments' ? <Billing /> : tab === 'plans' ? <Tiers /> : tab === 'usage' ? <Usage /> : <Revenue />}</Area>;
}

/* ---------- D-255 (R-5 Phase 3): the Cohort page's Overview, Schedule and Settings, and New cohort ----------
   Ported from handoff/admin-mockup/p3-cohort.jsx and p3-model.jsx, with PLAN.md § 10's words: Title Case headings, one
   line of times in MT and CT ("12:00 PM MT / 1:00 PM CT"), no dashes, December's words copied to a new cohort and flagged
   "Read them once", "Before it opens" as Open enrollment's refusals in order, no price (Phase 5). The data is this
   reference's December (six Wednesday builds) and the program's weeks (P3_WEEKS); January is laid out by New cohort's own
   rule (`p3Plan`, the app's `layOut`) from Connor's example. */
const P3_WEEKS = [
  { id: 'accelerator-week-0', n: 0, t: 'Foundations', o: 'The office is ready for its first hire.', steps: 8 },
  { id: 'accelerator-week-1', n: 1, t: 'Where the Money Goes', o: 'A year of spend on one standard chart.', steps: 7 },
  { id: 'accelerator-week-2', n: 2, t: 'Leads That Pay', o: 'Every lead source ranked by what it returns.', steps: 7 },
  { id: 'accelerator-week-3', n: 3, t: 'Numbers on the 5th', o: 'A monthly report that builds itself.', steps: 6 },
  { id: 'accelerator-week-4', n: 4, t: 'Protect the Pipeline', o: 'No file goes quiet without someone knowing.', steps: 5 },
  { id: 'accelerator-week-5', n: 5, t: 'Coach from Evidence', o: 'One-on-ones that start from the numbers.', steps: 4 },
  { id: 'accelerator-week-6', n: 6, t: 'Delegate an Outcome', o: 'A hire that owns a result, not a task.', steps: 3 },
  { id: 'accelerator-week-7', n: 7, t: 'Make the Workflow Repeatable', o: 'What worked, written down so it runs again.', steps: 2 },
  { id: 'accelerator-week-8', n: 8, t: 'Sustain and Expand', o: 'The next three hires, in order.', steps: 2 },
];
const P3_BUILD = P3_WEEKS.filter(w => w.n > 0);
/* December's words, as its course holds them (this reference's sample) */
const DEC_WORDS = { promise: 'Nine weeks. One hire a week. Built live, on your own numbers.', how: ['A week opens on Sunday.', 'We build its hire together on Wednesday.', 'You run it on your own data and turn in what it made.', 'Office hours are Thursday.'], holiday: 'No sessions the weeks of Dec 21 and Dec 28. Week 4 opens Sun, Jan 3.' };
/* time in Mountain, with Central after it: the app's fmt.mtDay, fmt.mtCt */
const MTZ = 'America/Denver', CTZ = 'America/Chicago';
const tOf = (t, z) => new Date(t).toLocaleTimeString('en-US', { timeZone: z, hour: 'numeric', minute: '2-digit' });
const dIn = (t, z, o) => new Date(t).toLocaleDateString('en-US', { timeZone: z, ...o });
const mtDay = t => dIn(t, MTZ, { weekday: 'short', month: 'short', day: 'numeric' });
const mtDate = t => dIn(t, MTZ, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const mtCt = t => tOf(t, MTZ) + ' MT / ' + (dIn(t, MTZ, { day: 'numeric' }) === dIn(t, CTZ, { day: 'numeric' }) ? '' : dIn(t, CTZ, { weekday: 'short', month: 'short', day: 'numeric' }) + ', ') + tOf(t, CTZ) + ' CT';
/* an instant from a date and time typed in Mountain time (winter here: UTC-7; the app's zonedInstant) */
const zAt = (date, time) => Date.parse(date + 'T' + time + ':00-07:00');
const dayAdd = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const P3_KIND = { live_build: 'Live build', office_hours: 'Office hours', other: 'Working session' };
const P3_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const P3_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const lenOf = m => { const h = Math.floor(m / 60), r = m % 60; return h ? h + ' hr' + (r ? ' ' + r + ' min' : '') : r + ' min'; };
/* lay a shape out (the app's layOut, the mockup's planOf): Week 1 opens on `start` at noon, each week seven days later,
   the setup week seven days before; one session per slot on the first matching weekday on or after its opening */
function p3Plan({ start, setup, picks, slots }) {
  const weeks = [], ses = [];
  const setupOpens = setup ? zAt(dayAdd(start, -7), '12:00') : null;
  if (setup) weeks.push({ ...P3_WEEKS[0], n: 0, opens: null, ses: [] });
  P3_BUILD.filter(w => picks.includes(w.id)).forEach((w, i) => {
    const opens = dayAdd(start, 7 * i);
    const wd = new Date(opens + 'T00:00:00Z').getUTCDay();
    const mine = slots.map(sl => ({ week: w, n: i + 1, kind: sl.kind, mins: sl.mins, title: w.t + ' · ' + P3_KIND[sl.kind], start: zAt(dayAdd(opens, (sl.day - wd + 7) % 7), sl.time) }));
    weeks.push({ ...w, n: i + 1, opens: zAt(opens, '12:00'), ses: mine });
    ses.push(...mine);
  });
  ses.sort((a, b) => a.start - b.start);
  return { weeks, ses, setupOpens };
}
const JAN_SLOTS = [{ day: 2, time: '12:00', kind: 'live_build', mins: 90 }, { day: 4, time: '12:00', kind: 'office_hours', mins: 60 }];
/* R-5 Phase 5 (D-262): what each cohort sells through (Settings › Enrollment, PLAN.md § 10.5's "Sells through"). The price
   is Stripe's, under the cohort's lookup keys (Q-30): December's $7,500 in full, or $3,750 a month twice; January has
   nothing entered yet. Founding closes Mon, Nov 30, 11:59 PM MT for December; January's close is its own (Q-34). */
const FOUND_DEC = Date.parse('2026-11-30T23:59:00-07:00');
const DEC_SELLS = { enroll: true, price: '$7,500', two: 'Offered. $3,750 at checkout and $3,750 one month later.', founding: 'Yes, until ' + mtDay(FOUND_DEC) + ' · ' + mtCt(FOUND_DEC), links: '2 of 2 entered', ghl: 'dec26', keys: { full: 'cohort_founding_full', rollover: 'membership_monthly_team_leader', two: 'cohort_founding_two_pay' } };
const JAN_SELLS = { enroll: false, price: null, two: 'Offered. Set its price to see Stripe’s schedule.', founding: 'Yes. No close is set.', links: null, ghl: 'jan27', keys: { full: '', rollover: '', two: '' } };
const JAN_PLAN = p3Plan({ start: '2027-01-03', setup: true, picks: P3_BUILD.slice(0, 6).map(w => w.id), slots: JAN_SLOTS });
/* December, as this reference has it: six Wednesday builds, no course weeks of its own */
const DEC_SES = COHORT_SESSIONS.map((s, i) => ({ title: s[0].replace(/^Session \d+ · /, ''), kind: null, week: null, start: zAt(['2026-12-02', '2026-12-09', '2026-12-16', '2026-12-23', '2026-12-30', '2027-01-06'][i], '12:00'), mins: 60, zoom: i < 4 }));
const P3_COH = {
  dec26: { id: 'dec26', n: 'December 2026 Cohort', name: 'December 2026', st: 'Active', draft: false, weeks: [], ses: DEC_SES, slots: [], setup: false, opens: null, preview: null, words: DEC_WORDS, unread: false, hosts: 'Connor Leiva', included: null, cap: 200, w1: null, ...DEC_SELLS },
  jan27: { id: 'jan27', n: 'January 2027 Cohort', st: 'Draft', draft: true, weeks: JAN_PLAN.weeks, ses: JAN_PLAN.ses.map(s => ({ ...s, zoom: false })), slots: JAN_SLOTS, setup: true, opens: JAN_PLAN.setupOpens, preview: JAN_PLAN.setupOpens, words: DEC_WORDS, unread: true, hosts: 'Connor Leiva and Spring', included: '2027-05-10', cap: 200, w1: JAN_PLAN.weeks[1].opens, ...JAN_SELLS },
};
let P3C = P3_COH.dec26;
const NOW_P3 = Date.parse('2026-12-10T16:30:00Z');
const p3Shape = c => c.weeks.filter(w => w.n > 0).length;
const p3Meets = sl => !sl.length ? 'Self-paced' : sl.length === 1 ? 'once a week' : sl.length === 2 ? 'twice a week' : sl.length + ' times a week';
const p3Rhythm = sl => { const p = [...sl].sort((a, b) => a.day - b.day).map(s => P3_DOW[s.day] + ' ' + P3_KIND[s.kind].toLowerCase()); return p.length <= 1 ? (p[0] || 'Self-paced') : p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1]; };
/* R-5 audit (D-267, Connor): where a cohort is in its run (the app's cohortProgress): before Week 1 opens, the setup week's
   opening and Week 1's; then "Week N of M". Null for a cohort whose run holds no Week 1 (this reference's December). */
const p3Progress = c => { if (!c.w1) return null; const b = c.weeks.filter(w => w.n > 0); if (NOW_P3 < c.w1) return { before: true, setup: c.setup ? c.opens : null, w1: c.w1 }; return { before: false, n: Math.max(1, ...b.filter(w => w.opens !== null && w.opens <= NOW_P3).map(w => w.n)), of: b.length }; };
const p3ProgressLine = p => !p.before ? 'Week ' + p.n + ' of ' + p.of : (p.setup ? 'Week 0 ' + (p.setup <= NOW_P3 ? 'opened ' : 'opens ') + mtDay(p.setup) + ' · ' : '') + 'Week 1 opens ' + mtDay(p.w1);
const p3Line = c => { const p = p3Progress(c); return ['Amplified AI Accelerator', p3Shape(c) ? p3Shape(c) + ' weeks of building · ' + p3Meets(c.slots) : null, p ? p3ProgressLine(p) : null].filter(Boolean).join(' · '); };
const includedLine = d => mtDate(zAt(d, '12:00'));
/* the same-time sessions: one of this cohort's at the instant of another cohort's (none here: December meets Wednesdays) */
const p3Clash = c => c.ses.filter(s => Object.values(P3_COH).some(o => o !== c && o.ses.some(x => x.start === s.start)));
/* Before it opens: Open enrollment's refusals, in its order (the app's beforeItOpens) */
function p3Before(c) {
  const b = c.weeks.filter(w => w.n > 0), clash = p3Clash(c).length, zoom = c.ses.filter(s => s.zoom).length;
  const L = [
    ['Shape', p3Shape(c) + ' weeks of building · ' + p3Meets(c.slots) + (c.setup ? ', after a setup week' : ''), true, 'cohortset'],
    ['Its weeks', b.length + ' of ' + b.length + ' are published', b.length > 0, 'curriculum'],
    ['Sessions', c.ses.length + ' on the calendar' + (clash ? '. ' + clash + ' are at the same time as December’s office hours.' : ''), c.ses.length > 0 && !clash, 'cohorts'],
    ['Zoom links', zoom + ' of ' + c.ses.length + ' sessions have one', c.ses.length > 0 && zoom === c.ses.length, 'cohorts'],
    ['Week 0 due date', 'Not set', false, 'cohortset'],
    ['Stripe price found for each lookup key', 'None yet. Prices and Payment Links are made in Stripe.', false, 'cohortset'],
    ['Payment Links entered', 'None yet', false, 'cohortset'],
    ['Included time ends', c.included ? includedLine(c.included) : 'Not set', !!c.included, 'cohortset'],
    ['Words learners see', c.unread ? 'Copied from December: the promise, how it works and the holiday note. Read them once.' : 'The promise, how it works and the holiday note', !c.unread, 'cohortset'],
    ['Test emails sent', 'Not yet: the welcome and Week 0 Is Open', false, 'flags'],
    ['Open enrollment', 'Off. Turn it on when the rest is done.', false, 'cohortset'],
  ];
  return L;
}
/* Open enrollment's refusal: the first line of Before It Opens that is not done (the app's `openEnrollmentRefusal`) */
const p3Refusal = c => { const t = p3Before(c).find(l => !l[2] && l[0] !== 'Open enrollment'); return t ? t[0] + ': ' + t[1] : null; };
/* a fact that opens what it counts (`.fx>.fxl`) */
const LFacts = ({ items }) => { const { go, ph } = useC(); return <div className="cd fx">{items.map(([k, v, to, short]) => to ? <button key={k} className="fxl" onClick={() => typeof to === 'function' ? to() : go(to)}><span className="me">{k}</span><span className="w5 el">{ph && short ? short : v}</span><I n="chev" s={12} w={2.2} /></button> : <div key={k}><span className="me">{k}</span><span className="w5 el">{v}</span></div>)}</div>; };
const Wn = ({ n, sm, pk }) => <span className={'wn' + (sm ? ' sm' : '') + (pk ? ' pk' : '')}>{n}</span>;

function CohortOverview() {
  const { go } = useC();
  const c = P3C, next = c.ses.find(s => s.start + s.mins * 6e4 > NOW_P3), pr = p3Progress(c);
  const todo = c.draft ? p3Before(c) : null, done = todo ? todo.filter(t => t[2]).length : 0;
  const runCur = [...c.weeks].reverse().find(w => w.opens !== null && w.opens <= NOW_P3);
  const coming = c.ses.filter(s => s.start + s.mins * 6e4 > NOW_P3).slice(0, 3);
  const noZoom = c.ses.filter(s => !s.zoom && s.start > NOW_P3);
  const need = c.draft ? null : [c.waiting ? ['community', c.waiting + ' threads are waiting on you', 'The last word in each is a member’s.', 'warn'] : null, noZoom.length ? ['cohorts', noZoom.length + ' sessions have no Zoom link', 'The next one without a link is ' + mtDay(noZoom[0].start) + '.', 'warn'] : null, c.second ? ['billing', c.second.n + ' second payments are on the calendar', c.second.each + ' each, on ' + mtDay(c.second.at) + '.', ''] : null].filter(Boolean);
  return <div className="col">
    <LFacts items={[pr && !pr.before ? ['Week', pr.n + ' of ' + pr.of, 'cohortset'] : ['Opens', pr ? mtDay(pr.w1) + ' · ' + mtCt(pr.w1) : 'Not set', 'cohortset', pr ? mtDay(pr.w1) : 'Not set'], ['Shape', p3Shape(c) + ' weeks · ' + p3Meets(c.slots), 'cohortset'], ['Teams', '0 of ' + c.cap + ' seats', 'cohortset'], ['Learners', '0', 'learners'], ['Next session', next ? mtDay(next.start) : 'None yet', 'cohorts']]} />
    <div className="gms">
      <div className="col">
        {todo ? <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Before It Opens</h2><span className="me">{done} of {todo.length} done</span></div>{todo.length - done > 0 ? <span className="pl warn">{todo.length - done} left</span> : <span className="pl ok">Ready</span>}</div>
          <div className="wkl">{todo.map(t => <button key={t[0]} className={'nyr tdo' + (t[2] ? ' ok' : '')} onClick={() => go(t[3])}><span className="tdc">{t[2] && <I n="check" s={12} w={2.6} />}</span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{t[0]}</span><span className="me">{t[1]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div></section>
          : need.length > 0 && <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Needs You</h2><span className="me">Before the next live build</span></div><span className="pl warn">{need.length}</span></div>
            <div className="wkl">{need.map(n => <button key={n[1]} className="nyr" onClick={() => go(n[0])}><span className={'mt ' + n[3]}><I n={n[0]} /></span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{n[1]}</span><span className="me">{n[2]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div></section>}
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>The Run</h2><span className="me">The weeks this cohort takes, when each opens, and when you meet</span></div><Btn>Change weeks</Btn></div>
          <div className="wkl">{c.weeks.map((w, i) => { const now = runCur ? runCur === w : i === 0; const opens = w.opens !== null ? mtDay(w.opens) : w.n === 0 && c.preview ? mtDay(c.preview) : 'with the course';
            return <button key={w.id} className={'nyr rn' + (now ? ' now' : '')} onClick={() => go('builder')}><Wn n={w.n} /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{w.t}</span><span className="me el">{'Opens ' + opens + (w.ses.length ? ' · ' + (c.draft ? 'Meets ' : 'Live build ') + w.ses.map(s => mtDay(s.start)).join(' and ') : ' · Self-paced')}</span></span>{now ? <span className="pl ok">{runCur ? 'This week' : 'Opens first'}</span> : <span className="me">Published</span>}<I n="chev" s={12} w={2.2} /></button>; })}</div></section>
      </div>
      <div className="col">
        <Card t="Seats" right={<Btn onClick={() => go('learners')}>People</Btn>}><div className="col m"><button className="rdy" onClick={() => go('cohortset')}><span style={{ flex: '0 0 96px' }}>Seats taken</span><Bar v={0} max={c.cap} /><span className="tn w5 rdn">0 of {c.cap}</span></button><p className="me">{c.draft ? 'No one yet. Enrollment is closed.' : 'Enrollment is open. A team that buys a seat lands here.'}</p></div></Card>
        <Card t="Coming Up" right={<Btn onClick={() => go('cohorts')}>Schedule</Btn>}><div className="col m">{coming.length ? coming.map((s, i) => { const [dow, mon, dd] = mtDay(s.start).replace(',', '').split(' ');
          return <button key={i} className="rnw" onClick={() => go('cohorts')}><span className="dt"><b>{dd}</b><span>{mon}</span></span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{s.title}</span><span className="me">{dow + ' · ' + mtCt(s.start)}</span></span>{p3Clash(c).includes(s) ? <span className="pl warn">Same time</span> : !s.zoom && <span className="pl warn">No link</span>}</button>; }) : <p className="s2">No sessions yet.</p>}</div></Card>
        <Card t="This Cohort’s Shape" right={<Btn onClick={() => go('cohortset')}>Settings</Btn>}><div className="kvs"><KV rows={[['Promise', c.words.promise], ['Meets', p3Rhythm(c.slots)], ['Seats', <button className="lk" onClick={() => go('cohortset')}>{c.cap} teams</button>], ['Price', c.price ? c.price + ', or two payments' : <span className="pl warn">Not set</span>]]} /></div></Card>
      </div>
    </div>
  </div>;
}

/* ---------- Cohort › Schedule: every session, in one place (Delete turned-in files moved to Settings › Clean-Up) ---------- */
function CohortSchedule() {
  const { go, toast } = useC();
  const c = P3C, [f, setF] = useState('All sessions');
  const clash = p3Clash(c), noZoom = c.ses.filter(s => !s.zoom).length, first = c.ses.find(s => s.start + s.mins * 6e4 > NOW_P3);
  const rows = c.ses.filter(s => f === 'All sessions' || (f === 'Without a Zoom link' ? !s.zoom : f === 'Same time as another cohort' ? clash.includes(s) : f === 'Live builds' ? s.kind === 'live_build' : s.kind === 'office_hours'));
  return <div className="col">
    <LFacts items={[['On the calendar', c.ses.length + ' of ' + p3Shape(c) * c.slots.length + ' sessions', () => setF('All sessions')], ['Rhythm', p3Rhythm(c.slots), 'cohortset'], ['Without a Zoom link', String(noZoom), () => setF('Without a Zoom link')], clash.length ? ['Same time as another cohort', String(clash.length), () => setF('Same time as another cohort')] : ['Next', first ? mtDay(first.start) + ' · ' + mtCt(first.start) : 'None yet']]} />
    <div className="row"><Sel label="Kind" v={f} on={setF} opts={['All sessions', 'Live builds', 'Office hours', 'Without a Zoom link', ...(clash.length ? ['Same time as another cohort'] : [])]} /><span className="sp" /><GBtn k="p" ic="plus" perm="build" label="Add session" go={() => toast('Session editor opens here')}>Add session</GBtn></div>
    <Table rows={rows} onRow={() => toast('Session editor opens here')} empty={{ ic: 'cohorts', t: 'No sessions match', b: 'Try another filter.' }}
      cols={[{ k: 'title', l: 'Session', w: 'minmax(240px,1.6fr)', r: s => <Two a={s.title} b={s.kind ? P3_KIND[s.kind] : 'Session'} /> }, { k: 'start', l: 'When', w: '230px', ns: 1, r: s => <Two a={mtDay(s.start)} b={mtCt(s.start)} /> },
        { k: 'week', l: 'Week', w: 'minmax(200px,1.2fr)', hide: 'lap', r: s => s.week ? <button className="lk el" onClick={e => { e.stopPropagation(); go('builder'); }}>{'Week ' + s.n + ' · ' + s.week.t}</button> : <span className="mu">None</span> },
        { k: 'zoom', l: 'Zoom link', w: '160px', r: s => s.zoom ? <St v="Ready" /> : <St v="No link yet" tone="warn" /> }, { k: 'inv', l: 'Reminder', w: '112px', r: s => !s.zoom ? <St v="Draft" tone="off" /> : NOW_P3 >= s.start - 864e5 ? <St v="Sent" /> : <St v="Scheduled" tone="info" /> }]}
      menu={() => [{ l: 'Edit session', g: 1, fn: () => toast('Session editor opens here') }, { l: 'Open the week', fn: () => go('builder') }, { l: 'Attach replay', g: 1, fn: () => toast('Replay picker opens here') }, '-', { l: 'Delete session', fn: () => toast('Deleted') }]} />
    <p className="me">Sessions are edited here and nowhere else. A week shows its sessions but doesn’t change them. Times are Mountain, with Central after each for what learners see.</p>
  </div>;
}

/* the shape's fields (`ShapeFields`), the week picker (`WeekPick`) and the calendar a shape makes (`PlanList`) */
const P3_SEL = { day: [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday']], time: [['09:00', '9:00 AM'], ['10:00', '10:00 AM'], ['11:00', '11:00 AM'], ['12:00', '12:00 PM'], ['13:00', '1:00 PM'], ['14:00', '2:00 PM'], ['15:00', '3:00 PM']], kind: [['live_build', 'Live build'], ['office_hours', 'Office hours'], ['other', 'Working session']] };
const VSel = ({ v, on, opts, label, off }) => <select className="in" aria-label={label} disabled={off} value={v} onChange={e => on(e.target.value)}>{opts.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>;
function ShapeFields({ f, up, off }) {
  const slot = (i, p) => up({ slots: f.slots.map((s, j) => j === i ? { ...s, ...p } : s) });
  return <div className="col">
    <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
      <div className="lab"><span>Weeks of building</span><span className="stp2"><button type="button" aria-label="One week fewer" disabled={off || f.picks.length <= 1}>−</button><b className="tn">{f.picks.length}</b><button type="button" aria-label="One week more" disabled={off || f.picks.length >= P3_BUILD.length}>+</button></span></div>
      <div className="lab"><span>You meet</span>{off ? <span className="s2">{f.slots.length === 1 ? 'Once a week' : f.slots.length === 2 ? 'Twice a week' : f.slots.length + ' times'}</span> : <span className="sgm" role="group" aria-label="You meet">{[[1, 'Once a week'], [2, 'Twice a week'], [3, 'Three times']].map(o => <button key={o[0]} type="button" className={f.slots.length === o[0] ? 'on' : ''} aria-pressed={f.slots.length === o[0]}>{o[1]}</button>)}</span>}</div>
    </div>
    <div className="lab"><span>When</span><span className="fat">Mountain time. Learners see Central, one hour later.</span>
      <div className="lns">{f.slots.map((s, i) => <div key={i} className="slt"><VSel label={'Day ' + (i + 1)} off={off} v={s.day} on={v => slot(i, { day: +v })} opts={P3_SEL.day} /><VSel label={'Time ' + (i + 1)} off={off} v={s.time} on={v => slot(i, { time: v })} opts={P3_SEL.time} /><VSel label={'Kind ' + (i + 1)} off={off} v={s.kind} on={v => slot(i, { kind: v })} opts={P3_SEL.kind} /></div>)}</div></div>
    <label className="ckr"><input type="checkbox" checked={f.setup} disabled={off} onChange={e => up({ setup: e.target.checked })} /><span className="col" style={{ gap: 0 }}><span className="w5">Start with a setup week</span><span className="me">Week 0, self-paced, opens a week before Week 1. Teams fill in their intake and get their AI ready.</span></span></label>
  </div>;
}
function WeekPick({ picks, on }) {
  return <div className="wpl">{P3_BUILD.map(w => { const i = picks.indexOf(w.id), onn = i >= 0;
    return <label key={w.id} className={'wpk' + (onn ? ' on' : '')}><input type="checkbox" checked={onn} disabled={onn && picks.length === 1} onChange={() => on(P3_BUILD.map(x => x.id).filter(id => id === w.id ? !onn : picks.includes(id)))} />
      <Wn n={onn ? i + 1 : '·'} sm pk={onn} /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{w.t}</span><span className="me el">{w.o}</span></span><span className="pl ok">Published</span></label>; })}</div>;
}
function PlanList({ plan, free }) {
  return <div className={'ncl' + (free ? ' free' : '')}>{plan.weeks.map(w => { const o = w.opens !== null ? w.opens : plan.setupOpens;
    return <div key={w.id} className="ncw"><Wn n={w.n} sm pk /><span className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}><span className="w5 el">{w.t}</span><span className="me">{o !== null ? 'Opens ' + mtDay(o) : 'Opens with the course'}</span>
      <span className="row" style={{ gap: 6 }}>{w.ses.length ? w.ses.map((s, i) => <span key={i} className={'skc' + (s.kind === 'live_build' ? '' : ' alt')}>{mtDay(s.start).replace(',', '') + ' · ' + mtCt(s.start).replace(/:00/g, '') + ' · ' + P3_KIND[s.kind]}</span>) : <span className="skc off">Self-paced</span>}</span></span></div>; })}</div>;
}

/* ---------- Cohort › Settings: its shape, its dates, its seats, its words, its clean-up ---------- */
function CohortSettings() {
  const { go, toast, setDlg } = useC();
  const c = P3C, [dlg, setD] = useState(null);
  const rows = [['Length', p3Shape(c) + ' weeks of building' + (c.setup ? ', after a setup week' : '')], ...c.slots.map((s, i) => [i ? 'And' : 'Meets', P3_DAYS[s.day] + ' · ' + mtCt(zAt('2027-01-05', s.time)) + ' · ' + P3_KIND[s.kind] + ' · ' + lenOf(s.mins)])];
  const later = c.weeks.filter(w => w.n >= 2 && w.opens !== null);
  const setup = c.weeks.find(w => w.n === 0);
  return <div className="col">
    <div className="set2">
      <div className="col">
        <Card t="Shape" sub="How long it runs and how often you meet" right={<Btn onClick={() => setD('shape')}>Edit</Btn>}>
          <div className="kvs"><KV rows={[...rows, ['Its weeks', <button className="lk" onClick={() => setD('weeks')}>{p3Shape(c)} of the program’s {P3_BUILD.length}</button>], ['Hosts', c.hosts]]} /></div>
          <p className="me" style={{ marginTop: 12 }}>{c.draft ? 'Change the shape and the sessions that haven’t happened are laid out again. Past sessions keep their dates.' : 'This cohort’s shape is read from its own sessions. Only its hosts change here.'}</p></Card>
        <Card t="Dates and Release" right={<Btn onClick={() => setD('dates')}>Edit</Btn>}><div className="kvs"><KV rows={[
          ['Week 1 opens', c.w1 ? mtDay(c.w1) + ' · ' + mtCt(c.w1) : 'Not set'],
          ...(later.length ? [['A week opens', 'Every ' + P3_DAYS[new Date(later[0].opens).getUTCDay()] + ' · ' + mtCt(later[0].opens)]] : []),
          [setup ? 'Setup week opens' : 'Preview opens', c.preview ? mtDay(c.preview) + ' · ' + mtCt(c.preview) : 'Not set'],
          ...(setup ? [['Week 0 is due', 'Not set']] : []),
          ['Welcome email', 'When a team is enrolled'], ['Included time ends', c.included ? includedLine(c.included) : 'Not set'],
          ['Session reminders', 'The day before and an hour before, in MT and CT'], ['Time zone', 'Mountain in the admin. Learners see Central.']]} /></div></Card>
      </div>
      <div className="col">
        <Card t="Enrollment" right={<St v={c.enroll ? 'Open' : 'Closed'} tone={c.enroll ? 'ok' : 'off'} />}>
          <div className="kvs"><KV rows={[['Seats', <button className="lk" onClick={() => go('learners')}>0 of {c.cap} taken</button>], ['A seat is', 'A team: an owner and an AI Implementer'], ['Price', c.price ? c.price : <span className="pl warn">Not set</span>], ['Two payments', c.two], ['Founding', c.founding], ['Payment Links', c.links ? c.links : <span className="pl warn">Not set</span>], ['GoHighLevel', c.ghl], ['Who lands here', 'A team that buys a seat while enrollment is open']]} /></div>
          <div className="row" style={{ marginTop: 12 }}>{c.enroll
            ? <Btn onClick={() => setDlg({ title: 'Close Enrollment for the ' + c.n + '?', body: 'No new team can buy a seat in this cohort. The 0 already in it are not affected.', warn: 'This doesn’t turn off its Payment Links. Turn them off in Stripe by hand: a link left on still sells seats in this cohort.', cta: 'Close enrollment', yes: () => toast('Enrollment is closed') })}>Close enrollment</Btn>
            : <Btn k="p" onClick={() => setDlg({ title: 'Open Enrollment for the ' + c.n + '?', body: 'From now on, a team that buys a seat is placed in this cohort, up to ' + c.cap + ' seats. They get the welcome email and can start the setup week on ' + mtDay(c.opens) + '.', cta: 'Open enrollment', error: p3Refusal(c), yes: () => toast('Enrollment is open') })}>Open enrollment</Btn>}
            <Btn onClick={() => setD('price')}>{c.price ? 'Change the price' : 'Set the price'}</Btn><Btn onClick={() => setD('enroll')}>Edit enrollment</Btn></div></Card>
        <Card t="Words From This Cohort" sub="Learners see them on Home and the Schedule."><div className="col m">
          {c.unread && <span style={{ alignSelf: 'flex-start' }}><span className="pl warn">Read them once</span></span>}
          <div className="cfx"><span className="me">Name</span><span>{c.name || c.n}</span></div>
          <div className="cfx"><span className="me">The promise</span><span>{c.words.promise}</span></div>
          <div className="cfx"><span className="me">How it works</span><ul className="cfl">{c.words.how.map(h => <li key={h}>{h}</li>)}</ul></div>
          <div className="cfx"><span className="me">Holiday note</span><span>{c.words.holiday || 'None. Every week has its sessions.'}</span></div>
          <div className="row"><Btn onClick={() => setD('words')}>Edit words</Btn><button className="lk me" onClick={() => go('course')}>What every cohort shares is in Course Settings</button></div>
        </div></Card>
        {/* D-270 (R-5 Phase 9): the mockup's second row. Archive is allowed after the cohort's last session; before it, the
            mockup's toast says when. Confirmed in a dialog, one audit row; it sets when it was archived and nothing else. */}
        <Card t="Clean-Up"><div className="col m">
          <div className="row nw" style={{ gap: 12 }}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">Delete turned-in files</span><span className="me">Removes every file teams turned in. The record that they turned it in stays.</span></span><Btn onClick={() => toast('Counting the files…')}>Delete…</Btn></div>
          <div className="row nw" style={{ gap: 12 }}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">Archive this cohort</span><span className="me">Hides it from the switcher when it is over. Its people, files and payments are kept.</span></span><Btn onClick={() => { const last = c.ses.length ? c.ses[c.ses.length - 1] : null; toast('A cohort can be archived after its last session' + (last ? ', ' + mtDay(last.start) : '') + '.'); }}>Archive…</Btn></div>
        </div></Card>
      </div>
    </div>
    {dlg === 'shape' && <Modal title={'Shape of the ' + c.n} w={640} onClose={() => setD(null)} foot={<><Btn onClick={() => setD(null)}>Cancel</Btn><Btn k="p" onClick={() => setD(null)}>Save shape</Btn></>}>
      <ShapeFields f={{ picks: c.weeks.filter(w => w.n > 0).map(w => w.id), slots: c.slots, setup: c.setup }} up={() => {}} off={!c.draft} />
      <label className="lab">Hosts<input className="in" defaultValue={c.hosts} /></label>
      {c.draft && <div className="lab"><span>What this makes</span><PlanList plan={JAN_PLAN} /></div>}
    </Modal>}
    {dlg === 'weeks' && <Modal title={'The Weeks the ' + c.n + ' Runs'} w={620} onClose={() => setD(null)} foot={<><Btn onClick={() => setD(null)}>Cancel</Btn><Btn k="p" onClick={() => setD(null)}>Save</Btn></>}>
      <p className="s2">Pick from the program’s weeks. What a week teaches is the same for every cohort. Its date is this cohort’s.</p>
      <div className="cd" style={{ boxShadow: 'none' }}><WeekPick picks={c.weeks.filter(w => w.n > 0).map(w => w.id)} on={() => {}} /></div>
      <p className="me">{p3Shape(c)} weeks of building{c.setup ? ', after the setup week' : ''}.</p>
    </Modal>}
    {dlg === 'dates' && <Modal title="Dates and Release" w={560} onClose={() => setD(null)} foot={<><Btn onClick={() => setD(null)}>Cancel</Btn><Btn k="p" onClick={() => setD(null)}>Save</Btn></>}>
      <div className="g2"><label className="lab">Week 1 opens<input className="in" type="date" defaultValue="2027-01-03" /></label><label className="lab">A week opens at (MT)<input className="in" type="time" defaultValue="12:00" /></label></div>
      <div className="g2"><label className="lab">{setup ? 'Setup week opens' : 'Preview opens'}<input className="in" type="date" defaultValue="2026-12-27" /></label><label className="lab">Time (MT)<input className="in" type="time" defaultValue="12:00" /></label></div>
      <div className="g2"><label className="lab">Welcome email sends at (MT)<input className="in" type="date" /></label><label className="lab">Time (MT)<input className="in" type="time" defaultValue="12:00" /></label></div>
      <p className="me">To move the whole cohort, change when Week 1 opens. Every week and session after it moves by the same number of days.</p>
      <label className="lab">Included time ends<span className="fat">A seat’s included time ends at the start of this day, Central time.</span><input className="in" type="date" defaultValue={c.included || ''} /></label>
      <div className="lab"><span>Each week</span><span className="fat">Move one week on its own, for a holiday break. Its sessions that haven’t happened move with it.</span>
        <div className="ewl"><div className="ewr ewh" aria-hidden="true"><span /><span /><span>Opens</span><span>Due</span></div>
          {c.weeks.map(w => <div key={w.id} className="ewr"><Wn n={w.n} sm /><span className="el">{w.t}</span><label className="ewf"><span className="ewk">Opens</span>{w.n === 0 ? <span className="me">Set above</span> : <input className="in" type="date" aria-label={'Week ' + w.n + ' opens'} defaultValue={new Date(w.opens - 7 * 36e5).toISOString().slice(0, 10)} />}</label><label className="ewf"><span className="ewk">Due</span><input className="in" type="date" aria-label={'Week ' + w.n + ' is due'} /></label></div>)}</div></div>
    </Modal>}
    {dlg === 'price' && <Modal title={'Price for a Seat in the ' + c.n} w={520} onClose={() => setD(null)} foot={<><Btn onClick={() => setD(null)}>Cancel</Btn><Btn k="p" disabled={!c.keys.full} onClick={() => setD(null)}>Save price</Btn></>}>
      <label className="lab">Lookup key, paid in full<span className="fat">{c.keys.full ? 'Stripe: $7,500 once' : 'Not set'}</span><input className="in" defaultValue={c.keys.full} /></label>
      <label className="lab">Lookup key, Insiders after<span className="fat">{c.keys.rollover ? 'Stripe: $169 a month' : 'Not set'}</span><input className="in" defaultValue={c.keys.rollover} /></label>
      <label className="ckr"><input type="checkbox" defaultChecked /><span className="col" style={{ gap: 0 }}><span className="w5">Offer two payments</span><span className="me">{c.price ? '$3,750 at checkout and $3,750 one month later, as Stripe schedules it. Revenue shows the second as still to collect.' : 'Stripe’s price sets the schedule. Revenue shows the second payment as still to collect.'}</span></span></label>
      <label className="lab">Lookup key, two payments<span className="fat">{c.keys.two ? 'Stripe: $3,750 a month' : 'Not set'}</span><input className="in" defaultValue={c.keys.two} /></label>
      <p className="me">Prices and Payment Links are made in Stripe. This shows Stripe’s price for this cohort.</p>
    </Modal>}
    {dlg === 'enroll' && <Modal title={'Enrollment for the ' + c.n} w={560} onClose={() => setD(null)} foot={<><Btn onClick={() => setD(null)}>Cancel</Btn><Btn k="p" onClick={() => setD(null)}>Save</Btn></>}>
      <label className="ckr"><input type="checkbox" defaultChecked /><span className="col" style={{ gap: 0 }}><span className="w5">A founding cohort</span><span className="me">Founding prices sell until founding closes. Its sold-out line says founding seats.</span></span></label>
      <div className="g2"><label className="lab">Founding closes<input className="in" type="date" defaultValue={c.enroll ? '2026-11-30' : ''} /></label><label className="lab">Time (MT)<input className="in" type="time" defaultValue="23:59" /></label></div>
      <label className="lab">Payment Link, paid in full<input className="in" defaultValue={c.enroll ? 'https://buy.stripe.com/test_dec26_full' : ''} /></label>
      <label className="lab">Payment Link, two payments<input className="in" defaultValue={c.enroll ? 'https://buy.stripe.com/test_dec26_two' : ''} /></label>
      <div className="g2"><label className="lab">Seats<input className="in" type="number" defaultValue={c.cap} /></label><label className="lab">GoHighLevel cohort value<input className="in" defaultValue={c.ghl} /></label></div>
      <p className="me">{'A link sells this cohort when, in Stripe, its metadata says ai_cohort = ' + c.id + '. A link without it sells December.'}</p>
    </Modal>}
    {dlg === 'words' && <Modal title="Words From This Cohort" w={560} onClose={() => setD(null)} foot={<><Btn onClick={() => setD(null)}>Cancel</Btn><Btn k="p" onClick={() => setD(null)}>Save words</Btn></>}>
      <label className="lab">Name<input className="in" defaultValue={c.name || c.n} /></label>
      <label className="lab">The promise<span className="fat">One line. Learners see it on Home, under the program’s name.</span><input className="in" defaultValue={c.words.promise} /></label>
      <label className="lab">How it works<span className="fat">A line each.</span><textarea className="in" rows={5} defaultValue={c.words.how.join('\n')} /></label>
      <label className="lab">Holiday note<textarea className="in" rows={2} defaultValue={c.words.holiday} /></label>
    </Modal>}
  </div>;
}

/* ---------- New cohort: say its shape and when it starts; see what that makes ---------- */
function NewCohort() {
  const { go, toast } = useC();
  const [f, setF] = useState({ start: '2027-01-03', setup: true, picks: P3_BUILD.slice(0, 6).map(w => w.id), slots: JAN_SLOTS, hosts: 'Connor Leiva and Spring', from: 'dec26' });
  const up = p => setF({ ...f, ...p });
  const pl = p3Plan(f), first = pl.ses[0], last = pl.ses[pl.ses.length - 1];
  return <div className="pg">
    <Head back={['cohort', 'Cohort']} t="New Cohort" d="One group going through the program. Say how long it runs, how often you meet and when it starts. The portal lays out the weeks and the sessions. You can change any of it afterwards." />
    <div className="gms">
      <div className="col">
        <Card t="The Cohort"><div className="col">
          <div className="g2"><label className="lab">Name<input className="in" defaultValue="January 2027 Cohort" /></label>
            <div className="lab"><span>Start from</span><Sel label="Start from" v="December 2026 Cohort" on={() => {}} opts={['December 2026 Cohort', 'A blank cohort']} /></div></div>
          <label className="lab">The promise<span className="fat">One line. Learners see it on Home, under the program’s name.</span><input className="in" defaultValue={DEC_WORDS.promise} /></label>
          <p className="me">Copied from December: its seats, its intake form, its emails and its community rules. Nothing about December changes.</p>
        </div></Card>
        <Card t="Its Shape" sub="How long it runs and how often you meet"><ShapeFields f={f} up={up} /></Card>
        <Card t="When It Starts"><div className="g2"><label className="lab">Week 1 opens<input className="in" type="date" value={f.start} onChange={e => e.target.value && up({ start: e.target.value })} /></label>
          <div className="lab"><span>That makes</span><span className="s2" style={{ fontWeight: 400 }}>{pl.setupOpens ? 'The setup week opens ' + mtDay(pl.setupOpens) + '. ' : ''}{first ? 'The first session is ' + mtDay(first.start) + ' and the last is ' + mtDay(last.start) + '.' : 'No sessions yet.'}</span></div></div></Card>
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>What It Covers</h2><span className="me">Pick from the program’s weeks. They keep the curriculum’s order.</span></div><span className="pl ok">{f.picks.length} of {P3_BUILD.length} weeks</span></div>
          <WeekPick picks={f.picks} on={p => up({ picks: p })} /></section>
        <Card t="Seats, Time and Hosts"><div className="col">
          <div className="g2"><div className="lab"><span>Seats</span><span className="fat">A seat is a team: an owner and an AI Implementer.</span><span className="s2" style={{ fontWeight: 400 }}>{P3_COH.dec26.cap + ', copied from December'}</span></div>
            <label className="lab">Included time ends<span className="fat">90 days after the last live build.</span><input className="in" type="date" defaultValue="2027-05-10" /></label></div>
          <label className="lab">Hosts<input className="in" value={f.hosts} onChange={e => up({ hosts: e.target.value })} /></label>
        </div></Card>
      </div>
      <div className="col">
        <section className="cd nsk"><div className="cdb col">
          <div className="row nw" style={{ gap: 12, alignItems: 'flex-start' }}><PTile s={40} /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w6" style={{ fontSize: 16 }}>January 2027 Cohort</span><span className="me">Amplified AI Accelerator</span></div></div>
          <div className="skf"><div><b className="tn">{f.picks.length}</b><span className="me">weeks of building</span></div><div><b className="tn">{pl.ses.length}</b><span className="me">sessions</span></div><div><b className="tn">{P3_COH.dec26.cap}</b><span className="me">team seats</span></div></div>
          <PlanList plan={pl} free />
          <Btn k="p" onClick={() => { P3C = P3_COH.jan27; toast('January 2027 Cohort created as a draft'); go('cohort'); }}>Create cohort</Btn>
          <p className="me">Creates a draft. No one is enrolled, nothing is for sale and no one is emailed.</p>
        </div></section>
      </div>
    </div>
  </div>;
}

/* ---------- D-265 (R-5 Phase 6): Program › Curriculum, a week, and Course Settings ----------
   Ported from handoff/admin-mockup/p3-areas.jsx (`Curriculum3`, `WeekEdit`) and ia-screens.jsx (`CourseSet`), with
   PLAN.md § 10.8's words: Title Case headings, one line of times in MT and CT ("12:00 PM MT / 1:00 PM CT"), no dashes.
   The program is this reference's (`P3_WEEKS`) with the mockup's statuses, steps, time and kit; December runs all nine
   weeks on the mockup's dates (its Program pages' own figures, as the app's fixture gives each page its own); a week's
   steps and its sessions are the mockup's. A week is Published or Draft here: "scheduled" is something a cohort says. */
const P6_LIB = [[170, 'Published', 8, 7], [150, 'Published', 7, 5], [160, 'Published', 7, 4], [140, 'Draft', 6, 3], [120, 'Draft', 5, 2], [90, 'Draft', 4, 2], [60, 'Draft', 3, 0], [0, 'Draft', 0, 0], [0, 'Draft', 0, 0]]
  .map(([min, st, steps, kit], i) => ({ id: P3_WEEKS[i].id, n: P3_WEEKS[i].n, t: P3_WEEKS[i].t, o: P3_WEEKS[i].o, st, steps, min, kit }));
/* December, as its Program pages draw it: each week's opening, its first meeting, and the sessions of its first weeks */
const P6_DEC_RUN = [['2026-11-29', null], ['2026-11-29', '2026-12-02'], ['2026-12-06', '2026-12-09'], ['2026-12-13', '2026-12-16'], ['2027-01-03', '2027-01-06'], ['2027-01-10', '2027-01-13'], ['2027-01-17', '2027-01-20'], ['2027-01-24', '2027-01-27'], ['2027-01-31', '2027-02-03']]
  .map(([o, b], i) => ({ id: P6_LIB[i].id, n: i, opens: zAt(o, '12:00'), build: b ? zAt(b, '12:00') : null }));
const P6_DEC_SES = [['Map Your Spend', 1, '2026-12-02'], ['Lead Source Review', 2, '2026-12-09'], ['Numbers on the 5th', 3, '2026-12-16'], ['Protect the Pipeline', 4, '2027-01-06']]
  .flatMap(([t, wk, d], i) => [{ t: t + ' Live Build', k: 'Live build', wk, start: zAt(d, '12:00'), zoom: i === 0 }, { t: t + ' Office Hours', k: 'Office hours', wk, start: zAt(dayAdd(d, 1), '12:00'), zoom: i === 0 }]);
/* the cohorts that run a week: December, and January once it is created (its own run) */
const p6Runs = () => [{ c: P3_COH.dec26, run: P6_DEC_RUN }, ...(P3C === P3_COH.jan27 ? [{ c: P3_COH.jan27, run: P3_COH.jan27.weeks.map(w => ({ id: w.id, n: w.n, opens: w.n === 0 ? P3_COH.jan27.opens : w.opens, build: w.ses[0] ? w.ses[0].start : null })) }] : [])];
const p6Used = id => p6Runs().map(x => { const r = x.run.find(w => w.id === id); return r && { c: x.c, r }; }).filter(Boolean);
const p6Short = c => c.n.replace(' Cohort', '');
const P6_W0_STEPS = [
  ['Fill In Your Intake and Name Your AI Implementer', ['Owner'], '10 min', 'Intake in, AI Implementer invited, stack card sent back.'],
  ['Watch the Orientation', ['Owner', 'AI Implementer'], '30 min', 'Both know how a week runs and what a hire is.'],
  ['Start Your Time Baseline', ['Owner'], '20 min', 'Six tasks timed per occurrence, or marked not done today.'],
  ['Get Your AI Ready', ['AI Implementer'], '20 min', 'Paid plan, training off, skills on, both cohort skills pass their self-test.'],
  ['Set Up Your AI Brain', ['Owner', 'AI Implementer'], '30 min', 'A new chat knows the business.'],
  ['Connect Your Data', ['AI Implementer'], '30 min', 'Each green source answers a test question.'],
  ['Lock the Guardrails', ['AI Implementer'], '10 min', 'Every write tool blocked except drafts and saves.'],
  ['Run the Ready Check and Your Test Hire', ['AI Implementer'], '20 min', 'Ready Check is green and the test hire ran.'],
];
const P6_WK_STEPS = [
  ['Read the Week and Pick Your Data', ['Owner'], '15 min', 'The export this week needs is in the AI Office.'],
  ['Join the Live Build', ['Owner', 'AI Implementer'], '1 hr 30 min', 'The hire ran once on your own data.'],
  ['Run It Again on Your Own', ['AI Implementer'], '30 min', 'A second run matches the first.'],
  ['Check the Output with the Rubric', ['Owner'], '15 min', 'Every rubric line is a yes or has a note.'],
  ['Turn In Your Report', ['AI Implementer'], '10 min', 'The report is turned in from the step.'],
  ['Bring One Question to Office Hours', ['Owner', 'AI Implementer'], '1 hr', 'The question is posted or asked live.'],
  ['Mark the Hire as Deployed', ['Owner'], '5 min', 'The week shows Deployed.'],
];
const p6Len = m => m ? lenOf(m) : 'Not built';
/* a section list down the left: one section on screen at a time; a select on a phone */
function Rail({ items, v, on }) {
  const { ph } = useC();
  if (ph) return <select className="in" style={{ width: '100%' }} aria-label="Section" value={v} onChange={e => on(e.target.value)}>{items.map(([k, l, c]) => <option key={k} value={k}>{l}{c !== undefined ? ' · ' + c : ''}</option>)}</select>;
  return <nav className="srl" aria-label="Sections">{items.map(([k, l, c]) => <button key={k} className={'srb' + (v === k ? ' on' : '')} aria-current={v === k ? 'true' : undefined} onClick={() => on(k)}><span className="el">{l}</span>{c !== undefined && <span className="tn">{c}</span>}</button>)}</nav>;
}
const Fld = ({ l, at, children }) => <label className="lab">{l}{at && <span className="fat">Learners see it on {at}</span>}{children}</label>;
function Lines({ l, at, v, touch }) {
  const [rows, set] = useState(v);
  const upd = r => { set(r); touch(); };
  return <div className="lab"><span>{l}</span>{at && <span className="fat">Learners see it on {at}</span>}
    <div className="lns">{rows.map((r, i) => <div key={i} className="ln"><span className="grp" aria-hidden="true"><I n="grip" s={14} /></span><input className="in" aria-label={l + ', line ' + (i + 1)} value={r} onChange={e => upd(rows.map((x, j) => j === i ? e.target.value : x))} /><button type="button" className="ib" aria-label={'Remove line ' + (i + 1)} onClick={() => upd(rows.filter((x, j) => j !== i))}><I n="x" s={14} /></button></div>)}</div>
    <button type="button" className="b q" style={{ alignSelf: 'flex-start', marginLeft: -10 }} onClick={() => upd([...rows, ''])}><I n="plus" />Add a line</button></div>;
}
const StepWho = ({ v }) => <span className="row" style={{ gap: 4 }}>{v.map(x => <span key={x} className={'pl' + (x === 'Owner' ? ' info' : ' ok')}>{x}</span>)}</span>;
/* a field that is filled in from the cohort, shown where the course's shared words are edited */
const FromCohort = ({ l, at, v, lines }) => { const { go } = useC(); return <div className="lab"><span>{l}</span>{at && <span className="fat">Learners see it on {at}</span>}
  <div className="cfb"><span className="pl info">From the cohort</span>{lines ? <ul className="cfl">{lines.map(x => <li key={x}>{x}</li>)}</ul> : <span style={{ fontWeight: 400 }}>{v}</span>}<button type="button" className="lk a" onClick={() => go('cohortset')}>{p6Short(P3C)} › Settings</button></div></div>; };

/* ---------- Program › Curriculum: the weeks, built once ---------- */
function ProgramCurriculum() {
  const { go, guard, toast, setDlg, log, ph } = useC();
  const [lib, setLib] = useState(P6_LIB);
  const pub = w => guard('build', 'Publish ' + w.t, () => setDlg({ title: 'Publish ' + w.t + '?', body: 'Each cohort that runs it gets it on its own date. Until then learners see its title and outcome, locked.', cta: 'Publish', yes: () => { setLib(l => l.map(x => x === w ? { ...x, st: 'Published' } : x)); log('module.publish', w.t, ''); toast(w.t + ' is published'); } }));
  const drafts = lib.filter(w => w.st === 'Draft').length;
  return <div className="col">
    <section className="cd">
      <div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Weeks</h2><span className="me">{lib.length - drafts} published and {drafts} in draft. Open a week to build it.</span></div><GBtn k="p" ic="plus" perm="build" label="Add a week" go={() => go('builder', 'new')}>Add a week</GBtn></div>
      <div className="wkl">{lib.map(w => { const u = p6Used(w.id); return <div key={w.id} className="wkr">
        {!ph && <span className="grp" title="Drag to reorder" aria-hidden="true"><I n="grip" s={14} /></span>}
        <span className={'wn' + (w.st === 'Draft' ? ' off' : '')}>{w.n}</span>
        <button className="wkm" onClick={() => go('builder', w.id)}><span className="w5 el">{w.t}</span><span className="me el">{w.o}</span></button>
        <div className="wkc"><span className="tn">{w.steps ? w.steps + ' steps' : 'No steps yet'}</span><span className="me">{p6Len(w.min)}</span></div>
        <div className="wkc wkd">{u.length ? u.map(({ c, r }) => <button key={c.id} className="lk el uin" onClick={() => { P3C = c; go('cohort'); }}>{p6Short(c)} · Week {r.n}</button>) : <span className="me">No cohort runs it</span>}</div>
        <div className="wks">{w.st === 'Draft' ? <Btn disabled={!w.steps} title={w.steps ? undefined : 'Add a step first'} onClick={() => pub(w)}>Publish</Btn> : <St v="Published" />}</div>
        <Menu items={[{ l: 'Open week', ic: 'builder', fn: () => go('builder', w.id) }, { l: 'Preview as a learner', ic: 'eye', fn: () => toast('Opens the learner preview of ' + w.t) }, { l: 'Duplicate', g: 1, fn: () => guard('build', 'Duplicate ' + w.t, () => toast('Duplicated as a draft. Use it when one cohort needs its own version of a week.')) }, '-', w.st === 'Draft' ? { l: 'Publish', g: 1, fn: () => pub(w) } : { l: 'Unpublish', g: 1, d: 1, fn: () => guard('build', 'Unpublish', () => toast('Hidden from learners in every cohort. Their progress is kept.')) }]} />
      </div>; })}</div>
    </section>
    <div className="set2">
      <Card t="Cohorts That Run It" right={<Btn ic="plus" onClick={() => go('newcohort')}>New</Btn>}><div className="col m">{p6Runs().map(({ c, run }) => <button key={c.id} className="rnw" onClick={() => { P3C = c; go('cohort'); }}><PTile /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{c.n}</span><span className="me">{run.filter(r => r.n > 0).length} weeks · opens {mtDay(run[0].opens)}</span></span><I n="chev" s={12} w={2.2} /></button>)}
        <p className="me">A cohort picks its weeks from this list and gives them dates. Change a week here and every cohort that runs it gets the change.</p></div></Card>
      <Card t="Shared by Every Week"><div className="kvs"><KV rows={[
        ['Course pages', <button className="lk a" onClick={() => go('course')}>Intro, rules, before and after</button>],
        ['Glossary', <button className="lk a" onClick={() => go('course', null, 'glossary')}>{P6_GLOSS.length} terms</button>],
        ['Words', <button className="lk a" onClick={() => go('course', null, 'words')}>{P6_WORDS.filter(w => w[2] === 'Learners').length} lines learners see</button>],
        ['Resource Vault', <button className="lk a" onClick={() => go('vault')}>{VAULT_ROWS.length} kit files</button>]]} /></div></Card>
    </div>
  </div>;
}

/* ---------- Program › Curriculum › a week: the builder, one section at a time ---------- */
function WeekEdit() {
  const { route, go, guard, toast, ph } = useC();
  const w = P6_LIB.find(x => x.id === (route.id || 'accelerator-week-1')) || P6_LIB[1], wi = P6_LIB.indexOf(w);
  const steps = (w.n === 0 ? P6_W0_STEPS : P6_WK_STEPS).slice(0, w.steps);
  const [sec, setSec] = useState(route.tab || 'steps'), [dirty, setDirty] = useState(false), [k, setK] = useState(0);
  const touch = () => setDirty(true);
  const used = p6Used(w.id), mine = used.find(u => u.c === P3C);
  const ses = mine && P3C === P3_COH.dec26 ? P6_DEC_SES.filter(s => s.wk === w.n) : mine ? P3C.ses.filter(s => s.week.id === w.id).map(s => ({ t: s.title, k: P3_KIND[s.kind], start: s.start, zoom: false })) : [];
  const save = () => guard('build', 'Save ' + w.t, () => { setDirty(false); toast(w.t + ' saved' + (used.length > 1 ? ' for ' + used.length + ' cohorts' : '')); });
  const items = [['basics', 'Basics'], ['steps', 'Steps', steps.length], ['page', 'Course Page'], ['live', 'Live Sessions', ses.length], ['cards', 'Hire Cards', w.n === 0 ? 0 : 3], ['kit', 'Kit', w.kit], ...(w.n === 0 ? [['forms', 'Forms']] : [])];
  return <div className="pg">
    <Head back={['program', 'Curriculum']} t={w.t} meta={<St v={w.st} />} d={w.o}
      right={<><span className="row nw" style={{ gap: 0 }}><button className="ib" aria-label="Previous week" disabled={wi === 0} onClick={() => go('builder', P6_LIB[wi - 1].id)}><I n="back" /></button><button className="ib" aria-label="Next week" disabled={wi === P6_LIB.length - 1} onClick={() => go('builder', P6_LIB[wi + 1].id)}><span style={{ display: 'flex', transform: 'scaleX(-1)' }}><I n="back" /></span></button></span><Btn ic="eye" onClick={() => toast('Opens the learner preview of ' + w.t)}>Preview</Btn><Btn k="p" disabled={!dirty} onClick={save}>Save changes</Btn></>} />
    <div className="srg" key={k}>
      <Rail v={sec} on={setSec} items={items} />
      <div className="col">
        {sec === 'basics' && <Card t="Basics" sub="What the week is called and what it is for."><div className="col">
          <Fld l="Title" at="the sidebar and the week page"><input className="in" defaultValue={w.t} onChange={touch} /></Fld>
          <Fld l="Outcome" at="the week page, under the title"><input className="in" defaultValue={w.o} onChange={touch} /></Fld>
          <div className="lab"><span>Where it runs</span><span className="fat">A week's number and its date come from the cohort, not from the week.</span>
            {used.length ? <div className="col m">{used.map(u => <button key={u.c.id} className="rnw uir" onClick={() => { P3C = u.c; go('cohortset'); }}><span className="wn sm pk">{u.r.n}</span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">Week {u.r.n} of the {u.c.n}</span><span className="me">Opens {mtDay(u.r.opens)} · {mtCt(u.r.opens)}{u.r.build ? ' · meets ' + mtDay(u.r.build) : ''}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div> : <div className="note"><span className="s2">No cohort runs this week yet. Add it from a cohort's Overview, under The run.</span></div>}</div>
        </div></Card>}
        {sec === 'steps' && <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Steps</h2><span className="me">{steps.length ? 'In order. A learner ticks each one off.' : 'This week has no steps yet.'}</span></div><GBtn ic="plus" perm="build" label="Add a step" go={() => { touch(); toast('Adds a step at the end and opens it'); }}>Add a step</GBtn></div>
          {steps.length ? <div className="wkl">{steps.map((s, i) => <div key={i} className="wkr stp">
            {!ph && <span className="grp" aria-hidden="true"><I n="grip" s={14} /></span>}<span className="wn sm">{i + 1}</span>
            <button className="wkm" onClick={() => toast('Opens the step: its words, who does it, its time, and its Claude and ChatGPT paths')}><span className="w5 el">{s[0]}</span><span className="me el">Done when: {s[3]}</span></button>
            <div className="wkc"><StepWho v={s[1]} /></div><div className="wks tn">{s[2]}</div>
            <Menu items={[{ l: 'Edit step', fn: () => toast('Opens the step') }, { l: 'Move up', fn: touch }, { l: 'Move down', fn: touch }, '-', { l: 'Remove step', d: 1, g: 1, fn: () => guard('build', 'Remove step', touch) }]} /></div>)}</div>
            : <Empty ic="curriculum" t="No steps yet" b="Add the first step, or duplicate a built week and change it." cta="Add a step" on={() => toast('Adds a step and opens it')} />}
        </section>}
        {sec === 'page' && <Card t="Course Page" sub="The words on this week's page, above its steps."><div className="col">
          <Fld l="What you will build" at="the week page"><textarea className="in" rows={3} defaultValue={w.o + ' By Friday it has run on your own numbers at least twice.'} onChange={touch} /></Fld>
          <Lines l="Before you start" at="the week page" touch={touch} v={['Last year\'s numbers exported and saved in your AI Office.', 'Both of you can open the cohort skills.']} />
          <Fld l="What done looks like" at="Reference"><textarea className="in" rows={2} defaultValue="The report is turned in, and you can say what you would change next month." onChange={touch} /></Fld>
          <p className="me">What every week shares (the course intro, the rules, the glossary) is in <button className="lk a" onClick={() => go('course')}>Course Settings</button>.</p>
        </div></Card>}
        {sec === 'live' && <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Live Sessions</h2><span className="me">Sessions belong to the cohort. This week only says what happens in them.</span></div><Btn onClick={() => go('cohorts')}>Open Schedule</Btn></div>
          {ses.length ? <div className="wkl">{ses.map(s => <div key={s.t} className="wkr stp"><span className="mt"><I n={s.k === 'Live build' ? 'play' : 'community'} /></span><button className="wkm" onClick={() => go('cohorts')}><span className="w5 el">{s.t}</span><span className="me el">{mtDay(s.start)} · {mtCt(s.start)}</span></button><div className="wks"><St v={s.zoom ? 'Ready' : 'Waiting'} /></div></div>)}</div>
            : <div className="cdb"><p className="s2">{w.n === 0 ? 'The setup week is self-paced. It has no sessions.' : mine ? 'The ' + P3C.n + ' has no sessions for this week yet. ' : 'The ' + P3C.n + ' doesn\'t run this week. '}{w.n > 0 && mine && <button className="lk a" onClick={() => go('cohorts')}>Add them in Schedule</button>}</p></div>}
          {w.n > 0 && <div className="cdb" style={{ borderTop: '1px solid var(--line)' }}><Lines l="Run of show" at="the live build's row on the week page" touch={touch} v={['0:00 What we are building and why', '0:10 Build it together, step by step', '1:00 Run it on your own data', '1:20 What to turn in by Friday']} /></div>}
        </section>}
        {sec === 'cards' && <Card t="Hire Cards" sub="The three cards a learner keeps from the week.">{w.n === 0 ? <p className="s2">The setup week has no hire. Cards start with the first building week.</p> : <div className="col m">{[['Seat card', 'What this hire does, for whom, and what it never touches.', 'Written'], ['Playbook card', 'How to run it, check it and fix it.', w.st === 'Draft' ? 'Empty' : 'Written'], ['Sample output', 'One finished report, from made-up numbers.', w.st === 'Draft' ? 'Empty' : 'Written']].map(c => <button key={c[0]} className="rnw" onClick={() => toast('Opens the ' + c[0].toLowerCase())}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{c[0]}</span><span className="me">{c[1]}</span></span><Pill v={c[2]} tone={c[2] === 'Written' ? 'ok' : ''} /><I n="chev" s={12} w={2.2} /></button>)}</div>}</Card>}
        {sec === 'kit' && <Card t="Kit" sub="The skills and files this week hands out." right={<GBtn ic="plus" perm="build" label="Add to the kit" go={() => toast('Pick from the Resource Vault, or upload')}>Add</GBtn>}>{w.kit ? <div className="col m">{['Map Your Spend skill', 'Lead Source Review skill', 'Week checklist', 'Report template', 'Rubric', 'Sample week', 'Time baseline'].slice(0, w.kit).map((f, i) => <div key={f} className="row nw" style={{ gap: 10 }}><span className="mt"><I n={i < 2 ? 'bolt' : 'file'} /></span><span className="w5 el" style={{ flex: 1 }}>{f}</span><span className="me">{i < 2 ? 'Skill' : 'File'}</span></div>)}<p className="me">Files live in the <button className="lk a" onClick={() => go('vault')}>Resource Vault</button>. A week only points at them.</p></div> : <p className="s2">Nothing in this week's kit yet.</p>}</Card>}
        {sec === 'forms' && <OffRef what="Forms" />}
        {dirty && <div className="svb"><span className="w5" style={{ flex: 1 }}>Unsaved changes to {w.t}</span><Btn onClick={() => { setDirty(false); setK(k + 1); }}>Discard</Btn><Btn k="p" onClick={save}>Save changes</Btn></div>}
      </div>
    </div>
  </div>;
}

/* ---------- Program › Course Settings: what every week shares ---------- */
const P6_GLOSS = [['AI Employee', 'A piece of work your AI does on a schedule, with a seat card.', 'hire, AI hire', 'Week 0 · Step 2'], ['AI Implementer', 'The person on your team who sets the hires up and keeps them running.', 'implementer', 'Week 0 · Step 1'], ['AI Brain', 'What your AI knows about your business before you ask it anything.', 'brain', 'Week 0 · Step 5'], ['Seat card', 'One page: what a hire does, for whom, and what it never touches.', '', 'Week 1 · Step 2'], ['Playbook card', 'How to run a hire, check it and fix it.', 'playbook', 'Week 1 · Step 2'], ['Guardrails', 'The settings that stop your AI from sending or changing anything on its own.', '', 'Week 0 · Step 7'], ['Ready Check', 'A short test that says your setup is ready for a hire.', '', 'Week 0 · Step 8'], ['Stack card', 'The tools your team runs on, on one page.', '', 'Week 0 · Step 1'], ['Time baseline', 'How long six tasks take today, so you can see what changed.', 'baseline', 'Week 0 · Step 3'], ['Evidence packet', 'What you turn in to show a hire works.', 'evidence', 'Week 1 · Step 5']];
const P6_WORDS = [['locked.opens', 'Opens {date}', 'Learners'], ['locked.utah_life', 'Not included with Utah Life access', 'Learners'], ['community.nothing_emailed', 'Nothing is emailed.', 'Learners'], ['turnin.goes_to', 'Goes to Connor\'s team. Nothing is emailed.', 'Learners'], ['week.done', 'Deployed', 'Learners'], ['staff.preview', 'Previewing as a learner. Nothing you do here is saved.', 'Staff']];
function CourseSet() {
  const { route, go, guard, toast, ph } = useC();
  const [sec, setSec] = useState(route.tab || 'intro'), [dirty, setDirty] = useState(false), [k, setK] = useState(0), [q, setQ] = useState(''), [au, setAu] = useState('Everyone'), [ed, setEd] = useState(null);
  useEffect(() => { if (route.tab) setSec(route.tab); }, [route.tab]);
  const touch = () => setDirty(true);
  const names = { intro: 'Course Intro', roles: 'Roles', rules: 'Rules and Support', before: 'Before Week 1', after: 'After the Cohort', join: 'Joining and Community', glossary: 'Glossary', words: 'Words' };
  const save = () => guard('build', 'Save course settings', () => { setDirty(false); toast(names[sec] + ' saved'); });
  const T = (l, at, v, rows) => <Fld l={l} at={at}>{rows ? <textarea className="in" rows={rows} defaultValue={v} onChange={touch} /> : <input className="in" defaultValue={v} onChange={touch} />}</Fld>;
  const words = P6_WORDS.filter(w => (w[0] + w[1]).toLowerCase().includes(q.toLowerCase()) && (au === 'Everyone' || w[2] === au));
  return <div className="pg">
    <Head t="Course Settings" d="What every cohort shares: the intro, the rules, the pages before and after, the glossary and the words learners see. Anything that names a date, a weekday or a number of weeks is filled in from the cohort."
      right={<Btn ic="eye" onClick={() => toast('Opens the learner preview of the course')}>Preview</Btn>} />
    <div className="srg" key={k}>
      <div className="col">
        <Rail v={sec} on={v => { setSec(v); }} items={Object.entries(names).map(([id, l]) => [id, l, id === 'glossary' ? P6_GLOSS.length : id === 'words' ? P6_WORDS.length : undefined])} />
        {!ph && <div className="note col s"><span className="w5">Looking for Dates?</span><span className="me">A cohort's dates, its promise, how often it meets and when its emails send are on the cohort.</span><button className="lk a" style={{ alignSelf: 'flex-start' }} onClick={() => go('cohortset')}>Open the cohort's Settings</button></div>}
      </div>
      <div className="col">
        {sec === 'intro' && <Card t="Course Intro" sub="The first thing a new learner reads."><div className="col">
          {T('Course title', 'Home', 'Amplified AI Accelerator')}
          <FromCohort l="The promise" at="Home, under the title" v={P3C.words.promise} />
          <FromCohort l="How it works" at="Home" lines={P3C.words.how} />
          {T('Instructor', 'Home and each live build', 'Connor Leiva')}
        </div></Card>}
        {sec === 'roles' && <Card t="Roles" sub="The two seats every team fills."><div className="col">
          {T('The owner\'s role', 'Home and Week 0', 'You decide what the hire is for and whether its work is good enough to use.', 3)}
          {T('The AI Implementer\'s role', 'Home and Week 0', 'You set the hire up, run it, and keep it running. On a small team this can be the owner.', 3)}
        </div></Card>}
        {sec === 'rules' && <Card t="Rules and Support" sub="What we will and won't do, and where to get help."><div className="col">
          {T('Scope', 'Home', 'We build the hires in this course. We don\'t set up your CRM or your books.', 2)}
          {T('Support', 'Home and Get help', 'Ask in the Community first. For anything private, email the team.', 2)}
          <Lines l="Office hours rules" at="each Office hours row" touch={touch} v={['Bring one question.', 'Share your screen, not your client\'s name.', 'If we can\'t fix it in ten minutes, we take it to a thread.']} />
          <Lines l="Evidence" at="Reference" touch={touch} v={['The report the hire made.', 'The rubric, filled in.', 'One sentence on what you would change.']} />
          {T('Missed a week', 'Reference', 'Watch the replay, run the hire, and turn it in. Nothing locks behind you.', 2)}
          <FromCohort l="Holiday note" at="the Schedule" v={P3C.words.holiday || 'None. Every week has its sessions.'} />
        </div></Card>}
        {sec === 'before' && <Card t="Before Week 1" sub="What a team reads between buying and the first live build."><div className="col">
          <Lines l="Intake" at="Week 0 · Step 1" touch={touch} v={['Fill in the intake before {first live build}.', 'Name your AI Implementer and invite them.']} />
          <p className="me">Words in braces are filled in from the cohort. For the {P3C.n}, {'{first live build}'} reads {P3C.ses.length ? mtDay(P3C.ses[0].start) : 'the first session'}.</p>
          {T('Practice set note', 'Week 0', 'Use the practice set until your own export is ready. It is made-up data.', 2)}
          <Lines l="Safe sharing" at="Week 0 and the Community" touch={touch} v={['No client names in a thread.', 'No passwords or keys, ever.', 'Screenshots with numbers are fine. Screenshots with people are not.']} />
        </div></Card>}
        {sec === 'after' && <Card t="After the Cohort" sub="What a team reads when its last week is done."><div className="col">
          <Lines l="Graduation" at="the last week" touch={touch} v={['{weeks of building} hires deployed.', 'A seat card and a playbook card for each.', 'Your next three hires, in order.']} />
          {T('Graduation note', 'the last week', 'You keep everything you built, and the portal stays open to you.', 2)}
          <Lines l="Paths" at="the last week" touch={touch} v={['Keep going with the Team Plan.', 'Bring your agents in on the Agent Plan.']} />
          {T('No paywall', 'the last week', 'Nothing you built here locks when the cohort ends.', 2)}
        </div></Card>}
        {sec === 'join' && <Card t="Joining and Community" sub="The button that takes a learner into a live session, and where the cohort talks."><div className="col">
          <div className="g2">{T('Join label', 'the top bar, 15 minutes before a session', 'Join on Zoom')}{T('Community link', 'Home, until the built-in Community replaces it', '')}</div>
          {T('Join note', 'under the Join button', 'Opens 15 minutes before we start.', 2)}
          <p className="me">The cohort's own threads are in <button className="lk a" onClick={() => go('community')}>Community</button>. Leave the link empty to show only that.</p>
        </div></Card>}
        {sec === 'glossary' && <Table title="Glossary" right={<GBtn ic="plus" perm="build" label="Add a term" go={() => setEd(['', '', '', ''])}>Add a term</GBtn>} rows={P6_GLOSS} onRow={g => setEd(g)}
          cols={[{ k: 0, l: 'Term', w: '170px', r: g => <span className="w5 el" style={{ display: 'block' }}>{g[0]}</span> }, { k: 1, l: 'Short definition', w: 'minmax(240px,2fr)', r: g => <span className="s2 cl2">{g[1]}</span> }, { k: 2, l: 'Also matches', w: '130px', hide: 'lap', r: g => g[2] || <span className="mu">None</span> }, { k: 3, l: 'First used', w: '140px', ns: 1 }]}
          card={g => <><span className="w6" style={{ fontSize: 17 }}>{g[0]}</span><p className="s2">{g[1]}</p><span className="me">First used: {g[3]}</span></>} />}
        {sec === 'words' && <><div className="row"><Find v={q} on={setQ} ph="Find a line" /><Sel label="Who reads it" v={au} on={setAu} opts={['Everyone', 'Learners', 'Staff']} /></div>
          <Table title="Words" right={<GBtn ic="plus" perm="build" label="Add a line" go={() => setEd(['', '', 'Learners', 'word'])}>Add a line</GBtn>} rows={words} onRow={w => setEd([...w, 'word'])} empty={{ ic: 'file', t: 'No line matches', b: 'Try fewer letters.' }}
            cols={[{ k: 1, l: 'What it says', w: 'minmax(240px,2fr)', r: w => <span className="w5 cl2">{w[1]}</span> }, { k: 0, l: 'Key', w: 'minmax(190px,1fr)', mo: 1, hide: 'lap' }, { k: 2, l: 'Who reads it', w: '112px', r: w => <Pill v={w[2]} tone={w[2] === 'Staff' ? '' : 'info'} /> }]}
            card={w => <><span className="w6">{w[1]}</span><span className="me mo">{w[0]}</span><Pill v={w[2]} tone={w[2] === 'Staff' ? '' : 'info'} /></>} />
          <p className="me">Short lines the portal shows in fixed places. A week's own words are in the week.</p></>}
        {dirty && <div className="svb"><span className="w5" style={{ flex: 1 }}>Unsaved changes to {names[sec]}</span><Btn onClick={() => { setDirty(false); setK(k + 1); }}>Discard</Btn><Btn k="p" onClick={save}>Save changes</Btn></div>}
      </div>
    </div>
    {ed && <Modal title={ed[3] === 'word' ? (ed[0] || 'New line') : (ed[0] || 'New term')} w={560} onClose={() => setEd(null)} foot={<><Btn onClick={() => setEd(null)}>Cancel</Btn><Btn k="p" onClick={() => guard('build', 'Save', () => { setEd(null); toast('Saved'); })}>Save</Btn></>}>
      {ed[3] === 'word' ? <><label className="lab">Key<input className="in mo" defaultValue={ed[0]} placeholder="locked.opens" /></label><label className="lab">What it says<textarea className="in" rows={3} defaultValue={ed[1]} /></label><label className="lab">Who reads it<select className="in" defaultValue={ed[2]}><option>Learners</option><option>Staff</option></select></label></>
        : <><label className="lab">Term<input className="in" defaultValue={ed[0]} /></label><label className="lab">Short definition<textarea className="in" rows={2} defaultValue={ed[1]} /></label><label className="lab">Also matches<input className="in" defaultValue={ed[2]} placeholder="Other words to underline, separated by commas" /></label></>}
    </Modal>}
  </div>;
}

/* ---------- which cohort: the sidebar's switcher, and the same choice in the Cohort page's title ---------- */
function CtxSwitch({ r }) {
  const { go, route } = useC();
  const items = pickItems(go);
  return <Menu lf trigger={(t, o) => <button className="sw" aria-expanded={o} aria-label={'Switch cohort. Amplified AI Accelerator, ' + P3C.n} title={r ? 'Amplified AI Accelerator · ' + P3C.n : undefined} onClick={t}><img className="tile" data-fl="tile" src={LOGO_ACCELERATOR} width={32} height={32} alt="" />{!r && <><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5 el sw1">Amplified AI Accelerator</span><span className="el sw2">{P3C.n}</span></span><span className="mu" style={{ display: 'flex' }}><I n="updown" s={14} /></span></>}</button>} items={items} />;
}
function CohortPick() {
  const { go } = useC();
  const items = pickItems(go);
  return <Menu lf trigger={(t, o) => <button className="cpk big" aria-expanded={o} aria-label={'Switch cohort. ' + P3C.n} onClick={t}><span className="el">{P3C.n}</span><I n="updown" s={18} /></button>} items={items} />;
}

/* ---------- the breadcrumb: Admin / the page / its tab / what is open ---------- */
const DETAIL = { builder: 'curriculum', workspace: 'teams', user: 'everyone', as: 'masquerade' };
const hereOf = (r, mods) => r.s === 'builder' ? (P6_LIB.find(w => w.id === (r.id || 'accelerator-week-1')) || P6_LIB[1]).t : r.s === 'workspace' ? (WS.find(x => x.id === r.id) || {}).n : r.s === 'user' ? (USERS.find(x => x.id === r.id) || {}).n : r.s === 'as' ? 'Learner view' : r.s === 'newcohort' ? 'New Cohort' : r.s === 'incident' ? r.id : '';
function Crumbs() {
  const { route, go, mods } = useC();
  const par = PARENT[route.s], key = par || route.s, item = NAV.flatMap(g => g[1]).find(n => n[0] === key), grp = item && NAV.find(g => g[1].includes(item))[0];
  const tk = par ? DETAIL[route.s] : route.tab, tabL = AREAS[key] && tk ? (AREAS[key].find(t => t[0] === tk) || [])[1] : null, here = par ? hereOf(route, mods) || 'Detail' : null;
  const L = (l, fn) => <button className="lk" style={{ fontWeight: 400, color: 'var(--f3)' }} onClick={fn}>{l}</button>, S = <span aria-hidden="true">/</span>;
  return <nav className="bc" aria-label="Breadcrumb"><span>Admin</span>
    {grp && !SOLO[grp] && <>{S}<span>{grp}</span></>}
    {item && <>{S}{tabL || here ? L(item[1], () => go(item[0])) : <b>{item[1]}</b>}</>}
    {tabL && <>{S}{here ? L(tabL, () => go(key, null, tk)) : <b>{tabL}</b>}</>}
    {here && <>{S}<b className="el">{here}</b></>}
  </nav>;
}

/* ---------- command palette ---------- */
function searchAll(q, can, mods) {
  const s = q.trim().toLowerCase(); const m = t => !s || t.toLowerCase().includes(s);
  return [
    ['Pages', [...NAV.flatMap(g => g[1]).filter(n => m(n[1]) && (!n[2] || can(n[2]))).map(n => ({ ic: n[0], l: n[1], to: [n[0]] })), ...Object.entries(AREAS).flatMap(([k, ts]) => ts.map(t => ({ ic: k, l: k[0].toUpperCase() + k.slice(1) + ' › ' + t[1], to: [k, null, t[0]] }))).filter(x => s && m(x.l))]],
    ['Users', USERS.filter(u => m(u.n + u.e)).map(u => ({ ic: 'users', l: u.n, r: u.e, to: ['user', u.id] }))],
    ['Teams', WS.filter(w => m(w.n + w.plan)).map(w => ({ ic: 'workspaces', l: w.n, r: w.plan, to: ['workspace', w.id] }))],
    ['Weeks', mods.filter(k => m(k.n)).map(k => ({ ic: 'curriculum', l: k.n, r: k.st, to: ['builder', k.id] }))],
    ['Invoices', INV.filter(i => m(i.id + i.c)).map(i => ({ ic: 'billing', l: i.id, r: i.c + ' · ' + i.amt, to: ['payments', null, 'invoices'], mo: 1 }))],
  ].map(([g, items]) => [g, s ? items.slice(0, 6) : items.slice(0, g === 'Pages' ? 5 : 2)]).filter(g => g[1].length);
}
function Palette() {
  const { go, setPal, can, mods, ph } = useC();
  const [q, setQ] = useState(''), [cur, setCur] = useState(0);
  const groups = searchAll(q, can, mods), flat = groups.flatMap(g => g[1]);
  const pick = it => { setPal(false); go(...it.to); };
  let n = -1;
  return <div className="scrim top0" onMouseDown={e => { if (e.target === e.currentTarget) setPal(false); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-label="Command palette" style={{ maxWidth: 600 }}>
      <div className="row nw" style={{ padding: '4px 8px 4px 16px', borderBottom: '1px solid var(--line)', height: ph ? 56 : 48, color: 'var(--f3)' }}><I n="search" /><input autoFocus placeholder="Search people, teams, weeks, invoices, pages" aria-label="Command palette search" style={{ flex: 1, border: 0, background: 'none', boxShadow: 'none', height: '100%', fontSize: ph ? 16 : 15, color: 'var(--ink)', minWidth: 0 }} value={q} onChange={e => { setQ(e.target.value); setCur(0); }}
        onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setCur(Math.min(flat.length - 1, cur + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setCur(Math.max(0, cur - 1)); } if (e.key === 'Enter' && flat[cur]) pick(flat[cur]); }} />
        {ph ? <button className="ib" aria-label="Close" onClick={() => setPal(false)}><I n="x" /></button> : <span className="kbd" style={{ marginRight: 8 }}>esc</span>}</div>
      <div style={{ overflow: 'auto', maxHeight: 400, padding: 6 }}>
        {!groups.length ? <Empty ic="search" t={'No results for "' + q + '"'} b="Try a name, an email, or an invoice ID." /> : groups.map(([g, items]) => <div key={g}><div className="me w5" style={{ padding: '8px 10px 4px' }}>{g}</div>{items.map(it => { n++; const k = n; return <button key={g + it.l} className={'pal-i' + (k === cur ? ' on' : '')} onMouseEnter={() => setCur(k)} onClick={() => pick(it)}><span className="mu" style={{ display: 'flex' }}><I n={it.ic} /></span><span className={'el' + (it.mo ? ' mo' : '')}>{it.l}</span>{it.r && <span className="me el" style={{ marginLeft: 'auto', paddingLeft: 12 }}>{it.r}</span>}</button>; })}</div>)}
      </div>
      {!ph && <div className="mf me" style={{ justifyContent: 'flex-start', gap: 16 }}><span className="row nw" style={{ gap: 4 }}><span className="kbd">↑</span><span className="kbd">↓</span> Navigate</span><span className="row nw" style={{ gap: 4 }}><span className="kbd">↵</span> Open</span><span className="sp" /><span className="row nw" style={{ gap: 4 }}><span className="kbd">⌘K</span> Toggle</span></div>}
    </div>
  </div>;
}

/* ---------- dialogs ---------- */
function ReasonModal({ mq, onGo, onCancel }) {
  const [r, setR] = useState('');
  const ext = mq.mode === 'extend';
  return <Modal lock title={ext ? 'Extend masquerade by 15 minutes' : 'Masquerade as ' + mq.u.n} foot={<><Btn onClick={onCancel}>Cancel</Btn><Btn k="p" disabled={r.trim().length < 8} onClick={() => onGo(r.trim())}>{ext ? 'Extend 15 minutes' : 'Start 15-minute session'}</Btn></>}>
    {!ext && <p className="s2">You will be signed in as {mq.u.n} ({mq.u.ws}) for 15 minutes. Every write is blocked, and the session is audit-logged.</p>}
    <label className="lab">{ext ? 'New reason' : 'Reason'}<textarea className="in" rows={3} autoFocus value={r} onChange={e => setR(e.target.value)} placeholder="Ticket, or what you need to check" /></label>
    <p className="me">{r.trim().length < 8 ? 'Required. Saved to the audit log with your name.' : 'Saved to the audit log with your name.'}</p>
  </Modal>;
}
function Confirm({ d, onClose }) {
  const [r, setR] = useState('');
  const ok = (!d.needReason || r.trim()) && !d.error;
  return <Modal title={d.title} onClose={onClose} foot={<><Btn onClick={onClose}>Cancel</Btn><Btn k={'p' + (d.danger ? ' d' : '')} disabled={!ok} onClick={() => { onClose(); d.yes(r.trim()); }}>{d.cta}</Btn></>}>
    <p className="s2">{d.body}</p>
    {d.warn && <p className="s2">{d.warn}</p>}
    {d.needReason && <label className="lab">Reason<input className="in" autoFocus value={r} onChange={e => setR(e.target.value)} placeholder="Required" /></label>}
    {d.error && <p className="er" role="alert">{d.error}</p>}
    <p className="me">This action is audit-logged.</p>
  </Modal>;
}

const SCREENS = { newcohort: NewCohort, program: ProgramArea, cohort: CohortArea, people: PeopleArea, revenue: RevenueArea, overview: Overview, health: Health, curriculum: Curriculum, builder: WeekEdit, vault: Vault, cohorts: Cohorts, announce: Announce, learners: Learners, workspaces: Workspaces, workspace: Workspace, users: Users, user: User, masquerade: Masquerade, as: LearnerView, tiers: Tiers, billing: Billing, usage: Usage, incidents: Incidents, incident: Incident, audit: Audit, api: Api, jobs: Jobs, email: Email, integrations: Integrations, deploys: Deploys, db: Db, flags: Flags, roles: Roles, denied: Denied };
/* Brand lockup: paths copied verbatim from amplified-impact-wordmark.svg (ink #0A0D0C, ring-and-dot tittle #1F8A5C). The rail crops the same artwork to its first glyph. */
const WM_VB = [41, -963.1, 7408, 1113.2];
const WM_PATHS = [{"fill":"#0A0D0C","d":"M41 -134Q41 -202 83.5 -241.5Q126 -281 215 -298L392 -333Q392 -389 366 -418Q340 -447 290 -447Q199 -447 181 -364L50 -370Q66 -454 128 -500Q190 -546 290 -546Q403 -546 461.5 -488.5Q520 -431 520 -324V-130Q520 -109 527 -101Q534 -93 550 -93H567V0Q551 4 521 4Q474 4 445.5 -16Q417 -36 409 -83Q389 -40 340.5 -14Q292 12 227 12Q142 12 91.5 -26.5Q41 -65 41 -134ZM392 -216V-246L254 -218Q212 -210 193 -192Q174 -174 174 -146Q174 -115 194.5 -98Q215 -81 253 -81Q316 -81 354 -118Q392 -155 392 -216Z M619 -534H735L738 -444Q757 -493 796 -519.5Q835 -546 885 -546Q943 -546 983 -517Q1023 -488 1040 -436Q1058 -489 1097.5 -517.5Q1137 -546 1193 -546Q1277 -546 1324 -493.5Q1371 -441 1371 -343V0H1243V-310Q1243 -376 1220.5 -409Q1198 -442 1152 -442Q1106 -442 1080 -406Q1054 -370 1054 -306V0H935V-306Q935 -374 914 -408Q893 -442 846 -442Q800 -442 773.5 -406Q747 -370 747 -306V0H619Z M1449 -534H1572L1574 -455Q1597 -499 1639 -522.5Q1681 -546 1734 -546Q1807 -546 1858.5 -509Q1910 -472 1935.5 -409Q1961 -346 1961 -267Q1961 -188 1935 -125Q1909 -62 1858 -25Q1807 12 1733 12Q1682 12 1640.5 -11Q1599 -34 1577 -73V150H1449ZM1828 -267Q1828 -349 1795 -395.5Q1762 -442 1703 -442Q1643 -442 1610 -397.5Q1577 -353 1577 -267Q1577 -181 1610 -136.5Q1643 -92 1703 -92Q1762 -92 1795 -138.5Q1828 -185 1828 -267Z M2022 -126 2023 -710H2151V-139Q2151 -99 2191 -99H2230V0H2151Q2089 0 2055.5 -30.5Q2022 -61 2022 -126Z M2291 -534H2419V0H2291ZM2289 -719H2422V-605H2289Z M2736 -710H2840V-611H2760Q2700 -611 2700 -548V-520H2833V-421H2700V0H2571V-421H2495V-520H2571V-555Q2571 -629 2612 -669.5Q2653 -710 2736 -710Z M2902 -534H3030V0H2902ZM2900 -719H3033V-605H2900Z M3094 -267Q3094 -350 3126 -413.5Q3158 -477 3216.5 -511.5Q3275 -546 3353 -546Q3429 -546 3486.5 -512Q3544 -478 3575.5 -413.5Q3607 -349 3607 -260V-231H3227Q3231 -162 3265 -126Q3299 -90 3357 -90Q3399 -90 3428 -109.5Q3457 -129 3468 -164L3599 -156Q3577 -78 3512.5 -33Q3448 12 3356 12Q3277 12 3217.5 -22.5Q3158 -57 3126 -120Q3094 -183 3094 -267ZM3353 -445Q3301 -445 3267.5 -412Q3234 -379 3227 -317H3474Q3470 -381 3438 -413Q3406 -445 3353 -445Z M3637 -267Q3637 -352 3664.5 -415Q3692 -478 3742 -512Q3792 -546 3859 -546Q3914 -546 3956.5 -522.5Q3999 -499 4021 -458V-710H4149V0H4028L4025 -79Q4002 -36 3958 -12Q3914 12 3859 12Q3791 12 3741 -22Q3691 -56 3664 -119Q3637 -182 3637 -267ZM4021 -267Q4021 -352 3989 -397Q3957 -442 3897 -442Q3838 -442 3804 -395Q3770 -348 3770 -267Q3770 -187 3804.5 -139.5Q3839 -92 3897 -92Q3956 -92 3988.5 -137.5Q4021 -183 4021 -267Z M4435 -534H4563V0H4435Z M4659 -534H4775L4778 -444Q4797 -493 4836 -519.5Q4875 -546 4925 -546Q4983 -546 5023 -517Q5063 -488 5080 -436Q5098 -489 5137.5 -517.5Q5177 -546 5233 -546Q5317 -546 5364 -493.5Q5411 -441 5411 -343V0H5283V-310Q5283 -376 5260.5 -409Q5238 -442 5192 -442Q5146 -442 5120 -406Q5094 -370 5094 -306V0H4975V-306Q4975 -374 4954 -408Q4933 -442 4886 -442Q4840 -442 4813.5 -406Q4787 -370 4787 -306V0H4659Z M5489 -534H5612L5614 -455Q5637 -499 5679 -522.5Q5721 -546 5774 -546Q5847 -546 5898.5 -509Q5950 -472 5975.5 -409Q6001 -346 6001 -267Q6001 -188 5975 -125Q5949 -62 5898 -25Q5847 12 5773 12Q5722 12 5680.5 -11Q5639 -34 5617 -73V150H5489ZM5868 -267Q5868 -349 5835 -395.5Q5802 -442 5743 -442Q5683 -442 5650 -397.5Q5617 -353 5617 -267Q5617 -181 5650 -136.5Q5683 -92 5743 -92Q5802 -92 5835 -138.5Q5868 -185 5868 -267Z M6034 -134Q6034 -202 6076.5 -241.5Q6119 -281 6208 -298L6385 -333Q6385 -389 6359 -418Q6333 -447 6283 -447Q6192 -447 6174 -364L6043 -370Q6059 -454 6121 -500Q6183 -546 6283 -546Q6396 -546 6454.5 -488.5Q6513 -431 6513 -324V-130Q6513 -109 6520 -101Q6527 -93 6543 -93H6560V0Q6544 4 6514 4Q6467 4 6438.5 -16Q6410 -36 6402 -83Q6382 -40 6333.5 -14Q6285 12 6220 12Q6135 12 6084.5 -26.5Q6034 -65 6034 -134ZM6385 -216V-246L6247 -218Q6205 -210 6186 -192Q6167 -174 6167 -146Q6167 -115 6187.5 -98Q6208 -81 6246 -81Q6309 -81 6347 -118Q6385 -155 6385 -216Z M6579 -267Q6579 -350 6611.5 -413.5Q6644 -477 6703.5 -511.5Q6763 -546 6842 -546Q6945 -546 7012 -492.5Q7079 -439 7091 -345L6959 -338Q6952 -388 6920.5 -415Q6889 -442 6842 -442Q6780 -442 6746 -396Q6712 -350 6712 -267Q6712 -184 6746 -138Q6780 -92 6842 -92Q6890 -92 6921 -120Q6952 -148 6959 -203L7091 -197Q7080 -101 7012.5 -44.5Q6945 12 6842 12Q6763 12 6703.5 -22.5Q6644 -57 6611.5 -120Q6579 -183 6579 -267Z M7180 -153V-435H7096V-534H7180V-659H7308V-534H7449V-435H7308V-165Q7308 -128 7323.5 -113.5Q7339 -99 7374 -99H7449V0H7335Q7255 0 7217.5 -37Q7180 -74 7180 -153Z"}];
function WordmarkOld({ short, h = 22 }) {
  const w = short ? 540 : WM_VB[2];
  return <svg className="wm" role="img" aria-label="Amplified Impact" height={h} width={Math.round(h * w / WM_VB[3] * 10) / 10} viewBox={WM_VB[0] + ' ' + WM_VB[1] + ' ' + w + ' ' + WM_VB[3]} style={{ overflow: 'hidden' }}>{WM_PATHS.map((p, i) => <path key={i} fill={p.fill} d={p.d} />)}<circle fill="none" stroke="#1F8A5C" cx="4477" cy="-800" r="139.3" strokeWidth="47.7" /><circle fill="#1F8A5C" cx="4477" cy="-800" r="69.7" /></svg>;
}
function Wordmark({ short }) { return <span className={'wm' + (short ? ' wm-ai' : '')}><img src={LOGO_APP} width={161} height={34} alt="Amplified Impact Academy" /></span>; }
const GIC = { Overview: 'overview', Program: 'curriculum', Cohort: 'cohorts', People: 'learners', Revenue: 'billing', Operations: 'health', Access: 'roles' };

/* ---------- shell ---------- */
function Sidebar({ rail, setRail, drawer, close }) {
  const { route, go, can, staff, masq, ph, mods } = useC();
  const active = PARENT[route.s] || route.s;
  const [peek, setPeek] = useState(undefined);   // the one group opened by hand (null: all shut); undefined: the group you are in
  useEffect(() => { setPeek(undefined); }, [active]);
  // Program: its draft weeks. Cohort: "N waiting" (Community threads) or "Draft"; this reference has no threads and no draft cohort.
  // Revenue: "N failed", the count of the Failed list, as Billing holds it in memory (D-269; the mockup's "3 failed"). Upgrade
  // requests are counted on Plans & upgrades, not on the row.
  const drafts = mods.filter(m => m.st === 'Draft').length;
  const badge = n => n[0] === 'program' ? (drafts ? drafts + ' draft' : '') : n[0] === 'cohort' ? (P3C.draft ? 'Draft' : '') : n[0] === 'revenue' ? (RV_FAILED ? RV_FAILED + ' failed' : '') : n[0] === 'incidents' && n[3] ? n[3] + (n[3] === '1' ? ' incident' : ' incidents') : n[3];
  // Collapse and expand travel. Three things, so the width and the layout can change at different moments:
  //   nar   the column is 64px wide        r   the rail's layout (one icon per group)        anim   'collapsing' | 'expanding' while it moves
  // Closing: the column narrows (380 ms, the system's curve) and the logo's window closes to "ai" with it; for the first 160 ms
  // the open layout stays and its words fade; then the layout becomes the rail and the logo tile, the group icons, the collapse
  // button and the avatar glide to their places (240 ms, FLIP), arriving with the edge. Opening: the layout opens at once behind
  // the edge, those glide back out (380 ms, no overshoot), the words fade in and the column springs open (560 ms).
  // Only a click on the button travels: a viewport change, the phone menu and reduced motion switch at once.
  const want = !!rail && !drawer;
  const [r, setLay] = useState(want), [nar, setNar] = useState(want), [anim, setAnim] = useState(null);
  const sbEl = useRef(null), flipFrom = useRef(null), byHand = useRef(false), t1 = useRef(0), t2 = useRef(0), was = useRef(want);
  const ms = v => parseFloat(getComputedStyle(sbEl.current).getPropertyValue(v)), cv = v => getComputedStyle(sbEl.current).getPropertyValue(v).trim();
  const rects = () => { const m = {}; sbEl.current.querySelectorAll('[data-fl]').forEach(el => { m[el.dataset.fl] = el.getBoundingClientRect(); }); return m; };
  useEffect(() => {
    if (was.current === want) return; was.current = want; clearTimeout(t1.current); clearTimeout(t2.current);
    const hand = byHand.current; byHand.current = false;
    if (!hand || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { flipFrom.current = null; setAnim(null); setNar(want); setLay(want); return; }
    if (want) { setNar(true); setAnim('collapsing');
      t1.current = setTimeout(() => { flipFrom.current = { before: rects(), dur: '--aim-dur-base' }; setLay(true); }, ms('--aim-dur-quick'));
      t2.current = setTimeout(() => setAnim(null), ms('--aim-dur-move') + 80);
    } else { flipFrom.current = r ? { before: rects(), dur: '--aim-dur-move' } : null; setLay(false); setNar(false); setAnim('expanding'); t2.current = setTimeout(() => setAnim(null), ms('--aim-dur-spring') + 80); }
  }, [want]);
  useLayoutEffect(() => {
    const f = flipFrom.current; if (!f) return; flipFrom.current = null;
    sbEl.current.querySelectorAll('[data-fl]').forEach(el => { el.getAnimations().forEach(x => x.cancel()); const a = f.before[el.dataset.fl], b = el.getBoundingClientRect(); if (!a || !a.width || !b.width) return;
      const dx = a.left - b.left, dy = a.top - b.top; if (!dx && !dy) return;
      try { el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: ms(f.dur), easing: cv('--aim-ease') }); } catch (err) {} });
  }, [r]);
  useEffect(() => () => { clearTimeout(t1.current); clearTimeout(t2.current); }, []);
  // `nm-focus` is the mockup's name for this sidebar; its stylesheet keys today's sidebar's own fade on its absence.
  return <aside ref={sbEl} className={'sb' + (r ? ' rail' : '') + (nar ? ' nar' : '') + (anim ? ' a-' + anim : '') + ' nm-focus'}>
    <div className="sb-top"><Wordmark short={nar} />{drawer && <><span className="sp" /><button className="ib" aria-label="Close menu" onClick={close}><I n="x" s={20} /></button></>}</div>
    <CtxSwitch r={r} />
    <nav className={'nav' + (!r ? ' snf' : '')} aria-label="Admin">
      {masq && <button className={'ni' + (route.s === 'as' ? ' on' : '')} title="Learner view" onClick={() => go('as')}><I n="eye" />{!r && <>Learner view<span className="ct" style={{ background: 'var(--warnb)', borderColor: '#EBD9A8', color: 'var(--warn)' }}>Live</span></>}</button>}
      {NAV.map(([g, items], gi) => {
        const vis = items.filter(n => !n[2] || can(n[2])); if (!vis.length) return null;
        const has = vis.some(n => n[0] === active);
        if (SOLO[g] && r) return <button key={g} className={'ni' + (has ? ' on' : '')} title={g} aria-label={g} aria-current={has ? 'page' : undefined} onClick={() => go(vis[0][0])}><span className="fl" data-fl={g}><I n={GIC[g]} /></span></button>;
        if (SOLO[g]) return <button key={g} className={'gx solo' + (has ? ' has' : '')} aria-current={has ? 'page' : undefined} onClick={() => go(vis[0][0])}><span className="fl" data-fl={g}><I n={GIC[g]} /></span><span className="el">{g}</span>{badge(vis[0]) && <span className={'rb' + (vis[0][0] === 'cohort' && P3C.draft ? ' dr' : '')}>{badge(vis[0])}</span>}</button>;
        if (r) return <Menu key={g} rt trigger={(t, o) => <button className={'ni' + (has ? ' on' : '')} title={g} aria-label={g + ' menu'} aria-expanded={o} onClick={t}><span className="fl" data-fl={g}><I n={GIC[g]} /></span></button>} items={vis.map(n => ({ l: n[1], ic: n[0], on: active === n[0], fn: () => go(n[0]) }))} />;
        const opn = peek === undefined ? has : peek === g, roll = vis.find(n => badge(n));
        return <div key={g} className={g === 'Operations' ? 'gsep' : undefined}><button className={'gx' + (has ? ' has' : '') + (opn ? ' op' : '')} aria-expanded={opn} onClick={() => setPeek(opn ? null : g)}><span className="fl" data-fl={g}><I n={GIC[g]} /></span><span className="el">{g}</span>{!opn && roll && <span className={'rb' + (roll[0] === 'incidents' ? ' bad' : '')}>{badge(roll)}</span>}<span className="cv"><I n="chev" s={12} w={2.2} /></span></button>
          <div className={'gw' + (opn ? ' op' : '')}><div className="gwi"><div className="gkids">{vis.map(n => <button key={n[0]} tabIndex={opn ? 0 : -1} className={'gk' + (active === n[0] ? ' on' : '')} aria-current={active === n[0] ? 'page' : undefined} onClick={() => go(n[0])}><span className="el">{n[1]}</span>{badge(n) && <span className={'ct' + (n[0] === 'incidents' ? ' bad' : '')}>{badge(n)}</span>}</button>)}</div></div></div></div>;
      })}
    </nav>
    <div className="sb-ft">
      {!ph && <button className="ni" title={r ? 'Expand sidebar' : undefined} aria-label={r ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => { byHand.current = true; setRail(!nar); }}><span className="fl" data-fl="panel"><I n="panel" /></span>{!r && <span className="lb">Collapse sidebar</span>}</button>}
      <div className="uc" title={r ? staff.n + ' · ' + staff.role : undefined}><span className="av" data-fl="av">{ini(staff.n)}</span>{!r && <span className="col" style={{ gap: 0 }}><span className="w5" style={{ fontSize: ph ? 16 : 13, lineHeight: ph ? '22px' : '18px' }}>{staff.n}</span><span style={{ fontSize: ph ? 16 : 12, lineHeight: ph ? '22px' : '16px', color: 'var(--f3)' }}>{staff.role}</span></span>}</div>
    </div>
  </aside>;
}

function AdminRedesign() {
  const [vp, setVp] = useState(1280), [ds, setDs] = useState('default'), [role, setRole] = useState('Owner'), [started, setStarted] = useState(true);
  const [route, setRoute] = useState(routeOf('curriculum'));
  const [masq, setMasq] = useState(null), [mq, setMq] = useState(null), [blocked, setBlocked] = useState(null);
  const [dlg, setDlg] = useState(null), [pal, setPal] = useState(false), [drawer, setDrawer] = useState(false), [tst, setTst] = useState(null), [prev, setPrev] = useState(null);
  const [audit, setAudit] = useState(AUDIT0), [perms, setPerms] = useState(PERMS0), [inc, setInc] = useState({}), [mods, setMods] = useState(MODS0);
  const [railP, setRailP] = useState(null);
  const [box, setBox] = useState({ w: 1312, h: 832 });
  const stage = useRef(null), mainRef = useRef(null), tt = useRef(null);
  const ph = vp < 768, lap = vp >= 768 && vp < 1200;
  const rail = railP === null ? lap : railP;
  const staff = STAFF[ROLES.indexOf(role)];
  const can = k => { const p = perms.find(x => x[0] === k); return !!p && !!p[2][ROLES.indexOf(role)]; };
  const toast = m => { setTst(m); clearTimeout(tt.current); tt.current = setTimeout(() => setTst(null), 3200); };
  const log = (act, tg, d) => setAudit(a => [{ t: 'Just now', actor: staff.n, act, tg, d: d || '' }, ...a]);
  const go = (s, id, tab) => { setRoute(routeOf(s, id, tab)); setDrawer(false); if (mainRef.current) mainRef.current.scrollTop = 0; };
  const guard = (perm, label, fn) => {
    if (masq) { log('masquerade.blocked_action', masq.u.n, 'Tried: ' + label + '.'); setBlocked(label); return; }
    if (!can(perm)) { toast('Your role (' + role + ") can't do this: " + label); return; }
    fn();
  };
  const startMasq = u => { if (masq) return toast('Exit the current masquerade session first'); if (!can('masq')) return toast("Your role (" + role + ") can't start masquerade"); setMq({ u, mode: 'start' }); };
  const endMasq = why => { if (!masq) return; log('masquerade.stop', masq.u.n, why + '.'); setMasq(null); setBlocked(null); toast('Masquerade ended. You are ' + staff.n + ' again.'); setRoute(r => r.s === 'as' ? routeOf('masquerade') : r); };
  const on = !!masq, left = masq ? masq.left : null;
  useEffect(() => { if (!on) return; const t = setInterval(() => setMasq(m => m && { ...m, left: m.left - 1 }), 1000); return () => clearInterval(t); }, [on]);
  useEffect(() => { if (on && left <= 0) endMasq('Expired after time limit'); }, [left]);
  useEffect(() => {
    if (!document.getElementById('arx-font')) { const l = document.createElement('link'); l.id = 'arx-font'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap'; document.head.appendChild(l); }
    const el = stage.current; const f = () => setBox({ w: el.clientWidth, h: el.clientHeight }); f();
    const ro = new ResizeObserver(f); ro.observe(el);
    const key = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal(p => !p); } if (e.key === 'Escape') { setPal(false); setDrawer(false); setDlg(null); setBlocked(null); setPrev(null); } };
    window.addEventListener('keydown', key);
    return () => { ro.disconnect(); window.removeEventListener('keydown', key); };
  }, []);
  const sc = Math.min(1, (box.w - 32) / vp);
  const fh = Math.round(ph ? Math.min(844, Math.max(640, (box.h - 32) / sc)) : Math.max(640, (box.h - 32) / sc));
  const navItem = NAV.flatMap(g => g[1]).find(n => n[0] === (PARENT[route.s] || route.s));
  const group = (NAV.find(g => g[1].includes(navItem)) || [])[0];
  const Screen = SCREENS[route.s];
  const ctx = { ph, lap, wide: vp >= 1400, ds, setDs, role, can, staff, route, go, masq, startMasq, endMasq, guard, toast, log, setDlg, audit, perms, setPerms, inc, setInc, setPal, started, mods, setMods, setPrev };
  const pick = v => { const jan = { january: 'cohortov', janschedule: 'cohorts', jansettings: 'cohortset' }[v]; P3C = jan ? P3_COH.jan27 : P3_COH.dec26; go(jan || v, { workspace: 'ws_northshore', user: 'u_1042', incident: 'INC-0007' }[v]); };
  return <div className="arx">
    <style>{CSS}</style>
    <div className="mk" role="toolbar" aria-label="Mockup controls">
      <span style={{ fontWeight: 600 }}>Mockup</span>
      <span className="sg">{[1440, 1280, 1024, 390].map(v => <button key={v} className={vp === v ? 'on' : ''} onClick={() => { setVp(v); setRailP(null); }}>{v}</button>)}</span>
      <select aria-label="Screen" value={P3C.draft && route.s === 'cohort' ? { overview: 'january', schedule: 'janschedule', settings: 'jansettings' }[route.tab] || aliasOf(route) : aliasOf(route) || route.s} onChange={e => pick(e.target.value)}>
        <optgroup label="Overview"><option value="overview">Overview</option></optgroup>
        <optgroup label="Program"><option value="curriculum">Curriculum</option><option value="course">Course Settings</option><option value="vault">Resource Vault</option></optgroup>
        <optgroup label="Cohort"><option value="cohortov">Overview</option><option value="cohorts">Schedule</option><option value="learners">People</option><option value="community">Community</option><option value="announce">Announcements</option><option value="cohortset">Settings</option><option value="newcohort">New cohort</option><option value="january">January, created (Overview)</option><option value="janschedule">January, created (Schedule)</option><option value="jansettings">January, created (Settings)</option></optgroup>
        <optgroup label="People"><option value="users">Everyone</option><option value="workspaces">Teams</option><option value="utah">Utah Life</option><option value="masquerade">Masquerade</option></optgroup>
        <optgroup label="Revenue"><option value="billing">Summary</option><option value="payments">Payments</option><option value="tiers">Plans &amp; Upgrades</option><option value="usage">Usage</option></optgroup>
        {NAV.filter(g => !SOLO[g[0]]).map(g => <optgroup key={g[0]} label={g[0]}>{g[1].map(n => <option key={n[0]} value={n[0]}>{n[1]}</option>)}</optgroup>)}
        <optgroup label="Detail and system"><option value="builder">Program › a week (Module Builder)</option><option value="workspace">Workspace detail</option><option value="user">User detail</option><option value="incident">Incident detail</option><option value="as">Learner view (masquerade)</option><option value="missing">404</option><option value="denied">Access denied</option></optgroup>
      </select>
      <select aria-label="Data state" value={ds} onChange={e => setDs(e.target.value)}><option value="default">State: default</option><option value="loading">State: loading</option><option value="empty">State: empty</option><option value="error">State: error</option></select>
      <select aria-label="Role" value={role} onChange={e => setRole(e.target.value)}>{ROLES.map(r => <option key={r} value={r}>Role: {r}</option>)}</select>
      <select aria-label="Cohort" value={started ? '1' : '0'} onChange={e => setStarted(e.target.value === '1')}><option value="1">Cohort: Week 2</option><option value="0">Cohort: before start</option></select>
      <button className={masq ? 'on' : ''} onClick={() => masq ? endMasq('Exited by staff') : (setMasq({ u: USERS[0], reason: 'Customer reports Week 2 steps are out of order.', left: 900, granted: 900 }), log('masquerade.start', USERS[0].n, 'Reason: Customer reports Week 2 steps are out of order.'))}>Masquerade</button>
      <button onClick={() => setPal(true)}>⌘K palette</button>
    </div>
    <div className="stg" ref={stage}><div className="hold" style={{ width: vp * sc, height: fh * sc }}>
      <Ctx.Provider value={ctx}>
        <div className={'ax' + (ph ? ' ph' : '') + (lap ? ' lap' : '') + (vp >= 1400 ? ' wide' : '') + (masq ? ' msq' : '')} style={{ width: vp, height: fh, transform: 'scale(' + sc + ')' }}>
          {masq && <div className="mq" role="status">
            <div className="who col" style={{ gap: 0 }}><span className="w6 el">Masquerading as {masq.u.n}{!ph && ' · ' + masq.u.ws}</span>{!ph && <span className="el" style={{ fontSize: 12, lineHeight: '16px' }}>Reason: {masq.reason} All writes are blocked.</span>}</div>
            <span className="mo w5" style={{ whiteSpace: 'nowrap', flex: ph ? 1 : 'none' }} aria-label="Time remaining">{fmt(masq.left)} left</span>
            <Btn disabled={masq.granted >= 3600} title={masq.granted >= 3600 ? '60-minute maximum reached' : undefined} onClick={() => setMq({ u: masq.u, mode: 'extend' })}>{masq.granted >= 3600 ? 'Max 60 min' : ph ? 'Extend' : 'Extend 15 min'}</Btn><Btn k="p" onClick={() => endMasq('Exited by staff')}>{ph ? 'Exit' : 'Exit masquerade'}</Btn>
          </div>}
          <div className="shell">
            {!ph && <Sidebar rail={rail} setRail={setRailP} />}
            <div className="mainc">
              <header className="tb">
                {ph ? <><button className="ib" aria-label="Open menu" onClick={() => setDrawer(true)}><I n="menu" s={22} /></button><Wordmark /><span className="sp" /><button className="ib" aria-label="Search" onClick={() => setPal(true)}><I n="search" s={20} /></button></>
                  : <><Crumbs />
                    <span className="sp" /><button className="srch" onClick={() => setPal(true)}><I n="search" /><span style={{ flex: 1, textAlign: 'left' }}>Search or jump to…</span><span className="kbd">⌘K</span></button>
                    <span className="st ok" style={{ fontSize: 13, color: 'var(--f2)' }}><i />Production</span></>}
              </header>
              <main className="main" ref={mainRef}>
                {!Screen ? <NotFound /> : route.s === 'denied' || (navItem && navItem[2] && !can(navItem[2])) ? <Denied what={route.s === 'denied' ? null : navItem[1]} /> : <Screen key={route.s + (route.id || '') + (route.tab || '')} />}
              </main>
            </div>
          </div>
          {drawer && <><div className="scrim" onClick={() => setDrawer(false)} /><div className="drw" role="dialog" aria-modal="true" aria-label="Admin menu"><Sidebar drawer close={() => setDrawer(false)} /></div></>}
          {pal && <Palette />}
          {dlg && <Confirm d={dlg} onClose={() => setDlg(null)} />}
          {prev && <Modal title="Preview as Learner" onClose={() => setPrev(null)} foot={<><Btn onClick={() => setPrev(null)}>Cancel</Btn><Btn k="p" onClick={() => { setPrev(null); toast('Preview opened in a new tab'); }}>Open preview</Btn></>}>
            <p className="s2">Opens "{prev.n}" in a new tab as a learner on the {prev.tier === 'both' ? 'Agent' : 'Team'} Tier would see it.</p>
            <p className="me">Read-only and local to that tab. This is not masquerade: you stay signed in as yourself and nothing is audit-logged.</p>
          </Modal>}
          {mq && <ReasonModal mq={mq} onCancel={() => setMq(null)} onGo={r => {
            if (mq.mode === 'extend') { setMasq(m => ({ ...m, left: m.left + 900, granted: m.granted + 900, reason: r })); log('masquerade.extend', mq.u.n, 'Reason: ' + r); toast('Extended by 15 minutes'); }
            else { setMasq({ u: mq.u, reason: r, left: 900, granted: 900 }); log('masquerade.start', mq.u.n, 'Reason: ' + r); go('as'); }
            setMq(null);
          }} />}
          {blocked && masq && <Modal title="Blocked while masquerading" onClose={() => setBlocked(null)} foot={<><Btn onClick={() => setBlocked(null)}>Close</Btn><Btn k="p" onClick={() => endMasq('Exited by staff')}>Exit masquerade</Btn></>}>
            <div className="note row nw"><I n="lock" /><span className="w5">{blocked}</span></div>
            <p className="s2">You are signed in as {masq.u.n}. Every write is blocked until you exit: edits, publishes, refunds, exports, retries, and notes.</p>
            <p className="me">This attempt was added to the audit log.</p>
          </Modal>}
          {tst && <div className="toast" role="status"><span style={{ color: 'var(--mint)', display: 'flex' }}><I n="check" /></span>{tst}</div>}
        </div>
      </Ctx.Provider>
    </div></div>
  </div>;
}

export default AdminRedesign;
