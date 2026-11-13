/* Homepage v3 handoff: swap the two scroll-pinned sections (Monday, How it works) to their static
   layout below 981px or with prefers-reduced-motion, exactly as the mockup does. Nothing else runs. */
(function(){var q=matchMedia("(min-width: 981px)"),r=matchMedia("(prefers-reduced-motion: reduce)"),s={};
function sw(){var st=!q.matches||r.matches;["mon","how"].forEach(function(k){var el=document.querySelector("section.sec."+k);if(!el)return;
if(!s[k])s[k]={pin:el.outerHTML,stat:document.getElementById("v3-static-"+k).innerHTML};
var want=st?s[k].stat:s[k].pin;if(el.outerHTML!==want)el.outerHTML=want;});}
sw();q.addEventListener("change",sw);r.addEventListener("change",sw);})();
