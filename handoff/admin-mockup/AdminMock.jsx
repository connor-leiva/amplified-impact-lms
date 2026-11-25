/* HANDOFF COPY (Nov 15, 2026): signed-off Round 2 mockup + the two review nits resolved before generating ref/:
   (1) Cohorts & Sessions Attendance "—" is muted (.mu) like Replay's "—";
   (2) phone Overview Live attendance labels use a fixed 124px column (same as desktop) so all bars start at the same x.
   Nit 3 (row numbers only when the Curriculum table is >= 1100px wide, i.e. 1440) is intended and unchanged.
   Everything else is byte-identical to the signed-off export (see BUILD-SPEC.md for its sha256). */
/* Amplified Impact LMS — Admin redesign, round 2. One file: admin + console screens.
   Notes: "Design notes.md". Fonts: Geist + Geist Mono from Google Fonts for the mock; the product self-hosts. */
import React from 'react';
import LOGO_APP from './logos/amplified-impact-academy-app.svg';
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
.mu{color:var(--f3)}.s2{color:var(--f2)}.me{font-size:var(--m);line-height:var(--ml);color:var(--f3)}.w5{font-weight:500}.w6{font-weight:600}
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
.ph .g2,.ph .g3,.ph .gms{grid-template-columns:minmax(0,1fr)}.ph .g4,.ph .g5{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
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
.ph .fx{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.ph .fx>div{padding:12px 10px 12px 12px;min-width:0}.ph .fx>div>span:last-child{font-size:15px}.ph .fx>div>span{max-width:100%;overflow:hidden;text-overflow:ellipsis}.ph .fx>div:last-child:nth-child(odd),.ph .fx>div.fxw{grid-column:1/-1}
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

/* added (Nov 2026) for the intake and turned-in screens */
.qa{display:grid;grid-template-columns:minmax(150px,220px) minmax(0,1fr);gap:8px 20px;padding:14px 20px;border-top:1px solid var(--line)}
.qa p{margin:0;max-width:720px}
.ph .qa{grid-template-columns:minmax(0,1fr);padding:14px 16px}
.qkv{display:grid;grid-template-columns:minmax(0,1fr);gap:4px;margin:0}
.qkv dt{color:var(--f3);display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.qkv dd{margin:0 0 14px;min-width:0;overflow-wrap:break-word;max-width:720px}
.qkv dd:last-child{margin-bottom:0}
.fls{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.fls li{display:flex;align-items:center;gap:8px;min-width:0}
.fls svg{flex:none;color:var(--f3)}
.rq{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:8px 0 8px 22px;border-top:1px solid var(--line)}
.rq>span:last-child{flex:none;color:var(--f2)}
.ty{display:grid;grid-template-columns:minmax(0,1fr) 72px 20px;align-items:center;gap:10px;color:var(--f2)}
.ty .tn{text-align:right;color:var(--ink)}
/* the question reader: the form's questions on the left, every team's answer to the chosen one on the right */
.qr{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);align-items:start}
.ql{display:flex;flex-direction:column;gap:1px;padding:8px;border-right:1px solid var(--line);position:relative;max-height:520px;overflow-y:auto;scrollbar-width:thin;align-self:stretch}
.qls{padding:14px 10px 4px;font-size:var(--m);line-height:var(--ml);color:var(--f3)}
.qls:first-child{padding-top:6px}
.qli{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;width:100%;padding:7px 10px;border:0;background:none;border-radius:8px;font:inherit;line-height:20px;color:var(--f2);text-align:left;cursor:pointer}
.qli>.tn{flex:none;font-size:var(--m);color:var(--f3)}
.qli:hover{background:var(--sub);color:var(--ink)}
.qli.on{background:var(--tint);color:var(--for);font-weight:500}
.qli.on>.tn{color:var(--for)}
.qrh{display:flex;flex-direction:column;gap:2px;padding:16px 20px 18px}
.qrh h3{margin:0;font:600 var(--sh)/22px Geist,sans-serif;color:var(--ink)}
.qrd>.qa:last-child{border-bottom:0}
.cdh .ib:disabled{opacity:.35;cursor:default;background:none}
.ph .qr{grid-template-columns:minmax(0,1fr)}
.ph .ql{border-right:0;border-bottom:1px solid var(--line);max-height:264px}
.ph .qli{padding:11px 10px}
/* community: a post's words, and a post or thread only staff can see */
.cmb{display:grid;gap:10px;max-width:720px}.cmb p{margin:0;overflow-wrap:break-word}
.cmh{background:var(--hov);border-style:dashed}
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
/* ---- Nov 25: program, cohort, people, revenue ---- */
/* a fact that opens the list it counts */
.fx>.fxl{background:var(--sf);border:0;padding:12px 34px 12px 20px;display:flex;flex-direction:column;gap:2px;flex:1 0 auto;max-width:100%;white-space:nowrap;text-align:left;cursor:pointer;position:relative;color:inherit;transition:background-color .12s}
.fx>.fxl:hover{background:var(--hov)}.fx>.fxl>svg{position:absolute;right:14px;top:50%;margin-top:-6px;color:var(--line2);transition:color .12s,transform .12s}.fx>.fxl:hover>svg{color:var(--for);transform:translateX(2px)}
.ph .fx>.fxl{padding:12px 26px 12px 12px;min-width:0}.ph .fx>.fxl>span{max-width:100%;overflow:hidden;text-overflow:ellipsis}.ph .fx>.fxl>span:nth-child(2){font-size:15px}.ph .fx>.fxl>svg{right:8px}
.ph .fx>.fxl:last-child:nth-child(odd){grid-column:1/-1}.ph .fx>.fxw{grid-column:1/-1}
.stat{transition:border-color .12s,box-shadow .12s}button.stat{cursor:pointer;position:relative}button.stat:hover{border-color:var(--line2);box-shadow:0 2px 8px rgba(21,33,29,.06)}
button.stat::after{content:"";position:absolute;right:14px;top:18px;width:6px;height:6px;border-right:1.5px solid var(--line2);border-top:1.5px solid var(--line2);transform:rotate(45deg);transition:border-color .12s}button.stat:hover::after{border-color:var(--for)}
/* the cohort picker: in a page's title on This cohort, beside it elsewhere */
.cpk{display:inline-flex;align-items:center;gap:8px;height:var(--c);padding:0 8px 0 6px;border:1px solid var(--line2);border-radius:8px;background:var(--sf);font-size:calc(var(--t) - 1px);font-weight:500;color:var(--ink);cursor:pointer;max-width:100%;box-shadow:0 1px 1px rgba(21,33,29,.04)}
.cpk:hover{background:var(--hov)}.cpk>svg{color:var(--f3);flex:none}.cpk img{border-radius:5px;flex:none}
.cpk.big{height:auto;padding:2px 8px 2px 0;margin:-2px 0;border-color:transparent;background:none;box-shadow:none;font:inherit;letter-spacing:inherit;border-radius:8px;gap:6px}
.cpk.big:hover{background:var(--sub)}.cpk.big:hover>svg{color:var(--ink)}
.hd h1 .menu{max-width:100%}
/* a section list down the left, one section on screen at a time */
.srg{display:grid;grid-template-columns:216px minmax(0,1fr);gap:24px;align-items:start}.ph .srg{grid-template-columns:minmax(0,1fr);gap:16px}
.srl{display:flex;flex-direction:column;gap:1px;position:sticky;top:0}
.srb{display:flex;align-items:center;gap:8px;height:var(--c);padding:0 10px;border:0;background:none;border-radius:8px;font-size:calc(var(--t) - 1px);color:var(--f2);cursor:pointer;text-align:left}
.srb:hover{background:var(--sub);color:var(--ink)}.srb.on{background:var(--tint);color:var(--for);font-weight:500}.srb .el{flex:1}.srb .tn{font-size:var(--m);color:var(--f3);font-weight:400}
.fat{font-weight:400;font-size:var(--m);line-height:var(--ml);color:var(--f3);margin-top:-4px}
textarea.in{height:auto;padding:8px 10px;line-height:var(--tl);resize:vertical}
.lns{display:flex;flex-direction:column;gap:6px}.ln{display:flex;align-items:center;gap:4px}.ln .in{flex:1;font-weight:400}
.grp{display:flex;align-items:center;justify-content:center;width:20px;height:var(--c);color:var(--line2);cursor:grab;flex:none}.wkr:hover .grp,.ln:hover .grp{color:var(--f3)}
/* a week, a step, anything in an ordered list that opens */
.wkl{display:flex;flex-direction:column}.wkl>*+*{border-top:1px solid var(--line)}
.wkr{display:flex;align-items:center;gap:12px;padding:10px 12px 10px 8px;min-height:60px}.ph .wkr{flex-wrap:wrap;padding:12px 12px 12px 16px;gap:8px 12px}
.wkr.stp{padding-left:12px}.wkr:hover{background:var(--hov)}
.wn{width:28px;height:28px;border-radius:8px;background:var(--tint);color:var(--for);font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;flex:none;font-variant-numeric:tabular-nums}
.wn.off{background:var(--sub);color:var(--f3)}.wn.sm{width:24px;height:24px;border-radius:6px;font-size:12px;background:var(--sub);color:var(--f2)}
.wkm{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;border:0;background:none;padding:0;text-align:left;cursor:pointer;color:inherit;border-radius:4px}
.wkm:hover .w5{color:var(--for);text-decoration:underline;text-decoration-color:var(--mint);text-underline-offset:3px}
.wkc{flex:0 0 104px;display:flex;flex-direction:column;min-width:0;font-size:calc(var(--t) - 1px)}.wkc.wkd{flex-basis:172px}.stp .wkc{flex:0 0 196px}.stp .wkc .row{flex-wrap:nowrap}.ph .stp .wkc{flex:1 1 auto}.wks{flex:0 0 96px;display:flex;justify-content:flex-start;font-size:calc(var(--t) - 1px)}
.lap .wkc{flex-basis:120px}.lap .wkc.wkd{display:none}
.rdn{flex:none;white-space:nowrap;text-align:right;min-width:44px}
/* on a phone a row is two lines: what it is and its menu, then when and where it stands */
.ph .wkr .wn{order:0}.ph .wkm{order:1;flex:1 1 calc(100% - 100px)}.ph .wkr>.menu{order:2}.ph .wkc{display:none}.ph .wkc.wkd,.ph .stp .wkc{display:flex;order:3;flex:1 1 auto;margin-left:40px}.ph .stp .wkc{margin-left:36px}.ph .wks{order:4;flex:0 0 auto;align-items:center}
.ph .chs{flex-wrap:nowrap;overflow-x:auto;margin:0 -16px;padding:0 16px 2px;scrollbar-width:none}.ph .chs::-webkit-scrollbar{display:none}.ph .ch{flex:none}
/* a row that opens something: a card's link row, a needs-you row, a readiness row */
.rnw,.nyr,.rdy{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;text-align:left;cursor:pointer;color:inherit;font-size:calc(var(--t) - 1px)}
.rnw{padding:8px;margin:-4px -8px;width:calc(100% + 16px);border-radius:8px}.rnw:hover{background:var(--sub)}.rnw>svg:last-child,.nyr>svg:last-child{color:var(--line2);flex:none}.rnw:hover>svg:last-child,.nyr:hover>svg:last-child{color:var(--for)}
.rnw img{border-radius:8px;flex:none}
.nyr{padding:12px 16px 12px 20px;min-height:60px}.nyr:hover{background:var(--hov)}.nyr.rn{min-height:52px;padding-block:8px}
.nyr.now{background:linear-gradient(90deg,var(--tint),transparent 60%)}
.mt.bad{background:var(--badb);color:var(--bad)}.mt.warn{background:var(--warnb);color:var(--warn)}.mt.off{background:var(--sub);color:var(--f3)}
.rdy{padding:6px 8px;margin:-2px -8px;width:calc(100% + 16px);border-radius:8px;gap:10px}.rdy:hover{background:var(--sub)}
.dt{width:36px;height:40px;border-radius:8px;border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;line-height:1}.dt b{font-size:15px;font-weight:600}.dt span{font-size:10px;color:var(--f3);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
/* unsaved changes: one bar, at the bottom of what you are editing */
.svb{position:sticky;bottom:16px;display:flex;align-items:center;gap:8px;padding:10px 12px 10px 16px;background:var(--ink);color:#F4F2EC;border-radius:12px;box-shadow:0 8px 24px rgba(21,33,29,.18);font-size:calc(var(--t) - 1px);z-index:3}
.svb .b{border-color:#47534E;background:#202D28;color:#F4F2EC;box-shadow:none}.svb .b:hover{background:#2A3832}.svb .b.p{background:var(--mint);border-color:var(--mint);color:var(--ink)}.svb .b.p:hover{background:#86DDB5}
/* audiences: chips to filter by, a bar to see the split */
.chs{display:flex;flex-wrap:wrap;gap:6px}
.ch{display:inline-flex;align-items:center;gap:7px;height:var(--c);padding:0 12px;border:1px solid var(--line2);border-radius:999px;background:var(--sf);font-size:calc(var(--t) - 1px);font-weight:500;color:var(--f2);cursor:pointer}
.ch:hover{color:var(--ink);background:var(--hov)}.ch.on{background:var(--ink);border-color:var(--ink);color:#fff}.ch i,.pl.aud i,.auk>i,.lg i{width:8px;height:8px;border-radius:2px;flex:none;display:block}
.ch .tn{font-weight:400;color:var(--f3)}.ch.on .tn{color:#C9D2CD}
.aub{display:flex;gap:2px;height:10px;border-radius:5px;overflow:hidden}.aub i{display:block;min-width:4px}
.aul{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}.lap .aul{grid-template-columns:repeat(3,minmax(0,1fr))}.ph .aul{grid-template-columns:repeat(2,minmax(0,1fr))}
.auk{display:flex;align-items:flex-start;gap:8px;padding:8px;margin:0 -8px 0 0;border:0;background:none;border-radius:8px;text-align:left;cursor:pointer;color:inherit}.auk:hover{background:var(--sub)}.auk>i{margin-top:8px}.auk .w5{font-size:17px;line-height:24px}
/* revenue: cash by month */
.rvc{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;align-items:end;height:300px}.ph .rvc{gap:6px;height:180px}
.rvm{display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;min-width:0}.rvb{flex:1;width:100%;max-width:72px;display:flex;align-items:flex-end;border-bottom:1px solid var(--line)}
.rvb i{display:block;width:100%;border-radius:6px 6px 0 0;background:var(--for)}
.hat{background:repeating-linear-gradient(135deg,#BFE3D0 0 6px,#E7F1EB 6px 12px)!important}
.lg{display:inline-flex;align-items:center;gap:6px;font-size:var(--m);color:var(--f2)}.ph .rvm .me{font-size:11px}
/* ---- Nov 25, second pass: offerings, a new offering, setup, a new cohort ---- */
.ptl{display:flex;align-items:center;justify-content:center;flex:none;border:1.5px dashed var(--line2);background:var(--hov);color:var(--f3);font-weight:600;line-height:1}
.nyr.ofr{min-height:72px;gap:16px}.ofc{flex:0 0 220px;font-size:calc(var(--t) - 1px)}.lap .ofc:nth-of-type(2){display:none}.ph .nyr.ofr{flex-wrap:wrap}.ph .ofc{flex:1 1 100%;padding-left:56px}
.sgm{display:inline-flex;border:1px solid var(--line2);border-radius:8px;overflow:hidden;background:var(--sf);align-self:flex-start}
.ph .sgm button{padding:0 9px}.sgm button{white-space:nowrap;height:var(--c);padding:0 12px;border:0;border-right:1px solid var(--line2);background:none;font-size:calc(var(--t) - 1px);font-weight:500;color:var(--f2);cursor:pointer}.sgm button:last-child{border-right:0}
.sgm button:hover{background:var(--hov)}.sgm button.on{background:var(--tint);color:var(--for)}
.stp2{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line2);border-radius:8px;background:var(--sf);align-self:flex-start;height:var(--c)}.stp2 b{min-width:28px;text-align:center;font-weight:600}.stp2 .ib{height:calc(var(--c) - 2px);font-size:16px}.stp2 .ib:disabled{opacity:.35;cursor:default}
.slt .in{flex:1 1 0;min-width:0;font-weight:400}.ph .slt{flex-wrap:wrap}.ph .slt .in{flex:1 1 40%}
.ckr{display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:calc(var(--t) - 1px)}.ckr input{margin:3px 0 0;width:16px;height:16px;accent-color:var(--for);flex:none}
.opt{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border:1px solid var(--line2);border-radius:10px;background:var(--sf);text-align:left;cursor:pointer;color:inherit;font-size:calc(var(--t) - 1px)}
.opt:hover{background:var(--hov)}.opt.on{border-color:var(--for);box-shadow:0 0 0 1px var(--for);background:var(--tint)}
.skf{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}.skf>div{background:var(--sf);padding:10px 12px;display:flex;flex-direction:column}.skf b{font-size:20px;line-height:26px;font-weight:600}
.skl,.ncl{display:flex;flex-direction:column;gap:6px}.skw{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.skc{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:6px;background:var(--tint);color:var(--for);font-size:var(--m);font-weight:500;white-space:nowrap}
.skc.alt{background:var(--infob);color:var(--info)}.skc.off{background:var(--sub);color:var(--f3)}.skc.bad{background:var(--badb);color:var(--bad)}
.ncl{max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:10px 12px;gap:10px;font-weight:400}.ncw{display:flex;align-items:flex-start;gap:10px}
.thn{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;color:var(--f2);font-size:calc(var(--t) - 1px)}
.tdc{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line2);display:flex;align-items:center;justify-content:center;flex:none;color:#fff}
.tdo.ok .tdc{background:#2E9A63;border-color:#2E9A63}.tdo.ok .w5{color:var(--f2);font-weight:400}div.tdo{cursor:default}div.tdo:hover{background:none}
/* the program's own tile (program-logo.ts, variant "tile"), never under 32px */
.sw img.tile{width:32px;height:32px;border-radius:0;background:none}
/* in the rail the switcher sits on the same centre line as the logo and the icons */
.sb>.menu{display:flex}.sb .sw{margin:0 8px 8px}.sb.rail>.menu{justify-content:center}.sb.rail .sw{margin:0 0 8px;width:36px}.ph .sw img.tile{width:36px;height:36px}
/* ---- third pass: four pages with tabs ---- */
.area>.atb{display:flex;flex-direction:column;gap:20px;min-width:0}.ph .area>.atb{gap:16px}
.area .atb .pg{padding:0;max-width:none;margin:0}
.shd{display:flex;gap:12px 16px;align-items:center;justify-content:space-between;flex-wrap:wrap}.shd>p{max-width:720px;margin:0}.shd .b{height:var(--cp);padding:0 14px}
.sgm.stb{flex:none}.sgm .tn{margin-left:6px;font-weight:400;color:var(--f3)}.sgm button.on .tn{color:var(--for)}
.area>.tabs{overflow-x:auto;scrollbar-width:none}.area>.tabs .tab{white-space:nowrap;flex:none}
/* the sidebar's single rows, and the hairline above the system pages */
.gx.solo .rb{margin-left:auto}.gx .rb.dr{color:var(--warn)}
.gsep{margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
/* Overview: the four things, each a link */
.thr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.lap .thr{grid-template-columns:repeat(2,minmax(0,1fr))}.ph .thr{grid-template-columns:minmax(0,1fr);gap:12px}
.thl{display:flex;flex-direction:column;gap:4px;align-items:stretch;text-align:left;padding:14px 16px 16px;cursor:pointer;color:inherit;transition:border-color .12s,box-shadow .12s;min-width:0}
.thl:hover{border-color:var(--line2);box-shadow:0 2px 8px rgba(21,33,29,.06)}
.tlk{display:flex;align-items:center;gap:8px;font-size:var(--m);font-weight:500;color:var(--f2);margin-bottom:6px}.tlk .mt{width:24px;height:24px;border-radius:6px}.tlk .mt svg{width:14px;height:14px}
.tlk>svg:last-child{margin-left:auto;color:var(--line2);transition:color .12s,transform .12s}.thl:hover .tlk>svg:last-child{color:var(--for);transform:translateX(2px)}
.thl .fig{font-size:20px;line-height:28px}.thl .me{white-space:normal}
/* a cohort's settings: two columns of cards */
.set2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}.lap .set2,.ph .set2{grid-template-columns:minmax(0,1fr)}
.cfx{display:grid;grid-template-columns:116px minmax(0,1fr);gap:4px 16px;font-size:calc(var(--t) - 1px)}.ph .cfx{grid-template-columns:minmax(0,1fr)}
.cfl{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:2px;font-weight:400}
.cfb{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px 14px;border:1px dashed var(--line2);border-radius:10px;background:var(--hov);font-size:calc(var(--t) - 1px)}
/* picking a cohort's weeks from the program's */
.wpl{display:flex;flex-direction:column}.wpl>*+*{border-top:1px solid var(--line)}
.wpk{display:flex;align-items:center;gap:12px;padding:10px 20px;min-height:56px;cursor:pointer;font-size:calc(var(--t) - 1px)}.wpk:hover{background:var(--hov)}.ph .wpk{padding:10px 16px;flex-wrap:wrap}
.wpk input{width:16px;height:16px;accent-color:var(--for);flex:none;margin:0}.wpk:not(.on) .w5,.wpk:not(.on) .me{color:var(--f3)}.wpk:not(.on) .w5{font-weight:400}
.wn.sm.pk{background:var(--tint);color:var(--for)}
.ewl{display:flex;flex-direction:column;gap:6px;margin-top:2px}.ewr{display:grid;grid-template-columns:24px minmax(0,1fr) 150px 150px;gap:8px;align-items:center;font-weight:400}.ewf{display:block;min-width:0}.ewf .in{min-width:0;width:100%}.ewk{display:none}
.ewh{color:var(--f3);font-size:var(--m);line-height:var(--ml)}
.ph .ewh{display:none}.ph .ewl{gap:14px}.ph .ewr{grid-template-columns:24px minmax(0,1fr);row-gap:6px}.ph .ewf{grid-column:2;display:grid;grid-template-columns:64px minmax(0,1fr);align-items:center}.ph .ewk{display:block;color:var(--f3)}
.ncl.free{max-height:none}
.skc.wrn{background:var(--warnb);color:var(--warn)}
.ngl{padding:8px 20px;font-size:var(--m);line-height:var(--ml);font-weight:500;color:var(--f3);background:var(--hov)}.ph .ngl{padding:8px 16px}
.lk.uin{font-weight:400;color:var(--f2)}.uir{margin:0;width:100%;border:1px solid var(--line);padding:8px 12px}
`;

/* ---------- icons: 24 grid, 1.75 stroke, round caps, drawn at 16 ---------- */
const P = {
  community: 'M4 5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', forms: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
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
Object.assign(P, { program: P.curriculum, course: P.builder, cohort: P.cohorts, sessions: P.play, enrolled: P.learners, people: P.users, teamsall: P.workspaces, groups: P.roles, revenue: P.usage });
const I = ({ n, s = 16, w }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w || (n === 'more' || n === 'grip' ? 2.6 : 1.75)} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d={P[n] || P.file} /></svg>;

/* ---------- sample data (fictional; "today" is Thu, Dec 10, 2026, MST) ---------- */
const MODS0 = [
  { id: 'm1', n: 'Marketing AI Employee', d: 'Paste an MLS listing → Fair-Housing-checked copy', ic: 'announce', tier: 'both', ses: null, st: 'Published', steps: 6, files: 3, dep: 66 },
  { id: 'm2', n: 'Week 0 · Get Ready', d: 'Your accounts, operator, and baseline', ic: 'audit', tier: 'team', ses: null, st: 'Published', steps: 6, files: 2, dep: 91 },
  { id: 'm3', n: 'Week 1 · Know the Business', d: 'A checked view of what your business earns and spends', ic: 'tiers', tier: 'team', ses: ['Session 1 · Lead-Source ROI Live Build', 'Wed, Dec 2 · 12:00 PM MST · Replay ready'], st: 'Published', steps: 6, files: 4, dep: 74 },
  { id: 'm4', n: 'Sales AI Employee', d: 'Paste a new lead → a first reply in your voice', ic: 'bolt', tier: 'both', ses: null, st: 'Published', steps: 6, files: 3, dep: 35 },
  { id: 'm5', n: 'Week 2 · Own the Day', d: 'A ten-minute morning brief from your own data', ic: 'jobs', tier: 'team', ses: ['Session 2 · Morning Brief Live Build', 'Wed, Dec 9 · 12:00 PM MST · Replay ready'], st: 'Published', steps: 6, files: 3, dep: 38 },
  { id: 'm6', n: 'Database AI Employee', d: 'Upload your contact export → ten warm conversations', ic: 'db', tier: 'both', ses: null, st: 'Scheduled', steps: 6, files: 3, opens: 'Opens Dec 14' },
  { id: 'm7', n: 'Week 3 · Work the Database', d: 'Sort your sphere and plan the week of calls', ic: 'learners', tier: 'team', ses: ['Session 3 · Database Live Build', 'Wed, Dec 16 · 12:00 PM MST'], st: 'Scheduled', steps: 6, files: 2, opens: 'Opens Dec 14' },
  { id: 'm8', n: 'Meetings AI Employee', d: 'Paste a meeting transcript → decisions and owners', ic: 'email', tier: 'team', ses: null, st: 'Scheduled', steps: 5, files: 2, opens: 'Opens Dec 21' },
  { id: 'm9', n: 'Week 4 · Run the Meeting', d: 'A weekly meeting that runs from your scorecard', ic: 'cohorts', tier: 'team', ses: ['Session 4 · Scorecard Live Build', 'Wed, Dec 23 · 12:00 PM MST'], st: 'Scheduled', steps: 6, files: 2, opens: 'Opens Dec 21' },
  { id: 'm10', n: 'Finance AI Employee', d: 'Upload a ledger export → spend mapped to a standard chart', ic: 'billing', tier: 'team', ses: null, st: 'Draft', steps: 4, files: 1 },
  { id: 'm11', n: 'Week 5 · Close Clean', d: 'Contract-to-close checklist with dates and owners', ic: 'check', tier: 'team', ses: ['Session 5 · Contract to Close', 'Wed, Dec 30 · 12:00 PM MST'], st: 'Draft', steps: 3, files: 0 },
  { id: 'm12', n: 'Operations AI Employee', d: 'Upload an executed contract → a dated task list', ic: 'jobs', tier: 'team', ses: null, st: 'Draft', steps: 2, files: 0 },
  { id: 'm13', n: 'Week 6 · Hand It Off', d: 'Document each AI Employee so a teammate can run it', ic: 'file', tier: 'team', ses: ['Session 6 · Handoff', 'Wed, Jan 6 · 12:00 PM MST'], st: 'Draft', steps: 2, files: 0 },
  { id: 'm14', n: 'Recruiting AI Employee', d: 'Paste a candidate profile → call prep and questions', ic: 'users', tier: 'team', ses: null, st: 'Draft', steps: 1, files: 0 },
  { id: 'm15', n: 'Listing AI Employee', d: 'Paste seller notes → a listing appointment follow-up', ic: 'vault', tier: 'team', ses: null, st: 'Draft', steps: 1, files: 0 },
];
const WS = [
  { id: 'ws_northline', n: 'Northline Realty', plan: 'AI Accelerator', used: 2, cap: 2, st: 'Active', last: 'Dec 10, 9:14 AM', owner: 'Alex Morgan', mrr: 'One-time', cus: 'cus_Rn1Nrthlne08', sub: '—' },
  { id: 'ws_sampleteam', n: 'Sample Team', plan: 'AI Accelerator', used: 2, cap: 2, st: 'Active', last: 'Dec 9, 3:02 PM', owner: 'Jordan Avery', mrr: 'One-time', cus: 'cus_Rs2SmplTm09', sub: '—' },
  { id: 'ws_northshore', n: 'Northshore Group', plan: 'Team Plan · 41 seats', used: 33, cap: 41, st: 'Active', last: 'Dec 10, 8:52 AM', owner: 'Elena Vargas', mrr: '$1,495', cus: 'cus_Rk3NshoreA1', sub: 'sub_1Qn7NshoreT41' },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', plan: 'Team Plan · 16 seats', used: 15, cap: 16, st: 'Active', last: 'Dec 9, 6:10 PM', owner: 'Jordan Hale', mrr: '$695', cus: 'cus_Rm8HaleMrl02', sub: 'sub_1Qp2HaleT16' },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', plan: 'Agent Plan', used: 46, cap: 50, st: 'Active', last: 'Dec 10, 12:41 AM', owner: 'Noor Haddad', mrr: '$1,450', cus: 'cus_Rj1RedClf03', sub: 'sub_1Qk9RedClfA50' },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', plan: 'AI Accelerator', used: 2, cap: 2, st: 'Active', last: 'Dec 9, 2:15 PM', owner: 'Devon Achterberg', mrr: 'One-time', cus: 'cus_Rp4CoprBsn04', sub: '—' },
  { id: 'ws_tidewater', n: 'Tidewater Property Co.', plan: 'Insiders', used: 1, cap: 1, st: 'Past due', last: 'Dec 4, 9:03 AM', owner: 'Sam Whitlock', mrr: '$97', cus: 'cus_Rg6Tidewtr05', sub: 'sub_1Qh3TidewI1' },
  { id: 'ws_lantern', n: 'Lantern Street Partners', plan: 'Team Plan · 16 seats', used: 6, cap: 16, st: 'Trialing', last: 'Dec 9, 11:27 AM', owner: 'Tessa Lindqvist', mrr: '$0', cus: 'cus_Rt2Lantern06', sub: 'sub_1Qv5LanternT16' },
  { id: 'ws_fourthmeridian', n: 'Fourth Meridian', plan: 'Team Plan · 16 seats', used: 0, cap: 16, st: 'Canceled', last: 'Nov 2, 4:40 PM', owner: 'Priya Raman', mrr: '$0', cus: 'cus_Rb9FourthM07', sub: 'sub_1Qc1FourthT16' },
];
const USERS = [
  { id: 'u_2001', n: 'Alex Morgan', e: 'alex@northlinerealty.example', ws: 'Northline Realty', role: 'Team owner', tier: 'Team', last: 'Dec 10, 9:14 AM', st: 'Active', pr: 1, of: 2 },
  { id: 'u_2002', n: 'Jordan Avery', e: 'jordan@sampleteam.example', ws: 'Sample Team', role: 'Team owner', tier: 'Team', last: 'Dec 9, 3:02 PM', st: 'Active', pr: 1, of: 2 },
  { id: 'u_2003', n: 'Dana Whitlock', e: 'dana@sampleteam.example', ws: 'Sample Team', role: 'Operations lead', tier: 'Team', last: 'Dec 9, 1:40 PM', st: 'Active', pr: 1, of: 2 },
  { id: 'u_1042', n: 'Elena Vargas', e: 'elena@northshoregroup.example', ws: 'Northshore Group', role: 'Team owner', tier: 'Team', last: 'Dec 10, 8:52 AM', st: 'Active', pr: 4, of: 5 },
  { id: 'u_1043', n: 'Marcus Oyelaran', e: 'marcus@northshoregroup.example', ws: 'Northshore Group', role: 'Agent', tier: 'Team', last: 'Dec 9, 4:31 PM', st: 'Active', pr: 3, of: 5 },
  { id: 'u_1061', n: 'Jordan Hale', e: 'jordan@halemarlowe.example', ws: 'Hale & Marlowe Realty', role: 'Team owner', tier: 'Team', last: 'Dec 9, 6:10 PM', st: 'Active', pr: 5, of: 5 },
  { id: 'u_1077', n: 'Noor Haddad', e: 'noor@redcliffcollective.example', ws: 'Red Cliff Collective', role: 'Team owner', tier: 'Agent', last: 'Dec 10, 12:41 AM', st: 'Active', pr: 2, of: 2 },
  { id: 'u_1090', n: 'Devon Achterberg', e: 'devon@copperbasin.example', ws: 'Copper Basin Realty', role: 'Team owner', tier: 'Team', last: 'Dec 9, 2:15 PM', st: 'Active', pr: 2, of: 5 },
  { id: 'u_1104', n: 'Sam Whitlock', e: 'sam@tidewaterproperty.example', ws: 'Tidewater Property Co.', role: 'Agent', tier: 'Agent', last: 'Dec 4, 9:03 AM', st: 'Past due', pr: 1, of: 2 },
  { id: 'u_1118', n: 'Tessa Lindqvist', e: 'tessa@lanternstreet.example', ws: 'Lantern Street Partners', role: 'Team owner', tier: 'Team', last: 'Dec 9, 11:27 AM', st: 'Trialing', pr: 1, of: 5 },
  { id: 'u_1125', n: 'Priya Raman', e: 'priya@fourthmeridian.example', ws: 'Fourth Meridian', role: 'Team owner', tier: 'Team', last: 'Nov 2, 4:40 PM', st: 'Canceled', pr: 0, of: 5 },
];
const STAFF = [
  { n: 'Connor Leiva', role: 'Owner', e: 'connor@amplifiedimpact.io', last: 'Dec 10, 9:22 AM' },
  { n: 'Avery Stone', role: 'Admin', e: 'avery@amplifiedimpact.example', last: 'Dec 9, 5:48 PM' },
  { n: 'Imani Brooks', role: 'Support', e: 'imani@amplifiedimpact.example', last: 'Dec 9, 9:30 PM' },
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
  { j: 'session-24h', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM', dur: '0.4 s', st: 'Succeeded', next: '9:25 AM' },
  { j: 'session-1h', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM', dur: '0.3 s', st: 'Succeeded', next: '9:25 AM' },
  { j: 'replay-ready', sch: 'Every 15 min', last: 'Dec 10, 9:15 AM', dur: '0.9 s', st: 'Succeeded', next: '9:30 AM' },
  { j: 'build-48h', sch: 'Hourly', last: 'Dec 10, 9:00 AM', dur: '0.5 s', st: 'Succeeded', next: '10:00 AM' },
  { j: 'weekly-digest', sch: 'Mon 7:00 AM', last: 'Dec 7, 7:00 AM', dur: '48 s', st: 'Succeeded', next: 'Dec 14, 7:00 AM' },
  { j: 'announcement', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM', dur: '0.2 s', st: 'Succeeded', next: '9:25 AM' },
  { j: 'billing', sch: 'Hourly', last: 'Dec 10, 9:00 AM', dur: '2.1 s', st: 'Succeeded', next: '10:00 AM' },
  { j: 'accelerator-reminders', sch: 'Daily 9:00 AM', last: 'Dec 10, 9:00 AM', dur: '1.4 s', st: 'Succeeded', next: 'Dec 11, 9:00 AM' },
  { j: 'ghl-sync', sch: 'Every 10 min', last: 'Dec 10, 9:20 AM', dur: '3.8 s', st: 'Running', next: '9:30 AM' },
  { j: 'ghl-logins', sch: 'Every 10 min', last: 'Dec 10, 9:10 AM', dur: '1.1 s', st: 'Succeeded', next: '9:30 AM' },
  { j: 'ghl-orders', sch: 'Every 10 min', last: 'Dec 10, 9:10 AM', dur: '0.6 s', st: 'Failed', next: '9:30 AM' },
  { j: 'ghl-extras', sch: 'Hourly', last: 'Dec 10, 9:00 AM', dur: '0.8 s', st: 'Waiting', next: '10:00 AM' },
];
const HOOKS = [
  { src: 'GoHighLevel', ev: 'order.sync', id: 'ord_2291', st: 'Failed', att: '3 of 5', next: 'Dec 10, 9:30 AM', err: '401 Unauthorized from GHL API' },
  { src: 'GoHighLevel', ev: 'order.sync', id: 'ord_2288', st: 'Failed', att: '3 of 5', next: 'Dec 10, 9:30 AM', err: '401 Unauthorized from GHL API' },
  { src: 'GoHighLevel', ev: 'login.sync', id: 'u_1077', st: 'Retrying', att: '2 of 5', next: 'Dec 10, 9:30 AM', err: '401 Unauthorized from GHL API' },
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
const EMAILS = [
  { to: 'elena@northshoregroup.example', tpl: 'session-24h', sub: 'Tomorrow at 12:00 PM MST: Session 2 live build', st: 'Delivered', t: 'Dec 8, 12:00 PM' },
  { to: 'sam@tidewaterproperty.example', tpl: 'payment-failed', sub: 'Your Insiders payment did not go through', st: 'Delivered', t: 'Dec 4, 9:04 AM' },
  { to: 'devon@copperbasin.example', tpl: 'replay-ready', sub: 'The Session 2 replay is ready', st: 'Opened', t: 'Dec 9, 3:10 PM' },
  { to: 'tessa@lanternstreet.example', tpl: 'magic-link', sub: 'Your sign-in link', st: 'Delivered', t: 'Dec 9, 11:26 AM' },
  { to: 'priya@fourthmeridian.example', tpl: 'weekly-digest', sub: 'This week: 2 new AI Employees', st: 'Bounced', t: 'Dec 7, 7:00 AM' },
  { to: 'jordan@halemarlowe.example', tpl: 'receipt', sub: 'Receipt for Team Plan, 16 seats', st: 'Queued', t: 'Dec 10, 9:18 AM' },
  { to: 'noor@redcliffcollective.example', tpl: 'announcement', sub: 'New in the vault: listing appointment checklist', st: 'Delivered', t: 'Dec 8, 3:00 PM' },
];
const DEPLOYS = [
  { sha: 'a3f91c2', m: 'Scope 16px floor and 44px targets to phone widths', a: 'Connor Leiva', t: 'Dec 9, 10:42 PM', st: 'Live', dur: '1m 48s' },
  { sha: '7be20d4', m: 'Curriculum: fitted grid, tier pill, drag handles', a: 'Avery Stone', t: 'Dec 9, 3:15 PM', st: 'Succeeded', dur: '1m 52s' },
  { sha: 'c41d8e0', m: 'GHL orders: back off on 401 and record last error', a: 'Connor Leiva', t: 'Dec 8, 8:02 PM', st: 'Succeeded', dur: '1m 44s' },
  { sha: '19aa6f3', m: 'Sidebar: collapsible groups and cohort switcher', a: 'Avery Stone', t: 'Dec 8, 11:20 AM', st: 'Failed', dur: '0m 39s' },
  { sha: 'e5527b9', m: 'Cohort starts at first build (migration 0014)', a: 'Connor Leiva', t: 'Dec 2, 9:48 AM', st: 'Succeeded', dur: '2m 03s' },
];
const INCIDENTS = [
  { id: 'INC-0007', t: 'GHL order sync failing with 401', sev: 'Sev 2', st: 'Open', o: 'Dec 9, 9:14 PM', own: 'Imani Brooks', links: [['jobs', 'Job ghl-orders'], ['api', '3 webhook deliveries']],
    tl: [['Dec 9, 9:14 PM', 'Opened automatically after 3 failed runs of ghl-orders.'], ['Dec 9, 9:20 PM', 'Imani Brooks confirmed orders are saved locally. Only the GHL copy is behind.'], ['Dec 9, 10:42 PM', 'Deploy a3f91c2 went live. No change in error rate.']] },
  { id: 'INC-0006', t: 'Stripe subscription.updated handler timeout', sev: 'Sev 3', st: 'Acknowledged', o: 'Dec 8, 7:31 PM', own: 'Avery Stone', links: [['api', '1 webhook delivery']],
    tl: [['Dec 8, 7:31 PM', 'Opened after a delivery used all 5 attempts.'], ['Dec 8, 7:40 PM', 'Acknowledged by Avery Stone.']] },
  { id: 'INC-0005', t: 'Weekly digest bounces above 2%', sev: 'Sev 3', st: 'Resolved', o: 'Dec 7, 7:12 AM', own: 'Connor Leiva', links: [['email', 'Email log, weekly-digest']],
    tl: [['Dec 7, 7:12 AM', 'Opened by Connor Leiva.'], ['Dec 7, 2:05 PM', 'Canceled workspaces removed from the digest audience.'], ['Dec 7, 2:10 PM', 'Resolved by Connor Leiva.']] },
];
const AUDIT0 = [
  { t: 'Dec 10, 8:58 AM', actor: 'Connor Leiva', act: 'job.run_now', tg: 'ghl-orders', d: 'Manual run. Failed with 401.' },
  { t: 'Dec 9, 9:31 PM', actor: 'Avery Stone', act: 'masquerade.stop', tg: 'Sam Whitlock', d: 'Exited by staff after 6 min.' },
  { t: 'Dec 9, 9:27 PM', actor: 'Avery Stone', act: 'masquerade.blocked_action', tg: 'Sam Whitlock', d: 'Tried: Refund in_1QxP7tTw0283.' },
  { t: 'Dec 9, 9:25 PM', actor: 'Avery Stone', act: 'masquerade.start', tg: 'Sam Whitlock', d: 'Reason: Customer cannot see the Session 2 replay.' },
  { t: 'Dec 9, 5:02 PM', actor: 'Imani Brooks', act: 'audit.export', tg: 'Audit log', d: 'CSV, last 7 days, 212 rows.' },
  { t: 'Dec 9, 3:20 PM', actor: 'Avery Stone', act: 'module.publish', tg: 'Sales AI Employee', d: 'Draft to Published.' },
  { t: 'Dec 9, 2:10 PM', actor: 'Connor Leiva', act: 'permission.change', tg: 'Support', d: 'Refund or void an invoice: allowed to not allowed.' },
  { t: 'Dec 8, 4:44 PM', actor: 'Connor Leiva', act: 'tier.access_change', tg: 'Database AI Employee', d: 'Team only to Agent + Team.' },
  { t: 'Dec 8, 9:05 AM', actor: 'Imani Brooks', act: 'email_log.export', tg: 'Email log', d: 'CSV, template weekly-digest, 388 rows.' },
  { t: 'Nov 1, 4:44 PM', actor: 'Connor Leiva', act: 'billing.refund', tg: 'in_1QxK5fFm0270', d: '$695.00. Reason: canceled inside trial window.' },
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
const PARENT = { newcohort: 'cohort', week: 'program', weekcards: 'program', cthread: 'cohort', workspace: 'people', user: 'people', incident: 'incidents', as: 'people' };
const TONE = { Active: 'ok', Paid: 'ok', Delivered: 'ok', Opened: 'ok', Succeeded: 'ok', Live: 'ok', Published: 'ok', Connected: 'ok', Resolved: 'ok', Present: 'ok', Sent: 'ok', On: 'ok', Healthy: 'ok', Ready: 'ok', Approved: 'ok',
  Running: 'run', Retrying: 'run', Scheduled: 'info', Trialing: 'info', Queued: 'info', Acknowledged: 'info', Upcoming: 'info',
  Failed: 'bad', 'Past due': 'bad', Bounced: 'bad', Degraded: 'bad', 'Sev 2': 'bad', 'Sev 1': 'bad',
  Waiting: 'warn', 'Not configured': 'warn', 'Sev 3': 'warn', Pending: 'warn', Refunded: 'warn',
  Draft: 'off', Off: 'off', Canceled: 'off', Open: 'warn' };

/* ---------- primitives ---------- */
const Ctx = createContext(null);
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
const Facts = ({ items }) => <div className="cd fx">{items.map(([k, v, full], i) => <div key={i} className={full ? 'fxw' : undefined}><span className="me">{k}</span><span className="w5 el">{v}</span></div>)}</div>;
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
const brk = s => typeof s === 'string' && s.includes('@') ? s.split('@').map((p, i) => <Fragment key={i}>{i > 0 && <>@<wbr /></>}{p}</Fragment>) : s;
const Two = ({ a, b, mo }) => <div className="col" style={{ gap: 0 }}><span className="w5 el">{a}</span><span className={'me el' + (mo ? ' mo' : '')}>{brk(b)}</span></div>;

/* ---------- admin screens ---------- */
function Overview() {
  const { go, started, toast, guard, ph } = useC();
  const pts = [22, 58, 96, 121, 150, 178, 190];
  const line = pts.map((v, i) => (i * 100) + ',' + (200 - v * 0.95)).join(' ');
  const funnel = [['Marketing', 98, 22, 148], ['Sales', 52, 31, 148], ['Week 1 · Know the Business', 33, 6, 44], ['Week 2 · Own the Day', 17, 12, 44], ['Database', 0, 0, 148]];
  return <div className="pg">
    <Head t="Overview" d={started ? 'December 2026 Cohort · Week 2 of 6 · Updated live from learner activity' : 'December 2026 Cohort · Opens Wed, Dec 2 at 12:00 PM MST · 148 learners enrolled'}
      right={<><Btn ic="download" onClick={() => toast('Report export started')}>Export report</Btn><GBtn k="p" ic="plus" perm="build" label="New AI Employee" go={() => go('builder')}>New AI Employee</GBtn></>} />
    <Gate n={8}>
      <div className="g5">
        <Stat l="Active learners" v="148" sub={ph ? '44 on Team Tier' : '104 Agent · 44 Team'} go={() => go('learners')} />
        <Stat l={ph ? 'Deployed' : 'AI Employees deployed'} v={started ? '190' : '0'} sub={started ? (ph ? '+6 in 24 hours' : '+6 in the last 24 hours') : (ph ? 'Starts Dec 2' : 'Counting starts Dec 2')} tone={started ? 'ok' : null} go={() => go('curriculum')} />
        <Stat l={ph ? 'Completion' : 'Build completion'} v={started ? '33%' : '—'} sub={ph ? 'Of open builds' : 'Of builds available'} />
        <Stat l={ph ? 'Attendance' : 'Live attendance'} v={started ? '74%' : '—'} sub={started ? (ph ? 'Session 2' : 'Session 2 · 109 attended') : (ph ? 'Opens Dec 2' : 'Session 1 is Wed, Dec 2')} go={() => go('cohorts')} />
        <Stat l="Upgrade pipeline" v="$8,000" sub="2 open requests" tone="warn" go={() => go('tiers')} />
      </div>
      <div className="gms">
        <Card t="AI Employees deployed" sub="Cumulative, all learners" right={started && <span className="w5" style={{ color: 'var(--ok)' }}>190 total</span>}>
          {started ? <div><svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ width: '100%', height: ph ? 160 : 220, display: 'block' }} role="img" aria-label="Deployed AI Employees rose from 22 on Dec 2 to 190 on Dec 8.">
            {[50, 100, 150].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#E6E3DA" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            <polygon points={'0,200 ' + line + ' 600,200'} fill="#E7F1EB" /><polyline points={line} fill="none" stroke="#1F4D40" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg><div className="row nw me" style={{ justifyContent: 'space-between', paddingTop: 8 }}>{(ph ? ['Dec 2', 'Dec 4', 'Dec 6', 'Dec 8'] : ['Dec 2', 'Dec 3', 'Dec 4', 'Dec 5', 'Dec 6', 'Dec 7', 'Dec 8']).map(d => <span key={d} style={{ whiteSpace: 'nowrap' }}>{d}</span>)}</div></div>
            : <Empty ic="usage" t="Not started" b="Deploys are counted from the first live build on Wed, Dec 2 at 12:00 PM MST." />}
        </Card>
        <Card t="Live activity" pad={false}>
          {started ? [['Sarah Collins', 'deployed Database AI Employee', '38 min ago', 'ok'], ['Rosa Delgado', 'deployed Sales AI Employee', '2 hours ago', 'ok'], ['Natasha Reed', 'deployed Marketing AI Employee', '2 hours ago', 'ok'], ['Devon Price', 'deployed Sales AI Employee', '14 hours ago', 'ok'], ['Kenji Watanabe', 'requested a Team tier upgrade', '18 hours ago', 'warn']].map((a, i) =>
            <div key={i} className="li" style={{ alignItems: 'flex-start' }}><span className={'st ' + a[3]} style={{ paddingTop: 7 }}><i /></span><span style={{ flex: 1, minWidth: 0 }}><span className="w5">{a[0]}</span> <span className="s2">{a[1]}</span></span><span className="me" style={{ whiteSpace: 'nowrap', paddingTop: 2 }}>{a[2]}</span></div>)
            : <Empty ic="health" t="No activity yet" b="Learner activity appears here once the cohort opens." />}
        </Card>
      </div>
      <div className="gms">
        <Card t="Build funnel by AI Employee" right={!ph && <span className="row me" style={{ gap: 12 }}><span className="st ok"><i />Deployed</span><span className="st info"><i />In progress</span><span className="st"><i style={{ background: '#DAD6CB' }} />Not started</span></span>} pad={false}>
          {funnel.map(f => { const nums = started ? <><span className="w5">{Math.round(f[1] / f[3] * 100)}%</span> <span className="mu">· {f[1]} of {f[3]}</span></> : <span className="mu">Not started</span>; const bar = <Bar v={started ? f[1] : 0} v2={started ? f[2] : 0} max={f[3]} />;
            return ph ? <div key={f[0]} className="li" style={{ flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap', gap: 8 }}><div className="row nw" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><span className="w5" style={{ minWidth: 0 }}>{f[0]}</span><span className="tn" style={{ flex: 'none', whiteSpace: 'nowrap' }}>{nums}</span></div><div style={{ display: 'flex' }}>{bar}</div></div>
              : <div key={f[0]} className="li"><span className="w5 el" style={{ flex: '0 0 220px' }}>{f[0]}</span>{bar}<span className="tn" style={{ flex: '0 0 112px', textAlign: 'right', whiteSpace: 'nowrap' }}>{nums}</span></div>; })}
        </Card>
        <Card t="Live attendance" pad={false}>
          {[['Session 1 · Dec 2', 82, '121 attended'], ['Session 2 · Dec 9', 74, '109 attended'], ['Session 3 · Dec 16', null, 'Upcoming']].map(s => <div key={s[0]} className="li"><span className={ph ? '' : 'el'} style={ph ? { flex: '0 0 124px', whiteSpace: 'nowrap' } : { flex: '0 0 124px' }}>{s[0]}</span>{started && s[1] ? <><Bar v={s[1]} /><span className="w5 tn">{s[1]}%</span></> : <span className="mu sp" style={{ textAlign: 'right' }}>{started ? s[2] : 'Upcoming'}</span>}</div>)}
        </Card>
      </div>
    </Gate>
  </div>;
}

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
        { k: 'ses', l: 'Live session', w: wide ? 'minmax(250px,1.6fr)' : '132px', hide: 'lap', r: (m, x) => m.ses ? <div className="col" style={{ gap: 0, padding: '6px 0' }} title={m.ses[0] + ' · ' + m.ses[1]} aria-label={m.ses[0] + ' · ' + m.ses[1]}><span className={wide ? 'cl3' : 'el'}>{wide ? nb(m.ses[0]) : m.ses[0].replace(/^Session \d+ · /, '').replace(/ Live Build$/, '')}</span><span className={wide ? 'me' : 'me el'} style={wide ? { whiteSpace: 'normal' } : undefined}>{x.tw < 1100 ? m.ses[1].split(' · ').slice(0, 2).join(' · ').replace(' MST', '') : m.ses[1]}</span></div> : <span className="mu">Self-paced</span> },
        { k: 'st', l: 'Status', w: lap ? '112px' : wide ? '128px' : '120px', r: m => m.st === 'Draft' && lap ? <div className="col" style={{ gap: 2, alignItems: 'flex-start' }}><St v={m.st} /><span className="pl" title="Hidden from learners" aria-label="Hidden from learners">Hidden</span></div> : <div className="col" style={{ gap: 0 }}><St v={m.st} /><span className="me" style={{ whiteSpace: 'nowrap' }}>{m.st === 'Draft' ? 'Hidden from learners' : m.st === 'Scheduled' ? m.opens : m.steps + ' steps · ' + m.files + ' files'}</span></div> },
        { k: 'dep', l: 'Deployed', w: '96px', ov: 1, r: m => !started || m.st !== 'Published' ? <span className="mu">{m.st === 'Draft' ? 'Not published' : 'Not started'}</span> : <span className="row nw" style={{ gap: 10 }}><Bar v={m.dep} /><span className="tn w5" style={{ minWidth: 34, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{m.dep}%</span></span> },
      ]}
      card={(m, i, items, up) => <><button className="lk w6" style={{ fontSize: 17, lineHeight: '24px', margin: '-10px 0' }} onClick={() => go('builder', m.id)}>{m.n}</button><p className="s2 cl2">{nb(m.d)}</p><span className="mu cl1">{m.st === 'Draft' ? 'Hidden from learners · ' : ''}{m.ses ? (m.st === 'Draft' ? '' : m.ses[0].split(' · ')[0] + ' · ') + m.ses[1].split(' · ')[0] : 'Self-paced'}{started && m.st === 'Published' ? ' · ' + m.dep + '% deployed' : !started && m.st === 'Published' ? ' · Not started' : ''}</span><div className="row nw" style={{ gap: 6 }}><span title={m.st === 'Draft' ? 'Hidden from learners' : undefined} aria-label={m.st === 'Draft' ? 'Draft. Hidden from learners' : undefined}><St v={m.st} /></span><TierPill m={m} set={v => upd(m.id, { tier: v })} /><span className="sp" />{m.st === 'Draft' && <Btn k="p" style={{ padding: '0 12px' }} onClick={() => pub(m, true)}>Publish</Btn>}<Menu items={items} up={up} /></div></>}
      quick={m => [{ l: 'Preview as Learner', ic: 'eye', fn: () => setPrev(m) }]}
      primary={m => m.st === 'Draft' ? <Btn k="p" onClick={() => pub(m, true)}>Publish</Btn> : null}
      menu={m => [{ l: 'Edit in Module Builder', ic: 'builder', fn: () => go('builder', m.id) }, { l: 'Preview as Learner', ic: 'eye', fn: () => setPrev(m) }, { l: 'Duplicate', g: 1, fn: () => guard('build', 'Duplicate ' + m.n, () => toast('Duplicated as a draft')) }, '-', m.st === 'Draft' ? { l: 'Publish', g: 1, fn: () => pub(m, true) } : { l: 'Unpublish', g: 1, d: 1, fn: () => pub(m, false) }]} />
    <p className="me">Tier access and publish status update the learner portal immediately. Session times are MST. {ph ? 'Reorder from the … menu.' : 'Drag the handle, or focus it and press Alt with an arrow key, to reorder.'}</p>
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

function Vault() {
  const { guard, toast, setDlg, log } = useC();
  const [q, setQ] = useState(''), [ty, setTy] = useState('All types');
  const R = [['Listing appointment checklist', 'PDF', 'Listing AI Employee', 'Agent + Team', '412 KB', 'Dec 8', 86], ['Standard chart of accounts', 'Sheet', 'Finance AI Employee', 'Team only', '88 KB', 'Dec 6', 31], ['Fair Housing review checklist', 'PDF', 'Marketing AI Employee', 'Agent + Team', '240 KB', 'Dec 2', 128], ['Session 1 replay', 'Video', 'Week 1 · Know the Business', 'Team only', '214 MB', 'Dec 2', 97], ['Session 2 replay', 'Video', 'Week 2 · Own the Day', 'Team only', '198 MB', 'Dec 9', 64], ['Skill install walkthrough', 'Video', 'Week 0 · Get Ready', 'Agent + Team', '96 MB', 'Nov 24', 141], ['Morning brief prompt pack', 'Prompt', 'Week 2 · Own the Day', 'Team only', '9 KB', 'Dec 9', 52]];
  return <div className="pg">
    <Head t="Resource Vault" d="Files, replays, prompts, and checklists learners can open from the portal." right={<GBtn k="p" ic="plus" perm="build" label="Add resource" go={() => toast('Upload opens here')}>Add resource</GBtn>} />
    <div className="row"><Find v={q} on={setQ} ph="Filter resources" /><Sel label="Type" v={ty} on={setTy} opts={['All types', 'PDF', 'Sheet', 'Video', 'Prompt']} /></div>
    <Table rows={R.filter(r => r[0].toLowerCase().includes(q.toLowerCase()) && (ty === 'All types' || r[1] === ty))} empty={{ ic: 'vault', t: 'The vault is empty', b: 'Add a file or a replay and attach it to an AI Employee.', cta: 'Add resource' }}
      cols={[{ k: 0, l: 'Resource', w: 'minmax(200px,1.6fr)', r: r => <div className="row nw" style={{ gap: 10 }}><I n={r[1] === 'Video' ? 'play' : 'file'} /><span className="w5 el">{r[0]}</span></div> }, { k: 1, l: 'Type', w: '72px' }, { k: 2, l: 'Attached to', w: 'minmax(140px,1fr)', hide: 'lap' }, { k: 3, l: 'Tier access', w: '120px', r: r => <Pill v={r[3]} tone={r[3] === 'Team only' ? 'warn' : 'ok'} /> }, { k: 4, l: 'Size', w: '72px', num: 1, ns: 1 }, { k: 6, l: 'Opens', w: '64px', num: 1 }, { k: 5, l: 'Updated', w: '72px', ns: 1 }]}
      quick={r => [{ l: 'Download', ic: 'download', fn: () => toast('Download started') }]}
      menu={r => [{ l: 'Edit details', g: 1, fn: () => guard('build', 'Edit ' + r[0], () => toast('Editor opens here')) }, { l: 'Replace file', g: 1, fn: () => guard('build', 'Replace ' + r[0], () => toast('File picker opens here')) }, '-', { l: 'Remove from vault', d: 1, g: 1, fn: () => guard('build', 'Remove ' + r[0], () => setDlg({ title: 'Remove "' + r[0] + '"?', body: 'Learners lose access right away. The file stays in storage for 30 days.', cta: 'Remove resource', danger: 1, yes: () => { log('vault.remove', r[0], ''); toast('Removed from the vault'); } })) }]} />
  </div>;
}

function Cohorts() {
  const { guard, toast, started } = useC();
  const S = [['Session 1 · Lead-Source ROI Live Build', 'Wed, Dec 2 · 12:00 PM MST', 'Week 1', 'Sent', 'Ready', '82%'], ['Session 2 · Morning Brief Live Build', 'Wed, Dec 9 · 12:00 PM MST', 'Week 2', 'Sent', 'Ready', '74%'], ['Session 3 · Database Live Build', 'Wed, Dec 16 · 12:00 PM MST', 'Week 3', 'Scheduled', '—', '—'], ['Session 4 · Scorecard Live Build', 'Wed, Dec 23 · 12:00 PM MST', 'Week 4', 'Scheduled', '—', '—'], ['Session 5 · Contract to Close', 'Wed, Dec 30 · 12:00 PM MST', 'Week 5', 'Draft', '—', '—'], ['Session 6 · Handoff', 'Wed, Jan 6 · 12:00 PM MST', 'Week 6', 'Draft', '—', '—']];
  return <div className="pg">
    <Head t="Cohorts & Sessions" d="The cohort calendar and each live build on Zoom. All times are MST (America/Phoenix)." right={<GBtn k="p" ic="plus" perm="build" label="Add session" go={() => toast('Session editor opens here')}>Add session</GBtn>} />
    <Gate n={3}><Facts items={[['Cohort', 'December 2026'], ['Status', <St v={started ? 'Active' : 'Scheduled'} />], ['Opens', 'Wed, Dec 2 · 12:00 PM MST', 1], ['Week', started ? '2 of 6' : 'Not started'], ['Enrolled', '148 learners'], ['Cadence', 'Wednesdays, weekly', 1]]} /></Gate>
    <Table title="Sessions" rows={S} empty={{ ic: 'cohorts', t: 'No sessions scheduled', b: 'Add the first live build for this cohort.', cta: 'Add session' }}
      cols={[{ k: 0, l: 'Session', w: 'minmax(250px,1.6fr)', r: s => <span className="w5 el" style={{ display: 'block' }}>{s[0]}</span> }, { k: 1, l: 'When', w: '188px', ns: 1, r: s => <div className="col" style={{ gap: 0 }}><span className="el">{s[1]}</span><span className="me">Live on Zoom</span></div> }, { k: 2, l: 'Module', w: '68px', hide: 'lap' }, { k: 3, l: 'Zoom invite', w: '112px', r: s => <St v={!started && s[3] === 'Sent' ? 'Scheduled' : s[3]} /> }, { k: 4, l: 'Replay', w: '72px', r: s => started && s[4] === 'Ready' ? <St v="Ready" /> : <span className="mu">—</span> }, { k: 5, l: 'Attendance', w: '88px', num: 1, r: s => started && s[5] !== '—' ? s[5] : <span className="mu">—</span> }]}
      menu={s => [{ l: 'Edit session', g: 1, fn: () => guard('build', 'Edit ' + s[0], () => toast('Session editor opens here')) }, { l: 'Copy join link', fn: () => toast('Join link copied') }, { l: 'Attach replay', g: 1, fn: () => guard('build', 'Attach replay', () => toast('Replay picker opens here')) }]} />
  </div>;
}

function Announce() {
  const { guard, toast, log } = useC();
  const [open, setOpen] = useState(false), [ti, setTi] = useState(''), [bo, setBo] = useState('');
  const [rows, setRows] = useState([['Session 2 replay is ready', 'Team Tier', 'In-app, email', 'Sent', 'Dec 9, 3:10 PM'], ['New in the vault: listing appointment checklist', 'Everyone', 'In-app, email', 'Sent', 'Dec 8, 3:00 PM'], ['Session 3 is Wednesday at 12:00 PM MST', 'Team Tier', 'Email', 'Scheduled', 'Dec 15, 12:00 PM'], ['Database AI Employee opens Monday', 'Everyone', 'In-app', 'Draft', '—']]);
  return <div className="pg">
    <Head t="Announcements" d="Messages to learners in the portal and by email." right={<GBtn k="p" ic="plus" perm="build" label="New announcement" go={() => setOpen(true)}>New announcement</GBtn>} />
    <Table rows={rows} empty={{ ic: 'announce', t: 'No announcements yet', b: 'Write the first one to tell learners what is new.', cta: 'New announcement', on: () => setOpen(true) }}
      cols={[{ k: 0, l: 'Announcement', w: 'minmax(220px,2fr)', r: r => <span className="w5 el" style={{ display: 'block' }}>{r[0]}</span> }, { k: 1, l: 'Audience', w: '104px' }, { k: 2, l: 'Channels', w: '120px', hide: 'lap' }, { k: 3, l: 'Status', w: '112px', r: r => <St v={r[3]} /> }, { k: 4, l: 'Send time', w: '136px', ns: 1 }]}
      menu={r => [{ l: 'Edit', g: 1, fn: () => guard('build', 'Edit announcement', () => toast('Editor opens here')) }, { l: 'Duplicate', g: 1, fn: () => guard('build', 'Duplicate announcement', () => toast('Duplicated as a draft')) }]} />
    {open && <Modal title="New announcement" onClose={() => setOpen(false)} foot={<><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn k="p" disabled={!ti.trim()} onClick={() => { setRows([[ti, 'Everyone', 'In-app', 'Draft', '—'], ...rows]); log('announcement.create', ti, 'Draft'); setOpen(false); setTi(''); setBo(''); toast('Saved as a draft'); }}>Save draft</Btn></>}>
      <label className="lab">Title<input className="in" autoFocus value={ti} onChange={e => setTi(e.target.value)} /></label>
      <label className="lab">Message<textarea className="in" rows={4} value={bo} onChange={e => setBo(e.target.value)} /></label>
      <div className="row"><label className="lab" style={{ flex: 1 }}>Audience<select className="in" style={{ width: '100%' }}><option>Everyone</option><option>Agent Tier</option><option>Team Tier</option></select></label><label className="lab" style={{ flex: 1 }}>Channels<select className="in" style={{ width: '100%' }}><option>In-app</option><option>In-app, email</option><option>Email</option></select></label></div>
    </Modal>}
  </div>;
}

function Learners() {
  const { go, startMasq, started } = useC();
  const { route } = useC();
  const [tab, setTab] = useState(route.tab || 'learners'), [q, setQ] = useState(''), [tier, setTier] = useState('All tiers');
  const L = USERS.filter(u => u.st !== 'Canceled' && (u.n + u.ws).toLowerCase().includes(q.toLowerCase()) && (tier === 'All tiers' || u.tier === tier));
  return <div className="pg">
    <Head t="Learners & Teams" d="Everyone enrolled in the December 2026 Cohort, with build progress. Account and billing support lives in Workspaces and Users." />
    <Tabs v={tab} on={setTab} tabs={[['learners', 'Learners', 148], ['teams', 'Teams', 7], ['intake', 'Intake', IR.filter(r => r.st === 'Submitted').length + ' of ' + IR.length], ['turnedin', 'Turned in', TI0.length]]} />
    {tab === 'intake' && <IntakeTab />}
    {tab === 'turnedin' && <TurnedInTab />}
    {tab === 'learners' && <><div className="row"><Find v={q} on={setQ} ph="Filter by name or team" /><Sel label="Tier" v={tier} on={setTier} opts={['All tiers', 'Agent', 'Team']} /></div>
      <Table rows={L} onRow={u => go('user', u.id)} empty={{ ic: 'learners', t: 'No learners enrolled', b: 'Learners appear here after checkout.' }}
        cols={[{ k: 'n', l: 'Learner', w: 'minmax(200px,1.5fr)', r: u => <div className="row nw" style={{ gap: 10 }}><span className="av">{ini(u.n)}</span><Two a={u.n} b={u.e} /></div> }, { k: 'ws', l: 'Team', w: 'minmax(140px,1fr)', hide: 'lap' }, { k: 'tier', l: 'Tier', w: '72px', r: u => <Pill v={u.tier} tone={u.tier === 'Team' ? 'warn' : 'ok'} /> }, { k: 'pr', l: 'Builds deployed', w: '160px', r: u => started ? <span className="row nw" style={{ gap: 10 }}><Bar v={u.pr} max={u.of} v2={0} /><span className="tn" style={{ minWidth: 44, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{u.pr} of {u.of}</span></span> : <span className="mu">Not started</span> }, { k: 'last', l: 'Last active', w: '128px', ns: 1 }]}
        menu={u => [{ l: 'Open user record', fn: () => go('user', u.id) }, { l: 'Masquerade…', ic: 'masquerade', fn: () => startMasq(u) }]} /></>}
    {tab === 'teams' && <Table rows={WS.filter(w => w.plan.startsWith('Team'))} onRow={w => go('workspace', w.id)} empty={{ ic: 'workspaces', t: 'No teams yet' }}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(180px,1.5fr)' }, { k: 'owner', l: 'Owner', w: 'minmax(120px,1fr)' }, { k: 'plan', l: 'Plan', w: '160px', hide: 'lap' }, { k: 'used', l: 'Seats', w: '160px', r: w => <span className="row nw" style={{ gap: 10 }}><Bar v={w.used} max={w.cap} fx={fixedSeats(w)} /><span className="tn" style={{ minWidth: 60, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{w.used} of {w.cap}</span></span> }, { k: 'st', l: 'Status', w: '104px', r: w => <St v={w.st} /> }]}
      menu={w => [{ l: 'Open workspace', fn: () => go('workspace', w.id) }]} />}
  </div>;
}

function Tiers() {
  const { mods, setMods, guard, log, toast, setDlg, ph } = useC();
  const [price, setPrice] = useState({ a: '995', t16: '4995', t41: '9995' });
  const [req, setReq] = useState([['Kenji Watanabe', 'Agent → Team · 16 seats', '$4,000', 'Dec 9, 3:02 PM', 'Pending'], ['Jordan Hale', 'Team · 16 seats → 41 seats', '$4,000', 'Dec 9, 6:12 PM', 'Pending'], ['Rosa Delgado', 'Agent → Team · 16 seats', '$4,000', 'Dec 4, 1:30 PM', 'Approved']]);
  const T = [['a', 'Agent Tier', '1 seat', 'per agent, per cohort', '104 licenses', '$103,480', 'For individual agents building their own AI Employees.', ['Marketing, Sales and Database AI Employees', 'System prompts, skill files and checklists', 'Resource Vault']],
    ['t16', 'Team Tier', '16 seats', 'per team, per cohort', '5 teams', '$24,975', 'For teams that want every seat building, plus the leadership modules.', ['All 15 AI Employees and weekly live builds', '16 seats', 'Team progress tracking']],
    ['t41', 'Team Tier', '41 seats', 'per team, per cohort', '2 teams', '$19,990', 'The same Team Tier, sized for larger teams.', ['All 15 AI Employees and weekly live builds', '41 seats', 'Team progress tracking']]];
  const tog = m => guard('build', 'Change tier access for ' + m.n, () => { setMods(ms => ms.map(x => x.id === m.id ? { ...x, tier: x.tier === 'both' ? 'team' : 'both' } : x)); log('tier.access_change', m.n, m.tier === 'both' ? 'Agent + Team to Team only.' : 'Team only to Agent + Team.'); });
  return <div className="pg">
    <Head t="Plans & upgrades" d="What each plan costs and holds, and the teams asking to move between them." />
    <Gate n={8}>
      <div className="g3">{T.map(t => <section key={t[0]} className="cd pd col" style={{ gap: 12 }}>
        <div className="row nw"><h2>{t[1]}</h2><Pill v={t[2]} tone="" /><span className="sp" /><span className="me">{t[4]}</span></div>
        <div className="row nw" style={{ alignItems: 'baseline' }}><span className="row nw prc" style={{ gap: 2, border: '1px solid var(--line2)', borderRadius: 8, padding: '0 10px', width: 124 }}><span className="mu">$</span><input className="tn" aria-label={t[1] + ' ' + t[2] + ' price'} style={{ border: 0, outline: 0, background: 'none', width: '100%', height: '100%', font: '600 20px/28px Geist,sans-serif', letterSpacing: '-.02em', boxShadow: 'none' }} value={price[t[0]]} onChange={e => guard('build', 'Change ' + t[1] + ' price', () => setPrice({ ...price, [t[0]]: e.target.value.replace(/\D/g, '') }))} /></span><span className="me">{t[3]}</span></div>
        <p className="s2">{t[6]}</p>
        <div className="col" style={{ gap: 6 }}>{t[7].map(x => <span key={x} className="row nw" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--ok)', paddingTop: 2 }}><I n="check" /></span><span>{x}</span></span>)}</div>
        <div className="row nw" style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 'auto' }}><span className="mu">Cohort revenue</span><span className="sp" /><span className="w6 tn">{t[5]}</span></div>
      </section>)}</div>
      <Table title="Upgrade requests" rows={req} empty={{ ic: 'tiers', t: 'No upgrade requests' }}
        cols={[{ k: 0, l: 'From', w: 'minmax(140px,1fr)', r: r => <span className="w5">{r[0]}</span> }, { k: 1, l: 'Request', w: 'minmax(180px,1.4fr)' }, { k: 2, l: 'Value', w: '80px', num: 1 }, { k: 3, l: 'Received', w: '136px', ns: 1, hide: 'lap' }, { k: 4, l: 'Status', w: '104px', r: r => <St v={r[4]} /> }]} aw="124px"
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
    <Head t="Audit Log" d="Every staff action. Append-only. Times are MST (America/Phoenix)." right={<GBtn ic="download" perm="export" label="Export audit log" go={exp}>Export CSV</GBtn>} />
    <div className="row"><Find v={q} on={setQ} ph="Filter target or detail" /><Sel label="Actor" v={actor} on={setActor} opts={['Any actor', ...STAFF.map(s => s.n)]} /><Sel label="Action" v={act} on={setAct} opts={['Any action', 'masquerade', 'billing', 'permission', 'module', 'tier', 'job', 'audit', 'email_log', 'incident', 'user']} /><Sel label="Date range" v={range} on={setRange} opts={['Last 24 hours', 'Last 7 days', 'Last 30 days']} /></div>
    <Table rows={rows} sel bulk={<Btn onClick={exp}>Export selected</Btn>} empty={{ ic: 'audit', t: 'No audit entries yet', b: 'Staff actions are recorded here as they happen.' }}
      cols={[{ k: 't', l: 'Time', w: '136px', ns: 1, r: a => <span className="mo s2">{a.t}</span> }, { k: 'actor', l: 'Actor', w: '128px' }, { k: 'act', l: 'Action', w: 'minmax(210px,1.2fr)', mo: 1 }, { k: 'tg', l: 'Target', w: 'minmax(110px,.9fr)' }, { k: 'd', l: 'Detail', w: 'minmax(160px,1.6fr)', ns: 1, hide: 'lap', r: a => <span className="s2">{a.d}</span> }]} />
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
      cols={[{ k: 'n', l: 'Staff member', w: 'minmax(200px,1.4fr)', r: s => <div className="row nw" style={{ gap: 10 }}><span className="av">{ini(s.n)}</span><Two a={s.n + (s.role === role ? ' (you)' : '')} b={s.e} /></div> }, { k: 'role', l: 'Role', w: '104px', r: s => <Pill v={s.role} tone={s.role === 'Owner' ? 'ok' : ''} /> }, { k: 'last', l: 'Last sign-in', w: '136px', ns: 1 }]}
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
    <Head t="System Health" meta={<Pill v={e ? 'All systems normal' : '1 open incident'} tone={e ? 'ok' : 'bad'} />} d="learn.amplifiedimpact.io right now. Times are MST (America/Phoenix)." />
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
            [['incident', 'INC-0007', 'GHL order sync failing with 401', 'Open since Dec 9, 9:14 PM', 'Sev 2'], ['billing', null, 'Tidewater Property Co. is past due', 'Insiders · $97.00 · 2 retries left', 'Past due'], ['api', null, 'Stripe subscription.updated used all 5 attempts', 'Handler timeout after 10 s', 'Failed'], ['workspace', 'ws_halemarlowe', 'Hale & Marlowe Realty is at 15 of 16 seats', 'Team Plan · 16 seats', 'Waiting']].map((r, i) =>
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
  const { go, startMasq } = useC();
  const [q, setQ] = useState(''), [plan, setPlan] = useState('All plans'), [st, setSt] = useState('Any status');
  const rows = WS.filter(w => (w.n + w.owner).toLowerCase().includes(q.toLowerCase()) && (plan === 'All plans' || w.plan.startsWith(plan)) && (st === 'Any status' || w.st === st));
  return <div className="pg">
    <Head t="Workspaces" d="Every team and solo account. Open one for members, plan, usage, billing, and staff notes." />
    <div className="row"><Find v={q} on={setQ} ph="Filter workspace or owner" /><Sel label="Plan" v={plan} on={setPlan} opts={['All plans', 'Team Plan', 'Agent Plan', 'Insiders', 'AI Accelerator']} /><Sel label="Status" v={st} on={setSt} opts={['Any status', 'Active', 'Trialing', 'Past due', 'Canceled']} /></div>
    <Table rows={rows} onRow={w => go('workspace', w.id)} empty={{ ic: 'workspaces', t: 'No workspaces yet', b: 'A workspace is created at checkout.' }}
      cols={[{ k: 'n', l: 'Workspace', w: 'minmax(170px,1.3fr)', r: (w, dr) => <Two a={w.n} b={dr.drop ? w.owner + ' · ' + w.id : w.id} mo={!dr.drop} /> }, { k: 'owner', l: 'Owner', w: 'minmax(116px,.9fr)', hide: 'lap' }, { k: 'plan', l: 'Plan', w: 'minmax(140px,1.1fr)' }, { k: 'used', l: 'Seats', w: '132px', r: w => <span className="row nw" style={{ gap: 10 }}><Bar v={w.used} max={w.cap} fx={fixedSeats(w)} /><span className="tn" style={{ minWidth: 60, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{w.used} of {w.cap}</span></span> }, { k: 'st', l: 'Status', w: '96px', r: w => <St v={w.st} /> }, { k: 'last', l: 'Last activity', w: '124px', ns: 1 }]}
      menu={w => [{ l: 'Open workspace', fn: () => go('workspace', w.id) }, { l: 'Masquerade as owner…', ic: 'masquerade', fn: () => startMasq(USERS.find(u => u.n === w.owner)) }]} />
  </div>;
}

function Workspace() {
  const { route, go, startMasq, guard, toast, log } = useC();
  const w = WS.find(x => x.id === route.id);
  const [tab, setTab] = useState(route.tab || 'members');
  const [notes, setNotes] = useState([['Imani Brooks', 'Dec 7, 3:40 PM', 'Owner asked how seats work when an agent leaves. Sent the seat reassignment guide.'], ['Connor Leiva', 'Nov 24, 10:05 AM', 'Onboarding call done. They want the leadership modules first.']]);
  const [draft, setDraft] = useState('');
  if (!w) return <NotFound />;
  const mem = USERS.filter(u => u.ws === w.n);
  const inv = INV.find(i => i.c === w.n);
  return <div className="pg">
    <Head back={['teamsall', 'Teams']} t={w.n} meta={<Pill v={w.st} />} right={<Btn ic="masquerade" onClick={() => startMasq(USERS.find(u => u.n === w.owner))}>Masquerade as owner</Btn>} />
    <Gate n={3}><Facts items={[['Workspace ID', <span className="mo">{w.id}</span>], ['Plan', w.plan], ['Seats', w.used + ' of ' + w.cap], ['Owner', w.owner], ['MRR', w.mrr], ['Last activity', w.last]]} /></Gate>
    <div className="gms">
      <div className="col">
        <Tabs v={tab} on={setTab} tabs={[['members', 'Members', mem.length], ['intake', 'Intake'], ['turnedin', 'Turned in', TI0.filter(x => x.ws === w.id).length || undefined], ['plan', 'Plan & entitlements'], ['usage', 'Usage'], ['billing', 'Billing'], ['activity', 'Activity']]} />
        {tab === 'members' && <Table rows={mem} onRow={u => go('user', u.id)} empty={{ ic: 'users', t: 'No members in this workspace' }} cols={[{ k: 'n', l: 'Member', w: 'minmax(180px,1.5fr)', r: u => <div className="row nw" style={{ gap: 10 }}><span className="av">{ini(u.n)}</span><Two a={u.n} b={u.e} /></div> }, { k: 'role', l: 'Role', w: '104px' }, { k: 'st', l: 'Status', w: '96px', r: u => <St v={u.st} /> }]} menu={u => [{ l: 'Open user', fn: () => go('user', u.id) }, { l: 'Masquerade…', ic: 'masquerade', fn: () => startMasq(u) }]} />}
        {tab === 'intake' && <WsIntake w={w} />}
        {tab === 'turnedin' && <WsTurnedIn w={w} />}
        {tab === 'plan' && <Gate><Card><KV rows={[['Plan', w.plan], ['Status', <St v={w.st} />], ['Seats used', <span className="row nw" style={{ maxWidth: 260 }}><Bar v={w.used} max={w.cap} fx={fixedSeats(w)} /><span className="tn">{w.used} of {w.cap}</span></span>],
          ['Seat tier', w.plan.startsWith('Team') ? <span className="row" style={{ gap: 6 }}><I n="lock" />Team Plan is sold in two sizes, 16 or 41 seats. Changing size is an upgrade request in Tiers & Upgrades.</span> : w.plan === 'AI Accelerator' ? <span className="row" style={{ gap: 6 }}><I n="lock" />Cohort cap is a product rule. View only.</span> : 'Per agent'],
          ['Access groups', <span className="row" style={{ gap: 6 }}><Pill v="library" tone="" /><Pill v="agent" tone="" />{w.plan.startsWith('Team') && <Pill v="team" tone="" />}{w.plan === 'AI Accelerator' && <Pill v="cohort-dec-2026" tone="" />}</span>], ['Renews', w.mrr === 'One-time' ? 'One-time purchase' : 'Jan 8, 2027']]} /></Card></Gate>}
        {tab === 'usage' && <Gate><div className="g4"><Stat l="Sign-ins, 7d" v={String(w.used * 6)} /><Stat l="Lesson plays, 7d" v={String(w.used * 4)} /><Stat l="Guide views, 7d" v={String(w.used * 9)} /><Stat l="Storage" v={(w.used * 0.2).toFixed(1) + ' GB'} /></div></Gate>}
        {tab === 'billing' && <Gate><Card><div className="col"><KV rows={[['Stripe customer', <span className="mo">{w.cus}</span>], ['Subscription', <span className="mo">{w.sub}</span>], ['MRR', w.mrr], ['Last invoice', inv ? <span className="row" style={{ gap: 8 }}><span className="mo">{inv.id}</span><St v={inv.st} /></span> : '—']]} /><div><Btn onClick={() => go('billing', null, 'invoices')}>Open in Billing</Btn></div></div></Card></Gate>}
        {tab === 'activity' && <Gate><Card>{[['Dec 10, 8:52 AM', w.owner + ' signed in'], ['Dec 10, 8:55 AM', w.owner + ' deployed Sales AI Employee'], ['Dec 8, 10:14 AM', 'A member was invited'], ['Dec 8, 9:00 AM', 'Invoice paid']].map((a, i) => <div key={i} className="tl"><div>{a[1]}</div><div className="me mo">{a[0]}</div></div>)}</Card></Gate>}
      </div>
      <div className="col">{tab === 'intake' && <WsGhl w={w} />}<Card t="Staff notes" sub="Internal. Never shown to the workspace."><div className="col m">
        <textarea className="in" rows={3} aria-label="Add a note" value={draft} onChange={e => setDraft(e.target.value)} placeholder="What happened, what you told them" />
        <div><Btn disabled={!draft.trim()} onClick={() => guard('account', 'Add staff note', () => { setNotes([['You', 'Just now', draft.trim()], ...notes]); log('workspace.note_add', w.n, ''); setDraft(''); toast('Note saved'); })}>Save note</Btn></div>
        {notes.map((n, i) => <div key={i} className="note col s"><span><span className="w5">{n[0]}</span> <span className="me">· {n[1]}</span></span><p className="s2">{n[2]}</p></div>)}
      </div></Card></div>
    </div>
  </div>;
}

function Users() {
  const { go, startMasq, toast, log, guard } = useC();
  const [q, setQ] = useState(''), [role, setRole] = useState('Any role');
  const rows = USERS.filter(u => (u.n + u.e + u.ws).toLowerCase().includes(q.toLowerCase()) && (role === 'Any role' || u.role === role));
  return <div className="pg">
    <Head t="Users" d="Find a person by name, email, or workspace." />
    <div className="row"><Find v={q} on={setQ} ph="Filter name, email, workspace" /><Sel label="Role" v={role} on={setRole} opts={['Any role', 'Team owner', 'Agent']} /></div>
    <Table rows={rows} sel onRow={u => go('user', u.id)} empty={{ ic: 'users', t: 'No users yet' }} bulk={<Btn onClick={() => guard('export', 'Export users', () => { log('users.export', 'Users', 'CSV'); toast('Export started. It is in the audit log.'); })}>Export selected</Btn>}
      cols={[{ k: 'n', l: 'User', w: 'minmax(220px,1.6fr)', r: (u, dr) => <div className="row nw" style={{ gap: 10 }}><span className="av">{ini(u.n)}</span><Two a={u.n} b={dr.drop ? u.role + ' · ' + u.e : u.e} /></div> }, { k: 'ws', l: 'Workspace', w: 'minmax(150px,1fr)' }, { k: 'role', l: 'Role', w: '104px', hide: 'lap' }, { k: 'st', l: 'Status', w: '104px', r: u => <St v={u.st} /> }, { k: 'last', l: 'Last sign-in', w: '128px', ns: 1 }]}
      menu={u => [{ l: 'Open user', fn: () => go('user', u.id) }, { l: 'Masquerade…', ic: 'masquerade', fn: () => startMasq(u) }]} />
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
        {tab === 'emails' && <Table rows={EMAILS.filter(e => e.to === u.e)} empty={{ ic: 'email', t: 'No emails sent to this user' }} cols={[{ k: 'sub', l: 'Subject', w: 'minmax(200px,2fr)' }, { k: 'tpl', l: 'Template', mo: 1, w: '136px', hide: 'lap' }, { k: 'st', l: 'Status', w: '104px', r: e => <St v={e.st} /> }, { k: 't', l: 'Sent', w: '128px', ns: 1 }]} />}
        {tab === 'activity' && <Gate><Card>{[[u.last, 'Signed in with Google'], ['Dec 8, 2:14 PM', 'Opened the Session 2 replay'], ['Dec 2, 12:01 PM', 'Joined Session 1'], ['Nov 24, 9:30 AM', 'Account created at checkout']].map((a, i) => <div key={i} className="tl"><div>{a[1]}</div><div className="me mo">{a[0]}</div></div>)}</Card></Gate>}
      </div>
      <div className="col">
        <Card t="Identity"><KV rows={[['Email verified', 'Yes, Nov 24, 2026'], ['Sign-in', 'Password, Google'], ['Staff role', 'None'], ['Access groups', <span className="row" style={{ gap: 6 }}><Pill v="library" tone="" /><Pill v="agent" tone="" />{u.tier === 'Team' && <Pill v="team" tone="" />}</span>]]} /></Card>
        <Card t="Notes" sub="Internal. Never shown to the user."><div className="note col s"><span><span className="w5">Imani Brooks</span> <span className="me">· Dec 7, 3:40 PM</span></span><p className="s2">Prefers email over calls. Mornings MST.</p></div></Card>
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
          <Table title="Recent sessions" empty={{ ic: 'masquerade', t: 'No masquerade sessions yet' }} rows={[['Avery Stone', 'Sam Whitlock', 'Customer cannot see the Session 2 replay.', 'Dec 9, 9:25 PM', '6 min', 'Exited by staff'], ['Avery Stone', 'Jordan Hale', 'Checking seat invite flow after upgrade request.', 'Dec 8, 2:02 PM', '15 min', 'Expired'], ['Connor Leiva', 'Elena Vargas', 'Verifying Week 2 step order on her account.', 'Dec 6, 4:18 PM', '11 min', 'Exited by staff']]}
            cols={[{ k: 1, l: 'As user', w: 'minmax(120px,1fr)', r: r => <Two a={r[1]} b={'by ' + r[0]} /> }, { k: 2, l: 'Reason', w: 'minmax(160px,2fr)', ns: 1 }, { k: 3, l: 'Started', w: '128px', ns: 1, hide: 'lap' }, { k: 4, l: 'Length', w: '64px', num: 1 }, { k: 5, l: 'Ended', w: '120px', r: (r, dr) => dr.drop ? <div className="col" style={{ gap: 0 }}><span className="el">{r[5]}</span><span className="me el">{r[3]}</span></div> : r[5] }]} />
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
    <div className="g2"><Card t="Your builds"><div className="row nw"><Bar v={masq.u.pr} max={masq.u.of} v2={0} /><span className="tn">{masq.u.pr} of {masq.u.of} deployed</span></div></Card><Card t="Next live build"><span>Session 3 · Wed, Dec 16 · 12:00 PM MST</span></Card></div>
    <Card t="Try a blocked action"><div className="col m"><p className="s2">Admin tools stay visible during a session, with a lock. Using one shows the block and logs the attempt.</p><div><Btn onClick={() => go('billing', null, 'invoices')}>Go to invoices</Btn></div></div></Card>
  </div>;
}

function Billing() {
  const { route, go, guard, setDlg, toast, log, can } = useC();
  const [tab, setTab] = useState(route.tab || 'customers');
  useEffect(() => { if (route.tab) setTab(route.tab); }, [route.tab]);
  const ro = !can('refund');
  const refund = i => guard('refund', 'Refund ' + i.id, () => setDlg({ title: 'Refund ' + i.amt + ' to ' + i.c + '?', body: 'Invoice ' + i.id + ', ' + i.card + '. The refund is sent to Stripe and cannot be reversed from the admin.', cta: 'Refund ' + i.amt, danger: 1, needReason: 1, yes: r => { log('billing.refund', i.id, i.amt + '. Reason: ' + r); toast('Refund sent to Stripe'); } }));
  const voidI = i => guard('refund', 'Void ' + i.id, () => setDlg({ title: 'Void invoice ' + i.id + '?', body: i.amt + ' for ' + i.c + '. The customer will no longer be asked to pay it.', cta: 'Void invoice', danger: 1, needReason: 1, yes: r => { log('billing.void', i.id, r); toast('Invoice voided'); } }));
  return <div className="pg">
    <Head t="Billing" meta={ro && <Pill v="Read-only for your role" tone="" />} d="The lists behind the money, from Stripe. Prices and Payment Links are made in Stripe and are not edited here." />
    <Tabs v={tab} on={setTab} tabs={[['customers', 'Customers'], ['subs', 'Subscriptions'], ['invoices', 'Invoices'], ['failed', 'Failed payments', 3], ['refunds', 'Refunds']]} />
    {tab === 'summary' && <><Gate n={3}><div className="g4"><Stat l="MRR · sample" v="$18,516" sub="+$695 this week" tone="ok" /><Stat l="Subscriptions" v="77" sub="Active" /><Stat l="Failed payments" v="3" sub="Needs review" tone="bad" go={() => setTab('failed')} /><Stat l="Refunds, 30d" v="$0" go={() => setTab('refunds')} /></div></Gate>
      <Table title="Plan economics · sample figures" rows={[['Team Plan · 16 seats', '$695 monthly', '5 teams', '$3,475'], ['Team Plan · 41 seats', '$1,495 monthly', '2 teams', '$2,990'], ['Agent Plan', '$29 per agent, monthly', '212 agents', '$6,148'], ['Insiders', '$97 monthly', '61 members', '$5,917'], ['AI Accelerator', '$7,500 or 2 × $3,750', '11 of 15 seats', 'One-time']]}
        cols={[{ k: 0, l: 'Plan', w: 'minmax(180px,1.4fr)', r: r => <span className="w5">{r[0]}</span> }, { k: 1, l: 'Price', w: 'minmax(160px,1fr)' }, { k: 2, l: 'Active', w: 'minmax(110px,1fr)' }, { k: 3, l: 'MRR', w: '96px', num: 1 }]} />
      <Gate><Card t="AI Accelerator" right={<St v="Active" />}><KV rows={[['Price', '$7,500, or two payments of $3,750'], ['Seats sold', <span className="row nw" style={{ maxWidth: 260 }}><Bar v={11} max={15} /><span className="tn">11 of 15</span></span>], ['Seat cap', <span className="row" style={{ gap: 6 }}><I n="lock" />15 seats. Product rule, view only.</span>], ['Collected', '$67,500'], ['Second payments due', '4 × $3,750 = $15,000']]} /></Card></Gate></>}
    {tab === 'customers' && <Table rows={WS} onRow={w => go('workspace', w.id)} empty={{ ic: 'billing', t: 'No Stripe customers yet' }} cols={[{ k: 'n', l: 'Customer', w: 'minmax(180px,1.4fr)', r: w => <Two a={w.n} b={w.cus} mo /> }, { k: 'plan', l: 'Plan', w: 'minmax(150px,1fr)' }, { k: 'mrr', l: 'MRR', w: '96px', num: 1 }, { k: 'st', l: 'Status', w: '104px', r: w => <St v={w.st} /> }]} />}
    {tab === 'subs' && <Table rows={WS.filter(w => w.sub !== '—')} empty={{ ic: 'billing', t: 'No subscriptions yet' }} cols={[{ k: 'sub', l: 'Subscription', mo: 1, w: 'minmax(170px,1.2fr)' }, { k: 'n', l: 'Workspace', w: 'minmax(150px,1fr)' }, { k: 'plan', l: 'Plan', w: 'minmax(150px,1fr)', hide: 'lap' }, { k: 'mrr', l: 'MRR', w: '96px', num: 1 }, { k: 'st', l: 'Status', w: '104px', r: w => <St v={w.st} /> }]} onRow={w => go('workspace', w.id)} />}
    {tab === 'invoices' && <Table rows={INV} empty={{ ic: 'billing', t: 'No invoices yet' }} cols={[{ k: 'id', l: 'Invoice', mo: 1, w: 'minmax(150px,1.2fr)' }, { k: 'c', l: 'Customer', w: 'minmax(150px,1.2fr)' }, { k: 'card', l: 'Payment method', w: 'minmax(140px,1fr)', hide: 'lap' }, { k: 'amt', l: 'Amount', w: '96px', num: 1 }, { k: 'st', l: 'Status', w: '104px', r: i => <St v={i.st} /> }, { k: 'd', l: 'Date', w: '104px', ns: 1 }]}
      menu={i => [{ l: 'Open customer', fn: () => go('workspace', WS.find(w => w.n === i.c).id) }, ...(i.st === 'Paid' ? ['-', { l: 'Refund…', d: !ro, g: 1, off: ro, fn: () => refund(i) }] : []), ...(i.st === 'Open' || i.st === 'Failed' ? ['-', { l: 'Void invoice…', d: !ro, g: 1, off: ro, fn: () => voidI(i) }] : [])]} />}
    {tab === 'failed' && <Table empty={{ ic: 'check', t: 'No failed payments' }} rows={[['Tidewater Property Co.', '$97.00', 'card_declined: insufficient_funds', '2 of 4', 'Dec 11, 9:00 AM'], ['Hale & Marlowe Realty', '$695.00', 'authentication_required', '1 of 4', 'Dec 11, 8:00 AM'], ['Copper Basin Realty', '$3,750.00', 'card_declined: do_not_honor', '1 of 4', 'Dec 12, 12:00 PM']]}
      cols={[{ k: 0, l: 'Customer', w: 'minmax(170px,1.2fr)', r: r => <span className="w5">{r[0]}</span> }, { k: 2, l: 'Decline reason', mo: 1, w: 'minmax(200px,1.6fr)' }, { k: 1, l: 'Amount', w: '96px', num: 1 }, { k: 3, l: 'Attempts', w: '80px' }, { k: 4, l: 'Next retry', w: '136px', ns: 1 }]}
      menu={r => [{ l: 'Open customer', fn: () => go('workspace', WS.find(w => w.n === r[0]).id) }, { l: 'Open email log', fn: () => go('email') }]} />}
    {tab === 'refunds' && <Table empty={{ ic: 'billing', t: 'No refunds yet' }} rows={[['re_3QxK5fFm70', 'in_1QxK5fFm0270', '$695.00', 'Canceled inside trial window', 'Connor Leiva', 'Nov 1, 4:44 PM']]} cols={[{ k: 0, l: 'Refund', mo: 1, w: 'minmax(120px,1fr)' }, { k: 1, l: 'Invoice', mo: 1, w: 'minmax(140px,1fr)', hide: 'lap' }, { k: 3, l: 'Reason', w: 'minmax(180px,1.6fr)' }, { k: 4, l: 'By', w: '120px' }, { k: 2, l: 'Amount', w: '96px', num: 1 }, { k: 5, l: 'When', w: '128px', ns: 1 }]} />}
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
        cols={[{ k: 'ev', l: 'Event', w: 'minmax(200px,1.6fr)', r: h => <Two a={<span className="mo">{h.ev}</span>} b={h.src + (h.id !== '—' ? ' · ' + h.id : '')} /> }, { k: 'st', l: 'Status', w: '128px', r: h => <St v={h.st} /> }, { k: 'att', l: 'Attempts', w: '80px' }, { k: 'next', l: 'Next attempt', w: '152px', ns: 1, hide: 'lap' }, { k: 'err', l: 'Last error', w: 'minmax(160px,1.4fr)', ns: 1, r: h => <span className="s2">{h.err}</span> }]}
        menu={h => [{ l: 'Retry now…', g: 1, off: !(h.st === 'Failed' || h.st === 'Retrying'), fn: () => guard('jobs', 'Retry ' + h.ev, () => setDlg({ title: 'Retry ' + h.ev + ' for ' + h.id + '?', body: 'Sends this ' + h.src + ' delivery again now. Handlers are idempotent, so a repeat is safe.', cta: 'Retry delivery', yes: () => { log('webhook.retry', h.ev + ' ' + h.id, ''); toast('Retry queued'); } })) }, { l: 'Related incidents', fn: () => go('incidents') }]} />
      <p className="me">Payloads and signing secrets are not shown. Event IDs link a delivery to its order or user.</p></>}
  </div>;
}

function Integrations() {
  const { toast } = useC();
  const L = [
    { n: 'Stripe', use: 'Payments, subscriptions, invoices', st: 'Connected', ok: 'Dec 10, 9:18 AM', err: 'None', sec: [['Secret key', 1], ['Webhook signing secret', 1]] },
    { n: 'GoHighLevel', use: 'CRM sync for logins and orders', st: 'Degraded', ok: 'Dec 9, 9:04 PM', err: 'Dec 10, 9:10 AM · 401 Unauthorized', sec: [['Access token', 1], ['Location ID', 1]] },
    { n: 'Zoom', use: 'Session join links', st: 'Connected', ok: 'Dec 9, 12:00 PM', err: 'None', sec: [['OAuth client secret', 1], ['Recording webhook secret', 0]] },
    { n: 'Google', use: 'Sign in with Google', st: 'Connected', ok: 'Dec 10, 8:52 AM', err: 'None', sec: [['OAuth client secret', 1]] },
    { n: 'Resend', use: 'Transactional email', st: 'Connected', ok: 'Dec 10, 9:18 AM', err: 'Dec 7, 7:00 AM · 1 hard bounce', sec: [['API key', 1]] },
    { n: 'Storage', use: 'Railway S3-compatible bucket', st: 'Connected', ok: 'Dec 10, 9:02 AM', err: 'None', sec: [['Access key', 1]] },
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
    <Table rows={DEPLOYS} empty={{ ic: 'deploys', t: 'No deploys found' }} cols={[{ k: 'm', l: 'Commit', w: 'minmax(260px,2.4fr)', r: d => <div className="row nw" style={{ gap: 12 }}><St v="" tone={TONE[d.st]} /><Two a={d.m} b={d.sha + ' · main'} mo /></div> }, { k: 'st', l: 'Deploy', w: '112px', r: d => <span className={d.st === 'Failed' ? 'w5' : ''} style={d.st === 'Failed' ? { color: 'var(--bad)' } : undefined}>{d.st}</span> }, { k: 'dur', l: 'Build', w: '72px', num: 1, ns: 1 }, { k: 'a', l: 'Author', w: '128px', hide: 'lap' }, { k: 't', l: 'Time', w: '136px', ns: 1 }]} />
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
        <Card t="Migrations" sub="Drizzle" pad={false}>{[['0014_cohort_starts_at_first_build', 'Dec 2, 9:48 AM'], ['0013_course_guide_links', 'Nov 24, 4:48 PM'], ['0012_access_group_domains', 'Nov 12, 1:10 PM'], ['0011_google_identities', 'Nov 3, 9:32 AM']].map((m, i) => <div key={m[0]} className="li"><span className="mo el" style={{ flex: 1 }}>{m[0]}</span>{i === 0 && <Pill v="Latest" tone="ok" />}<span className="me" style={{ whiteSpace: 'nowrap' }}>{m[1]}</span></div>)}</Card>
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
    <Table rows={JOBS} empty={{ ic: 'jobs', t: 'No jobs registered' }} cols={[{ k: 'j', l: 'Job', mo: 1, w: 'minmax(180px,1.5fr)' }, { k: 'sch', l: 'Schedule', w: 'minmax(110px,1fr)' }, { k: 'st', l: 'Last result', w: '120px', r: j => <St v={run[j.j] ? 'Running' : j.st} /> }, { k: 'last', l: 'Last run', w: '136px', ns: 1 }, { k: 'dur', l: 'Duration', num: 1, ns: 1, w: '72px', hide: 'lap' }, { k: 'next', l: 'Next run', w: '136px', ns: 1 }]}
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
      cols={[{ k: 't', l: 'Incident', w: 'minmax(240px,2fr)', r: i => <Two a={i.t} b={i.id} mo /> }, { k: 'sev', l: 'Severity', w: '88px', r: i => <Pill v={i.sev} /> }, { k: 'st', l: 'Status', w: '128px', r: i => <St v={i.st} tone={i.st === 'Open' ? 'bad' : undefined} /> }, { k: 'own', l: 'Owner', w: '128px', hide: 'lap' }, { k: 'o', l: 'Opened', w: '128px', ns: 1 }]} />
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
    <Gate n={3}><Facts items={[['Incident', <span className="mo">{i.id}</span>], ['Status', <St v={st} tone={st === 'Open' ? 'bad' : undefined} />], ['Severity', i.sev], ['Owner', i.own], ['Opened', i.o + ' MST']]} /></Gate>
    <Gate><div className="gms">
      <Card t="Timeline">{[...i.tl, ...(st !== i.st ? [['Just now', st + ' by you.']] : [])].map((t, k) => <div key={k} className="tl"><div>{t[1]}</div><div className="me mo">{t[0]}</div></div>)}</Card>
      <Card t="Linked" pad={false}>{i.links.map((l, k) => <div key={k} className="li"><I n={l[0]} /><button className="lk" style={{ flex: 1 }} onClick={() => go(l[0], null, l[0] === 'api' ? 'hooks' : null)}>{l[1]}</button><I n="chev" /></div>)}</Card>
    </div></Gate>
  </div>;
}

function Email() {
  const { log, toast, guard } = useC();
  const [q, setQ] = useState(''), [tpl, setTpl] = useState('Any template'), [st, setSt] = useState('Any status'), [open, setOpen] = useState(null);
  const rows = EMAILS.filter(e => (e.to + e.sub).toLowerCase().includes(q.toLowerCase()) && (tpl === 'Any template' || e.tpl === tpl) && (st === 'Any status' || e.st === st));
  const exp = () => guard('export', 'Export email log', () => { log('email_log.export', 'Email log', 'CSV, ' + rows.length + ' rows.'); toast('Export started. It is in the audit log.'); });
  return <div className="pg">
    <Head t="Email Log" d="Every transactional email and notification sent through Resend. Times are MST (America/Phoenix)." right={<GBtn ic="download" perm="export" label="Export email log" go={exp}>Export CSV</GBtn>} />
    <div className="row"><Find v={q} on={setQ} ph="Filter recipient or subject" /><Sel label="Template" v={tpl} on={setTpl} opts={['Any template', ...new Set(EMAILS.map(e => e.tpl))]} /><Sel label="Status" v={st} on={setSt} opts={['Any status', 'Delivered', 'Opened', 'Queued', 'Bounced']} /></div>
    <Table rows={rows} sel onRow={setOpen} bulk={<Btn onClick={exp}>Export selected</Btn>} empty={{ ic: 'email', t: 'No emails sent yet' }}
      cols={[{ k: 'sub', l: 'Email', w: 'minmax(260px,2fr)', r: e => <Two a={e.sub} b={e.to} mo /> }, { k: 'tpl', l: 'Template', mo: 1, w: '160px', hide: 'lap' }, { k: 'st', l: 'Status', w: '104px', r: e => <St v={e.st} /> }, { k: 't', l: 'Sent', w: '128px', ns: 1 }]} />
    {open && <Modal title={open.sub} onClose={() => setOpen(null)} foot={<Btn k="p" onClick={() => setOpen(null)}>Done</Btn>}>
      <KV rows={[['To', <span className="mo">{open.to}</span>], ['From', 'Amplified Impact'], ['Template', <span className="mo">{open.tpl}</span>], ['Provider', 'Resend'], ['Status', <St v={open.st} />], ['Sent', open.t + ' MST']]} />
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

/* ---------- command palette ---------- */
function searchAll(q, can, mods) {
  const s = q.trim().toLowerCase(); const m = t => !s || t.toLowerCase().includes(s);
  return [
    ['Pages', [...NAV.flatMap(g => g[1]).filter(n => m(n[1]) && (!n[2] || can(n[2]))).map(n => ({ ic: n[0], l: n[1], to: [n[0]] })), ...Object.entries(AREAS).flatMap(([k, ts]) => ts.map(t => ({ ic: k, l: k[0].toUpperCase() + k.slice(1) + ' › ' + t[1], to: [k, null, t[0]] }))).filter(x => s && m(x.l))]],
    ['Users', USERS.filter(u => m(u.n + u.e)).map(u => ({ ic: 'users', l: u.n, r: u.e, to: ['user', u.id] }))],
    ['Teams', WS.filter(w => m(w.n + w.plan)).map(w => ({ ic: 'workspaces', l: w.n, r: w.plan, to: ['workspace', w.id] }))],
    ['Weeks', LIB.filter(w => m(w.t)).map(w => ({ ic: 'curriculum', l: w.t, r: w.st, to: ['week', String(w.id)] }))],
    ['Invoices', INV.filter(i => m(i.id + i.c)).map(i => ({ ic: 'billing', l: i.id, r: i.c + ' · ' + i.amt, to: ['billing', null, 'invoices'], mo: 1 }))],
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
  const ok = !d.needReason || r.trim();
  return <Modal title={d.title} onClose={onClose} foot={<><Btn onClick={onClose}>Cancel</Btn><Btn k={'p' + (d.danger ? ' d' : '')} disabled={!ok} onClick={() => { onClose(); d.yes(r.trim()); }}>{d.cta}</Btn></>}>
    <p className="s2">{d.body}</p>
    {d.needReason && <label className="lab">Reason<input className="in" autoFocus value={r} onChange={e => setR(e.target.value)} placeholder="Required" /></label>}
    <p className="me">This action is audit-logged.</p>
  </Modal>;
}

const INTAKE_FORM = {"sections": [{"title": "You and Your Team", "questions": [{"id": "name", "label": "Your name and email.", "kind": "short", "required": true}, {"id": "team", "label": "Your team's name and brokerage.", "kind": "short", "required": true}, {"id": "size", "label": "Team size (how many agents and staff today).", "kind": "short"}, {"id": "lead-desk", "label": "Who leads your lead desk?", "kind": "short"}, {"id": "cadence", "label": "Your weekly meeting cadence (meetings, day and time, who runs each).", "kind": "long"}, {"id": "one-on-ones", "label": "Do you hold 1:1s with your agents?", "kind": "long"}]}, {"title": "Your Operator", "questions": [{"id": "operator", "label": "Who is your operator?", "kind": "choice", "required": true, "options": ["I'm both", "A teammate"]}, {"id": "operator-name", "label": "Their name and email.", "kind": "short"}, {"id": "invited", "label": "Have you invited them in the portal yet?", "kind": "choice", "options": ["Yes", "Not yet"]}]}, {"title": "Your AI", "questions": [{"id": "ai", "label": "Which AI will your team use for the course?", "kind": "choice", "required": true, "options": ["Claude", "ChatGPT"]}, {"id": "plan", "label": "Which plan are you on, or will you be on by Monday, November 30?", "kind": "choice", "required": true, "options": ["Claude Pro", "Claude Max", "Claude Team", "ChatGPT Plus", "ChatGPT Pro", "ChatGPT Business", "Not on a paid plan yet"]}, {"id": "account", "label": "Whose AI account runs your hires?", "kind": "choice", "options": ["The operator's account (our default)", "The owner's account", "Another teammate's account"]}, {"id": "chatgpt-admin", "label": "On ChatGPT only: does that person have admin access to your ChatGPT workspace?", "kind": "choice", "options": ["Yes", "No", "Not on ChatGPT"]}]}, {"title": "Your Stack", "questions": [{"id": "books", "label": "Your accounting system.", "kind": "choice", "options": ["QuickBooks Online", "QuickBooks Desktop", "Xero", "My bookkeeper has it", "Something else"]}, {"id": "books-close", "label": "Who owns your accounting and reports, and what day do your books usually close each month?", "kind": "long"}, {"id": "sisu", "label": "Do you use Sisu?", "kind": "long"}, {"id": "crm", "label": "Your CRM.", "kind": "long"}, {"id": "google", "label": "Email, calendar and files: is your team on Google Workspace?", "kind": "choice", "required": true, "options": ["Yes", "No"]}, {"id": "google-other", "label": "If you are not on Google, what do you use?", "kind": "short"}, {"id": "tasks", "label": "Where your tasks live.", "kind": "long"}]}, {"title": "Anything We Should Know", "questions": [{"id": "problems", "label": "Three recurring problems you'd like off your plate.", "kind": "long"}, {"id": "access", "label": "Known access restrictions.", "kind": "long"}]}]};
const NORTHLINE = {"name": "Alex Morgan, alex@northlinerealty.example", "team": "Northline Realty, an independent brokerage", "size": "9 agents, 3 staff", "lead-desk": "me", "cadence": "Monday 9:00 AM team meeting, I run it. Thursday 2:00 PM pipeline review, our operations lead runs it.", "one-on-ones": "Yes. I run them every other week.", "operator": "A teammate", "operator-name": "Our operations lead, ops@northlinerealty.example", "invited": "Not yet", "ai": "Claude", "plan": "Claude Team", "account": "The operator's account (our default)", "chatgpt-admin": "Not on ChatGPT", "books": "QuickBooks Online", "books-close": "Our bookkeeper owns them. The books close on the 5th.", "sisu": "Yes. Our operations lead has admin access.", "crm": "Follow Up Boss. Yes, we can export speed to lead.", "google": "Yes", "tasks": "Asana, and too many sticky notes.", "problems": "Stale leads nobody follows up. Monthly numbers built by hand. Contract deadlines that slip.", "access": "Our brokerage limits API access to the transaction system."};
const CM_DATA = {"people": {"am": {"name": "Alex Morgan", "team": "Northline Realty", "initials": "AM"}, "dw": {"name": "Dana Whitlock", "team": "Sample Team", "initials": "DW"}, "cl": {"name": "Connor Leiva", "team": "Amplified Impact", "initials": "CL", "staff": true}}, "spaces": [{"id": "general", "label": "General"}, {"id": "week-0", "label": "Week 0 · Foundations"}, {"id": "wins", "label": "Wins"}], "threads": [{"id": 1, "space": "general", "title": "Start here: how to ask so the cohort can help", "pinned": true, "activity": "2 days ago", "posts": [{"id": 11, "by": "cl", "when": "Wed, Nov 18 · 9:00 AM CT", "body": "Say the number, what you tried and where you’re stuck.\n\nKeep it to one question a thread, so the next team can find it."}]}, {"id": 2, "space": "week-0", "title": "Our bookkeeper keeps the QuickBooks login. Can the operator still connect the books?", "activity": "3 hr ago", "posts": [{"id": 21, "by": "dw", "when": "Thu, Nov 19 · 4:10 PM CT", "body": "Step 6 asks us to connect the books. Our bookkeeper keeps the login and won’t share it.\n\nIs an export enough for now?"}, {"id": 22, "by": "cl", "when": "Thu, Nov 19 · 5:02 PM CT", "body": "Yes. An export is the yellow route on your stack card.\n\nPut your bookkeeper on the card as the person who has it, and send the card back."}, {"id": 23, "by": "am", "when": "Fri, Nov 20 · 12:20 PM CT", "body": "Same here. We asked ours for an export each month and that was fine."}]}, {"id": 3, "space": "week-0", "title": "Ready Check is green on Claude. Do we run it on ChatGPT too?", "activity": "5 hr ago", "posts": [{"id": 31, "by": "am", "when": "Fri, Nov 20 · 10:05 AM CT", "body": "We picked Claude for the course. One teammate still uses ChatGPT for other work.\n\nDo we need the Ready Check on both?"}]}, {"id": 4, "space": "wins", "title": "Win: the test hire ran with nobody at the keyboard", "activity": "1 day ago", "posts": [{"id": 41, "by": "dw", "when": "Thu, Nov 19 · 8:15 AM CT", "body": "Step 8 is done. It ran on its own this morning."}]}, {"id": 5, "space": "general", "title": "Test post, please ignore", "hidden": true, "activity": "2 days ago", "posts": [{"id": 51, "by": "dw", "when": "Wed, Nov 18 · 2:30 PM CT", "body": "Checking that this works."}]}]};
/* =====================================================================================================
   NEW (Nov 20, 2026). How the LMS's intake form, Turn in and the GHL sync reach the admin portal.
   Drawn with this mockup's own primitives (Head, Tabs, Table, Card, KV, Facts, St, Pill, Btn) and its CSS.
   The few classes added for these screens are at the end of CSS, marked "added".
   Made-up sample data: Northline Realty (Alex Morgan) and the skills' Sample Team (Jordan Avery, Dana Whitlock)
   carry the written answers; the other rows are this mockup's own teams.
   ===================================================================================================== */
const QS = INTAKE_FORM.sections.flatMap(s => s.questions.map(q => ({ ...q, sec: s.title })));
const QN = QS.length;
const SAMPLE_TEAM = { name: 'Jordan Avery, jordan@sampleteam.example', team: 'Sample Team', size: '6 agents, 2 staff', 'lead-desk': 'Dana Whitlock', cadence: 'Tuesday 8:30 AM team meeting. Jordan runs it.', 'one-on-ones': 'Monthly, with every agent.', operator: 'A teammate', 'operator-name': 'Dana Whitlock, dana@sampleteam.example', invited: 'Yes', ai: 'ChatGPT', plan: 'ChatGPT Business', account: "The operator's account (our default)", 'chatgpt-admin': 'Yes', books: 'QuickBooks Online', 'books-close': 'Dana owns them. They close by the 10th.', sisu: 'No.', crm: 'Follow Up Boss.', google: 'Yes', 'google-other': '', tasks: 'A shared Google Sheet.', problems: 'Leads from the portal go cold over the weekend. Nobody knows what last month made until the 20th. Listing checklists live in three places.', access: 'None that we know of.' };
/* st: Submitted | Draft | Not started.  ghl: Synced | Pending | Failed | '' (nothing to send yet) */
const IR = [
  { id: 'ws_northline', n: 'Northline Realty', owner: 'Alex Morgan', st: 'Submitted', when: 'Nov 19, 4:02 PM', by: 'Alex Morgan', done: 21, op: 'A teammate', opn: 'Operations lead', ghl: 'Synced', a: NORTHLINE },
  { id: 'ws_sampleteam', n: 'Sample Team', owner: 'Jordan Avery', st: 'Submitted', when: 'Nov 18, 10:15 AM', by: 'Jordan Avery', done: 21, op: 'A teammate', opn: 'Dana Whitlock', ghl: 'Synced', a: SAMPLE_TEAM },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', owner: 'Devon Achterberg', st: 'Submitted', when: 'Nov 20, 9:40 AM', by: 'Devon Achterberg', done: 20, op: "I'm both", opn: 'The owner', ghl: 'Failed', a: { operator: "I'm both", ai: 'Claude', plan: 'Claude Pro', google: 'No', 'google-other': 'Microsoft 365', books: 'Xero', sisu: 'Yes.', crm: 'Lofty.', problems: 'Follow-up on old leads. Month-end numbers. Agent onboarding.' } },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', owner: 'Jordan Hale', st: 'Draft', when: 'Saved Nov 20, 2:11 PM', by: 'Jordan Hale', done: 9, op: '', opn: '', ghl: '', a: { ai: 'Claude', plan: 'Not on a paid plan yet', google: 'Yes', books: 'QuickBooks Online' } },
  { id: 'ws_lantern', n: 'Lantern Street Partners', owner: 'Tessa Lindqvist', st: 'Draft', when: 'Saved Nov 17, 8:05 AM', by: 'Tessa Lindqvist', done: 4, op: '', opn: '', ghl: '', a: { ai: 'ChatGPT' } },
  { id: 'ws_northshore', n: 'Northshore Group', owner: 'Elena Vargas', st: 'Not started', when: '', by: '', done: 0, op: '', opn: '', ghl: '', a: {} },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', owner: 'Noor Haddad', st: 'Not started', when: '', by: '', done: 0, op: '', opn: '', ghl: '', a: {} },
];
/* "To sort out": what a team's answers say has to be fixed before the first build. Worked out from the answers.
   Sisu and the CRM are written answers today, so those two are read by rule: an answer that starts with "No" is not
   on Sisu; an answer that doesn't name Follow Up Boss (or FUB) is not on FUB. A question left blank raises no flag. */
const FLAGS = [
  ['No operator named', r => !r.a.operator],
  ['Operator not invited', r => r.a.operator === 'A teammate' && r.a.invited === 'Not yet'],
  ['Not on a paid plan yet', r => r.a.plan === 'Not on a paid plan yet'],
  ['Not on Google', r => r.a.google === 'No'],
  ['Not on Sisu', r => /^\s*no\b/i.test(r.a.sisu || '')],
  ['Not on FUB', r => !!r.a.crm && !/follow up boss|\bfub\b/i.test(r.a.crm)],
];
IR.forEach(r => { r.flags = r.st === 'Not started' ? [] : FLAGS.filter(f => f[1](r)).map(f => f[0]); });
const IST = { Submitted: 'ok', Draft: 'warn', 'Not started': '' };
const GHL_ERR = '401 Unauthorized from GHL API';
/* Turned in. st is staff-only: Received | Picked for a live read | Reviewed. The team never sees it. */
const TI0 = [
  { id: 'sub_3', ws: 'ws_sampleteam', team: 'Sample Team', kind: 'Checkpoint', wk: 'Week 1 · Step 6', files: [['Seat card (made up).pdf', '184 KB'], ['First run (made up).png', '2.4 MB']], minutes: 'about 20 a day', note: 'First run was Tuesday. (Made-up note.)', by: 'Dana Whitlock', when: 'Fri, Dec 4 · 9:05 AM', st: 'Received' },
  { id: 'sub_2', ws: 'ws_northline', team: 'Northline Realty', kind: 'Report for a live read', wk: 'Week 1 · Step 4', files: [['Map Your Spend report (made up).html', '184 KB']], minutes: '', note: 'Please look at advertising. (Made-up note.)', by: 'Alex Morgan', when: 'Thu, Dec 3 · 4:02 PM', st: 'Picked for a live read' },
  { id: 'sub_1', ws: 'ws_sampleteam', team: 'Sample Team', kind: 'Report for a live read', wk: 'Week 1 · Step 4', files: [['Map Your Spend report (made up).pdf', '1.2 MB']], minutes: '', note: '', by: 'Dana Whitlock', when: 'Thu, Dec 3 · 11:20 AM', st: 'Reviewed' },
  { id: 'sub_0', ws: 'ws_copperbasin', team: 'Copper Basin Realty', kind: 'Report for a live read', wk: 'Week 1 · Step 4', files: [['Spend map (made up).xlsx', '96 KB']], minutes: '', note: 'Our software line looks high. (Made-up note.)', by: 'Devon Achterberg', when: 'Wed, Dec 2 · 6:48 PM', st: 'Received' },
];
const TST = { Received: '', 'Picked for a live read': 'info', Reviewed: 'ok' };
const TSTS = Object.keys(TST);
const Ghl = ({ v }) => v ? <St v={v} tone={v === 'Synced' ? 'ok' : v === 'Failed' ? 'bad' : 'warn'} /> : <span className="mu">—</span>;
const FileList = ({ files }) => <ul className="fls">{files.map(f => <li key={f[0]}><I n="file" /><button className="lk">{f[0]}</button><span className="me">{f[1]}</span></li>)}</ul>;

/* Learners & Teams › Intake: every team's Week 0 Intake, by team or one question across the cohort */
function IntakeTab() {
  const { go, toast, guard, log } = useC();
  const [f, setF] = useState('All statuses'), [fl, setFl] = useState('All flags');
  const rows = IR.filter(r => (f === 'All statuses' || r.st === f) && (fl === 'All flags' || r.flags.includes(fl)));
  const sync = r => guard('account', 'Sync to GHL', () => { log('intake.ghl_sync', r.n, 'Queued by staff.'); toast('Queued. GHL updates within a minute.'); });
  return <>
    <div className="row"><Sel label="Status" v={f} on={setF} opts={['All statuses', 'Submitted', 'Draft', 'Not started']} /><Sel label="To sort out" v={fl} on={setFl} opts={['All flags', ...FLAGS.map(x => x[0])]} />
      <span className="sp" /><button className="lk" onClick={() => go('forms')}>See the answers added up</button></div>
    <Table rows={rows} onRow={r => go('workspace', r.id, 'intake')} empty={{ ic: 'file', t: 'No team matches', b: 'Change the filters.' }}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(170px,1.2fr)', r: r => <Two a={r.n} b={r.owner} /> },
        { k: 'st', l: 'Status', w: '164px', r: r => <div className="col" style={{ gap: 2, alignItems: 'flex-start' }}><Pill v={r.st} tone={IST[r.st]} />{r.when && <span className="me">{r.when}</span>}</div> },
        { k: 'done', l: 'Answered', w: '136px', r: r => <span className="row nw" style={{ gap: 10 }}><Bar v={r.done} max={QN} v2={0} /><span className="tn" style={{ minWidth: 56, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{r.done} of {QN}</span></span> },
        { k: 'opn', l: 'Operator', w: 'minmax(110px,.8fr)', hide: 'lap', r: r => r.opn || <span className="mu">—</span> },
        { k: 'ai', l: 'AI', w: '140px', hide: 'lap', r: r => r.a.ai ? <Two a={r.a.ai} b={r.a.plan || 'Plan not answered'} /> : <span className="mu">—</span> },
        { k: 'flags', l: 'To sort out', w: 'minmax(190px,1.2fr)', ns: 1, r: r => r.flags.length ? <span className="col" style={{ gap: 4, alignItems: 'flex-start' }}>{r.flags.map(x => <Pill key={x} v={x} tone="warn" />)}</span> : <span className="mu">{r.st === 'Submitted' ? 'Nothing' : '—'}</span> },
        { k: 'ghl', l: 'GHL', w: '92px', r: r => <Ghl v={r.ghl} /> }]}
      menu={r => [{ l: 'Open responses', fn: () => go('workspace', r.id, 'intake') }, { l: 'Download PDF', ic: 'download', off: r.st === 'Not started', fn: () => toast('PDF downloaded') }, '-', { l: r.ghl === 'Failed' ? 'Retry GHL sync' : 'Sync to GHL again', ic: 'refresh', g: 1, off: r.st !== 'Submitted', fn: () => sync(r) }]} />
  </>;
}

/* Forms & Submissions (Support): the cohort added up. One team's answers and files live in Learners & Teams. */
const TEAMS = IR.length;
const Tally = ({ t, rows, total }) => <section className="cd pd col s"><span className="w5">{t}</span>{rows.map(x => <div key={x[0]} className="ty"><span className="el">{x[0]}</span><Bar v={x[1]} max={total} v2={0} /><span className="tn">{x[1]}</span></div>)}</section>;
function FormsIntake() {
  const { go, toast, ph } = useC();
  const [q, setQ] = useState('problems');
  const n = k => IR.filter(r => r.st === k).length;
  const cur = QS.find(x => x.id === q), qi = QS.indexOf(cur);
  const ql = useRef(null);
  /* keep the chosen question in view inside its list (the list scrolls, the page doesn't move) */
  useEffect(() => { const box = ql.current, el = box && box.querySelector('.on'); if (!el) return; const top = el.offsetTop, bot = top + el.offsetHeight; if (top < box.scrollTop) box.scrollTop = top - 8; else if (bot > box.scrollTop + box.clientHeight) box.scrollTop = bot - box.clientHeight + 8; }, [q, ph]);
  const count = (id, o) => IR.filter(r => r.a[id] === o).length;
  const opts = id => { const x = QS.find(y => y.id === id); return [...x.options.map(o => [o, count(id, o)]).filter(y => y[1]), ['Not answered', IR.filter(r => !r.a[id]).length]]; };
  const by = (id, yes, test) => { const ans = IR.filter(r => r.a[id]); const y = ans.filter(r => test(r.a[id])).length; return [[yes, y], ['Something else', ans.length - y], ['Not answered', TEAMS - ans.length]]; };
  const tally = cur.options ? cur.options.map(o => [o, count(q, o)]).filter(x => x[1]) : null;
  const sort = FLAGS.map(f => [f[0], IR.filter(r => r.flags.includes(f[0]))]).filter(x => x[1].length);
  return <>
    <Gate n={3}><Facts items={[['Form', 'Week 0 Intake · ' + QN + ' questions'], ['Submitted', n('Submitted') + ' of ' + TEAMS + ' teams'], ['In draft', String(n('Draft'))], ['Not started', String(n('Not started'))], ['Due', 'Mon, Nov 30'], ['GHL', <span className="row nw" style={{ gap: 12 }}><St v="2 synced" tone="ok" /><St v="1 failed" tone="bad" /></span>]]} /></Gate>
    <Card t="To sort out before Wed, Dec 2" sub="From the answers so far. A question left blank raises nothing." right={<Btn onClick={() => go('learners', null, 'intake')}>Open the teams</Btn>} pad={false}>
      {sort.map(x => <div key={x[0]} className="qa"><span><Pill v={x[0]} tone="warn" /></span><div className="row" style={{ gap: '4px 14px' }}><span className="w5 tn">{x[1].length} {x[1].length === 1 ? 'team' : 'teams'}</span>{x[1].map(r => <button key={r.id} className="lk" onClick={() => go('workspace', r.id, 'intake')}>{r.n}</button>)}</div></div>)}
    </Card>
    <div className="g3">
      <Tally t="AI" total={TEAMS} rows={opts('ai')} />
      <Tally t="Plan" total={TEAMS} rows={opts('plan')} />
      <Tally t="Operator" total={TEAMS} rows={opts('operator')} />
      <Tally t="Google Workspace" total={TEAMS} rows={opts('google')} />
      <Tally t="Sisu" total={TEAMS} rows={[['Yes', IR.filter(r => r.a.sisu && !/^\s*no\b/i.test(r.a.sisu)).length], ['No', IR.filter(r => /^\s*no\b/i.test(r.a.sisu || '')).length], ['Not answered', IR.filter(r => !r.a.sisu).length]]} />
      <Tally t="CRM" total={TEAMS} rows={by('crm', 'Follow Up Boss', v => /follow up boss|\bfub\b/i.test(v))} />
    </div>
    <section className="cd">
      <div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Read one question across the cohort</h2>{!ph && <span className="me">Pick a question. Every team's answer is beside it.</span>}</div>
        <span className="row nw" style={{ gap: 4, flex: 'none' }}><span className="me tn" style={{ whiteSpace: 'nowrap', marginRight: 4 }}>{qi + 1} of {QN}</span>
          <button className="ib" aria-label="Previous question" disabled={qi === 0} onClick={() => setQ(QS[qi - 1].id)}><I n="up" /></button>
          <button className="ib" aria-label="Next question" disabled={qi === QN - 1} onClick={() => setQ(QS[qi + 1].id)}><I n="down" /></button></span></div>
      <div className="qr">
        <nav className="ql" aria-label="Questions" ref={ql}>{INTAKE_FORM.sections.map(s => <Fragment key={s.title}><div className="qls">{s.title}</div>
          {s.questions.map(x => <button key={x.id} className={'qli' + (x.id === q ? ' on' : '')} aria-current={x.id === q ? 'true' : undefined} onClick={() => setQ(x.id)}><span>{x.label}</span><span className="tn">{IR.filter(r => r.a[x.id]).length}/{TEAMS}</span></button>)}</Fragment>)}</nav>
        <div className="qrd">
          <div className="qrh"><h3>{cur.label}</h3><span className="me">{cur.sec}{cur.required ? ' · Required' : ''} · {IR.filter(r => r.a[q]).length} of {TEAMS} teams answered</span>
            {tally && <div className="row" style={{ gap: 8, marginTop: 6 }}>{tally.map(t => <Pill key={t[0]} tone="">{t[0]} <b className="tn">{t[1]}</b></Pill>)}</div>}</div>
          {IR.map(r => <div key={r.id} className="qa"><div className="col" style={{ gap: 0, alignItems: 'flex-start' }}><button className="lk w5" style={{ textAlign: 'left' }} onClick={() => go('workspace', r.id, 'intake')}>{r.n}</button><span className="me">{r.owner}</span></div>
            <div>{r.a[q] ? <p>{r.a[q]}</p> : <span className="mu">{r.st === 'Not started' ? 'Not started' : 'Not answered'}</span>}</div></div>)}
        </div>
      </div>
    </section>
  </>;
}
const ASKS = [['Week 1', 'Report for a live read', 'Step 4'], ['Week 1', 'Checkpoint', 'Step 6']];
function FormsTurnedIn() {
  const { go } = useC();
  const rows = ASKS.map(a => { const subs = TI0.filter(x => x.kind === a[1]); const teams = [...new Set(subs.map(x => x.ws))]; return { a, subs, teams, not: IR.filter(r => !teams.includes(r.id)) }; });
  return <>
    <Gate n={3}><Facts items={[['Open week', 'Week 1 · Where the Money Goes'], ['Turned in', TI0.length + ' from ' + new Set(TI0.map(x => x.ws)).size + ' of ' + TEAMS + ' teams'], ['Not looked at yet', <span className="w5">{TI0.filter(r => r.st === 'Received').length}</span>], ['Picked for a live read', String(TI0.filter(r => r.st === 'Picked for a live read').length)], ['Reviewed', String(TI0.filter(r => r.st === 'Reviewed').length)]]} /></Gate>
    <Table title="What each week asks for" rows={rows} onRow={() => go('learners', null, 'turnedin')}
      cols={[{ k: 'a', l: 'Ask', w: 'minmax(190px,1.3fr)', r: x => <Two a={x.a[1]} b={x.a[0] + ' · ' + x.a[2]} /> },
        { k: 'teams', l: 'Teams turned in', w: '190px', r: x => <span className="row nw" style={{ gap: 10 }}><Bar v={x.teams.length} max={TEAMS} v2={0} /><span className="tn" style={{ minWidth: 48, textAlign: 'right', flex: 'none', whiteSpace: 'nowrap' }}>{x.teams.length} of {TEAMS}</span></span> },
        { k: 'r', l: 'Not looked at', w: '112px', r: x => <span className="tn">{x.subs.filter(s => s.st === 'Received').length}</span> },
        { k: 'p', l: 'Picked', w: '80px', r: x => <span className="tn">{x.subs.filter(s => s.st === 'Picked for a live read').length}</span> },
        { k: 'v', l: 'Reviewed', w: '88px', r: x => <span className="tn">{x.subs.filter(s => s.st === 'Reviewed').length}</span> },
        { k: 'not', l: 'Not turned in yet', w: 'minmax(220px,1.6fr)', ns: 1, hide: 'lap', r: x => <span className="me el" style={{ display: 'block' }}>{x.not.map(r => r.n).join(', ')}</span> }]}
      menu={() => [{ l: 'Open the submissions', fn: () => go('learners', null, 'turnedin') }]} />
    <p className="me">Each file, its note and its status are in Learners &amp; Teams › Turned in. Only staff see a status.</p>
  </>;
}
function Forms() {
  const { route, toast } = useC();
  const [tab, setTab] = useState(route.tab || 'intake');
  return <div className="pg">
    <Head t="Forms & Submissions" d="What the cohort has told you and sent you, added up. For one team's answers or files, open the team." right={<Btn ic="download" onClick={() => toast('Exported ' + TEAMS + ' teams as CSV')}>Export CSV</Btn>} />
    <Tabs v={tab} on={setTab} tabs={[['intake', 'Intake', IR.filter(r => r.st === 'Submitted').length + ' of ' + TEAMS], ['turnedin', 'Turned in', TI0.length]]} />
    {tab === 'intake' ? <FormsIntake /> : <FormsTurnedIn />}
  </div>;
}

/* Learners & Teams › Turned in: every file a team has sent, newest first */
function TurnedInTab() {
  const { go, toast, guard, log } = useC();
  const [rows, setRows] = useState(TI0), [kind, setKind] = useState('All kinds'), [st, setSt] = useState('All statuses');
  const set = (r, v) => guard('account', 'Mark ' + v, () => { setRows(x => x.map(y => y.id === r.id ? { ...y, st: v } : y)); log('submission.status', r.team, v + '.'); toast('Marked ' + v.toLowerCase() + '. The team is not told.'); });
  const L = rows.filter(r => (kind === 'All kinds' || r.kind === kind) && (st === 'All statuses' || r.st === st));
  return <>
    <Gate n={3}><Facts items={[['Week', 'Week 1 · Where the Money Goes'], ['Turned in', rows.length + ' from 3 teams'], ['Reports for a live read', String(rows.filter(r => r.kind !== 'Checkpoint').length)], ['Checkpoints', String(rows.filter(r => r.kind === 'Checkpoint').length)], ['Not looked at yet', <span className="w5">{rows.filter(r => r.st === 'Received').length}</span>]]} /></Gate>
    <div className="row"><Sel label="Week" v="Week 1" on={() => {}} opts={['Week 1', 'All weeks']} /><Sel label="Kind" v={kind} on={setKind} opts={['All kinds', 'Report for a live read', 'Checkpoint']} /><Sel label="Status" v={st} on={setSt} opts={['All statuses', ...TSTS]} /><span className="sp" /><span className="me">Only staff see the status. Teams see what they sent.</span></div>
    <Table rows={L} onRow={r => go('workspace', r.ws, 'turnedin')} empty={{ ic: 'file', t: 'Nothing turned in yet', b: 'Files appear here when a team uses Turn in on a step.' }}
      cols={[{ k: 'team', l: 'Team', w: 'minmax(150px,1.1fr)', r: r => <Two a={r.team} b={r.by} /> },
        { k: 'kind', l: 'What', w: '178px', r: r => <Two a={r.kind} b={r.wk} /> },
        { k: 'files', l: 'Files', w: 'minmax(170px,1.3fr)', ns: 1, r: r => <Two a={r.files[0][0]} b={r.files.length > 1 ? '+ ' + (r.files.length - 1) + ' more' : r.files[0][1]} /> },
        { k: 'note', l: 'Note', w: 'minmax(140px,1.2fr)', hide: 'lap', ns: 1, r: r => r.note ? <span className="el" style={{ display: 'block' }}>{r.note}</span> : <span className="mu">—</span> },
        { k: 'when', l: 'Turned in', w: '150px', ns: 1 },
        { k: 'st', l: 'Status', w: '166px', r: r => <Pill v={r.st} tone={TST[r.st]} /> }]}
      menu={r => [{ l: 'Download files', ic: 'download', fn: () => toast(r.files.length + (r.files.length === 1 ? ' file' : ' files') + ' downloaded') }, { l: 'Open team', fn: () => go('workspace', r.ws, 'turnedin') }, '-', ...TSTS.map(v => ({ l: 'Mark ' + v.toLowerCase(), g: 1, on: r.st === v, fn: () => set(r, v) }))]} />
  </>;
}

/* Workspace › Intake: one team's answers, as the team wrote them */
function WsIntake({ w }) {
  const { toast, startMasq } = useC();
  const r = IR.find(x => x.id === w.id);
  if (!r || r.st === 'Not started') return <div className="cd"><Empty ic="file" t="No intake yet" b="This team hasn't opened the Week 0 Intake. It is due Mon, Nov 30." /></div>;
  const miss = QS.filter(x => x.required && !r.a[x.id]);
  return <div className="col">
    <div className="cd pd"><div className="row"><Pill v={r.st} tone={IST[r.st]} /><span className="w5">{r.st === 'Submitted' ? 'Submitted ' + r.when + ' by ' + r.by : r.when + ' by ' + r.by}</span><span className="me">{r.done} of {QN} answered</span><span className="sp" /><Btn ic="download" onClick={() => toast('PDF downloaded')}>Download PDF</Btn></div>
      {r.st === 'Draft' && miss.length > 0 && <p className="me" style={{ marginTop: 10 }}>Still needed before they can submit: {miss.map(x => x.label.replace(/\.$/, '')).join(' · ')}</p>}
      <p className="me" style={{ marginTop: 10 }}>These are the team's own words. You can't edit them here.</p></div>
    {INTAKE_FORM.sections.map(s => <Card key={s.title} t={s.title} sub={s.questions.filter(x => r.a[x.id]).length + ' of ' + s.questions.length + ' answered'}><dl className="qkv">{s.questions.map(x => <Fragment key={x.id}><dt>{x.label}{x.required && !r.a[x.id] && <Pill v="Required" tone="warn" />}</dt><dd>{r.a[x.id] || <span className="mu">Not answered</span>}</dd></Fragment>)}</dl></Card>)}
  </div>;
}
/* Workspace › the GHL card beside the answers: where they went, and a way to send them again */
function WsGhl({ w }) {
  const { toast, guard, log } = useC();
  const r = IR.find(x => x.id === w.id);
  if (!r || !r.ghl) return <Card t="GHL" sub="Where this team's answers go."><p className="mu">Nothing is sent until the team submits.</p></Card>;
  const bad = r.ghl === 'Failed';
  const both = r.op === "I'm both";
  return <Card t="GHL" sub="Where this team's answers went."><div className="col m">
    <div className="kvs"><KV rows={[['Status', <Ghl v={r.ghl} />], bad ? ['Error', <span style={{ color: 'var(--bad)' }}>{GHL_ERR}</span>] : ['Last sync', r.when.replace('Nov 19, 4:02', 'Nov 19, 4:03').replace('Nov 18, 10:15', 'Nov 18, 10:16')], bad ? ['Tried', '3 times. Next try at 2:40 PM.'] : ['Fields written', r.done + ' answers and the submitted date'],
      ['Owner’s contact', <button className="lk">{r.owner}</button>], ['Operator’s contact', both ? 'None. The owner is the operator.' : bad ? 'Not created yet' : <span><button className="lk">{r.opn}</button> <span className="me">· related to the owner as Operator</span></span>], ['Tag', <span className="mo">ai-intake-submitted</span>]]} /></div>
    <div className="row"><Btn ic="refresh" onClick={() => guard('account', 'Sync to GHL', () => { log('intake.ghl_sync', w.n, 'Queued by staff.'); toast('Queued. GHL updates within a minute.'); })}>{bad ? 'Retry now' : 'Sync again'}</Btn></div>
  </div></Card>;
}
/* Workspace › Turned in: this team's files, with the staff-only status */
function WsTurnedIn({ w }) {
  const { toast, guard, log } = useC();
  const [rows, setRows] = useState(TI0.filter(x => x.ws === w.id));
  if (!rows.length) return <div className="cd"><Empty ic="file" t="Nothing turned in yet" b="Files appear here when this team uses Turn in on a step." /></div>;
  return <div className="col">{rows.map(r => <Card key={r.id} t={r.kind} sub={r.wk + ' · turned in ' + r.when + ' by ' + r.by}
    right={<Sel label="Status" v={r.st} opts={TSTS} on={v => guard('account', 'Mark ' + v, () => { setRows(x => x.map(y => y.id === r.id ? { ...y, st: v } : y)); log('submission.status', w.n, v + '.'); toast('Marked ' + v.toLowerCase() + '. The team is not told.'); })} />}>
    <div className="kvs"><KV rows={[['Files', <FileList files={r.files} />], ...(r.minutes ? [['Minutes the hire took over', r.minutes]] : []), [r.kind === 'Checkpoint' ? 'Anything Connor should know?' : 'What should Connor look at?', r.note || <span className="mu">No note</span>]]} /></div>
  </Card>)}<p className="me">Only staff see the status. The team sees what they sent and when.</p></div>;
}

/* Build › Curriculum › a week: the three cards these features add to the Week Builder */
function WeekCards() {
  const { go, toast, guard } = useC();
  const [req, setReq] = useState(Object.fromEntries(QS.map(x => [x.id, !!x.required])));
  const [open, setOpen] = useState(INTAKE_FORM.sections[0].title);
  const nreq = Object.values(req).filter(Boolean).length;
  return <div className="pg">
    <Head back={['curriculum', 'Curriculum']} t="Week Builder: what changes" d="Three cards. The intake's questions gain a Required switch. A step's checklist item can ask for a file. And each week shows what teams have sent." />
    <div className="g2" style={{ alignItems: 'start' }}>
      <Card t="Week 0 Intake" sub={QN + ' questions · ' + nreq + ' required'} right={<Btn k="q" onClick={() => toast('Question editor opens here')}>Edit questions</Btn>}>
        <div className="col m">
          <p className="me">A required question has to be answered before a team can submit. Operator, AI, plan and Google also drive personalization, so they stay required.</p>
          {INTAKE_FORM.sections.map(s => <div key={s.title} className="col s">
            <button className="lk w5 row nw" style={{ gap: 6, alignSelf: 'flex-start' }} aria-expanded={open === s.title} onClick={() => setOpen(open === s.title ? '' : s.title)}><I n={open === s.title ? 'chevd' : 'chev'} />{s.title}<span className="me" style={{ fontWeight: 400 }}>{s.questions.filter(x => req[x.id]).length} of {s.questions.length} required</span></button>
            {open === s.title && s.questions.map(x => { const lock = ['operator', 'ai', 'plan', 'google'].includes(x.id); return <label key={x.id} className="rq"><span>{x.label}<span className="me"> · {x.kind === 'choice' ? 'Choice' : x.kind === 'long' ? 'Long answer' : 'Short answer'}</span></span>
              <span className="row nw" style={{ gap: 8 }}>{lock && <I n="lock" />}<input type="checkbox" className="chk" checked={req[x.id]} disabled={lock} aria-label={'Required: ' + x.label} onChange={e => guard('build', 'Change a question', () => setReq({ ...req, [x.id]: e.target.checked }))} />Required</span></label>; })}
          </div>)}
        </div>
      </Card>
      <div className="col">
        <Card t="Turn in" sub="Week 1 · what this week asks teams to send" right={<GBtn perm="build" label="Add an ask" go={() => toast('Pick a step and a checklist item')} ic="plus">Add</GBtn>}>
          <div className="col m">
            {[['Report for a live read', 'Step 4 · on the box “Submit your report for a live read, or bring one question”', 'PDF, HTML, PNG, JPG, Excel or CSV · up to 5 files, 25 MB each'], ['Checkpoint', 'Step 6 · on the box “Send your checkpoint”', 'Also asks for the minutes the hire took over']].map(a => <div key={a[0]} className="note col s"><span className="row"><span className="w5">{a[0]}</span><span className="sp" /><Pill v="Upload" tone="info" /></span><span className="s2">{a[1]}</span><span className="me">{a[2]}</span></div>)}
            <p className="me">Set on a step's checklist item: its action becomes Upload, with a kind. The learner sees a Turn in button on that box.</p>
          </div>
        </Card>
        <Card t="Submissions" sub="Week 1 · what teams have sent" right={<Btn onClick={() => go('learners', null, 'turnedin')}>Open all</Btn>}>
          <KV rows={[['Turned in', TI0.length + ' from 3 teams'], ['Not looked at yet', String(TI0.filter(r => r.st === 'Received').length)], ['Picked for a live read', String(TI0.filter(r => r.st === 'Picked for a live read').length)]]} />
        </Card>
      </div>
    </div>
  </div>;
}

/* =====================================================================================================
   NEW (Nov 21, 2026). Community, in the admin portal. Connor's account is a staff account: it opens the admin and
   nothing else, so this is where he reads the cohort's threads, replies as staff, pins, hides and deletes.
   The threads are the same made-up ones the learner mockup shows. Same primitives and CSS as the rest of this mockup.
   ===================================================================================================== */
const CME = 'cl';                                   /* the signed-in staff member */
const CMP = CM_DATA.people, CMS = CM_DATA.spaces;
let CMT = JSON.parse(JSON.stringify(CM_DATA.threads)), cmSeq = 900;
const spaceLabel = id => (CMS.find(s => s.id === id) || {}).label || id;
const lastPost = t => [...t.posts].reverse().find(p => !p.hidden) || t.posts[0];
const waiting = t => !t.hidden && !CMP[lastPost(t).by].staff;      /* the last word is a member's */
const Who = ({ id, when }) => { const p = CMP[id]; return <div className="row nw" style={{ gap: 10, minWidth: 0 }}><span className="av">{p.initials}</span><div className="col" style={{ gap: 0, minWidth: 0 }}><span className="row nw" style={{ gap: 6 }}><span className="w5 el">{p.name}</span>{p.staff && <Pill v="Staff" tone="ok" />}</span><span className="me el">{p.team}{when ? ' · ' + when : ''}</span></div></div>; };
const ThreadPills = ({ t }) => <span className="row" style={{ gap: 6 }}>{t.pinned && <Pill v="Pinned" tone="info" />}{t.hidden && <Pill v="Hidden" tone="warn" />}{waiting(t) && <Pill v="Waiting on you" tone="" />}</span>;
function useCm() { const [, bump] = useState(0); return fn => { fn(); bump(n => n + 1); }; }

function Community() {
  const { go, toast, guard, log } = useC();
  const act = useCm();
  const [tab, setTab] = useState('all'), [sp, setSp] = useState('All spaces'), [q, setQ] = useState(''), [compose, setCompose] = useState(false);
  const [d, setD] = useState({ space: 'general', title: '', body: '' });
  const F = { all: () => true, waiting, pinned: t => t.pinned, hidden: t => t.hidden };
  const rows = CMT.filter(t => F[tab](t) && (sp === 'All spaces' || spaceLabel(t.space) === sp) && (t.title + t.posts[0].body).toLowerCase().includes(q.toLowerCase()));
  const pin = t => guard('account', (t.pinned ? 'Unpin ' : 'Pin ') + 'a thread', () => act(() => { t.pinned = !t.pinned; log('community.pin', t.title, t.pinned ? 'Pinned.' : 'Unpinned.'); toast(t.pinned ? 'Pinned to the top for the cohort' : 'Unpinned'); }));
  const hide = t => guard('account', (t.hidden ? 'Show ' : 'Hide ') + 'a thread', () => act(() => { t.hidden = !t.hidden; log('community.hide', t.title, t.hidden ? 'Hidden from the cohort.' : 'Shown again.'); toast(t.hidden ? 'Hidden. Only staff can see it.' : 'The cohort can see it again'); }));
  const post = () => guard('account', 'Start a thread', () => act(() => { const id = ++cmSeq; CMT = [{ id, space: d.space, title: d.title.trim(), activity: 'just now', posts: [{ id: ++cmSeq, by: CME, when: 'Just now', body: d.body.trim() }] }, ...CMT]; setCompose(false); setD({ space: 'general', title: '', body: '' }); toast('Posted to the cohort as staff'); go('cthread', String(id)); }));
  return <div className="pg">
    <Head t="Community" d="The December 2026 Cohort's threads. You read, reply and moderate here, as staff. The cohort sees your posts with a Staff tag. Nothing is emailed." right={<GBtn k="p" ic="plus" perm="account" label="Start a thread" go={() => setCompose(true)}>Start a thread</GBtn>} />
    <Gate n={3}><Facts items={[['Threads', String(CMT.filter(t => !t.hidden).length)], ['Waiting on you', <span className="w5">{CMT.filter(waiting).length}</span>], ['Pinned', String(CMT.filter(t => t.pinned).length)], ['Hidden', String(CMT.filter(t => t.hidden).length)], ['Members', '15 in 7 teams']]} /></Gate>
    <Tabs v={tab} on={setTab} tabs={[['all', 'All', CMT.length], ['waiting', 'Waiting on you', CMT.filter(waiting).length], ['pinned', 'Pinned', CMT.filter(t => t.pinned).length], ['hidden', 'Hidden', CMT.filter(t => t.hidden).length]]} />
    <div className="row"><Find v={q} on={setQ} ph="Find a thread" /><Sel label="Space" v={sp} on={setSp} opts={['All spaces', ...CMS.map(s => s.label)]} /></div>
    <Table rows={rows} onRow={t => go('cthread', String(t.id))} empty={{ ic: 'file', t: tab === 'waiting' ? 'Nothing is waiting on you' : 'No threads here', b: tab === 'waiting' ? 'Every thread ends with a reply from staff.' : 'Change the filters, or start one.' }}
      cols={[{ k: 'title', l: 'Thread', w: 'minmax(260px,2.2fr)', ns: 1, r: t => <div className="col" style={{ gap: 0, minWidth: 0 }}><span className="w5 el">{t.title}</span><span className="me el">{t.posts[0].body.replace(/\s+/g, ' ')}</span></div> },
        { k: 'space', l: 'Space', w: '150px', hide: 'lap', r: t => <Pill v={spaceLabel(t.space)} tone="" /> },
        { k: 'by', l: 'Started by', w: 'minmax(140px,1fr)', hide: 'lap', r: t => <Two a={CMP[t.posts[0].by].name} b={CMP[t.posts[0].by].team} /> },
        { k: 'n', l: 'Replies', w: '64px', r: t => <span className="tn">{t.posts.length - 1}</span> },
        { k: 'activity', l: 'Last activity', w: '112px', ns: 1 },
        { k: 'st', l: '', w: '190px', ns: 1, r: t => <ThreadPills t={t} /> }]}
      menu={t => [{ l: 'Open thread', fn: () => go('cthread', String(t.id)) }, '-', { l: t.pinned ? 'Unpin' : 'Pin to the top', g: 1, fn: () => pin(t) }, { l: t.hidden ? 'Show to the cohort' : 'Hide from the cohort', g: 1, fn: () => hide(t) }]} />
    {compose && <Modal title="Start a thread" w={560} onClose={() => setCompose(false)} foot={<><Btn onClick={() => setCompose(false)}>Cancel</Btn><Btn k="p" disabled={!d.title.trim() || !d.body.trim()} onClick={post}>Post thread</Btn></>}>
      <label className="lab">Space<select className="in" value={d.space} onChange={e => setD({ ...d, space: e.target.value })}>{CMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <label className="lab">Title<input className="in" maxLength={140} value={d.title} onChange={e => setD({ ...d, title: e.target.value })} placeholder="One line" /></label>
      <label className="lab">Details<textarea className="in" rows={5} maxLength={4000} value={d.body} onChange={e => setD({ ...d, body: e.target.value })} /></label>
      <p className="me">Posts as {CMP[CME].name} · Staff. Everyone in the cohort can read it. Nothing is emailed.</p>
    </Modal>}
  </div>;
}

function CommunityThread() {
  const { route, go, toast, guard, log, setDlg } = useC();
  const act = useCm();
  const [body, setBody] = useState('');
  const t = CMT.find(x => String(x.id) === String(route.id));
  if (!t) return <NotFound />;
  const first = t.posts[0];
  const pin = () => guard('account', (t.pinned ? 'Unpin ' : 'Pin ') + 'a thread', () => act(() => { t.pinned = !t.pinned; log('community.pin', t.title, t.pinned ? 'Pinned.' : 'Unpinned.'); toast(t.pinned ? 'Pinned to the top for the cohort' : 'Unpinned'); }));
  const hide = () => guard('account', (t.hidden ? 'Show ' : 'Hide ') + 'a thread', () => act(() => { t.hidden = !t.hidden; log('community.hide', t.title, t.hidden ? 'Hidden from the cohort.' : 'Shown again.'); toast(t.hidden ? 'Hidden. Only staff can see it.' : 'The cohort can see it again'); }));
  const hidePost = p => guard('account', (p.hidden ? 'Show ' : 'Hide ') + 'a reply', () => act(() => { p.hidden = !p.hidden; log('community.hide', t.title, (p.hidden ? 'Reply hidden: ' : 'Reply shown: ') + CMP[p.by].name + '.'); toast(p.hidden ? 'Reply hidden. Only staff can see it.' : 'The cohort can see the reply again'); }));
  const del = p => guard('account', 'Delete a post', () => setDlg({ title: p === first ? 'Delete this thread?' : 'Delete this reply?', body: p === first ? 'The thread and its ' + (t.posts.length - 1) + ' replies are removed for everyone. This can’t be undone. To take it out of view and keep it, hide it instead.' : 'The reply by ' + CMP[p.by].name + ' is removed for everyone. This can’t be undone. To take it out of view and keep it, hide it instead.', cta: 'Delete', danger: true,
    yes: () => { log('community.delete', t.title, (p === first ? 'Thread' : 'Reply') + ' by ' + CMP[p.by].name + '.'); if (p === first) { CMT = CMT.filter(x => x !== t); toast('Thread deleted'); go('community'); } else act(() => { t.posts.splice(t.posts.indexOf(p), 1); toast('Reply deleted'); }); } }));
  const reply = () => guard('account', 'Reply', () => act(() => { t.posts.push({ id: ++cmSeq, by: CME, when: 'Just now', body: body.trim() }); t.activity = 'just now'; CMT = [t, ...CMT.filter(x => x !== t)]; setBody(''); toast('Reply posted as staff'); }));
  const Post = ({ p }) => <div className={'cd pd col m' + (p.hidden || (p === first && t.hidden) ? ' cmh' : '')}>
    <div className="row nw" style={{ alignItems: 'flex-start' }}><div style={{ flex: 1, minWidth: 0 }}><Who id={p.by} when={p.when + (p.edited ? ' · edited' : '')} /></div>
      {p.hidden && <Pill v="Hidden" tone="warn" />}
      <Menu rt items={[...(p === first ? [] : [{ l: p.hidden ? 'Show to the cohort' : 'Hide from the cohort', g: 1, fn: () => hidePost(p) }]), { l: p === first ? 'Delete thread' : 'Delete reply', d: 1, g: 1, fn: () => del(p) }]} /></div>
    <div className="cmb">{p.body.split(/\n\n+/).map((x, i) => <p key={i}>{x}</p>)}</div>
  </div>;
  return <div className="pg">
    <Head back={['community', 'Community']} t={t.title} meta={<span className="row" style={{ gap: 6 }}><Pill v={spaceLabel(t.space)} tone="" /><ThreadPills t={t} /></span>}
      right={<><Btn onClick={pin}>{t.pinned ? 'Unpin' : 'Pin to the top'}</Btn><Btn onClick={hide}>{t.hidden ? 'Show to the cohort' : 'Hide from the cohort'}</Btn></>} />
    <div className="gms">
      <div className="col">
        {t.hidden && <div className="note row"><I n="eye" /><span>Hidden from the cohort. Only staff can see this thread.</span></div>}
        <Post p={first} />
        {t.posts.length > 1 && <span className="me">{t.posts.length - 1} {t.posts.length === 2 ? 'reply' : 'replies'}</span>}
        {t.posts.slice(1).map(p => <Post key={p.id} p={p} />)}
        <section className="cd pd col m"><Who id={CME} />
          <textarea className="in" rows={4} maxLength={4000} aria-label="Your reply" value={body} onChange={e => setBody(e.target.value)} placeholder="Reply to the cohort" />
          <div className="row"><Btn k="p" disabled={!body.trim()} onClick={reply}>Reply as staff</Btn><span className="me">Everyone in the cohort can read it. Nothing is emailed.</span></div></section>
      </div>
      <div className="col">
        <Card t="About this thread"><div className="kvs"><KV rows={[['Space', spaceLabel(t.space)], ['Started by', <span>{CMP[first.by].name} <span className="me">· {CMP[first.by].team}</span></span>], ['Started', first.when], ['Replies', String(t.posts.length - 1)], ['Last activity', t.activity], ['The cohort sees it', t.hidden ? 'No. It is hidden.' : t.pinned ? 'Yes, pinned to the top' : 'Yes']]} /></div></Card>
        <Card t="What the cohort can do" sub="For reference."><p className="s2">Members start threads and reply, and edit or delete their own posts. They can’t pin or hide, and they never see a hidden post. Pins, hides and your deletes of someone else’s post are written to the Audit Log.</p></Card>
      </div>
    </div>
  </div>;
}


/* =====================================================================================================
   NEW (Nov 25): Program, Cohort, People, Utah Life and Revenue. Sample data is made up.
   The model: a PROGRAM is what you teach. A COHORT is one group going through it. PEOPLE is everyone
   with a sign-in, sorted by how they got in. Every number on these screens opens the list it counts.
   ===================================================================================================== */

/* Admin times are Mountain (learners see Central, one hour later), so a time that learners see shows both. */
const ACC_WEEKS = [
  { n: 0, t: 'Foundations', o: 'The office is ready for its first hire.', st: 'Published', steps: 8, min: 170, opens: 'Sun, Nov 29', build: null, kit: 7 },
  { n: 1, t: 'Where the Money Goes', o: 'A year of spend on one standard chart.', st: 'Published', steps: 7, min: 150, opens: 'Sun, Nov 29', build: 'Wed, Dec 2', kit: 5 },
  { n: 2, t: 'Leads That Pay', o: 'Every lead source ranked by what it returns.', st: 'Scheduled', steps: 7, min: 160, opens: 'Sun, Dec 6', build: 'Wed, Dec 9', kit: 4 },
  { n: 3, t: 'Numbers on the 5th', o: 'A monthly report that builds itself.', st: 'Draft', steps: 6, min: 140, opens: 'Sun, Dec 13', build: 'Wed, Dec 16', kit: 3 },
  { n: 4, t: 'Protect the Pipeline', o: 'No file goes quiet without someone knowing.', st: 'Draft', steps: 5, min: 120, opens: 'Sun, Jan 3', build: 'Wed, Jan 6', kit: 2 },
  { n: 5, t: 'Coach from Evidence', o: 'One-on-ones that start from the numbers.', st: 'Draft', steps: 4, min: 90, opens: 'Sun, Jan 10', build: 'Wed, Jan 13', kit: 2 },
  { n: 6, t: 'Delegate an Outcome', o: 'A hire that owns a result, not a task.', st: 'Draft', steps: 3, min: 60, opens: 'Sun, Jan 17', build: 'Wed, Jan 20', kit: 0 },
  { n: 7, t: 'Make the Workflow Repeatable', o: 'What worked, written down so it runs again.', st: 'Draft', steps: 0, min: 0, opens: 'Sun, Jan 24', build: 'Wed, Jan 27', kit: 0 },
  { n: 8, t: 'Sustain and Expand', o: 'The next three hires, in order.', st: 'Draft', steps: 0, min: 0, opens: 'Sun, Jan 31', build: 'Wed, Feb 3', kit: 0 },
];
const W0_STEPS = [
  ['Fill In Your Intake and Name Your AI Implementer', ['Owner'], '10 min', 'Intake in, AI Implementer invited, stack card sent back.'],
  ['Watch the Orientation', ['Owner', 'AI Implementer'], '30 min', 'Both know how a week runs and what a hire is.'],
  ['Start Your Time Baseline', ['Owner'], '20 min', 'Six tasks timed per occurrence, or marked not done today.'],
  ['Get Your AI Ready', ['AI Implementer'], '20 min', 'Paid plan, training off, skills on, both cohort skills pass their self-test.'],
  ['Set Up Your AI Brain', ['Owner', 'AI Implementer'], '30 min', 'A new chat knows the business.'],
  ['Connect Your Data', ['AI Implementer'], '30 min', 'Each green source answers a test question.'],
  ['Lock the Guardrails', ['AI Implementer'], '10 min', 'Every write tool blocked except drafts and saves.'],
  ['Run the Ready Check and Your Test Hire', ['AI Implementer'], '20 min', 'Ready Check is green and the test hire ran.'],
];
const WK_STEPS = [
  ['Read the Week and Pick Your Data', ['Owner'], '15 min', 'The export this week needs is in the AI Office.'],
  ['Join the Live Build', ['Owner', 'AI Implementer'], '1 hr 30 min', 'The hire ran once on your own data.'],
  ['Run It Again on Your Own', ['AI Implementer'], '30 min', 'A second run matches the first.'],
  ['Check the Output with the Rubric', ['Owner'], '15 min', 'Every rubric line is a yes or has a note.'],
  ['Turn In Your Report', ['AI Implementer'], '10 min', 'The report is turned in from the step.'],
  ['Bring One Question to Office Hours', ['Owner', 'AI Implementer'], '1 hr', 'The question is posted or asked live.'],
  ['Mark the Hire as Deployed', ['Owner'], '5 min', 'The week shows Deployed.'],
];
const ACC_SES = [
  { n: 1, t: 'Map Your Spend Live Build', k: 'Live build', wk: 1, d: 'Wed, Dec 2', zoom: 'Ready', inv: 'Sent' },
  { n: 2, t: 'Map Your Spend Office Hours', k: 'Office hours', wk: 1, d: 'Thu, Dec 3', zoom: 'Ready', inv: 'Sent' },
  { n: 3, t: 'Lead Source Review Live Build', k: 'Live build', wk: 2, d: 'Wed, Dec 9', zoom: 'No link yet', inv: 'Scheduled' },
  { n: 4, t: 'Lead Source Review Office Hours', k: 'Office hours', wk: 2, d: 'Thu, Dec 10', zoom: 'No link yet', inv: 'Scheduled' },
  { n: 5, t: 'Numbers on the 5th Live Build', k: 'Live build', wk: 3, d: 'Wed, Dec 16', zoom: 'No link yet', inv: 'Draft' },
  { n: 6, t: 'Numbers on the 5th Office Hours', k: 'Office hours', wk: 3, d: 'Thu, Dec 17', zoom: 'No link yet', inv: 'Draft' },
  { n: 7, t: 'Protect the Pipeline Live Build', k: 'Live build', wk: 4, d: 'Wed, Jan 6', zoom: 'No link yet', inv: 'Draft' },
  { n: 8, t: 'Protect the Pipeline Office Hours', k: 'Office hours', wk: 4, d: 'Thu, Jan 7', zoom: 'No link yet', inv: 'Draft' },
];
/* the cohort's teams: the same seven the intake screens use */
const ACC_CT = [
  { id: 'ws_northline', n: 'Northline Realty', owner: 'Alex Morgan', seats: 3, in: 3, pay: 'Paid in full', intake: 'Submitted', w0: 8, last: 'Today, 9:14 AM' },
  { id: 'ws_sampleteam', n: 'Sample Team', owner: 'Jordan Avery', seats: 3, in: 3, pay: 'Paid in full', intake: 'Submitted', w0: 6, last: 'Yesterday, 3:02 PM' },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', owner: 'Devon Achterberg', seats: 1, in: 1, pay: '1 of 2 payments', intake: 'Submitted', w0: 4, last: 'Yesterday, 2:15 PM' },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', owner: 'Jordan Hale', seats: 2, in: 2, pay: 'Paid in full', intake: 'Draft', w0: 2, last: 'Nov 20, 2:11 PM' },
  { id: 'ws_lantern', n: 'Lantern Street Partners', owner: 'Tessa Lindqvist', seats: 2, in: 2, pay: '1 of 2 payments', intake: 'Draft', w0: 1, last: 'Nov 17, 8:05 AM' },
  { id: 'ws_northshore', n: 'Northshore Group', owner: 'Elena Vargas', seats: 2, in: 2, pay: 'Paid in full', intake: 'Not started', w0: 0, last: 'Nov 12, 8:52 AM' },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', owner: 'Noor Haddad', seats: 2, in: 0, pay: 'Paid in full', intake: 'Not started', w0: 0, last: 'Never signed in' },
];
const ACC_CL = [
  { id: 'u_2001', n: 'Alex Morgan', e: 'alex@northlinerealty.example', team: 'Northline Realty', role: 'Owner', w0: 8, last: 'Today, 9:14 AM', st: 'Active' },
  { id: 'u_2002', n: 'Jordan Avery', e: 'jordan@sampleteam.example', team: 'Sample Team', role: 'Owner', w0: 6, last: 'Yesterday, 3:02 PM', st: 'Active' },
  { id: 'u_2003', n: 'Dana Whitlock', e: 'dana@sampleteam.example', team: 'Sample Team', role: 'AI Implementer', w0: 6, last: 'Yesterday, 1:40 PM', st: 'Active' },
  { id: 'u_1090', n: 'Devon Achterberg', e: 'devon@copperbasin.example', team: 'Copper Basin Realty', role: 'Owner and AI Implementer', w0: 4, last: 'Yesterday, 2:15 PM', st: 'Active' },
  { id: 'u_1061', n: 'Jordan Hale', e: 'jordan@halemarlowe.example', team: 'Hale & Marlowe Realty', role: 'Owner', w0: 2, last: 'Nov 20, 2:11 PM', st: 'Active' },
  { id: 'u_1118', n: 'Tessa Lindqvist', e: 'tessa@lanternstreet.example', team: 'Lantern Street Partners', role: 'Owner', w0: 1, last: 'Nov 17, 8:05 AM', st: 'Active' },
  { id: 'u_1042', n: 'Elena Vargas', e: 'elena@northshoregroup.example', team: 'Northshore Group', role: 'Owner', w0: 0, last: 'Nov 12, 8:52 AM', st: 'Active' },
  { id: 'u_1077', n: 'Noor Haddad', e: 'noor@redcliffcollective.example', team: 'Red Cliff Collective', role: 'Owner', w0: 0, last: 'Never', st: 'Invited' },
];
/* how each person got in. One primary audience each, so the counts add up to everyone. */
const AUD = [['acc', 'Accelerator', 15, 'var(--for)'], ['team', 'Team Plan', 39, '#2E9A63'], ['agent', 'Agent Plan', 46, '#6FD3A5'], ['ins', 'Insiders', 6, '#3B74D6'], ['skill', 'Skill buyers', 11, '#D99A1C'], ['ul', 'Utah Life', 31, '#9AA39E']];
const AUD_ALL = AUD.reduce((a, x) => a + x[2], 0);
const audOf = k => (AUD.find(a => a[0] === k) || [])[1];
const PPL = [
  ...ACC_CL.map(p => ({ ...p, a: 'acc' })),
  { id: 'u_1043', n: 'Marcus Oyelaran', e: 'marcus@northshoregroup.example', team: 'Northshore Group', role: 'Agent', a: 'team', last: 'Yesterday, 4:31 PM', st: 'Active' },
  { id: 'u_1125', n: 'Priya Raman', e: 'priya@fourthmeridian.example', team: 'Fourth Meridian', role: 'Owner', a: 'team', last: 'Nov 2, 4:40 PM', st: 'Canceled' },
  { id: 'u_1104', n: 'Sam Whitlock', e: 'sam@tidewaterproperty.example', team: '', role: 'Member', a: 'ins', last: 'Nov 18, 9:03 AM', st: 'Past due' },
  { id: 'ul1', n: 'Utah Life agent', e: 'a•••••@liveutah.com', team: '', role: 'Agent', a: 'ul', last: 'Today, 8:02 AM', st: 'Active' },
  { id: 'ul2', n: 'Utah Life agent', e: 'c•••@liveutah.com', team: '', role: 'Agent', a: 'ul', last: 'Yesterday, 5:47 PM', st: 'Active' },
  { id: 'ul3', n: 'Utah Life agent', e: 'j••••••@liveutah.com', team: '', role: 'Agent', a: 'ul', last: 'Nov 19, 11:20 AM', st: 'Active' },
];
const ULA = [['a•••••@liveutah.com', 'Nov 12', 'Today, 8:02 AM', 9], ['c•••@liveutah.com', 'Nov 12', 'Yesterday, 5:47 PM', 14], ['j••••••@liveutah.com', 'Nov 12', 'Nov 19, 11:20 AM', 4], ['m••••@liveutah.com', 'Nov 12', 'Nov 18, 2:36 PM', 6], ['r•••••••@liveutah.com', 'Nov 13', 'Nov 17, 9:11 AM', 3], ['s•••@liveutah.com', 'Nov 13', 'Nov 13, 4:05 PM', 2], ['t••••••@liveutah.com', 'Nov 14', 'Nov 14, 10:30 AM', 1], ['k••••@liveutah.com', 'Nov 16', 'Never opened a skill', 0]];
const TEAMS2 = [
  { id: 'ws_northline', n: 'Northline Realty', owner: 'Alex Morgan', p: ['Accelerator'], seats: '3 of 3', money: 'Paid in full', st: 'Active' },
  { id: 'ws_sampleteam', n: 'Sample Team', owner: 'Jordan Avery', p: ['Accelerator'], seats: '3 of 3', money: 'Paid in full', st: 'Active' },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', owner: 'Devon Achterberg', p: ['Accelerator'], seats: '1 of 1', money: '1 of 2 payments', st: 'Active' },
  { id: 'ws_northshore', n: 'Northshore Group', owner: 'Elena Vargas', p: ['Accelerator', 'Team Plan'], seats: '33 of 41', money: '$1,495 a month', st: 'Active' },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', owner: 'Jordan Hale', p: ['Accelerator', 'Team Plan'], seats: '15 of 16', money: '$695 a month', st: 'Active' },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', owner: 'Noor Haddad', p: ['Accelerator', 'Agent Plan'], seats: '46 of 50', money: '$1,450 a month', st: 'Active' },
  { id: 'ws_lantern', n: 'Lantern Street Partners', owner: 'Tessa Lindqvist', p: ['Accelerator', 'Team Plan'], seats: '6 of 16', money: '1 of 2 payments', st: 'Trialing' },
  { id: 'ws_fourthmeridian', n: 'Fourth Meridian', owner: 'Priya Raman', p: ['Team Plan'], seats: '0 of 16', money: '$0', st: 'Canceled' },
];

/* ---------- shared pieces ---------- */
/* Facts where each one opens the list it counts. [label, value, where it goes, full width] */
function LFacts({ items }) {
  const { go } = useC();
  return <div className="cd fx">{items.map(([k, v, to, full], i) => to
    ? <button key={i} className={'fxl' + (full ? ' fxw' : '')} onClick={() => typeof to === 'function' ? to() : go(...[].concat(to))}><span className="me">{k}</span><span className="w5 el">{v}</span><I n="chev" s={12} w={2.2} /></button>
    : <div key={i} className={full ? 'fxw' : undefined}><span className="me">{k}</span><span className="w5 el">{v}</span></div>)}</div>;
}
/* A section list down the left: one section on screen at a time. A select on a phone. */
function Rail({ items, v, on }) {
  const { ph } = useC();
  if (ph) return <select className="in" style={{ width: '100%' }} aria-label="Section" value={v} onChange={e => on(e.target.value)}>{items.map(([k, l, c]) => <option key={k} value={k}>{l}{c !== undefined ? ' · ' + c : ''}</option>)}</select>;
  return <nav className="srl" aria-label="Sections">{items.map(([k, l, c]) => <button key={k} className={'srb' + (v === k ? ' on' : '')} aria-current={v === k ? 'true' : undefined} onClick={() => on(k)}><span className="el">{l}</span>{c !== undefined && <span className="tn">{c}</span>}</button>)}</nav>;
}
/* progress toward a whole: always green, full when done (the kit's Bar turns amber near a seat cap) */
const PBar = ({ v, max }) => <span className="bar"><i style={{ width: (v / max) * 100 + '%' }} /></span>;
const Fld = ({ l, at, children }) => <label className="lab">{l}{at && <span className="fat">Learners see it on {at}</span>}{children}</label>;
function Lines({ l, at, v, touch }) {
  const [rows, set] = useState(v);
  const upd = r => { set(r); touch(); };
  return <div className="lab"><span>{l}</span>{at && <span className="fat">Learners see it on {at}</span>}
    <div className="lns">{rows.map((r, i) => <div key={i} className="ln"><span className="grp" aria-hidden="true"><I n="grip" s={14} /></span><input className="in" aria-label={l + ', line ' + (i + 1)} value={r} onChange={e => upd(rows.map((x, j) => j === i ? e.target.value : x))} /><button type="button" className="ib" aria-label={'Remove line ' + (i + 1)} onClick={() => upd(rows.filter((x, j) => j !== i))}><I n="x" s={14} /></button></div>)}</div>
    <button type="button" className="b q" style={{ alignSelf: 'flex-start', marginLeft: -10 }} onClick={() => upd([...rows, ''])}><I n="plus" />Add a line</button></div>;
}
const StepWho = ({ v }) => <span className="row" style={{ gap: 4 }}>{v.map(x => <span key={x} className={'pl' + (x === 'Owner' ? ' info' : ' ok')}>{x}</span>)}</span>;
const Wn = ({ n, st }) => <span className={'wn' + (st === 'Draft' ? ' off' : '')}>{n}</span>;
const ctOf = t => { const m = String(t).match(/(\d+):(\d+) (AM|PM)/); if (!m) return t; const h = (+m[1] % 12) + (m[3] === 'PM' ? 12 : 0) + 1; return ((h + 11) % 12 + 1) + ':' + m[2] + ' ' + (h % 24 >= 12 ? 'PM' : 'AM'); };
const When = ({ d, t = '12:00 PM' }) => <div className="col" style={{ gap: 0 }}><span className="el">{d} · {t} MT</span><span className="me">{ctOf(t)} CT for learners</span></div>;

/* ---------- Program › Course settings: what every week shares ---------- */
const GLOSS = [['AI Employee', 'A piece of work your AI does on a schedule, with a seat card.', 'hire, AI hire', 'Week 0 · Step 2'], ['AI Implementer', 'The person on your team who sets the hires up and keeps them running.', 'implementer', 'Week 0 · Step 1'], ['AI Brain', 'What your AI knows about your business before you ask it anything.', 'brain', 'Week 0 · Step 5'], ['Seat card', 'One page: what a hire does, for whom, and what it never touches.', '', 'Week 1 · Step 2'], ['Playbook card', 'How to run a hire, check it and fix it.', 'playbook', 'Week 1 · Step 2'], ['Guardrails', 'The settings that stop your AI from sending or changing anything on its own.', '', 'Week 0 · Step 7'], ['Ready Check', 'A short test that says your setup is ready for a hire.', '', 'Week 0 · Step 8'], ['Stack card', 'The tools your team runs on, on one page.', '', 'Week 0 · Step 1'], ['Time baseline', 'How long six tasks take today, so you can see what changed.', 'baseline', 'Week 0 · Step 3'], ['Evidence packet', 'What you turn in to show a hire works.', 'evidence', 'Week 1 · Step 5']];
const WORDS0 = [['locked.opens', 'Opens {date}', 'Learners'], ['locked.utah_life', 'Not included with Utah Life access', 'Learners'], ['community.nothing_emailed', 'Nothing is emailed.', 'Learners'], ['turnin.goes_to', 'Goes to Connor\'s team. Nothing is emailed.', 'Learners'], ['week.done', 'Deployed', 'Learners'], ['staff.preview', 'Previewing as a learner. Nothing you do here is saved.', 'Staff']];
function CourseSet() {
  const { route, go, guard, toast, ph } = useC();
  const [sec, setSec] = useState(route.tab || 'intro'), [dirty, setDirty] = useState(false), [k, setK] = useState(0), [q, setQ] = useState(''), [au, setAu] = useState('Everyone'), [ed, setEd] = useState(null);
  useEffect(() => { if (route.tab) setSec(route.tab); }, [route.tab]);
  const touch = () => setDirty(true);
  const names = { intro: 'Course intro', roles: 'Roles', rules: 'Rules and support', before: 'Before Week 1', after: 'After the cohort', join: 'Joining and community', glossary: 'Glossary', words: 'Words' };
  const save = () => guard('build', 'Save course settings', () => { setDirty(false); toast(names[sec] + ' saved'); });
  const T = (l, at, v, rows) => <Fld l={l} at={at}>{rows ? <textarea className="in" rows={rows} defaultValue={v} onChange={touch} /> : <input className="in" defaultValue={v} onChange={touch} />}</Fld>;
  const words = WORDS0.filter(w => (w[0] + w[1]).toLowerCase().includes(q.toLowerCase()) && (au === 'Everyone' || w[2] === au));
  return <div className="pg">
    <Head t="Course settings" d="What every cohort shares: the intro, the rules, the pages before and after, the glossary and the words learners see. Anything that names a date, a weekday or a number of weeks is filled in from the cohort." 
      right={<Btn ic="eye" onClick={() => toast('Opens the learner preview of the course')}>Preview</Btn>} />
    <div className="srg" key={k}>
      <div className="col">
        <Rail v={sec} on={v => { setSec(v); }} items={[['intro', 'Course intro'], ['roles', 'Roles'], ['rules', 'Rules and support'], ['before', 'Before Week 1'], ['after', 'After the cohort'], ['join', 'Joining and community'], ['glossary', 'Glossary', GLOSS.length], ['words', 'Words', WORDS0.length]]} />
        {!ph && <div className="note col s"><span className="w5">Looking for dates?</span><span className="me">A cohort's dates, its promise, how often it meets and when its emails send are on the cohort.</span><button className="lk a" style={{ alignSelf: 'flex-start' }} onClick={() => go('cohortset')}>Open the cohort's Settings</button></div>}
      </div>
      <div className="col">
        {sec === 'intro' && <Card t="Course intro" sub="The first thing a new learner reads."><div className="col">
          {T('Course title', 'Home', 'Amplified AI Accelerator')}
          <FromCohort l="The promise" at="Home, under the title" v={COH.promise} />
          <FromCohort l="How it works" at="Home" lines={howOf(COH)} />
          {T('Instructor', 'Home and each live build', 'Connor Leiva')}
        </div></Card>}
        {sec === 'roles' && <Card t="Roles" sub="The two seats every team fills."><div className="col">
          {T('The owner\'s role', 'Home and Week 0', 'You decide what the hire is for and whether its work is good enough to use.', 3)}
          {T('The AI Implementer\'s role', 'Home and Week 0', 'You set the hire up, run it, and keep it running. On a small team this can be the owner.', 3)}
        </div></Card>}
        {sec === 'rules' && <Card t="Rules and support" sub="What we will and won't do, and where to get help."><div className="col">
          {T('Scope', 'Home', 'We build the hires in this course. We don\'t set up your CRM or your books.', 2)}
          {T('Support', 'Home and Get help', 'Ask in the Community first. For anything private, email the team.', 2)}
          <Lines l="Office hours rules" at="each Office hours row" touch={touch} v={['Bring one question.', 'Share your screen, not your client\'s name.', 'If we can\'t fix it in ten minutes, we take it to a thread.']} />
          <Lines l="Evidence" at="Reference" touch={touch} v={['The report the hire made.', 'The rubric, filled in.', 'One sentence on what you would change.']} />
          {T('Missed a week', 'Reference', 'Watch the replay, run the hire, and turn it in. Nothing locks behind you.', 2)}
          <FromCohort l="Holiday note" at="the Schedule" v={COH.holiday || 'None. Every week has its sessions.'} />
        </div></Card>}
        {sec === 'before' && <Card t="Before Week 1" sub="What a team reads between buying and the first live build."><div className="col">
          <Lines l="Intake" at="Week 0 · Step 1" touch={touch} v={['Fill in the intake before {first live build}.', 'Name your AI Implementer and invite them.']} />
          <p className="me">Words in braces are filled in from the cohort. For the {COH.n}, {'{first live build}'} reads {firstBuildOf(COH)}.</p>
          {T('Practice set note', 'Week 0', 'Use the practice set until your own export is ready. It is made-up data.', 2)}
          <Lines l="Safe sharing" at="Week 0 and the Community" touch={touch} v={['No client names in a thread.', 'No passwords or keys, ever.', 'Screenshots with numbers are fine. Screenshots with people are not.']} />
        </div></Card>}
        {sec === 'after' && <Card t="After the cohort" sub="What a team reads when its last week is done."><div className="col">
          <Lines l="Graduation" at="the last week" touch={touch} v={['{weeks of building} hires deployed.', 'A seat card and a playbook card for each.', 'Your next three hires, in order.']} />
          {T('Graduation note', 'the last week', 'You keep everything you built, and the portal stays open to you.', 2)}
          <Lines l="Paths" at="the last week" touch={touch} v={['Keep going with the Team Plan.', 'Bring your agents in on the Agent Plan.']} />
          {T('No paywall', 'the last week', 'Nothing you built here locks when the cohort ends.', 2)}
        </div></Card>}
        {sec === 'join' && <Card t="Joining and community" sub="The button that takes a learner into a live session, and where the cohort talks."><div className="col">
          <div className="g2">{T('Join label', 'the top bar, 15 minutes before a session', 'Join on Zoom')}{T('Community link', 'Home, until the built-in Community replaces it', '')}</div>
          {T('Join note', 'under the Join button', 'Opens 15 minutes before we start.', 2)}
          <p className="me">The cohort's own threads are in <button className="lk a" onClick={() => go('community')}>Community</button>. Leave the link empty to show only that.</p>
        </div></Card>}
        {sec === 'glossary' && <Table title="Glossary" right={<GBtn ic="plus" perm="build" label="Add a term" go={() => setEd(['', '', '', ''])}>Add a term</GBtn>} rows={GLOSS} onRow={g => setEd(g)}
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

/* ---------- People › People: everyone with a sign-in, by how they got in ---------- */
function AudChips({ v, on, all = true }) {
  return <div className="chs" role="group" aria-label="Audience">{(all ? [['all', 'Everyone', AUD_ALL], ...AUD] : AUD).map(a => <button key={a[0]} className={'ch' + (v === a[0] ? ' on' : '')} aria-pressed={v === a[0]} onClick={() => on(a[0])}>{a[3] && <i style={{ background: a[3] }} />}{a[1]}<span className="tn">{a[2]}</span></button>)}</div>;
}
function PeoplePg() {
  const { route, go, toast } = useC();
  const [a, setA] = useState(route.tab || 'all'), [q, setQ] = useState('');
  useEffect(() => { if (route.tab) setA(route.tab); }, [route.tab]);
  const rows = PPL.filter(p => (a === 'all' || p.a === a) && (p.n + p.e + p.team).toLowerCase().includes(q.toLowerCase()));
  const open = p => p.a === 'ul' ? go('groups') : go('user', p.id);
  return <div className="pg">
    <AudChips v={a} on={setA} />
    <div className="row"><Find v={q} on={setQ} ph="Find a person by name or email" /><span className="sp" /><Btn ic="download" onClick={() => toast('Export started')}>Export</Btn></div>
    <Table rows={rows} onRow={open} empty={{ ic: 'users', t: 'No one matches', b: 'Try another audience or fewer letters.' }}
      cols={[{ k: 'n', l: 'Person', w: 'minmax(220px,1.5fr)', r: p => <Two a={p.n} b={p.e} /> }, { k: 'a', l: 'Got in through', w: '136px', r: p => <span className="pl aud"><i style={{ background: AUD.find(x => x[0] === p.a)[3] }} />{audOf(p.a)}</span> },
        { k: 'team', l: 'Team', w: 'minmax(160px,1fr)', hide: 'lap', r: p => p.team ? p.team : <span className="mu">On their own</span> }, { k: 'role', l: 'Seat', w: '204px', hide: 'lap' }, { k: 'last', l: 'Last active', w: '150px', ns: 1 }, { k: 'st', l: 'Status', w: '104px', r: p => <St v={p.st} tone={p.st === 'Invited' ? 'warn' : undefined} /> }]}
      menu={p => [{ l: p.a === 'ul' ? 'Open Utah Life' : 'Open person', fn: () => open(p) }, ...(p.a === 'acc' ? [{ l: 'See them in the cohort', fn: () => go('enrolled', null, 'learners') }] : [])]} />
    <p className="me">Showing {rows.length} of {a === 'all' ? AUD_ALL : AUD.find(x => x[0] === a)[2]}. This list is for the account: sign-in, plan and seat. To see how a cohort is doing, open <button className="lk a" onClick={() => go('enrolled')}>the cohort's People tab</button>.</p>
  </div>;
}

/* ---------- People › Teams: accounts with more than one seat ---------- */
function TeamsPg() {
  const { go } = useC();
  const [q, setQ] = useState(''), [p, setP] = useState('All products');
  const rows = TEAMS2.filter(t => (t.n + t.owner).toLowerCase().includes(q.toLowerCase()) && (p === 'All products' || t.p.includes(p)));
  return <div className="pg">
    <Head t="Teams" d="Every team account and what it holds. Someone on their own (an Insider, a skill buyer, a Utah Life agent) is a person, not a team, so they are under Everyone." />
    <div className="row"><Find v={q} on={setQ} ph="Find a team or its owner" /><Sel label="Product" v={p} on={setP} opts={['All products', 'Accelerator', 'Team Plan', 'Agent Plan']} /></div>
    <Table rows={rows} onRow={t => go('workspace', t.id)} empty={{ ic: 'workspaces', t: 'No team matches' }}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(200px,1.4fr)', r: t => <Two a={t.n} b={t.owner} /> }, { k: 'p', l: 'Holds', w: 'minmax(190px,1fr)', ns: 1, r: t => <span className="row" style={{ gap: 4 }}>{t.p.map(x => <span key={x} className={'pl' + (x === 'Accelerator' ? ' ok' : ' info')}>{x}</span>)}</span> },
        { k: 'seats', l: 'Seats used', w: '110px', r: t => <span className="tn">{t.seats}</span> }, { k: 'money', l: 'Paying', w: '150px', hide: 'lap' }, { k: 'st', l: 'Status', w: '104px', r: t => <St v={t.st} /> }]}
      menu={t => [{ l: 'Open team', fn: () => go('workspace', t.id) }, ...(t.p.includes('Accelerator') ? [{ l: 'See them in the cohort', fn: () => go('enrolled') }] : [])]} />
    <p className="me">31 Utah Life agents and 17 people on their own are not listed here. <button className="lk a" onClick={() => go('groups')}>Utah Life</button> · <button className="lk a" onClick={() => go('people')}>Everyone</button></p>
  </div>;
}

/* ---------- People › Utah Life: an access group, in its own area ---------- */
function Groups() {
  const { go, guard, toast, setDlg, log } = useC();
  const [q, setQ] = useState('');
  return <div className="pg">
    <Head t="Utah Life" meta={<Pill v="Access group" tone="" />} d="Agents with a liveutah.com address get the Agent Plan's skills at no charge. They are counted here: not in a cohort, not as teams, and not in revenue."
      right={<><Btn ic="download" onClick={() => toast('Export started')}>Export</Btn><Menu items={[{ l: 'Add an address outside the domain…', g: 1, fn: () => guard('account', 'Add an address', () => toast('Adds one address to the group')) }, '-', { l: 'End access…', d: 1, g: 1, fn: () => guard('account', 'End Utah Life access', () => setDlg({ title: 'End Utah Life access?', body: '31 agents lose the Agent Plan\'s skills right away. Their accounts stay, with nothing to open.', cta: 'End access', danger: 1, needReason: 1, yes: r => { log('access_group.end', 'Utah Life', r); toast('Access ended'); } })) }]} /></>} />
    <LFacts items={[['Agents signed in', '31'], ['Active, last 30 days', '24'], ['Gets', 'Agent Plan skills, free', ['course', null, 'words'], 1], ['Who qualifies', 'A verified @liveutah.com address', null, 1], ['Since', 'Thu, Nov 12, 2026'], ['Ends', 'No end date']]} />
    <div className="gms">
      <div className="col">
        <div className="row"><Find v={q} on={setQ} ph="Find an agent by email" /></div>
        <Table title="Agents" rows={ULA.filter(r => r[0].includes(q.toLowerCase()))}
          cols={[{ k: 0, l: 'Agent', w: 'minmax(200px,1.5fr)', r: r => <Two a="Utah Life agent" b={r[0]} /> }, { k: 1, l: 'First sign-in', w: '120px', ns: 1 }, { k: 2, l: 'Last active', w: '170px', ns: 1 }, { k: 3, l: 'Skills opened', w: '110px', num: 1 }]} />
        <p className="me">Showing 8 of 31. Addresses are masked in this mockup.</p>
      </div>
      <div className="col">
        <Card t="What they can open"><div className="col m">
          <div className="row nw" style={{ gap: 10 }}><span className="mt"><I n="check" /></span><span className="col" style={{ gap: 0 }}><span className="w5">The Agent Plan's skills</span><span className="me">Every agent skill, and each new one as it is released</span></span></div>
          <div className="row nw" style={{ gap: 10 }}><span className="mt off"><I n="lock" /></span><span className="col" style={{ gap: 0 }}><span className="w5">Not the Accelerator, not team skills</span><span className="me">A locked skill says "Not included with Utah Life access"</span></span></div>
          <button className="lk a" style={{ alignSelf: 'flex-start' }} onClick={() => go('course', null, 'words')}>Change that line in Words</button></div></Card>
        <Card t="Most opened" sub="Last 30 days"><div className="col m">{[['Appointment Follow-Up', 22], ['Repair Request Response', 19], ['Listing Description Writer', 11], ['Speed to Lead Reply', 7]].map(s => <div key={s[0]} className="rdy" style={{ cursor: 'default' }}><span className="el" style={{ flex: '0 0 176px' }}>{s[0]}</span><PBar v={s[1]} max={24} /><span className="tn w5 rdn" style={{ minWidth: 24 }}>{s[1]}</span></div>)}</div></Card>
        <Card t="Where they are counted"><div className="kvs"><KV rows={[['Overview', 'Shown, kept apart from learners'], ['A cohort', 'Never. They are not in one.'], ['Teams', 'Never. Each is one person.'], ['Revenue', 'Never. The access is free.']]} /></div></Card>
      </div>
    </div>
  </div>;
}

/* ---------- Revenue › Summary: what came in, what is still owed, what repeats ---------- */
const REV = {
  'All time': { c: '$82,694', cs: 'Since Aug 2026', t: '$90,194' },
  'This month': { c: '$53,160', cs: 'Nov 1 to Nov 24', t: '$60,660' },
};
const RV_MONTHS = [['Aug', 7480, 0], ['Sep', 9917, 0], ['Oct', 12137, 0], ['Nov', 53160, 0], ['Dec', 0, 19929], ['Jan', 0, 12429]];
const RV_PROD = [
  ['AI Accelerator', 'December 2026 · 7 of 15 seats', '$45,000', '$7,500', '$52,500', 'One-time', ['enrolled']],
  ['Team Plan', '7 teams · 39 people', '$19,395', '$0', '$19,395', '$6,465', ['billing', null, 'subs']],
  ['Agent Plan', '46 agents', '$16,146', '$0', '$16,146', '$5,382', ['billing', null, 'subs']],
  ['Insiders', '6 members', '$1,746', '$0', '$1,746', '$582', ['billing', null, 'subs']],
  ['Skills', '11 bought', '$407', '$0', '$407', 'One-time', ['billing', null, 'invoices']],
];
const RV_NEXT = [
  ['Thu, Dec 3', 'Hale & Marlowe Realty', 'Team Plan renewal', '$695', 'Scheduled', 'ws_halemarlowe'],
  ['Fri, Dec 4', 'Tidewater Property Co.', 'Insiders, second try', '$97', 'Retrying', 'ws_tidewater'],
  ['Sun, Dec 6', 'Red Cliff Collective', 'Agent Plan renewal', '$1,450', 'Scheduled', 'ws_redcliff'],
  ['Tue, Dec 8', 'Northshore Group', 'Team Plan renewal', '$1,495', 'Scheduled', 'ws_northshore'],
  ['Wed, Dec 30', 'Copper Basin Realty', 'Accelerator, payment 2 of 2', '$3,750', 'Scheduled', 'ws_copperbasin'],
  ['Wed, Dec 30', 'Lantern Street Partners', 'Accelerator, payment 2 of 2', '$3,750', 'Scheduled', 'ws_lantern'],
];
function Revenue() {
  const { go, ph } = useC();
  const [per, setPer] = useState('All time');
  const r = REV[per], max = Math.max(...RV_MONTHS.map(m => m[1] + m[2]));
  const usd = n => '$' + n.toLocaleString('en-US');
  return <div className="pg">
    <Head t="Revenue" right={<Sel label="Period" v={per} on={setPer} opts={['All time', 'This month']} />} />
    <div className="g5">
      <Stat l="Cash collected" v={r.c} sub={r.cs} go={() => go('billing', null, 'invoices')} />
      <Stat l="Still to collect" v="$7,500" sub={ph ? '2 payments · Dec 30' : '2 payments · Wed, Dec 30'} tone="info" go={() => document.getElementById('rv-next') && document.getElementById('rv-next').scrollIntoView({ behavior: 'smooth', block: 'start' })} />
      <Stat l="Total revenue" v={r.t} sub="Collected + still to collect" go={() => go('billing', null, 'customers')} />
      <Stat l="MRR" v="$12,429" sub="59 subscriptions" tone="ok" go={() => go('billing', null, 'subs')} />
      <Stat l="Failed payments" v="3" sub="Needs review" tone="bad" go={() => go('billing', null, 'failed')} />
    </div>
    <div className="gms">
      <Card t="Cash by month" sub="Collected, and what Stripe already has on the calendar" right={!ph && <span className="row" style={{ gap: 12 }}><span className="lg"><i style={{ background: 'var(--for)' }} />Collected</span><span className="lg"><i className="hat" />On the calendar</span></span>}>
        <div className="rvc" role="img" aria-label="Cash collected by month from August to November, and what is scheduled for December and January.">{RV_MONTHS.map(m => { const v = m[1] + m[2]; return <div key={m[0]} className="rvm"><span className="tn me">{usd(v)}</span><span className="rvb"><i className={m[2] ? 'hat' : ''} style={{ height: Math.max(4, (v / max) * 100) + '%' }} /></span><span className={'w5' + (m[0] === 'Nov' ? '' : ' mu')}>{m[0]}</span></div>; })}</div>
        {ph && <div className="row" style={{ gap: 12, marginTop: 12 }}><span className="lg"><i style={{ background: 'var(--for)' }} />Collected</span><span className="lg"><i className="hat" />On the calendar</span></div>}
        <p className="me" style={{ marginTop: 12 }}>December counts two second payments ($7,500) and this month's renewals. It is not a forecast of new sales.</p>
      </Card>
      <div className="col">
        <Card t="AI Accelerator" sub="December 2026 Cohort" right={<Btn onClick={() => { setCur('dec26'); go('enrolled'); }}>People</Btn>}><div className="col m">
          <button className="rdy" onClick={() => go('enrolled')}><span style={{ flex: '0 0 96px' }}>Seats sold</span><Bar v={7} max={15} fx /><span className="tn w5 rdn">7 of 15</span></button>
          <div className="kvs"><KV rows={[['Paid in full', '5 teams · $37,500'], ['On two payments', '2 teams · $7,500 in, $7,500 to come'], ['Refunds', 'None']]} /></div></div></Card>
        <Card t="Refunds" sub="Last 30 days" right={<Btn onClick={() => go('billing', null, 'refunds')}>Open</Btn>}><span className="fig">$695</span><p className="me">1 refund · Fourth Meridian · Nov 1</p></Card>
      </div>
    </div>
    <Table title="By product" rows={[RV_PROD[0], ...COHORTS.filter(c => c.id !== 'dec26').map(c => ['AI Accelerator', c.n.replace(' Cohort', '') + ' · ' + c.teams.length + ' of ' + c.cap + ' seats', '$0', '$0', '$0', 'One-time', ['enrolled'], c.id]), ...RV_PROD.slice(1)]} onRow={p => { if (p[0] === 'AI Accelerator') setCur(p[7] || 'dec26'); go(...p[6]); }}
      cols={[{ k: 0, l: 'Product', w: 'minmax(160px,1.4fr)', r: p => <Two a={p[0]} b={p[1]} /> }, { k: 2, l: 'Collected', w: '110px', num: 1 }, { k: 3, l: 'Still to collect', w: '120px', num: 1, hide: 'lap' }, { k: 4, l: 'Total', w: '110px', num: 1, r: p => <span className="w5">{p[4]}</span> }, { k: 5, l: 'MRR', w: '100px', num: 1 }]} />
    <div id="rv-next"><Table title="Coming in" right={<span className="me">Next 60 days · $11,237</span>} rows={RV_NEXT} onRow={p => go('workspace', p[5])}
      cols={[{ k: 0, l: 'When', w: '120px', ns: 1 }, { k: 1, l: 'From', w: 'minmax(180px,1.3fr)', r: p => <span className="w5 el" style={{ display: 'block' }}>{p[1]}</span> }, { k: 2, l: 'For', w: 'minmax(190px,1.3fr)', hide: 'lap' }, { k: 3, l: 'Amount', w: '96px', num: 1 }, { k: 4, l: 'Status', w: '112px', r: p => <St v={p[4]} /> }]} /></div>
  </div>;
}

/* ---------- Overview: who is counted as a learner ---------- */
function AudCard() {
  const { go } = useC();
  return <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Who has a sign-in</h2><span className="me">{AUD_ALL} people, each counted once. Utah Life agents are kept out of the learner count and out of revenue.</span></div><Btn onClick={() => go('people')}>People</Btn></div>
    <div className="cdb col m"><div className="aub" aria-hidden="true">{AUD.map(a => <i key={a[0]} style={{ flex: a[2], background: a[3] }} />)}</div>
      <div className="aul">{AUD.map(a => <button key={a[0]} className="auk" onClick={() => a[0] === 'ul' ? go('groups') : a[0] === 'acc' ? go('enrolled', null, 'learners') : go('people', null, a[0])}><i style={{ background: a[3] }} /><span className="col" style={{ gap: 0 }}><span className="w5 tn">{a[2]}</span><span className="me">{a[1]}</span></span></button>)}</div></div></section>;
}

/* =====================================================================================================
   Nov 25, third pass: four pages with tabs. The sidebar reads as the through line:
   PROGRAM (what you teach) · COHORT (one group going through it) · PEOPLE (who has a sign-in) · REVENUE.
   A cohort owns its SHAPE: how many weeks, which ones, how often it meets, its seats and its price. A
   start date turns the shape into dates and sessions. The program owns what each week teaches. So a new
   cohort with a different promise is a form, not a code change. Sample data is made up.
   ===================================================================================================== */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DOWF = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NUMW = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const dparse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(Date.UTC(y || 2027, (m || 1) - 1, d || 1)); };
const dadd = (d, n) => new Date(d.getTime() + n * 864e5);
const dfmt = d => DOW[d.getUTCDay()] + ', ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
const HOLI = { '2027-01-01': 'New Year\'s Day', '2027-01-18': 'Martin Luther King Jr. Day', '2027-02-15': 'Presidents\' Day', '2027-05-31': 'Memorial Day' };

/* the program: what you teach. Its weeks are a library a cohort picks from. */
const PRG = { id: 'acc', n: 'Amplified AI Accelerator', logo: LOGO_ACCELERATOR };
const LIB = ACC_WEEKS.map(w => ({ id: w.n, t: w.t, o: w.o, st: w.st === 'Draft' ? 'Draft' : 'Published', steps: w.steps, min: w.min, kit: w.kit }));
const libOf = id => LIB.find(w => w.id === id) || { id, t: 'Week', o: '', st: 'Draft', steps: 0, min: 0, kit: 0 };
const PTile = ({ s = 32 }) => <img className="tile" src={PRG.logo} width={s} height={s} alt="" style={{ width: s, height: s, flex: 'none', borderRadius: Math.round(s * 0.22) }} />;

/* the December cohort's Wednesday build and Thursday office hours are both at 12:00 PM MT through Thu, Feb 4 */
const DEC_LAST = dparse('2027-02-04');
const clashOf = s => s.time === '12:00 PM' && (s.day === 'Wed' || s.day === 'Thu') && s.date <= DEC_LAST ? (s.day === 'Wed' ? 'live build' : 'office hours') : '';

const COHORTS = [{
  id: 'dec26', n: 'December 2026 Cohort', st: 'Scheduled', enroll: true, full: true, read: true, promise: 'Nine weeks. One hire a week. Built live, on your own numbers.',
  week0: true, pick: [1, 2, 3, 4, 5, 6, 7, 8], pattern: [['Wed', '12:00 PM', 'Live build', '1 hr 30 min'], ['Thu', '12:00 PM', 'Office hours', '1 hr']], cap: 15, price: '$7,500', two: true, hosts: 'Connor Leiva',
  start: '2026-11-29', opens: 'Sun, Nov 29', w1: 'Sun, Nov 29', ends: 'Thu, Feb 4', holiday: 'No sessions the weeks of Dec 21 and Dec 28. Week 4 opens Sun, Jan 3.',
  run: ACC_WEEKS.map(w => ({ id: w.n, n: w.n, opens: w.opens, build: w.build })), ses: ACC_SES, teams: ACC_CT, learners: ACC_CL,
}];
let CUR = 'dec26', POKE = () => {}, COH = COHORTS[0], WEEKS = [], SES = [], CT = [], CL = [];
const runOf = c => c.run.map(r => ({ ...libOf(r.id), ...r }));
function syncCur() { COH = COHORTS.find(c => c.id === CUR) || COHORTS[0]; WEEKS = runOf(COH); SES = COH.ses; CT = COH.teams; CL = COH.learners; }
syncCur();
function setCur(id) { CUR = id; syncCur(); POKE(); }

/* the shape, in words */
const meetsOf = c => c.pattern.length === 1 ? 'once a week' : c.pattern.length === 2 ? 'twice a week' : c.pattern.length + ' times a week';
const shapeOf = c => c.pick.length + ' weeks of building · ' + meetsOf(c);
const slotLine = s => DOWF[s[0]] + ' · ' + s[1] + ' MT · ' + s[2] + ' · ' + s[3];
const autoPromise = n => (NUMW[n] || n) + ' weeks of building. One hire a week. Built live, on your own numbers.';
const howOf = c => { const b = c.pattern.filter(s => s[2] === 'Live build').map(s => DOWF[s[0]]), o = c.pattern.filter(s => s[2] === 'Office hours').map(s => DOWF[s[0]]);
  return ['A week opens on Sunday.', b.length ? 'We build its hire together on ' + b.join(' and ') + '.' : 'There is no live build. You work through the week on your own.', 'You run it on your own data and turn in what it made.', o.length ? 'Office hours are ' + o.join(' and ') + '.' : null].filter(Boolean); };
const firstBuildOf = c => { const s = c.ses.find(x => x.k === 'Live build') || c.ses[0]; return s ? s.d : 'the first session'; };
const widOf = s => s.wid === undefined ? s.wk : s.wid;

/* A shape and a start date make a calendar: when each week opens, and every session in it.
   f: { start (the day Week 1 opens), week0, pick (the weeks, by id, in order), pattern } */
function planOf(f) {
  const w1 = dparse(f.start), rows = [];
  if (f.week0) rows.push({ id: 0, n: 0, open: dadd(w1, -7), ses: [] });
  f.pick.forEach((id, i) => { const open = dadd(w1, 7 * i);
    const ses = f.pattern.map(sl => { let d = open; while (DOW[d.getUTCDay()] !== sl[0]) d = dadd(d, 1); return { day: sl[0], date: d, d: dfmt(d), time: sl[1], k: sl[2], len: sl[3], hol: HOLI[d.toISOString().slice(0, 10)] }; });
    rows.push({ id, n: i + 1, open, ses }); });
  return rows;
}
/* lay a cohort out (again) from its shape */
function reshape(c, patch) {
  Object.assign(c, patch);
  const pl = planOf(c), ses = [];
  pl.forEach(w => w.ses.forEach(s => ses.push({ n: ses.length + 1, t: libOf(w.id).t + ' · ' + s.k, k: s.k, wk: w.n, wid: w.id, d: s.d, time: s.time, zoom: 'No link yet', inv: 'Draft', clash: clashOf(s), hol: s.hol })));
  c.run = pl.map(w => ({ id: w.id, n: w.n, opens: dfmt(w.open), build: w.ses.map(s => s.d).join(' and ') || null }));
  c.ses = ses; c.opens = dfmt(pl[0].open); c.w1 = dfmt(dparse(c.start)); c.ends = ses.length ? ses[ses.length - 1].d : '';
  return c;
}
function makeCohort(f) {
  const c = reshape({ id: 'c' + (COHORTS.length + 1), n: f.n, st: 'Draft', enroll: false, full: false, read: false, promise: f.promise, cap: +f.cap || 15, price: (f.price || '').trim(), two: !!f.two, hosts: f.hosts, holiday: '', teams: [], learners: [] },
    { start: f.start, week0: f.week0, pick: [...f.pick], pattern: f.slots.map(s => [...s]) });
  COHORTS.push(c); return c;
}
/* Connor's example: six weeks of building, twice a week, starting in early January */
const JAN_F = { n: null, promise: null, from: 'dec26', week0: true, pick: [1, 2, 3, 4, 5, 6], slots: [['Tue', '12:00 PM', 'Live build', '1 hr 30 min'], ['Thu', '12:00 PM', 'Office hours', '1 hr']], start: '2027-01-03', cap: 15, price: '', two: true, hosts: 'Connor Leiva and Spring' };
/* the Screen list's shortcut: the January cohort, already created from those defaults */
function seedJan() { let c = COHORTS.find(x => x.id !== 'dec26'); if (!c) c = makeCohort({ ...JSON.parse(JSON.stringify(JAN_F)), n: 'January 2027 Cohort', promise: autoPromise(6) }); CUR = c.id; syncCur(); }

/* ---------- which cohort: the sidebar's switcher, and the same choice in the Cohort page's title ---------- */
function CtxSwitch({ r }) {
  const { go, route } = useC();
  const items = COHORTS.map(c => ({ l: c.n + (c.st === 'Draft' ? ' · Draft' : ''), on: c === COH, fn: () => { setCur(c.id); if (route.s !== 'cohort' && route.s !== 'overview') go('cohort'); } }));
  items.push('-', { l: 'New cohort…', fn: () => go('newcohort') });
  return <Menu lf trigger={(t, o) => <button className="sw" aria-expanded={o} aria-label={'Switch cohort. ' + PRG.n + ', ' + COH.n} title={r ? PRG.n + ' · ' + COH.n : undefined} onClick={t}><span data-fl="tile" style={{ display: 'flex', flex: 'none' }}><PTile /></span>{!r && <><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5 el sw1">{PRG.n}</span><span className="el sw2">{COH.n}</span></span><span className="mu" style={{ display: 'flex' }}><I n="updown" s={14} /></span></>}</button>} items={items} />;
}
function CohortPick({ big }) {
  const { go } = useC();
  const items = COHORTS.map(c => ({ l: c.n + (c.st === 'Draft' ? ' · Draft' : ''), on: c === COH, fn: () => setCur(c.id) }));
  items.push('-', { l: 'New cohort…', fn: () => go('newcohort') });
  return <Menu lf trigger={(t, o) => <button className={'cpk' + (big ? ' big' : '')} aria-expanded={o} aria-label={'Switch cohort. ' + COH.n} onClick={t}>{!big && <PTile s={20} />}<span className="el">{COH.n}</span><I n="updown" s={big ? 18 : 14} /></button>} items={items} />;
}

/* ---------- pieces the new-cohort page and the cohort's settings share ---------- */
const Seg = ({ v, on, opts }) => <span className="sgm" role="group">{opts.map(o => <button key={o[0]} type="button" className={v === o[0] ? 'on' : ''} aria-pressed={v === o[0]} onClick={() => on(o[0])}>{o[1]}</button>)}</span>;
/* how long and how often. f: { pick, slots, week0 } */
function ShapeFields({ f, up }) {
  const ids = LIB.filter(w => w.id > 0).map(w => w.id);
  const weeks = n => { let p = [...f.pick]; while (p.length > n) p.pop(); while (p.length < n) { const nx = ids.find(id => !p.includes(id)); if (nx === undefined) break; p.push(nx); } up({ pick: ids.filter(id => p.includes(id)) }); };
  const slot = (i, j, v) => up({ slots: f.slots.map((s, k) => k === i ? s.map((x, m) => m === j ? v : x) : s) });
  const times = n => up({ slots: Array.from({ length: n }, (x, i) => f.slots[i] || [['Tue', 'Thu', 'Fri'][i] || 'Fri', '12:00 PM', i ? 'Office hours' : 'Live build', i ? '1 hr' : '1 hr 30 min']) });
  return <div className="col">
    <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
      <div className="lab"><span>Weeks of building</span><span className="stp2"><button type="button" className="ib" aria-label="One week fewer" disabled={f.pick.length <= 1} onClick={() => weeks(f.pick.length - 1)}>−</button><b className="tn">{f.pick.length}</b><button type="button" className="ib" aria-label="One week more" disabled={f.pick.length >= ids.length} title={f.pick.length >= ids.length ? 'The curriculum has ' + ids.length + ' building weeks. Add one there first.' : undefined} onClick={() => weeks(f.pick.length + 1)}>+</button></span></div>
      <div className="lab"><span>You meet</span><Seg v={f.slots.length} on={times} opts={[[1, 'Once a week'], [2, 'Twice a week'], [3, 'Three times']]} /></div>
    </div>
    <div className="lab"><span>When</span><span className="fat">Mountain time. Learners see Central, one hour later.</span>
      <div className="lns">{f.slots.map((s, i) => <div key={i} className="ln slt"><Sel label={'Day ' + (i + 1)} v={DOWF[s[0]]} on={v => slot(i, 0, v.slice(0, 3))} opts={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']} /><Sel label={'Time ' + (i + 1)} v={s[1]} on={v => slot(i, 1, v)} opts={['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM']} /><Sel label={'Kind ' + (i + 1)} v={s[2]} on={v => slot(i, 2, v)} opts={['Live build', 'Office hours', 'Working session']} /></div>)}</div></div>
    <label className="ckr"><input type="checkbox" checked={f.week0} onChange={e => up({ week0: e.target.checked })} /><span className="col" style={{ gap: 0 }}><span className="w5">Start with a setup week</span><span className="me">Week 0, self-paced, opens a week before Week 1. Teams fill in their intake and get their AI ready.</span></span></label>
  </div>;
}
/* which of the program's weeks the cohort runs. They keep the curriculum's order. */
function WeekPick({ pick, on }) {
  const ids = LIB.filter(w => w.id > 0).map(w => w.id);
  return <div className="wpl">{LIB.filter(w => w.id > 0).map(w => { const i = pick.indexOf(w.id), onn = i >= 0;
    return <label key={w.id} className={'wpk' + (onn ? ' on' : '')}><input type="checkbox" checked={onn} disabled={onn && pick.length === 1} onChange={() => on(ids.filter(id => id === w.id ? !onn : pick.includes(id)))} />
      <span className={'wn sm' + (onn ? ' pk' : '')}>{onn ? i + 1 : '–'}</span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{w.t}</span><span className="me el">{w.o}</span></span>
      {w.st !== 'Draft' ? <span className="pl ok">Published</span> : <span className={'pl' + (w.steps ? '' : ' warn')}>{w.steps ? 'Draft · ' + w.steps + ' steps' : 'Not built yet'}</span>}</label>; })}</div>;
}
/* the calendar a shape makes, week by week */
function PlanList({ pl, free }) {
  return <div className={'ncl' + (free ? ' free' : '')}>{pl.map(w => <div key={w.id} className="ncw"><span className="wn sm pk">{w.n}</span><span className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}><span className="w5 el">{libOf(w.id).t}</span><span className="me">Opens {dfmt(w.open)}</span>
    <span className="row" style={{ gap: 6 }}>{w.ses.length ? w.ses.map((s, i) => <span key={i} className={'skc' + (clashOf(s) ? ' wrn' : s.k === 'Live build' ? '' : ' alt')} title={clashOf(s) ? 'Same time as the December 2026 Cohort\'s ' + clashOf(s) : s.hol || undefined}>{s.d.replace(',', '')} · {s.time.replace(':00', '')} · {s.k}</span>) : <span className="skc off">Self-paced</span>}</span></span></div>)}</div>;
}

/* ---------- Cohort › New cohort: say its shape and when it starts; see what that makes ---------- */
function NewCohort() {
  const { go, guard, toast, log, ph } = useC();
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(JAN_F)));
  const up = p => setF({ ...f, ...p });
  const s0 = dparse(f.start), autoN = MONF[s0.getUTCMonth()] + ' ' + s0.getUTCFullYear() + ' Cohort', name = f.n === null ? autoN : f.n, promise = f.promise === null ? autoPromise(f.pick.length) : f.promise;
  const pl = planOf({ ...f, pattern: f.slots }), all = pl.flatMap(w => w.ses), cl = all.filter(clashOf), last = all[all.length - 1], hol = all.filter(s => s.hol);
  const drafts = f.pick.filter(id => libOf(id).st === 'Draft');
  const create = () => guard('build', 'Create cohort', () => { const c = makeCohort({ ...f, n: name.trim() || autoN, promise }); log('cohort.create', c.n, shapeOf(c)); setCur(c.id); toast(c.n + ' is created as a draft. ' + c.ses.length + ' sessions are on the calendar.'); go('cohort'); });
  return <div className="pg">
    <Head back={['cohort', 'Cohort']} t="New cohort" d="One group going through the program. Say how long it runs, how often you meet and when it starts. The portal lays out the weeks and the sessions. You can change any of it afterwards." />
    <div className="gms">
      <div className="col">
        <Card t="The cohort"><div className="col">
          <div className="g2"><label className="lab">Name<input className="in" value={name} onChange={e => up({ n: e.target.value })} /></label>
            <div className="lab"><span>Start from</span><Sel label="Start from" v={f.from ? 'December 2026 Cohort' : 'A blank cohort'} on={v => up({ from: v === 'A blank cohort' ? '' : 'dec26' })} opts={['December 2026 Cohort', 'A blank cohort']} /></div></div>
          <label className="lab">The promise<span className="fat">One line. Learners see it on Home, under the program's name.</span><input className="in" value={promise} onChange={e => up({ promise: e.target.value })} /></label>
          {f.from && <p className="me">Copied from December: its seats, its intake form, its emails and its community rules. Nothing about December changes.</p>}
        </div></Card>
        <Card t="Its shape" sub="How long it runs and how often you meet"><ShapeFields f={f} up={up} /></Card>
        <Card t="When it starts"><div className="g2"><label className="lab">Week 1 opens<input className="in" type="date" value={f.start} onChange={e => e.target.value && up({ start: e.target.value })} /></label>
          <div className="lab"><span>That makes</span><span className="s2" style={{ fontWeight: 400 }}>{f.week0 ? 'The setup week opens ' + dfmt(dadd(s0, -7)) + '. ' : ''}{all[0] ? 'The first session is ' + all[0].d + ' and the last is ' + last.d + '.' : 'No sessions yet.'}</span></div></div></Card>
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>What it covers</h2><span className="me">Pick from the program's weeks. They keep the curriculum's order.</span></div><span className="pl ok">{f.pick.length} of {LIB.length - 1} weeks</span></div>
          <WeekPick pick={f.pick} on={p => up({ pick: p })} />
          {drafts.length > 0 && <div className="cdb" style={{ borderTop: '1px solid var(--line)' }}><p className="me">{drafts.length} of these {drafts.length === 1 ? 'is' : 'are'} still {drafts.length === 1 ? 'a draft' : 'drafts'} in the curriculum. A draft week stays locked for learners until it is published. <button className="lk a" onClick={() => go('program')}>Open the curriculum</button></p></div>}
        </section>
        <Card t="Seats and price"><div className="col">
          <div className="g2"><label className="lab">Seats<span className="fat">A seat is a team: an owner and an AI Implementer.</span><input className="in" type="number" min="1" value={f.cap} onChange={e => up({ cap: e.target.value })} style={{ maxWidth: 120 }} /></label>
            <label className="lab">Price for a seat<span className="fat">Leave it empty for now and set it before you open enrollment.</span><input className="in" value={f.price} placeholder="Not set" onChange={e => up({ price: e.target.value })} style={{ maxWidth: 160 }} /></label></div>
          <label className="ckr"><input type="checkbox" checked={f.two} onChange={e => up({ two: e.target.checked })} /><span className="col" style={{ gap: 0 }}><span className="w5">Offer two payments</span><span className="me">Half at checkout, half 30 days later. Revenue shows the second half as still to collect.</span></span></label>
          <label className="lab">Hosts<input className="in" value={f.hosts} onChange={e => up({ hosts: e.target.value })} /></label>
        </div></Card>
      </div>
      <div className="col" style={ph ? undefined : { position: 'sticky', top: 0 }}>
        <section className="cd"><div className="cdb col">
          <div className="row nw" style={{ gap: 12, alignItems: 'flex-start' }}><PTile s={40} /><div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w6" style={{ fontSize: 16 }}>{name || autoN}</span><span className="me">{PRG.n}</span></div></div>
          <div className="skf"><div><b className="tn">{f.pick.length}</b><span className="me">weeks of building</span></div><div><b className="tn">{all.length}</b><span className="me">sessions</span></div><div><b className="tn">{f.cap || 0}</b><span className="me">team seats</span></div></div>
          <PlanList pl={pl} free />
          {cl.length > 0 && <div className="note row" style={{ gap: 10, borderColor: '#EBD9A8', background: 'var(--warnb)', alignItems: 'flex-start' }}><I n="incidents" /><span style={{ flex: 1, minWidth: 180 }}><b>{cl.length} sessions are at the same time as December's.</b> Its Wednesday build and Thursday office hours are at 12:00 PM MT through Thu, Feb 4. Pick another day or hour, or keep them if you mean to run them together.</span></div>}
          {hol.length > 0 && <div className="note row" style={{ gap: 10, alignItems: 'flex-start' }}><I n="cohorts" /><span style={{ flex: 1, minWidth: 180 }}>{hol.map(s => s.d + ' is ' + s.hol).join('. ')}.</span></div>}
          <GBtn k="p" perm="build" label="Create cohort" go={create}>Create cohort</GBtn>
          <p className="me">Creates a draft. No one is enrolled, nothing is for sale and no one is emailed.</p>
        </div></section>
      </div>
    </div>
  </div>;
}

/* =====================================================================================================
   The Cohort page's tabs: Overview, Schedule, People, Submissions, Community, Announcements, Settings.
   Each one is about the cohort picked in the page's title (and in the sidebar's switcher).
   ===================================================================================================== */
const QuietTab = ({ t, b }) => <section className="cd"><Empty ic="cohorts" t={t || 'Nothing here yet'} b={b} /></section>;
/* what needs staff before the next live build (a running cohort), in one list. Overview shows the same rows. */
/* 'Sun, Nov 29' as a date field's value. The sample runs from November 2026 into 2027. */
const isoOf = d => { const m = String(d || '').match(/(\w+), (\w+) (\d+)/); if (!m) return ''; const mi = MON.indexOf(m[2]); return new Date(Date.UTC(mi > 9 ? 2026 : 2027, mi, +m[3])).toISOString().slice(0, 10); };
function needsOf(go) {
  return [
    ['forms', '2 teams haven\'t started their intake', 'Northshore Group and Red Cliff Collective. It is due before Wed, Dec 2.', () => go('forms', null, 'teams'), 'bad'],
    ['integrations', '1 intake didn\'t reach GHL', 'Copper Basin Realty. Retry from the team\'s Intake tab.', () => go('workspace', 'ws_copperbasin', 'intake'), 'bad'],
    ['community', '3 threads are waiting on you', 'The last word in each is a member\'s.', () => go('community'), 'warn'],
    ['cohorts', '6 sessions have no Zoom link', 'The next one without a link is Wed, Dec 9.', () => go('sessions'), 'warn'],
    ['billing', '2 second payments are on the calendar', '$3,750 each, on Wed, Dec 30.', () => go('revenue'), ''],
  ];
}
/* what is left before a draft cohort can open. [what, where it stands, done, where to fix it] */
function todoOf(c, go, openEnroll) {
  const run = runOf(c).filter(w => w.id > 0), pub = run.filter(w => w.st !== 'Draft'), clash = c.ses.filter(s => s.clash), zoom = c.ses.filter(s => s.zoom === 'Ready');
  return [
    ['Shape', shapeOf(c) + (c.week0 ? ', after a setup week' : ''), true, () => go('cohortset')],
    ['Its weeks', pub.length + ' of ' + run.length + ' are published' + (run.length - pub.length ? '. The rest are still drafts in the curriculum.' : ''), pub.length === run.length, () => go('program')],
    ['Sessions', c.ses.length + ' on the calendar' + (clash.length ? '. ' + clash.length + ' are at the same time as December\'s ' + [...new Set(clash.map(s => s.clash))].join(' and ') + '.' : ''), !clash.length, () => go('sessions')],
    ['Zoom links', zoom.length + ' of ' + c.ses.length + ' sessions have one', zoom.length === c.ses.length, () => go('sessions')],
    ['Price', c.price ? c.price + (c.two ? ', or two payments' : '') + ' · ' + c.cap + ' seats' : 'Not set. A team can\'t check out without one.', !!c.price, () => go('cohortset')],
    ['Words learners see', c.read ? 'The promise and how it works, written from this cohort\'s shape' : 'The promise and how it works are written from this cohort\'s shape. Read them once.', !!c.read, () => { c.read = true; go('cohortset'); }],
    ['Open enrollment', c.enroll ? 'A team that buys a seat is placed here' : 'Off. Turn it on when the rest is done.', !!c.enroll, openEnroll],
  ];
}
function useEnroll() {
  const { guard, setDlg, log, toast } = useC();
  return () => guard('account', 'Open enrollment', () => !COH.price ? toast('Set a price first. A team can\'t check out without one.') : setDlg({ title: 'Open enrollment for the ' + COH.n + '?', body: 'From now on, a team that buys a seat is placed in this cohort, up to ' + COH.cap + ' seats. They get the welcome email and can start the setup week on ' + COH.opens + '.', cta: 'Open enrollment', yes: () => { COH.enroll = true; COH.st = 'Scheduled'; log('cohort.enrollment_open', COH.n, ''); POKE(); toast('Enrollment is open'); } }));
}
/* the dialog that picks which of the program's weeks this cohort runs */
function WeeksDlg({ onClose }) {
  const { guard, toast, log } = useC();
  const [p, setP] = useState(COH.pick);
  const save = () => guard('build', 'Change this cohort\'s weeks', () => { if (COH.full) toast('Saved. Weeks that are already open stay as they are.'); else { reshape(COH, { pick: p }); syncCur(); POKE(); toast(COH.n + ' now runs ' + p.length + ' weeks. Its sessions are laid out again.'); } log('cohort.weeks', COH.n, p.length + ' weeks'); onClose(); });
  return <Modal title={'The weeks the ' + COH.n + ' runs'} w={620} onClose={onClose} foot={<><Btn onClick={onClose}>Cancel</Btn><Btn k="p" onClick={save}>Save</Btn></>}>
    <p className="s2">Pick from the program's weeks. What a week teaches is the same for every cohort. Its date is this cohort's.</p>
    <div className="cd" style={{ boxShadow: 'none' }}><WeekPick pick={p} on={setP} /></div>
    <p className="me">{p.length} weeks of building{COH.week0 ? ', after the setup week' : ''}. {p.length !== COH.pick.length ? 'The promise says ' + COH.promise.split('.')[0].toLowerCase() + '. Change it in Settings if it no longer fits.' : ''}</p>
  </Modal>;
}

/* ---------- Cohort › Overview: what needs you, the run, and how ready the group is ---------- */
function CohortOverview() {
  const { go, started, ph } = useC();
  const [wk, setWk] = useState(false);
  const openEnroll = useEnroll();
  const full = !!COH.full, first = SES[0], nowN = started && full ? 2 : WEEKS[0].n;
  const need = full ? needsOf(go) : null, todo = full ? null : todoOf(COH, go, openEnroll), left = todo ? todo.filter(t => !t[2]).length : 0;
  return <div className="col">
    <LFacts items={[
      ['Opens', ph ? COH.opens : COH.opens + ' · 12:00 PM MT', () => go('cohortset')],
      ['Shape', COH.pick.length + ' weeks · ' + meetsOf(COH), () => go('cohortset')],
      ['Teams', CT.length + ' of ' + COH.cap + ' seats', () => go('enrolled')],
      ['Learners', full ? '15 · 13 signed in' : String(CL.length), () => go('enrolled', null, 'learners')],
      ['Next session', first ? (started && full ? 'Wed, Dec 9' : first.d) : 'None yet', () => go('sessions')],
    ]} />
    <div className="gms">
      <div className="col">
        {todo ? <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Before it opens</h2><span className="me">{todo.length - left} of {todo.length} done</span></div>{left > 0 ? <span className="pl warn">{left} left</span> : <span className="pl ok">Ready</span>}</div>
          <div className="wkl">{todo.map(t => <button key={t[0]} className={'nyr tdo' + (t[2] ? ' ok' : '')} onClick={t[3]}><span className="tdc">{t[2] && <I n="check" s={12} w={2.6} />}</span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{t[0]}</span><span className="me">{t[1]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div></section>
          : <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Needs you</h2><span className="me">Before the next live build</span></div><span className="pl warn">{need.length}</span></div>
            <div className="wkl">{need.map(n => <button key={n[1]} className="nyr" onClick={n[3]}><span className={'mt' + (n[4] ? ' ' + n[4] : '')}><I n={n[0]} /></span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{n[1]}</span><span className="me">{n[2]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div></section>}
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>The run</h2><span className="me">The weeks this cohort takes, when each opens, and when you meet</span></div><GBtn perm="build" label="Change this cohort's weeks" go={() => setWk(true)}>Change weeks</GBtn></div>
          <div className="wkl run">{WEEKS.map(w => { const now = w.n === nowN; return <button key={w.id} className={'nyr rn' + (now ? ' now' : '')} onClick={() => go('week', String(w.id))}><Wn n={w.n} st={w.st} /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{w.t}</span><span className="me el">Opens {w.opens}{w.build ? ' · ' + (full ? 'Live build ' : 'Meets ') + w.build : ' · Self-paced'}</span></span>{now ? <span className="pl ok">{started && full ? 'This week' : 'Opens first'}</span> : w.st === 'Draft' ? <span className={'pl' + (w.steps ? '' : ' warn')}>{w.steps ? 'Draft' : 'Not built yet'}</span> : !ph && <span className="me">Published</span>}<I n="chev" s={12} w={2.2} /></button>; })}</div></section>
      </div>
      <div className="col">
        {full ? <Card t="Readiness" sub="Out of 7 teams"><div className="col m">{[['Signed in', 6, ['enrolled']], ['Intake submitted', 3, ['forms', null, 'teams']], ['Week 0 done', 1, ['enrolled']], ['Paid in full', 5, ['revenue']]].map(r => <button key={r[0]} className="rdy" onClick={() => go(...r[2])}><span style={{ flex: '0 0 116px' }}>{r[0]}</span><PBar v={r[1]} max={7} /><span className="tn w5 rdn">{r[1]} of 7</span></button>)}</div></Card>
          : <Card t="Seats" right={<Btn onClick={() => go('enrolled')}>People</Btn>}><div className="col m"><div className="rdy" style={{ cursor: 'default' }}><span style={{ flex: '0 0 96px' }}>Seats taken</span><PBar v={CT.length} max={COH.cap} /><span className="tn w5 rdn">{CT.length} of {COH.cap}</span></div><p className="me">{COH.enroll ? 'Enrollment is open. A team that buys a seat lands here.' : 'No one yet. Enrollment is closed.'}</p></div></Card>}
        <Card t="Coming up" right={<Btn onClick={() => go('sessions')}>Schedule</Btn>}><div className="col m">{SES.length ? SES.slice(started && full ? 2 : 0, started && full ? 5 : 3).map(s => <button key={s.n} className="rnw" onClick={() => go('sessions')}><span className="dt"><b>{s.d.split(' ')[2]}</b><span>{s.d.split(' ')[1]}</span></span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{s.t}</span><span className="me">{s.d.split(',')[0]} · {s.time || '12:00 PM'} MT</span></span>{s.clash ? <span className="pl warn">Same time</span> : s.zoom !== 'Ready' && <span className="pl warn">No link</span>}</button>) : <p className="s2">No sessions yet.</p>}</div></Card>
        <Card t="This cohort's shape" right={<Btn onClick={() => go('cohortset')}>Settings</Btn>}><div className="kvs"><KV rows={[['Promise', COH.promise], ['Meets', COH.pattern.map(s => s[0] + ' ' + s[2].toLowerCase()).join(' and ')], ['Seats', COH.cap + ' teams'], ['Price', COH.price ? COH.price + (COH.two ? ', or two payments' : '') : <span className="pl warn">Not set</span>]]} /></div></Card>
      </div>
    </div>
    {wk && <WeeksDlg onClose={() => setWk(false)} />}
  </div>;
}

/* ---------- Cohort › Schedule: every session, in one place ---------- */
function CohortSchedule() {
  const { go, guard, toast, log } = useC();
  const [f, setF] = useState('All sessions');
  const total = COH.pick.length * COH.pattern.length, wkOf = s => WEEKS.find(w => w.n === s.wk) || { t: '' };
  const noZoom = SES.filter(s => s.zoom !== 'Ready').length, clash = SES.filter(s => s.clash).length, noSes = WEEKS.filter(w => w.id > 0 && !SES.some(s => s.wk === w.n));
  const next = d => { const m = d.match(/(\w+), (\w+) (\d+)/), mi = MON.indexOf(m[2]); return dfmt(new Date(Date.UTC(mi > 9 ? 2026 : 2027, mi, +m[3] + 1))); };
  const fill = () => guard('build', 'Add the missing sessions', () => { noSes.forEach(w => { if (!w.build) return; COH.pattern.forEach((sl, i) => SES.push({ n: SES.length + 1, t: w.t + ' · ' + sl[2], k: sl[2], wk: w.n, wid: w.id, d: i ? next(w.build) : w.build, time: sl[1], zoom: 'No link yet', inv: 'Draft' })); }); log('cohort.sessions_fill', COH.n, noSes.length + ' weeks'); POKE(); toast(noSes.length * COH.pattern.length + ' sessions added from the cohort\'s rhythm'); });
  const rows = SES.filter(s => f === 'All sessions' || (f === 'Without a Zoom link' ? s.zoom !== 'Ready' : f === 'Same time as another cohort' ? s.clash : s.k === (f === 'Live builds' ? 'Live build' : 'Office hours')));
  return <div className="col">
    <LFacts items={[['On the calendar', SES.length + ' of ' + total + ' sessions'], ['Rhythm', COH.pattern.map(s => s[0] + ' ' + s[2].toLowerCase()).join(' and '), () => go('cohortset')], ['Without a Zoom link', String(noZoom), () => setF('Without a Zoom link')], clash ? ['Same time as another cohort', String(clash), () => setF('Same time as another cohort')] : ['Next', SES[0] ? SES[0].d + ' · ' + (SES[0].time || '12:00 PM') + ' MT' : 'None yet']]} />
    {noSes.length > 0 && <div className="note row" style={{ gap: 10 }}><I n="cohorts" /><span style={{ flex: 1, minWidth: 200 }}><b>Weeks {noSes[0].n} to {noSes[noSes.length - 1].n} have no sessions yet.</b> The rhythm is {COH.pattern.map(s => DOWF[s[0]] + ' ' + s[2].toLowerCase()).join(' and ')}, so they can be laid out for you.</span><GBtn perm="build" label="Add the missing sessions" go={fill}>Add {noSes.length * COH.pattern.length} sessions</GBtn></div>}
    <div className="row"><Sel label="Kind" v={f} on={setF} opts={['All sessions', 'Live builds', 'Office hours', 'Without a Zoom link', ...(clash ? ['Same time as another cohort'] : [])]} /><span className="sp" /><GBtn k="p" ic="plus" perm="build" label="Add session" go={() => toast('Session editor opens here')}>Add session</GBtn></div>
    <Table rows={rows} onRow={s => toast('Opens ' + s.t)} empty={{ ic: 'cohorts', t: 'No sessions match', b: 'Try another filter.' }}
      cols={[{ k: 't', l: 'Session', w: 'minmax(240px,1.6fr)', r: s => <Two a={s.t} b={s.k} /> }, { k: 'd', l: 'When', w: '210px', ns: 1, r: s => <When d={s.d} t={s.time || '12:00 PM'} /> },
        { k: 'wk', l: 'Week', w: 'minmax(200px,1.2fr)', hide: 'lap', r: s => <button className="lk a el" onClick={e => { e.stopPropagation(); go('week', String(widOf(s))); }}>Week {s.wk} · {wkOf(s).t}</button> },
        { k: 'zoom', l: 'Zoom link', w: '150px', r: s => s.clash ? <span className="pl warn">Same time as Dec</span> : s.zoom === 'Ready' ? <St v="Ready" /> : <span className="pl warn">No link yet</span> }, { k: 'inv', l: 'Reminder', w: '112px', r: s => <St v={s.inv} /> }]}
      menu={s => [{ l: 'Edit session', g: 1, fn: () => guard('build', 'Edit ' + s.t, () => toast('Session editor opens here')) }, { l: 'Copy join link', fn: () => toast('Join link copied') }, { l: 'Open the week', fn: () => go('week', String(widOf(s))) }, { l: 'Attach replay', g: 1, fn: () => guard('build', 'Attach replay', () => toast('Replay picker opens here')) }]} />
    <p className="me">Sessions are edited here and nowhere else. A week shows its sessions but doesn't change them. Times are Mountain, with Central under each for what learners see.</p>
  </div>;
}

/* ---------- Cohort › People: the teams and learners in this cohort, and how each is doing ---------- */
function CohortPeople() {
  const { route, go } = useC();
  const [tab, setTab] = useState(route.tab === 'learners' ? 'learners' : 'teams'), [q, setQ] = useState('');
  const f = r => (r.n + (r.owner || '') + (r.team || '')).toLowerCase().includes(q.toLowerCase());
  const W0 = ({ v }) => <span className="row nw" style={{ gap: 10 }}><PBar v={v} max={8} /><span className="tn" style={{ flex: 'none', minWidth: 42, textAlign: 'right' }}>{v} of 8</span></span>;
  if (!CT.length) return <QuietTab t="No one is enrolled yet" b={COH.enroll ? 'Enrollment is open. The first team to buy a seat shows up here.' : 'Enrollment is closed. Open it from Overview, and a team that buys a seat is placed here.'} />;
  return <div className="col">
    <div className="row"><Tabs v={tab} on={setTab} tabs={[['teams', 'Teams', CT.length + ' of ' + COH.cap], ['learners', 'Learners', 15]]} /><Find v={q} on={setQ} ph={tab === 'teams' ? 'Find a team' : 'Find a person'} /></div>
    {tab === 'teams' && <Table rows={CT.filter(f)} onRow={t => go('workspace', t.id)}
      cols={[{ k: 'n', l: 'Team', w: 'minmax(200px,1.5fr)', r: t => <Two a={t.n} b={t.owner} /> }, { k: 'seats', l: 'People', w: '120px', r: t => <span className="tn">{t.in} of {t.seats} signed in</span> },
        { k: 'pay', l: 'Paid', w: '140px', hide: 'lap', r: t => t.pay === 'Paid in full' ? <St v="Paid" /> : <span className="pl info">{t.pay}</span> },
        { k: 'intake', l: 'Intake', w: '120px', r: t => <St v={t.intake} tone={t.intake === 'Submitted' ? 'ok' : t.intake === 'Draft' ? 'warn' : 'off'} /> },
        { k: 'w0', l: 'Week 0', w: '150px', r: t => <W0 v={t.w0} /> }, { k: 'last', l: 'Last active', w: '150px', ns: 1, hide: 'lap' }]}
      menu={t => [{ l: 'Open team', fn: () => go('workspace', t.id) }, { l: 'Read their intake', fn: () => go('workspace', t.id, 'intake') }, { l: 'What they turned in', fn: () => go('workspace', t.id, 'turnedin') }]} />}
    {tab === 'learners' && <><Table rows={CL.filter(f)} onRow={u => go('user', u.id)}
      cols={[{ k: 'n', l: 'Learner', w: 'minmax(210px,1.5fr)', r: u => <Two a={u.n} b={u.e} /> }, { k: 'team', l: 'Team', w: 'minmax(160px,1fr)', r: u => <button className="lk el" onClick={e => { e.stopPropagation(); go('workspace', CT.find(t => t.n === u.team).id); }}>{u.team}</button> },
        { k: 'role', l: 'Seat', w: '190px', hide: 'lap' }, { k: 'w0', l: 'Week 0', w: '150px', r: u => <W0 v={u.w0} /> }, { k: 'last', l: 'Last active', w: '150px', ns: 1, r: u => u.st === 'Invited' ? <span className="pl warn">Invited, not signed in</span> : u.last }]} />
      <p className="me">Showing 8 of 15. The other seven are teammates who joined from an invite.</p></>}
    <p className="me">This is the cohort's roster: who is in it and how far along they are. For a sign-in, a plan or a seat, open the person or the team.</p>
  </div>;
}

/* ---------- Cohort › Submissions: what the cohort told you (intake) and sent you (turned in) ---------- */
function CohortSubs() {
  const { route, toast } = useC();
  const [v, setV] = useState({ teams: 'teams', turnedin: 'asks', files: 'files' }[route.tab] || 'intake');
  if (!COH.full) return <QuietTab b="Intake answers and turned-in files show up here once teams are enrolled." />;
  return <div className="col">
    <div className="row"><Tabs v={v} on={setV} tabs={[['intake', 'Intake, added up'], ['teams', 'Intake, team by team', IR.filter(r => r.st === 'Submitted').length + ' of ' + IR.length], ['asks', 'Turned in, by step'], ['files', 'Turned in, every file', TI0.length]]} /><span className="sp" /><Btn ic="download" onClick={() => toast('Exported as CSV')}>Export CSV</Btn></div>
    {v === 'intake' && <FormsIntake />}{v === 'teams' && <IntakeTab />}{v === 'asks' && <FormsTurnedIn />}{v === 'files' && <TurnedInTab />}
  </div>;
}

/* ---------- Cohort › Settings: its shape, its dates, its seats and price, the words that come from them ---------- */
function CohortSettings() {
  const { go, guard, toast, setDlg, log } = useC();
  const [dates, setDates] = useState(false), [shape, setShape] = useState(null), [wk, setWk] = useState(false), [pr, setPr] = useState(null);
  const openEnroll = useEnroll(), full = !!COH.full, how = howOf(COH);
  const saveShape = () => guard('build', 'Save the shape', () => { if (full) toast('Saved. Sessions that haven\'t happened are laid out again.'); else { reshape(COH, { pick: shape.pick, pattern: shape.slots.map(s => [...s]), week0: shape.week0 }); syncCur(); POKE(); toast('Shape saved. ' + COH.ses.length + ' sessions are on the calendar.'); } log('cohort.shape', COH.n, shapeOf(COH)); setShape(null); });
  return <div className="col">
    <div className="set2">
      <div className="col">
        <Card t="Shape" sub="How long it runs and how often you meet" right={<GBtn perm="build" label="Edit the shape" go={() => setShape({ pick: [...COH.pick], slots: COH.pattern.map(s => [...s]), week0: COH.week0 })}>Edit</GBtn>}>
          <div className="kvs"><KV rows={[['Length', COH.pick.length + ' weeks of building' + (COH.week0 ? ', after a setup week' : '')], ...COH.pattern.map((s, i) => [i ? 'And' : 'Meets', slotLine(s)]), ['Its weeks', <button className="lk a" onClick={() => setWk(true)}>{COH.pick.length} of the program's {LIB.length - 1}</button>], ['Hosts', COH.hosts]]} /></div>
          <p className="me" style={{ marginTop: 12 }}>Change the shape and the sessions that haven't happened are laid out again. Past sessions keep their dates.</p></Card>
        <Card t="Dates and release" right={<GBtn perm="build" label="Edit dates and release" go={() => setDates(true)}>Edit</GBtn>}><div className="kvs"><KV rows={[['Week 1 opens', COH.w1 + ' · 12:00 PM MT'], ['A week opens', 'Every Sunday · 12:00 PM MT · 1:00 PM CT for learners'], [COH.week0 ? 'Setup week opens' : 'Preview opens', full ? 'Mon, Nov 23 · 9:00 AM MT' : COH.opens + ' · 12:00 PM MT'], ['Welcome email', full ? 'Sun, Nov 29 · 12:00 PM MT' : 'When a team is enrolled'], ['Session reminders', 'The day before and an hour before, in MT and CT'], ['Time zone', 'Mountain in the admin. Learners see Central.']]} /></div></Card>
      </div>
      <div className="col">
        <Card t="Enrollment" right={<St v={COH.enroll ? 'Open' : 'Closed'} tone={COH.enroll ? 'ok' : 'off'} />}>
          <div className="kvs"><KV rows={[['Seats', <button className="lk a" onClick={() => go('enrolled')}>{CT.length} of {COH.cap} taken</button>], ['A seat is', 'A team: an owner and an AI Implementer'], ['Price', COH.price ? COH.price : <span className="pl warn">Not set</span>], ['Two payments', COH.two ? 'Offered. Half at checkout, half 30 days later.' : 'Not offered'], ['Who lands here', 'A team that buys a seat while enrollment is open']]} /></div>
          <div className="row" style={{ marginTop: 12 }}>{COH.enroll ? <GBtn perm="account" label="Close enrollment" go={() => setDlg({ title: 'Close enrollment for the ' + COH.n + '?', body: 'No new team can buy a seat in this cohort. The ' + CT.length + ' already in it are not affected.', cta: 'Close enrollment', yes: () => { COH.enroll = false; log('cohort.enrollment_close', COH.n, ''); POKE(); toast('Enrollment is closed'); } })}>Close enrollment</GBtn> : <GBtn k="p" perm="account" label="Open enrollment" go={openEnroll}>Open enrollment</GBtn>}<GBtn perm="account" label="Set the price" go={() => setPr({ v: COH.price || '', two: COH.two })}>{COH.price ? 'Change the price' : 'Set the price'}</GBtn></div></Card>
        <Card t="Words from this cohort" sub="Written from its shape, so they are right for this group. Learners see them on Home and the Schedule."><div className="col m">
          <div className="cfx"><span className="me">Name</span><span>{COH.n}</span></div>
          <div className="cfx"><span className="me">The promise</span><span>{COH.promise}</span></div>
          <div className="cfx"><span className="me">How it works</span><ul className="cfl">{how.map(h => <li key={h}>{h}</li>)}</ul></div>
          <div className="cfx"><span className="me">Holiday note</span><span>{COH.holiday || 'None. Every week has its sessions.'}</span></div>
          <div className="row"><GBtn perm="build" label="Edit this cohort's words" go={() => { COH.read = true; POKE(); toast('Opens these four as fields. The portal fills them in from the shape until you change one.'); }}>Edit words</GBtn><button className="lk a" onClick={() => go('course')}>What every cohort shares is in Course settings</button></div>
        </div></Card>
        <Card t="Clean-up"><div className="col m">
          <div className="row nw" style={{ gap: 12 }}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">Delete turned-in files</span><span className="me">Removes every file teams turned in. The record that they turned it in stays.</span></span><GBtn perm="build" label="Delete turned-in files" go={() => setDlg({ title: 'Delete this cohort\'s turned-in files?', body: 'Every file teams turned in is removed for good. The record that they turned it in stays.', cta: 'Delete files', danger: 1, needReason: 1, yes: r => { log('cohort.files_delete', COH.n, r); toast('Turned-in files deleted'); } })}>Delete…</GBtn></div>
          <div className="row nw" style={{ gap: 12 }}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">Archive this cohort</span><span className="me">Hides it from the switcher when it is over. Its people, files and payments are kept.</span></span><GBtn perm="build" label="Archive this cohort" go={() => toast(full ? 'A cohort can be archived after its last session, Thu, Feb 4.' : 'Archived cohorts move to the bottom of the switcher.')}>Archive…</GBtn></div>
        </div></Card>
      </div>
    </div>
    {shape && <Modal title={'Shape of the ' + COH.n} w={640} onClose={() => setShape(null)} foot={<><Btn onClick={() => setShape(null)}>Cancel</Btn><Btn k="p" onClick={saveShape}>Save shape</Btn></>}>
      <ShapeFields f={shape} up={p => setShape({ ...shape, ...p })} />
      <div className="lab"><span>What this makes</span><PlanList pl={planOf({ start: COH.start, week0: shape.week0, pick: shape.pick, pattern: shape.slots })} /></div>
    </Modal>}
    {wk && <WeeksDlg onClose={() => setWk(false)} />}
    {pr && <Modal title={'Price for a seat in the ' + COH.n} w={520} onClose={() => setPr(null)} foot={<><Btn onClick={() => setPr(null)}>Cancel</Btn><Btn k="p" disabled={!pr.v.trim()} onClick={() => guard('account', 'Set the price', () => { COH.price = pr.v.trim(); COH.two = pr.two; log('cohort.price', COH.n, COH.price); setPr(null); POKE(); toast('Price saved'); })}>Save price</Btn></>}>
      <label className="lab">Price for a seat<input className="in" value={pr.v} placeholder="$0,000" onChange={e => setPr({ ...pr, v: e.target.value })} style={{ maxWidth: 160 }} /></label>
      <label className="ckr"><input type="checkbox" checked={pr.two} onChange={e => setPr({ ...pr, two: e.target.checked })} /><span className="col" style={{ gap: 0 }}><span className="w5">Offer two payments</span><span className="me">Half at checkout, half 30 days later. Revenue shows the second half as still to collect.</span></span></label>
      <p className="me">Saving makes this cohort's own checkout in Stripe, so every buyer and every dollar is filed under it.</p>
    </Modal>}
    {dates && <Modal title="Dates and release" w={560} onClose={() => setDates(false)} foot={<><Btn onClick={() => setDates(false)}>Cancel</Btn><Btn k="p" onClick={() => guard('build', 'Save dates and release', () => { setDates(false); log('cohort.plan_save', COH.n, ''); toast('Dates and release saved'); })}>Save</Btn></>}>
      <div className="g2"><label className="lab">Week 1 opens<input className="in" type="date" defaultValue={COH.start} /></label><label className="lab">A week opens at (MT)<input className="in" type="time" defaultValue="12:00" /></label></div>
      <div className="g2"><label className="lab">{COH.week0 ? 'Setup week opens' : 'Preview opens'}<input className="in" type="date" defaultValue={full ? '2026-11-23' : isoOf(COH.opens)} /></label><label className="lab">Time (MT)<input className="in" type="time" defaultValue={full ? '09:00' : '12:00'} /></label></div>
      <p className="me">To move the whole cohort, change when Week 1 opens. Every week and session after it moves by the same number of days.</p>
      <div className="lab"><span>Each week</span><span className="fat">Move one week on its own, for a holiday break. Its sessions that haven't happened move with it.</span>
        <div className="ewl"><div className="ewr ewh" aria-hidden="true"><span /><span /><span>Opens</span><span>Due</span></div>
          {WEEKS.map(w => { const o = isoOf(w.opens); return <div key={w.id} className="ewr"><span className="wn sm">{w.n}</span><span className="el ewt">{w.t}</span><label className="ewf"><span className="ewk">Opens</span>{w.id === 0 ? <span className="me">Set above</span> : <input className="in" type="date" aria-label={'Week ' + w.n + ' opens'} defaultValue={o} />}</label><label className="ewf"><span className="ewk">Due</span><input className="in" type="date" aria-label={'Week ' + w.n + ' is due'} defaultValue={w.id === 0 ? isoOf(firstBuildOf(COH)) : o ? dadd(dparse(o), 6).toISOString().slice(0, 10) : ''} /></label></div>; })}</div></div>
    </Modal>}
  </div>;
}

/* =====================================================================================================
   Four pages with tabs, the home page, and the curriculum. A page's tab is one of yesterday's pages, so
   nothing was drawn twice: inside a tab, a page's own title is dropped and its own tabs become a
   segmented control (see Head and Tabs).
   ===================================================================================================== */
const AreaCtx = createContext(0);
const SOLO = { Overview: 1, Program: 1, Cohort: 1, People: 1, Revenue: 1 };
const AREAS = {
  program: [['curriculum', 'Curriculum'], ['settings', 'Course settings'], ['vault', 'Resource Vault']],
  cohort: [['overview', 'Overview'], ['schedule', 'Schedule'], ['people', 'People'], ['submissions', 'Submissions'], ['community', 'Community'], ['announcements', 'Announcements'], ['settings', 'Settings']],
  people: [['everyone', 'Everyone'], ['teams', 'Teams'], ['utah', 'Utah Life'], ['masquerade', 'Masquerade']],
  revenue: [['summary', 'Summary'], ['payments', 'Payments'], ['plans', 'Plans & upgrades'], ['usage', 'Usage']],
};
const AREA_TABS = Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v.map(t => t[0])]));
/* yesterday's page names still work: each one is a tab now */
const ALIAS = { course: ['program', 'settings'], vault: ['program', 'vault'], sessions: ['cohort', 'schedule'], enrolled: ['cohort', 'people'], forms: ['cohort', 'submissions'], community: ['cohort', 'community'], announce: ['cohort', 'announcements'], cohortset: ['cohort', 'settings'],
  teamsall: ['people', 'teams'], groups: ['people', 'utah'], masquerade: ['people', 'masquerade'], billing: ['revenue', 'payments'], tiers: ['revenue', 'plans'], usage: ['revenue', 'usage'] };
const routeOf = (s, id, tab) => ALIAS[s] ? { s: ALIAS[s][0], tab: ALIAS[s][1], sub: tab, id } : AREA_TABS[s] ? (AREA_TABS[s].includes(tab) ? { s, tab, id } : { s, tab: AREA_TABS[s][0], sub: tab, id }) : { s, id, tab };
const aliasOf = r => Object.keys(ALIAS).find(k => ALIAS[k][0] === r.s && ALIAS[k][1] === r.tab);

function Area({ k, t, meta, d, right, counts = {}, children }) {
  const c = useC(), tab = AREA_TABS[k].includes(c.route.tab) ? c.route.tab : AREA_TABS[k][0];
  return <div className="pg area">
    <Head t={t} meta={meta} d={d} right={right} />
    <Tabs v={tab} on={v => c.go(k, null, v)} tabs={AREAS[k].map(([id, l]) => counts[id] === undefined ? [id, l] : [id, l, counts[id]])} />
    <AreaCtx.Provider value={1}><Ctx.Provider value={{ ...c, route: { ...c.route, tab: c.route.sub, sub: undefined } }}><div className="atb" key={tab + '/' + (c.route.sub || '')}>{children(tab)}</div></Ctx.Provider></AreaCtx.Provider>
  </div>;
}

function ProgramArea() {
  return <Area k="program" t={<span className="row nw" style={{ gap: 10 }}><PTile s={28} />{PRG.n}</span>} meta={<Pill v="Program" tone="" />} d="What you teach. A week is built once here, and every cohort that runs it gets the same week on its own dates." counts={{ curriculum: LIB.length }}>
    {tab => tab === 'settings' ? <CourseSet /> : tab === 'vault' ? <Vault /> : <Curriculum3 />}</Area>;
}
function CohortArea() {
  const { go, toast, started } = useC();
  const openEnroll = useEnroll(), full = !!COH.full, wait = full ? CMT.filter(waiting).length : 0;
  return <Area k="cohort" t={<CohortPick big />} meta={<St v={started && full ? 'Active' : COH.st} />} d={PRG.n + ' · ' + shapeOf(COH) + ' · opens ' + COH.opens}
    right={<>{!COH.enroll && <GBtn k="p" perm="account" label="Open enrollment" go={openEnroll}>Open enrollment</GBtn>}<Btn ic="eye" onClick={() => toast('Opens the learner preview of this cohort')}>Preview</Btn><Menu items={[{ l: 'New cohort…', fn: () => go('newcohort') }, { l: 'All settings', fn: () => go('cohortset') }]} /></>}
    counts={{ schedule: SES.length, people: CT.length, community: wait || undefined }}>
    {tab => tab === 'schedule' ? <CohortSchedule /> : tab === 'people' ? <CohortPeople /> : tab === 'submissions' ? <CohortSubs /> : tab === 'community' ? (full ? <Community /> : <QuietTab b="This cohort's threads start when its first members are in." />) : tab === 'announcements' ? (full ? <Announce /> : <QuietTab b="Nothing has been sent to this cohort." />) : tab === 'settings' ? <CohortSettings /> : <CohortOverview />}</Area>;
}
function PeopleArea() {
  return <Area k="people" t="People" d="Everyone with a sign-in, across every product. Each person is counted once, under how they got in." counts={{ everyone: AUD_ALL, teams: TEAMS2.length, utah: 31 }}>
    {tab => tab === 'teams' ? <TeamsPg /> : tab === 'utah' ? <Groups /> : tab === 'masquerade' ? <Masquerade /> : <PeoplePg />}</Area>;
}
function RevenueArea() {
  return <Area k="revenue" t="Revenue" d="What has come in, what is still owed on a payment plan, and what repeats every month. Every figure is from Stripe and opens the payments behind it." counts={{ plans: 2 }}>
    {tab => tab === 'payments' ? <Billing /> : tab === 'plans' ? <Tiers /> : tab === 'usage' ? <Usage /> : <Revenue />}</Area>;
}

/* a field that is filled in from the cohort, shown where the course's shared words are edited */
const FromCohort = ({ l, at, v, lines }) => { const { go } = useC(); return <div className="lab"><span>{l}</span>{at && <span className="fat">Learners see it on {at}</span>}
  <div className="cfb"><span className="pl info">From the cohort</span>{lines ? <ul className="cfl">{lines.map(x => <li key={x}>{x}</li>)}</ul> : <span style={{ fontWeight: 400 }}>{v}</span>}<button type="button" className="lk a" onClick={() => go('cohortset')}>{COH.n.replace(' Cohort', '')} › Settings</button></div></div>; };

/* ---------- Program › Curriculum: the weeks, built once ---------- */
function Curriculum3() {
  const { go, guard, toast, setDlg, log, ph } = useC();
  const pub = w => guard('build', 'Publish ' + w.t, () => setDlg({ title: 'Publish ' + w.t + '?', body: 'Each cohort that runs it gets it on its own date. Until then learners see its title and outcome, locked.', cta: 'Publish', yes: () => { w.st = 'Published'; syncCur(); log('module.publish', w.t, ''); POKE(); toast(w.t + ' is published'); } }));
  const used = id => COHORTS.map(c => { const r = c.run.find(x => x.id === id); return r && [c, r]; }).filter(Boolean);
  const drafts = LIB.filter(w => w.st === 'Draft').length;
  return <div className="col">
    <section className="cd">
      <div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Weeks</h2><span className="me">{LIB.length - drafts} published and {drafts} in draft. Open a week to build it.</span></div><GBtn k="p" ic="plus" perm="build" label="Add a week" go={() => toast('Adds a week at the end as a draft and opens it')}>Add a week</GBtn></div>
      <div className="wkl">{LIB.map(w => { const u = used(w.id); return <div key={w.id} className="wkr">
        {!ph && <span className="grp" title="Drag to reorder" aria-hidden="true"><I n="grip" s={14} /></span>}
        <Wn n={w.id} st={w.st} />
        <button className="wkm" onClick={() => go('week', String(w.id))}><span className="w5 el">{w.t}</span><span className="me el">{w.o}</span></button>
        <div className="wkc"><span className="tn">{w.steps ? w.steps + ' steps' : 'No steps yet'}</span><span className="me">{w.min ? Math.floor(w.min / 60) + ' hr ' + (w.min % 60 ? (w.min % 60) + ' min' : '') : 'Not built'}</span></div>
        <div className="wkc wkd">{u.length ? u.map(([c, r]) => <button key={c.id} className="lk el uin" onClick={() => { setCur(c.id); go('cohort'); }}>{c.n.replace(' Cohort', '')} · Week {r.n}</button>) : <span className="me">No cohort runs it</span>}</div>
        <div className="wks">{w.st === 'Draft' ? <Btn disabled={!w.steps} title={w.steps ? undefined : 'Add a step first'} onClick={() => pub(w)}>Publish</Btn> : <St v="Published" />}</div>
        <Menu items={[{ l: 'Open week', ic: 'builder', fn: () => go('week', String(w.id)) }, { l: 'Preview as a learner', ic: 'eye', fn: () => toast('Opens the learner preview of ' + w.t) }, { l: 'Duplicate', g: 1, fn: () => guard('build', 'Duplicate ' + w.t, () => toast('Duplicated as a draft. Use it when one cohort needs its own version of a week.')) }, '-', w.st === 'Draft' ? { l: 'Publish', g: 1, fn: () => pub(w) } : { l: 'Unpublish', g: 1, d: 1, fn: () => guard('build', 'Unpublish', () => toast('Hidden from learners in every cohort. Their progress is kept.')) }]} />
      </div>; })}</div>
    </section>
    <div className="set2">
      <Card t="Cohorts that run it" right={<Btn ic="plus" onClick={() => go('newcohort')}>New</Btn>}><div className="col m">{COHORTS.map(c => <button key={c.id} className="rnw" onClick={() => { setCur(c.id); go('cohort'); }}><PTile /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{c.n}</span><span className="me">{c.pick.length} weeks · opens {c.opens}</span></span><I n="chev" s={12} w={2.2} /></button>)}
        <p className="me">A cohort picks its weeks from this list and gives them dates. Change a week here and every cohort that runs it gets the change.</p></div></Card>
      <Card t="Shared by every week"><div className="kvs"><KV rows={[
        ['Course pages', <button className="lk a" onClick={() => go('course')}>Intro, rules, before and after</button>],
        ['Glossary', <button className="lk a" onClick={() => go('course', null, 'glossary')}>10 terms</button>],
        ['Words', <button className="lk a" onClick={() => go('course', null, 'words')}>6 lines learners see</button>],
        ['Resource Vault', <button className="lk a" onClick={() => go('vault')}>{LIB.reduce((a, w) => a + w.kit, 0)} kit files</button>]]} /></div></Card>
    </div>
  </div>;
}

/* ---------- Program › Curriculum › a week: the builder, one section at a time ---------- */
function WeekEdit() {
  const { route, go, guard, toast, ph } = useC();
  const w = LIB.find(x => String(x.id) === String(route.id)) || LIB[0], wi = LIB.indexOf(w);
  const steps = (w.id === 0 ? W0_STEPS : WK_STEPS).slice(0, w.steps);
  const [sec, setSec] = useState(route.tab || 'steps'), [dirty, setDirty] = useState(false), [k, setK] = useState(0);
  const touch = () => setDirty(true);
  const used = COHORTS.map(c => { const r = c.run.find(x => x.id === w.id); return r && { c, r }; }).filter(Boolean), mine = used.find(u => u.c === COH);
  const ses = mine ? SES.filter(s => widOf(s) === w.id) : [];
  const save = () => guard('build', 'Save ' + w.t, () => { setDirty(false); toast(w.t + ' saved' + (used.length > 1 ? ' for ' + used.length + ' cohorts' : '')); });
  return <div className="pg">
    <Head back={['program', 'Curriculum']} t={w.t} meta={<St v={w.st} />} d={w.o}
      right={<><span className="row nw" style={{ gap: 0 }}><button className="ib" aria-label="Previous week" disabled={wi === 0} onClick={() => go('week', String(LIB[wi - 1].id))}><I n="back" /></button><button className="ib" aria-label="Next week" disabled={wi === LIB.length - 1} onClick={() => go('week', String(LIB[wi + 1].id))}><span style={{ display: 'flex', transform: 'scaleX(-1)' }}><I n="back" /></span></button></span><Btn ic="eye" onClick={() => toast('Opens the learner preview of ' + w.t)}>Preview</Btn><Btn k="p" disabled={!dirty} onClick={save}>Save changes</Btn></>} />
    <div className="srg" key={k}>
      <Rail v={sec} on={setSec} items={[['basics', 'Basics'], ['steps', 'Steps', steps.length], ['page', 'Course page'], ['live', 'Live sessions', ses.length], ['cards', 'Hire cards', w.id === 0 ? 0 : 3], ['kit', 'Kit', w.kit]]} />
      <div className="col">
        {sec === 'basics' && <Card t="Basics" sub="What the week is called and what it is for."><div className="col">
          <Fld l="Title" at="the sidebar and the week page"><input className="in" defaultValue={w.t} onChange={touch} /></Fld>
          <Fld l="Outcome" at="the week page, under the title"><input className="in" defaultValue={w.o} onChange={touch} /></Fld>
          <div className="lab"><span>Where it runs</span><span className="fat">A week's number and its date come from the cohort, not from the week.</span>
            {used.length ? <div className="col m">{used.map(u => <button key={u.c.id} className="rnw uir" onClick={() => { setCur(u.c.id); go('cohort'); }}><span className="wn sm pk">{u.r.n}</span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">Week {u.r.n} of the {u.c.n}</span><span className="me">Opens {u.r.opens} · 12:00 PM MT{u.r.build ? ' · meets ' + u.r.build : ''}</span></span><I n="chev" s={12} w={2.2} /></button>)}</div> : <div className="note"><span className="s2">No cohort runs this week yet. Add it from a cohort's Overview, under The run.</span></div>}</div>
        </div></Card>}
        {sec === 'steps' && <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Steps</h2><span className="me">{steps.length ? 'In order. A learner ticks each one off.' : 'This week has no steps yet.'}</span></div><GBtn ic="plus" perm="build" label="Add a step" go={() => { touch(); toast('Adds a step at the end and opens it'); }}>Add a step</GBtn></div>
          {steps.length ? <div className="wkl">{steps.map((s, i) => <div key={i} className="wkr stp">
            {!ph && <span className="grp" aria-hidden="true"><I n="grip" s={14} /></span>}<span className="wn sm">{i + 1}</span>
            <button className="wkm" onClick={() => toast('Opens the step: its words, who does it, its time, and its Claude and ChatGPT paths')}><span className="w5 el">{s[0]}</span><span className="me el">Done when: {s[3]}</span></button>
            <div className="wkc"><StepWho v={s[1]} /></div><div className="wks tn">{s[2]}</div>
            <Menu items={[{ l: 'Edit step', fn: () => toast('Opens the step') }, { l: 'Move up', fn: touch }, { l: 'Move down', fn: touch }, '-', { l: 'Remove step', d: 1, g: 1, fn: () => guard('build', 'Remove step', touch) }]} /></div>)}</div>
            : <Empty ic="curriculum" t="No steps yet" b="Add the first step, or duplicate a built week and change it." cta="Add a step" on={() => toast('Adds a step and opens it')} />}
        </section>}
        {sec === 'page' && <Card t="Course page" sub="The words on this week's page, above its steps."><div className="col">
          <Fld l="What you will build" at="the week page"><textarea className="in" rows={3} defaultValue={w.o + ' By Friday it has run on your own numbers at least twice.'} onChange={touch} /></Fld>
          <Lines l="Before you start" at="the week page" touch={touch} v={['Last year\'s numbers exported and saved in your AI Office.', 'Both of you can open the cohort skills.']} />
          <Fld l="What done looks like" at="Reference"><textarea className="in" rows={2} defaultValue="The report is turned in, and you can say what you would change next month." onChange={touch} /></Fld>
          <p className="me">What every week shares (the course intro, the rules, the glossary) is in <button className="lk a" onClick={() => go('course')}>Course settings</button>.</p>
        </div></Card>}
        {sec === 'live' && <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Live sessions</h2><span className="me">Sessions belong to the cohort. This week only says what happens in them.</span></div><Btn onClick={() => go('sessions')}>Open Schedule</Btn></div>
          {ses.length ? <div className="wkl">{ses.map(s => <div key={s.n} className="wkr stp"><span className="mt"><I n={s.k === 'Live build' ? 'play' : 'community'} /></span><button className="wkm" onClick={() => go('sessions')}><span className="w5 el">{s.t}</span><span className="me el">{s.d} · {s.time || '12:00 PM'} MT · {ctOf(s.time || '12:00 PM')} CT for learners</span></button><div className="wks"><St v={s.zoom === 'Ready' ? 'Ready' : 'Waiting'} /></div></div>)}</div>
            : <div className="cdb"><p className="s2">{w.id === 0 ? 'The setup week is self-paced. It has no sessions.' : mine ? 'The ' + COH.n + ' has no sessions for this week yet. ' : 'The ' + COH.n + ' doesn\'t run this week. '}{w.id > 0 && mine && <button className="lk a" onClick={() => go('sessions')}>Add them in Schedule</button>}</p></div>}
          {w.id > 0 && <div className="cdb" style={{ borderTop: '1px solid var(--line)' }}><Lines l="Run of show" at="the live build's row on the week page" touch={touch} v={['0:00 What we are building and why', '0:10 Build it together, step by step', '1:00 Run it on your own data', '1:20 What to turn in by Friday']} /></div>}
        </section>}
        {sec === 'cards' && <Card t="Hire cards" sub="The three cards a learner keeps from the week.">{w.id === 0 ? <p className="s2">The setup week has no hire. Cards start with the first building week.</p> : <div className="col m">{[['Seat card', 'What this hire does, for whom, and what it never touches.', 'Written'], ['Playbook card', 'How to run it, check it and fix it.', w.st === 'Draft' ? 'Empty' : 'Written'], ['Sample output', 'One finished report, from made-up numbers.', w.st === 'Draft' ? 'Empty' : 'Written']].map(c => <button key={c[0]} className="rnw" onClick={() => toast('Opens the ' + c[0].toLowerCase())}><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{c[0]}</span><span className="me">{c[1]}</span></span><Pill v={c[2]} tone={c[2] === 'Written' ? 'ok' : ''} /><I n="chev" s={12} w={2.2} /></button>)}</div>}</Card>}
        {sec === 'kit' && <Card t="Kit" sub="The skills and files this week hands out." right={<GBtn ic="plus" perm="build" label="Add to the kit" go={() => toast('Pick from the Resource Vault, or upload')}>Add</GBtn>}>{w.kit ? <div className="col m">{['Map Your Spend skill', 'Lead Source Review skill', 'Week checklist', 'Report template', 'Rubric', 'Sample week', 'Time baseline'].slice(0, w.kit).map((f, i) => <div key={f} className="row nw" style={{ gap: 10 }}><span className="mt"><I n={i < 2 ? 'bolt' : 'file'} /></span><span className="w5 el" style={{ flex: 1 }}>{f}</span><span className="me">{i < 2 ? 'Skill' : 'File'}</span></div>)}<p className="me">Files live in the <button className="lk a" onClick={() => go('vault')}>Resource Vault</button>. A week only points at them.</p></div> : <p className="s2">Nothing in this week's kit yet.</p>}</Card>}
        {dirty && <div className="svb"><span className="w5" style={{ flex: 1 }}>Unsaved changes to {w.t}</span><Btn onClick={() => { setDirty(false); setK(k + 1); }}>Discard</Btn><Btn k="p" onClick={save}>Save changes</Btn></div>}
      </div>
    </div>
  </div>;
}

/* ---------- Overview: the four things, each a link, and what needs you across all of them ---------- */
function Home() {
  const { go, started, ph } = useC();
  const openEnroll = useEnroll();
  const full = !!COH.full, dr = LIB.filter(w => w.st === 'Draft').length, short = COH.n.replace(' Cohort', '');
  const todo = full ? [] : todoOf(COH, go, openEnroll).filter(t => !t[2]);
  const at = (c, fn) => () => { setCur(c.id); fn(); };
  const groups = [...COHORTS.map(c => [c.n + (c.st === 'Draft' ? ' · Draft' : ''), (c.full ? needsOf(go) : todoOf(c, go, openEnroll).filter(t => !t[2]).map(t => ['cohorts', t[0], t[1], t[3], 'warn'])).map(r => [r[0], r[1], r[2], at(c, r[3]), r[4]])]),
    ['Payments and system', [['billing', '3 payments failed', 'Stripe is retrying one. Two need a new card.', () => go('billing', null, 'failed'), 'bad'], ['tiers', '2 teams asked to move up a plan', 'Both from the Agent Plan to the Team Plan.', () => go('tiers'), ''], ['incidents', '1 incident is open', 'Open it in Operations.', () => go('incidents'), 'bad']]]].filter(g => g[1].length);
  const needN = groups.reduce((a, g) => a + g[1].length, 0);
  const tiles = [
    ['Program', 'curriculum', 'AI Accelerator', LIB.length + ' weeks · ' + (LIB.length - dr) + ' published, ' + dr + ' in draft', 'program'],
    ['Cohort', 'cohorts', short, full ? (started ? 'Week 2 of 8' : 'Opens ' + COH.opens) + ' · ' + CT.length + ' of ' + COH.cap + ' seats' : 'Draft · ' + todo.length + ' left before it opens', 'cohort'],
    ['People', 'learners', AUD_ALL + ' with a sign-in', '15 in the cohort · 31 Utah Life, kept apart', 'people'],
    ['Revenue', 'billing', '$82,694 collected', '$7,500 still to collect · $12,429 a month', 'revenue'],
  ];
  const soon = COHORTS.flatMap(c => c.ses.slice(0, 2).map(s => ({ ...s, c }))).slice(0, 4);
  return <div className="pg">
    <Head t="Overview" d="What you teach, who is going through it, who has a sign-in, and what has been paid. Each one opens its page." />
    <div className="thr">{tiles.map(t => <button key={t[0]} className="cd thl" onClick={() => go(t[4])}><span className="tlk"><span className="mt"><I n={t[1]} /></span><span>{t[0]}</span><I n="chev" s={12} w={2.2} /></span><span className="fig el">{t[2]}</span><span className="me">{t[3]}</span></button>)}</div>
    <div className="gms">
      <div className="col">
        <section className="cd"><div className="cdh"><div className="col s" style={{ flex: 1, gap: 0 }}><h2>Needs you</h2><span className="me">Across the cohort, payments and the system</span></div><span className="pl warn">{needN}</span></div>
          <div className="wkl">{groups.map(g => <Fragment key={g[0]}><div className="ngl">{g[0]}</div>{g[1].map(n => <button key={g[0] + n[1]} className="nyr" onClick={n[3]}><span className={'mt' + (n[4] ? ' ' + n[4] : '')}><I n={n[0]} /></span><span className="col" style={{ gap: 0, flex: 1 }}><span className="w5">{n[1]}</span><span className="me">{n[2]}</span></span><I n="chev" s={12} w={2.2} /></button>)}</Fragment>)}</div></section>
        <AudCard />
      </div>
      <div className="col">
        <Card t="Cohorts" right={<Btn ic="plus" onClick={() => go('newcohort')}>New cohort</Btn>}><div className="col m">{COHORTS.map(c => <button key={c.id} className="rnw" onClick={() => { setCur(c.id); go('cohort'); }}><PTile /><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{c.n}</span><span className="me el">{c.pick.length} weeks · {meetsOf(c)} · opens {c.opens}</span></span><St v={c.st} /></button>)}</div></Card>
        <Card t="Coming up" right={<Btn onClick={() => go('sessions')}>Schedule</Btn>}><div className="col m">{soon.map(s => <button key={s.c.id + s.n} className="rnw" onClick={() => { setCur(s.c.id); go('sessions'); }}><span className="dt"><b>{s.d.split(' ')[2]}</b><span>{s.d.split(' ')[1]}</span></span><span className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}><span className="w5 el">{s.t}</span><span className="me el">{s.d.split(',')[0]} · {s.time || '12:00 PM'} MT{COHORTS.length > 1 ? ' · ' + s.c.n.replace(' Cohort', '') : ''}</span></span>{s.zoom !== 'Ready' && <span className="pl warn">No link</span>}</button>)}</div></Card>
      </div>
    </div>
  </div>;
}

/* ---------- the breadcrumb: Admin / the page / its tab / what is open ---------- */
const DETAIL = { week: 'curriculum', weekcards: 'curriculum', cthread: 'community', workspace: 'teams', user: 'everyone', as: 'masquerade' };
const TODAY = { curriculum: 'Curriculum (today)', builder: 'Module Builder (today)', cohorts: 'Cohorts & Sessions (today)', learners: 'Learners & Teams (today)', workspaces: 'Workspaces (today)', users: 'Users (today)', overview0: 'Overview (today)' };
const hereOf = r => r.s === 'week' ? (LIB.find(w => String(w.id) === String(r.id)) || {}).t : r.s === 'weekcards' ? 'Week Builder' : r.s === 'cthread' ? (CMT.find(x => String(x.id) === String(r.id)) || {}).title : r.s === 'workspace' ? (WS.find(x => x.id === r.id) || {}).n : r.s === 'user' ? (USERS.find(x => x.id === r.id) || {}).n : r.s === 'as' ? 'Learner view' : r.s === 'newcohort' ? 'New cohort' : r.s === 'incident' ? r.id : '';
function Crumbs() {
  const { route, go } = useC();
  const par = PARENT[route.s], key = par || route.s, item = NAV.flatMap(g => g[1]).find(n => n[0] === key), grp = item && NAV.find(g => g[1].includes(item))[0];
  const tk = par ? DETAIL[route.s] : route.tab, tabL = AREAS[key] && tk ? (AREAS[key].find(t => t[0] === tk) || [])[1] : null, here = par ? hereOf(route) || 'Detail' : null;
  const L = (l, fn) => <button className="lk" style={{ fontWeight: 400, color: 'var(--f3)' }} onClick={fn}>{l}</button>, S = <span aria-hidden="true">/</span>;
  return <nav className="bc" aria-label="Breadcrumb"><span>Admin</span>
    {grp && !SOLO[grp] && <>{S}<span>{grp}</span></>}
    {item ? <>{S}{tabL || here ? L(item[1], () => go(item[0])) : <b>{item[1]}</b>}</> : <>{S}<b>{TODAY[route.s] || 'Page'}</b></>}
    {tabL && <>{S}{here ? L(tabL, () => go(key, null, tk)) : <b>{tabL}</b>}</>}
    {here && <>{S}<b className="el">{here}</b></>}
  </nav>;
}
const SCREENS = { program: ProgramArea, cohort: CohortArea, people: PeopleArea, revenue: RevenueArea, newcohort: NewCohort, week: WeekEdit, overview0: Overview, weekcards: WeekCards, forms: Forms, community: Community, cthread: CommunityThread, overview: Home, health: Health, curriculum: Curriculum, builder: Builder, vault: Vault, cohorts: Cohorts, announce: Announce, learners: Learners, workspaces: Workspaces, workspace: Workspace, users: Users, user: User, masquerade: Masquerade, as: LearnerView, tiers: Tiers, billing: Billing, usage: Usage, incidents: Incidents, incident: Incident, audit: Audit, api: Api, jobs: Jobs, email: Email, integrations: Integrations, deploys: Deploys, db: Db, flags: Flags, roles: Roles, denied: Denied };
/* Brand lockup: paths copied verbatim from amplified-impact-wordmark.svg (ink #0A0D0C, ring-and-dot tittle #1F8A5C). The rail crops the same artwork to its first glyph. */
const WM_VB = [41, -963.1, 7408, 1113.2];
const WM_PATHS = [{"fill":"#0A0D0C","d":"M41 -134Q41 -202 83.5 -241.5Q126 -281 215 -298L392 -333Q392 -389 366 -418Q340 -447 290 -447Q199 -447 181 -364L50 -370Q66 -454 128 -500Q190 -546 290 -546Q403 -546 461.5 -488.5Q520 -431 520 -324V-130Q520 -109 527 -101Q534 -93 550 -93H567V0Q551 4 521 4Q474 4 445.5 -16Q417 -36 409 -83Q389 -40 340.5 -14Q292 12 227 12Q142 12 91.5 -26.5Q41 -65 41 -134ZM392 -216V-246L254 -218Q212 -210 193 -192Q174 -174 174 -146Q174 -115 194.5 -98Q215 -81 253 -81Q316 -81 354 -118Q392 -155 392 -216Z M619 -534H735L738 -444Q757 -493 796 -519.5Q835 -546 885 -546Q943 -546 983 -517Q1023 -488 1040 -436Q1058 -489 1097.5 -517.5Q1137 -546 1193 -546Q1277 -546 1324 -493.5Q1371 -441 1371 -343V0H1243V-310Q1243 -376 1220.5 -409Q1198 -442 1152 -442Q1106 -442 1080 -406Q1054 -370 1054 -306V0H935V-306Q935 -374 914 -408Q893 -442 846 -442Q800 -442 773.5 -406Q747 -370 747 -306V0H619Z M1449 -534H1572L1574 -455Q1597 -499 1639 -522.5Q1681 -546 1734 -546Q1807 -546 1858.5 -509Q1910 -472 1935.5 -409Q1961 -346 1961 -267Q1961 -188 1935 -125Q1909 -62 1858 -25Q1807 12 1733 12Q1682 12 1640.5 -11Q1599 -34 1577 -73V150H1449ZM1828 -267Q1828 -349 1795 -395.5Q1762 -442 1703 -442Q1643 -442 1610 -397.5Q1577 -353 1577 -267Q1577 -181 1610 -136.5Q1643 -92 1703 -92Q1762 -92 1795 -138.5Q1828 -185 1828 -267Z M2022 -126 2023 -710H2151V-139Q2151 -99 2191 -99H2230V0H2151Q2089 0 2055.5 -30.5Q2022 -61 2022 -126Z M2291 -534H2419V0H2291ZM2289 -719H2422V-605H2289Z M2736 -710H2840V-611H2760Q2700 -611 2700 -548V-520H2833V-421H2700V0H2571V-421H2495V-520H2571V-555Q2571 -629 2612 -669.5Q2653 -710 2736 -710Z M2902 -534H3030V0H2902ZM2900 -719H3033V-605H2900Z M3094 -267Q3094 -350 3126 -413.5Q3158 -477 3216.5 -511.5Q3275 -546 3353 -546Q3429 -546 3486.5 -512Q3544 -478 3575.5 -413.5Q3607 -349 3607 -260V-231H3227Q3231 -162 3265 -126Q3299 -90 3357 -90Q3399 -90 3428 -109.5Q3457 -129 3468 -164L3599 -156Q3577 -78 3512.5 -33Q3448 12 3356 12Q3277 12 3217.5 -22.5Q3158 -57 3126 -120Q3094 -183 3094 -267ZM3353 -445Q3301 -445 3267.5 -412Q3234 -379 3227 -317H3474Q3470 -381 3438 -413Q3406 -445 3353 -445Z M3637 -267Q3637 -352 3664.5 -415Q3692 -478 3742 -512Q3792 -546 3859 -546Q3914 -546 3956.5 -522.5Q3999 -499 4021 -458V-710H4149V0H4028L4025 -79Q4002 -36 3958 -12Q3914 12 3859 12Q3791 12 3741 -22Q3691 -56 3664 -119Q3637 -182 3637 -267ZM4021 -267Q4021 -352 3989 -397Q3957 -442 3897 -442Q3838 -442 3804 -395Q3770 -348 3770 -267Q3770 -187 3804.5 -139.5Q3839 -92 3897 -92Q3956 -92 3988.5 -137.5Q4021 -183 4021 -267Z M4435 -534H4563V0H4435Z M4659 -534H4775L4778 -444Q4797 -493 4836 -519.5Q4875 -546 4925 -546Q4983 -546 5023 -517Q5063 -488 5080 -436Q5098 -489 5137.5 -517.5Q5177 -546 5233 -546Q5317 -546 5364 -493.5Q5411 -441 5411 -343V0H5283V-310Q5283 -376 5260.5 -409Q5238 -442 5192 -442Q5146 -442 5120 -406Q5094 -370 5094 -306V0H4975V-306Q4975 -374 4954 -408Q4933 -442 4886 -442Q4840 -442 4813.5 -406Q4787 -370 4787 -306V0H4659Z M5489 -534H5612L5614 -455Q5637 -499 5679 -522.5Q5721 -546 5774 -546Q5847 -546 5898.5 -509Q5950 -472 5975.5 -409Q6001 -346 6001 -267Q6001 -188 5975 -125Q5949 -62 5898 -25Q5847 12 5773 12Q5722 12 5680.5 -11Q5639 -34 5617 -73V150H5489ZM5868 -267Q5868 -349 5835 -395.5Q5802 -442 5743 -442Q5683 -442 5650 -397.5Q5617 -353 5617 -267Q5617 -181 5650 -136.5Q5683 -92 5743 -92Q5802 -92 5835 -138.5Q5868 -185 5868 -267Z M6034 -134Q6034 -202 6076.5 -241.5Q6119 -281 6208 -298L6385 -333Q6385 -389 6359 -418Q6333 -447 6283 -447Q6192 -447 6174 -364L6043 -370Q6059 -454 6121 -500Q6183 -546 6283 -546Q6396 -546 6454.5 -488.5Q6513 -431 6513 -324V-130Q6513 -109 6520 -101Q6527 -93 6543 -93H6560V0Q6544 4 6514 4Q6467 4 6438.5 -16Q6410 -36 6402 -83Q6382 -40 6333.5 -14Q6285 12 6220 12Q6135 12 6084.5 -26.5Q6034 -65 6034 -134ZM6385 -216V-246L6247 -218Q6205 -210 6186 -192Q6167 -174 6167 -146Q6167 -115 6187.5 -98Q6208 -81 6246 -81Q6309 -81 6347 -118Q6385 -155 6385 -216Z M6579 -267Q6579 -350 6611.5 -413.5Q6644 -477 6703.5 -511.5Q6763 -546 6842 -546Q6945 -546 7012 -492.5Q7079 -439 7091 -345L6959 -338Q6952 -388 6920.5 -415Q6889 -442 6842 -442Q6780 -442 6746 -396Q6712 -350 6712 -267Q6712 -184 6746 -138Q6780 -92 6842 -92Q6890 -92 6921 -120Q6952 -148 6959 -203L7091 -197Q7080 -101 7012.5 -44.5Q6945 12 6842 12Q6763 12 6703.5 -22.5Q6644 -57 6611.5 -120Q6579 -183 6579 -267Z M7180 -153V-435H7096V-534H7180V-659H7308V-534H7449V-435H7308V-165Q7308 -128 7323.5 -113.5Q7339 -99 7374 -99H7449V0H7335Q7255 0 7217.5 -37Q7180 -74 7180 -153Z"}];
function WordmarkOld({ short, h = 22 }) {
  const w = short ? 540 : WM_VB[2];
  return <svg className="wm" role="img" aria-label="Amplified Impact" height={h} width={Math.round(h * w / WM_VB[3] * 10) / 10} viewBox={WM_VB[0] + ' ' + WM_VB[1] + ' ' + w + ' ' + WM_VB[3]} style={{ overflow: 'hidden' }}>{WM_PATHS.map((p, i) => <path key={i} fill={p.fill} d={p.d} />)}<circle fill="none" stroke="#1F8A5C" cx="4477" cy="-800" r="139.3" strokeWidth="47.7" /><circle fill="#1F8A5C" cx="4477" cy="-800" r="69.7" /></svg>;
}
function Wordmark({ short }) { return <span className={'wm' + (short ? ' wm-ai' : '')}><img src={LOGO_APP} width={161} height={34} alt="Amplified Impact Academy" /></span>; }
const GIC = { Overview: 'overview', Program: 'curriculum', Cohort: 'cohorts', People: 'learners', Revenue: 'billing', Operations: 'health', Access: 'roles' };

let NAVM = 'focus';
/* ---------- shell ---------- */
function Sidebar({ rail, setRail, drawer, close }) {
  const { route, go, can, staff, masq, ph, toast } = useC();
  const active = PARENT[route.s] || route.s;
  const [open, setOpen] = useState({ Health: 1, Build: 1, Support: 1, Operations: 1 });   // prod today: everything open but Revenue
  const [peek, setPeek] = useState(undefined);   // proposal: the one group opened by hand (null: all shut); undefined: the group you are in
  useEffect(() => { setPeek(undefined); }, [active]);
  const wait = CMT.filter(waiting).length;
  const badge = n => n[0] === 'program' ? (LIB.filter(w => w.st === 'Draft').length ? LIB.filter(w => w.st === 'Draft').length + ' draft' : '') : n[0] === 'cohort' ? (COH.full ? (wait ? wait + ' waiting' : '') : COH.st === 'Draft' ? 'Draft' : '') : n[0] === 'revenue' ? '3 failed' : n[0] === 'incidents' && n[3] ? n[3] + (n[3] === '1' ? ' incident' : ' incidents') : n[3];
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
  return <aside ref={sbEl} className={'sb' + (r ? ' rail' : '') + (nar ? ' nar' : '') + (anim ? ' a-' + anim : '') + (NAVM === 'focus' ? ' nm-focus' : '')}>
    <div className="sb-top"><Wordmark short={nar} />{drawer && <><span className="sp" /><button className="ib" aria-label="Close menu" onClick={close}><I n="x" s={20} /></button></>}</div>
    <CtxSwitch r={r} />
    <nav className={'nav' + (NAVM === 'focus' && !r ? ' snf' : '')} aria-label="Admin">
      {masq && <button className={'ni' + (route.s === 'as' ? ' on' : '')} title="Learner view" onClick={() => go('as')}><I n="eye" />{!r && <>Learner view<span className="ct" style={{ background: 'var(--warnb)', borderColor: '#EBD9A8', color: 'var(--warn)' }}>Live</span></>}</button>}
      {NAV.map(([g, items], gi) => {
        const vis = items.filter(n => !n[2] || can(n[2])); if (!vis.length) return null;
        const has = vis.some(n => n[0] === active), op = has || !!open[g];
        if (SOLO[g] && r) return <button key={g} className={'ni' + (has ? ' on' : '')} title={g} aria-label={g} aria-current={has ? 'page' : undefined} onClick={() => go(vis[0][0])}><span className="fl" data-fl={g}><I n={GIC[g]} /></span></button>;
        if (SOLO[g]) return <button key={g} className={'gx solo' + (has ? ' has' : '')} aria-current={has ? 'page' : undefined} onClick={() => go(vis[0][0])}><span className="fl" data-fl={g}><I n={GIC[g]} /></span><span className="el">{g}</span>{badge(vis[0]) && <span className={'rb' + (vis[0][0] === 'cohort' && COH.st === 'Draft' ? ' dr' : '')}>{badge(vis[0])}</span>}</button>;
        if (r) return <Menu key={g} rt trigger={(t, o) => <button className={'ni' + (has ? ' on' : '')} title={g} aria-label={g + ' menu'} aria-expanded={o} onClick={t}><span className="fl" data-fl={g}><I n={GIC[g]} /></span></button>} items={vis.map(n => ({ l: n[1], ic: n[0], on: active === n[0], fn: () => go(n[0]) }))} />;
        if (NAVM === 'focus') { const opn = peek === undefined ? has : peek === g, roll = vis.find(n => badge(n));
          return <div key={g} className={g === 'Operations' ? 'gsep' : undefined}><button className={'gx' + (has ? ' has' : '') + (opn ? ' op' : '')} aria-expanded={opn} onClick={() => setPeek(opn ? null : g)}><span className="fl" data-fl={g}><I n={GIC[g]} /></span><span className="el">{g}</span>{!opn && roll && <span className={'rb' + (roll[0] === 'incidents' ? ' bad' : '')}>{badge(roll)}</span>}<span className="cv"><I n="chev" s={12} w={2.2} /></span></button>
            <div className={'gw' + (opn ? ' op' : '')}><div className="gwi"><div className="gkids">{vis.map(n => <button key={n[0]} tabIndex={opn ? 0 : -1} className={'gk' + (active === n[0] ? ' on' : '')} aria-current={active === n[0] ? 'page' : undefined} onClick={() => go(n[0])}><span className="el">{n[1]}</span>{badge(n) && <span className={'ct' + (n[0] === 'incidents' ? ' bad' : '')}>{badge(n)}</span>}</button>)}</div></div></div></div>; }
        return <div key={g}><button className={'ng' + (op ? ' op' : '')} aria-expanded={op} onClick={() => setOpen({ ...open, [g]: has ? 1 : !open[g] })}><I n="chev" s={12} w={2.2} />{g}{!op && vis.some(n => n[0] === 'incidents' && n[3]) && <span style={{ marginLeft: 'auto', color: 'var(--bad)', whiteSpace: 'nowrap' }}>1 incident</span>}</button>
          {op && vis.map(n => <button key={n[0]} className={'ni' + (active === n[0] ? ' on' : '')} aria-current={active === n[0] ? 'page' : undefined} onClick={() => go(n[0])}><I n={n[0]} /><span className="el">{n[1]}</span>{n[3] && <span className="ct">{n[3]}</span>}</button>)}</div>;
      })}
    </nav>
    <div className="sb-ft">
      {!ph && <button className="ni" title={r ? 'Expand sidebar' : undefined} aria-label={r ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => { byHand.current = true; setRail(!nar); }}><span className="fl" data-fl="panel"><I n="panel" /></span>{!r && <span className="lb">Collapse sidebar</span>}</button>}
      <div className="uc" title={r ? staff.n + ' · ' + staff.role : undefined}><span className="av" data-fl="av">{ini(staff.n)}</span>{!r && <span className="col" style={{ gap: 0 }}><span className="w5" style={{ fontSize: ph ? 16 : 13, lineHeight: ph ? '22px' : '18px' }}>{staff.n}</span><span style={{ fontSize: ph ? 16 : 12, lineHeight: ph ? '22px' : '16px', color: 'var(--f3)' }}>{staff.role}</span></span>}</div>
    </div>
  </aside>;
}

function AdminRedesign() {
  const [vp, setVp] = useState(1280), [ds, setDs] = useState('default'), [role, setRole] = useState('Owner'), [started, setStarted] = useState(false);
  const [route, setRoute] = useState({ s: 'overview' });
  const [, pk] = useState(0); POKE = () => pk(x => x + 1);
  const [navm, setNavm] = useState('focus'); NAVM = navm;
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
  const endMasq = why => { if (!masq) return; log('masquerade.stop', masq.u.n, why + '.'); setMasq(null); setBlocked(null); toast('Masquerade ended. You are ' + staff.n + ' again.'); setRoute(r => r.s === 'as' ? { s: 'masquerade' } : r); };
  const on = !!masq, left = masq ? masq.left : null;
  useEffect(() => { if (!on) return; const t = setInterval(() => setMasq(m => m && { ...m, left: m.left - 1 }), 1000); return () => clearInterval(t); }, [on]);
  useEffect(() => { if (on && left <= 0) endMasq('Expired after time limit'); }, [left]);
  useEffect(() => {
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
  const NEW = { 'n:week': ['week', '1'], 'n:community': ['community'], 'n:cthread': ['cthread', '2'], 'n:cthread-hidden': ['cthread', '5'], 'n:forms': ['forms'], 'n:forms-ti': ['forms', null, 'turnedin'], 'n:intake': ['learners', null, 'intake'], 'n:turnedin': ['learners', null, 'turnedin'], 'n:ws-intake': ['workspace', 'ws_northline', 'intake'], 'n:ws-failed': ['workspace', 'ws_copperbasin', 'intake'], 'n:ws-draft': ['workspace', 'ws_halemarlowe', 'intake'], 'n:ws-turnedin': ['workspace', 'ws_sampleteam', 'turnedin'], 'n:weekcards': ['weekcards'] };
  const newKey = Object.keys(NEW).find(k => NEW[k][0] === route.s && (NEW[k][1] || null) === (route.id || null) && (NEW[k][2] || undefined) === route.tab);
  const pick = v => v === 'n:jan' ? (seedJan(), go('cohort')) : NEW[v] ? go(...NEW[v]) : go(v, { workspace: 'ws_northshore', user: 'u_1042', incident: 'INC-0007' }[v]);
  return <div className="arx">
    <style>{CSS}</style>
    <div className="mk" role="toolbar" aria-label="Mockup controls">
      <span style={{ fontWeight: 600 }}>Mockup · admin · new screens are first in the list · sample data is made up</span>
      <span className="sg">{[1440, 1280, 1024, 390].map(v => <button key={v} className={vp === v ? 'on' : ''} onClick={() => { setVp(v); setRailP(null); }}>{v}</button>)}</span>
      <select aria-label="Screen" value={newKey || aliasOf(route) || route.s} onChange={e => pick(e.target.value)}>
        <optgroup label="NEW: the four pages"><option value="overview">Overview</option><option value="program">Program › Curriculum</option><option value="n:week">Program › a week</option><option value="course">Program › Course settings</option><option value="vault">Program › Resource Vault</option><option value="cohort">Cohort › Overview</option><option value="sessions">Cohort › Schedule</option><option value="enrolled">Cohort › People</option><option value="forms">Cohort › Submissions</option><option value="community">Cohort › Community</option><option value="announce">Cohort › Announcements</option><option value="cohortset">Cohort › Settings</option><option value="people">People › Everyone</option><option value="teamsall">People › Teams</option><option value="groups">People › Utah Life</option><option value="masquerade">People › Masquerade</option><option value="revenue">Revenue › Summary</option><option value="billing">Revenue › Payments</option><option value="tiers">Revenue › Plans &amp; upgrades</option><option value="usage">Revenue › Usage</option></optgroup><optgroup label="NEW: set up the January cohort"><option value="newcohort">New cohort: six weeks, twice a week</option><option value="n:jan">Skip ahead: January, created</option></optgroup><optgroup label="Today's pages, replaced"><option value="overview0">Overview (today)</option><option value="curriculum">Curriculum (today)</option><option value="builder">Module Builder (today)</option><option value="cohorts">Cohorts &amp; Sessions (today)</option><option value="learners">Learners &amp; Teams (today)</option><option value="workspaces">Workspaces (today)</option><option value="users">Users (today)</option></optgroup><optgroup label="Earlier rounds: community"><option value="n:community">Community</option><option value="n:cthread">Community › a thread</option><option value="n:cthread-hidden">Community › a hidden thread</option></optgroup><optgroup label="Earlier rounds: forms, uploads, GHL"><option value="n:forms">Forms &amp; Submissions › Intake</option><option value="n:forms-ti">Forms &amp; Submissions › Turned in</option><option value="n:intake">Learners &amp; Teams › Intake</option><option value="n:ws-intake">Workspace › Intake (submitted)</option><option value="n:ws-failed">Workspace › Intake (GHL failed)</option><option value="n:ws-draft">Workspace › Intake (draft)</option><option value="n:turnedin">Learners &amp; Teams › Turned in</option><option value="n:ws-turnedin">Workspace › Turned in</option><option value="n:weekcards">Week Builder: what changes</option></optgroup>
        {NAV.filter(g => !SOLO[g[0]]).map(g => <optgroup key={g[0]} label={g[0]}>{g[1].map(n => <option key={n[0]} value={n[0]}>{n[1]}</option>)}</optgroup>)}
        <optgroup label="Detail and system"><option value="workspace">People › a team</option><option value="user">People › a person</option><option value="incident">Incident detail</option><option value="as">Learner view (masquerade)</option><option value="missing">404</option><option value="denied">Access denied</option></optgroup>
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
